import { http } from './http'

export interface ProxyHistory {
  time: string
  delay: number
}

export interface ProxyInfo {
  type: string
  now?: string
  all?: string[]
  history?: ProxyHistory[]
  [key: string]: unknown
}

export interface ProxiesResponse {
  proxies: Record<string, ProxyInfo>
}

const GROUP_TYPES = ['Selector', 'URLTest', 'Fallback', 'LoadBalance']

export function isProxyGroup(info: ProxyInfo): boolean {
  return GROUP_TYPES.includes(info.type)
}

export function getProxies(): Promise<ProxiesResponse> {
  return http.get<ProxiesResponse>('/proxies')
}

export function getProxy(name: string): Promise<ProxyInfo> {
  return http.get<ProxyInfo>(`/proxies/${encodeURIComponent(name)}`)
}

export function switchProxy(group: string, proxy: string): Promise<unknown> {
  return http.put(`/proxies/${encodeURIComponent(group)}`, { name: proxy })
}

export function getProxyDelay(name: string): Promise<{ delay: number }> {
  const testURL = 'http://www.gstatic.com/generate_204'
  return http.get<{ delay: number }>(
    `/proxies/${encodeURIComponent(name)}/delay?timeout=5000&url=${encodeURIComponent(testURL)}`
  )
}
