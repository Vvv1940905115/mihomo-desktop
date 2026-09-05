import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type LogLevel = 'info' | 'warning' | 'error' | 'debug'

const STORAGE_KEY = 'mihomo-client:settings'

interface SettingsState {
  theme: ThemeMode
  followSystem: boolean
  autoUpdate: boolean
  autoLaunch: boolean
  logLevel: LogLevel
  corePath: string
  downloadDir: string
}

const defaults: SettingsState = {
  theme: 'dark',
  followSystem: false,
  autoUpdate: false,
  autoLaunch: false,
  logLevel: 'info',
  corePath: '',
  downloadDir: ''
}

function loadState(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<SettingsState>) } : defaults
  } catch {
    return defaults
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadState()

  const theme = ref<ThemeMode>(initial.theme)
  const followSystem = ref(initial.followSystem)
  const autoUpdate = ref(initial.autoUpdate)
  const autoLaunch = ref(initial.autoLaunch)
  const logLevel = ref<LogLevel>(initial.logLevel)
  const corePath = ref(initial.corePath)
  const downloadDir = ref(initial.downloadDir)

  const resolvedTheme = computed<ThemeMode>(() => {
    if (followSystem.value) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return theme.value
  })

  watch(
    [theme, followSystem, autoUpdate, autoLaunch, logLevel, corePath, downloadDir],
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: theme.value,
          followSystem: followSystem.value,
          autoUpdate: autoUpdate.value,
          autoLaunch: autoLaunch.value,
          logLevel: logLevel.value,
          corePath: corePath.value,
          downloadDir: downloadDir.value
        })
      )
    }
  )

  return {
    theme,
    followSystem,
    autoUpdate,
    autoLaunch,
    logLevel,
    corePath,
    downloadDir,
    resolvedTheme
  }
})
