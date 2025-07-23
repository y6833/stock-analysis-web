/**
 * v-loading 指令
 * 用于在元素上显示加载状态
 * 
 * 使用方法：
 * <div v-loading="isLoading"></div>
 * <div v-loading="{ loading: isLoading, text: '加载中...', fullscreen: false }"></div>
 */

import { Directive, DirectiveBinding, VNode, createApp, h } from 'vue';
import LoadingIndicator from '@/components/common/LoadingIndicator.vue';

interface LoadingOptions {
  loading: boolean;
  text?: string;
  fullscreen?: boolean;
  overlay?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// 存储加载实例的Map
const loadingInstances = new Map<HTMLElement, {
  instance: any;
  container: HTMLElement;
}>();

// 创建加载容器
const createLoadingContainer = (el: HTMLElement, binding: DirectiveBinding): HTMLElement => {
  // 获取选项
  const options = getOptions(binding);
  
  // 创建容器
  const container = document.createElement('div');
  container.className = 'v-loading-container';
  
  // 设置样式
  container.style.position = options.fullscreen ? 'fixed' : 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.zIndex = options.fullscreen ? '9999' : '100';
  
  // 如果是全屏，添加到body，否则添加到目标元素
  if (options.fullscreen) {
    document.body.appendChild(container);
  } else {
    // 确保目标元素的position不是static
    const elPosition = getComputedStyle(el).position;
    if (elPosition === 'static') {
      el.style.position = 'relative';
    }
    
    el.appendChild(container);
  }
  
  return container;
};

// 获取加载选项
const getOptions = (binding: DirectiveBinding): LoadingOptions => {
  if (typeof binding.value === 'boolean') {
    return { loading: binding.value };
  } else if (binding.value && typeof binding.value === 'object') {
    return binding.value as LoadingOptions;
  }
  return { loading: false };
};

// 创建加载实例
const createLoadingInstance = (el: HTMLElement, binding: DirectiveBinding) => {
  // 获取选项
  const options = getOptions(binding);
  
  // 如果不是加载状态，不创建实例
  if (!options.loading) {
    return;
  }
  
  // 创建容器
  const container = createLoadingContainer(el, binding);
  
  // 创建加载组件实例
  const app = createApp({
    render() {
      return h(LoadingIndicator, {
        loading: true,
        text: options.text || '加载中...',
        fullscreen: false, // 容器已经处理了全屏
        overlay: options.overlay !== false,
        size: options.size || 'medium'
      });
    }
  });
  
  // 挂载组件
  const instance = app.mount(document.createElement('div'));
  container.appendChild(instance.$el);
  
  // 存储实例
  loadingInstances.set(el, { instance, container });
};

// 移除加载实例
const removeLoadingInstance = (el: HTMLElement) => {
  const loadingInstance = loadingInstances.get(el);
  if (loadingInstance) {
    const { instance, container } = loadingInstance;
    
    // 卸载组件
    if (instance && instance.$) {
      instance.$unmount();
    }
    
    // 移除容器
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // 从Map中移除
    loadingInstances.delete(el);
  }
};

// 加载指令
export const vLoading: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options = getOptions(binding);
    if (options.loading) {
      createLoadingInstance(el, binding);
    }
  },
  
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const options = getOptions(binding);
    const loadingInstance = loadingInstances.get(el);
    
    if (options.loading) {
      if (!loadingInstance) {
        createLoadingInstance(el, binding);
      }
    } else if (loadingInstance) {
      removeLoadingInstance(el);
    }
  },
  
  unmounted(el: HTMLElement) {
    removeLoadingInstance(el);
  }
};

export default vLoading;