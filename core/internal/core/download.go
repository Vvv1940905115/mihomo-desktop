package core

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const latestReleaseURL = "https://api.github.com/repos/MetaCubeX/mihomo/releases/latest"

type githubRelease struct {
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// EnsureBinary 确保 Mihomo 二进制存在，不存在则从 GitHub 下载。
func (m *Manager) EnsureBinary() error {
	if _, err := os.Stat(m.binaryPath); err == nil {
		return nil
	}

	release, err := fetchLatestRelease()
	if err != nil {
		return err
	}

	assetName, assetURL := pickWindowsAsset(release)
	if assetURL == "" {
		return fmt.Errorf("release %s 中没有找到 %s 平台的资产", release.TagName, runtime.GOOS+"-"+runtime.GOARCH)
	}

	if err := os.MkdirAll(filepath.Dir(m.binaryPath), 0o755); err != nil {
		return err
	}

	zipPath := filepath.Join(filepath.Dir(m.binaryPath), assetName)
	if err := downloadFile(assetURL, zipPath); err != nil {
		return err
	}
	defer os.Remove(zipPath)

	return extractMihomo(zipPath, m.binaryPath)
}

// Install 下载并安装 Mihomo 核心。
func (m *Manager) Install() error {
	return m.EnsureBinary()
}

func fetchLatestRelease() (*githubRelease, error) {
	req, err := http.NewRequest(http.MethodGet, latestReleaseURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "mihomo-client")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("查询最新版本失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("查询最新版本失败 (status %d)", resp.StatusCode)
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, err
	}
	return &release, nil
}

func pickWindowsAsset(release *githubRelease) (string, string) {
	prefix := fmt.Sprintf("mihomo-%s-%s", runtime.GOOS, runtime.GOARCH)

	var standardName, standardURL string
	var compatibleName, compatibleURL string

	for _, asset := range release.Assets {
		if !strings.HasPrefix(asset.Name, prefix) || !strings.HasSuffix(asset.Name, ".zip") {
			continue
		}
		if strings.Contains(asset.Name, "compatible") {
			if compatibleName == "" {
				compatibleName, compatibleURL = asset.Name, asset.BrowserDownloadURL
			}
			continue
		}
		// 非 compatible 构建，保留最后一个（go 版本最高）
		standardName, standardURL = asset.Name, asset.BrowserDownloadURL
	}

	if standardName != "" {
		return standardName, standardURL
	}
	return compatibleName, compatibleURL
}

func downloadFile(url, dest string) error {
	client := &http.Client{Timeout: 180 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("下载失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载失败 (status %d)", resp.StatusCode)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func extractMihomo(zipPath, destPath string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("打开压缩包失败: %w", err)
	}
	defer reader.Close()

	for _, file := range reader.File {
		if !strings.HasSuffix(strings.ToLower(file.Name), ".exe") {
			continue
		}

		src, err := file.Open()
		if err != nil {
			return err
		}

		out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			src.Close()
			return err
		}

		_, copyErr := io.Copy(out, src)
		src.Close()
		out.Close()
		return copyErr
	}

	return fmt.Errorf("压缩包中未找到可执行文件")
}
