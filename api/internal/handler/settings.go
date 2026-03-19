package handler

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/nginx"
	"nginx-proxy-guard/internal/repository"
	"nginx-proxy-guard/internal/service"
	"nginx-proxy-guard/pkg/cache"
)

type SettingsHandler struct {
	settingsRepo     *repository.GlobalSettingsRepository
	dashboardRepo    *repository.DashboardRepository
	backupRepo       *repository.BackupRepository
	proxyHostRepo    *repository.ProxyHostRepository
	redirectHostRepo *repository.RedirectHostRepository
	certificateRepo  *repository.CertificateRepository
	wafRepo          *repository.WAFRepository
	nginxManager     *nginx.Manager
	backupPath       string
	audit            *service.AuditService
	dockerStats      *service.DockerStatsService
	proxyHostService *service.ProxyHostService
	redisCache       *cache.RedisClient
}

func NewSettingsHandler(
	settingsRepo *repository.GlobalSettingsRepository,
	dashboardRepo *repository.DashboardRepository,
	backupRepo *repository.BackupRepository,
	proxyHostRepo *repository.ProxyHostRepository,
	redirectHostRepo *repository.RedirectHostRepository,
	certificateRepo *repository.CertificateRepository,
	wafRepo *repository.WAFRepository,
	nginxManager *nginx.Manager,
	backupPath string,
	audit *service.AuditService,
	dockerStats *service.DockerStatsService,
	proxyHostService *service.ProxyHostService,
	redisCache *cache.RedisClient,
) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo:     settingsRepo,
		dashboardRepo:    dashboardRepo,
		backupRepo:       backupRepo,
		proxyHostRepo:    proxyHostRepo,
		redirectHostRepo: redirectHostRepo,
		certificateRepo:  certificateRepo,
		wafRepo:          wafRepo,
		nginxManager:     nginxManager,
		backupPath:       backupPath,
		audit:            audit,
		dockerStats:      dockerStats,
		proxyHostService: proxyHostService,
		redisCache:       redisCache,
	}
}

// Global Settings Handlers

func (h *SettingsHandler) GetGlobalSettings(c echo.Context) error {
	settings, err := h.settingsRepo.Get(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) UpdateGlobalSettings(c echo.Context) error {
	var req model.UpdateGlobalSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	settings, err := h.settingsRepo.Update(c.Request().Context(), &req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Regenerate default server config if direct IP access action changed
	if req.DirectIPAccessAction != nil {
		if err := h.nginxManager.GenerateDefaultServerConfig(c.Request().Context(), settings.DirectIPAccessAction); err != nil {
			log.Printf("[Settings] Warning: failed to generate default server config: %v", err)
		}
	}

	// Regenerate all proxy host configs to apply global settings (timeouts, body size, etc.)
	if h.proxyHostService != nil {
		if err := h.proxyHostService.SyncAllConfigs(c.Request().Context()); err != nil {
			log.Printf("[Settings] Warning: failed to regenerate proxy host configs after global settings change: %v", err)
		}
	}

	// Reload nginx to apply all changes
	if err := h.nginxManager.ReloadNginx(c.Request().Context()); err != nil {
		log.Printf("[Settings] Warning: failed to reload nginx after global settings change: %v", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSettingsUpdate(auditCtx, "전역 설정", map[string]interface{}{
		"action": "update",
	})

	return c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) ResetGlobalSettings(c echo.Context) error {
	settings, err := h.settingsRepo.Reset(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Regenerate all proxy host configs to apply default global settings
	if h.proxyHostService != nil {
		if err := h.proxyHostService.SyncAllConfigs(c.Request().Context()); err != nil {
			log.Printf("[Settings] Warning: failed to regenerate proxy host configs after global settings reset: %v", err)
		}
	}

	// Reload nginx to apply all changes
	if err := h.nginxManager.ReloadNginx(c.Request().Context()); err != nil {
		log.Printf("[Settings] Warning: failed to reload nginx after global settings reset: %v", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSettingsUpdate(auditCtx, "전역 설정", map[string]interface{}{
		"action": "reset",
	})

	return c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) GetSettingsPresets(c echo.Context) error {
	return c.JSON(http.StatusOK, model.GlobalSettingsPresets)
}

func (h *SettingsHandler) ApplySettingsPreset(c echo.Context) error {
	preset := c.Param("preset")

	presetConfig, ok := model.GlobalSettingsPresets[preset]
	if !ok {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid preset"})
	}

	req := &model.UpdateGlobalSettingsRequest{
		WorkerProcesses:       &presetConfig.WorkerProcesses,
		WorkerConnections:     &presetConfig.WorkerConnections,
		MultiAccept:           &presetConfig.MultiAccept,
		Sendfile:              &presetConfig.Sendfile,
		TCPNopush:             &presetConfig.TCPNopush,
		TCPNodelay:            &presetConfig.TCPNodelay,
		KeepaliveTimeout:      &presetConfig.KeepaliveTimeout,
		KeepaliveRequests:     &presetConfig.KeepaliveRequests,
		ServerTokens:          &presetConfig.ServerTokens,
		GzipEnabled:           &presetConfig.GzipEnabled,
		GzipCompLevel:         &presetConfig.GzipCompLevel,
		BrotliEnabled:         &presetConfig.BrotliEnabled,
		BrotliCompLevel:       &presetConfig.BrotliCompLevel,
		SSLProtocols:          presetConfig.SSLProtocols,
		SSLPreferServerCiphers: &presetConfig.SSLPreferServerCiphers,
	}

	settings, err := h.settingsRepo.Update(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSettingsUpdate(auditCtx, "전역 설정", map[string]interface{}{
		"action": "apply_preset",
		"preset": preset,
	})

	return c.JSON(http.StatusOK, settings)
}
