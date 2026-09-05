export interface Traffic {
  up: number
  down: number
}

export interface SystemProxyState {
  enable: boolean
  server: string
}

export interface TunState {
  enable: boolean
}

export interface ConfigInfo {
  mode: string
  tun: {
    enable: boolean
  }
}

export interface IPInfo {
  ip: string
  country: string
  isp: string
}

export interface LanIP {
  ip: string
}

export interface MemoryStat {
  core: number
  ui: number
}

export interface CoreStatus {
  version: string
  running: boolean
  uptime: number
  pid: number
  error?: string
}

export type ProxyMode = 'rule' | 'global' | 'direct'
