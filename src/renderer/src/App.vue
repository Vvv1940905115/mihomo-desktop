<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider
} from 'naive-ui'
import { darkTheme, darkThemeOverrides, lightTheme, lightThemeOverrides } from '@/styles/naive-theme'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const naiveTheme = computed(() => (settings.resolvedTheme === 'dark' ? darkTheme : lightTheme))
const naiveOverrides = computed(() =>
  settings.resolvedTheme === 'dark' ? darkThemeOverrides : lightThemeOverrides
)
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="naiveOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <router-view />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
