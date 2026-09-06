package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
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
  - MATCH,PROXY
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

// MergeProxies 将订阅解析出的节点合并进 config.yaml，并保持 PROXY 组可选。
func MergeProxies(path string, proxies []map[string]any) error {
	var doc map[string]any
	if data, err := os.ReadFile(path); err == nil {
		if err := yaml.Unmarshal(data, &doc); err != nil {
			return err
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	if doc == nil {
		doc = map[string]any{}
	}

	names := make([]string, 0, len(proxies)+1)
	seen := map[string]bool{}
	dedup := make([]map[string]any, 0, len(proxies))
	for _, p := range proxies {
		name, _ := p["name"].(string)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		dedup = append(dedup, p)
		names = append(names, name)
	}
	names = append(names, "DIRECT")

	doc["proxies"] = dedup
	mergeProxyGroup(doc, names)
	routeThroughProxy(doc)

	out, err := yaml.Marshal(doc)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

// routeThroughProxy 将兜底规则 MATCH,DIRECT 替换为 MATCH,PROXY，
// 使 PROXY 组真正参与路由。仅替换显式的 MATCH,DIRECT，避免覆盖其他自定义规则。
func routeThroughProxy(doc map[string]any) {
	raw, ok := doc["rules"]
	if !ok {
		return
	}
	rules, ok := raw.([]any)
	if !ok {
		return
	}
	for i, r := range rules {
		if s, ok := r.(string); ok && s == "MATCH,DIRECT" {
			rules[i] = "MATCH,PROXY"
		}
	}
	doc["rules"] = rules
}

// mergeProxyGroup 更新 PROXY 组的可选节点列表，不存在则补一个 select 组。
func mergeProxyGroup(doc map[string]any, names []string) {
	raw := doc["proxy-groups"]
	groups, _ := raw.([]any)
	for i, g := range groups {
		m, ok := g.(map[string]any)
		if !ok {
			continue
		}
		if name, _ := m["name"].(string); name == "PROXY" {
			m["proxies"] = names
			groups[i] = m
			doc["proxy-groups"] = groups
			return
		}
	}

	groups = append(groups, map[string]any{
		"name":    "PROXY",
		"type":    "select",
		"proxies": names,
	})
	doc["proxy-groups"] = groups
}
