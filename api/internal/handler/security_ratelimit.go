package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/config"
	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
)

// Rate Limit handlers

func (h *SecurityHandler) GetRateLimit(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	rateLimit, err := h.rateLimitRepo.GetByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get rate limit", err)
	}

	if rateLimit == nil {
		rateLimit = &model.RateLimit{
			ProxyHostID:       proxyHostID,
			Enabled:           false,
			RequestsPerSecond: config.DefaultRPS,
			BurstSize:         config.DefaultBurstSize,
			ZoneSize:          config.DefaultZoneSize,
			LimitBy:           "ip",
			LimitResponse:     config.DefaultLimitResponse,
		}
	}

	return c.JSON(http.StatusOK, rateLimit)
}

func (h *SecurityHandler) UpsertRateLimit(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	var req model.CreateRateLimitRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	rateLimit, err := h.rateLimitRepo.Upsert(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert rate limit", err)
	}

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	// Regenerate nginx config to apply rate limit changes
	if host != nil && host.Enabled && h.proxyHostService != nil {
		if _, err := h.proxyHostService.Update(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for rate limit", err)
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "rate_limit", hostName, rateLimit.Enabled, nil)

	return c.JSON(http.StatusOK, rateLimit)
}

func (h *SecurityHandler) DeleteRateLimit(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.rateLimitRepo.Delete(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete rate limit", err)
	}

	// Regenerate nginx config to remove rate limit
	if host != nil && host.Enabled && h.proxyHostService != nil {
		if _, err := h.proxyHostService.Update(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for rate limit removal", err)
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "rate_limit", hostName, false, nil)

	return c.NoContent(http.StatusNoContent)
}

// Fail2ban handlers

func (h *SecurityHandler) GetFail2ban(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	config, err := h.rateLimitRepo.GetFail2banByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get fail2ban config", err)
	}

	if config == nil {
		config = &model.Fail2banConfig{
			ProxyHostID: proxyHostID,
			Enabled:     false,
			MaxRetries:  5,
			FindTime:    600,
			BanTime:     3600,
			FailCodes:   "401,403",
			Action:      "block",
		}
	}

	return c.JSON(http.StatusOK, config)
}

func (h *SecurityHandler) UpsertFail2ban(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	var req model.CreateFail2banRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	config, err := h.rateLimitRepo.UpsertFail2ban(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert fail2ban config", err)
	}

	// Audit log
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogFail2banUpdate(auditCtx, hostName, config.Enabled, nil)

	return c.JSON(http.StatusOK, config)
}

func (h *SecurityHandler) DeleteFail2ban(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.rateLimitRepo.DeleteFail2ban(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete fail2ban config", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogFail2banUpdate(auditCtx, hostName, false, nil)

	return c.NoContent(http.StatusNoContent)
}

// Upstream handlers

func (h *SecurityHandler) GetUpstream(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	upstream, err := h.upstreamRepo.GetByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get upstream", err)
	}

	if upstream == nil {
		upstream = &model.Upstream{
			ProxyHostID:               proxyHostID,
			LoadBalance:               "round_robin",
			HealthCheckEnabled:        false,
			HealthCheckInterval:       30,
			HealthCheckTimeout:        5,
			HealthCheckPath:           "/",
			HealthCheckExpectedStatus: 200,
			Keepalive:                 32,
			IsHealthy:                 true,
			Servers:                   []model.UpstreamServer{},
		}
	}

	return c.JSON(http.StatusOK, upstream)
}

func (h *SecurityHandler) UpsertUpstream(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	var req model.CreateUpstreamRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	upstream, err := h.upstreamRepo.Upsert(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert upstream", err)
	}

	// Audit log
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogUpstreamUpdate(auditCtx, hostName, map[string]interface{}{
		"load_balance": upstream.LoadBalance,
		"health_check": upstream.HealthCheckEnabled,
		"server_count": len(upstream.Servers),
	})

	return c.JSON(http.StatusOK, upstream)
}

func (h *SecurityHandler) DeleteUpstream(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.upstreamRepo.Delete(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete upstream", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogUpstreamUpdate(auditCtx, hostName, map[string]interface{}{
		"action": "deleted",
	})

	return c.NoContent(http.StatusNoContent)
}

func (h *SecurityHandler) GetUpstreamHealth(c echo.Context) error {
	id := c.Param("id")

	upstream, err := h.upstreamRepo.GetByID(c.Request().Context(), id)
	if err != nil {
		return databaseError(c, "get upstream health", err)
	}

	if upstream == nil {
		return notFoundError(c, "Upstream")
	}

	healthyCount := 0
	unhealthyCount := 0
	serverStatuses := make([]model.ServerHealthStatus, len(upstream.Servers))

	for i, s := range upstream.Servers {
		if s.IsHealthy && !s.IsDown {
			healthyCount++
		} else {
			unhealthyCount++
		}

		serverStatuses[i] = model.ServerHealthStatus{
			Address:     s.Address,
			Port:        s.Port,
			IsHealthy:   s.IsHealthy,
			IsBackup:    s.IsBackup,
			IsDown:      s.IsDown,
			LastCheckAt: s.LastCheckAt,
			LastError:   s.LastError,
		}
	}

	response := model.UpstreamHealthStatus{
		UpstreamID:     upstream.ID,
		Name:           upstream.Name,
		IsHealthy:      upstream.IsHealthy,
		HealthyCount:   healthyCount,
		UnhealthyCount: unhealthyCount,
		LastCheckAt:    upstream.LastCheckAt,
		Servers:        serverStatuses,
	}

	return c.JSON(http.StatusOK, response)
}

// IP Ban History handlers

func (h *SecurityHandler) GetIPBanHistory(c echo.Context) error {
	if h.historyRepo == nil {
		return internalError(c, "history repository not initialized", nil)
	}

	// Parse filter parameters
	filter := &model.IPBanHistoryFilter{
		IPAddress:   c.QueryParam("ip_address"),
		EventType:   c.QueryParam("event_type"),
		Source:      c.QueryParam("source"),
		ProxyHostID: c.QueryParam("proxy_host_id"),
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	filter.Page = page
	filter.PerPage = perPage

	// Parse date filters
	if startDate := c.QueryParam("start_date"); startDate != "" {
		if t, err := time.Parse(time.RFC3339, startDate); err == nil {
			filter.StartDate = &t
		}
	}
	if endDate := c.QueryParam("end_date"); endDate != "" {
		if t, err := time.Parse(time.RFC3339, endDate); err == nil {
			filter.EndDate = &t
		}
	}

	result, err := h.historyRepo.List(c.Request().Context(), filter)
	if err != nil {
		return databaseError(c, "list IP ban history", err)
	}

	return c.JSON(http.StatusOK, result)
}

func (h *SecurityHandler) GetIPBanHistoryByIP(c echo.Context) error {
	if h.historyRepo == nil {
		return internalError(c, "history repository not initialized", nil)
	}

	ip := c.Param("ip")
	if ip == "" {
		return badRequestError(c, "IP address is required")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}

	result, err := h.historyRepo.GetByIP(c.Request().Context(), ip, page, perPage)
	if err != nil {
		return databaseError(c, "get IP ban history", err)
	}

	return c.JSON(http.StatusOK, result)
}

func (h *SecurityHandler) GetIPBanHistoryStats(c echo.Context) error {
	if h.historyRepo == nil {
		return internalError(c, "history repository not initialized", nil)
	}

	stats, err := h.historyRepo.GetStats(c.Request().Context())
	if err != nil {
		return databaseError(c, "get IP ban history stats", err)
	}

	return c.JSON(http.StatusOK, stats)
}
