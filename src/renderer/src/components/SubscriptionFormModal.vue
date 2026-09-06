<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
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

type InputKind = 'remote' | 'node' | 'nodes' | 'unknown'

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

const detectedKind = computed<InputKind>(() => detectInput(form.url))

const kindHint = computed(() => {
  switch (detectedKind.value) {
    case 'remote':
      return '已识别：订阅链接'
    case 'node':
      return '已识别：单节点'
    case 'nodes':
      return '已识别：Base64 订阅'
    default:
      return ''
  }
})

function handlePaste(event: ClipboardEvent): void {
  const text = event.clipboardData?.getData('text')?.trim()
  if (!text) return

  const kind = detectInput(text)
  if (kind === 'unknown') return

  event.preventDefault()
  form.url = text
  if (!form.name && kind === 'node') {
    form.name = extractNodeName(text)
  }
}

function handleSubmit(): void {
  if (!form.name || !form.url) return
  emit('submit', { name: form.name, url: form.url })
}

function detectInput(text: string): InputKind {
  const value = text.trim()
  if (!value) return 'unknown'
  if (/^https?:\/\//i.test(value)) return 'remote'
  if (/^(vmess|vless|trojan|ss):\/\//i.test(value)) return 'node'
  if (isBase64(value)) return 'nodes'
  return 'unknown'
}

function isBase64(text: string): boolean {
  const compact = text.replace(/\s+/g, '')
  if (compact.length < 40 || compact.length % 4 === 1) return false
  return /^[A-Za-z0-9+/=\-_]+$/.test(compact)
}

function decodeBase64(text: string): string {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function extractNodeName(input: string): string {
  const value = input.trim()

  if (value.toLowerCase().startsWith('vmess://')) {
    try {
      const payload = value.slice('vmess://'.length)
      const decoded = JSON.parse(decodeBase64(payload))
      const name = decoded.ps ?? decoded.name ?? ''
      return typeof name === 'string' ? name : ''
    } catch {
      return ''
    }
  }

  try {
    const url = new URL(value)
    if (url.hash) {
      return decodeURIComponent(url.hash.slice(1))
    }
  } catch {
    // 非标准 URI 或没有节点名称时忽略。
  }
  return ''
}
</script>

<template>
  <NModal :show="show" :mask-closable="false" @update:show="emit('update:show', $event)">
    <div class="card w-[480px] max-w-[90vw] p-6" @paste.capture="handlePaste">
      <div class="mb-4 text-base font-semibold text-[#E6E8EC]">
        {{ editing ? '编辑订阅' : '新增订阅' }}
      </div>

      <NForm>
        <NFormItem label="名称">
          <NInput v-model:value="form.name" placeholder="请输入订阅名称" />
        </NFormItem>
        <NFormItem label="订阅链接 / 节点">
          <NInput v-model:value="form.url" placeholder="粘贴订阅链接或节点链接（Ctrl+V）" />
        </NFormItem>
        <div v-if="kindHint" class="text-xs text-[#6B7280]">{{ kindHint }}</div>
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
