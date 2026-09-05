package config

import (
	"os"
	"path/filepath"
)

// defaultConfig 是 Mihomo 的最小可用默认配置。
const defaultConfig = `mixed-port: 7897
port: 7898
socks-port: 7899
mode: rule
log-level: info
external-controller: 127.0.0.1:9090
ipv6: false
allow-lan: false
unified-delay: true
tcp-concurrent: true
tun:
  enable: false
  stack: gvisor
  dns-hijack:
    - any:53
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver:
    - 223.5.5.5
    - 8.8.8.8
proxies: []
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,DIRECT
`

// EnsureDefault 在配置不存在时写入默认配置。
func EnsureDefault(path string) error {
	if _, err := os.Stat(path); err == nil {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	return os.WriteFile(path, []byte(defaultConfig), 0o644)
}
