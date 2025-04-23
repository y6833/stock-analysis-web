<template>
  <div class="market-heatmap-view">
    <div class="header-section">
      <h1>大盘云图</h1>
      <div class="controls">
        <button @click="refreshHeatmap" class="refresh-btn">
          <span class="refresh-icon">↻</span> 刷新云图
        </button>
        <button @click="toggleFullscreen" class="fullscreen-btn">
          <span class="fullscreen-icon">⛶</span> {{ isFullscreen ? '退出全屏' : '全屏模式' }}
        </button>
      </div>
    </div>

    <div class="heatmap-container" ref="heatmapContainer" :class="{ 'fullscreen': isFullscreen }">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>正在加载大盘云图...</p>
      </div>
      <iframe
        ref="heatmapIframe"
        src="https://dapanyuntu.com/"
        frameborder="0"
        class="heatmap-iframe"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerpolicy="no-referrer"
        allow="fullscreen"
        @load="handleIframeLoad"
      ></iframe>
    </div>

    <div class="description" v-if="!isFullscreen">
      <h3>关于大盘云图</h3>
      <p>大盘云图是一种直观展示市场整体情况的可视化工具，通过颜色和大小来表示不同板块和个股的表现。</p>
      <p>红色表示上涨，绿色表示下跌，颜色越深表示涨跌幅越大，方块大小表示市值大小。</p>
      <p>通过大盘云图，您可以快速了解：</p>
      <ul>
        <li>市场整体热度和方向</li>
        <li>各行业板块的表现对比</li>
        <li>资金流向和市场情绪</li>
        <li>龙头股和热点板块</li>
      </ul>

      <div class="tips">
        <h4>使用技巧</h4>
        <ul>
          <li>点击云图中的板块可以查看该板块的详细信息</li>
          <li>使用上方的分类选项可以切换不同的分类方式</li>
          <li>可以点击“全屏模式”按钮获得更好的浏览体验</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 状态
const isLoading = ref(true)
const isFullscreen = ref(false)
const heatmapContainer = ref<HTMLElement | null>(null)
const heatmapIframe = ref<HTMLIFrameElement | null>(null)

// 处理 iframe 加载完成
const handleIframeLoad = () => {
  isLoading.value = false
}

// 刷新云图
const refreshHeatmap = () => {
  if (heatmapIframe.value) {
    isLoading.value = true
    heatmapIframe.value.src = heatmapIframe.value.src
  }
}

// 切换全屏模式
const toggleFullscreen = async () => {
  isFullscreen.value = !isFullscreen.value

  // 如果是全屏模式，滚动到顶部并尝试请求浏览器全屏
  if (isFullscreen.value && heatmapContainer.value) {
    heatmapContainer.value.scrollIntoView({ behavior: 'smooth' })

    // 尝试请求浏览器全屏 API
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        await heatmapContainer.value.requestFullscreen()
      }
    } catch (error) {
      console.error('请求全屏模式失败:', error)
      // 如果浏览器全屏 API 失败，仍然使用我们的自定义全屏模式
    }
  } else {
    // 退出全屏模式
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(error => {
        console.error('退出全屏模式失败:', error)
      })
    }
  }
}

// 监听 ESC 键退出全屏
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

// 监听浏览器全屏状态变化
const handleFullscreenChange = () => {
  // 如果浏览器退出了全屏模式，也需要更新我们的应用状态
  if (!document.fullscreenElement && isFullscreen.value) {
    isFullscreen.value = false
  }
}

// 挂载时添加事件监听
onMounted(() => {
  // 键盘事件监听
  document.addEventListener('keydown', handleKeyDown)

  // 浏览器全屏状态变化监听
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange) // Safari
  document.addEventListener('mozfullscreenchange', handleFullscreenChange) // Firefox
  document.addEventListener('MSFullscreenChange', handleFullscreenChange) // IE/Edge
})

// 卸载时移除事件监听
onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)

  // 移除浏览器全屏状态变化监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
})
</script>

<style scoped>
.market-heatmap-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--spacing-lg) 0;
}

h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: var(--spacing-sm);
}

button {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  transition: all var(--transition-fast);
}

.refresh-btn {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.refresh-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

.fullscreen-btn {
  background-color: var(--accent-color);
  color: white;
}

.fullscreen-btn:hover {
  background-color: var(--accent-dark);
}

.refresh-icon, .fullscreen-icon {
  font-size: 1.2rem;
}

.heatmap-container {
  position: relative;
  width: 100%;
  height: 650px;
  margin-bottom: var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  background-color: var(--bg-primary);
}

.heatmap-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  border-radius: 0;
  margin: 0;
  border: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.heatmap-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.description {
  background-color: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  margin-top: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.description h3 {
  margin-top: 0;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-lg);
  font-weight: 600;
  padding-bottom: var(--spacing-xs);
  border-bottom: 2px solid var(--accent-light);
}

.description h4 {
  color: var(--primary-color);
  margin: var(--spacing-lg) 0 var(--spacing-sm);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.description p {
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
  color: var(--text-secondary);
}

.description ul {
  padding-left: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.description li {
  margin-bottom: var(--spacing-sm);
  line-height: 1.5;
  color: var(--text-primary);
}

.tips {
  background-color: rgba(66, 185, 131, 0.1);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-lg);
  border-left: 4px solid var(--accent-color);
}

.tips h4 {
  margin-top: 0;
  color: var(--accent-dark);
  border-bottom: none;
  padding-bottom: 0;
}

.tips ul {
  margin-bottom: 0;
}
</style>
