import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
