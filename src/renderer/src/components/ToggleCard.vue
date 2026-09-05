<script setup lang="ts">
import { NSwitch } from 'naive-ui'

defineProps<{
  title: string
  description?: string
  modelValue: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <div class="card p-5">
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <div class="text-sm font-medium text-[#E6E8EC]">{{ title }}</div>
        <div v-if="description" class="mt-1 text-xs text-muted">{{ description }}</div>
      </div>
      <NSwitch
        :value="modelValue"
        :loading="loading"
        @update:value="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>
