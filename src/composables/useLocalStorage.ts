/**
 * 本地存储组合式函数
 * 提供类型安全的本地存储访问
 */
export function useLocalStorage() {
  /**
   * 从本地存储获取项目
   * @param key - 存储键
   * @returns 解析后的值或null
   */
  const getItem = <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return null;
    }
  };

  /**
   * 设置本地存储项目
   * @param key - 存储键
   * @param value - 要存储的值
   */
  const setItem = <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
    }
  };

  /**
   * 从本地存储移除项目
   * @param key - 存储键
   */
  const removeItem = (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  };

  /**
   * 清除所有本地存储
   */
  const clear = (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  };

  return {
    getItem,
    setItem,
    removeItem,
    clear
  };
}