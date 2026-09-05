import { BrowserWindow, nativeImage, shell } from 'electron'
import { join } from 'path'

function loadWindowIcon() {
  // dev:  out/main/index.js  ->  ../../resources/icon.png
  // prod: app.asar/main/index.js -> falls back to process.resourcesPath/icon.png
  const devPath = join(__dirname, '../../resources/icon.png')
  const prodPath = join(process.resourcesPath, 'icon.png')
  const iconPath = nativeImage.createFromPath(devPath).isEmpty() ? prodPath : devPath
  try {
    const icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      console.warn('[window] icon is empty:', iconPath)
      return undefined
    }
    console.log('[window] loaded icon from', iconPath)
    return icon
  } catch (err) {
    console.warn('[window] failed to load icon:', err)
    return undefined
  }
}

export function createMainWindow(): BrowserWindow {
  const icon = loadWindowIcon()
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#1F2025',
    title: 'Mihomo Client',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
