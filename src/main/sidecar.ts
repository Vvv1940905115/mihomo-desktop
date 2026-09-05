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

  try {
    sidecarProcess = spawn(SIDECAR_BIN, [], {
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
  if (sidecarProcess) {
    sidecarProcess.kill()
    sidecarProcess = null
  }
}
