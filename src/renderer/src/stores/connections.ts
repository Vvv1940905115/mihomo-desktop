import { defineStore } from 'pinia'
import { ref } from 'vue'
import { closeConnection, getConnections } from '@/api/connections'
import type { Connection } from '@/api/connections'

export interface ConnectionWithSpeed extends Connection {
  upSpeed: number
  downSpeed: number
}

interface PrevSnapshot {
  up: number
  down: number
}

export const useConnectionsStore = defineStore('connections', () => {
  const connections = ref<ConnectionWithSpeed[]>([])
  const downloadTotal = ref(0)
  const uploadTotal = ref(0)
  const loading = ref(false)

  let prev = new Map<string, PrevSnapshot>()

  async function load(): Promise<void> {
    loading.value = true
    try {
      const data = await getConnections()
      downloadTotal.value = data.downloadTotal
      uploadTotal.value = data.uploadTotal

      const next = new Map<string, PrevSnapshot>()
      connections.value = (data.connections ?? []).map((connection) => {
        const before = prev.get(connection.id)
        next.set(connection.id, { up: connection.upload, down: connection.download })
        return {
          ...connection,
          upSpeed: before ? Math.max(0, connection.upload - before.up) : 0,
          downSpeed: before ? Math.max(0, connection.download - before.down) : 0
        }
      })
      prev = next
    } finally {
      loading.value = false
    }
  }

  async function close(id: string): Promise<void> {
    await closeConnection(id)
    connections.value = connections.value.filter((connection) => connection.id !== id)
  }

  return { connections, downloadTotal, uploadTotal, loading, load, close }
})
