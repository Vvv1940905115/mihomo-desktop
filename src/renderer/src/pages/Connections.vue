<script setup lang="ts">
import { computed, h } from 'vue'
import { NButton, NDataTable, NEmpty, useMessage, type DataTableColumns } from 'naive-ui'
import { usePolling } from '@/hooks/usePolling'
import { useConnectionsStore } from '@/stores/connections'
import type { ConnectionWithSpeed } from '@/stores/connections'
import { formatSpeed } from '@/utils/format'

const store = useConnectionsStore()
const message = useMessage()

usePolling(() => store.load(), 1000)

async function handleClose(row: ConnectionWithSpeed): Promise<void> {
  try {
    await store.close(row.id)
    message.success('连接已断开')
  } catch {
    message.error('断开连接失败')
  }
}

const columns = computed<DataTableColumns<ConnectionWithSpeed>>(() => [
  {
    title: '源 IP',
    key: 'source',
    width: 180,
    render: (row) => `${row.metadata.sourceIP}:${row.metadata.sourcePort}`
  },
  {
    title: '目标地址',
    key: 'destination',
    ellipsis: { tooltip: true },
    render: (row) => `${row.metadata.host || row.metadata.destinationIP}:${row.metadata.destinationPort}`
  },
  {
    title: '规则',
    key: 'rule',
    width: 140,
    render: (row) => row.rulePayload || row.rule || '—'
  },
  {
    title: '节点',
    key: 'chain',
    ellipsis: { tooltip: true },
    render: (row) => (row.chains.length ? row.chains.join(' → ') : '—')
  },
  {
    title: '上传速度',
    key: 'upSpeed',
    width: 110,
    render: (row) => formatSpeed(row.upSpeed)
  },
  {
    title: '下载速度',
    key: 'downSpeed',
    width: 110,
    render: (row) => formatSpeed(row.downSpeed)
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) =>
      h(NButton, { size: 'tiny', type: 'error', onClick: () => handleClose(row) }, { default: () => '断开' })
  }
])
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-[#E6E8EC]">连接</h1>
      <span class="text-xs text-muted">当前 {{ store.connections.length }} 条连接</span>
    </div>

    <div class="card p-2">
      <NDataTable
        :columns="columns"
        :data="store.connections"
        :loading="store.loading"
        :bordered="false"
        :row-key="(row: ConnectionWithSpeed) => row.id"
        :scroll-x="960"
      />
      <NEmpty
        v-if="!store.loading && store.connections.length === 0"
        class="py-10"
        description="暂无活动连接"
      />
    </div>
  </div>
</template>
