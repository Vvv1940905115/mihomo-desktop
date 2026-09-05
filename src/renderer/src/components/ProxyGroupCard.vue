<script setup lang="ts">
import { NTag } from 'naive-ui'
import { useProxiesStore } from '@/stores/proxies'
import type { ProxyGroup } from '@/stores/proxies'
import CountryFlag from '@/components/CountryFlag.vue'
import { parseProxyName } from '@/utils/flag'

const proxiesStore = useProxiesStore()

defineProps<{
  group: ProxyGroup
  selecting?: string
}>()

const emit = defineEmits<{
  (e: 'select', node: string): void
}>()
</script>

<template>
  <div class="card p-5">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-semibold text-[#E6E8EC]">{{ group.name }}</span>
        <NTag size="small" round :bordered="false">{{ group.type }}</NTag>
      </div>
      <span class="flex shrink-0 items-center gap-1.5 text-xs text-muted">
        当前：
        <CountryFlag :code="parseProxyName(group.now).code" :label="parseProxyName(group.now).label" :size="13" />
        <span class="max-w-[160px] truncate">{{ parseProxyName(group.now).name || '—' }}</span>
      </span>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="node in group.all"
        :key="node"
        type="button"
        :disabled="selecting === node"
        :title="parseProxyName(node).label || node"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all duration-300 disabled:opacity-50"
        :class="
          node === group.now
            ? 'border-accent bg-accent/15 text-accent'
            : 'border-line text-[#B7BCC6] hover:scale-105 hover:border-accent/60 hover:text-accent'
        "
        @click="emit('select', node)"
      >
        <CountryFlag :code="parseProxyName(node).code" :label="parseProxyName(node).label" :size="14" />
        <span class="max-w-[220px] truncate">{{ parseProxyName(node).name }}</span>
        <span v-if="proxiesStore.delays[node] != null" class="text-muted">
          {{ proxiesStore.delays[node] }}ms
        </span>
      </button>
    </div>
  </div>
</template>
