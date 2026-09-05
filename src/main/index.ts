import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createMainWindow } from './window'
import { startSidecar, stopSidecar } from './sidecar'

// Fallback for environments where the Chromium GPU process can't start
// (headless/sandboxed shells). On a normal desktop with a GPU you can drop this.
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('in-process-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

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
