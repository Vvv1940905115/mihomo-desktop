package core

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"mihomo-client/core/internal/config"
	"mihomo-client/core/internal/model"
)

// Manager 负责 Mihomo Core 进程的生命周期。
type Manager struct {
	mu         sync.Mutex
	dataDir    string
	binaryPath string
	configPath string
	cmd        *exec.Cmd
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

	m.cmd = cmd
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

	m.cmd = nil
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
