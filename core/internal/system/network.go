package system

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
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

// FetchIPInfo 查询公网 IP、国家与运营商，主源失败时自动降级到备用源。
func FetchIPInfo() (model.IPInfo, error) {
	if info, err := fetchFromIPAPI(); err == nil {
		return info, nil
	}
	if info, err := fetchFromIPWho(); err == nil {
		return info, nil
	}
	return model.IPInfo{}, fmt.Errorf("all ip info providers failed")
}

func fetchFromIPAPI() (model.IPInfo, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/?fields=query,country,isp&lang=zh-CN")
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

func fetchFromIPWho() (model.IPInfo, error) {
	client := &http.Client{Timeout: 5 * time.Second}
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

// LocalIPv4 返回第一个非回环的内网 IPv4 地址。
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
		if ip := ipNet.IP.To4(); ip != nil && !ip.IsLoopback() {
			return ip.String(), nil
		}
	}

	return "", fmt.Errorf("no local ipv4 found")
}
