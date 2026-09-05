import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getCoreStatus,
  getMemory,
  getVersion,
  installCore,
  restartCore,
  startCore,
  stopCore
} from '@/api/core'
import type { CoreStatus, MemoryStat } from '@/api/types'

export const useCoreStore = defineStore('core', () => {
  const status = ref<CoreStatus>({ version: '', running: false, uptime: 0, pid: 0 })
  const memory = ref<MemoryStat>({ core: 0, ui: 0 })
  const version = ref('')
  const busy = ref(false)

  async function load(): Promise<void> {
    const [statusResult, memoryResult] = await Promise.allSettled([getCoreStatus(), getMemory()])
    if (statusResult.status === 'fulfilled') status.value = statusResult.value
    if (memoryResult.status === 'fulfilled') memory.value = memoryResult.value
  }

  async function loadVersion(): Promise<void> {
    try {
      const result = await getVersion()
      version.value = result.version
    } catch {
      version.value = ''
    }
  }

  async function start(): Promise<void> {
    busy.value = true
    try {
      status.value = await startCore()
    } finally {
      busy.value = false
    }
  }

  async function stop(): Promise<void> {
    busy.value = true
    try {
      status.value = await stopCore()
    } finally {
      busy.value = false
    }
  }

  async function restart(): Promise<void> {
    busy.value = true
    try {
      status.value = await restartCore()
    } finally {
      busy.value = false
    }
  }

  async function install(): Promise<void> {
    busy.value = true
    try {
      status.value = await installCore()
    } finally {
      busy.value = false
    }
  }

  return { status, memory, version, busy, load, loadVersion, start, stop, restart, install }
})
