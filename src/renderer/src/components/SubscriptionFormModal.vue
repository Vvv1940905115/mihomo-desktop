<script setup lang="ts">
import { reactive, watch } from 'vue'
import { NButton, NForm, NFormItem, NInput, NModal } from 'naive-ui'
import type { Subscription } from '@/api/subscriptions'

const props = defineProps<{
  show: boolean
  editing: Subscription | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', payload: { name: string; url: string }): void
}>()

const form = reactive({ name: '', url: '' })

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      form.name = props.editing?.name ?? ''
      form.url = props.editing?.url ?? ''
    }
  }
)

function handleSubmit(): void {
  if (!form.name || !form.url) return
  emit('submit', { name: form.name, url: form.url })
}
</script>

<template>
  <NModal :show="show" :mask-closable="false" @update:show="emit('update:show', $event)">
    <div class="card w-[480px] max-w-[90vw] p-6">
      <div class="mb-4 text-base font-semibold text-[#E6E8EC]">
        {{ editing ? '编辑订阅' : '新增订阅' }}
      </div>

      <NForm>
        <NFormItem label="名称">
          <NInput v-model:value="form.name" placeholder="请输入订阅名称" />
        </NFormItem>
        <NFormItem label="订阅 URL">
          <NInput v-model:value="form.url" placeholder="https://..." />
        </NFormItem>
      </NForm>

      <div class="mt-4 flex justify-end gap-2">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton type="primary" :disabled="!form.name || !form.url" @click="handleSubmit">
          保存
        </NButton>
      </div>
    </div>
  </NModal>
</template>
