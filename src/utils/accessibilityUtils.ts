/**
 * 辅助功能工具函数
 * 提供用于增强应用程序可访问性的实用工具
 */

/**
 * 生成唯一的ID，用于ARIA属性
 * @param prefix - ID前缀
 * @returns 唯一ID字符串
 */
export function generateUniqueId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 处理键盘导航事件
 * @param event - 键盘事件
 * @param actions - 键盘操作映射
 */
export function handleKeyboardNavigation(
  event: KeyboardEvent,
  actions: Record<string, () => void>
): void {
  const key = event.key;
  
  if (actions[key]) {
    event.preventDefault();
    actions[key]();
  }
}

/**
 * 创建焦点陷阱，用于模态对话框等组件
 * @param containerRef - 容器元素引用
 * @param active - 是否激活焦点陷阱
 */
export function useFocusTrap(containerRef: HTMLElement | null, active: boolean): void {
  if (!containerRef || !active) return;
  
  const focusableElements = containerRef.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  // 自动聚焦第一个元素
  firstElement.focus();
  
  // 设置焦点循环
  containerRef.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  });
}

/**
 * 检查颜色对比度是否符合WCAG标准
 * @param foreground - 前景色 (十六进制)
 * @param background - 背景色 (十六进制)
 * @returns 对比度比率
 */
export function checkColorContrast(foreground: string, background: string): number {
  // 将十六进制颜色转换为RGB
  const hexToRgb = (hex: string): number[] => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    
    return result 
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] 
      : [0, 0, 0];
  };
  
  // 计算相对亮度
  const calculateLuminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map(value => {
      value /= 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  
  const foregroundLuminance = calculateLuminance(foregroundRgb);
  const backgroundLuminance = calculateLuminance(backgroundRgb);
  
  // 计算对比度
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 检查元素是否符合WCAG的目标尺寸要求
 * @param width - 元素宽度（像素）
 * @param height - 元素高度（像素）
 * @returns 是否符合要求
 */
export function checkTargetSize(width: number, height: number): boolean {
  // WCAG 2.1 AA要求交互元素至少为44x44像素
  return width >= 44 && height >= 44;
}

/**
 * 为元素添加屏幕阅读器专用文本
 * @param visualText - 视觉文本
 * @param screenReaderText - 屏幕阅读器文本
 * @returns 包含视觉和屏幕阅读器文本的HTML
 */
export function createAccessibleText(visualText: string, screenReaderText: string): string {
  return `
    ${visualText}
    <span class="sr-only">${screenReaderText}</span>
  `;
}

/**
 * 检查文本是否符合WCAG的文本间距要求
 * @param lineHeight - 行高（em）
 * @param letterSpacing - 字母间距（em）
 * @param wordSpacing - 单词间距（em）
 * @returns 是否符合要求
 */
export function checkTextSpacing(
  lineHeight: number,
  letterSpacing: number,
  wordSpacing: number
): boolean {
  // WCAG 2.1 AA要求
  return (
    lineHeight >= 1.5 &&
    letterSpacing >= 0.12 &&
    wordSpacing >= 0.16
  );
}