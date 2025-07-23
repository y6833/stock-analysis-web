import { ref, onMounted, watch } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage';

/**
 * 辅助功能设置接口
 */
export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  focusIndicators: boolean;
}

/**
 * 辅助功能组合式函数
 * 提供管理和应用辅助功能设置的功能
 */
export function useAccessibility() {
  // 从本地存储加载设置
  const { getItem, setItem } = useLocalStorage();
  
  // 默认设置
  const defaultSettings: AccessibilitySettings = {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    focusIndicators: true
  };
  
  // 加载保存的设置或使用默认值
  const savedSettings = getItem<AccessibilitySettings>('accessibility-settings');
  const settings = ref<AccessibilitySettings>(savedSettings || defaultSettings);
  
  // 检测系统偏好
  const detectSystemPreferences = () => {
    // 检测高对比度偏好
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      settings.value.highContrast = true;
    }
    
    // 检测减少动画偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settings.value.reducedMotion = true;
    }
  };
  
  // 应用设置到文档
  const applySettings = () => {
    const docEl = document.documentElement;
    
    // 高对比度模式
    if (settings.value.highContrast) {
      docEl.classList.add('high-contrast');
    } else {
      docEl.classList.remove('high-contrast');
    }
    
    // 大文本模式
    if (settings.value.largeText) {
      docEl.classList.add('large-text');
    } else {
      docEl.classList.remove('large-text');
    }
    
    // 减少动画
    if (settings.value.reducedMotion) {
      docEl.classList.add('reduced-motion');
    } else {
      docEl.classList.remove('reduced-motion');
    }
    
    // 屏幕阅读器优化
    if (settings.value.screenReader) {
      docEl.classList.add('screen-reader-mode');
    } else {
      docEl.classList.remove('screen-reader-mode');
    }
    
    // 焦点指示器
    if (settings.value.focusIndicators) {
      docEl.classList.add('focus-visible');
    } else {
      docEl.classList.remove('focus-visible');
    }
    
    // 保存设置到本地存储
    setItem('accessibility-settings', settings.value);
  };
  
  // 更新单个设置
  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    settings.value[key] = value;
  };
  
  // 重置为默认设置
  const resetToDefaults = () => {
    settings.value = { ...defaultSettings };
  };
  
  // 监听设置变化并应用
  watch(
    () => settings.value,
    () => {
      applySettings();
    },
    { deep: true }
  );
  
  // 组件挂载时检测系统偏好并应用设置
  onMounted(() => {
    detectSystemPreferences();
    applySettings();
  });
  
  return {
    settings,
    updateSetting,
    resetToDefaults
  };
}