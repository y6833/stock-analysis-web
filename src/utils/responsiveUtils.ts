/**
 * 响应式设计工具函数
 * 提供用于增强应用程序响应式设计的实用工具
 */
import { ref, onMounted, onUnmounted } from 'vue';

// 断点定义（像素）
export const breakpoints = {
  xs: 0,      // 超小屏幕（手机竖屏）
  sm: 576,    // 小屏幕（手机横屏）
  md: 768,    // 中等屏幕（平板竖屏）
  lg: 992,    // 大屏幕（平板横屏/小型笔记本）
  xl: 1200,   // 超大屏幕（桌面显示器）
  xxl: 1600   // 特大屏幕（大型显示器）
};

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 使用响应式断点
 * @returns 当前活动的断点和设备类型
 */
export function useBreakpoints() {
  const currentBreakpoint = ref<keyof typeof breakpoints>('xs');
  const width = ref(0);
  const deviceType = ref<DeviceType>('mobile');
  
  const updateBreakpoint = () => {
    width.value = window.innerWidth;
    
    if (width.value >= breakpoints.xxl) {
      currentBreakpoint.value = 'xxl';
      deviceType.value = 'desktop';
    } else if (width.value >= breakpoints.xl) {
      currentBreakpoint.value = 'xl';
      deviceType.value = 'desktop';
    } else if (width.value >= breakpoints.lg) {
      currentBreakpoint.value = 'lg';
      deviceType.value = 'desktop';
    } else if (width.value >= breakpoints.md) {
      currentBreakpoint.value = 'md';
      deviceType.value = 'tablet';
    } else if (width.value >= breakpoints.sm) {
      currentBreakpoint.value = 'sm';
      deviceType.value = 'mobile';
    } else {
      currentBreakpoint.value = 'xs';
      deviceType.value = 'mobile';
    }
  };
  
  onMounted(() => {
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateBreakpoint);
  });
  
  return {
    width,
    currentBreakpoint,
    deviceType,
    isMobile: () => deviceType.value === 'mobile',
    isTablet: () => deviceType.value === 'tablet',
    isDesktop: () => deviceType.value === 'desktop',
    isAtLeast: (size: keyof typeof breakpoints) => width.value >= breakpoints[size],
    isAtMost: (size: keyof typeof breakpoints) => width.value < breakpoints[size]
  };
}

/**
 * 使用触摸交互检测
 * @returns 触摸交互状态和工具函数
 */
export function useTouchInteraction() {
  const isTouchDevice = ref(false);
  const touchStartX = ref(0);
  const touchStartY = ref(0);
  const touchEndX = ref(0);
  const touchEndY = ref(0);
  
  const updateTouchDevice = () => {
    isTouchDevice.value = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;
  };
  
  onMounted(() => {
    updateTouchDevice();
  });
  
  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.value = event.touches[0].clientX;
    touchStartY.value = event.touches[0].clientY;
  };
  
  const handleTouchEnd = (event: TouchEvent) => {
    touchEndX.value = event.changedTouches[0].clientX;
    touchEndY.value = event.changedTouches[0].clientY;
  };
  
  const getSwipeDirection = (): string | null => {
    const xDiff = touchEndX.value - touchStartX.value;
    const yDiff = touchEndY.value - touchStartY.value;
    
    // 确保有足够的移动距离才算作滑动
    const minSwipeDistance = 50;
    
    if (Math.abs(xDiff) < minSwipeDistance && Math.abs(yDiff) < minSwipeDistance) {
      return null;
    }
    
    // 判断主要方向
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      return xDiff > 0 ? 'right' : 'left';
    } else {
      return yDiff > 0 ? 'down' : 'up';
    }
  };
  
  return {
    isTouchDevice,
    handleTouchStart,
    handleTouchEnd,
    getSwipeDirection
  };
}

/**
 * 使用视口单位修复（解决移动浏览器中vh单位的问题）
 */
export function useViewportUnits() {
  const updateViewportHeight = () => {
    // 获取实际视口高度
    const vh = window.innerHeight * 0.01;
    // 设置CSS变量
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  onMounted(() => {
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateViewportHeight);
  });
}

/**
 * 检测设备方向
 * @returns 设备方向状态
 */
export function useDeviceOrientation() {
  const orientation = ref<'portrait' | 'landscape'>('portrait');
  
  const updateOrientation = () => {
    if (window.matchMedia("(orientation: portrait)").matches) {
      orientation.value = 'portrait';
    } else {
      orientation.value = 'landscape';
    }
  };
  
  onMounted(() => {
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    
    // 使用方向变化事件（如果可用）
    if ('onorientationchange' in window) {
      window.addEventListener('orientationchange', updateOrientation);
    }
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateOrientation);
    
    if ('onorientationchange' in window) {
      window.removeEventListener('orientationchange', updateOrientation);
    }
  });
  
  return {
    orientation,
    isPortrait: () => orientation.value === 'portrait',
    isLandscape: () => orientation.value === 'landscape'
  };
}