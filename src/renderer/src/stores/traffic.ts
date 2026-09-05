import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTraffic } from '@/api/traffic'

const MAX_HISTORY = 60
const BASELINE_KEY = 'mihomo-client:traffic-baseline'

interface HistoryPoint {
  time: number
  up: number
  down: number
}

interface Baseline {
  date: string
  up: number
  down: number
}

function todayKey(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function loadBaseline(): Baseline | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY)
    return raw ? (JSON.parse(raw) as Baseline) : null
  } catch {
    return null
  }
}

export const useTrafficStore = defineStore('traffic', () => {
  const up = ref(0)
  const down = ref(0)
  const totalUp = ref(0)
  const totalDown = ref(0)
  const todayUp = ref(0)
  const todayDown = ref(0)
  const history = ref<HistoryPoint[]>([])

  let prevUp = 0
  let prevDown = 0
  let initialized = false

  function load(): void {
    void getTraffic()
      .then((data) => {
        totalUp.value = data.up
        totalDown.value = data.down
        updateToday(data.up, data.down)

        if (initialized) {
          up.value = Math.max(0, data.up - prevUp)
          down.value = Math.max(0, data.down - prevDown)
        }

        prevUp = data.up
        prevDown = data.down
        initialized = true
        pushHistory()
      })
      .catch(() => {
        // 控制面不可达时静默忽略，保持上一帧数据
      })
  }

  function updateToday(upBytes: number, downBytes: number): void {
    const date = todayKey()
    const baseline = loadBaseline()

    if (!baseline || baseline.date !== date) {
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ date, up: upBytes, down: downBytes }))
      todayUp.value = 0
      todayDown.value = 0
      return
    }

    todayUp.value = Math.max(0, upBytes - baseline.up)
    todayDown.value = Math.max(0, downBytes - baseline.down)
  }

  function pushHistory(): void {
    history.value.push({ time: Date.now(), up: up.value, down: down.value })
    if (history.value.length > MAX_HISTORY) history.value.shift()
  }

  return { up, down, totalUp, totalDown, todayUp, todayDown, history, load }
})
