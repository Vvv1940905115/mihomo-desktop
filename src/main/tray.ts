import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

function loadTrayIcon(): Electron.NativeImage {
  // dev:  out/main/index.js  ->  ../../resources/icon.png
  // prod: app.asar/main/index.js -> falls back to process.resourcesPath/icon.png
  const devPath = join(__dirname, '../../resources/icon.png')
  const prodPath = join(process.resourcesPath, 'icon.png')

  let icon = nativeImage.createFromPath(devPath)
  if (icon.isEmpty()) icon = nativeImage.createFromPath(prodPath)

  if (icon.isEmpty()) {
    console.warn('[tray] icon not found:', prodPath)
    return nativeImage.createEmpty()
  }

  // Windows 通知区域标准尺寸 16x16（Electron 会按 DPI 缩放）
  return icon.resize({ width: 16, height: 16 })
}

export function createTray(getWindow: () => BrowserWindow | null): Tray {
  tray = new Tray(loadTrayIcon())
  tray.setToolTip('灵核工坊')

  const showWindow = (): void => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  const menu = Menu.buildFromTemplate([
    { label: '显示窗口', click: showWindow },
    { type: 'separator' },
    {
      label: '退出程序',
      click: () => {
        app.quit()
      }
    }
  ])

  // Windows：左键单击触发 click，右键弹出菜单
  tray.setContextMenu(menu)
  tray.on('click', showWindow)

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
