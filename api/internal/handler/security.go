package handler

import (
	"nginx-proxy-guard/internal/service"
)

type SecurityHandler struct {
	securityService *service.SecurityService
	audit           *service.AuditService
}

func NewSecurityHandler(
	securityService *service.SecurityService,
	audit *service.AuditService,
) *SecurityHandler {
	return &SecurityHandler{
		securityService: securityService,
		audit:           audit,
	}
}
