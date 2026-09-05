import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createMainWindow } from './window'
import { startSidecar, stopSidecar } from './sidecar'

// GPU 兜底开关：仅在无显示/GPU 沙盒受限的环境（如后台 shell、CI）需要，
// 设置环境变量 MIHOMO_HEADLESS=1 启用。正常桌面启动保持硬件加速，UI 才流畅。
// 注意：headless 下需要软件光栅化来渲染内容，不能同时禁用 software rasterizer。
if (process.env['MIHOMO_HEADLESS'] === '1') {
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('in-process-gpu')
}

// 临时调试：CDP 远程调试端口（仅 dev 诊断用，确认问题后移除）
if (process.env['MIHOMO_DEBUG_CDP'] === '1') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

app.whenReady().then(() => {
  ipcMain.handle('app:open-external', (_event, url: string) => shell.openExternal(url))

  startSidecar()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopSidecar()
})
