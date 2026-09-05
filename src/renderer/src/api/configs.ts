import { http } from './http'
import type { ConfigInfo, ProxyMode, TunState } from './types'

export function getConfigs(): Promise<ConfigInfo> {
  return http.get<ConfigInfo>('/configs')
}

export function setMode(mode: ProxyMode): Promise<unknown> {
  return http.put('/configs', { mode })
}

export function getTun(): Promise<TunState> {
  return http.get<TunState>('/tun')
}

export function setTun(enable: boolean): Promise<TunState> {
  return http.put<TunState>('/tun', { enable })
}
