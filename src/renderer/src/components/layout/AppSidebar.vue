<script setup lang="ts">
import { computed, h, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NMenu, type MenuOption } from 'naive-ui'
import { menuItems } from '@/config/menu'
import { User } from '@vicons/tabler'

const route = useRoute()
const router = useRouter()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const options = computed<MenuOption[]>(() =>
  menuItems.map((item) => ({
    label: item.label,
    key: item.key,
    icon: renderIcon(item.icon)
  }))
)

const activeKey = computed(() => menuItems.find((item) => item.path === route.path)?.key ?? 'dashboard')

function handleSelect(key: string): void {
  const item = menuItems.find((entry) => entry.key === key)
  if (item) void router.push(item.path)
}
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col border-r border-line bg-card/40">
    <div class="flex items-center gap-3 px-5 py-6">
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/40">
        <NIcon :size="24">
          <User />
        </NIcon>
      </div>
      <div class="leading-tight">
        <div class="text-sm font-semibold text-[#E6E8EC]">Mihomo Client</div>
        <div class="text-xs text-muted">现代化代理客户端</div>
      </div>
    </div>

    <NMenu
      class="flex-1 px-3"
      :value="activeKey"
      :options="options"
      :indent="16"
      @update:value="handleSelect"
    />

    <div class="px-5 py-4 text-xs text-muted">v0.1.0</div>
  </aside>
</template>
