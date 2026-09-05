<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NIcon, NTag, useMessage } from 'naive-ui'
import { ArrowDown, ArrowUp, Cpu, Gauge, Refresh, World } from '@vicons/tabler'
import StatCard from '@/components/StatCard.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import ToggleCard from '@/components/ToggleCard.vue'
import ModeSelector from '@/components/ModeSelector.vue'
import CountryFlag from '@/components/CountryFlag.vue'
import { usePolling } from '@/hooks/usePolling'
import { useTrafficStore } from '@/stores/traffic'
import { useSystemStore } from '@/stores/system'
import { useCoreStore } from '@/stores/core'
import { formatBytes, formatSpeed, formatUptime } from '@/utils/format'
import { flagOf } from '@/utils/flag'
import type { ProxyMode } from '@/api/types'

const traffic = useTrafficStore()
const system = useSystemStore()
const core = useCoreStore()
const message = useMessage()

const ipCountry = computed(() => flagOf(system.ipInfo.country))

const coreNotInstalled = computed(() => core.status.error === 'mihomo binary not installed')

const ipRefreshing = ref(false)

const coreStatusTag = computed(() => {
  if (core.status.running) return { type: 'success' as const, label: '运行中' }
  if (coreNotInstalled.value) return { type: 'warning' as const, label: '未安装' }
  return { type: 'error' as const, label: '已停止' }
})

usePolling(() => traffic.load(), 1000)
usePolling(() => system.loadIP(), 30000)
usePolling(() => core.load(), 3000)

onMounted(() => {
  void system.loadProxy()
  void system.loadTun()
  void system.loadMode()
  void system.loadLanIP()
  void core.loadVersion()
})

async function handleToggleProxy(value: boolean): Promise<void> {
  try {
    await system.toggleProxy(value)
  } catch {
    message.error('系统代理切换失败')
  }
}

async function handleToggleTun(value: boolean): Promise<void> {
  try {
    await system.toggleTun(value)
  } catch {
    message.error('TUN 模式切换失败')
  }
}

async function handleModeChange(value: ProxyMode): Promise<void> {
  try {
    await system.changeMode(value)
  } catch {
    message.error('出站模式切换失败')
  }
}

async function handleRefreshIP(): Promise<void> {
  if (ipRefreshing.value) return
  ipRefreshing.value = true
  try {
    await system.loadIP()
  } finally {
    ipRefreshing.value = false
  }
}

async function handleCoreAction(action: () => Promise<void>): Promise<void> {
  try {
    await action()
  } catch {
    message.error('核心操作失败')
  }
}

async function handleInstall(): Promise<void> {
  try {
    await core.install()
    message.success('核心安装完成')
    await core.loadVersion()
  } catch {
    message.error('核心下载失败，请检查网络')
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
    <!-- 网络速度 -->
    <div class="card p-5 md:col-span-2">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-[#E6E8EC]">实时网速</span>
        <span class="text-xs text-muted">每 1 秒刷新</span>
      </div>
      <TrafficChart :history="traffic.history" />
    </div>

    <div class="flex flex-col gap-4">
      <StatCard title="实时上传" :value="formatSpeed(traffic.up)" :icon="ArrowUp" />
      <StatCard title="实时下载" :value="formatSpeed(traffic.down)" :icon="ArrowDown" />
    </div>

    <!-- ③ 系统代理 / 出站模式 / 内网 IP 横向排布 -->
    <ToggleCard
      title="系统代理"
      description="启用 Windows 系统代理"
      :model-value="system.systemProxy.enable"
      @update:model-value="handleToggleProxy"
    />
    <ModeSelector :model-value="system.mode" @update:model-value="handleModeChange" />
    <StatCard title="内网 IP" :value="system.lanIP || '—'" :icon="World" />

    <!-- TUN / 网络检测 / 核心状态 -->
    <ToggleCard
      title="TUN 模式"
      description="接管系统全部流量"
      :model-value="system.tun"
      @update:model-value="handleToggleTun"
    />
    <div class="card p-5">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-[#E6E8EC]">网络检测</span>
        <NButton
          size="tiny"
          quaternary
          :loading="ipRefreshing"
          @click="handleRefreshIP"
        >
          <template #icon>
            <NIcon :size="14"><Refresh /></NIcon>
          </template>
          刷新
        </NButton>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">公网 IP</span>
          <span class="text-[#E6E8EC]">{{ system.ipInfo.ip || '—' }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">国家</span>
          <span class="flex items-center gap-1.5">
            <CountryFlag
              v-if="system.ipInfo.country"
              :code="ipCountry.code"
              :label="ipCountry.label || system.ipInfo.country"
              :size="14"
            />
            <span class="text-[#E6E8EC]">
              {{ ipCountry.label || system.ipInfo.country || '—' }}
            </span>
          </span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="shrink-0 text-muted">运营商</span>
          <span
            class="max-w-[180px] truncate text-[#E6E8EC]"
            :title="system.ipInfo.isp || '—'"
          >
            {{ system.ipInfo.isp || '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 核心状态 -->
    <div class="card p-5">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-[#E6E8EC]">核心状态</span>
        <NTag :type="coreStatusTag.type" size="small" round>
          {{ coreStatusTag.label }}
        </NTag>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">版本</span>
          <span class="text-[#E6E8EC]">{{ core.version || '—' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">运行时间</span>
          <span class="text-[#E6E8EC]">{{ formatUptime(core.status.uptime) }}</span>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <NButton
          v-if="coreNotInstalled"
          size="small"
          type="primary"
          :loading="core.busy"
          @click="handleInstall"
        >
          安装核心
        </NButton>
        <template v-else>
          <NButton size="small" type="primary" :disabled="core.status.running" @click="handleCoreAction(core.start)">
            启动
          </NButton>
          <NButton size="small" :disabled="!core.status.running" @click="handleCoreAction(core.stop)">
            停止
          </NButton>
          <NButton size="small" :disabled="!core.status.running" @click="handleCoreAction(core.restart)">
            重启
          </NButton>
        </template>
      </div>
    </div>

    <!-- 流量统计：横向单行 + 竖线分隔 -->
    <div class="card px-5 py-3 md:col-span-3">
      <div class="flex items-center gap-4">
        <span class="shrink-0 text-sm font-medium text-[#E6E8EC]">流量统计</span>
        <div class="flex min-w-0 flex-1 items-stretch divide-x divide-[#3A3E48]">
          <div class="flex-1 px-4" title="本次会话今日上传流量">
            <div class="text-xs text-muted">↑ 今日上传</div>
            <div class="mt-0.5 truncate text-base font-semibold text-[#E6E8EC]">
              {{ formatBytes(traffic.todayUp) }}
            </div>
          </div>
          <div class="flex-1 px-4" title="本次会话今日下载流量">
            <div class="text-xs text-muted">↓ 今日下载</div>
            <div class="mt-0.5 truncate text-base font-semibold text-[#E6E8EC]">
              {{ formatBytes(traffic.todayDown) }}
            </div>
          </div>
          <div class="flex-1 px-4" title="会话累计上传总流量">
            <div class="text-xs text-muted">↑ 累计上传</div>
            <div class="mt-0.5 truncate text-base font-semibold text-[#E6E8EC]">
              {{ formatBytes(traffic.totalUp) }}
            </div>
          </div>
          <div class="flex-1 px-4" title="会话累计下载总流量">
            <div class="text-xs text-muted">↓ 累计下载</div>
            <div class="mt-0.5 truncate text-base font-semibold text-[#E6E8EC]">
              {{ formatBytes(traffic.totalDown) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 内存占用 -->
    <StatCard title="Core 内存" :value="formatBytes(core.memory.core)" :icon="Cpu" />
    <StatCard title="UI 内存" :value="formatBytes(core.memory.ui)" :icon="Gauge" />
  </div>
</template>
