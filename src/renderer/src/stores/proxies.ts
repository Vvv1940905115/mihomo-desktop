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

  return { proxies, groups, loading, load, select }
})
