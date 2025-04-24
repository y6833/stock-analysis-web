<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DashboardWidget } from '@/stores/dashboardStore'

const props = defineProps<{
  widget: DashboardWidget
  isEditing: boolean
}>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'edit'): void
  (e: 'resize', size: 'small' | 'medium' | 'large' | 'full'): void
}>()

// 根据组件大小计算CSS类
const sizeClass = computed(() => {
  switch (props.widget.size) {
    case 'small': return 'widget-small'
    case 'medium': return 'widget-medium'
    case 'large': return 'widget-large'
    case 'full': return 'widget-full'
    default: return 'widget-medium'
  }
})

// 处理移除组件
const handleRemove = () => {
  if (confirm(`确定要移除 "${props.widget.title}" 组件吗？`)) {
    emit('remove')
  }
}

// 处理编辑组件
const handleEdit = () => {
  emit('edit')
}

// 处理调整大小
const handleResize = (size: 'small' | 'medium' | 'large' | 'full') => {
  emit('resize', size)
}
</script>

<template>
  <div class="dashboard-widget" :class="sizeClass">
    <div class="widget-header">
      <h3 class="widget-title">{{ widget.title }}</h3>
      
      <div v-if="isEditing" class="widget-actions">
        <div class="widget-size-controls">
          <button 
            class="btn-size" 
            :class="{ active: widget.size === 'small' }" 
            @click="handleResize('small')"
            title="小尺寸"
          >S</button>
          <button 
            class="btn-size" 
            :class="{ active: widget.size === 'medium' }" 
            @click="handleResize('medium')"
            title="中尺寸"
          >M</button>
          <button 
            class="btn-size" 
            :class="{ active: widget.size === 'large' }" 
            @click="handleResize('large')"
            title="大尺寸"
          >L</button>
          <button 
            class="btn-size" 
            :class="{ active: widget.size === 'full' }" 
            @click="handleResize('full')"
            title="全宽"
          >F</button>
        </div>
        
        <button class="btn-icon" @click="handleEdit" title="编辑">
          <span>⚙️</span>
        </button>
        <button class="btn-icon" @click="handleRemove" title="移除">
          <span>×</span>
        </button>
      </div>
      
      <div v-else class="widget-actions">
        <button class="btn-icon" title="更多选项">
          <span>⋮</span>
        </button>
      </div>
    </div>
    
    <div class="widget-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.dashboard-widget {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-normal);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  background-color: var(--bg-secondary);
}

.widget-title {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.widget-actions {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.widget-content {
  padding: var(--spacing-md);
  flex: 1;
  overflow: auto;
}

.btn-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
}

.widget-size-controls {
  display: flex;
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.btn-size {
  width: 24px;
  height: 24px;
  border: none;
  background-color: var(--bg-primary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  padding: 0;
  transition: all var(--transition-fast);
}

.btn-size:hover {
  background-color: var(--bg-tertiary);
}

.btn-size.active {
  background-color: var(--primary-color);
  color: white;
}

/* 编辑模式样式 */
.dashboard-widget.editing {
  border: 2px dashed var(--accent-color);
}

/* 拖拽样式 */
.dashboard-widget.dragging {
  opacity: 0.7;
  transform: scale(0.98);
  box-shadow: var(--shadow-lg);
}
</style>
