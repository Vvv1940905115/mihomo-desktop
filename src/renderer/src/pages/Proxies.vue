<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { Activity } from '@vicons/tabler'
import ProxyGroupCard from '@/components/ProxyGroupCard.vue'
import { usePolling } from '@/hooks/usePolling'
import { useProxiesStore } from '@/stores/proxies'

const proxiesStore = useProxiesStore()
const message = useMessage()

const selectingGroup = ref('')
const selectingNode = ref('')

usePolling(() => proxiesStore.load(), 3000)

async function handleSelect(group: string, node: string): Promise<void> {
  selectingGroup.value = group
  selectingNode.value = node
  try {
    await proxiesStore.select(group, node)
    message.success(`已切换到 ${node}`)
  } catch {
    message.error('切换节点失败')
  } finally {
    selectingGroup.value = ''
    selectingNode.value = ''
  }
}

function handleTestDelay(): void {
  void proxiesStore.testAllDelays()
}
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-[#E6E8EC]">代理</h1>
      <div class="flex items-center gap-3">
        <span class="text-xs text-muted">共 {{ proxiesStore.groups.length }} 个分组</span>
        <NButton
          size="small"
          secondary
          :loading="proxiesStore.testingDelay"
          @click="handleTestDelay"
        >
          <template #icon>
            <NIcon :size="14"><Activity /></NIcon>
          </template>
          延迟测试
        </NButton>
      </div>
    </div>

    <NSpin :show="proxiesStore.loading && proxiesStore.groups.length === 0">
      <div v-if="proxiesStore.groups.length" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProxyGroupCard
          v-for="group in proxiesStore.groups"
          :key="group.name"
          :group="group"
          :selecting="selectingGroup === group.name ? selectingNode : ''"
          @select="handleSelect(group.name, $event)"
        />
      </div>
      <NEmpty v-else description="暂无代理分组，请先在订阅中添加节点" />
    </NSpin>
  </div>
</template>
