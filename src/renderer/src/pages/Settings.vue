<script setup lang="ts">
import { NButton, NInput, NRadioButton, NRadioGroup, NSelect, NSwitch, useMessage } from 'naive-ui'
import SettingRow from '@/components/SettingRow.vue'
import { useSettingsStore } from '@/stores/settings'
import type { LogLevel, ThemeMode } from '@/stores/settings'

const settings = useSettingsStore()
const message = useMessage()

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' }
]

const logLevelOptions: { label: string; value: LogLevel }[] = [
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
  { label: 'Debug', value: 'debug' }
]

function handleCheckUpdate(): void {
  message.success('当前已是最新版本')
}
</script>

<template>
  <div class="p-6">
    <h1 class="mb-4 text-lg font-semibold text-[#E6E8EC]">设置</h1>

    <div class="card px-5">
      <SettingRow label="深浅主题" description="选择应用显示主题">
        <NRadioGroup v-model:value="settings.theme">
          <NRadioButton v-for="option in themeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </NRadioButton>
        </NRadioGroup>
      </SettingRow>

      <SettingRow label="跟随系统" description="跟随操作系统的深浅色设置">
        <NSwitch v-model:value="settings.followSystem" />
      </SettingRow>

      <SettingRow label="自动更新" description="启动时自动检查并更新">
        <NSwitch v-model:value="settings.autoUpdate" />
      </SettingRow>

      <SettingRow label="检查更新">
        <NButton size="small" @click="handleCheckUpdate">检查更新</NButton>
      </SettingRow>

      <SettingRow label="开机启动" description="登录系统后自动启动">
        <NSwitch v-model:value="settings.autoLaunch" />
      </SettingRow>

      <SettingRow label="日志等级">
        <NSelect
          v-model:value="settings.logLevel"
          :options="logLevelOptions"
          class="!w-32"
        />
      </SettingRow>

      <SettingRow label="核心路径" description="Mihomo 核心二进制所在路径">
        <NInput v-model:value="settings.corePath" placeholder="默认自动检测" class="!w-72" />
      </SettingRow>

      <SettingRow label="下载目录" description="订阅与核心文件的下载目录">
        <NInput v-model:value="settings.downloadDir" placeholder="默认用户目录" class="!w-72" />
      </SettingRow>
    </div>
  </div>
</template>
