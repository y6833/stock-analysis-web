<template>
  <div class="theme-toggle">
    <button 
      class="theme-button"
      @click="toggleTheme"
      :title="getThemeTitle()"
    >
      <span class="theme-icon">{{ getThemeIcon() }}</span>
      <span class="theme-text" v-if="showText">{{ getThemeText() }}</span>
    </button>
    
    <!-- 主题选择下拉菜单 -->
    <div v-if="showDropdown" class="theme-dropdown" :class="{ show: isDropdownOpen }">
      <button class="dropdown-toggle" @click="toggleDropdown">
        <span class="current-theme-icon">{{ getThemeIcon() }}</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      
      <div class="dropdown-menu" v-show="isDropdownOpen">
        <div 
          v-for="theme in themes" 
          :key="theme.key"
          class="dropdown-item"
          :class="{ active: currentTheme === theme.key }"
          @click="setTheme(theme.key)"
        >
          <span class="theme-option-icon">{{ theme.icon }}</span>
          <span class="theme-option-text">{{ theme.label }}</span>
          <span v-if="currentTheme === theme.key" class="check-icon">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Props
interface Props {
  showText?: boolean
  showDropdown?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  showText: false,
  showDropdown: false,
  size: 'medium'
})

// Emits
const emit = defineEmits<{
  'theme-changed': [theme: string]
}>()

// 主题类型
type ThemeType = 'light' | 'dark' | 'auto'

// 状态
const currentTheme = ref<ThemeType>('auto')
const isDropdownOpen = ref(false)
const systemTheme = ref<'light' | 'dark'>('light')

// 主题配置
const themes = [
  { key: 'light', label: '浅色模式', icon: '☀️' },
  { key: 'dark', label: '深色模式', icon: '🌙' },
  { key: 'auto', label: '跟随系统', icon: '🔄' }
]

// 计算属性
const effectiveTheme = computed(() => {
  if (currentTheme.value === 'auto') {
    return systemTheme.value
  }
  return currentTheme.value
})

// 方法
const toggleTheme = () => {
  if (props.showDropdown) {
    toggleDropdown()
    return
  }
  
  // 简单切换模式：浅色 -> 深色 -> 自动 -> 浅色
  const themeOrder: ThemeType[] = ['light', 'dark', 'auto']
  const currentIndex = themeOrder.indexOf(currentTheme.value)
  const nextIndex = (currentIndex + 1) % themeOrder.length
  setTheme(themeOrder[nextIndex])
}

const setTheme = (theme: ThemeType) => {
  currentTheme.value = theme
  applyTheme()
  saveThemePreference()
  emit('theme-changed', theme)
  
  if (isDropdownOpen.value) {
    isDropdownOpen.value = false
  }
}

const applyTheme = () => {
  const theme = effectiveTheme.value
  const root = document.documentElement
  
  // 移除现有主题类
  root.classList.remove('theme-light', 'theme-dark')
  
  // 添加新主题类
  root.classList.add(`theme-${theme}`)
  
  // 设置主题属性
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#1a1a1a')
    root.style.setProperty('--bg-secondary', '#2d2d2d')
    root.style.setProperty('--bg-tertiary', '#404040')
    root.style.setProperty('--text-primary', '#ffffff')
    root.style.setProperty('--text-secondary', '#cccccc')
    root.style.setProperty('--text-muted', '#999999')
    root.style.setProperty('--border-light', '#404040')
    root.style.setProperty('--border-color', '#555555')
    root.style.setProperty('--shadow-sm', '0 2px 4px rgba(0, 0, 0, 0.3)')
    root.style.setProperty('--shadow-md', '0 4px 8px rgba(0, 0, 0, 0.3)')
  } else {
    root.style.setProperty('--bg-primary', '#ffffff')
    root.style.setProperty('--bg-secondary', '#f8f9fa')
    root.style.setProperty('--bg-tertiary', '#e9ecef')
    root.style.setProperty('--text-primary', '#212529')
    root.style.setProperty('--text-secondary', '#6c757d')
    root.style.setProperty('--text-muted', '#adb5bd')
    root.style.setProperty('--border-light', '#dee2e6')
    root.style.setProperty('--border-color', '#ced4da')
    root.style.setProperty('--shadow-sm', '0 2px 4px rgba(0, 0, 0, 0.1)')
    root.style.setProperty('--shadow-md', '0 4px 8px rgba(0, 0, 0, 0.1)')
  }
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const getThemeIcon = (): string => {
  const theme = themes.find(t => t.key === currentTheme.value)
  return theme?.icon || '🔄'
}

const getThemeText = (): string => {
  const theme = themes.find(t => t.key === currentTheme.value)
  return theme?.label || '主题'
}

const getThemeTitle = (): string => {
  if (props.showDropdown) {
    return '选择主题'
  }
  return `当前主题: ${getThemeText()}，点击切换`
}

const saveThemePreference = () => {
  try {
    localStorage.setItem('theme-preference', currentTheme.value)
  } catch (error) {
    console.warn('无法保存主题偏好设置:', error)
  }
}

const loadThemePreference = () => {
  try {
    const saved = localStorage.getItem('theme-preference') as ThemeType
    if (saved && themes.some(t => t.key === saved)) {
      currentTheme.value = saved
    }
  } catch (error) {
    console.warn('无法加载主题偏好设置:', error)
  }
}

const detectSystemTheme = () => {
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemTheme.value = mediaQuery.matches ? 'dark' : 'light'
    
    // 监听系统主题变化
    mediaQuery.addEventListener('change', (e) => {
      systemTheme.value = e.matches ? 'dark' : 'light'
      if (currentTheme.value === 'auto') {
        applyTheme()
      }
    })
  }
}

const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.theme-dropdown')) {
    isDropdownOpen.value = false
  }
}

// 生命周期
onMounted(() => {
  detectSystemTheme()
  loadThemePreference()
  applyTheme()
  
  // 添加点击外部关闭下拉菜单的监听器
  if (props.showDropdown) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (props.showDropdown) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-block;
}

.theme-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.theme-button:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.theme-icon {
  font-size: 1.2em;
  line-height: 1;
}

.theme-text {
  font-weight: 500;
}

/* 下拉菜单样式 */
.theme-dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.dropdown-toggle:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.current-theme-icon {
  font-size: 1.2em;
  line-height: 1;
}

.dropdown-arrow {
  font-size: 0.8em;
  transition: transform var(--transition-fast);
}

.theme-dropdown.show .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  min-width: 150px;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  font-size: var(--font-size-sm);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  color: var(--text-primary);
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.active {
  background: var(--accent-light);
  color: var(--accent-color);
}

.theme-option-icon {
  font-size: 1.1em;
  line-height: 1;
}

.theme-option-text {
  flex: 1;
  font-weight: 500;
}

.check-icon {
  color: var(--accent-color);
  font-weight: bold;
}

/* 尺寸变体 */
.theme-toggle.small .theme-button,
.theme-toggle.small .dropdown-toggle {
  padding: 4px 8px;
  font-size: var(--font-size-xs);
}

.theme-toggle.small .theme-icon,
.theme-toggle.small .current-theme-icon {
  font-size: 1em;
}

.theme-toggle.large .theme-button,
.theme-toggle.large .dropdown-toggle {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-md);
}

.theme-toggle.large .theme-icon,
.theme-toggle.large .current-theme-icon {
  font-size: 1.4em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dropdown-menu {
    right: auto;
    left: 0;
    min-width: 120px;
  }
  
  .theme-text {
    display: none;
  }
}

/* 深色主题特定样式 */
:global(.theme-dark) .dropdown-menu {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

:global(.theme-dark) .dropdown-item:hover {
  background: var(--bg-tertiary);
}

:global(.theme-dark) .dropdown-item.active {
  background: rgba(66, 184, 131, 0.2);
}

/* 动画效果 */
.dropdown-menu {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 无障碍支持 */
.theme-button:focus,
.dropdown-toggle:focus,
.dropdown-item:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .theme-button,
  .dropdown-toggle {
    border-width: 2px;
  }
  
  .dropdown-item.active {
    background: var(--accent-color);
    color: white;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .theme-button,
  .dropdown-toggle,
  .dropdown-item,
  .dropdown-arrow {
    transition: none;
  }
  
  .dropdown-menu {
    animation: none;
  }
}
</style>
