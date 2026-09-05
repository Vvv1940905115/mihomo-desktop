<script setup lang="ts">
import { NRadioButton, NRadioGroup } from 'naive-ui'
import type { ProxyMode } from '@/api/types'

interface ModeOption {
  label: string
  value: ProxyMode
}

const options: ModeOption[] = [
  { label: '规则', value: 'rule' },
  { label: '全局', value: 'global' },
  { label: '直连', value: 'direct' }
]

defineProps<{
  modelValue: ProxyMode
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ProxyMode): void
}>()
</script>

<template>
  <div class="card p-5">
    <div class="mb-3 text-sm font-medium text-[#E6E8EC]">出站模式</div>
    <NRadioGroup
      :value="modelValue"
      :disabled="loading"
      @update:value="emit('update:modelValue', $event as ProxyMode)"
    >
      <NRadioButton v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </NRadioButton>
    </NRadioGroup>
  </div>
</template>
