<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** ISO 3166-1 alpha-2 小写代码，如 us；为空时显示地球占位图标 */
    code?: string | null
    /** 悬浮提示，一般传中文国家名 */
    label?: string
    /** 高度，数字按 px 处理，宽度按 4:3 自动换算 */
    size?: number | string
  }>(),
  { code: null, label: '', size: 16 }
)

const hasFlag = computed(() => !!props.code && /^[a-z]{2}$/.test(props.code))
const style = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size
}))
</script>

<template>
  <span
    v-if="hasFlag"
    class="fi node-flag"
    :class="`fi-${code}`"
    :style="style"
    :title="label || ''"
  />
  <span v-else class="node-flag node-flag--empty" :style="style" :title="label || '未知地区'">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 2.8 2.7 15.2 0 18M12 3c-2.7 2.8-2.7 15.2 0 18" />
    </svg>
  </span>
</template>

<style scoped>
.node-flag {
  display: inline-block;
  box-sizing: border-box;
  flex: none;
  width: 1.3333em;
  height: 1em;
  line-height: 1em;
  border-radius: 3px;
  overflow: hidden;
  vertical-align: -0.15em;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.node-flag--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8a8f9c;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.node-flag--empty svg {
  width: 1em;
  height: 1em;
}
</style>
