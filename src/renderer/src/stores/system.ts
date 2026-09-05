import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getConfigs, getTun, setMode, setTun } from '@/api/configs'
import { getIPInfo, getLanIP, getSystemProxy, setSystemProxy } from '@/api/system'
import type { IPInfo, ProxyMode, SystemProxyState } from '@/api/types'

export const useSystemStore = defineStore('system', () => {
  const systemProxy = ref<SystemProxyState>({ enable: false, server: '' })
  const tun = ref(false)
  const mode = ref<ProxyMode>('rule')
  const ipInfo = ref<IPInfo>({ ip: '', country: '', isp: '' })
  const lanIP = ref('')

  async function loadProxy(): Promise<void> {
    try {
      systemProxy.value = await getSystemProxy()
    } catch {
      // 忽略：控制面不可达时保持默认值
    }
  }

  async function loadTun(): Promise<void> {
    try {
      tun.value = (await getTun()).enable
    } catch {
      // 忽略
    }
  }

  async function loadMode(): Promise<void> {
    try {
      const config = await getConfigs()
      mode.value = (config.mode as ProxyMode) || 'rule'
    } catch {
      // 忽略
    }
  }

  async function loadIP(): Promise<void> {
    try {
      ipInfo.value = await getIPInfo()
    } catch {
      // 忽略
    }
  }

  async function loadLanIP(): Promise<void> {
    try {
      lanIP.value = (await getLanIP()).ip
    } catch {
      // 忽略
    }
  }

  async function toggleProxy(enable: boolean): Promise<void> {
    const previous = systemProxy.value.enable
    systemProxy.value.enable = enable
    try {
      await setSystemProxy(enable)
    } catch (error) {
      systemProxy.value.enable = previous
      throw error
    }
  }

  async function toggleTun(enable: boolean): Promise<void> {
    const previous = tun.value
    tun.value = enable
    try {
      await setTun(enable)
    } catch (error) {
      tun.value = previous
      throw error
    }
  }

  async function changeMode(nextMode: ProxyMode): Promise<void> {
    const previous = mode.value
    mode.value = nextMode
    try {
      await setMode(nextMode)
    } catch (error) {
      mode.value = previous
      throw error
    }
  }

  return {
    systemProxy,
    tun,
    mode,
    ipInfo,
    lanIP,
    loadProxy,
    loadTun,
    loadMode,
    loadIP,
    loadLanIP,
    toggleProxy,
    toggleTun,
    changeMode
  }
})
