import { http } from './http'
import type { CoreStatus, MemoryStat } from './types'

export function getCoreStatus(): Promise<CoreStatus> {
  return http.get<CoreStatus>('/core/status')
}

export function getVersion(): Promise<{ version: string }> {
  return http.get<{ version: string }>('/version')
}

export function getMemory(): Promise<MemoryStat> {
  return http.get<MemoryStat>('/memory')
}

export function startCore(): Promise<CoreStatus> {
  return http.post<CoreStatus>('/core/start')
}

export function stopCore(): Promise<CoreStatus> {
  return http.post<CoreStatus>('/core/stop')
}

export function restartCore(): Promise<CoreStatus> {
  return http.post<CoreStatus>('/core/restart')
}

export function installCore(): Promise<CoreStatus> {
  return http.post<CoreStatus>('/core/install')
}
