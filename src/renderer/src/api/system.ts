import { http } from './http'
import type { IPInfo, LanIP, SystemProxyState } from './types'

export function getSystemProxy(): Promise<SystemProxyState> {
  return http.get<SystemProxyState>('/system-proxy')
}

export function setSystemProxy(enable: boolean): Promise<{ enable: boolean }> {
  return http.put<{ enable: boolean }>('/system-proxy', { enable })
}

export function getIPInfo(): Promise<IPInfo> {
  return http.get<IPInfo>('/ip-info')
}

export function getLanIP(): Promise<LanIP> {
  return http.get<LanIP>('/lan-ip')
}
