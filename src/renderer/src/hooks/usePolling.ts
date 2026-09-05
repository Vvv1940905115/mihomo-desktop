import { onMounted, onUnmounted } from 'vue'

export interface PollingControls {
  start: () => void
  stop: () => void
}

export function usePolling(fn: () => void, intervalMs: number, immediate = true): PollingControls {
  let timer: number | undefined

  const start = (): void => {
    stop()
    if (immediate) fn()
    timer = window.setInterval(fn, intervalMs)
  }

  const stop = (): void => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  onMounted(start)
  onUnmounted(stop)

  return { start, stop }
}
