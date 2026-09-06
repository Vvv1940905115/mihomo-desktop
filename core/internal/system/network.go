package system

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mihomo-client/core/internal/model"
)

type ipAPIResponse struct {
	Status  string `json:"status"`
	Country string `json:"country"`
	ISP     string `json:"isp"`
	Query   string `json:"query"`
}

type ipWhoResponse struct {
	IP         string `json:"ip"`
	Success    bool   `json:"success"`
	Country    string `json:"country"`
	Connection struct {
		ISP string `json:"isp"`
		Org string `json:"org"`
	} `json:"connection"`
}

// FetchIPInfo 查询公网 IP、国家与运营商。开启系统代理时优先走代理出口，
// 代理不可达（如核心未运行）时回退直连；主源失败自动降级到备用源。
func FetchIPInfo() (model.IPInfo, error) {
	if enable, server, err := GetSystemProxy(); err == nil && enable {
		if info, err := fetchInfo(clientWithProxy(server)); err == nil {
			return info, nil
		}
	}

	if info, err := fetchInfo(directClient()); err == nil {
		return info, nil
	}
	return model.IPInfo{}, fmt.Errorf("all ip info providers failed")
}

func fetchInfo(client *http.Client) (model.IPInfo, error) {
	if info, err := fetchFromIPAPI(client); err == nil {
		info.ISP = normalizeISP(info.ISP)
		return info, nil
	}
	if info, err := fetchFromIPWho(client); err == nil {
		info.ISP = normalizeISP(info.ISP)
		return info, nil
	}
	return model.IPInfo{}, fmt.Errorf("all ip info providers failed")
}

// normalizeISP 将常见中文地区运营商英文名映射为中文，其余保持不变。
func normalizeISP(isp string) string {
	lower := strings.ToLower(isp)
	switch {
	case strings.Contains(lower, "china mobile"):
		return "中国移动"
	case strings.Contains(lower, "china telecom"):
		return "中国电信"
	case strings.Contains(lower, "china unicom"):
		return "中国联通"
	case strings.Contains(lower, "china broadnet"), strings.Contains(lower, "broadcasting network"):
		return "中国广电"
	case strings.Contains(lower, "chunghwa"):
		return "中华电信"
	case strings.Contains(lower, "taiwan mobile"):
		return "台湾大哥大"
	case strings.Contains(lower, "fareastone"):
		return "远传电信"
	case strings.Contains(lower, "hkt"), strings.Contains(lower, "pccw"):
		return "电讯盈科"
	case strings.Contains(lower, "hkbn"):
		return "香港宽频"
	default:
		return isp
	}
}

func directClient() *http.Client {
	// 显式禁用代理：Go 默认 Transport 会读取系统代理，导致“回退直连”仍走
	// 7897（核心未运行时连接失败）。这里确保真正直连。
	return &http.Client{
		Timeout:   5 * time.Second,
		Transport: &http.Transport{Proxy: nil},
	}
}

// clientWithProxy 根据注册表中的系统代理构建 HTTP 客户端。
func clientWithProxy(server string) *http.Client {
	u := parseProxyURL(server)
	if u == nil {
		return directClient()
	}
	return &http.Client{
		Timeout:   5 * time.Second,
		Transport: &http.Transport{Proxy: http.ProxyURL(u)},
	}
}

func parseProxyURL(server string) *url.URL {
	s := strings.TrimSpace(server)
	if s == "" {
		return nil
	}
	if !strings.Contains(s, "://") {
		s = "http://" + s
	}
	u, err := url.Parse(s)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil
	}
	return u
}

func fetchFromIPAPI(client *http.Client) (model.IPInfo, error) {
	resp, err := client.Get("http://ip-api.com/json/?fields=status,query,country,isp&lang=zh-CN")
	if err != nil {
		return model.IPInfo{}, err
	}
	defer resp.Body.Close()

	var info ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return model.IPInfo{}, err
	}

	if info.Status == "fail" || info.Query == "" {
		return model.IPInfo{}, fmt.Errorf("ip-api returned fail status")
	}

	return model.IPInfo{IP: info.Query, Country: info.Country, ISP: info.ISP}, nil
}

func fetchFromIPWho(client *http.Client) (model.IPInfo, error) {
	resp, err := client.Get("https://ipwho.is/")
	if err != nil {
		return model.IPInfo{}, err
	}
	defer resp.Body.Close()

	var info ipWhoResponse
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return model.IPInfo{}, err
	}

	if !info.Success || info.IP == "" {
		return model.IPInfo{}, fmt.Errorf("ipwho returned fail status")
	}

	isp := info.Connection.ISP
	if isp == "" {
		isp = info.Connection.Org
	}

	return model.IPInfo{IP: info.IP, Country: info.Country, ISP: isp}, nil
}

// LocalIPv4 返回第一个有效的内网 IPv4 地址，跳过回环、链路本地（169.254.*）与未指定地址。
func LocalIPv4() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("list interfaces: %w", err)
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok {
			continue
		}
		ip := ipNet.IP.To4()
		if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() {
			continue
		}
		return ip.String(), nil
	}

	return "", fmt.Errorf("no local ipv4 found")
}
