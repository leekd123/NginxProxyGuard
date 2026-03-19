package handler

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"nginx-proxy-guard/internal/config"
	"nginx-proxy-guard/internal/model"
	"nginx-proxy-guard/internal/service"
)

// Banned IP handlers

func (h *SecurityHandler) ListBannedIPs(c echo.Context) error {
	proxyHostID := c.QueryParam("proxy_host_id")
	filterType := c.QueryParam("filter")
	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	ctx := c.Request().Context()
	var result *model.BannedIPListResponse
	var err error

	switch filterType {
	case "global":
		result, err = h.rateLimitRepo.ListGlobalBannedIPs(ctx, page, perPage)
	case "host":
		if proxyHostID != "" {
			result, err = h.rateLimitRepo.ListBannedIPs(ctx, &proxyHostID, page, perPage)
		} else {
			result, err = h.rateLimitRepo.ListHostBannedIPs(ctx, page, perPage)
		}
	default:
		var proxyHostIDPtr *string
		if proxyHostID != "" {
			proxyHostIDPtr = &proxyHostID
		}
		result, err = h.rateLimitRepo.ListBannedIPs(ctx, proxyHostIDPtr, page, perPage)
	}

	if err != nil {
		return databaseError(c, "list banned IPs", err)
	}

	return c.JSON(http.StatusOK, result)
}

func (h *SecurityHandler) BanIP(c echo.Context) error {
	var req struct {
		ProxyHostID *string `json:"proxy_host_id,omitempty"`
		IPAddress   string  `json:"ip_address"`
		Reason      string  `json:"reason,omitempty"`
		BanTime     int     `json:"ban_time,omitempty"`
	}

	if err := c.Bind(&req); err != nil {
		return badRequestError(c, "Invalid request body")
	}

	if req.IPAddress == "" {
		return badRequestError(c, "ip_address is required")
	}

	if !ValidateIPAddress(req.IPAddress) && !ValidateCIDR(req.IPAddress) {
		return badRequestError(c, "Invalid IP address format. Must be a valid IPv4, IPv6, or CIDR notation")
	}

	bannedIP, err := h.rateLimitRepo.BanIP(c.Request().Context(), req.ProxyHostID, req.IPAddress, req.Reason, req.BanTime)
	if err != nil {
		return databaseError(c, "ban IP", err)
	}

	// Add to Redis cache for fast lookup
	if h.redisCache != nil && h.redisCache.IsReady() {
		hostID := ""
		if req.ProxyHostID != nil {
			hostID = *req.ProxyHostID
		}
		var ttl time.Duration
		if req.BanTime > 0 {
			ttl = time.Duration(req.BanTime) * time.Second
		}
		h.redisCache.AddBannedIP(c.Request().Context(), req.IPAddress, hostID, ttl)
	}

	// Record ban history
	if h.historyRepo != nil {
		domainName := ""
		if req.ProxyHostID != nil {
			host, _ := h.proxyHostRepo.GetByID(c.Request().Context(), *req.ProxyHostID)
			if host != nil && len(host.DomainNames) > 0 {
				domainName = host.DomainNames[0]
			}
		}

		// Get user info from context
		var userID *string
		var userEmail string
		if uid, ok := c.Get("user_id").(string); ok && uid != "" {
			userID = &uid
		}
		if email, ok := c.Get("username").(string); ok {
			userEmail = email
		}

		historyEvent := &model.IPBanHistory{
			EventType:   model.BanEventTypeBan,
			IPAddress:   req.IPAddress,
			ProxyHostID: req.ProxyHostID,
			DomainName:  domainName,
			Reason:      req.Reason,
			Source:      model.BanSourceManual,
			BanDuration: &req.BanTime,
			ExpiresAt:   bannedIP.ExpiresAt,
			IsPermanent: bannedIP.IsPermanent,
			IsAuto:      false,
			UserID:      userID,
			UserEmail:   userEmail,
		}
		if err := h.historyRepo.RecordBanEvent(c.Request().Context(), historyEvent); err != nil {
			c.Logger().Errorf("Failed to record ban history: %v", err)
		}
	}

	// Regenerate nginx config to apply banned IP (in background for speed)
	// FIXED: Use debounced reload instead of updating all hosts individually
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), config.ContextTimeout)
		defer cancel()

		if h.proxyHostService != nil {
			if req.ProxyHostID != nil {
				// Regenerate specific host config without immediate reload
				if _, err := h.proxyHostService.UpdateWithoutReload(ctx, *req.ProxyHostID, nil); err != nil {
					log.Printf("[BanIP] Failed to regenerate config for host: %v", err)
					return
				}
			} else {
				// For global ban, regenerate all enabled hosts without reload
				hosts, _, err := h.proxyHostRepo.List(ctx, 1, config.MaxWAFRulesLimit, "", "", "")
				if err == nil && hosts != nil {
					for _, host := range hosts {
						if host.Enabled {
							if _, err := h.proxyHostService.UpdateWithoutReload(ctx, host.ID, nil); err != nil {
								log.Printf("[BanIP] Failed to regenerate config for host %s: %v", host.ID, err)
							}
						}
					}
				}
			}
			// Request single debounced reload after all configs are generated
			if h.nginxReloader != nil {
				h.nginxReloader.RequestReload(ctx)
			}
		}
	}()

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogIPBanned(auditCtx, req.IPAddress, req.Reason, req.BanTime)

	return c.JSON(http.StatusCreated, bannedIP)
}

func (h *SecurityHandler) UnbanIP(c echo.Context) error {
	id := c.Param("id")

	// Get banned IP info before deleting (for history and cache removal)
	bannedIP, _ := h.rateLimitRepo.GetBannedIPByID(c.Request().Context(), id)

	if err := h.rateLimitRepo.UnbanIP(c.Request().Context(), id); err != nil {
		return databaseError(c, "unban IP", err)
	}

	// Remove from Redis cache
	if h.redisCache != nil && bannedIP != nil {
		hostID := ""
		if bannedIP.ProxyHostID != nil {
			hostID = *bannedIP.ProxyHostID
		}
		if err := h.redisCache.RemoveBannedIP(c.Request().Context(), bannedIP.IPAddress, hostID); err != nil {
			c.Logger().Errorf("Failed to remove banned IP from cache: %v", err)
		}
	}

	// Record unban history
	if h.historyRepo != nil && bannedIP != nil {
		var userID *string
		var userEmail string
		if uid, ok := c.Get("user_id").(string); ok && uid != "" {
			userID = &uid
		}
		if email, ok := c.Get("username").(string); ok {
			userEmail = email
		}

		historyEvent := &model.IPBanHistory{
			EventType:   model.BanEventTypeUnban,
			IPAddress:   bannedIP.IPAddress,
			ProxyHostID: bannedIP.ProxyHostID,
			Reason:      "Manual unban",
			Source:      model.BanSourceManual,
			IsAuto:      false,
			UserID:      userID,
			UserEmail:   userEmail,
		}
		if err := h.historyRepo.RecordBanEvent(c.Request().Context(), historyEvent); err != nil {
			c.Logger().Errorf("Failed to record unban history: %v", err)
		}
	}

	// Regenerate all enabled host configs in background for speed
	// Pass nil to UpdateWithoutReload to regenerate config without DB update
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), config.ContextTimeout)
		defer cancel()

		if h.proxyHostService != nil && h.proxyHostRepo != nil {
			hosts, _, err := h.proxyHostRepo.List(ctx, 1, config.MaxWAFRulesLimit, "", "", "")
			if err == nil && hosts != nil {
				// Regenerate all host configs sequentially WITHOUT reload
				for _, host := range hosts {
					if host.Enabled {
						if _, err := h.proxyHostService.UpdateWithoutReload(ctx, host.ID, nil); err != nil {
							log.Printf("[UnbanIP] Failed to regenerate config for host %s: %v", host.ID, err)
						}
					}
				}
				// Request single debounced reload after all configs are updated
				if h.nginxReloader != nil {
					h.nginxReloader.RequestReload(ctx)
				}
			}
		}
	}()

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogIPUnbanned(auditCtx, id)

	return c.NoContent(http.StatusNoContent)
}

func (h *SecurityHandler) UnbanIPByAddress(c echo.Context) error {
	ip := c.QueryParam("ip")
	if ip == "" {
		return badRequestError(c, "ip parameter is required")
	}

	// Record unban history before deleting
	if h.historyRepo != nil {
		var userID *string
		var userEmail string
		if uid, ok := c.Get("user_id").(string); ok && uid != "" {
			userID = &uid
		}
		if email, ok := c.Get("username").(string); ok {
			userEmail = email
		}

		historyEvent := &model.IPBanHistory{
			EventType: model.BanEventTypeUnban,
			IPAddress: ip,
			Reason:    "Manual unban by IP address",
			Source:    model.BanSourceManual,
			IsAuto:    false,
			UserID:    userID,
			UserEmail: userEmail,
		}
		if err := h.historyRepo.RecordBanEvent(c.Request().Context(), historyEvent); err != nil {
			c.Logger().Errorf("Failed to record unban history by address: %v", err)
		}
	}

	if err := h.rateLimitRepo.UnbanIPByAddress(c.Request().Context(), ip); err != nil {
		return databaseError(c, "unban IP by address", err)
	}

	// Remove from Redis cache (both global and all host-specific)
	if h.redisCache != nil {
		// Remove from global ban list
		if err := h.redisCache.RemoveBannedIP(c.Request().Context(), ip, ""); err != nil {
			c.Logger().Errorf("Failed to remove banned IP from global cache: %v", err)
		}
		// Also try to remove from all host-specific caches
		if h.proxyHostRepo != nil {
			hosts, _, err := h.proxyHostRepo.List(c.Request().Context(), 1, config.MaxWAFRulesLimit, "", "", "")
			if err == nil && hosts != nil {
				for _, host := range hosts {
					h.redisCache.RemoveBannedIP(c.Request().Context(), ip, host.ID)
				}
			}
		}
	}

	// Regenerate all enabled host configs in background with debounced reload
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), config.ContextTimeout)
		defer cancel()

		if h.proxyHostService != nil && h.proxyHostRepo != nil {
			hosts, _, err := h.proxyHostRepo.List(ctx, 1, config.MaxWAFRulesLimit, "", "", "")
			if err == nil && hosts != nil {
				// Regenerate all host configs sequentially WITHOUT reload
				for _, host := range hosts {
					if host.Enabled {
						if _, err := h.proxyHostService.UpdateWithoutReload(ctx, host.ID, nil); err != nil {
							log.Printf("[UnbanIPByAddress] Failed to regenerate config for host %s: %v", host.ID, err)
						}
					}
				}
				// Request single debounced reload after all configs are updated
				if h.nginxReloader != nil {
					h.nginxReloader.RequestReload(ctx)
				}
			}
		}
	}()

	// Audit log
	auditCtx := service.ContextWithAudit(c.Request().Context(), c)
	h.audit.LogIPUnbanned(auditCtx, ip)

	return c.NoContent(http.StatusNoContent)
}
