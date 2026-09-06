package core

import (
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"mihomo-client/core/internal/config"
	"mihomo-client/core/internal/model"

	"gopkg.in/yaml.v3"
)

// Manager 负责 Mihomo Core 进程的生命周期。
type Manager struct {
	mu         sync.Mutex
	dataDir    string
	binaryPath string
	configPath string
	cmd        *exec.Cmd
	exit       chan error
	startTime  time.Time
}

// NewManager 创建一个 Core 管理器。
func NewManager(dataDir string) *Manager {
	return &Manager{
		dataDir:    dataDir,
		binaryPath: filepath.Join(dataDir, "mihomo", "mihomo.exe"),
		configPath: filepath.Join(dataDir, "config.yaml"),
	}
}

// Start 启动 Mihomo Core。若二进制不存在则返回明确错误。
func (m *Manager) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.cmd != nil {
		return errors.New("core is already running")
	}

	if _, err := os.Stat(m.binaryPath); os.IsNotExist(err) {
		return fmt.Errorf("mihomo binary not found at %s", m.binaryPath)
	}

	if err := config.EnsureDefault(m.configPath); err != nil {
		return fmt.Errorf("generate config: %w", err)
	}

	if inUse, err := m.portsInUse(); err == nil && len(inUse) > 0 {
		return fmt.Errorf("mihomo ports already in use: %s", strings.Join(inUse, ", "))
	}

	cmd := exec.Command(m.binaryPath, "-d", m.dataDir, "-f", m.configPath)
	cmd.Dir = m.dataDir

	if logFile, err := os.OpenFile(
		filepath.Join(m.dataDir, "mihomo.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0o644,
	); err == nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
		defer logFile.Close()
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start mihomo: %w", err)
	}

	// 启动后做一次存活探测：端口冲突或配置错误会导致 mihomo 秒退，
	// 若不加检测，Start 会误报 running 并留下僵尸进程。
	exit := make(chan error, 1)
	go func() { exit <- cmd.Wait() }()

	select {
	case err := <-exit:
		return fmt.Errorf("mihomo exited immediately: %v", err)
	case <-time.After(500 * time.Millisecond):
	}

	m.cmd = cmd
	m.exit = exit
	m.startTime = time.Now()
	return nil
}

// Stop 停止 Mihomo Core。
func (m *Manager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.cmd == nil {
		return nil
	}

	if err := m.cmd.Process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		return fmt.Errorf("stop mihomo: %w", err)
	}

	// 等待进程真正退出，确保监听端口被释放；否则紧随其后的 Restart/Start
	// 会因端口仍被占用而误判失败，把核心留在 stopped 状态。
	select {
	case <-m.exit:
	case <-time.After(3 * time.Second):
	}

	m.cmd = nil
	m.exit = nil
	m.startTime = time.Time{}
	return nil
}

// Restart 重启 Mihomo Core。
func (m *Manager) Restart() error {
	if err := m.Stop(); err != nil {
		return err
	}
	return m.Start()
}

// Status 返回 Core 当前状态。
func (m *Manager) Status() model.CoreStatus {
	m.mu.Lock()
	defer m.mu.Unlock()

	status := model.CoreStatus{Running: m.cmd != nil}
	if m.cmd == nil {
		if _, err := os.Stat(m.binaryPath); os.IsNotExist(err) {
			status.Error = "mihomo binary not installed"
		} else {
			status.Error = "stopped"
		}
		return status
	}

	status.PID = m.cmd.Process.Pid
	status.Uptime = int64(time.Since(m.startTime).Seconds())
	status.Version = "unknown"
	return status
}

// BinaryPath 返回 Mihomo 二进制路径。
func (m *Manager) BinaryPath() string {
	return m.binaryPath
}

// ConfigPath 返回内核配置文件路径。
func (m *Manager) ConfigPath() string {
	return m.configPath
}

// coreConfig 是 config.yaml 中用于端口占用检测的字段。
type coreConfig struct {
	MixedPort          int    `yaml:"mixed-port"`
	Port               int    `yaml:"port"`
	SocksPort          int    `yaml:"socks-port"`
	ExternalController string `yaml:"external-controller"`
}

// portsInUse 返回 config.yaml 中已被占用的监听地址（host:port）。
// 用于在启动前检测是否已有其他 Mihomo 实例占用端口，避免重复启动产生僵尸进程。
func (m *Manager) portsInUse() ([]string, error) {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return nil, err
	}

	var cfg coreConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	// Mihomo 默认 allow-lan: false，仅监听本机；用 127.0.0.1 精确匹配，
	// 避免 Windows 上绑定 0.0.0.0 时漏检已被 127.0.0.1 占用的端口。
	addrs := make([]string, 0, 4)
	for _, port := range []int{cfg.MixedPort, cfg.Port, cfg.SocksPort} {
		if port > 0 {
			addrs = append(addrs, fmt.Sprintf("127.0.0.1:%d", port))
		}
	}
	if cfg.ExternalController != "" {
		addrs = append(addrs, cfg.ExternalController)
	}

	var inUse []string
	for _, addr := range addrs {
		l, err := net.Listen("tcp", addr)
		if err != nil {
			inUse = append(inUse, addr)
			continue
		}
		l.Close()
	}
	return inUse, nil
}
