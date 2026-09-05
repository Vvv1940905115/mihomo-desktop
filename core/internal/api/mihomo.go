package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const mihomoBaseURL = "http://127.0.0.1:9090"

// ConfigInfo 是从 Mihomo GET /configs 中提取的字段。
type ConfigInfo struct {
	Mode string `json:"mode"`
	Tun  struct {
		Enable bool `json:"enable"`
	} `json:"tun"`
}

// MihomoProxy 将请求转发到 Mihomo REST API。
type MihomoProxy struct {
	base   *url.URL
	client *http.Client
}

func newMihomoProxy() *MihomoProxy {
	base, _ := url.Parse(mihomoBaseURL)
	return &MihomoProxy{base: base, client: &http.Client{}}
}

// config 拉取 Mihomo 当前配置中的关键字段。
func (p *MihomoProxy) config() (*ConfigInfo, error) {
	resp, err := p.client.Get(mihomoBaseURL + "/configs")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var info ConfigInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

// patchConfig 对 Mihomo 执行 PATCH /configs 局部更新。
func (p *MihomoProxy) patchConfig(payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPatch, mihomoBaseURL+"/configs", bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("patch config failed (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// traffic 通过 /connections 的累计字段获取总流量。
func (p *MihomoProxy) traffic() (int64, int64, error) {
	resp, err := p.client.Get(mihomoBaseURL + "/connections")
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	var info struct {
		UploadTotal   int64 `json:"uploadTotal"`
		DownloadTotal int64 `json:"downloadTotal"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return 0, 0, err
	}
	return info.UploadTotal, info.DownloadTotal, nil
}

// forward 转发一个普通（非流式）请求。
func (p *MihomoProxy) forward(w http.ResponseWriter, r *http.Request, path string) {
	p.forwardWithMethod(w, r, r.Method, path)
}

// forwardWithMethod 以指定方法转发请求（用于 PUT→PATCH 等语义映射）。
func (p *MihomoProxy) forwardWithMethod(w http.ResponseWriter, r *http.Request, method, path string) {
	req, err := p.buildRequest(r, method, path)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp, err := p.client.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, fmt.Sprintf("mihomo not reachable: %v", err))
		return
	}
	defer resp.Body.Close()

	copyHeaders(w, resp)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

// forwardStream 转发一个流式请求（如日志），并逐块刷新。
func (p *MihomoProxy) forwardStream(w http.ResponseWriter, r *http.Request, path string) {
	req, err := p.buildRequest(r, r.Method, path)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp, err := p.client.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, fmt.Sprintf("mihomo not reachable: %v", err))
		return
	}
	defer resp.Body.Close()

	copyHeaders(w, resp)
	w.WriteHeader(resp.StatusCode)

	flusher, ok := w.(http.Flusher)
	if !ok {
		_, _ = io.Copy(w, resp.Body)
		return
	}

	buf := make([]byte, 32*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, err := w.Write(buf[:n]); err != nil {
				return
			}
			flusher.Flush()
		}
		if readErr != nil {
			return
		}
	}
}

func (p *MihomoProxy) buildRequest(r *http.Request, method, path string) (*http.Request, error) {
	target := *p.base
	target.Path = path
	target.RawQuery = r.URL.RawQuery

	req, err := http.NewRequest(method, target.String(), r.Body)
	if err != nil {
		return nil, err
	}
	req.Header = r.Header.Clone()
	return req, nil
}

func copyHeaders(w http.ResponseWriter, resp *http.Response) {
	for key, values := range resp.Header {
		// 上游 Mihomo 也会返回自己的 CORS 头，直接 Add 会和
		// corsMiddleware 里设置的 Access-Control-Allow-Origin 叠加成
		// "*, *"，导致浏览器判定为非法 CORS。这里跳过所有 CORS 头，
		// 统一由 corsMiddleware 控制。
		if strings.HasPrefix(key, "Access-Control-") {
			continue
		}
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
}
