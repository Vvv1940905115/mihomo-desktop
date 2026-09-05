<script setup lang="ts">
import type { Component } from 'vue'
import { NIcon } from 'naive-ui'

defineProps<{
  title: string
  value: string | number
  unit?: string
  icon?: Component
}>()
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="truncate text-xs text-muted">{{ title }}</div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="truncate text-2xl font-semibold text-[#E6E8EC]">{{ value }}</span>
          <span v-if="unit" class="text-sm text-muted">{{ unit }}</span>
        </div>
      </div>
      <div
        v-if="icon"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
      >
        <NIcon :size="18">
          <component :is="icon" />
        </NIcon>
      </div>
    </div>
  </div>
</template>
