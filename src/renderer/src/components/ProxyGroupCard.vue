<script setup lang="ts">
import { NTag } from 'naive-ui'
import type { ProxyGroup } from '@/stores/proxies'

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
      <span class="shrink-0 text-xs text-muted">当前：{{ group.now }}</span>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="node in group.all"
        :key="node"
        type="button"
        :disabled="selecting === node"
        class="rounded-full border px-3 py-1 text-xs transition-all duration-300 disabled:opacity-50"
        :class="
          node === group.now
            ? 'border-accent bg-accent/15 text-accent'
            : 'border-line text-[#B7BCC6] hover:scale-105 hover:border-accent/60 hover:text-accent'
        "
        @click="emit('select', node)"
      >
        {{ node }}
      </button>
    </div>
  </div>
</template>
