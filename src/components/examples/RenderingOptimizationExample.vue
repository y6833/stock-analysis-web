<template>
  <div class="rendering-optimization-example">
    <h2>渲染优化示例</h2>

    <div class="section">
      <h3>1. 组件记忆化</h3>
      <div class="control-panel">
        <input v-model="filterText" placeholder="输入股票代码或名称过滤..." class="filter-input" />
        <button @click="randomizeData" class="btn">随机数据</button>
      </div>

      <div class="comparison-container">
        <div class="comparison-column">
          <h4>使用记忆化 (优化后)</h4>
          <div class="timer">渲染时间: {{ memoRenderTime }}ms</div>
          <div class="stock-list">
            <MemoComponent
              :component="StockListComponent"
              :props="{ stocks: filteredStocks, highlight: filterText }"
              :deep="true"
            />
          </div>
        </div>

        <div class="comparison-column">
          <h4>不使用记忆化 (优化前)</h4>
          <div class="timer">渲染时间: {{ normalRenderTime }}ms</div>
          <div class="stock-list">
            <StockListComponent :stocks="filteredStocks" :highlight="filterText" />
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>2. 虚拟滚动</h3>
      <div class="control-panel">
        <span>数据量: {{ largeStockList.length }} 条</span>
        <button @click="toggleVirtualScroll" class="btn">
          {{ virtualScrollEnabled ? '禁用' : '启用' }}虚拟滚动
        </button>
      </div>

      <div class="comparison-container">
        <div class="comparison-column">
          <h4>使用虚拟滚动 (优化后)</h4>
          <div class="timer">
            可见项目: {{ visibleStocks.length }} / {{ largeStockList.length }}
          </div>
          <div
            v-if="virtualScrollEnabled"
            class="stock-list virtual-list"
            v-virtual-scroll="{ items: largeStockList }"
            @virtual-scroll-update="onVirtualScrollUpdate"
          >
            <div v-for="stock in visibleStocks" :key="stock.id" class="stock-item">
              <span class="stock-code">{{ stock.code }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-price" :class="{ up: stock.change > 0, down: stock.change < 0 }">
                {{ stock.price.toFixed(2) }}
              </span>
              <span class="stock-change" :class="{ up: stock.change > 0, down: stock.change < 0 }">
                {{ stock.change > 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>

        <div class="comparison-column">
          <h4>不使用虚拟滚动 (优化前)</h4>
          <div class="timer">渲染项目: {{ largeStockList.length }}</div>
          <div v-if="!virtualScrollEnabled" class="stock-list normal-list">
            <div v-for="stock in largeStockList" :key="stock.id" class="stock-item">
              <span class="stock-code">{{ stock.code }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-price" :class="{ up: stock.change > 0, down: stock.change < 0 }">
                {{ stock.price.toFixed(2) }}
              </span>
              <span class="stock-change" :class="{ up: stock.change > 0, down: stock.change < 0 }">
                {{ stock.change > 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>3. 动画优化</h3>
      <div class="control-panel">
        <button @click="startAnimation" class="btn" :disabled="isAnimating">开始动画</button>
        <button @click="stopAnimation" class="btn" :disabled="!isAnimating">停止动画</button>
        <label>
          <input type="checkbox" v-model="useOptimizedAnimation" />
          使用优化动画
        </label>
      </div>

      <div class="comparison-container">
        <div class="comparison-column">
          <h4>优化动画 (使用 GPU 加速)</h4>
          <div class="animation-container">
            <div
              ref="optimizedElement"
              class="animated-box optimized"
              :style="optimizedAnimationStyle"
            ></div>
          </div>
        </div>

        <div class="comparison-column">
          <h4>普通动画 (无优化)</h4>
          <div class="animation-container">
            <div
              ref="normalElement"
              class="animated-box normal"
              :style="normalAnimationStyle"
            ></div>
          </div>
        </div>
      </div>
      <div class="fps-display">动画帧率: {{ currentFps }} FPS</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, inject, onBeforeUnmount } from 'vue'
import type { AnimationOptimizer } from '@/modules/renderingOptimization/animationOptimizer'

// 股票列表组件
const StockListComponent = defineComponent({
  props: {
    stocks: {
      type: Array,
      required: true,
    },
    highlight: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    // 模拟耗时操作
    const simulateExpensiveOperation = () => {
      const start = performance.now()
      // 强制布局重排
      document.body.offsetHeight
      return performance.now() - start
    }

    // 高亮文本
    const highlightText = (text, highlight) => {
      if (!highlight) return text

      const regex = new RegExp(`(${highlight})`, 'gi')
      return text.replace(regex, '<span class="highlight">$1</span>')
    }

    return {
      simulateExpensiveOperation,
      highlightText,
    }
  },
  render() {
    // 模拟耗时操作
    this.simulateExpensiveOperation()

    return (
      <div class="stock-items">
        {this.stocks.map((stock) => (
          <div key={stock.id} class="stock-item">
            <span
              class="stock-code"
              innerHTML={this.highlightText(stock.code, this.highlight)}
            ></span>
            <span
              class="stock-name"
              innerHTML={this.highlightText(stock.name, this.highlight)}
            ></span>
            <span class={['stock-price', { up: stock.change > 0, down: stock.change < 0 }]}>
              {stock.price.toFixed(2)}
            </span>
            <span class={['stock-change', { up: stock.change > 0, down: stock.change < 0 }]}>
              {stock.change > 0 ? '+' : ''}
              {stock.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    )
  },
})

export default defineComponent({
  components: {
    StockListComponent,
  },
  setup() {
    // 获取动画优化器
    const animationOptimizer = inject<AnimationOptimizer>('animationOptimizer')

    // ===== 组件记忆化示例 =====
    const stockData = ref(generateStockData(100))
    const filterText = ref('')

    // 过滤后的股票数据
    const filteredStocks = computed(() => {
      if (!filterText.value) {
        return stockData.value
      }

      const searchText = filterText.value.toLowerCase()

      return stockData.value.filter(
        (stock) => stock.code.includes(searchText) || stock.name.toLowerCase().includes(searchText)
      )
    })

    // 渲染时间
    const memoRenderTime = ref(0)
    const normalRenderTime = ref(0)

    // 随机化数据
    const randomizeData = () => {
      const startMemo = performance.now()
      stockData.value = generateStockData(100)
      memoRenderTime.value = Math.round(performance.now() - startMemo)

      const startNormal = performance.now()
      // 强制重新渲染非记忆化组件
      stockData.value = [...stockData.value]
      normalRenderTime.value = Math.round(performance.now() - startNormal)
    }

    // ===== 虚拟滚动示例 =====
    const largeStockList = ref(generateStockData(5000))
    const visibleStocks = ref([])
    const virtualScrollEnabled = ref(true)

    // 处理虚拟滚动更新
    const onVirtualScrollUpdate = (event: CustomEvent) => {
      visibleStocks.value = event.detail.visibleItems
    }

    // 切换虚拟滚动
    const toggleVirtualScroll = () => {
      virtualScrollEnabled.value = !virtualScrollEnabled.value
    }

    // ===== 动画优化示例 =====
    const optimizedElement = ref<HTMLElement | null>(null)
    const normalElement = ref<HTMLElement | null>(null)
    const isAnimating = ref(false)
    const useOptimizedAnimation = ref(true)
    const currentFps = ref(0)

    // 动画属性
    const optimizedAnimationStyle = ref({})
    const normalAnimationStyle = ref({})

    // 动画ID
    let animationId: number | null = null

    // FPS计算
    let frameCount = 0
    let lastFpsUpdateTime = 0

    // 开始动画
    const startAnimation = () => {
      if (
        !optimizedElement.value ||
        !normalElement.value ||
        !animationOptimizer ||
        isAnimating.value
      )
        return

      isAnimating.value = true

      // 如果使用优化动画，应用GPU加速
      if (useOptimizedAnimation.value) {
        animationOptimizer.applyGpuAcceleration(optimizedElement.value)
      }

      // 初始位置
      let position = 0
      let direction = 1

      // 重置FPS计数
      frameCount = 0
      lastFpsUpdateTime = performance.now()

      // 创建动画回调
      const animationCallback = useOptimizedAnimation.value
        ? animationOptimizer.throttleAnimation(updateAnimation, 60)
        : updateAnimation

      // 启动动画
      animationId = animationOptimizer.animate(animationCallback)

      // 动画更新函数
      function updateAnimation(timestamp: number) {
        if (!optimizedElement.value || !normalElement.value) return false

        // 更新位置
        position += direction * 3

        // 反弹
        if (position > 300 || position < 0) {
          direction *= -1
        }

        // 更新FPS计数
        frameCount++

        // 每秒更新FPS显示
        if (timestamp - lastFpsUpdateTime >= 1000) {
          currentFps.value = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdateTime))
          frameCount = 0
          lastFpsUpdateTime = timestamp
        }

        if (useOptimizedAnimation.value) {
          // 使用优化的CSS (GPU加速)
          optimizedAnimationStyle.value = animationOptimizer.optimizeCSS({
            transform: `translateX(${position}px)`,
          })

          // 非优化动画使用普通CSS
          normalAnimationStyle.value = {
            left: `${position}px`,
          }
        } else {
          // 两者都使用普通CSS
          optimizedAnimationStyle.value = {
            left: `${position}px`,
          }
          normalAnimationStyle.value = {
            left: `${position}px`,
          }
        }

        // 继续动画
        return isAnimating.value
      }
    }

    // 停止动画
    const stopAnimation = () => {
      if (animationId !== null && animationOptimizer) {
        animationOptimizer.cancelAnimation(animationId)
        animationId = null
        isAnimating.value = false
        currentFps.value = 0
      }
    }

    // 组件卸载前停止动画
    onBeforeUnmount(() => {
      stopAnimation()
    })

    // 生成随机股票数据
    function generateStockData(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        code: `${600000 + i}`,
        name: `股票 ${i}`,
        price: Math.random() * 100,
        change: Math.random() * 10 - 5,
      }))
    }

    return {
      // 组件记忆化
      stockData,
      filterText,
      filteredStocks,
      memoRenderTime,
      normalRenderTime,
      randomizeData,
      StockListComponent,

      // 虚拟滚动
      largeStockList,
      visibleStocks,
      virtualScrollEnabled,
      onVirtualScrollUpdate,
      toggleVirtualScroll,

      // 动画优化
      optimizedElement,
      normalElement,
      isAnimating,
      useOptimizedAnimation,
      optimizedAnimationStyle,
      normalAnimationStyle,
      currentFps,
      startAnimation,
      stopAnimation,
    }
  },
})
</script>

<style scoped>
.rendering-optimization-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: 40px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  background-color: #f9f9f9;
}

h2 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

h3 {
  font-size: 20px;
  margin-bottom: 15px;
  color: #42b883;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

h4 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #666;
}

.control-panel {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex-grow: 1;
  max-width: 300px;
}

.btn {
  padding: 8px 16px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #3aa876;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.comparison-container {
  display: flex;
  gap: 20px;
}

.comparison-column {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background-color: white;
}

.timer {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  padding: 5px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.stock-list {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.stock-item {
  display: flex;
  padding: 10px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.stock-code {
  width: 80px;
  font-weight: bold;
}

.stock-name {
  flex-grow: 1;
}

.stock-price {
  width: 80px;
  text-align: right;
}

.stock-change {
  width: 80px;
  text-align: right;
}

.up {
  color: #f56c6c;
}

.down {
  color: #67c23a;
}

.highlight {
  background-color: #ffeaa7;
  font-weight: bold;
}

.animation-container {
  height: 100px;
  position: relative;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 10px;
  overflow: hidden;
}

.animated-box {
  width: 50px;
  height: 50px;
  position: absolute;
  top: 25px;
  left: 0;
}

.optimized {
  background-color: #42b883;
  border-radius: 4px;
}

.normal {
  background-color: #f56c6c;
  border-radius: 4px;
}

.fps-display {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
}
</style>
