const BASE_URL = 'http://127.0.0.1:38888/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers
    }
  })

  if (!response.ok) {
    throw new ApiError(`请求失败 (${response.status})`, response.status)
  }

  // 部分接口（如切换出站模式 PATCH /configs）会返回 204 无内容，
  // 直接调用 response.json() 会因空 body 抛错，这里对空响应返回 undefined。
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export const http = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}
