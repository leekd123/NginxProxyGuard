package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
)

// URI Block handlers

func (h *SecurityHandler) GetURIBlock(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	uriBlock, err := h.securityService.GetURIBlock(c.Request().Context(), proxyHostID)
	if err != nil {
		return databaseError(c, "get URI block", err)
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

	uriBlock, err := h.securityService.UpsertURIBlock(c.Request().Context(), proxyHostID, &req, skipReload)
	if err != nil {
		return internalError(c, "upsert URI block", err)
	}

	// Get host name for audit
	hostName := h.securityService.GetHostName(c.Request().Context(), proxyHostID)

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", hostName, uriBlock.Enabled, nil)

	return c.JSON(http.StatusOK, uriBlock)
}

func (h *SecurityHandler) DeleteURIBlock(c echo.Context) error {
	proxyHostID := c.Param("proxyHostId")

	// Get host name for audit
	hostName := h.securityService.GetHostName(c.Request().Context(), proxyHostID)

	if err := h.securityService.DeleteURIBlock(c.Request().Context(), proxyHostID); err != nil {
		return internalError(c, "delete URI block", err)
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

	uriBlock, err := h.securityService.AddURIBlockRule(c.Request().Context(), proxyHostID, &req)
	if err != nil {
		return internalError(c, "add URI block rule", err)
	}

	// Get host name for audit
	hostName := h.securityService.GetHostName(c.Request().Context(), proxyHostID)

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

	if err := h.securityService.RemoveURIBlockRule(c.Request().Context(), proxyHostID, ruleID); err != nil {
		return internalError(c, "remove URI block rule", err)
	}

	// Get host name for audit
	hostName := h.securityService.GetHostName(c.Request().Context(), proxyHostID)

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

	result, err := h.securityService.BulkAddURIBlockRule(ctx, req.Pattern, req.MatchType, req.Description, req.HostIDs)
	if err != nil {
		if err.Error() == "no target hosts found" {
			return badRequestError(c, "No target hosts found")
		}
		return databaseError(c, "bulk add URI block rule", err)
	}

	// Audit log for each added host
	auditCtx := service.ContextWithAudit(ctx, c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "uri_block", "bulk", true, map[string]interface{}{
		"action":      "bulk_add_rule",
		"pattern":     req.Pattern,
		"match_type":  req.MatchType,
		"added_count": result.AddedCount,
		"total_hosts": result.TotalHosts,
	})

	response := map[string]interface{}{
		"added_count": result.AddedCount,
		"total_hosts": result.TotalHosts,
		"pattern":     result.Pattern,
		"match_type":  result.MatchType,
	}
	if len(result.Errors) > 0 {
		response["errors"] = result.Errors
	}

	return c.JSON(http.StatusOK, response)
}

// ListAllURIBlocks returns all URI blocks across all hosts
func (h *SecurityHandler) ListAllURIBlocks(c echo.Context) error {
	blocks, err := h.securityService.ListAllURIBlocks(c.Request().Context())
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
	block, err := h.securityService.GetGlobalURIBlock(c.Request().Context())
	if err != nil {
		return databaseError(c, "get global URI block", err)
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

	block, err := h.securityService.UpdateGlobalURIBlock(c.Request().Context(), &req)
	if err != nil {
		return databaseError(c, "update global URI block", err)
	}

	// Log audit
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "global_uri_block", "global", block.Enabled, map[string]interface{}{
		"rules_count": len(block.Rules),
	})

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

	block, err := h.securityService.AddGlobalURIBlockRule(c.Request().Context(), &req)
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

	return c.JSON(http.StatusOK, block)
}

// RemoveGlobalURIBlockRule removes a single rule from the global URI block
func (h *SecurityHandler) RemoveGlobalURIBlockRule(c echo.Context) error {
	ruleID := c.Param("ruleId")
	if ruleID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Rule ID is required"})
	}

	removedPattern, err := h.securityService.RemoveGlobalURIBlockRule(c.Request().Context(), ruleID)
	if err != nil {
		return databaseError(c, "remove global URI block rule", err)
	}

	// Log audit
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogSecurityFeatureUpdate(auditCtx, "global_uri_block", "global", true, map[string]interface{}{
		"action":  "remove_rule",
		"rule_id": ruleID,
		"pattern": removedPattern,
	})

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
