import type { DirectiveBinding } from 'vue';

/**
 * 焦点陷阱指令
 * 用于模态对话框等组件，确保焦点在组件内循环
 */
export const vFocusTrap = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const active = binding.value !== false;
    if (!active) return;

    // 找到所有可聚焦元素
    const focusableElements = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // 自动聚焦第一个元素
    setTimeout(() => {
      firstElement.focus();
    }, 50);

    // 处理Tab键导航
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeydown);
    el._focusTrapCleanup = () => {
      el.removeEventListener('keydown', handleKeydown);
    };
  },

  beforeUnmount(el: HTMLElement & { _focusTrapCleanup?: () => void }) {
    if (el._focusTrapCleanup) {
      el._focusTrapCleanup();
      delete el._focusTrapCleanup;
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    const active = binding.value !== false;
    const wasActive = binding.oldValue !== false;

    if (active !== wasActive) {
      if (active) {
        // 重新挂载
        vFocusTrap.mounted(el, binding);
      } else if (el._focusTrapCleanup) {
        // 清理
        el._focusTrapCleanup();
        delete el._focusTrapCleanup;
      }
    }
  }
};

/**
 * 触摸反馈指令
 * 为触摸设备上的元素添加触摸反馈效果
 */
export const vTouchFeedback = {
  mounted(el: HTMLElement) {
    // 检查是否为触摸设备
    const isTouchDevice = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    if (!isTouchDevice) return;

    // 添加触摸反馈类
    el.classList.add('touch-feedback');

    // 确保元素有足够的触摸区域
    const rect = el.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      el.classList.add('touch-target');
    }
  }
};

/**
 * 无障碍标签指令
 * 确保元素有适当的ARIA标签
 */
export const vA11yLabel = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const label = binding.value;
    if (!label) return;

    // 设置aria-label属性
    el.setAttribute('aria-label', label);

    // 如果元素没有role属性，尝试设置一个合适的role
    if (!el.hasAttribute('role')) {
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        // 按钮和链接已经有隐含的角色
      } else if (el.onclick || el.getAttribute('onClick')) {
        el.setAttribute('role', 'button');
      } else {
        el.setAttribute('role', 'region');
      }
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      el.setAttribute('aria-label', binding.value);
    }
  }
};

/**
 * 无障碍描述指令
 * 为元素添加详细的ARIA描述
 */
export const vA11yDescribe = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const description = binding.value;
    if (!description) return;

    // 创建唯一ID
    const id = `aria-desc-${Math.random().toString(36).substring(2, 9)}`;

    // 创建描述元素
    const descEl = document.createElement('span');
    descEl.id = id;
    descEl.className = 'sr-only';
    descEl.textContent = description;

    // 添加到DOM
    el.parentNode?.appendChild(descEl);

    // 设置aria-describedby
    el.setAttribute('aria-describedby', id);

    // 存储ID以便清理
    el._a11yDescribeId = id;
  },

  beforeUnmount(el: HTMLElement & { _a11yDescribeId?: string }) {
    if (el._a11yDescribeId) {
      const descEl = document.getElementById(el._a11yDescribeId);
      if (descEl) {
        descEl.parentNode?.removeChild(descEl);
      }
      delete el._a11yDescribeId;
    }
  },

  updated(el: HTMLElement & { _a11yDescribeId?: string }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 移除旧描述
      if (el._a11yDescribeId) {
        const oldDescEl = document.getElementById(el._a11yDescribeId);
        if (oldDescEl) {
          oldDescEl.parentNode?.removeChild(oldDescEl);
        }
      }

      // 创建新描述
      const description = binding.value;
      if (!description) return;

      const id = `aria-desc-${Math.random().toString(36).substring(2, 9)}`;
      const descEl = document.createElement('span');
      descEl.id = id;
      descEl.className = 'sr-only';
      descEl.textContent = description;

      el.parentNode?.appendChild(descEl);
      el.setAttribute('aria-describedby', id);
      el._a11yDescribeId = id;
    }
  }
};

/**
 * 键盘导航指令
 * 为元素添加键盘导航支持
 */
export const vKeyNav = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options = binding.value || {};
    const keys = options.keys || {};

    const handleKeydown = (event: KeyboardEvent) => {
      const key = event.key;
      if (keys[key] && typeof keys[key] === 'function') {
        event.preventDefault();
        keys[key](event);
      }
    };

    el.addEventListener('keydown', handleKeydown);
    el._keyNavCleanup = () => {
      el.removeEventListener('keydown', handleKeydown);
    };
  },

  beforeUnmount(el: HTMLElement & { _keyNavCleanup?: () => void }) {
    if (el._keyNavCleanup) {
      el._keyNavCleanup();
      delete el._keyNavCleanup;
    }
  },

  updated(el: HTMLElement & { _keyNavCleanup?: () => void }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 清理旧事件监听器
      if (el._keyNavCleanup) {
        el._keyNavCleanup();
      }

      // 设置新事件监听器
      const options = binding.value || {};
      const keys = options.keys || {};

      const handleKeydown = (event: KeyboardEvent) => {
        const key = event.key;
        if (keys[key] && typeof keys[key] === 'function') {
          event.preventDefault();
          keys[key](event);
        }
      };

      el.addEventListener('keydown', handleKeydown);
      el._keyNavCleanup = () => {
        el.removeEventListener('keydown', handleKeydown);
      };
    }
  }
};

/**
 * 导出所有指令
 */
export default {
  vFocusTrap,
  vTouchFeedback,
  vA11yLabel,
  vA11yDescribe,
  vKeyNav
};