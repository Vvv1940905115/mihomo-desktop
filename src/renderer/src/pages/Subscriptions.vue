<script setup lang="ts">
import { computed, h, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NSpace,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import SubscriptionFormModal from '@/components/SubscriptionFormModal.vue'
import { usePolling } from '@/hooks/usePolling'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import type { Subscription } from '@/api/subscriptions'

const store = useSubscriptionsStore()
const message = useMessage()
const dialog = useDialog()

const showForm = ref(false)
const editing = ref<Subscription | null>(null)

usePolling(() => store.load(), 5000)

const statusConfig: Record<string, { label: string; type: 'success' | 'info' | 'error' | 'warning' | 'default' }> = {
  active: { label: '正常', type: 'success' },
  updating: { label: '更新中', type: 'info' },
  error: { label: '异常', type: 'error' },
  pending: { label: '待更新', type: 'warning' }
}

function formatTime(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
}

function openAdd(): void {
  editing.value = null
  showForm.value = true
}

function openEdit(item: Subscription): void {
  editing.value = item
  showForm.value = true
}

async function handleSubmit(payload: { name: string; url: string }): Promise<void> {
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload.name, payload.url)
    } else {
      await store.add(payload.name, payload.url)
    }
    showForm.value = false
    message.success('保存成功')
  } catch {
    message.error('保存失败')
  }
}

function handleDelete(item: Subscription): void {
  dialog.warning({
    title: '删除订阅',
    content: `确定删除「${item.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await store.remove(item.id)
        message.success('已删除')
      } catch {
        message.error('删除失败')
      }
    }
  })
}

async function handleRefresh(item: Subscription): Promise<void> {
  try {
    await store.refresh(item.id)
    message.success('更新完成')
  } catch {
    message.error('更新失败')
  }
}

async function handleRefreshAll(): Promise<void> {
  try {
    await store.refreshAll()
    message.success('已开始更新全部')
  } catch {
    message.error('更新失败')
  }
}

const columns = computed<DataTableColumns<Subscription>>(() => [
  { title: '名称', key: 'name' },
  { title: 'URL', key: 'url', ellipsis: { tooltip: true } },
  { title: '节点数', key: 'proxyCount', width: 80, align: 'center' },
  { title: '更新时间', key: 'updatedAt', width: 170, render: (row) => formatTime(row.updatedAt) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const config = statusConfig[row.status] ?? { label: row.status, type: 'default' as const }
      return h(NTag, { type: config.type, size: 'small', round: true }, { default: () => config.label })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h(NSpace, { size: 4 }, () => [
        h(NButton, { size: 'tiny', onClick: () => handleRefresh(row) }, { default: () => '更新' }),
        h(NButton, { size: 'tiny', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'tiny', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' })
      ])
  }
])
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-[#E6E8EC]">订阅</h1>
      <NSpace>
        <NButton @click="handleRefreshAll">更新全部</NButton>
        <NButton type="primary" @click="openAdd">新增订阅</NButton>
      </NSpace>
    </div>

    <div class="card p-2">
      <NDataTable
        :columns="columns"
        :data="store.items"
        :loading="store.loading"
        :bordered="false"
        :row-key="(row: Subscription) => row.id"
      />
    </div>

    <SubscriptionFormModal v-model:show="showForm" :editing="editing" @submit="handleSubmit" />
  </div>
</template>
