package model

import "time"

// Subscription 描述一个订阅配置。
type Subscription struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	URL        string    `json:"url"`
	Kind       string    `json:"kind"` // remote | node | nodes
	UpdatedAt  time.Time `json:"updatedAt"`
	Status     string    `json:"status"`
	ProxyCount int       `json:"proxyCount"`
}

// CoreStatus 描述 Mihomo Core 的运行状态。
type CoreStatus struct {
	Version string `json:"version"`
	Running bool   `json:"running"`
	Uptime  int64  `json:"uptime"` // 秒
	PID     int    `json:"pid"`
	Error   string `json:"error,omitempty"`
}

// MemoryStat 描述进程内存占用（字节）。
type MemoryStat struct {
	Core uint64 `json:"core"`
	UI   uint64 `json:"ui"`
}

// IPInfo 描述公网 IP 信息。
type IPInfo struct {
	IP      string `json:"ip"`
	Country string `json:"country"`
	ISP     string `json:"isp"`
}
