import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'

let sidecarProcess: ChildProcess | null = null

export function startSidecar(): void {
  if (sidecarProcess) return

  // app.getAppPath() must be called after app is ready; resolve it here
  // instead of at module top-level so the main process can boot cleanly.
  // 打包后 app.getAppPath() 指向 app.asar，无法从中 spawn exe；
  // sidecar 由 extraResources 释放到 process.resourcesPath/sidecar/ 下。
  const SIDECAR_BIN = app.isPackaged
    ? join(process.resourcesPath, 'sidecar', 'mihomo-service.exe')
    : join(app.getAppPath(), 'resources', 'sidecar', 'mihomo-service.exe')

  // dev 下用项目根目录 .data 作为数据目录：既与 Electron userData 隔离，
  // 也避免系统目录的写权限限制；生产环境仍走默认 %APPDATA%\mihomo-client。
  const args = app.isPackaged ? [] : ['-home', join(app.getAppPath(), '.data')]

  try {
    sidecarProcess = spawn(SIDECAR_BIN, args, {
      stdio: 'ignore',
      windowsHide: true
    })

    sidecarProcess.on('exit', (code) => {
      console.log(`[sidecar] exited with code ${code}`)
      sidecarProcess = null
    })
  } catch (error) {
    // The Go sidecar is optional in dev; the renderer falls back gracefully.
    console.warn('[sidecar] failed to start:', error)
  }
}

export function stopSidecar(): void {
  if (!sidecarProcess) return
  const child = sidecarProcess
  sidecarProcess = null
  const pid = child.pid

  // Windows 下仅 kill sidecar 无法终止其 spawn 的 mihomo 子进程，mihomo 会变
  // 孤儿进程继续占用 7897/9090 端口，导致下次启动提示"核心操作失败"。
  // 用 taskkill /T /F 杀整个进程树，确保 mihomo 一起结束；child.kill() 兜底。
  if (pid) {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
  }
  child.kill()
}
