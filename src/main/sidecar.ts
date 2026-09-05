import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'

let sidecarProcess: ChildProcess | null = null

const SIDECAR_BIN = join(app.getAppPath(), 'resources', 'sidecar', 'mihomo-service.exe')

export function startSidecar(): void {
  if (sidecarProcess) return

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
