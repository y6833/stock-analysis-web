import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stock } from '@/types/stock'
import { stockService } from '@/services/stockService'

// 仪表盘组件类型
export interface DashboardWidget {
  id: string
  type: string // 'market-overview' | 'watchlist' | 'news' | 'popular-stocks' | 'quick-actions' | 'industry-overview'
  title: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: number
  config?: any // 组件特定配置
}

// 仪表盘布局配置
export interface DashboardLayout {
  id: string
  name: string
  widgets: DashboardWidget[]
  isDefault: boolean
}

export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const layouts = ref<DashboardLayout[]>([])
  const currentLayoutId = ref<string>('default')
  const isEditing = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // 计算属性
  const currentLayout = computed(() => {
    return layouts.value.find(layout => layout.id === currentLayoutId.value) || layouts.value[0]
  })
  
  // 初始化默认布局
  function initializeDefaultLayout() {
    // 检查是否已有默认布局
    if (layouts.value.length > 0) return
    
    // 创建默认布局
    const defaultLayout: DashboardLayout = {
      id: 'default',
      name: '默认布局',
      isDefault: true,
      widgets: [
        {
          id: 'market-overview',
          type: 'market-overview',
          title: '市场概览',
          size: 'medium',
          position: 0
        },
        {
          id: 'watchlist',
          type: 'watchlist',
          title: '关注列表',
          size: 'medium',
          position: 1
        },
        {
          id: 'news',
          type: 'news',
          title: '最新资讯',
          size: 'medium',
          position: 2
        },
        {
          id: 'popular-stocks',
          type: 'popular-stocks',
          title: '热门股票',
          size: 'medium',
          position: 3
        },
        {
          id: 'quick-actions',
          type: 'quick-actions',
          title: '快捷操作',
          size: 'medium',
          position: 4
        }
      ]
    }
    
    layouts.value.push(defaultLayout)
    currentLayoutId.value = defaultLayout.id
    
    // 保存到本地存储
    saveLayouts()
  }
  
  // 创建新布局
  function createLayout(name: string) {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      isDefault: false,
      widgets: []
    }
    
    layouts.value.push(newLayout)
    currentLayoutId.value = newLayout.id
    
    // 保存到本地存储
    saveLayouts()
    
    return newLayout
  }
  
  // 删除布局
  function deleteLayout(layoutId: string) {
    // 不允许删除默认布局
    const layoutToDelete = layouts.value.find(layout => layout.id === layoutId)
    if (!layoutToDelete || layoutToDelete.isDefault) return false
    
    // 删除布局
    layouts.value = layouts.value.filter(layout => layout.id !== layoutId)
    
    // 如果删除的是当前布局，切换到默认布局
    if (currentLayoutId.value === layoutId) {
      const defaultLayout = layouts.value.find(layout => layout.isDefault)
      if (defaultLayout) {
        currentLayoutId.value = defaultLayout.id
      } else if (layouts.value.length > 0) {
        currentLayoutId.value = layouts.value[0].id
      }
    }
    
    // 保存到本地存储
    saveLayouts()
    
    return true
  }
  
  // 切换布局
  function switchLayout(layoutId: string) {
    const layout = layouts.value.find(layout => layout.id === layoutId)
    if (layout) {
      currentLayoutId.value = layoutId
      // 保存当前布局ID到本地存储
      localStorage.setItem('current_dashboard_layout', layoutId)
      return true
    }
    return false
  }
  
  // 添加组件
  function addWidget(widget: Omit<DashboardWidget, 'id' | 'position'>) {
    if (!currentLayout.value) return null
    
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: currentLayout.value.widgets.length
    }
    
    currentLayout.value.widgets.push(newWidget)
    
    // 保存到本地存储
    saveLayouts()
    
    return newWidget
  }
  
  // 删除组件
  function removeWidget(widgetId: string) {
    if (!currentLayout.value) return false
    
    const index = currentLayout.value.widgets.findIndex(widget => widget.id === widgetId)
    if (index === -1) return false
    
    currentLayout.value.widgets.splice(index, 1)
    
    // 更新位置
    currentLayout.value.widgets.forEach((widget, idx) => {
      widget.position = idx
    })
    
    // 保存到本地存储
    saveLayouts()
    
    return true
  }
  
  // 更新组件
  function updateWidget(widgetId: string, updates: Partial<DashboardWidget>) {
    if (!currentLayout.value) return false
    
    const widget = currentLayout.value.widgets.find(w => w.id === widgetId)
    if (!widget) return false
    
    Object.assign(widget, updates)
    
    // 保存到本地存储
    saveLayouts()
    
    return true
  }
  
  // 重新排序组件
  function reorderWidgets(widgetIds: string[]) {
    if (!currentLayout.value) return false
    
    // 验证所有ID都存在
    const allExist = widgetIds.every(id => 
      currentLayout.value!.widgets.some(widget => widget.id === id)
    )
    
    if (!allExist || widgetIds.length !== currentLayout.value.widgets.length) return false
    
    // 创建新的排序
    const newOrder = widgetIds.map((id, index) => {
      const widget = currentLayout.value!.widgets.find(w => w.id === id)!
      return {
        ...widget,
        position: index
      }
    })
    
    // 更新布局
    currentLayout.value.widgets = newOrder
    
    // 保存到本地存储
    saveLayouts()
    
    return true
  }
  
  // 保存布局到本地存储
  function saveLayouts() {
    localStorage.setItem('dashboard_layouts', JSON.stringify(layouts.value))
  }
  
  // 从本地存储加载布局
  function loadLayouts() {
    const savedLayouts = localStorage.getItem('dashboard_layouts')
    if (savedLayouts) {
      try {
        layouts.value = JSON.parse(savedLayouts)
        
        // 加载当前布局ID
        const savedCurrentLayoutId = localStorage.getItem('current_dashboard_layout')
        if (savedCurrentLayoutId) {
          // 确保布局存在
          const layoutExists = layouts.value.some(layout => layout.id === savedCurrentLayoutId)
          if (layoutExists) {
            currentLayoutId.value = savedCurrentLayoutId
          }
        }
      } catch (err) {
        console.error('加载仪表盘布局失败:', err)
        // 出错时初始化默认布局
        initializeDefaultLayout()
      }
    } else {
      // 没有保存的布局时初始化默认布局
      initializeDefaultLayout()
    }
  }
  
  // 初始化
  function initialize() {
    loadLayouts()
    
    // 如果没有布局，创建默认布局
    if (layouts.value.length === 0) {
      initializeDefaultLayout()
    }
  }
  
  // 初始化
  initialize()
  
  return {
    layouts,
    currentLayoutId,
    currentLayout,
    isEditing,
    isLoading,
    error,
    createLayout,
    deleteLayout,
    switchLayout,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    initializeDefaultLayout
  }
})
