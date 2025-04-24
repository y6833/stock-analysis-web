<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { dashboardService } from '@/services/dashboardService'
import type { DashboardSettings, DashboardLayout, WidgetConfig, WidgetType } from '@/types/dashboard'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', settings: DashboardSettings): void
}>()

// 仪表盘设置
const settings = ref<DashboardSettings | null>(null)
// 当前选中的布局
const selectedLayoutId = ref<string>('')
// 是否正在编辑布局
const isEditingLayout = ref(false)
// 新布局名称
const newLayoutName = ref('')
// 可用的小部件类型
const availableWidgetTypes = ref<{ type: WidgetType, name: string, description: string }[]>([
  { type: 'watchlist', name: '关注列表', description: '显示您关注的股票列表' },
  { type: 'market_overview', name: '市场概览', description: '显示主要指数和市场状况' },
  { type: 'index_chart', name: '指数图表', description: '显示指数走势图' },
  { type: 'stock_chart', name: '股票图表', description: '显示特定股票的走势图' },
  { type: 'news', name: '新闻', description: '显示最新的市场新闻' },
  { type: 'calendar', name: '日历', description: '显示重要的市场事件' },
  { type: 'performance', name: '表现分析', description: '分析您的投资表现' },
  { type: 'heatmap', name: '热力图', description: '显示市场热力图' },
  { type: 'sector_rotation', name: '板块轮动', description: '显示行业板块轮动情况' },
  { type: 'custom_chart', name: '自定义图表', description: '创建自定义图表' }
])

// 当前选中的布局
const selectedLayout = computed(() => {
  if (!settings.value || !selectedLayoutId.value) return null
  return settings.value.layouts.find(layout => layout.id === selectedLayoutId.value) || null
})

// 初始化
onMounted(() => {
  loadSettings()
})

// 加载设置
const loadSettings = () => {
  try {
    const dashboardSettings = dashboardService.getDashboardSettings()
    settings.value = dashboardSettings
    selectedLayoutId.value = dashboardSettings.activeLayoutId
  } catch (error) {
    console.error('加载仪表盘设置失败:', error)
  }
}

// 保存设置
const saveSettings = () => {
  if (!settings.value) return
  
  try {
    // 更新活动布局ID
    settings.value.activeLayoutId = selectedLayoutId.value
    
    // 保存设置
    dashboardService.saveDashboardSettings(settings.value)
    
    // 通知父组件
    emit('save', settings.value)
    emit('close')
  } catch (error) {
    console.error('保存仪表盘设置失败:', error)
  }
}

// 创建新布局
const createLayout = () => {
  if (!settings.value || !newLayoutName.value.trim()) return
  
  const newLayout = dashboardService.createNewLayout(newLayoutName.value.trim())
  settings.value.layouts.push(newLayout)
  selectedLayoutId.value = newLayout.id
  newLayoutName.value = ''
  isEditingLayout.value = false
}

// 删除布局
const deleteLayout = (layoutId: string) => {
  if (!settings.value) return
  
  // 不允许删除默认布局
  const layoutToDelete = settings.value.layouts.find(layout => layout.id === layoutId)
  if (!layoutToDelete || layoutToDelete.isDefault) return
  
  // 从布局列表中移除
  settings.value.layouts = settings.value.layouts.filter(layout => layout.id !== layoutId)
  
  // 如果删除的是当前选中的布局，则选中默认布局
  if (selectedLayoutId.value === layoutId) {
    const defaultLayout = settings.value.layouts.find(layout => layout.isDefault)
    if (defaultLayout) {
      selectedLayoutId.value = defaultLayout.id
    } else if (settings.value.layouts.length > 0) {
      selectedLayoutId.value = settings.value.layouts[0].id
    }
  }
}

// 添加小部件
const addWidget = (type: WidgetType) => {
  if (!settings.value || !selectedLayout.value) return
  
  // 创建新的小部件
  const newWidget = dashboardService.createNewWidget(
    type,
    availableWidgetTypes.value.find(w => w.type === type)?.name || '新小部件',
    { x: 0, y: 0 } // 默认位置，实际位置会在拖放时确定
  )
  
  // 添加到当前布局
  selectedLayout.value.widgets.push(newWidget)
}

// 删除小部件
const removeWidget = (widgetId: string) => {
  if (!settings.value || !selectedLayout.value) return
  
  // 从当前布局中移除小部件
  selectedLayout.value.widgets = selectedLayout.value.widgets.filter(widget => widget.id !== widgetId)
}

// 关闭设置面板
const closeSettings = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="dashboard-settings-overlay">
    <div class="dashboard-settings-panel">
      <div class="settings-header">
        <h2>仪表盘设置</h2>
        <button class="btn-icon-only" @click="closeSettings">
          <span>✖</span>
        </button>
      </div>
      
      <div v-if="!settings" class="settings-loading">
        <div class="loading-spinner"></div>
        <p>加载设置中...</p>
      </div>
      
      <div v-else class="settings-content">
        <div class="settings-section">
          <h3>布局管理</h3>
          
          <div class="layout-selector">
            <div class="layout-list">
              <div 
                v-for="layout in settings.layouts" 
                :key="layout.id"
                class="layout-item"
                :class="{ active: selectedLayoutId === layout.id }"
                @click="selectedLayoutId = layout.id"
              >
                <div class="layout-name">{{ layout.name }}</div>
                <div class="layout-actions">
                  <button 
                    v-if="!layout.isDefault" 
                    class="btn-icon-only btn-sm" 
                    @click.stop="deleteLayout(layout.id)"
                  >
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div v-if="isEditingLayout" class="new-layout-form">
              <input 
                v-model="newLayoutName" 
                type="text" 
                placeholder="输入布局名称" 
                class="input-field"
              />
              <div class="form-actions">
                <button class="btn btn-primary btn-sm" @click="createLayout">创建</button>
                <button class="btn btn-outline btn-sm" @click="isEditingLayout = false">取消</button>
              </div>
            </div>
            
            <button 
              v-else 
              class="btn btn-outline btn-sm add-layout-btn" 
              @click="isEditingLayout = true"
            >
              <span>➕</span> 新建布局
            </button>
          </div>
        </div>
        
        <div v-if="selectedLayout" class="settings-section">
          <h3>小部件管理</h3>
          
          <div class="widget-manager">
            <div class="widget-list">
              <div 
                v-for="widget in selectedLayout.widgets" 
                :key="widget.id"
                class="widget-item"
              >
                <div class="widget-info">
                  <div class="widget-type">{{ availableWidgetTypes.find(w => w.type === widget.type)?.name || widget.type }}</div>
                  <div class="widget-title">{{ widget.title }}</div>
                </div>
                <div class="widget-actions">
                  <button class="btn-icon-only btn-sm" @click="removeWidget(widget.id)">
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="widget-selector">
              <h4>添加小部件</h4>
              <div class="available-widgets">
                <div 
                  v-for="widgetType in availableWidgetTypes" 
                  :key="widgetType.type"
                  class="widget-type-item"
                  @click="addWidget(widgetType.type)"
                >
                  <div class="widget-type-name">{{ widgetType.name }}</div>
                  <div class="widget-type-description">{{ widgetType.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>其他设置</h3>
          
          <div class="setting-item">
            <label class="setting-label">主题</label>
            <select v-model="settings.theme" class="select-field">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">数据刷新间隔（秒）</label>
            <input 
              v-model.number="settings.refreshInterval" 
              type="number" 
              min="10" 
              max="3600" 
              class="input-field"
            />
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <button class="btn btn-primary" @click="saveSettings">保存设置</button>
        <button class="btn btn-outline" @click="closeSettings">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dashboard-settings-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.settings-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.settings-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.settings-section {
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
}

.settings-section h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 600;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-sm);
}

.layout-selector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.layout-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.layout-item {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  transition: all var(--transition-fast);
}

.layout-item:hover {
  background-color: var(--bg-tertiary);
}

.layout-item.active {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}

.layout-name {
  font-weight: 500;
}

.layout-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.new-layout-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.add-layout-btn {
  align-self: flex-start;
}

.widget-manager {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.widget-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.widget-item {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.widget-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.widget-type {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.widget-title {
  font-weight: 500;
}

.widget-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.widget-selector {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
}

.widget-selector h4 {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.available-widgets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.widget-type-item {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.widget-type-item:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.widget-type-name {
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.widget-type-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.setting-label {
  flex: 1;
  font-weight: 500;
}

.input-field,
.select-field {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  width: 200px;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
}

@media (max-width: 768px) {
  .dashboard-settings-panel {
    width: 95%;
    max-height: 95vh;
  }
  
  .available-widgets {
    grid-template-columns: 1fr;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .input-field,
  .select-field {
    width: 100%;
  }
}
</style>
