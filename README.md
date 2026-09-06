# Mihomo Desktop（`mihomo-client`）

Windows 平台的现代化 Mihomo（Clash Meta）桌面客户端，采用 **Electron + Vue 3 + TypeScript + Go** 三端架构。  
渲染层只负责 UI，所有代理逻辑由 Go 控制面（sidecar）统一管理，Mihomo 内核作为子进程被拉起。

> 当前版本：**2.4.8（早期开发中）**  
> 已可运行：Dashboard / 代理 / 订阅 / 连接 / 日志 五个页面 + 内核生命周期 + 系统代理。  
> 尚未完成：打包分发、设置项落地、订阅合并进内核配置。详见 [已知限制](#14-已知限制与未完成项)。

## 界面预览

**首页 Dashboard** — 实时网速图、系统代理 / 虚拟网卡开关、出站模式、网络检测、流量统计、内存与启动时间。

**订阅管理** — 新增 / 更新订阅，显示节点数与更新状态。

---

## 目录

- [1. 架构总览](#1-架构总览)
- [2. 功能特性](#2-功能特性)
- [3. 环境要求](#3-环境要求)
- [4. 十分钟上手（TL;DR）](#4-十分钟上手tldr)
- [5. 完整安装流程](#5-完整安装流程)
  - [5.1 获取代码](#51-获取代码)
  - [5.2 安装 Node 依赖](#52-安装-node-依赖)
  - [5.3 准备 Go 工具链](#53-准备-go-工具链三种方案任选其一)
  - [5.4 构建 Go sidecar（必做）](#54-构建-go-sidecar必做)
  - [5.5 启动开发模式](#55-启动开发模式)
  - [5.6 单独运行控制面（不启动界面）](#56-单独运行控制面不启动界面)
- [6. 安装 Mihomo 内核](#6-安装-mihomo-内核)
  - [6.1 方式一：界面一键安装](#61-方式一界面一键安装推荐)
  - [6.2 方式二：手动安装（国内网络推荐）](#62-方式二手动安装国内网络推荐)
- [7. 使用说明](#7-使用说明)
- [8. 目录结构](#8-目录结构)
- [9. 端口与数据目录](#9-端口与数据目录)
- [10. 常用命令速查](#10-常用命令速查)
- [11. 控制面 API 一览](#11-控制面-api-一览)
- [12. 打包发布](#12-打包发布尚未配置)
- [13. 故障排查](#13-故障排查)
- [14. 已知限制与未完成项](#14-已知限制与未完成项)
- [15. 开发规范](#15-开发规范)
- [16. 许可证](#16-许可证)

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│  Electron 主进程 (src/main)                                    │
│  · 创建窗口 / 生命周期                                          │
│  · spawn ──> Go sidecar 可执行文件                              │
│  · 退出前 kill sidecar                                         │
└──────────────────────────┬───────────────────────────────────┘
                           │ spawn
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Go 控制面  core/  →  mihomo-service.exe  监听 127.0.0.1:38888 │
│  · Mihomo 进程生命周期（start/stop/restart/install）            │
│  · 订阅 CRUD + 拉取                                            │
│  · Windows 系统代理（注册表）                                    │
│  · 转发 Mihomo REST API（127.0.0.1:9090）                       │
│  · 网络信息 / 内存 / TUN 开关                                    │
└──────────────────────────┬───────────────────────────────────┘
                           │ 管理子进程 & 转发
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Mihomo 内核  mihomo.exe   (mixed 7897 / http 7898 / socks 7899)│
└──────────────────────────────────────────────────────────────┘

  渲染层 (Vue 3, src/renderer) ──fetch──> Go 控制面 127.0.0.1:38888/api
```

关键点：**前端从不直接与 Mihomo 通信**，一律走 Go 控制面，便于统一鉴权、错误提示与日志。

---

## 2. 功能特性

| 模块               | 能力                                                                          |
| ---------------- | --------------------------------------------------------------------------- |
| **首页 Dashboard** | 实时网速图（ECharts）、系统代理开关、TUN 开关、出站模式切换、网络检测（公网 IP/国家/ISP）、内网 IP、累计流量、内存占用、内核状态 |
| **代理**           | 代理组卡片列表、切换节点、节点延迟展示                                                         |
| **订阅**           | 新增 / 改名改址 / 删除 / 单个更新 / 一键更新全部，显示节点数与更新时间                                   |
| **连接**           | 实时连接列表、断开指定连接                                                               |
| **日志**           | SSE 实时流、按等级过滤、搜索                                                            |
| **设置**           | 主题、跟随系统、日志等级、核心路径、下载目录（⚠️ 部分仅保存到本地，见 [已知限制](#14-已知限制与未完成项)）                 |

技术栈：Vue 3 + TypeScript(strict) + Vite 6 + electron-vite + Pinia + Vue Router + Naive UI + TailwindCSS + ECharts + Electron 33 + Go 1.22+

---

## 3. 环境要求

| 项目          | 要求                      | 说明                                                                                                    |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **操作系统**    | Windows 10 / 11，**x64** | 代码使用 Windows 注册表、wininet.dll，内核资产为 `windows-amd64`，**不支持 32 位 / macOS / Linux**                       |
| **Node.js** | **20.x 或更高**（推荐 22 LTS） | Vite 6 / electron-vite 3 的要求。实测 Node 22.22.2 正常                                                       |
| **npm**     | 10.x（随 Node 附带）         | 也可用 pnpm / yarn，但本项目锁文件为 `package-lock.json`                                                          |
| **Go**      | **1.22 或更高**            | `core/go.mod` 声明 `go 1.22`；路由使用 Go 1.22 的 `ServeMux` 增强语法（`GET /api/health`），低版本会编译失败。实测 Go 1.23.4 正常 |
| **磁盘**      | 约 3 GB                  | node_modules 约 1.5 GB（含 Electron 181 MB）、Go 工具链约 700 MB、内核 48 MB                                      |
| **网络**      | 需要                      | 拉取 npm 包、Go 模块、Mihomo 内核                                                                              |

管理员权限：**普通运行不需要**。仅当使用 **TUN 模式**时需要以管理员身份启动。

---

## 4. 十分钟上手（TL;DR）

适用于已装好 Node.js 与 Go 的机器：

```powershell
git clone https://github.com/Vvv1940905115/mihomo-desktop.git
cd mihomo-desktop

npm install

# 构建 Go 控制面 —— 输出路径必须精确匹配，否则界面读不到数据
cd core
go build -trimpath -ldflags "-s -w" -o ..\resources\sidecar\mihomo-service.exe .
cd ..

npm run dev
```

窗口打开后：进入 **首页 → 内核状态 → 安装**，装好内核后点 **启动**，随后打开 **系统代理** 开关即可使用。

---

## 5. 完整安装流程

### 5.1 获取代码

```powershell
git clone https://github.com/Vvv1940905115/mihomo-desktop.git
cd mihomo-desktop
```

> 国内网络若 HTTPS 克隆反复 `Connection was reset`，改用 SSH：  
> `git clone git@github.com:Vvv1940905115/mihomo-desktop.git`

### 5.2 安装 Node 依赖

```powershell
npm install
```

**国内加速（强烈建议提前配置）**

```powershell
npm config set registry https://registry.npmmirror.com
# Electron 二进制镜像，避免卡在下载 electron-v33.x.x-win32-x64.zip
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install
```

PowerShell 永久生效：

```powershell
[Environment]::SetEnvironmentVariable("ELECTRON_MIRROR", "https://npmmirror.com/mirrors/electron/", "User")
```

**安装过程说明**

- `npm install` 会触发 `postinstall` → `electron-builder install-app-deps`。  
  本项目**没有原生（native）依赖**，该步骤失败可直接忽略，不影响运行。
- 验证 Electron 是否完整：

```powershell
Test-Path node_modules\electron\dist\electron.exe   # 应输出 True
```

若为 `False`，说明 Electron 二进制没下载成功，手动补：

```powershell
npm rebuild electron
```

### 5.3 准备 Go 工具链（三种方案任选其一）

#### 方案 A：使用系统已安装的 Go（推荐）

```powershell
go version    # 需 >= go1.22
```

没有则到 <https://go.dev/dl/> 下载 Windows amd64 安装包，装完开新终端验证 `go version`。

配置模块代理（国内必需）：

```powershell
go env -w GOPROXY=https://goproxy.cn,direct
```

#### 方案 B：使用仓库自带的便携 Go（无需安装）

本仓库已内置一份便携 Go 1.23.4，位于 `.tools/`（已被 `.gitignore` 忽略，不入库，需要者自行准备）:

```
.tools\go\        # Go 1.23.4 工具链
.tools\gopath\    # 模块缓存
.tools\gocache\   # 构建缓存
```

> ⚠️ 若你的 `.tools` 目录为空（Git 不会拉取），请用方案 A 或方案 C。

#### 方案 C：自动下载便携 Go

```powershell
$version = "1.23.4"
Invoke-WebRequest "https://go.dev/dl/go${version}.windows-amd64.zip" -OutFile go.zip
# 国内镜像：https://golang.google.cn/dl/go${version}.windows-amd64.zip
Expand-Archive go.zip -DestinationPath .tools\ -Force   # 解压后得到 .tools\go\
Remove-Item go.zip
& .tools\go\bin\go.exe version
```

### 5.4 构建 Go sidecar（必做）

Electron 主进程在启动时会拉起  
`<项目根>\resources\sidecar\mihomo-service.exe`（见 `src/main/sidecar.ts`）。  
**这个文件不会自动生成，必须先手动构建**，否则界面所有数据为空（控制台会打印 `[sidecar] failed to start`）。

#### 若用方案 A（系统 Go）

```powershell
cd core
go build -trimpath -ldflags "-s -w" -o ..\resources\sidecar\mihomo-service.exe .
cd ..
```

#### 若用方案 B（便携 Go）

```powershell
$ROOT = (Get-Location).Path
$env:GOROOT  = "$ROOT\.tools\go"
$env:GOPATH  = "$ROOT\.tools\gopath"
$env:GOCACHE = "$ROOT\.tools\gocache"
$env:GOPROXY = "https://goproxy.cn,direct"

New-Item -ItemType Directory -Force -Path "$ROOT\resources\sidecar" | Out-Null
Push-Location core
& "$ROOT\.tools\go\bin\go.exe" build -trimpath -ldflags "-s -w" -o "$ROOT\resources\sidecar\mihomo-service.exe" .
Pop-Location
```

#### Git Bash 等价写法

```bash
ROOT="$(pwd -W)"          # 注意必须是 Windows 风格路径，否则 Go 报 "cannot find GOROOT"
export GOROOT="$ROOT/.tools/go"
export GOPATH="$ROOT/.tools/gopath"
export GOCACHE="$ROOT/.tools/gocache"
export GOPROXY=https://goproxy.cn,direct

mkdir -p "$ROOT/resources/sidecar"
cd core && "$ROOT/.tools/go/bin/go.exe" build -trimpath -ldflags "-s -w" -o "$ROOT/resources/sidecar/mihomo-service.exe" .
```

**验证产物**

```powershell
Get-ChildItem resources\sidecar
# mihomo-service.exe  约 6.7 MB
```

> 参数说明：`-trimpath` 去掉本地路径信息；`-ldflags "-s -w"` 剥离符号表与调试信息，体积从约 11 MB 降到 6.7 MB。  
> `resources\sidecar\` 已加入 `.gitignore`，构建产物不会误入库。

### 5.5 启动开发模式

```powershell
npm run dev
```

预期行为：

1. 先编译主进程与 preload，控制台依次出现  
   `build the electron main process successfully`、`build the electron preload files successfully`；
2. 接着启动 vite dev server（渲染层默认 `http://localhost:5173`）；
3. Electron 窗口自动弹出（1280×820，深色背景），主进程同时 spawn sidecar；
4. 若 sidecar 未启动，界面数据全为空 —— 回到 [5.4](#54-构建-go-sidecar必做) 检查。

验证控制面是否活着：

```powershell
Invoke-RestMethod http://127.0.0.1:38888/api/health
# status
# ------
# ok
```

> 结束调试请在终端按 **`Ctrl + C`**。强杀 Electron 会留下 sidecar 孤儿进程占用 38888，  
> 详见 [Q7](#13-故障排查)。

### 5.6 单独运行控制面（不启动界面）

调试后端逻辑时很有用，无需每次启动 Electron：

```powershell
# 使用默认数据目录 %APPDATA%\mihomo-client
.\resources\sidecar\mihomo-service.exe

# 指定端口与数据目录（推荐，避免污染用户目录）
.\resources\sidecar\mihomo-service.exe -port 38888 -home .data
```

也可用源码直接跑（改代码免重新构建）：

```powershell
cd core
go run . -port 38888 -home ..\.data
```

可用参数：

| 参数      | 默认值                       | 说明                      |
| ------- | ------------------------- | ----------------------- |
| `-port` | `38888`                   | 控制面监听端口（固定绑定 127.0.0.1） |
| `-home` | `%APPDATA%\mihomo-client` | 数据目录                    |

---

## 6. 安装 Mihomo 内核

应用本身不含内核，需要单独安装一次。

### 6.1 方式一：界面一键安装（推荐）

1. `npm run dev` 启动应用；
2. 进入 **首页**，找到「内核状态」区域；
3. 点击 **安装** —— 后端会调用 `POST /api/core/install`；
4. 等待下载完成（约 20–50 MB，取决于网络）。

内部逻辑（`core/internal/core/download.go`）：

- 请求 `https://api.github.com/repos/MetaCubeX/mihomo/releases/latest`；
- 选取 `mihomo-windows-amd64-*.zip`（优先非 `compatible` 构建）；
- 下载后解压出 `.exe`，写入 `<数据目录>\mihomo\mihomo.exe`，随后删除临时 zip。

> 国内网络访问 GitHub Releases 经常超时或极慢，若卡住请改用方式二。

### 6.2 方式二：手动安装（国内网络推荐）

1. 打开 <https://github.com/MetaCubeX/mihomo/releases> ，下载  
   `mihomo-windows-amd64-vX.Y.Z.zip`（不要下 `compatible` 版，除非你的 CPU 较老）；
   > 下载困难时可用镜像站，如 `https://ghproxy.net/https://github.com/...`（第三方，注意安全）。
2. 解压得到 `mihomo-windows-amd64-vX.Y.Z.exe`；
3. 重命名为 **`mihomo.exe`**；
4. 放到数据目录的 `mihomo` 子目录下：

| 启动方式                | 目标路径                                        |
| ------------------- | ------------------------------------------- |
| Electron 启动（无参数）    | `%APPDATA%\mihomo-client\mihomo\mihomo.exe` |
| 手动指定了 `-home .data` | `<项目根>\.data\mihomo\mihomo.exe`             |

例如：

```powershell
$dir = "$env:APPDATA\mihomo-client\mihomo"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Move-Item "~\Downloads\mihomo-windows-amd64-v1.19.10.exe" "$dir\mihomo.exe"
```

1. 回到界面点 **启动**。验证：

```powershell
Invoke-RestMethod http://127.0.0.1:38888/api/core/status
# version running uptime pid error
# ------- ------- ------ --- -----
#         True    12     8820
```

---

## 7. 使用说明

| 页面     | 说明                                                                                  |
| ------ | ----------------------------------------------------------------------------------- |
| **首页** | 网速曲线（1 秒刷新）、系统代理开关、TUN 开关、出站模式（rule/global/direct）、网络检测（30 秒刷新）、内网 IP、累计上下行、内存、内核启停 |
| **代理** | 按代理组展示节点，点击节点即可切换，显示延迟                                                              |
| **订阅** | 添加订阅链接后自动拉取一次并统计节点数                                                                 |
| **连接** | 实时连接列表，可断开单条                                                                        |
| **日志** | 实时滚动（SSE），支持等级过滤                                                                    |
| **设置** | 深浅主题、跟随系统、日志等级、核心路径、下载目录                                                            |

**首次可用最小化路径**：安装内核 → 启动内核 → 打开系统代理开关。  
系统代理会被写入注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`：

- `ProxyEnable = 1`
- `ProxyServer = 127.0.0.1:7897`（Mihomo 的 mixed-port）

退出应用前请记得**关闭系统代理**，否则会出现「上不了网」，详见 [故障排查](#13-故障排查)。

---

## 8. 目录结构

```
mihomo-desktop/
├── core/                       # Go 控制面（独立 Go module：mihomo-client/core）
│   ├── go.mod / go.sum
│   ├── main.go                 # 入口，解析 -port / -home
│   └── internal/
│       ├── api/                # HTTP 路由（server.go）与 handler（handlers.go）
│       │   └── mihomo.go       # 转发到 Mihomo REST API（含 SSE 日志流）
│       ├── core/               # 内核进程管理 manager.go + 下载安装 download.go
│       ├── config/             # 生成默认 config.yaml
│       ├── subscription/       # 订阅持久化与拉取
│       ├── system/             # 系统代理(proxy.go) / IP(network.go) / 内存(memory.go)
│       └── model/              # 共享类型
├── src/
│   ├── main/                   # Electron 主进程：index.ts / window.ts / sidecar.ts
│   ├── preload/                # contextBridge 桥接（暴露 electronAPI）
│   └── renderer/src/
│       ├── api/                # 统一 fetch 封装，baseURL = http://127.0.0.1:38888/api
│       ├── pages/              # Dashboard / Proxies / Subscriptions / Connections / Logs / Settings
│       ├── components/         # StatCard / TrafficChart / ProxyGroupCard 等
│       ├── stores/             # Pinia
│       ├── hooks/              # usePolling
│       ├── router/ config/ utils/ styles/
├── resources/sidecar/          # 【构建产物】mihomo-service.exe，需自行构建，已 gitignore
├── docs/superpowers/plans/     # 设计文档
├── electron.vite.config.ts
├── package.json
└── tsconfig*.json
```

---

## 9. 端口与数据目录

**端口**

| 端口        | 用途                                  | 可改吗                                                                                         |
| --------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| **38888** | Go 控制面（前端唯一通信对象）                    | 可，sidecar 加 `-port`；但前端 `src/renderer/src/api/http.ts` 里 baseURL 是硬编码，需同步修改                 |
| **9090**  | Mihomo external-controller（控制面转发目标） | 可，改 `config.yaml` 的 `external-controller` 与 `core/internal/api/mihomo.go` 的 `mihomoBaseURL` |
| **7897**  | mixed-port，系统代理指向它                  | 可，改 `config.yaml`；系统代理值来自 `core/internal/system/proxy.go` 的 `DefaultProxyServer`            |
| **7898**  | HTTP 代理端口                           | 可，改 `config.yaml`                                                                           |
| **7899**  | SOCKS 代理端口                          | 可，改 `config.yaml`                                                                           |

**数据目录**

默认 `%APPDATA%\mihomo-client`（即 `C:\Users\<用户名>\AppData\Roaming\mihomo-client`），内容：

| 文件                   | 何时生成          | 说明                                |
| -------------------- | ------------- | --------------------------------- |
| `config.yaml`        | 首次启动内核时       | 由 `core/internal/config` 写入最小可用配置 |
| `subscriptions.json` | 控制面启动时创建（空数组） | 订阅列表持久化                           |
| `mihomo/mihomo.exe`  | 安装内核后         | 内核二进制                             |
| `mihomo.log`         | 内核启动后         | 内核 stdout/stderr 重定向              |

> ⚠️ **注意**：Electron 的 `userData` 目录名取自 `package.json` 的 `name`（同为 `mihomo-client`），  
> 因此 Electron 自身产生的 `Cache/`、`Code Cache/`、`GPUCache/` 等子目录会与控制面数据混在同一目录。  
> 开发时建议用 `-home .data` 隔离（该目录已被 gitignore）。

默认 `config.yaml`（首次启动内核时自动生成）:

```yaml
mixed-port: 7897
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
  - MATCH,DIRECT
```

---

## 10. 常用命令速查

| 命令                                                                   | 作用                                   |
| -------------------------------------------------------------------- | ------------------------------------ |
| `npm run dev`                                                        | 开发模式（vite dev server + Electron 热重载） |
| `npm run build`                                                      | 构建前端与主进程到 `out/`（**不产出安装包**）         |
| `npm run start`                                                      | 预览 `out/` 构建产物                       |
| `npm run typecheck`                                                  | 主进程 + 渲染层全量类型检查                      |
| `npm run typecheck:node`                                             | 仅主进程 / preload                       |
| `npm run typecheck:web`                                              | 仅渲染层（vue-tsc）                        |
| `npm run lint`                                                       | ESLint 检查                            |
| `npm run format`                                                     | Prettier 格式化                         |
| `go build -o ..\resources\sidecar\mihomo-service.exe .`（在 `core/` 下） | 构建控制面                                |
| `go vet ./...`（在 `core/` 下）                                          | Go 静态检查                              |
| `go run . -home ..\.data`（在 `core/` 下）                               | 直接跑源码                                |

---

## 11. 控制面 API 一览

Base URL：`http://127.0.0.1:38888/api`（已开启 CORS）

**转发 Mihomo（内核需运行）**

| 方法     | 路径                  | 说明                                                     |
| ------ | ------------------- | ------------------------------------------------------ |
| GET    | `/traffic`          | 累计上下行 `{ up, down }`                                   |
| GET    | `/proxies`          | 全部代理组与节点                                               |
| GET    | `/proxies/{name}`   | 单个代理组（含延迟）                                             |
| PUT    | `/proxies/{name}`   | 切换节点，body `{ name }`                                   |
| GET    | `/connections`      | 连接列表                                                   |
| DELETE | `/connections/{id}` | 断开连接                                                   |
| GET    | `/logs`             | 日志流（SSE）                                               |
| GET    | `/configs`          | 当前配置                                                   |
| PUT    | `/configs`          | 更新配置（内部转 `PATCH /configs`，body 如 `{ "mode": "rule" }`） |
| GET    | `/version`          | 内核版本                                                   |

**内核管理**

| 方法   | 路径                                             | 说明                                         |
| ---- | ---------------------------------------------- | ------------------------------------------ |
| GET  | `/core/status`                                 | `{ version, running, uptime, pid, error }` |
| POST | `/core/start` | `/core/stop` | `/core/restart` | 生命周期                                       |
| POST | `/core/install`                                | 下载安装内核                                     |

**系统**

| 方法        | 路径              | 说明                                         |
| --------- | --------------- | ------------------------------------------ |
| GET / PUT | `/system-proxy` | 读取 / 设置系统代理，PUT body `{ enable }`          |
| GET / PUT | `/tun`          | 读取 / 设置 TUN 模式，PUT body `{ enable }`       |
| GET       | `/ip-info`      | 公网 IP / 国家 / 运营商（ip-api.com，失败降级 ipwho.is） |
| GET       | `/lan-ip`       | 内网 IPv4                                    |
| GET       | `/memory`       | 内核进程内存                                     |

**订阅**

| 方法     | 路径                                         |
| ------ | ------------------------------------------ |
| GET    | `/subscriptions`                           |
| POST   | `/subscriptions` body `{ name, url }`      |
| PUT    | `/subscriptions/{id}` body `{ name, url }` |
| DELETE | `/subscriptions/{id}`                      |
| POST   | `/subscriptions/{id}/update`               |
| POST   | `/subscriptions/update-all`                |

健康检查：`GET /api/health` → `{"status":"ok"}`

---

## 12. 打包发布（尚未配置）

`npm run build` **只把代码编译到 `out/` 目录，不会生成安装包**。  
当前仓库既没有 `electron-builder.yml`，`package.json` 里也没有 `build` 配置段。

若需要产出安装包，需自行补充（以下为建议配置，尚未纳入仓库）：

1. 新建 `electron-builder.yml`：

```yaml
appId: com.mihomo.client
productName: Mihomo Client
directories:
  output: dist
files:
  - out/**
extraResources:
  - from: resources/sidecar
    to: sidecar
win:
  target: nsis
  icon: build/icon.ico   # 需自备
```

1. `package.json` 增加脚本：

```json
"scripts": {
  "dist": "electron-vite build && electron-builder --win"
}
```

> ⚠️ 打包后 `app.getAppPath()` 指向 `app.asar`，而 `src/main/sidecar.ts` 读取的是  
> `<appPath>/resources/sidecar/mihomo-service.exe`。正式打包时必须通过 `extraResources`  
> 把 sidecar 释放到 `resources/sidecar/`，同时给 `files` 加上 asar 解包规则，否则依旧拉不起后端。

---

## 13. 故障排查

**Q1. 界面全是空白数据 / 控制台报 `[sidecar] failed to start`**  
没构建 sidecar。执行 [5.4](#54-构建-go-sidecar必做)，确认 `resources\sidecar\mihomo-service.exe` 存在。  
（该失败被 `try/catch` 吞掉，只会打 warn，不影响窗口弹出。）

**Q2. 提示 `mihomo binary not installed`**  
内核未安装。见 [第 6 节](#6-安装-mihomo-内核)。确认路径是 `<数据目录>\mihomo\mihomo.exe`，文件名**必须是 `mihomo.exe`**。

**Q3. `go build` 报 `cannot find GOROOT directory`**  
Git Bash 里 `$(pwd)` 得到 `/e/xxx` 格式，Go 不认。改用 `$(pwd -W)` 得到 `E:/xxx`。

**Q4. `go build` 卡在下载模块**

```powershell
go env -w GOPROXY=https://goproxy.cn,direct
```

**Q5. `npm install` 卡住或 Electron 下载失败**

```powershell
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
```

**Q6. `postinstall: electron-builder install-app-deps` 报错**  
本项目无原生依赖，可忽略。只要 `node_modules\electron\dist\electron.exe` 存在即可。

**Q7. 38888 端口被占用**  
sidecar 启动即退出。查占用并结束：

```powershell
netstat -ano | findstr :38888
taskkill /PID <PID> /F
```

或在启动时换端口（需同步改前端 baseURL）:

```powershell
.\resources\sidecar\mihomo-service.exe -port 39999
```

> **开发时常见成因**：sidecar 是 Electron `spawn` 出来的子进程。正常关闭窗口会触发  
> `before-quit → stopSidecar`，父子一起退出；但若用任务管理器结束 Electron、或强制中断终端，  
> sidecar 会变成**孤儿进程**继续占着 38888，导致下次启动时新 sidecar 因端口冲突退出。  
> 现象就是「界面数据全空」——此时按上面命令清掉残留进程即可。  
> 建议：在终端里按 `Ctrl + C` 正常结束 `npm run dev`。

**Q8. 关掉应用后全网无法上网**  
系统代理残留。手动清除：

```powershell
# 关闭系统代理
Set-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" ProxyEnable -Value 0
```

或在「Windows 设置 → 网络和 Internet → 代理 → 手动设置代理」里关闭「使用代理服务器」。

**Q9. 开启 TUN 失败**  
TUN 需要管理员权限。以管理员身份重新运行应用；当前版本没有 UAC 提权逻辑。

**Q10. 内核下载一直失败**  
国内访问 GitHub Releases 不稳定，改用 [6.2 手动安装](#62-方式二手动安装国内网络推荐)。

**Q11. 杀毒软件报毒 / 内核被删除**  
Mihomo 内核属敏感网络工具，易被误报。把数据目录加入杀软白名单。

**Q12. 日志页一直空白**  
日志是转发 Mihomo 的 SSE 流，需要**内核正在运行**且 `external-controller` 为 `127.0.0.1:9090`。

---

## 14. 已知限制与未完成项

按代码实际情况列出，避免误用：

1. **仅支持 Windows x64**。系统代理写注册表、TUN 用 gvisor，未做跨平台适配。
2. **设置页部分开关未真正生效**：开机启动、自动更新、日志等级、核心路径、下载目录  
   目前只写入浏览器 `localStorage`（见 `src/renderer/src/stores/settings.ts`），  
   没有通过 IPC 下发到主进程或 Go 控制面。改动后重开界面会保留显示值，但不会影响实际行为。
3. **「检查更新」是占位实现**，点击只会提示「当前已是最新版本」。
4. **内核路径 / 下载目录设置不生效**：控制面固定使用 `%APPDATA%\mihomo-client`，只能用 `-home` 参数覆盖。
5. **订阅尚未合并进内核配置**：`Refresh` 只拉取内容、统计节点数并更新状态，  
   不会把节点写入 `config.yaml`，因此订阅节点不会出现在「代理」页。
6. **未配置打包**，无法生成安装包（见 [第 12 节](#12-打包发布尚未配置)）。
7. **无系统托盘**，关闭窗口即退出应用。
8. **控制面无鉴权**：任何本机程序都能调用 `127.0.0.1:38888` 的接口（含开关系统代理）。仅监听回环地址，风险可控，但多用户机器上需注意。
9. **内核下载与订阅拉取不经过代理**，在网络受限环境下可能失败。

---

## 15. 开发规范

- **TypeScript strict**：`tsconfig` 开启 `strict`，所有 API 返回必须定义 `interface`（放 `src/renderer/src/api/types.ts`）。
- **统一请求层**：页面禁止直接 `fetch`，一律走 `src/renderer/src/api/*`。
- **状态集中**：所有异步状态放 Pinia store，页面只做组合。
- **轮询**：用 `usePolling` hook（内置立即执行 + 卸载清理），Dashboard 网速 1000 ms、网络检测 30000 ms。
- **配置驱动**：菜单、模式选项、日志等级等用数组配置 + 策略，避免大段 `if/else`。
- **组件化**：复用 `StatCard` / `TrafficChart` / `ProxyGroupCard` / `SettingRow` 等，禁止单文件堆砌。
- **提交前自检**：

```powershell
npm run typecheck
npm run lint
cd core; go vet ./...
```

- **设计 token**：背景 `#1F2025`、卡片 `#2A2D35`、主题色 `#55E6C1`、圆角 18px、过渡 300ms。

---

## 16. 许可证

本项目采用 [MIT License](./LICENSE)。

Copyright (c) 2026 Vvv1940905115

内核 [Mihomo](https://github.com/MetaCubeX/mihomo) 为独立项目，遵循其自身许可证（GPL-3.0）。
