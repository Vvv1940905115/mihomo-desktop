import { http } from './http'

export interface Subscription {
  id: string
  name: string
  url: string
  kind?: string
  updatedAt: string
  status: string
  proxyCount: number
}

export function getSubscriptions(): Promise<Subscription[]> {
  return http.get<Subscription[]>('/subscriptions')
}

export function addSubscription(name: string, url: string): Promise<Subscription> {
  return http.post<Subscription>('/subscriptions', { name, url })
}

export function updateSubscription(id: string, name: string, url: string): Promise<unknown> {
  return http.put(`/subscriptions/${id}`, { name, url })
}

export function deleteSubscription(id: string): Promise<unknown> {
  return http.del(`/subscriptions/${id}`)
}

export function refreshSubscription(id: string): Promise<unknown> {
  return http.post(`/subscriptions/${id}/update`)
}

export function refreshAllSubscriptions(): Promise<unknown> {
  return http.post('/subscriptions/update-all')
}
