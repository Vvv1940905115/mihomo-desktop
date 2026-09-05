import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getProxies, getProxyDelay, isProxyGroup, switchProxy } from '@/api/proxies'
import type { ProxyInfo } from '@/api/proxies'

export interface ProxyGroup {
  name: string
  type: string
  now: string
  all: string[]
}

export type DelayStatus = 'ok' | 'timeout' | 'error'

export interface DelayResult {
  /** 有效延迟（毫秒），失败/超时为 0 */
  delay: number
  status: DelayStatus
}

/** 延迟分级阈值（毫秒）：低于 good 绿色，低于 medium 黄色，其余红色 */
export const DELAY_GOOD_MS = 200
export const DELAY_MEDIUM_MS = 500

export const useProxiesStore = defineStore('proxies', () => {
  const proxies = ref<Record<string, ProxyInfo>>({})
  const loading = ref(false)

  const groups = computed<ProxyGroup[]>(() =>
    Object.entries(proxies.value)
      .filter(([, info]) => isProxyGroup(info))
      .map(([name, info]) => ({
        name,
        type: info.type,
        now: info.now ?? '',
        all: info.all ?? []
      }))
  )

  async function load(): Promise<void> {
    loading.value = true
    try {
      const response = await getProxies()
      proxies.value = response.proxies
    } finally {
      loading.value = false
    }
  }

  async function select(group: string, proxy: string): Promise<void> {
    await switchProxy(group, proxy)
    if (proxies.value[group]) {
      proxies.value[group] = { ...proxies.value[group], now: proxy }
    }
  }

  const delays = ref<Record<string, DelayResult>>({})
  const testingDelay = ref(false)
  /** 同时测速的节点数量 */
  const testConcurrency = ref(5)
  /** 单个节点测速超时时间（毫秒） */
  const testTimeout = ref(5000)

  async function runWithConcurrency(
    names: string[],
    limit: number,
    worker: (name: string) => Promise<void>
  ): Promise<void> {
    let cursor = 0
    const runnerCount = Math.min(limit, names.length)
    const runners = Array.from({ length: runnerCount }, async () => {
      while (cursor < names.length) {
        const index = cursor++
        await worker(names[index])
      }
    })
    await Promise.all(runners)
  }

  async function testAllDelays(): Promise<void> {
    if (testingDelay.value) return
    testingDelay.value = true
    try {
      const names = [...new Set(groups.value.flatMap((group) => group.all))]
      const timeout = testTimeout.value
      const next: Record<string, DelayResult> = {}

      await runWithConcurrency(names, testConcurrency.value, async (name) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)
        try {
          const { delay } = await getProxyDelay(name, timeout, controller.signal)
          next[name] = delay > 0 ? { delay, status: 'ok' } : { delay: 0, status: 'timeout' }
        } catch {
          // AbortError（客户端超时）或网络错误均标记为超时
          next[name] = { delay: 0, status: 'timeout' }
        } finally {
          clearTimeout(timer)
        }
      })

      delays.value = next
    } finally {
      testingDelay.value = false
    }
  }

  return {
    proxies,
    groups,
    delays,
    testingDelay,
    testConcurrency,
    testTimeout,
    loading,
    load,
    select,
    testAllDelays
  }
})
