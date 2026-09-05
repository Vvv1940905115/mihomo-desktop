import { http } from './http'

export interface ConnectionMetadata {
  network: string
  type: string
  sourceIP: string
  sourcePort: string
  destinationIP: string
  destinationPort: string
  host?: string
}

export interface Connection {
  id: string
  metadata: ConnectionMetadata
  upload: number
  download: number
  rule: string
  rulePayload: string
  chains: string[]
  start: string
}

export interface ConnectionsResponse {
  downloadTotal: number
  uploadTotal: number
  connections: Connection[]
}

export function getConnections(): Promise<ConnectionsResponse> {
  return http.get<ConnectionsResponse>('/connections')
}

export function closeConnection(id: string): Promise<unknown> {
  return http.del(`/connections/${encodeURIComponent(id)}`)
}
