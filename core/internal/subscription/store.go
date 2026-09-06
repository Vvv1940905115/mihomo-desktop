package subscription

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"

	"mihomo-client/core/internal/model"
)

// Store 管理订阅的持久化与更新。
type Store struct {
	mu       sync.Mutex
	path     string
	items    []model.Subscription
	proxies  map[string][]map[string]any
	onChange func()
}

// NewStore 创建订阅存储，并加载已有数据。
func NewStore(dataDir string) (*Store, error) {
	path := filepath.Join(dataDir, "subscriptions.json")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}

	s := &Store{path: path, items: []model.Subscription{}, proxies: map[string][]map[string]any{}}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &s.items)
}

func (s *Store) save() error {
	data, err := json.MarshalIndent(s.items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o644)
}

// List 返回全部订阅。
func (s *Store) List() []model.Subscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]model.Subscription, len(s.items))
	copy(out, s.items)
	return out
}

// OnChange 注册订阅变更后的回调（用于触发内核配置合并）。
func (s *Store) OnChange(fn func()) {
	s.onChange = fn
}

// Proxies 返回所有订阅解析出的节点（供写入内核配置）。
func (s *Store) Proxies() []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []map[string]any
	for _, list := range s.proxies {
		out = append(out, list...)
	}
	return out
}

// FindProxy 返回指定名称节点的完整原始定义，不存在时 ok 为 false。
func (s *Store) FindProxy(name string) (map[string]any, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, list := range s.proxies {
		for _, p := range list {
			if n, _ := p["name"].(string); n == name {
				return p, true
			}
		}
	}
	return nil, false
}

// Add 新增订阅并异步更新一次。
func (s *Store) Add(name, url string) (model.Subscription, error) {
	sub := model.Subscription{
		ID:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Name:   name,
		URL:    url,
		Kind:   detectKind(url),
		Status: "pending",
	}

	s.mu.Lock()
	s.items = append(s.items, sub)
	err := s.save()
	s.mu.Unlock()
	if err != nil {
		return sub, err
	}

	go s.Refresh(sub.ID)
	return sub, nil
}

// Update 修改订阅的名称或 URL。
func (s *Store) Update(id, name, url string) error {
	s.mu.Lock()
	idx := -1
	for i := range s.items {
		if s.items[i].ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		s.mu.Unlock()
		return fmt.Errorf("subscription %s not found", id)
	}

	urlChanged := s.items[idx].URL != url
	s.items[idx].Name = name
	s.items[idx].URL = url
	s.items[idx].Kind = detectKind(url)
	_ = s.save()
	s.mu.Unlock()

	// URL 变化后节点内容已不同，重新解析并触发配置合并。
	if urlChanged {
		go s.Refresh(id)
	}
	return nil
}

// Delete 删除订阅。
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	deleted := false
	for i := range s.items {
		if s.items[i].ID == id {
			s.items = append(s.items[:i], s.items[i+1:]...)
			deleted = true
			break
		}
	}
	if deleted {
		delete(s.proxies, id)
		_ = s.save()
	}
	s.mu.Unlock()

	if !deleted {
		return fmt.Errorf("subscription %s not found", id)
	}
	if s.onChange != nil {
		s.onChange()
	}
	return nil
}

// Refresh 拉取单个订阅内容并更新元数据。
func (s *Store) Refresh(id string) error {
	s.mu.Lock()
	idx := -1
	for i := range s.items {
		if s.items[i].ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		s.mu.Unlock()
		return fmt.Errorf("subscription %s not found", id)
	}

	s.items[idx].Status = "updating"
	entries, err := s.resolveProxies(s.items[idx])
	if err != nil {
		s.items[idx].Status = "error"
		s.items[idx].UpdatedAt = time.Now()
		_ = s.save()
		s.mu.Unlock()
		return err
	}

	s.items[idx].ProxyCount = len(entries)
	s.items[idx].Status = "active"
	s.items[idx].UpdatedAt = time.Now()
	s.proxies[id] = entries
	_ = s.save()
	s.mu.Unlock()

	if s.onChange != nil {
		s.onChange()
	}
	return nil
}

// UpdateAll 更新全部订阅。
func (s *Store) UpdateAll() {
	s.mu.Lock()
	ids := make([]string, len(s.items))
	for i := range s.items {
		ids[i] = s.items[i].ID
	}
	s.mu.Unlock()

	for _, id := range ids {
		_ = s.Refresh(id)
	}
}

func fetch(url string) ([]byte, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "mihomo-client/0.1")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("subscription returned status %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// resolveProxies 根据订阅类型解析出 mihomo 代理节点定义列表。
func (s *Store) resolveProxies(sub model.Subscription) ([]map[string]any, error) {
	switch sub.Kind {
	case "node":
		p, err := parseProxyURI(sub.URL)
		if err != nil {
			return nil, err
		}
		return []map[string]any{p}, nil
	case "nodes":
		decoded, err := decodeBase64Text(sub.URL)
		if err != nil {
			return nil, err
		}
		return parseProxyEntries(decoded), nil
	default:
		content, err := fetch(sub.URL)
		if err != nil {
			return nil, err
		}
		return parseProxyEntries(content), nil
	}
}

// parseProxyEntries 从订阅内容解析节点，支持 base64、明文 URI 列表与 YAML proxies。
func parseProxyEntries(content []byte) []map[string]any {
	data := content
	if !strings.Contains(string(content), "proxies:") {
		if decoded, err := decodeBase64Text(string(content)); err == nil {
			data = decoded
		}
	}

	if strings.Contains(string(data), "proxies:") {
		if entries := parseYAMLProxies(data); len(entries) > 0 {
			return entries
		}
	}
	return proxiesFromLines(data)
}

// parseYAMLProxies 解析 YAML 订阅里的 proxies 列表（已是 mihomo 结构）。
func parseYAMLProxies(data []byte) []map[string]any {
	var doc struct {
		Proxies []map[string]any `yaml:"proxies"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil
	}
	return doc.Proxies
}

func proxiesFromLines(data []byte) []map[string]any {
	var out []map[string]any
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if p, err := parseProxyURI(line); err == nil {
			out = append(out, p)
		}
	}
	return out
}

// parseProxyURI 将节点 URI 解析为 mihomo 代理定义。
func parseProxyURI(uri string) (map[string]any, error) {
	lower := strings.ToLower(uri)
	switch {
	case strings.HasPrefix(lower, "vmess://"):
		return parseVmess(uri)
	case strings.HasPrefix(lower, "vless://"):
		return parseVless(uri)
	case strings.HasPrefix(lower, "trojan://"):
		return parseTrojan(uri)
	case strings.HasPrefix(lower, "ss://"):
		return parseShadowsocks(uri)
	default:
		return nil, fmt.Errorf("unsupported proxy scheme")
	}
}

func parseVmess(uri string) (map[string]any, error) {
	data, err := decodeBase64Text(uri[len("vmess://"):])
	if err != nil {
		return nil, err
	}

	var v struct {
		PS   string `json:"ps"`
		Add  string `json:"add"`
		Port int    `json:"port"`
		ID   string `json:"id"`
		AID  int    `json:"aid"`
		Net  string `json:"net"`
		Host string `json:"host"`
		Path string `json:"path"`
		TLS  string `json:"tls"`
	}
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, err
	}
	if v.Add == "" || v.ID == "" {
		return nil, fmt.Errorf("invalid vmess uri")
	}

	name := v.PS
	if name == "" {
		name = "vmess"
	}

	m := map[string]any{
		"name":    name,
		"type":    "vmess",
		"server":  v.Add,
		"port":    v.Port,
		"uuid":    v.ID,
		"alterId": v.AID,
		"cipher":  "auto",
		"udp":     true,
	}

	switch v.Net {
	case "ws":
		m["network"] = "ws"
		opts := map[string]any{"path": v.Path}
		if v.Host != "" {
			opts["headers"] = map[string]any{"Host": v.Host}
		}
		m["ws-opts"] = opts
	case "":
		// 默认 tcp
	default:
		m["network"] = v.Net
	}

	if v.TLS == "tls" {
		m["tls"] = true
	}
	return m, nil
}

func parseVless(uri string) (map[string]any, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return nil, err
	}
	port, _ := strconv.Atoi(u.Port())

	name := u.Fragment
	if name == "" {
		name = "vless"
	}

	m := map[string]any{
		"name":   name,
		"type":   "vless",
		"server": u.Hostname(),
		"port":   port,
		"uuid":   u.User.Username(),
		"udp":    true,
	}

	q := u.Query()
	if q.Get("security") == "tls" || q.Get("security") == "reality" {
		m["tls"] = true
	}
	if net := q.Get("type"); net != "" && net != "tcp" {
		m["network"] = net
	}
	return m, nil
}

func parseTrojan(uri string) (map[string]any, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return nil, err
	}
	port, _ := strconv.Atoi(u.Port())

	name := u.Fragment
	if name == "" {
		name = "trojan"
	}

	m := map[string]any{
		"name":     name,
		"type":     "trojan",
		"server":   u.Hostname(),
		"port":     port,
		"password": u.User.Username(),
		"udp":      true,
	}

	q := u.Query()
	if q.Get("security") == "tls" || q.Get("security") == "reality" {
		m["tls"] = true
	}
	if sni := q.Get("sni"); sni != "" {
		m["sni"] = sni
	}
	if net := q.Get("type"); net != "" && net != "tcp" {
		m["network"] = net
	}
	return m, nil
}

func parseShadowsocks(uri string) (map[string]any, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return nil, err
	}
	port, _ := strconv.Atoi(u.Port())

	name := u.Fragment
	if name == "" {
		name = "ss"
	}

	method, password := "", ""
	if u.User != nil {
		user := u.User.String()
		if decoded, err := decodeBase64Text(user); err == nil && strings.Contains(string(decoded), ":") {
			parts := strings.SplitN(string(decoded), ":", 2)
			method, password = parts[0], parts[1]
		} else if idx := strings.Index(user, ":"); idx >= 0 {
			method = user[:idx]
			password = user[idx+1:]
		}
	}

	return map[string]any{
		"name":     name,
		"type":     "ss",
		"server":   u.Hostname(),
		"port":     port,
		"cipher":   method,
		"password": password,
		"udp":      true,
	}, nil
}

// detectKind 识别输入内容类型：远程订阅、单节点或 Base64 订阅。
func detectKind(input string) string {
	lower := strings.ToLower(strings.TrimSpace(input))
	switch {
	case strings.HasPrefix(lower, "http://"), strings.HasPrefix(lower, "https://"):
		return "remote"
	case strings.HasPrefix(lower, "vmess://"),
		strings.HasPrefix(lower, "vless://"),
		strings.HasPrefix(lower, "trojan://"),
		strings.HasPrefix(lower, "ss://"):
		return "node"
	case looksLikeBase64(input):
		return "nodes"
	default:
		return "remote"
	}
}

func looksLikeBase64(s string) bool {
	compact := strings.Join(strings.Fields(s), "")
	if len(compact) < 40 {
		return false
	}
	for _, c := range compact {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9',
			c == '+', c == '/', c == '=', c == '-', c == '_':
		default:
			return false
		}
	}
	_, err := decodeBase64Text(compact)
	return err == nil
}

func decodeBase64Text(s string) ([]byte, error) {
	compact := strings.Join(strings.Fields(s), "")
	normalized := strings.NewReplacer("-", "+", "_", "/").Replace(compact)
	if rem := len(normalized) % 4; rem != 0 {
		normalized += strings.Repeat("=", 4-rem)
	}
	if data, err := base64.StdEncoding.DecodeString(normalized); err == nil {
		return data, nil
	}
	return base64.RawStdEncoding.DecodeString(strings.TrimRight(normalized, "="))
}
