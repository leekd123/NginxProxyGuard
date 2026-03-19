package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
)

// Bot Filter handlers

func (h *SecurityHandler) GetBotFilter(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	filter, err := h.botFilterRepo.GetByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get bot filter", err)
	}

	if filter == nil {
		filter = &model.BotFilter{
			ProxyHostID:        proxyHostID,
			Enabled:            false,
			BlockBadBots:       true,
			BlockAIBots:        false,
			AllowSearchEngines: true,
		}
	}

	return c.JSON(http.StatusOK, filter)
}

func (h *SecurityHandler) UpsertBotFilter(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")
	skipReload := c.QueryParam("skip_reload") == "true"

	var req model.CreateBotFilterRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	filter, err := h.botFilterRepo.Upsert(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert bot filter", err)
	}

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	// Regenerate nginx config to apply bot filter changes (skip if requested)
	if !skipReload && host != nil && host.Enabled && h.proxyHostService != nil {
		// Trigger a dummy update to regenerate nginx config with bot filter settings
		if _, err := h.proxyHostService.Update(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for bot filter", err)
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "bot_filter", hostName, filter.Enabled, nil)

	return c.JSON(http.StatusOK, filter)
}

func (h *SecurityHandler) DeleteBotFilter(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.botFilterRepo.Delete(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete bot filter", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "bot_filter", hostName, false, nil)

	return c.NoContent(http.StatusNoContent)
}

func (h *SecurityHandler) GetKnownBots(c echo.Context) error {
	response := map[string]interface{}{
		"bad_bots":           model.KnownBadBots,
		"ai_bots":            model.AIBots,
		"search_engine_bots": model.SearchEngineBots,
	}

	return c.JSON(http.StatusOK, response)
}

// Security Headers handlers

func (h *SecurityHandler) GetSecurityHeaders(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	headers, err := h.secHeadersRepo.GetByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get security headers", err)
	}

	if headers == nil {
		headers = &model.SecurityHeaders{
			ProxyHostID:           proxyHostID,
			Enabled:               false,
			HSTSEnabled:           true,
			HSTSMaxAge:            31536000,
			HSTSIncludeSubdomains: true,
			HSTSPreload:           false,
			XFrameOptions:         "SAMEORIGIN",
			XContentTypeOptions:   true,
			XXSSProtection:        true,
			ReferrerPolicy:        "strict-origin-when-cross-origin",
		}
	}

	return c.JSON(http.StatusOK, headers)
}

func (h *SecurityHandler) UpsertSecurityHeaders(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	var req model.CreateSecurityHeadersRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	headers, err := h.secHeadersRepo.Upsert(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert security headers", err)
	}

	// Audit log
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "security_headers", hostName, headers.Enabled, nil)

	return c.JSON(http.StatusOK, headers)
}

func (h *SecurityHandler) DeleteSecurityHeaders(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.secHeadersRepo.Delete(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete security headers", err)
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "security_headers", hostName, false, nil)

	return c.NoContent(http.StatusNoContent)
}

func (h *SecurityHandler) GetSecurityHeaderPresets(c echo.Context) error {
	return c.JSON(http.StatusOK, model.SecurityHeaderPresets)
}

func (h *SecurityHandler) ApplySecurityHeaderPreset(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")
	preset := c.Param("preset")

	presetConfig, ok := model.SecurityHeaderPresets[preset]
	if !ok {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid preset"})
	}

	req := &model.CreateSecurityHeadersRequest{
		Enabled:               &presetConfig.Enabled,
		HSTSEnabled:           &presetConfig.HSTSEnabled,
		HSTSMaxAge:            presetConfig.HSTSMaxAge,
		HSTSIncludeSubdomains: &presetConfig.HSTSIncludeSubdomains,
		HSTSPreload:           &presetConfig.HSTSPreload,
		XFrameOptions:         presetConfig.XFrameOptions,
		XContentTypeOptions:   &presetConfig.XContentTypeOptions,
		XXSSProtection:        &presetConfig.XXSSProtection,
		ReferrerPolicy:        presetConfig.ReferrerPolicy,
		ContentSecurityPolicy: presetConfig.ContentSecurityPolicy,
	}

	headers, err := h.secHeadersRepo.Upsert(c.Request().Context(), proxyHostID, req)
	if err != nil {
		return databaseError(c, "apply security header preset", err)
	}

	// Audit log
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "security_headers", hostName, headers.Enabled, map[string]interface{}{
		"preset": preset,
	})

	return c.JSON(http.StatusOK, headers)
}
