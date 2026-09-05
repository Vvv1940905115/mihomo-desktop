package subscription

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"

	"mihomo-client/core/internal/model"
)

// Store 管理订阅的持久化与更新。
type Store struct {
	mu    sync.Mutex
	path  string
	items []model.Subscription
}

// NewStore 创建订阅存储，并加载已有数据。
func NewStore(dataDir string) (*Store, error) {
	path := filepath.Join(dataDir, "subscriptions.json")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}

	s := &Store{path: path, items: []model.Subscription{}}
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

// Add 新增订阅并异步更新一次。
func (s *Store) Add(name, url string) (model.Subscription, error) {
	sub := model.Subscription{
		ID:     fmt.Sprintf("%d", time.Now().UnixNano()),
		Name:   name,
		URL:    url,
		Status: "pending",
	}

	s.mu.Lock()
	s.items = append(s.items, sub)
	s.mu.Unlock()

	go s.Refresh(sub.ID)
	return sub, nil
}

// Update 修改订阅的名称或 URL。
func (s *Store) Update(id, name, url string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.items {
		if s.items[i].ID == id {
			s.items[i].Name = name
			s.items[i].URL = url
			return s.save()
		}
	}
	return fmt.Errorf("subscription %s not found", id)
}

// Delete 删除订阅。
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.items {
		if s.items[i].ID == id {
			s.items = append(s.items[:i], s.items[i+1:]...)
			return s.save()
		}
	}
	return fmt.Errorf("subscription %s not found", id)
}

// Refresh 拉取单个订阅内容并更新元数据。
func (s *Store) Refresh(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.items {
		if s.items[i].ID != id {
			continue
		}

		s.items[i].Status = "updating"
		content, err := fetch(s.items[i].URL)
		if err != nil {
			s.items[i].Status = "error"
			s.items[i].UpdatedAt = time.Now()
			_ = s.save()
			return err
		}

		s.items[i].ProxyCount = countProxies(content)
		s.items[i].Status = "active"
		s.items[i].UpdatedAt = time.Now()
		return s.save()
	}

	return fmt.Errorf("subscription %s not found", id)
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

func countProxies(content []byte) int {
	data := content
	if !strings.Contains(string(content), "proxies:") {
		if decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(content))); err == nil {
			data = decoded
		}
	}

	var doc struct {
		Proxies []yaml.Node `yaml:"proxies"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return 0
	}
	return len(doc.Proxies)
}
