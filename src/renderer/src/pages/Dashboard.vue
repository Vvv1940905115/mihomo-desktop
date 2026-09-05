<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NButton, NTag, useMessage } from 'naive-ui'
import { ArrowDown, ArrowUp, Cpu, Gauge, World } from '@vicons/tabler'
import StatCard from '@/components/StatCard.vue'
import TrafficChart from '@/components/TrafficChart.vue'
import ToggleCard from '@/components/ToggleCard.vue'
import ModeSelector from '@/components/ModeSelector.vue'
import { usePolling } from '@/hooks/usePolling'
import { useTrafficStore } from '@/stores/traffic'
import { useSystemStore } from '@/stores/system'
import { useCoreStore } from '@/stores/core'
import { formatBytes, formatSpeed, formatUptime } from '@/utils/format'
import type { ProxyMode } from '@/api/types'

const traffic = useTrafficStore()
const system = useSystemStore()
const core = useCoreStore()
const message = useMessage()

const coreNotInstalled = computed(() => core.status.error === 'mihomo binary not installed')

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
  <div class="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
    <!-- 网络速度 -->
    <div class="card h-72 p-5 md:col-span-2">
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

    <!-- 系统代理 / TUN / 出站模式 -->
    <ToggleCard
      title="系统代理"
      description="启用 Windows 系统代理"
      :model-value="system.systemProxy.enable"
      @update:model-value="handleToggleProxy"
    />
    <ToggleCard
      title="TUN 模式"
      description="接管系统全部流量"
      :model-value="system.tun"
      @update:model-value="handleToggleTun"
    />
    <ModeSelector :model-value="system.mode" @update:model-value="handleModeChange" />

    <!-- 网络检测 / 内网 IP -->
    <div class="card p-5">
      <div class="mb-3 text-sm font-medium text-[#E6E8EC]">网络检测</div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">公网 IP</span>
          <span class="text-[#E6E8EC]">{{ system.ipInfo.ip || '—' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">国家</span>
          <span class="text-[#E6E8EC]">{{ system.ipInfo.country || '—' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">运营商</span>
          <span class="text-[#E6E8EC]">{{ system.ipInfo.isp || '—' }}</span>
        </div>
      </div>
    </div>

    <StatCard title="内网 IP" :value="system.lanIP || '—'" :icon="World" />

    <!-- 流量统计 -->
    <div class="card p-5 md:col-span-2 xl:col-span-3">
      <div class="mb-3 text-sm font-medium text-[#E6E8EC]">流量统计</div>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <div class="text-xs text-muted">今日上传</div>
          <div class="mt-1 text-lg font-semibold text-[#E6E8EC]">
            {{ formatBytes(traffic.todayUp) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">今日下载</div>
          <div class="mt-1 text-lg font-semibold text-[#E6E8EC]">
            {{ formatBytes(traffic.todayDown) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">累计上传</div>
          <div class="mt-1 text-lg font-semibold text-[#E6E8EC]">
            {{ formatBytes(traffic.totalUp) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">累计下载</div>
          <div class="mt-1 text-lg font-semibold text-[#E6E8EC]">
            {{ formatBytes(traffic.totalDown) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 内存占用 -->
    <StatCard title="Core 内存" :value="formatBytes(core.memory.core)" :icon="Cpu" />
    <StatCard title="UI 内存" :value="formatBytes(core.memory.ui)" :icon="Gauge" />

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
  </div>
</template>
