<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <div 
      class="virtual-scroll-spacer"
      :style="{ height: totalHeight + 'px' }"
    >
      <div 
        class="virtual-scroll-content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item, startIndex + index)"
          class="virtual-scroll-item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot 
            :item="item" 
            :index="startIndex + index"
            :isVisible="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Props
interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
  overscan?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5,
  keyField: 'id'
})

// Emits
const emit = defineEmits<{
  'scroll': [scrollTop: number]
  'visible-range-change': [startIndex: number, endIndex: number]
}>()

// 状态
const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const isScrolling = ref(false)
const scrollTimeout = ref<number | null>(null)

// 计算属性
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

const visibleCount = computed(() => {
  return Math.ceil(props.containerHeight / props.itemHeight)
})

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, index - props.overscan)
})

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value + props.overscan * 2
  return Math.min(props.items.length - 1, index)
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
})

const offsetY = computed(() => {
  return startIndex.value * props.itemHeight
})

// 方法
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  
  isScrolling.value = true
  
  // 清除之前的定时器
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
  
  // 设置滚动结束定时器
  scrollTimeout.value = setTimeout(() => {
    isScrolling.value = false
  }, 150) as unknown as number
  
  emit('scroll', scrollTop.value)
  emit('visible-range-change', startIndex.value, endIndex.value)
}

const getItemKey = (item: any, index: number): string | number => {
  if (props.keyField && item[props.keyField] !== undefined) {
    return item[props.keyField]
  }
  return index
}

const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (!containerRef.value) return
  
  const targetScrollTop = index * props.itemHeight
  containerRef.value.scrollTo({
    top: targetScrollTop,
    behavior
  })
}

const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(props.items.length - 1, behavior)
}

const getScrollInfo = () => {
  return {
    scrollTop: scrollTop.value,
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    visibleCount: visibleCount.value,
    totalHeight: totalHeight.value,
    isScrolling: isScrolling.value
  }
}

// 监听数据变化
watch(() => props.items.length, () => {
  // 如果数据长度变化，重新计算滚动位置
  nextTick(() => {
    if (containerRef.value) {
      const maxScrollTop = Math.max(0, totalHeight.value - props.containerHeight)
      if (scrollTop.value > maxScrollTop) {
        containerRef.value.scrollTop = maxScrollTop
      }
    }
  })
})

// 暴露方法给父组件
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  getScrollInfo
})

// 生命周期
onMounted(() => {
  // 初始化滚动位置
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
})

onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
})
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  width: 100%;
}

.virtual-scroll-spacer {
  position: relative;
  width: 100%;
}

.virtual-scroll-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.virtual-scroll-item {
  width: 100%;
  overflow: hidden;
}

/* 滚动条样式 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background-color var(--transition-fast);
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 滚动性能优化 */
.virtual-scroll-container {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* 减少重绘 */
.virtual-scroll-content {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .virtual-scroll-container::-webkit-scrollbar {
    width: 6px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .virtual-scroll-container::-webkit-scrollbar-thumb {
    background: var(--text-primary);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .virtual-scroll-container {
    scroll-behavior: auto;
  }
  
  .virtual-scroll-content {
    transition: none;
  }
}
</style>
