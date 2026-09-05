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
    width: 960,
    height: 680,
    resizable: true,
    minWidth: 840,
    minHeight: 620,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#1F2025',
    title: '灵核工坊',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const showWindow = (): void => {
    if (!mainWindow.isDestroyed()) mainWindow.show()
  }

  mainWindow.once('ready-to-show', showWindow)
  // 兜底：dev 下 Vite 首次编译可能让 ready-to-show 迟迟不来，
  // 最多等 2 秒就显示窗口（深色背景），避免长时间"无窗口"。
  setTimeout(showWindow, 2000)

  // 把 renderer 控制台输出打到 main 日志，方便排查白屏/空白问题
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const labels = ['debug', 'log', 'warn', 'error']
    const label = labels[level] ?? String(level)
    console.log(`[renderer:${label}] ${sourceId}:${line} ${message}`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[window] renderer did-finish-load', mainWindow.webContents.getURL())
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[window] did-fail-load: ${errorCode} ${errorDescription} | ${validatedURL}`)
  })

  // 开发时自动打开 DevTools，方便看 renderer 报错
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  console.log('[window] rendererUrl =', rendererUrl ?? '(none, will load file)')
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
