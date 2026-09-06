<script setup lang="ts">
import { computed, h, ref, type Component } from 'vue'
import {
  NButton,
  NDropdown,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NSpin,
  NSwitch,
  NTag,
  useMessage,
  type DropdownOption
} from 'naive-ui'
import {
  Activity,
  Check,
  DotsVertical,
  Refresh,
  Search,
  SortAscending,
  Trash,
  X
} from '@vicons/tabler'
import CountryFlag from '@/components/CountryFlag.vue'
import { usePolling } from '@/hooks/usePolling'
import { getProxyRaw, type ProxyInfo } from '@/api/proxies'
import { DELAY_GOOD_MS, DELAY_MEDIUM_MS, useProxiesStore } from '@/stores/proxies'
import type { ProxyGroup } from '@/stores/proxies'
import { parseProxyName } from '@/utils/flag'

const proxiesStore = useProxiesStore()
const message = useMessage()

const search = ref('')
const sortByDelay = ref(false)
const selectingNode = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailName = ref('')
const detailInfo = ref<ProxyInfo | null>(null)

usePolling(() => proxiesStore.load(), 3000)

// 当前配置只生成手动选择组（PROXY，Mihomo 类型为 Selector），订阅节点都挂在这里。
const currentGroup = computed<ProxyGroup | undefined>(() => {
  return (
    proxiesStore.groups.find((group) => group.name === 'PROXY' && group.type === 'Selector') ??
    proxiesStore.groups.find((group) => group.type === 'Selector')
  )
})

const nodes = computed<string[]>(() => currentGroup.value?.all ?? [])

function delayValue(node: string): number {
  const result = proxiesStore.delays[node]
  return result?.status === 'ok' ? result.delay : Number.POSITIVE_INFINITY
}

const filteredNodes = computed<string[]>(() => {
  const keyword = search.value.trim().toLowerCase()
  let list = nodes.value
  if (keyword) {
    list = list.filter((node) => {
      const info = parseProxyName(node)
      return node.toLowerCase().includes(keyword) || info.name.toLowerCase().includes(keyword)
    })
  }
  if (sortByDelay.value) {
    list = [...list].sort((a, b) => delayValue(a) - delayValue(b))
  }
  return list
})

function protocolOf(node: string): string {
  return proxiesStore.proxies[node]?.type ?? '—'
}

function delayText(node: string): string {
  const result = proxiesStore.delays[node]
  if (!result) return ''
  if (result.status === 'timeout') return '超时'
  if (result.status === 'error') return '失败'
  return `${result.delay}ms`
}

function delayClass(node: string): string {
  const result = proxiesStore.delays[node]
  if (!result) return ''
  if (result.status !== 'ok') return 'text-red-500'
  if (result.delay < DELAY_GOOD_MS) return 'text-green-500'
  if (result.delay < DELAY_MEDIUM_MS) return 'text-yellow-500'
  return 'text-red-500'
}

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: sortByDelay.value ? '取消按延迟排序' : '按延迟排序',
    key: 'sort',
    icon: renderIcon(SortAscending)
  },
  { label: '清除延迟结果', key: 'clear', icon: renderIcon(Trash) }
])

function handleMoreSelect(key: string): void {
  if (key === 'sort') {
    sortByDelay.value = !sortByDelay.value
  } else if (key === 'clear') {
    proxiesStore.clearDelays()
  }
}

async function handleRefresh(): Promise<void> {
  await proxiesStore.load()
}

async function handleSelect(node: string): Promise<void> {
  const group = currentGroup.value
  if (!group || selectingNode.value) return
  selectingNode.value = node
  try {
    await proxiesStore.select(group.name, node)
    message.success(`已切换到 ${parseProxyName(node).name}`)
  } catch {
    message.error('切换节点失败')
  } finally {
    selectingNode.value = ''
  }
}

function handleTestDelay(): void {
  if (!nodes.value.length) {
    message.warning('当前模式下没有节点可测速')
    return
  }
  void proxiesStore.testDelays(nodes.value)
}

interface DetailEntry {
  key: string
  label: string
  boolean: boolean
  scalar: boolean
  text: string
  switchValue: boolean
}

const FIELD_LABELS: Record<string, string> = {
  name: '别名',
  type: '类型',
  remarks: '别名',
  address: '地址',
  server: '地址',
  port: '端口',
  id: '用户ID',
  uuid: '用户ID',
  alterId: '额外ID',
  security: '加密方式',
  cipher: '加密方式',
  password: '密码',
  mux: 'Mux 多路复用',
  transport: '底层传输方式',
  network: '传输协议',
  raw: 'raw 伪装类型',
  finalmask: 'Finalmask',
  tls: '传输层安全TLS',
  sni: 'SNI',
  servername: '服务器名称',
  'skip-cert-verify': '跳过证书校验',
  'client-fingerprint': '客户端指纹',
  alpn: 'ALPN',
  flow: '流控',
  udp: 'UDP',
  obfs: '混淆',
  'obfs-param': '混淆参数',
  protocol: '协议',
  now: '当前选中',
  all: '可选节点',
  alive: '存活',
  'dialer-proxy': '拨号代理',
  interface: '接口',
  mptcp: 'MPTCP',
  'provider-name': '提供者名称',
  'routing-mark': '路由标记',
  smux: 'Smux',
  tfo: 'TCP Fast Open',
  uot: 'UDP over TCP',
  xudp: 'XUDP',
  'ws-opts': 'WebSocket 选项',
  'grpc-opts': 'gRPC 选项',
  'http-opts': 'HTTP 选项',
  'h2-opts': 'HTTP/2 选项',
  'reality-opts': 'Reality 选项'
}

const HIDDEN_DETAIL_KEYS = new Set(['history', 'extra'])

const detailEntries = computed<DetailEntry[]>(() => {
  if (!detailInfo.value) return []
  return Object.entries(detailInfo.value)
    .filter(([key]) => !HIDDEN_DETAIL_KEYS.has(key))
    .map(([key, value]) => {
      const boolean = typeof value === 'boolean'
      const scalar = value === null || typeof value === 'string' || typeof value === 'number'
      const text = scalar ? (value === null ? '—' : String(value)) : JSON.stringify(value, null, 2)
      return {
        key,
        label: FIELD_LABELS[key] ?? key,
        boolean,
        scalar,
        text,
        switchValue: boolean ? (value as boolean) : false
      }
    })
})

function handleCardClick(node: string): void {
  void handleSelect(node)
  void handleShowDetail(node)
}

async function handleShowDetail(node: string): Promise<void> {
  if (detailLoading.value) return
  detailName.value = node
  detailVisible.value = true
  detailLoading.value = true
  detailInfo.value = null
  try {
    detailInfo.value = await getProxyRaw(node)
  } catch {
    message.error('获取节点详情失败')
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-6">
    <div class="flex items-center gap-4">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <span class="truncate text-sm font-semibold text-[#E6E8EC]">
          {{ currentGroup?.name || '代理组' }}
        </span>
        <NTag v-if="currentGroup" size="small" round :bordered="false">
          {{ currentGroup.type }}
        </NTag>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <NInput
          v-model:value="search"
          size="small"
          clearable
          placeholder="搜索节点"
          style="width: 180px"
        >
          <template #prefix>
            <NIcon :size="14"><Search /></NIcon>
          </template>
        </NInput>
        <NButton
          size="small"
          quaternary
          circle
          :loading="proxiesStore.loading"
          title="刷新"
          @click="handleRefresh"
        >
          <template #icon><NIcon :size="15"><Refresh /></NIcon></template>
        </NButton>
        <NDropdown :options="moreOptions" trigger="click" @select="handleMoreSelect">
          <NButton size="small" quaternary circle title="更多">
            <template #icon><NIcon :size="15"><DotsVertical /></NIcon></template>
          </NButton>
        </NDropdown>
      </div>
    </div>

    <div class="min-h-0 flex-1">
      <NSpin :show="proxiesStore.loading && nodes.length === 0" class="h-full">
        <div class="h-full overflow-y-auto pr-1">
          <div v-if="filteredNodes.length" class="node-grid">
            <button
              v-for="node in filteredNodes"
              :key="node"
              type="button"
              :disabled="selectingNode === node"
              class="flex flex-col gap-2 rounded-card border p-3 text-left transition-all duration-300 disabled:opacity-50"
              :class="
                node === currentGroup?.now
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-card hover:border-accent/60'
              "
              @click="handleCardClick(node)"
            >
              <div class="flex items-center gap-3">
                <CountryFlag
                  v-if="parseProxyName(node).code"
                  :code="parseProxyName(node).code"
                  :label="parseProxyName(node).label"
                  :size="24"
                  class="shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="truncate text-sm font-medium text-[#E6E8EC]"
                      :title="parseProxyName(node).name"
                    >
                      {{ parseProxyName(node).name }}
                    </span>
                    <span v-if="node === currentGroup?.now" class="shrink-0 text-accent">
                      <NIcon :size="14"><Check /></NIcon>
                    </span>
                  </div>

                  <div class="mt-1 flex items-center justify-between gap-2">
                    <NTag size="tiny" round :bordered="false">{{ protocolOf(node) }}</NTag>
                    <span class="text-xs" :class="delayClass(node) || 'text-muted'">
                      {{ delayText(node) || '—' }}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
          <NEmpty
            v-else
            class="py-10"
            :description="nodes.length ? '没有匹配的节点' : '该模式下暂无节点'"
          />
        </div>
      </NSpin>
    </div>

    <div class="shrink-0">
      <NButton block secondary :loading="proxiesStore.testingDelay" @click="handleTestDelay">
        <template #icon><NIcon :size="15"><Activity /></NIcon></template>
        延迟测速
      </NButton>
    </div>

    <NModal
      v-model:show="detailVisible"
      preset="card"
      :title="detailName"
      class="node-detail-modal"
      :style="{ width: '600px', maxWidth: '94vw' }"
    >
      <template #header-extra>
        <NButton size="small" quaternary circle title="关闭" @click="detailVisible = false">
          <template #icon><NIcon :size="15"><X /></NIcon></template>
        </NButton>
      </template>

      <NSpin :show="detailLoading">
        <div class="detail-body">
          <template v-if="detailInfo">
            <div v-for="entry in detailEntries" :key="entry.key" class="detail-row">
              <span class="detail-label">{{ entry.label }}</span>
              <div class="detail-value">
                <NSwitch v-if="entry.boolean" :value="entry.switchValue" size="small" disabled />
                <span v-else-if="entry.scalar" class="detail-text">{{ entry.text }}</span>
                <pre v-else class="detail-json">{{ entry.text }}</pre>
              </div>
            </div>
          </template>
          <NEmpty v-else-if="!detailLoading" description="暂无数据" />
        </div>
      </NSpin>
    </NModal>
  </div>
</template>

<style scoped>
.node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 0.75rem;
}

.detail-body {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #3a3e48;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  flex: 0 0 128px;
  color: #8a8f9c;
  font-size: 13px;
  line-height: 22px;
  word-break: break-all;
}

.detail-value {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.detail-text {
  color: #e6e8ec;
  font-size: 13px;
  line-height: 22px;
  word-break: break-all;
  text-align: right;
  white-space: pre-wrap;
}

.detail-json {
  margin: 0;
  flex: 1;
  max-height: 220px;
  overflow: auto;
  padding: 8px 10px;
  border-radius: 8px;
  background: #1f2025;
  color: #b7bcc6;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
