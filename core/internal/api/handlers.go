package api

import (
	"encoding/json"
	"net/http"

	"mihomo-client/core/internal/system"
)

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleTraffic(w http.ResponseWriter, _ *http.Request) {
	up, down, err := s.mihomo.traffic()
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"up": up, "down": down})
}

// --- 动态路径转发 ---

func (s *Server) handleGetProxy(w http.ResponseWriter, r *http.Request) {
	s.mihomo.forward(w, r, "/proxies/"+r.PathValue("name"))
}

func (s *Server) handlePutProxy(w http.ResponseWriter, r *http.Request) {
	s.mihomo.forward(w, r, "/proxies/"+r.PathValue("name"))
}

func (s *Server) handleDeleteConnection(w http.ResponseWriter, r *http.Request) {
	s.mihomo.forward(w, r, "/connections/"+r.PathValue("id"))
}

// --- Core 管理 ---

func (s *Server) handleCoreStatus(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.core.Status())
}

func (s *Server) handleCoreStart(w http.ResponseWriter, _ *http.Request) {
	if err := s.core.Start(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s.core.Status())
}

func (s *Server) handleCoreStop(w http.ResponseWriter, _ *http.Request) {
	if err := s.core.Stop(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s.core.Status())
}

func (s *Server) handleCoreRestart(w http.ResponseWriter, _ *http.Request) {
	if err := s.core.Restart(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s.core.Status())
}

func (s *Server) handleCoreInstall(w http.ResponseWriter, _ *http.Request) {
	if err := s.core.Install(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s.core.Status())
}

// --- 系统代理 ---

func (s *Server) handleGetSystemProxy(w http.ResponseWriter, _ *http.Request) {
	enable, server, err := system.GetSystemProxy()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"enable": enable, "server": server})
}

func (s *Server) handleSetSystemProxy(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Enable bool `json:"enable"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := system.SetSystemProxy(body.Enable, ""); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"enable": body.Enable})
}

// --- TUN ---

func (s *Server) handleGetTun(w http.ResponseWriter, _ *http.Request) {
	info, err := s.mihomo.config()
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"enable": info.Tun.Enable})
}

func (s *Server) handleSetTun(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Enable bool `json:"enable"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.mihomo.patchConfig(map[string]any{"tun": map[string]any{"enable": body.Enable}}); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"enable": body.Enable})
}

// --- 网络信息 ---

func (s *Server) handleIPInfo(w http.ResponseWriter, _ *http.Request) {
	info, err := system.FetchIPInfo()
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, info)
}

func (s *Server) handleLanIP(w http.ResponseWriter, _ *http.Request) {
	ip, err := system.LocalIPv4()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ip": ip})
}

func (s *Server) handleMemory(w http.ResponseWriter, _ *http.Request) {
	status := s.core.Status()
	writeJSON(w, http.StatusOK, system.MemoryStat(status.PID))
}

// --- 订阅 ---

func (s *Server) handleListSubscriptions(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.subs.List())
}

func (s *Server) handleAddSubscription(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if body.Name == "" || body.URL == "" {
		writeError(w, http.StatusBadRequest, "name and url are required")
		return
	}

	sub, err := s.subs.Add(body.Name, body.URL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

func (s *Server) handleUpdateSubscription(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.subs.Update(r.PathValue("id"), body.Name, body.URL); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleDeleteSubscription(w http.ResponseWriter, r *http.Request) {
	if err := s.subs.Delete(r.PathValue("id")); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleRefreshSubscription(w http.ResponseWriter, r *http.Request) {
	if err := s.subs.Refresh(r.PathValue("id")); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleRefreshAllSubscriptions(w http.ResponseWriter, _ *http.Request) {
	go s.subs.UpdateAll()
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
