import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getProxies, isProxyGroup, switchProxy } from '@/api/proxies'
import type { ProxyInfo } from '@/api/proxies'

export interface ProxyGroup {
  name: string
  type: string
  now: string
  all: string[]
}

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

  const delays = ref<Record<string, number>>({})
  const testingDelay = ref(false)

  async function testAllDelays(): Promise<void> {
    if (testingDelay.value) return
    testingDelay.value = true
    try {
      const names = [...new Set(groups.value.flatMap((group) => group.all))]
      const results = await Promise.allSettled(names.map((name) => getProxyDelay(name)))
      const next: Record<string, number> = {}
      names.forEach((name, index) => {
        const result = results[index]
        if (result.status === 'fulfilled' && result.value.delay > 0) {
          next[name] = result.value.delay
        }
      })
      delays.value = next
    } finally {
      testingDelay.value = false
    }
  }

  return { proxies, groups, delays, testingDelay, loading, load, select, testAllDelays }
})
