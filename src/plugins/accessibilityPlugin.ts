import { App } from 'vue';
import accessibilityDirectives from '@/directives/accessibilityDirectives';
import touchGestureDirectives from '@/directives/touchGestureDirectives';

/**
 * 辅助功能插件
 * 注册所有辅助功能和触摸手势指令
 */
export default {
  install: (app: App) => {
    // 注册辅助功能指令
    app.directive('focus-trap', accessibilityDirectives.vFocusTrap);
    app.directive('touch-feedback', accessibilityDirectives.vTouchFeedback);
    app.directive('a11y-label', accessibilityDirectives.vA11yLabel);
    app.directive('a11y-describe', accessibilityDirectives.vA11yDescribe);
    app.directive('key-nav', accessibilityDirectives.vKeyNav);
    
    // 注册触摸手势指令
    app.directive('swipe', touchGestureDirectives.vSwipe);
    app.directive('longpress', touchGestureDirectives.vLongpress);
    app.directive('double-tap', touchGestureDirectives.vDoubleTap);
    app.directive('gesture', touchGestureDirectives.vGesture);
    
    // 添加全局属性
    app.config.globalProperties.$a11y = {
      /**
       * 创建屏幕阅读器专用文本
       * @param visualText - 视觉文本
       * @param screenReaderText - 屏幕阅读器文本
       * @returns HTML字符串
       */
      createAccessibleText: (visualText: string, screenReaderText: string): string => {
        return `
          ${visualText}
          <span class="sr-only">${screenReaderText}</span>
        `;
      },
      
      /**
       * 生成唯一的ARIA ID
       * @param prefix - ID前缀
       * @returns 唯一ID字符串
       */
      generateId: (prefix: string = 'aria'): string => {
        return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
      }
    };
    
    // 添加全局组件属性
    app.mixin({
      mounted() {
        // 为所有具有role="button"但不是实际按钮的元素添加键盘支持
        const buttonRoles = this.$el?.querySelectorAll 
          ? this.$el.querySelectorAll('[role="button"]:not(button)')
          : [];
          
        buttonRoles.forEach((el: HTMLElement) => {
          if (!el.getAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
          }
          
          const clickHandler = el.onclick || el.getAttribute('onClick');
          if (clickHandler) {
            el.addEventListener('keydown', (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                el.click();
              }
            });
          }
        });
      }
    });
    
    // 添加全局CSS
    const accessibilityStyles = document.createElement('link');
    accessibilityStyles.rel = 'stylesheet';
    accessibilityStyles.href = '/src/assets/styles/accessibility.css';
    document.head.appendChild(accessibilityStyles);
    
    const responsiveStyles = document.createElement('link');
    responsiveStyles.rel = 'stylesheet';
    responsiveStyles.href = '/src/assets/styles/responsive.css';
    document.head.appendChild(responsiveStyles);
    
    // 添加跳过导航链接
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = '跳到主要内容';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // 设置主内容区域的ID
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.id = 'main-content';
      mainContent.setAttribute('tabindex', '-1');
    }
    
    // 检测系统偏好
    const checkSystemPreferences = () => {
      // 检测减少动画偏好
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
      }
      
      // 检测高对比度偏好
      if (window.matchMedia('(prefers-contrast: more)').matches) {
        document.documentElement.classList.add('high-contrast');
      }
      
      // 检测是否为触摸设备
      if ('ontouchstart' in window || 
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0) {
        document.documentElement.classList.add('touch-device');
      }
    };
    
    checkSystemPreferences();
    
    // 修复iOS Safari中的vh单位问题
    const fixViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    fixViewportHeight();
    window.addEventListener('resize', fixViewportHeight);
    
    // 监听系统偏好变化
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', checkSystemPreferences);
    window.matchMedia('(prefers-contrast: more)').addEventListener('change', checkSystemPreferences);
  }
};