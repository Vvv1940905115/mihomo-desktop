# Windows 现代化代理客户端 Implementation Plan

> **For agentic workers:** 本计划用于指导逐模块实现。步骤使用 checkbox（`- [ ]`）语法跟踪进度。

**Goal:** 构建一款媲美 Clash Verge Rev / FlClash / Mihomo Party 的 Windows 桌面代理客户端（Vue3 + Electron + Go + Mihomo）。

**Architecture:** 三层架构。Electron 主进程负责窗口/托盘/生命周期并拉起 Go sidecar；Go sidecar 是控制面，负责 Mihomo Core 进程管理、订阅、系统代理、TUN、网络信息，并统一转发 Mihomo REST API；Vue3 渲染层只负责 UI，通过统一的 `src/api/` 层请求 Go 控制面 HTTP API（`127.0.0.1:38888`）。

**Tech Stack:** Vue3 + TypeScript(strict) + Vite + electron-vite + Pinia + Vue Router + Naive UI + TailwindCSS + ECharts + Electron + Go + Mihomo (Clash Meta)。

---

## 1. 目录结构

```
e:\codex\一人公司\
├── package.json                 # 根依赖 + 脚本
├── electron.vite.config.ts      # electron-vite 配置
├── electron-builder.yml         # 打包配置（后续）
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── eslint.config.js / .prettierrc
├── tailwind.config.js / postcss.config.js
├── src\
│   ├── main\                    # Electron 主进程
│   │   ├── index.ts
│   │   ├── window.ts
│   │   └── sidecar.ts           # 拉起/守护 Go sidecar
│   ├── preload\                 # preload 桥接
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer\
│       ├── index.html
│       └── src\
│           ├── main.ts
│           ├── App.vue
│           ├── api\             # 统一 API 封装
│           ├── components\      # 可复用组件
│           ├── layouts\         # 布局（侧边栏）
│           ├── pages\           # 页面
│           ├── stores\          # Pinia
│           ├── hooks\           # 组合式 hooks
│           ├── utils\           # 工具
│           ├── styles\          # 全局样式
│           ├── router\          # 路由
│           └── assets\          # 静态资源
└── core\                        # Go 后端（sidecar）
    ├── go.mod
    ├── main.go
    └── internal\
        ├── api\                 # HTTP 路由 + handler
        ├── core\                # Mihomo 进程生命周期
        ├── config\              # Mihomo 配置生成/合并
        ├── subscription\        # 订阅 CRUD + 拉取 + 合并
        ├── system\              # 系统代理/TUN/IP/内存
        └── model\               # 共享类型
```

---

## 2. 数据流

```
渲染层 (Vue3)  ──fetch──>  Go 控制面 (127.0.0.1:38888)
                              │  ├─ 转发 ──> Mihomo REST API (127.0.0.1:9090)
                              │  ├─ 管理 ──> Mihomo 进程 (启动/停止/重启)
                              │  ├─ 系统代理 (Windows 注册表)
                              │  └─ 网络信息 (ip-api.com) / 进程内存
Electron 主进程 ──spawn──>  Go sidecar（可执行文件）
```

---

## 3. Go 控制面 API 契约（统一封装于 `src/api/`）

**转发 Mihomo（代理数据）**
- `GET  /api/traffic` → `{ up, down }`
- `GET  /api/proxies` → 所有 Proxy Group / 节点
- `GET  /api/proxies/:name` → 单组（含延迟）
- `PUT  /api/proxies/:name` body `{ name }` → 切换节点
- `GET  /api/connections` → 连接列表
- `DELETE /api/connections/:id` → 断开连接
- `GET  /api/logs` → 日志流（SSE）
- `GET  /api/configs` → `{ mode, tun, ... }`
- `PUT  /api/configs` body `{ mode, tun }` → 出站模式 / TUN
- `GET  /api/version` → Mihomo 版本

**Core 管理**
- `GET  /api/core/status` → `{ version, running, uptime, pid }`
- `POST /api/core/start` / `stop` / `restart`

**系统**
- `GET/PUT /api/system-proxy` body `{ enable }`
- `GET/PUT /api/tun` body `{ enable }`（内部改 config 后 reload）
- `GET  /api/ip-info` → `{ ip, country, isp }`
- `GET  /api/lan-ip` → `{ ip }`
- `GET  /api/memory` → `{ core, ui }`（字节）

**订阅**
- `GET    /api/subscriptions`
- `POST   /api/subscriptions` body `{ name, url }`
- `PUT    /api/subscriptions/:id` body `{ name, url }`
- `DELETE /api/subscriptions/:id`
- `POST   /api/subscriptions/:id/update`
- `POST   /api/subscriptions/update-all`

---

## 4. 前端设计系统

| Token | 值 |
|---|---|
| 背景 | `#1F2025` |
| 卡片 | `#2A2D35` |
| 主题色 | `#55E6C1` |
| 圆角 | `18px` |
| 动画 | `300ms` |
| Hover | `scale(1.02)` + 阴影 |
| 页面切换 | 淡入 |

深色主题。Tailwind 自定义颜色 + Naive UI `darkTheme` 覆盖 `primaryColor`/`primaryColorHover`/`borderRadius`。

---

## 5. 任务分解（逐模块，每个模块可运行后进入下一个）

- **Task 1: 脚手架** — electron-vite + Vue3 + TS strict + Tailwind + Naive UI + Pinia + Router + ECharts + ESLint/Prettier；`npm run dev` 能打开窗口。
- **Task 2: Go 骨架** — HTTP server、路由、Mihomo 进程管理、转发代理；`go run ./core` 可启动并返回健康。
- **Task 3: 布局与设计系统** — 侧边栏 + 深色主题 + 路由切换淡入 + 页面占位。
- **Task 4: Dashboard** — 9 个区块（网速图/系统代理/TUN/出站模式/网络检测/内网IP/流量统计/内存/核心状态）。
- **Task 5: 代理页** — Proxy Group 列表 + 切换节点。
- **Task 6: 订阅页** — 新增/删除/修改/更新/更新全部。
- **Task 7: 连接页** — 实时连接 + 断开。
- **Task 8: 日志页** — 实时滚动 + 分级 + 复制/清空/导出/搜索。
- **Task 9: 设置页** — 主题/跟随系统/自动更新/开机启动/日志等级/核心路径/下载目录。
- **Task 10: 打磨** — 响应式、ESLint/Prettier、最终自检。

---

## 6. 关键实现决策

1. **统一 HTTP 客户端**：`src/api/http.ts` 用 `fetch` 封装（baseURL `http://127.0.0.1:38888/api`），统一错误处理与类型化返回。所有 API 模块导出强类型函数。
2. **轮询**：`usePolling` hook 封装 `setInterval` + 立即执行 + 卸载清理；Dashboard 网速 1000ms、网络检测 30000ms。
3. **状态**：全部通过 Pinia，页面只组合 store + 组件，不直接写请求逻辑。
4. **组件化**：页面由 `StatCard` / `TrafficChart` / `SwitchCard` / `ProxyGroupCard` / `ConnectionTable` / `LogViewer` 等复用组件组成，禁止单文件堆砌。
5. **无大量 if/else**：用配置驱动（如菜单数组、模式选项数组、日志等级数组）+ 策略/工厂，减少分支。
6. **类型 strict**：`tsconfig` 开启 `strict: true`；API 返回全部定义 `interface`。
7. **Mihomo 缺失兜底**：Core 未安装/未运行时，Go 控制面返回可读错误，UI 展示「服务未运行」而非崩溃。
