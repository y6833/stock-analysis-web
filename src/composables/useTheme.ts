/**
 * 主题管理组合式函数
 */

import { ref, computed, watch } from 'vue'

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'auto'

// 全局主题状态
const themeMode = ref<ThemeMode>('auto')
const systemPrefersDark = ref(false)

// 检测系统主题偏好
const detectSystemTheme = () => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    
    // 监听系统主题变化
    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
    })
  }
}

// 初始化主题检测
detectSystemTheme()

export function useTheme() {
  // 计算当前是否为暗色主题
  const isDarkMode = computed(() => {
    switch (themeMode.value) {
      case 'dark':
        return true
      case 'light':
        return false
      case 'auto':
      default:
        return systemPrefersDark.value
    }
  })

  // 切换主题
  const toggleTheme = () => {
    switch (themeMode.value) {
      case 'light':
        themeMode.value = 'dark'
        break
      case 'dark':
        themeMode.value = 'auto'
        break
      case 'auto':
      default:
        themeMode.value = 'light'
        break
    }
  }

  // 设置主题
  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode
  }

  // 应用主题到DOM
  const applyTheme = () => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement
      
      if (isDarkMode.value) {
        html.classList.add('dark')
        html.setAttribute('data-theme', 'dark')
      } else {
        html.classList.remove('dark')
        html.setAttribute('data-theme', 'light')
      }
    }
  }

  // 监听主题变化并应用
  watch(isDarkMode, applyTheme, { immediate: true })

  // 从本地存储加载主题设置
  const loadThemeFromStorage = () => {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme-mode') as ThemeMode
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        themeMode.value = savedTheme
      }
    }
  }

  // 保存主题设置到本地存储
  const saveThemeToStorage = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme-mode', themeMode.value)
    }
  }

  // 监听主题模式变化并保存
  watch(themeMode, saveThemeToStorage)

  // 初始化时加载保存的主题
  loadThemeFromStorage()

  // 获取主题相关的CSS变量
  const getThemeColors = computed(() => {
    return {
      primary: isDarkMode.value ? '#409eff' : '#409eff',
      success: isDarkMode.value ? '#67c23a' : '#67c23a',
      warning: isDarkMode.value ? '#e6a23c' : '#e6a23c',
      danger: isDarkMode.value ? '#f56c6c' : '#f56c6c',
      info: isDarkMode.value ? '#909399' : '#909399',
      background: isDarkMode.value ? '#141414' : '#ffffff',
      surface: isDarkMode.value ? '#1f1f1f' : '#f5f5f5',
      text: isDarkMode.value ? '#ffffff' : '#303133',
      textSecondary: isDarkMode.value ? '#a3a3a3' : '#606266',
      border: isDarkMode.value ? '#262626' : '#dcdfe6'
    }
  })

  // 获取主题图标
  const getThemeIcon = computed(() => {
    switch (themeMode.value) {
      case 'light':
        return 'sunny'
      case 'dark':
        return 'moon'
      case 'auto':
      default:
        return 'monitor'
    }
  })

  // 获取主题描述
  const getThemeDescription = computed(() => {
    switch (themeMode.value) {
      case 'light':
        return '浅色主题'
      case 'dark':
        return '深色主题'
      case 'auto':
      default:
        return '跟随系统'
    }
  })

  return {
    // 状态
    themeMode: readonly(themeMode),
    isDarkMode,
    systemPrefersDark: readonly(systemPrefersDark),
    
    // 方法
    toggleTheme,
    setTheme,
    applyTheme,
    
    // 计算属性
    getThemeColors,
    getThemeIcon,
    getThemeDescription,
    
    // 工具方法
    loadThemeFromStorage,
    saveThemeToStorage
  }
}

// 只读包装器
function readonly<T>(ref: any): T {
  return ref
}
