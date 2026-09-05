import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { streamLogs } from '@/api/logs'
import type { LogEntry } from '@/api/logs'

export type LogLevel = 'info' | 'warning' | 'error' | 'debug'

const MAX_ENTRIES = 2000

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

export const useLogsStore = defineStore('logs', () => {
  const entries = ref<LogEntry[]>([])
  const search = ref('')
  const levels = ref<LogLevel[]>(['info', 'warning', 'error'])
  const connected = ref(false)

  let controller: AbortController | null = null

  const filtered = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    return entries.value.filter((entry) => {
      const matchLevel = levels.value.includes(entry.level)
      const matchSearch = !keyword || entry.message.toLowerCase().includes(keyword)
      return matchLevel && matchSearch
    })
  })

  function start(): void {
    if (controller) return
    connected.value = true
    controller = streamLogs((entry) => {
      entries.value.push(entry)
      if (entries.value.length > MAX_ENTRIES) entries.value.shift()
    })
  }

  function stop(): void {
    controller?.abort()
    controller = null
    connected.value = false
  }

  function clear(): void {
    entries.value = []
  }

  function exportText(): string {
    return filtered.value
      .map((entry) => `[${formatTime(entry.time)}] [${entry.level.toUpperCase()}] ${entry.message}`)
      .join('\n')
  }

  return { entries, search, levels, connected, filtered, start, stop, clear, exportText }
})
