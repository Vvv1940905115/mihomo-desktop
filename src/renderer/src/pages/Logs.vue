<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NEmpty,
  NInput,
  NSpace,
  useMessage
} from 'naive-ui'
import { useLogsStore } from '@/stores/logs'
import type { LogLevel } from '@/stores/logs'

const store = useLogsStore()
const message = useMessage()
const scrollRef = ref<HTMLElement | null>(null)

const levelOptions: { label: string; value: LogLevel }[] = [
  { label: 'INFO', value: 'info' },
  { label: 'WARNING', value: 'warning' },
  { label: 'ERROR', value: 'error' }
]

const levelColorMap: Record<LogLevel, string> = {
  info: '#B7BCC6',
  warning: '#FFB86C',
  error: '#FF6B6B',
  debug: '#8A8F9C'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

watch(
  () => store.filtered.length,
  async () => {
    await nextTick()
    scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight })
  }
)

async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(store.exportText())
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

function handleExport(): void {
  const blob = new Blob([store.exportText()], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `mihomo-logs-${Date.now()}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

onMounted(() => store.start())
onUnmounted(() => store.stop())
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-[#E6E8EC]">日志</h1>
      <span class="text-xs text-muted">{{ store.connected ? '实时连接中' : '未连接' }}</span>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <NCheckboxGroup v-model:value="store.levels" size="small">
        <NCheckbox v-for="option in levelOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </NCheckbox>
      </NCheckboxGroup>

      <NInput
        v-model:value="store.search"
        placeholder="搜索日志…"
        clearable
        class="!w-56"
      />

      <NSpace class="ml-auto">
        <NButton size="small" @click="handleCopy">复制</NButton>
        <NButton size="small" @click="store.clear()">清空</NButton>
        <NButton size="small" @click="handleExport">导出</NButton>
      </NSpace>
    </div>

    <div
      ref="scrollRef"
      class="card flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
    >
      <template v-if="store.filtered.length">
        <div v-for="(entry, index) in store.filtered" :key="index" class="flex gap-2">
          <span class="shrink-0 text-muted">{{ formatTime(entry.time) }}</span>
          <span class="shrink-0 font-semibold" :style="{ color: levelColorMap[entry.level] }">
            [{{ entry.level.toUpperCase() }}]
          </span>
          <span class="break-all text-[#D3D6DD]">{{ entry.message }}</span>
        </div>
      </template>
      <NEmpty v-else class="py-20" description="暂无日志" />
    </div>
  </div>
</template>
