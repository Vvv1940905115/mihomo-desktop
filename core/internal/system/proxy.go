package system

import (
	"fmt"
	"syscall"

	"golang.org/x/sys/windows/registry"
)

const internetSettingsPath = `Software\Microsoft\Windows\CurrentVersion\Internet Settings`

// DefaultProxyServer 是 Mihomo 的 mixed-port 地址。
const DefaultProxyServer = "127.0.0.1:7897"

// GetSystemProxy 读取 Windows 系统代理状态。
func GetSystemProxy() (bool, string, error) {
	k, err := registry.OpenKey(registry.CURRENT_USER, internetSettingsPath, registry.QUERY_VALUE)
	if err != nil {
		return false, "", fmt.Errorf("open registry: %w", err)
	}
	defer k.Close()

	enable, _, err := k.GetIntegerValue("ProxyEnable")
	if err != nil {
		return false, "", fmt.Errorf("read ProxyEnable: %w", err)
	}

	server, _, err := k.GetStringValue("ProxyServer")
	if err != nil {
		server = ""
	}

	return enable != 0, server, nil
}

// SetSystemProxy 设置 Windows 系统代理。
func SetSystemProxy(enable bool, server string) error {
	if server == "" {
		server = DefaultProxyServer
	}

	k, err := registry.OpenKey(registry.CURRENT_USER, internetSettingsPath, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("open registry: %w", err)
	}
	defer k.Close()

	value := uint32(0)
	if enable {
		value = 1
	}

	if err := k.SetDWordValue("ProxyEnable", value); err != nil {
		return fmt.Errorf("set ProxyEnable: %w", err)
	}
	if err := k.SetStringValue("ProxyServer", server); err != nil {
		return fmt.Errorf("set ProxyServer: %w", err)
	}

	notifyWindowsSettingsChanged()
	return nil
}

// notifyWindowsSettingsChanged 通知系统代理设置已更新。
func notifyWindowsSettingsChanged() {
	const (
		internetOptionSettingsChanged = 39
		internetOptionRefresh         = 37
	)

	wininet := syscall.NewLazyDLL("wininet.dll")
	proc := wininet.NewProc("InternetSetOptionW")

	for _, option := range []uintptr{internetOptionSettingsChanged, internetOptionRefresh} {
		_, _, _ = proc.Call(0, option, 0, 0)
	}
}
