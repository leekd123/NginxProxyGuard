package handler

import (
	"nginx-proxy-guard/internal/repository"
	"nginx-proxy-guard/internal/service"
	"nginx-proxy-guard/pkg/cache"
)

type SecurityHandler struct {
	rateLimitRepo    *repository.RateLimitRepository
	botFilterRepo    *repository.BotFilterRepository
	secHeadersRepo   *repository.SecurityHeadersRepository
	upstreamRepo     *repository.UpstreamRepository
	proxyHostRepo    *repository.ProxyHostRepository
	proxyHostService *service.ProxyHostService
	audit            *service.AuditService
	redisCache       *cache.RedisClient
	historyRepo      *repository.IPBanHistoryRepository
	uriBlockRepo     *repository.URIBlockRepository
	nginxReloader    *service.NginxReloader
}

func NewSecurityHandler(
	rateLimitRepo *repository.RateLimitRepository,
	botFilterRepo *repository.BotFilterRepository,
	secHeadersRepo *repository.SecurityHeadersRepository,
	upstreamRepo *repository.UpstreamRepository,
	proxyHostRepo *repository.ProxyHostRepository,
	proxyHostService *service.ProxyHostService,
	audit *service.AuditService,
	redisCache *cache.RedisClient,
	historyRepo *repository.IPBanHistoryRepository,
	uriBlockRepo *repository.URIBlockRepository,
	nginxReloader *service.NginxReloader,
) *SecurityHandler {
	return &SecurityHandler{
		rateLimitRepo:    rateLimitRepo,
		botFilterRepo:    botFilterRepo,
		secHeadersRepo:   secHeadersRepo,
		upstreamRepo:     upstreamRepo,
		proxyHostRepo:    proxyHostRepo,
		proxyHostService: proxyHostService,
		audit:            audit,
		redisCache:       redisCache,
		historyRepo:      historyRepo,
		uriBlockRepo:     uriBlockRepo,
		nginxReloader:    nginxReloader,
	}
}
