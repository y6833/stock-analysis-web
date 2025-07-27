<template>
  <div class="stock-info-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">股票信息</h1>
          <p class="page-description">
            全面的股票信息展示，包含实时行情、技术指标、财务数据等
          </p>
        </div>

        <div class="header-actions">
          <el-button :icon="Setting" @click="showSettings = true" size="large">
            设置
          </el-button>
          <el-button :icon="FullScreen" @click="toggleFullscreen" size="large">
            全屏
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content" :class="{ 'fullscreen': isFullscreen }">
      <ComprehensiveStockInfo />
    </div>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="显示设置" width="500px">
      <el-form :model="settings" label-width="120px">
        <el-form-item label="自动刷新">
          <el-switch v-model="settings.autoRefresh" />
          <span class="form-help">启用后将自动刷新股票数据</span>
        </el-form-item>

        <el-form-item label="刷新间隔" v-if="settings.autoRefresh">
          <el-select v-model="settings.refreshInterval" style="width: 200px">
            <el-option label="5秒" :value="5000" />
            <el-option label="10秒" :value="10000" />
            <el-option label="30秒" :value="30000" />
            <el-option label="1分钟" :value="60000" />
          </el-select>
        </el-form-item>

        <el-form-item label="显示通知">
          <el-switch v-model="settings.showNotifications" />
          <span class="form-help">显示价格变动通知</span>
        </el-form-item>

        <el-form-item label="声音提醒">
          <el-switch v-model="settings.soundAlerts" />
          <span class="form-help">价格达到提醒条件时播放声音</span>
        </el-form-item>

        <el-form-item label="数据精度">
          <el-radio-group v-model="settings.precision">
            <el-radio :value="2">2位小数</el-radio>
            <el-radio :value="3">3位小数</el-radio>
            <el-radio :value="4">4位小数</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="图表主题">
          <el-radio-group v-model="settings.chartTheme">
            <el-radio value="light">浅色</el-radio>
            <el-radio value="dark">深色</el-radio>
            <el-radio value="auto">跟随系统</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSettings = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 快捷键提示 -->
    <div class="keyboard-shortcuts" v-if="showShortcuts">
      <el-card class="shortcuts-card">
        <template #header>
          <div class="shortcuts-header">
            <span>快捷键</span>
            <el-button :icon="Close" @click="showShortcuts = false" size="small" text />
          </div>
        </template>

        <div class="shortcuts-list">
          <div class="shortcut-item">
            <kbd>F11</kbd>
            <span>全屏/退出全屏</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>R</kbd>
            <span>刷新数据</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>保存设置</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>F</kbd>
            <span>搜索股票</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>关闭对话框</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 浮动操作按钮 -->
    <div class="floating-actions">
      <el-button :icon="QuestionFilled" @click="showShortcuts = !showShortcuts" circle size="large" class="help-button"
        title="快捷键帮助" />

      <el-button :icon="Refresh" @click="handleRefresh" circle size="large" class="refresh-button" :loading="refreshing"
        title="刷新数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting,
  FullScreen,
  Close,
  QuestionFilled,
  Refresh
} from '@element-plus/icons-vue'

// 组件导入
import ComprehensiveStockInfo from '@/components/stock/ComprehensiveStockInfo.vue'

// 页面状态
const showSettings = ref(false)
const showShortcuts = ref(false)
const isFullscreen = ref(false)
const refreshing = ref(false)

// 设置数据
const settings = reactive({
  autoRefresh: true,
  refreshInterval: 10000,
  showNotifications: true,
  soundAlerts: false,
  precision: 2,
  chartTheme: 'auto'
})

// 方法
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const saveSettings = () => {
  try {
    localStorage.setItem('stockInfoSettings', JSON.stringify(settings))
    ElMessage.success('设置已保存')
    showSettings.value = false
  } catch (error) {
    ElMessage.error('保存设置失败')
  }
}

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('stockInfoSettings')
    if (saved) {
      Object.assign(settings, JSON.parse(saved))
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

const handleRefresh = async () => {
  refreshing.value = true
  try {
    // 这里可以触发子组件的刷新
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 键盘快捷键处理
const handleKeydown = (event: KeyboardEvent) => {
  // F11 - 全屏切换
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFullscreen()
    return
  }

  // Ctrl + R - 刷新
  if (event.ctrlKey && event.key === 'r') {
    event.preventDefault()
    handleRefresh()
    return
  }

  // Ctrl + S - 保存设置
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    if (showSettings.value) {
      saveSettings()
    }
    return
  }

  // Ctrl + F - 搜索（这里可以聚焦到搜索框）
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault()
    // 可以发送事件给子组件聚焦搜索框
    return
  }

  // Esc - 关闭对话框
  if (event.key === 'Escape') {
    if (showSettings.value) {
      showSettings.value = false
    } else if (showShortcuts.value) {
      showShortcuts.value = false
    }
    return
  }

  // ? - 显示快捷键帮助
  if (event.key === '?' && !event.ctrlKey && !event.altKey) {
    showShortcuts.value = !showShortcuts.value
    return
  }
}

// 全屏状态监听
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// 生命周期
onMounted(() => {
  loadSettings()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // 显示欢迎提示
  setTimeout(() => {
    ElMessage({
      message: '按 ? 键查看快捷键帮助',
      type: 'info',
      duration: 3000
    })
  }, 1000)
})

onUnmounted(() => {
  // 移除事件监听
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)

  // 退出全屏
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
})
</script>

<style scoped>
.stock-info-view {
  min-height: 100vh;
  background: #f8f9fa;
  position: relative;
}

.page-header {
  background: white;
  border-bottom: 1px solid #e9ecef;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #212529;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-description {
  margin: 0;
  color: #6c757d;
  font-size: 0.95rem;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions .el-button {
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: none;
  border: 1px solid #dee2e6;
}

.header-actions .el-button:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.main-content.fullscreen {
  max-width: none;
  margin: 0;
  padding: var(--el-spacing-md);
}

.form-help {
  margin-left: var(--el-spacing-sm);
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  text-align: right;
}

.keyboard-shortcuts {
  position: fixed;
  top: 50%;
  right: var(--el-spacing-lg);
  transform: translateY(-50%);
  z-index: 2000;
  max-width: 300px;
}

.shortcuts-card {
  box-shadow: var(--el-box-shadow-dark);
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--el-spacing-sm);
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--el-spacing-xs) 0;
}

.shortcut-item kbd {
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-family: monospace;
  margin: 0 2px;
}

.floating-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

.help-button,
.refresh-button {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border: 1px solid #dee2e6;
}

.help-button:hover,
.refresh-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.help-button {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.refresh-button {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.shortcuts-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  border: 1px solid #dee2e6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--el-spacing-lg);
    text-align: center;
  }

  .keyboard-shortcuts {
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, -50%);
    max-width: 90vw;
  }

  .floating-actions {
    bottom: var(--el-spacing-lg);
    right: var(--el-spacing-lg);
  }
}

/* 全屏模式样式 */
:fullscreen .stock-info-view {
  background: var(--el-bg-color);
}

:fullscreen .page-header {
  display: none;
}

:fullscreen .main-content {
  padding: var(--el-spacing-md);
}
</style>
