package handler

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
	"nginx-proxy-guard/pkg/cache"
)

// URI Block handlers

func (h *SecurityHandler) GetURIBlock(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	uriBlock, err := h.uriBlockRepo.GetByProxyHostID(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get URI block", err)
	}

	if uriBlock == nil {
		uriBlock = &model.URIBlock{
			ProxyHostID:     proxyHostID,
			Enabled:         false,
			Rules:           []model.URIBlockRule{},
			ExceptionIPs:    []string{},
			AllowPrivateIPs: true,
		}
	}

	return c.JSON(http.StatusOK, uriBlock)
}

func (h *SecurityHandler) UpsertURIBlock(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")
	skipReload := c.QueryParam("skip_reload") == "true"

	var req model.CreateURIBlockRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	if len(req.ExceptionIPs) > 0 {
		if invalid := ValidateIPList(req.ExceptionIPs); len(invalid) > 0 {
			return badRequestError(c, fmt.Sprintf("Invalid IP address(es) in exception_ips: %s", strings.Join(invalid, ", ")))
		}
	}

	uriBlock, err := h.uriBlockRepo.Upsert(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "upsert URI block", err)
	}

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	// Update cache
	h.cacheURIBlock(c.Request().Context(), proxyHostID, uriBlock)

	// Regenerate nginx config with debounced reload (skip if requested)
	if !skipReload && host != nil && host.Enabled && h.proxyHostService != nil {
		// Generate config first
		if _, err := h.proxyHostService.UpdateWithoutReload(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for URI block", err)
		}
		// Request debounced reload
		if h.nginxReloader != nil {
			h.nginxReloader.RequestReload(c.Request().Context())
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, uriBlock.Enabled, nil)

	return c.JSON(http.StatusOK, uriBlock)
}

func (h *SecurityHandler) DeleteURIBlock(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host info for audit
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	if err := h.uriBlockRepo.Delete(c.Request().Context(), proxyHostID); err != nil {
		return databaseError(c, "delete URI block", err)
	}

	// Clear cache
	if h.redisCache != nil {
		h.redisCache.DeleteURIBlock(c.Request().Context(), proxyHostID)
	}

	// Regenerate nginx config with debounced reload
	if host != nil && host.Enabled && h.proxyHostService != nil {
		if _, err := h.proxyHostService.UpdateWithoutReload(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for URI block removal", err)
		}
		if h.nginxReloader != nil {
			h.nginxReloader.RequestReload(c.Request().Context())
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, false, nil)

	return c.NoContent(http.StatusNoContent)
}

func (h *SecurityHandler) AddURIBlockRule(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	var req model.AddURIBlockRuleRequest
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	if req.Pattern == "" {
		return badRequestError(c, "pattern is required")
	}
	if req.MatchType == model.URIMatchRegex {
		if err := ValidateRegexPattern(req.Pattern); err != nil {
			return badRequestError(c, fmt.Sprintf("Invalid regex pattern: %v", err))
		}
	}
	if req.MatchType == "" {
		req.MatchType = model.URIMatchPrefix
	}

	uriBlock, err := h.uriBlockRepo.AddRule(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return databaseError(c, "add URI block rule", err)
	}

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	// Update cache
	h.cacheURIBlock(c.Request().Context(), proxyHostID, uriBlock)

	// Regenerate nginx config with debounced reload
	if host != nil && host.Enabled && h.proxyHostService != nil {
		if _, err := h.proxyHostService.UpdateWithoutReload(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for URI block rule", err)
		}
		if h.nginxReloader != nil {
			h.nginxReloader.RequestReload(c.Request().Context())
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, true, map[string]interface{}{
		"action":     "add_rule",
		"pattern":    req.Pattern,
		"match_type": req.MatchType,
	})

	return c.JSON(http.StatusCreated, uriBlock)
}

func (h *SecurityHandler) RemoveURIBlockRule(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")
	ruleID := c.Param("ruleId")

	if ruleID == "" {
		return badRequestError(c, "rule ID is required")
	}

	if err := h.uriBlockRepo.RemoveRule(c.Request().Context(), proxyHostID, ruleID); err != nil {
		return databaseError(c, "remove URI block rule", err)
	}

	// Get host info for audit and nginx config regeneration
	host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), proxyHostID)
	hostName := proxyHostID
	if host != nil && len(host.DomainNames) > 0 {
		hostName = host.DomainNames[0]
	}

	// Update cache (re-fetch to get current state)
	if uriBlock, err := h.uriBlockRepo.GetByProxyHostID(c.Request().Context(), proxyHostID); err == nil && uriBlock != nil {
		h.cacheURIBlock(c.Request().Context(), proxyHostID, uriBlock)
	} else if h.redisCache != nil {
		// If no rules left, clear cache
		h.redisCache.DeleteURIBlock(c.Request().Context(), proxyHostID)
	}

	// Regenerate nginx config with debounced reload
	if host != nil && host.Enabled && h.proxyHostService != nil {
		if _, err := h.proxyHostService.UpdateWithoutReload(c.Request().Context(), proxyHostID, &model.UpdateProxyHostRequest{}); err != nil {
			return internalError(c, "regenerate nginx config for URI block rule removal", err)
		}
		if h.nginxReloader != nil {
			h.nginxReloader.RequestReload(c.Request().Context())
		}
	}

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, true, map[string]interface{}{
		"action":  "remove_rule",
		"rule_id": ruleID,
	})

	return c.NoContent(http.StatusNoContent)
}

// BulkAddURIBlockRule adds a rule to multiple or all hosts
func (h *SecurityHandler) BulkAddURIBlockRule(c echo.Context) error {
	var req struct {
		Pattern     string   `json:"pattern"`
		MatchType   string   `json:"match_type"`
		Description string   `json:"description"`
		HostIDs     []string `json:"host_ids"` // If empty, applies to all enabled hosts
	}
	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	if req.Pattern == "" {
		return badRequestError(c, "pattern is required")
	}
	if req.MatchType == string(model.URIMatchRegex) {
		if err := ValidateRegexPattern(req.Pattern); err != nil {
			return badRequestError(c, fmt.Sprintf("Invalid regex pattern: %v", err))
		}
	}
	if req.MatchType == "" {
		req.MatchType = string(model.URIMatchExact)
	}

	ctx := c.Request().Context()
	var targetHostIDs []string

	if len(req.HostIDs) > 0 {
		// Use specified host IDs
		targetHostIDs = req.HostIDs
	} else {
		// Get all enabled hosts
		allHosts, err := h.proxyHostRepo.GetAllEnabled(ctx)
		if err != nil {
			return databaseError(c, "get enabled hosts", err)
		}
		for _, host := range allHosts {
			targetHostIDs = append(targetHostIDs, host.ID)
		}
	}

	if len(targetHostIDs) == 0 {
		return badRequestError(c, "No target hosts found")
	}

	// Add rule to each host
	addedCount := 0
	var errors []string
	auditCtx := service.ContextWithAudit(ctx, c)

	for _, hostID := range targetHostIDs {
		enabled := true
		ruleReq := &model.AddURIBlockRuleRequest{
			Pattern:     req.Pattern,
			MatchType:   model.URIMatchType(req.MatchType),
			Description: req.Description,
			Enabled:     &enabled,
		}

		uriBlock, err := h.uriBlockRepo.AddRule(ctx, hostID, ruleReq)
		if err != nil {
			errors = append(errors, hostID+": "+err.Error())
			continue
		}

		// Update cache
		h.cacheURIBlock(ctx, hostID, uriBlock)

		// Regenerate nginx config (without reload - we'll reload once at the end)
		host, _ := h.proxyHostRepo.GetByID(ctx, hostID)
		if host != nil && host.Enabled && h.proxyHostService != nil {
			h.proxyHostService.UpdateWithoutReload(ctx, hostID, &model.UpdateProxyHostRequest{})
		}

		// Audit log for each host
		hostName := hostID
		if host != nil && len(host.DomainNames) > 0 {
			hostName = host.DomainNames[0]
		}
		h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, true, map[string]interface{}{
			"action":     "add_rule",
			"pattern":    req.Pattern,
			"match_type": req.MatchType,
			"bulk":       true,
		})

		addedCount++
	}

	// Request single debounced reload after all configs are generated
	if h.nginxReloader != nil {
		h.nginxReloader.RequestReload(ctx)
	}

	response := map[string]interface{}{
		"added_count":  addedCount,
		"total_hosts":  len(targetHostIDs),
		"pattern":      req.Pattern,
		"match_type":   req.MatchType,
	}
	if len(errors) > 0 {
		response["errors"] = errors
	}

	return c.JSON(http.StatusOK, response)
}

// cacheURIBlock updates the URI block cache in Redis
func (h *SecurityHandler) cacheURIBlock(ctx context.Context, proxyHostID string, uriBlock *model.URIBlock) {
	if h.redisCache == nil || uriBlock == nil {
		return
	}

	// Convert to cache entry
	patterns := make([]cache.URIBlockPattern, 0, len(uriBlock.Rules))
	for _, rule := range uriBlock.Rules {
		if rule.Enabled {
			patterns = append(patterns, cache.URIBlockPattern{
				Pattern:   rule.Pattern,
				MatchType: string(rule.MatchType),
				Enabled:   rule.Enabled,
			})
		}
	}

	entry := &cache.URIBlockEntry{
		HostID:          proxyHostID,
		Enabled:         uriBlock.Enabled,
		AllowPrivateIPs: uriBlock.AllowPrivateIPs,
		ExceptionIPs:    uriBlock.ExceptionIPs,
		Patterns:        patterns,
	}

	h.redisCache.SetURIBlock(ctx, proxyHostID, entry)
}

// ListAllURIBlocks returns all URI blocks across all hosts
func (h *SecurityHandler) ListAllURIBlocks(c echo.Context) error {
	blocks, err := h.uriBlockRepo.ListAll(c.Request().Context())
	if err != nil {
		return databaseError(c, "list all URI blocks", err)
	}
	return c.JSON(http.StatusOK, blocks)
}

// ============================================================================
// Global URI Block Handlers
// ============================================================================

// GetGlobalURIBlock returns the global URI block settings
func (h *SecurityHandler) GetGlobalURIBlock(c echo.Context) error {
	block, err := h.uriBlockRepo.GetGlobalURIBlock(c.Request().Context())
	if err != nil {
		return databaseError(c, "get global URI block", err)
	}

	// Return empty config if not found
	if block == nil {
		return c.JSON(http.StatusOK, model.GlobalURIBlock{
			Enabled:         false,
			Rules:           []model.URIBlockRule{},
			ExceptionIPs:    []string{},
			AllowPrivateIPs: true,
		})
	}

	return c.JSON(http.StatusOK, block)
}

// UpdateGlobalURIBlock updates the global URI block settings
func (h *SecurityHandler) UpdateGlobalURIBlock(c echo.Context) error {
	var req model.CreateGlobalURIBlockRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if len(req.ExceptionIPs) > 0 {
		if invalid := ValidateIPList(req.ExceptionIPs); len(invalid) > 0 {
			return badRequestError(c, fmt.Sprintf("Invalid IP address(es) in exception_ips: %s", strings.Join(invalid, ", ")))
		}
	}

	ctx := c.Request().Context()

	block, err := h.uriBlockRepo.UpsertGlobalURIBlock(ctx, &req)
	if err != nil {
		return databaseError(c, "update global URI block", err)
	}

	// Log audit
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "global_uri_block", "global", block.Enabled, map[string]interface{}{
		"rules_count": len(block.Rules),
	})

	// Sync all proxy host configs to apply global rules (synchronous for immediate feedback)
	if err := h.syncAllProxyHostsForGlobalSync(); err != nil {
		// Log the error but don't fail the request since DB save succeeded
		// The config will be synced on next proxy host update
		c.Logger().Errorf("Failed to sync proxy host configs: %v", err)
	}

	return c.JSON(http.StatusOK, block)
}

// AddGlobalURIBlockRule adds a single rule to the global URI block
func (h *SecurityHandler) AddGlobalURIBlockRule(c echo.Context) error {
	var req model.AddURIBlockRuleRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Pattern == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Pattern is required"})
	}

	if req.MatchType == "" {
		req.MatchType = model.URIMatchPrefix
	}

	ctx := c.Request().Context()

	block, err := h.uriBlockRepo.AddGlobalRule(ctx, &req)
	if err != nil {
		return databaseError(c, "add global URI block rule", err)
	}

	// Log audit
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "global_uri_block", "global", true, map[string]interface{}{
		"action":     "add_rule",
		"pattern":    req.Pattern,
		"match_type": req.MatchType,
	})

	// Sync all proxy host configs
	go h.syncAllProxyHostsForGlobal()

	return c.JSON(http.StatusOK, block)
}

// RemoveGlobalURIBlockRule removes a single rule from the global URI block
func (h *SecurityHandler) RemoveGlobalURIBlockRule(c echo.Context) error {
	ruleID := c.Param("ruleId")
	if ruleID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Rule ID is required"})
	}

	ctx := c.Request().Context()

	// Get the rule info before deletion for audit log
	existing, _ := h.uriBlockRepo.GetGlobalURIBlock(ctx)
	var removedPattern string
	if existing != nil {
		for _, rule := range existing.Rules {
			if rule.ID == ruleID {
				removedPattern = rule.Pattern
				break
			}
		}
	}

	if err := h.uriBlockRepo.RemoveGlobalRule(ctx, ruleID); err != nil {
		return databaseError(c, "remove global URI block rule", err)
	}

	// Log audit
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "global_uri_block", "global", true, map[string]interface{}{
		"action":  "remove_rule",
		"rule_id": ruleID,
		"pattern": removedPattern,
	})

	// Sync all proxy host configs
	go h.syncAllProxyHostsForGlobal()

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// syncAllProxyHostsForGlobal syncs all proxy host nginx configs (for global rule changes)
func (h *SecurityHandler) syncAllProxyHostsForGlobal() {
	// Use a background context since the HTTP request may have completed
	ctx := context.Background()
	if h.proxyHostService != nil {
		_ = h.proxyHostService.SyncAllConfigs(ctx)
	}
}

// syncAllProxyHostsForGlobalSync syncs all proxy host configs synchronously and returns error
func (h *SecurityHandler) syncAllProxyHostsForGlobalSync() error {
	ctx := context.Background()
	if h.proxyHostService != nil {
		return h.proxyHostService.SyncAllConfigs(ctx)
	}
	return nil
}
