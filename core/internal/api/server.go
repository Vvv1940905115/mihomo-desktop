package api

import (
	"net/http"

	"mihomo-client/core/internal/core"
	"mihomo-client/core/internal/subscription"
)

// Server 是控制面 HTTP 服务，聚合 Core、订阅与 Mihomo 转发。
type Server struct {
	core   *core.Manager
	subs   *subscription.Store
	mihomo *MihomoProxy
}

// NewServer 构建控制面服务。
func NewServer(dataDir string) (*Server, error) {
	subs, err := subscription.NewStore(dataDir)
	if err != nil {
		return nil, err
	}

	return &Server{
		core:   core.NewManager(dataDir),
		subs:   subs,
		mihomo: newMihomoProxy(),
	}, nil
}

// Handler 返回带 CORS 的完整路由。
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", s.handleHealth)

	// 转发 Mihomo（固定路径）
	mux.HandleFunc("GET /api/traffic", s.handleTraffic)
	mux.HandleFunc("GET /api/proxies", s.forward("/proxies"))
	mux.HandleFunc("GET /api/connections", s.forward("/connections"))
	mux.HandleFunc("GET /api/configs", s.forward("/configs"))
	mux.HandleFunc("GET /api/version", s.forward("/version"))
	mux.HandleFunc("GET /api/logs", s.forwardStream("/logs"))
	// 出站模式：PUT /api/configs → PATCH /configs（Mihomo 局部更新）
	mux.HandleFunc("PUT /api/configs", s.forwardWithMethod(http.MethodPatch, "/configs"))

	// 转发 Mihomo（动态路径）
	mux.HandleFunc("GET /api/proxies/{name}", s.handleGetProxy)
	mux.HandleFunc("GET /api/proxies/{name}/delay", s.handleProxyDelay)
	mux.HandleFunc("PUT /api/proxies/{name}", s.handlePutProxy)
	mux.HandleFunc("DELETE /api/connections/{id}", s.handleDeleteConnection)

	// Core 管理
	mux.HandleFunc("GET /api/core/status", s.handleCoreStatus)
	mux.HandleFunc("POST /api/core/start", s.handleCoreStart)
	mux.HandleFunc("POST /api/core/stop", s.handleCoreStop)
	mux.HandleFunc("POST /api/core/restart", s.handleCoreRestart)
	mux.HandleFunc("POST /api/core/install", s.handleCoreInstall)

	// 系统
	mux.HandleFunc("GET /api/system-proxy", s.handleGetSystemProxy)
	mux.HandleFunc("PUT /api/system-proxy", s.handleSetSystemProxy)
	mux.HandleFunc("GET /api/tun", s.handleGetTun)
	mux.HandleFunc("PUT /api/tun", s.handleSetTun)
	mux.HandleFunc("GET /api/ip-info", s.handleIPInfo)
	mux.HandleFunc("GET /api/lan-ip", s.handleLanIP)
	mux.HandleFunc("GET /api/memory", s.handleMemory)

	// 订阅
	mux.HandleFunc("GET /api/subscriptions", s.handleListSubscriptions)
	mux.HandleFunc("POST /api/subscriptions", s.handleAddSubscription)
	mux.HandleFunc("PUT /api/subscriptions/{id}", s.handleUpdateSubscription)
	mux.HandleFunc("DELETE /api/subscriptions/{id}", s.handleDeleteSubscription)
	mux.HandleFunc("POST /api/subscriptions/{id}/update", s.handleRefreshSubscription)
	mux.HandleFunc("POST /api/subscriptions/update-all", s.handleRefreshAllSubscriptions)

	return corsMiddleware(mux)
}

// forward 返回一个转发到指定 Mihomo 路径的处理器。
func (s *Server) forward(path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.mihomo.forward(w, r, path)
	}
}

// forwardWithMethod 返回一个以指定方法转发到 Mihomo 路径的处理器。
func (s *Server) forwardWithMethod(method, path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.mihomo.forwardWithMethod(w, r, method, path)
	}
}

// forwardStream 返回一个流式转发处理器。
func (s *Server) forwardStream(path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.mihomo.forwardStream(w, r, path)
	}
}
