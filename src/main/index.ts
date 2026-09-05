import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createMainWindow } from './window'
import { startSidecar, stopSidecar } from './sidecar'

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
