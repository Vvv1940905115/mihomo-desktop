import type { Component } from 'vue'
import { Home, Server, Download, Plug, File, Settings } from '@vicons/tabler'

export interface MenuItemConfig {
  key: string
  label: string
  path: string
  icon: Component
}

export const menuItems: MenuItemConfig[] = [
  { key: 'dashboard', label: '首页', path: '/', icon: Home },
  { key: 'proxies', label: '代理', path: '/proxies', icon: Server },
  { key: 'subscriptions', label: '订阅', path: '/subscriptions', icon: Download },
  { key: 'connections', label: '连接', path: '/connections', icon: Plug },
  { key: 'logs', label: '日志', path: '/logs', icon: File },
  { key: 'settings', label: '设置', path: '/settings', icon: Settings }
]
