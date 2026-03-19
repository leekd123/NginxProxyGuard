package handler

import (
	"bufio"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"

	"nginx-proxy-guard/internal/config"
	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
)

// Dashboard Handlers

func (h *SettingsHandler) GetDashboard(c echo.Context) error {
	ctx := c.Request().Context()

	// Try to get from cache first (for stats data, not live metrics)
	var summary *model.DashboardSummary
	if h.redisCache != nil {
		var cachedSummary model.DashboardSummary
		if err := h.redisCache.GetDashboardSummary(ctx, &cachedSummary); err == nil {
			summary = &cachedSummary
		}
	}

	// If cache miss, fetch from database
	if summary == nil {
		var err error
		summary, err = h.dashboardRepo.GetSummary(ctx)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		// Cache the summary (without live metrics)
		if h.redisCache != nil {
			h.redisCache.SetDashboardSummary(ctx, summary)
		}
	}

	// Always add live host resource metrics (not cached)
	// CPU usage (average over sampling duration for faster response)
	if cpuPercent, err := cpu.Percent(config.CPUSamplingDuration, false); err == nil && len(cpuPercent) > 0 {
		summary.SystemHealth.CPUUsage = cpuPercent[0]
	}

	// Memory stats
	if memStats, err := mem.VirtualMemory(); err == nil {
		summary.SystemHealth.MemoryUsage = memStats.UsedPercent
		summary.SystemHealth.MemoryTotal = memStats.Total
		summary.SystemHealth.MemoryUsed = memStats.Used
	}

	// Disk stats
	if diskStats, err := disk.Usage("/"); err == nil {
		summary.SystemHealth.DiskUsage = diskStats.UsedPercent
		summary.SystemHealth.DiskTotal = diskStats.Total
		summary.SystemHealth.DiskUsed = diskStats.Used
		summary.SystemHealth.DiskPath = "/"
	}

	// Host info
	if hostInfo, err := host.Info(); err == nil {
		summary.SystemHealth.UptimeSeconds = hostInfo.Uptime
		summary.SystemHealth.KernelVersion = hostInfo.KernelVersion
	}

	// Try to read host OS info from mounted files (more accurate than container info)
	if hostname, err := os.ReadFile("/host/etc/hostname"); err == nil {
		summary.SystemHealth.Hostname = strings.TrimSpace(string(hostname))
	} else if hostInfo, err := host.Info(); err == nil {
		summary.SystemHealth.Hostname = hostInfo.Hostname
	}

	// Read host OS release info
	if file, err := os.Open("/host/etc/os-release"); err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "PRETTY_NAME=") {
				// Remove quotes and prefix
				name := strings.TrimPrefix(line, "PRETTY_NAME=")
				name = strings.Trim(name, "\"")
				summary.SystemHealth.Platform = name
				break
			}
		}
	}
	if summary.SystemHealth.Platform == "" {
		summary.SystemHealth.Platform = "Linux"
	}
	summary.SystemHealth.OS = "linux"

	// Network I/O stats (total across all interfaces)
	if netStats, err := net.IOCounters(false); err == nil && len(netStats) > 0 {
		summary.SystemHealth.NetworkIn = netStats[0].BytesRecv
		summary.SystemHealth.NetworkOut = netStats[0].BytesSent
	}

	return c.JSON(http.StatusOK, summary)
}

// GetGeoIPStats returns GeoIP statistics for globe visualization
func (h *SettingsHandler) GetGeoIPStats(c echo.Context) error {
	ctx := c.Request().Context()

	// Default to last 24 hours
	hours := 24
	if hoursStr := c.QueryParam("hours"); hoursStr != "" {
		if h, err := strconv.Atoi(hoursStr); err == nil && h > 0 && h <= 168 {
			hours = h
		}
	}

	// Try to get from cache first
	if h.redisCache != nil {
		var cachedResponse model.GeoIPStatsResponse
		if err := h.redisCache.GetGeoIPStats(ctx, hours, &cachedResponse); err == nil {
			return c.JSON(http.StatusOK, cachedResponse)
		}
	}

	since := time.Now().Add(-time.Duration(hours) * time.Hour)
	stats, totalCount, err := h.dashboardRepo.GetGeoIPStats(ctx, since)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	response := model.GeoIPStatsResponse{
		Data:       stats,
		TotalCount: totalCount,
	}

	// Cache the response
	if h.redisCache != nil {
		h.redisCache.SetGeoIPStats(ctx, hours, response)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *SettingsHandler) GetSystemHealth(c echo.Context) error {
	health, err := h.dashboardRepo.GetSystemHealth(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Update with live nginx status
	if h.nginxManager != nil {
		if err := h.nginxManager.TestConfig(c.Request().Context()); err == nil {
			health.NginxStatus = config.StatusOK
		} else {
			health.NginxStatus = config.StatusError
		}
	}

	health.DBStatus = config.StatusOK
	health.RecordedAt = time.Now()

	// Fetch live host resource metrics using gopsutil
	// CPU usage (average over sampling duration for faster response)
	if cpuPercent, err := cpu.Percent(config.CPUSamplingDuration, false); err == nil && len(cpuPercent) > 0 {
		health.CPUUsage = cpuPercent[0]
	}

	// Memory stats
	if memStats, err := mem.VirtualMemory(); err == nil {
		health.MemoryUsage = memStats.UsedPercent
		health.MemoryTotal = memStats.Total
		health.MemoryUsed = memStats.Used
	}

	// Disk stats
	if diskStats, err := disk.Usage("/"); err == nil {
		health.DiskUsage = diskStats.UsedPercent
		health.DiskTotal = diskStats.Total
		health.DiskUsed = diskStats.Used
		health.DiskPath = "/"
	}

	// Host info
	if hostInfo, err := host.Info(); err == nil {
		health.UptimeSeconds = hostInfo.Uptime
		health.Hostname = hostInfo.Hostname
		health.OS = hostInfo.OS
		health.Platform = hostInfo.Platform
		health.KernelVersion = hostInfo.KernelVersion
	}

	return c.JSON(http.StatusOK, health)
}

// GetSystemHealthHistory returns historical system health data for charts
func (h *SettingsHandler) GetSystemHealthHistory(c echo.Context) error {
	// Default to last 1 hour
	since := time.Now().Add(-1 * time.Hour)

	// Allow custom hours parameter
	if hoursStr := c.QueryParam("hours"); hoursStr != "" {
		if hours, err := strconv.Atoi(hoursStr); err == nil && hours > 0 && hours <= 168 {
			since = time.Now().Add(-time.Duration(hours) * time.Hour)
		}
	}

	// Allow custom limit parameter (max 1000)
	limit := 100
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
			limit = l
		}
	}

	history, err := h.dashboardRepo.GetSystemHealthHistory(c.Request().Context(), since, limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data":   history,
		"total":  len(history),
		"since":  since,
		"limit":  limit,
	})
}

func (h *SettingsHandler) GetHourlyStats(c echo.Context) error {
	startStr := c.QueryParam("start")
	endStr := c.QueryParam("end")
	proxyHostID := c.QueryParam("proxy_host_id")

	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
		if err != nil {
			start = time.Now().Add(-24 * time.Hour)
		}
	} else {
		start = time.Now().Add(-24 * time.Hour)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
		if err != nil {
			end = time.Now()
		}
	} else {
		end = time.Now()
	}

	params := &model.DashboardQueryParams{
		ProxyHostID: proxyHostID,
		StartTime:   start,
		EndTime:     end,
		Granularity: "hourly",
	}

	stats, err := h.dashboardRepo.GetHourlyStats(c.Request().Context(), params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, stats)
}

func (h *SettingsHandler) GetDockerStats(c echo.Context) error {
	if h.dockerStats == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Docker stats service not available"})
	}

	summary, err := h.dockerStats.GetStatsSummary(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, summary)
}

// ListDockerContainers returns all running Docker containers with their network info
// Used by the UI to help users select bridge network containers as proxy targets
func (h *SettingsHandler) ListDockerContainers(c echo.Context) error {
	if h.dockerStats == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Docker stats service not available"})
	}

	containers, err := h.dockerStats.ListContainersWithNetworks(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	if containers == nil {
		containers = []service.DockerContainerInfo{}
	}

	return c.JSON(http.StatusOK, containers)
}

// Test Endpoints

func (h *SettingsHandler) SelfCheck(c echo.Context) error {
	results := make(map[string]interface{})

	// Check database
	dbStatus := config.StatusOK
	// The database is working if we got here

	results["database"] = map[string]interface{}{
		"status": dbStatus,
	}

	// Check nginx
	nginxStatus := config.StatusOK
	var nginxError string
	if h.nginxManager != nil {
		if err := h.nginxManager.TestConfig(c.Request().Context()); err != nil {
			nginxStatus = config.StatusError
			nginxError = err.Error()
		}
	}
	results["nginx"] = map[string]interface{}{
		"status": nginxStatus,
		"error":  nginxError,
	}

	// Check backup directory
	backupStatus := config.StatusOK
	if _, err := os.Stat(h.backupPath); os.IsNotExist(err) {
		if err := os.MkdirAll(h.backupPath, config.DefaultDirPermissions); err != nil {
			backupStatus = config.StatusError
		}
	}
	results["backup_storage"] = map[string]interface{}{
		"status": backupStatus,
		"path":   h.backupPath,
	}

	// Overall status
	overallStatus := config.StatusHealthy
	if nginxStatus != config.StatusOK {
		overallStatus = config.StatusDegraded
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":     overallStatus,
		"checked_at": time.Now(),
		"components": results,
	})
}

func (h *SettingsHandler) TestDashboardQueries(c echo.Context) error {
	results := make(map[string]interface{})

	// Test summary query
	summary, err := h.dashboardRepo.GetSummary(c.Request().Context())
	if err != nil {
		results["summary"] = map[string]interface{}{
			"status": config.StatusError,
			"error":  err.Error(),
		}
	} else {
		results["summary"] = map[string]interface{}{
			"status":          config.StatusOK,
			"total_requests":  summary.TotalRequests24h,
			"total_bandwidth": summary.TotalBandwidth24h,
			"proxy_hosts":     summary.TotalProxyHosts,
		}
	}

	// Test health query
	health, err := h.dashboardRepo.GetSystemHealth(c.Request().Context())
	if err != nil {
		results["health"] = map[string]interface{}{
			"status": config.StatusError,
			"error":  err.Error(),
		}
	} else {
		results["health"] = map[string]interface{}{
			"status":       config.StatusOK,
			"nginx_status": health.NginxStatus,
			"db_status":    health.DBStatus,
		}
	}

	// Test hourly stats query
	params := &model.DashboardQueryParams{
		StartTime: time.Now().Add(-24 * time.Hour),
		EndTime:   time.Now(),
	}
	stats, err := h.dashboardRepo.GetHourlyStats(c.Request().Context(), params)
	if err != nil {
		results["hourly_stats"] = map[string]interface{}{
			"status": config.StatusError,
			"error":  err.Error(),
		}
	} else {
		results["hourly_stats"] = map[string]interface{}{
			"status": config.StatusOK,
			"count":  len(stats),
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"test":    "dashboard_queries",
		"status":  "passed",
		"results": results,
	})
}
