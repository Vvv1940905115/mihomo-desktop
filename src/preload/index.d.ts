export interface ElectronAPI {
  platform: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
