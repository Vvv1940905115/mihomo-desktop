import { http } from './http'
import type { Traffic } from './types'

export function getTraffic(): Promise<Traffic> {
  return http.get<Traffic>('/traffic')
}
