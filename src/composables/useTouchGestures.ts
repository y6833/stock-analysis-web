import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 手势事件类型
 */
export type GestureType = 'swipe' | 'tap' | 'longpress' | 'pinch' | 'rotate';

/**
 * 手势方向类型
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * 手势事件接口
 */
export interface GestureEvent {
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
export interface GestureOptions {
  swipeThreshold?: number;
  longpressThreshold?: number;
  doubleTapThreshold?: number;
  preventDefaultEvents?: boolean;
}

/**
 * 触摸手势组合式函数
 * 提供检测和处理常见触摸手势的功能
 */
export function useTouchGestures(options: GestureOptions = {}) {
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
  const touchStartTime = ref(0);
  const touchEndTime = ref(0);
  const startX = ref(0);
  const startY = ref(0);
  const lastTap = ref(0);
  const longPressTimer = ref<number | null>(null);
  
  // 手势状态
  const isGestureDetected = ref(false);
  const lastGesture = ref<GestureEvent | null>(null);
  
  // 事件回调
  const callbacks = {
    swipe: [] as ((event: GestureEvent) => void)[],
    tap: [] as ((event: GestureEvent) => void)[],
    longpress: [] as ((event: GestureEvent) => void)[],
    pinch: [] as ((event: GestureEvent) => void)[],
    rotate: [] as ((event: GestureEvent) => void)[],
  };
  
  // 处理触摸开始
  const handleTouchStart = (event: TouchEvent) => {
    if (opts.preventDefaultEvents) {
      event.preventDefault();
    }
    
    const touch = event.touches[0];
    startX.value = touch.clientX;
    startY.value = touch.clientY;
    touchStartTime.value = Date.now();
    isGestureDetected.value = false;
    
    // 设置长按定时器
    longPressTimer.value = window.setTimeout(() => {
      if (!isGestureDetected.value) {
        isGestureDetected.value = true;
        const gestureEvent: GestureEvent = {
          type: 'longpress',
          x: startX.value,
          y: startY.value,
          originalEvent: event
        };
        lastGesture.value = gestureEvent;
        callbacks.longpress.forEach(callback => callback(gestureEvent));
      }
    }, opts.longpressThreshold);
  };
  
  // 处理触摸移动
  const handleTouchMove = (event: TouchEvent) => {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
    
    // 这里可以添加拖动、缩放等手势的检测
    // 为了简化，我们只在触摸结束时检测滑动
  };
  
  // 处理触摸结束
  const handleTouchEnd = (event: TouchEvent) => {
    if (opts.preventDefaultEvents) {
      event.preventDefault();
    }
    
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
    
    touchEndTime.value = Date.now();
    const touch = event.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const diffX = endX - startX.value;
    const diffY = endY - startY.value;
    const duration = touchEndTime.value - touchStartTime.value;
    
    // 检测滑动手势
    if (Math.abs(diffX) > opts.swipeThreshold || Math.abs(diffY) > opts.swipeThreshold) {
      isGestureDetected.value = true;
      
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
      
      lastGesture.value = gestureEvent;
      callbacks.swipe.forEach(callback => callback(gestureEvent));
    } 
    // 检测点击手势
    else if (!isGestureDetected.value && duration < 300) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTap.value;
      
      // 单击
      const gestureEvent: GestureEvent = {
        type: 'tap',
        x: endX,
        y: endY,
        originalEvent: event
      };
      
      lastGesture.value = gestureEvent;
      callbacks.tap.forEach(callback => callback(gestureEvent));
      
      // 更新最后点击时间（用于检测双击）
      lastTap.value = now;
    }
  };
  
  // 处理多点触摸（缩放和旋转）
  const handleTouchPinch = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    
    // 计算两个触摸点之间的距离
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    // 计算旋转角度
    const angle = Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * 180 / Math.PI;
    
    // 这里可以添加缩放和旋转手势的检测逻辑
    // 为了完整实现，需要跟踪初始距离和角度，然后计算变化
  };
  
  // 注册事件监听器
  const registerEventListeners = (element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: !opts.preventDefaultEvents });
    element.addEventListener('touchmove', handleTouchMove, { passive: !opts.preventDefaultEvents });
    element.addEventListener('touchend', handleTouchEnd, { passive: !opts.preventDefaultEvents });
  };
  
  // 移除事件监听器
  const removeEventListeners = (element: HTMLElement) => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
  
  // 添加手势回调
  const on = (gestureType: GestureType, callback: (event: GestureEvent) => void) => {
    if (callbacks[gestureType]) {
      callbacks[gestureType].push(callback);
    }
    return () => off(gestureType, callback); // 返回取消订阅函数
  };
  
  // 移除手势回调
  const off = (gestureType: GestureType, callback: (event: GestureEvent) => void) => {
    if (callbacks[gestureType]) {
      const index = callbacks[gestureType].indexOf(callback);
      if (index !== -1) {
        callbacks[gestureType].splice(index, 1);
      }
    }
  };
  
  // 提供一个方法来设置目标元素
  const setupGestures = (element: HTMLElement) => {
    registerEventListeners(element);
    
    // 返回清理函数
    return () => {
      removeEventListeners(element);
    };
  };
  
  return {
    on,
    off,
    setupGestures,
    lastGesture
  };
}