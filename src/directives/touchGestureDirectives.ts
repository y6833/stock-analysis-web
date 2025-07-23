import { DirectiveBinding } from 'vue';

/**
 * 手势类型
 */
type GestureType = 'swipe' | 'tap' | 'longpress' | 'pinch' | 'rotate';

/**
 * 滑动方向
 */
type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * 手势事件接口
 */
interface GestureEvent {
  type: GestureType;
  direction?: SwipeDirection;
  distance?: number;
  duration?: number;
  scale?: number;
  rotation?: number;
  x: number;
  y: number;
  originalEvent: TouchEvent;
}

/**
 * 手势选项接口
 */
interface GestureOptions {
  swipeThreshold?: number;
  longpressThreshold?: number;
  doubleTapThreshold?: number;
  preventDefaultEvents?: boolean;
}

/**
 * 手势处理器接口
 */
interface GestureHandlers {
  onSwipe?: (event: GestureEvent) => void;
  onTap?: (event: GestureEvent) => void;
  onLongpress?: (event: GestureEvent) => void;
  onPinch?: (event: GestureEvent) => void;
  onRotate?: (event: GestureEvent) => void;
}

/**
 * 滑动手势指令
 * 检测元素上的滑动手势
 */
export const vSwipe = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options: GestureOptions = binding.arg ? { swipeThreshold: parseInt(binding.arg) } : {};
    const handlers: GestureHandlers = binding.value || {};
    
    // 触摸状态
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isGestureDetected = false;
    
    // 处理触摸开始
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      isGestureDetected = false;
    };
    
    // 处理触摸结束
    const handleTouchEnd = (event: TouchEvent) => {
      if (isGestureDetected) return;
      
      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      const diffX = endX - startX;
      const diffY = endY - startY;
      const duration = endTime - startTime;
      
      // 检测滑动手势
      const swipeThreshold = options.swipeThreshold || 50;
      if (Math.abs(diffX) > swipeThreshold || Math.abs(diffY) > swipeThreshold) {
        isGestureDetected = true;
        
        // 确定滑动方向
        let direction: SwipeDirection;
        if (Math.abs(diffX) > Math.abs(diffY)) {
          direction = diffX > 0 ? 'right' : 'left';
        } else {
          direction = diffY > 0 ? 'down' : 'up';
        }
        
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        const gestureEvent: GestureEvent = {
          type: 'swipe',
          direction,
          distance,
          duration,
          x: endX,
          y: endY,
          originalEvent: event
        };
        
        if (handlers.onSwipe) {
          handlers.onSwipe(gestureEvent);
        }
      }
    };
    
    // 添加事件监听器
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // 存储清理函数
    el._swipeCleanup = () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  },
  
  beforeUnmount(el: HTMLElement & { _swipeCleanup?: () => void }) {
    if (el._swipeCleanup) {
      el._swipeCleanup();
      delete el._swipeCleanup;
    }
  },
  
  updated(el: HTMLElement & { _swipeCleanup?: () => void }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 清理旧事件监听器
      if (el._swipeCleanup) {
        el._swipeCleanup();
      }
      
      // 重新挂载
      vSwipe.mounted(el, binding);
    }
  }
};

/**
 * 长按手势指令
 * 检测元素上的长按手势
 */
export const vLongpress = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const threshold = binding.arg ? parseInt(binding.arg) : 500; // 默认500毫秒
    const handler = binding.value;
    
    if (typeof handler !== 'function') {
      console.warn('v-longpress directive requires a function as value');
      return;
    }
    
    // 状态变量
    let pressTimer: number | null = null;
    let startX = 0;
    let startY = 0;
    const moveThreshold = 10; // 移动容差
    
    // 处理触摸开始
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      
      pressTimer = window.setTimeout(() => {
        handler({
          type: 'longpress',
          x: startX,
          y: startY,
          originalEvent: event
        });
      }, threshold);
    };
    
    // 处理触摸移动
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const diffX = Math.abs(touch.clientX - startX);
      const diffY = Math.abs(touch.clientY - startY);
      
      // 如果移动超过阈值，取消长按
      if (diffX > moveThreshold || diffY > moveThreshold) {
        if (pressTimer !== null) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
    };
    
    // 处理触摸结束
    const handleTouchEnd = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };
    
    // 添加事件监听器
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    // 存储清理函数
    el._longpressCleanup = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
      }
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  },
  
  beforeUnmount(el: HTMLElement & { _longpressCleanup?: () => void }) {
    if (el._longpressCleanup) {
      el._longpressCleanup();
      delete el._longpressCleanup;
    }
  },
  
  updated(el: HTMLElement & { _longpressCleanup?: () => void }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 清理旧事件监听器
      if (el._longpressCleanup) {
        el._longpressCleanup();
      }
      
      // 重新挂载
      vLongpress.mounted(el, binding);
    }
  }
};

/**
 * 双击手势指令
 * 检测元素上的双击手势
 */
export const vDoubleTap = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const threshold = binding.arg ? parseInt(binding.arg) : 300; // 默认300毫秒
    const handler = binding.value;
    
    if (typeof handler !== 'function') {
      console.warn('v-double-tap directive requires a function as value');
      return;
    }
    
    // 状态变量
    let lastTap = 0;
    let tapCount = 0;
    
    // 处理触摸结束
    const handleTouchEnd = (event: TouchEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTap;
      
      if (timeDiff < threshold && timeDiff > 0) {
        // 双击检测到
        tapCount = 0;
        lastTap = 0;
        
        const touch = event.changedTouches[0];
        handler({
          type: 'tap',
          x: touch.clientX,
          y: touch.clientY,
          originalEvent: event
        });
      } else {
        // 第一次点击
        tapCount = 1;
        lastTap = currentTime;
      }
    };
    
    // 添加事件监听器
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // 存储清理函数
    el._doubleTapCleanup = () => {
      el.removeEventListener('touchend', handleTouchEnd);
    };
  },
  
  beforeUnmount(el: HTMLElement & { _doubleTapCleanup?: () => void }) {
    if (el._doubleTapCleanup) {
      el._doubleTapCleanup();
      delete el._doubleTapCleanup;
    }
  },
  
  updated(el: HTMLElement & { _doubleTapCleanup?: () => void }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 清理旧事件监听器
      if (el._doubleTapCleanup) {
        el._doubleTapCleanup();
      }
      
      // 重新挂载
      vDoubleTap.mounted(el, binding);
    }
  }
};

/**
 * 手势指令
 * 综合检测多种手势
 */
export const vGesture = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options: GestureOptions = binding.arg ? JSON.parse(binding.arg) : {};
    const handlers: GestureHandlers = binding.value || {};
    
    // 默认选项
    const defaultOptions: Required<GestureOptions> = {
      swipeThreshold: 50,
      longpressThreshold: 500,
      doubleTapThreshold: 300,
      preventDefaultEvents: false
    };
    
    // 合并选项
    const opts = { ...defaultOptions, ...options };
    
    // 触摸状态
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastTap = 0;
    let pressTimer: number | null = null;
    let isGestureDetected = false;
    
    // 处理触摸开始
    const handleTouchStart = (event: TouchEvent) => {
      if (opts.preventDefaultEvents) {
        event.preventDefault();
      }
      
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      isGestureDetected = false;
      
      // 设置长按定时器
      if (handlers.onLongpress) {
        pressTimer = window.setTimeout(() => {
          if (!isGestureDetected) {
            isGestureDetected = true;
            handlers.onLongpress({
              type: 'longpress',
              x: startX,
              y: startY,
              originalEvent: event
            });
          }
        }, opts.longpressThreshold);
      }
    };
    
    // 处理触摸移动
    const handleTouchMove = (event: TouchEvent) => {
      if (opts.preventDefaultEvents) {
        event.preventDefault();
      }
      
      const touch = event.touches[0];
      const diffX = Math.abs(touch.clientX - startX);
      const diffY = Math.abs(touch.clientY - startY);
      
      // 如果移动超过阈值，取消长按
      if (diffX > 10 || diffY > 10) {
        if (pressTimer !== null) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
    };
    
    // 处理触摸结束
    const handleTouchEnd = (event: TouchEvent) => {
      if (opts.preventDefaultEvents) {
        event.preventDefault();
      }
      
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      
      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      const diffX = endX - startX;
      const diffY = endY - startY;
      const duration = endTime - startTime;
      
      // 检测滑动手势
      if (Math.abs(diffX) > opts.swipeThreshold || Math.abs(diffY) > opts.swipeThreshold) {
        isGestureDetected = true;
        
        if (handlers.onSwipe) {
          // 确定滑动方向
          let direction: SwipeDirection;
          if (Math.abs(diffX) > Math.abs(diffY)) {
            direction = diffX > 0 ? 'right' : 'left';
          } else {
            direction = diffY > 0 ? 'down' : 'up';
          }
          
          const distance = Math.sqrt(diffX * diffX + diffY * diffY);
          handlers.onSwipe({
            type: 'swipe',
            direction,
            distance,
            duration,
            x: endX,
            y: endY,
            originalEvent: event
          });
        }
      } 
      // 检测点击手势
      else if (!isGestureDetected && duration < 300) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTap;
        
        // 检测双击
        if (timeSinceLastTap < opts.doubleTapThreshold && timeSinceLastTap > 0) {
          if (handlers.onTap) {
            handlers.onTap({
              type: 'tap',
              x: endX,
              y: endY,
              originalEvent: event
            });
          }
        }
        
        // 更新最后点击时间
        lastTap = now;
      }
    };
    
    // 添加事件监听器
    const passive = !opts.preventDefaultEvents;
    el.addEventListener('touchstart', handleTouchStart, { passive });
    el.addEventListener('touchmove', handleTouchMove, { passive });
    el.addEventListener('touchend', handleTouchEnd, { passive });
    
    // 存储清理函数
    el._gestureCleanup = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
      }
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  },
  
  beforeUnmount(el: HTMLElement & { _gestureCleanup?: () => void }) {
    if (el._gestureCleanup) {
      el._gestureCleanup();
      delete el._gestureCleanup;
    }
  },
  
  updated(el: HTMLElement & { _gestureCleanup?: () => void }, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      // 清理旧事件监听器
      if (el._gestureCleanup) {
        el._gestureCleanup();
      }
      
      // 重新挂载
      vGesture.mounted(el, binding);
    }
  }
};

/**
 * 导出所有指令
 */
export default {
  vSwipe,
  vLongpress,
  vDoubleTap,
  vGesture
};