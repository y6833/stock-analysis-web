<template>
  <div class="chart-performance-optimizer">
    <slot :optimizedProps="optimizedProps"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useResizeObserver } from '@/composables/useResizeObserver'

// 组件属性
interface Props {
  // 是否启用虚拟滚动
  virtualScroll?: boolean
  // 可见数据点数量
  visibleRange?: number
  // 是否启用性能优化
  performanceOptimization?: boolean
  // 数据总长度
  dataLength?: number
  // 是否自动检测设备性能
  autoDetectPerformance?: boolean
  // 是否启用增量更新
  incrementalUpdate?: boolean
  // 是否启用WebGL渲染
  webGLRendering?: boolean
  // 是否启用批量渲染
  batchRendering?: boolean
  // 是否启用降采样
  downSampling?: boolean
  // 降采样阈值
  downSampleThreshold?: number
  // 降采样因子
  downSampleFactor?: number
}

const props = withDefaults(defineProps<Props>(), {
  virtualScroll: true,
  visibleRange: 100,
  performanceOptimization: true,
  dataLength: 0,
  autoDetectPerformance: true,
  incrementalUpdate: true,
  webGLRendering: false,
  batchRendering: true,
  downSampling: true,
  downSampleThreshold: 1000,
  downSampleFactor: 2
})

// 事件
const emit = defineEmits<{
  // 性能配置变化
  update: [config: any]
}>()

// 状态
const container = ref<HTMLElement | null>(null)
const devicePerformance = ref<'high' | 'medium' | 'low'>('medium')
const isLowEndDevice = ref(false)
const isMobileDevice = ref(false)
const fps = ref(60)
const lastFrameTime = ref(0)
const frameCount = ref(0)
const isVisible = ref(true)
const visibilityObserver = ref<IntersectionObserver | null>(null)

// 计算属性
const optimizedProps = computed(() => {
  // 根据设备性能和用户设置调整优化参数
  const shouldOptimize = props.performanceOptimization && (props.autoDetectPerformance ? isLowEndDevice.value : true)
  
  return {
    // 虚拟滚动设置
    virtualScroll: props.virtualScroll && (props.dataLength > props.visibleRange),
    visibleRange: isMobileDevice.value ? Math.min(50, props.visibleRange) : props.visibleRange,
    
    // 渲染优化
    useWebGL: props.webGLRendering && !isMobileDevice.value,
    useBatchRendering: props.batchRendering && shouldOptimize,
    useIncrementalUpdate: props.incrementalUpdate,
    
    // 降采样设置
    useDownSampling: props.downSampling && shouldOptimize && props.dataLength > props.downSampleThreshold,
    downSampleFactor: isLowEndDevice.value ? Math.max(props.downSampleFactor, 3) : props.downSampleFactor,
    
    // 其他优化
    throttleRedraw: shouldOptimize ? (isLowEndDevice.value ? 32 : 16) : 0, // 低性能设备使用更高的节流值
    clipOutOfBounds: shouldOptimize,
    lazyUpdate: shouldOptimize,
    useRequestAnimationFrame: !isLowEndDevice.value,
    
    // 设备信息
    devicePerformance: devicePerformance.value,
    isMobileDevice: isMobileDevice.value,
    fps: fps.value,
    isVisible: isVisible.value
  }
})

// 监听属性变化
watch(() => optimizedProps.value, (newProps) => {
  emit('update', newProps)
}, { deep: true })

// 生命周期钩子
onMounted(() => {
  // 获取容器元素
  container.value = document.querySelector('.chart-performance-optimizer')
  
  // 检测设备性能
  detectDevicePerformance()
  
  // 检测是否为移动设备
  detectMobileDevice()
  
  // 监听可见性变化
  setupVisibilityObserver()
  
  // 监听窗口大小变化
  if (container.value) {
    useResizeObserver(container.value, handleResize)
  }
  
  // 开始FPS监测
  requestAnimationFrame(measureFPS)
})

onUnmounted(() => {
  // 清理可见性观察器
  if (visibilityObserver.value) {
    visibilityObserver.value.disconnect()
  }
})

// 方法
function detectDevicePerformance() {
  try {
    // 检测设备性能
    const hardwareConcurrency = navigator.hardwareConcurrency || 2
    const memory = (navigator as any).deviceMemory || 4
    
    // 根据硬件并发和内存判断设备性能
    if (hardwareConcurrency >= 8 && memory >= 8) {
      devicePerformance.value = 'high'
      isLowEndDevice.value = false
    } else if (hardwareConcurrency >= 4 && memory >= 4) {
      devicePerformance.value = 'medium'
      isLowEndDevice.value = false
    } else {
      devicePerformance.value = 'low'
      isLowEndDevice.value = true
    }
    
    // 如果设备支持电池API，检查是否处于省电模式
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.charging === false && battery.level < 0.2) {
          // 电池电量低，降低性能设置
          isLowEndDevice.value = true
        }
      }).catch(() => {
        // 忽略错误
      })
    }
  } catch (error) {
    console.error('Failed to detect device performance:', error)
    // 默认为中等性能
    devicePerformance.value = 'medium'
    isLowEndDevice.value = false
  }
}

function detectMobileDevice() {
  try {
    // 检测是否为移动设备
    const userAgent = navigator.userAgent.toLowerCase()
    isMobileDevice.value = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    
    // 如果是移动设备，降低一些性能设置
    if (isMobileDevice.value) {
      isLowEndDevice.value = true
    }
  } catch (error) {
    console.error('Failed to detect mobile device:', error)
    isMobileDevice.value = false
  }
}

function setupVisibilityObserver() {
  if (!container.value) return
  
  try {
    // 创建交叉观察器
    visibilityObserver.value = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isVisible.value = entry.isIntersecting
      }
    }, {
      threshold: 0.1 // 当10%的元素可见时触发
    })
    
    // 开始观察
    visibilityObserver.value.observe(container.value)
  } catch (error) {
    console.error('Failed to setup visibility observer:', error)
    isVisible.value = true
  }
}

function handleResize() {
  // 窗口大小变化时可以调整一些参数
  // 例如，在小屏幕上减少可见数据点数量
  const width = container.value?.clientWidth || window.innerWidth
  
  if (width < 600) {
    isMobileDevice.value = true
  }
}

function measureFPS(timestamp: number) {
  if (!lastFrameTime.value) {
    lastFrameTime.value = timestamp
    frameCount.value = 0
    requestAnimationFrame(measureFPS)
    return
  }
  
  // 增加帧计数
  frameCount.value++
  
  // 每秒计算一次FPS
  const elapsed = timestamp - lastFrameTime.value
  if (elapsed >= 1000) {
    fps.value = Math.round((frameCount.value * 1000) / elapsed)
    
    // 根据FPS调整性能设置
    if (fps.value < 30) {
      isLowEndDevice.value = true
    }
    
    // 重置计数器
    lastFrameTime.value = timestamp
    frameCount.value = 0
  }
  
  // 继续测量
  requestAnimationFrame(measureFPS)
}

// 暴露方法
defineExpose({
  // 获取优化配置
  getOptimizedProps: () => optimizedProps.value,
  // 手动设置设备性能
  setDevicePerformance: (performance: 'high' | 'medium' | 'low') => {
    devicePerformance.value = performance
    isLowEndDevice.value = performance === 'low'
  }
})
</script>

<style scoped>
.chart-performance-optimizer {
  width: 100%;
  height: 100%;
}
</style>