import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  addSubscription,
  deleteSubscription,
  getSubscriptions,
  refreshAllSubscriptions,
  refreshSubscription,
  updateSubscription
} from '@/api/subscriptions'
import type { Subscription } from '@/api/subscriptions'

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const items = ref<Subscription[]>([])
  const loading = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    try {
      const data = await getSubscriptions()
      items.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function add(name: string, url: string): Promise<void> {
    await addSubscription(name, url)
    await load()
  }

  async function update(id: string, name: string, url: string): Promise<void> {
    await updateSubscription(id, name, url)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await deleteSubscription(id)
    await load()
  }

  async function refresh(id: string): Promise<void> {
    await refreshSubscription(id)
    await load()
  }

  async function refreshAll(): Promise<void> {
    await refreshAllSubscriptions()
    window.setTimeout(() => void load(), 1500)
  }

  return { items, loading, load, add, update, remove, refresh, refreshAll }
})
