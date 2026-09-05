<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { formatSpeed } from '@/utils/format'

use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface HistoryPoint {
  time: number
  up: number
  down: number
}

const props = defineProps<{
  history: HistoryPoint[]
}>()

const option = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  grid: { left: 8, right: 8, top: 28, bottom: 4, containLabel: true },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value) => formatSpeed(Number(value))
  },
  legend: {
    data: ['上传', '下载'],
    top: 0,
    right: 0,
    itemWidth: 12,
    itemHeight: 8,
    textStyle: { color: '#8A8F9C', fontSize: 11 }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.history.map((point) =>
      new Date(point.time).toLocaleTimeString('zh-CN', { hour12: false })
    ),
    axisLine: { lineStyle: { color: '#3A3E48' } },
    axisLabel: { color: '#8A8F9C', fontSize: 10 },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#3A3E48' } },
    axisLabel: {
      color: '#8A8F9C',
      fontSize: 10,
      formatter: (value: number | string) => formatSpeed(Number(value))
    }
  },
  series: [
    {
      name: '上传',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: props.history.map((point) => point.up),
      lineStyle: { color: '#55E6C1', width: 2 },
      areaStyle: { color: 'rgba(85, 230, 193, 0.12)' }
    },
    {
      name: '下载',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: props.history.map((point) => point.down),
      lineStyle: { color: '#7C8CFF', width: 2 },
      areaStyle: { color: 'rgba(124, 140, 255, 0.12)' }
    }
  ]
}))
</script>

<template>
  <VChart class="h-40 w-full" :option="option" autoresize />
</template>
