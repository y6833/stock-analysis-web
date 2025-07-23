/**
 * 加载状态服务
 * 提供统一的加载状态管理，包括全局加载、组件加载和进度指示器
 */

import { ElLoading } from 'element-plus';
import { ref } from 'vue';

// 全局加载实例
let globalLoadingInstance: any = null;

// 加载计数器（用于嵌套加载）
const loadingCounter = ref(0);

// 组件加载状态映射
const componentLoadingStates = new Map<string, boolean>();

/**
 * 显示全局加载
 * @param text 加载文本
 * @param options 加载选项
 */
export function showGlobalLoading(text: string = '加载中...', options: any = {}): void {
  // 增加计数器
  loadingCounter.value++;

  // 如果已经有加载实例，只更新文本
  if (globalLoadingInstance) {
    if (globalLoadingInstance.setText) {
      globalLoadingInstance.setText(text);
    }
    return;
  }

  // 创建新的加载实例
  globalLoadingInstance = ElLoading.service({
    lock: true,
    text,
    background: 'rgba(255, 255, 255, 0.7)',
    ...options,
  });
}

/**
 * 隐藏全局加载
 * @param force 是否强制隐藏，忽略计数器
 */
export function hideGlobalLoading(force: boolean = false): void {
  // 减少计数器
  if (loadingCounter.value > 0) {
    loadingCounter.value--;
  }

  // 如果计数器为0或强制隐藏，关闭加载实例
  if (loadingCounter.value === 0 || force) {
    if (globalLoadingInstance) {
      globalLoadingInstance.close();
      globalLoadingInstance = null;
    }
    
    // 重置计数器
    if (force) {
      loadingCounter.value = 0;
    }
  }
}

/**
 * 设置组件加载状态
 * @param componentId 组件ID
 * @param isLoading 是否加载中
 */
export function setComponentLoading(componentId: string, isLoading: boolean): void {
  componentLoadingStates.set(componentId, isLoading);
}

/**
 * 获取组件加载状态
 * @param componentId 组件ID
 */
export function getComponentLoading(componentId: string): boolean {
  return componentLoadingStates.get(componentId) || false;
}

/**
 * 重置所有加载状态
 */
export function resetAllLoadingStates(): void {
  // 重置全局加载
  if (globalLoadingInstance) {
    globalLoadingInstance.close();
    globalLoadingInstance = null;
  }
  
  // 重置计数器
  loadingCounter.value = 0;
  
  // 重置组件加载状态
  componentLoadingStates.clear();
}

/**
 * 创建加载包装函数
 * 自动处理加载状态和错误
 * @param fn 要包装的异步函数
 * @param loadingText 加载文本
 * @param useGlobalLoading 是否使用全局加载
 * @param componentId 组件ID（如果使用组件加载）
 */
export function withLoading<T>(
  fn: () => Promise<T>,
  loadingText: string = '加载中...',
  useGlobalLoading: boolean = true,
  componentId?: string
): () => Promise<T> {
  return async () => {
    try {
      // 显示加载状态
      if (useGlobalLoading) {
        showGlobalLoading(loadingText);
      } else if (componentId) {
        setComponentLoading(componentId, true);
      }
      
      // 执行函数
      const result = await fn();
      return result;
    } finally {
      // 隐藏加载状态
      if (useGlobalLoading) {
        hideGlobalLoading();
      } else if (componentId) {
        setComponentLoading(componentId, false);
      }
    }
  };
}

export default {
  showGlobalLoading,
  hideGlobalLoading,
  setComponentLoading,
  getComponentLoading,
  resetAllLoadingStates,
  withLoading,
};