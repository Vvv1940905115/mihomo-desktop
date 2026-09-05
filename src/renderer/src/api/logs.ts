import type { LogLevel } from '@/stores/logs'

export interface LogEntry {
  time: number
  level: LogLevel
  message: string
}

const BASE_URL = 'http://127.0.0.1:38888/api'

function parseLine(line: string): LogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('data:')) {
    return parseJSON(trimmed.slice(5).trim())
  }

  return parseJSON(trimmed)
}

function parseJSON(text: string): LogEntry | null {
  try {
    const data = JSON.parse(text) as { type?: string; level?: string; payload?: string; msg?: string }
    const rawLevel = data.type ?? data.level ?? 'info'
    const message = data.payload ?? data.msg ?? text
    return { time: Date.now(), level: normalizeLevel(rawLevel), message }
  } catch {
    return { time: Date.now(), level: 'info', message: text }
  }
}

function normalizeLevel(level: string): LogLevel {
  const value = level.toLowerCase()
  if (value === 'warning' || value === 'warn') return 'warning'
  if (value === 'error') return 'error'
  if (value === 'debug') return 'debug'
  return 'info'
}

export function streamLogs(onEntry: (entry: LogEntry) => void): AbortController {
  const controller = new AbortController()

  void fetch(`${BASE_URL}/logs?level=info`, { signal: controller.signal })
    .then((response) => {
      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      const read = (): void => {
        void reader.read().then(({ done, value }) => {
          if (done) return
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const entry = parseLine(line)
            if (entry) onEntry(entry)
          }

          read()
        })
      }

      read()
    })
    .catch(() => {
      // 控制面不可达时静默处理，UI 展示未连接状态
    })

  return controller
}
