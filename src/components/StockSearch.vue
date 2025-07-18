<template>
  <StockSearchInput
    ref="stockSearchInputRef"
    v-bind="$attrs"
    @select="$emit('select', $event)"
    @clear="$emit('clear')"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @search="$emit('search', $event)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StockSearchInput from './StockSearchInput.vue'
import type { Stock } from '@/types/stock'

// 重新定义事件以保持向后兼容
defineEmits<{
  select: [stock: Stock]
  clear: []
  focus: []
  blur: []
  search: [query: string]
}>()

// 暴露 StockSearchInput 的方法
const stockSearchInputRef = ref<InstanceType<typeof StockSearchInput>>()

defineExpose({
  focus: () => stockSearchInputRef.value?.focus(),
  blur: () => stockSearchInputRef.value?.blur(),
  clear: () => stockSearchInputRef.value?.clear(),
  search: (query: string) => stockSearchInputRef.value?.search(query),
  setValue: (stock: Stock | null) => {
    // 为了向后兼容，保留 setValue 方法
    if (stock) {
      // 这里可以设置初始值，但新组件通过 props 处理
      console.log('setValue called with:', stock)
    } else {
      stockSearchInputRef.value?.clear()
    }
  }
})
</script>

<script lang="ts">
export default {
  name: 'StockSearch',
  inheritAttrs: false
}
</script>
