/**
 * 离线数据服务
 * 负责管理应用程序的离线数据存储和同步
 */

import { v4 as uuidv4 } from 'uuid';

// 数据库名称和版本
const DB_NAME = 'happyStockMarketDB';
const DB_VERSION = 1;

// 存储对象名称
const STORES = {
  OFFLINE_DATA: 'offlineData',
  PENDING_WATCHLIST: 'pendingWatchlistChanges',
  PENDING_PORTFOLIO: 'pendingPortfolioChanges'
};

// 打开IndexedDB数据库
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('无法打开IndexedDB数据库'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建存储离线数据的对象存储
      if (!db.objectStoreNames.contains(STORES.OFFLINE_DATA)) {
        db.createObjectStore(STORES.OFFLINE_DATA, { keyPath: 'key' });
      }

      // 创建存储待同步的关注列表变更的对象存储
      if (!db.objectStoreNames.contains(STORES.PENDING_WATCHLIST)) {
        db.createObjectStore(STORES.PENDING_WATCHLIST, { keyPath: 'id' });
      }

      // 创建存储待同步的投资组合变更的对象存储
      if (!db.objectStoreNames.contains(STORES.PENDING_PORTFOLIO)) {
        db.createObjectStore(STORES.PENDING_PORTFOLIO, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 保存数据到离线存储
 * @param key 数据键
 * @param data 要存储的数据
 */
export async function saveOfflineData(key: string, data: any): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.OFFLINE_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_DATA);

    return new Promise((resolve, reject) => {
      const request = store.put({
        key,
        data,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`保存离线数据失败: ${key}`));
    });
  } catch (error) {
    console.error('保存离线数据时出错:', error);
    throw error;
  }
}

/**
 * 从离线存储获取数据
 * @param key 数据键
 */
export async function getOfflineData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.OFFLINE_DATA], 'readonly');
    const store = transaction.objectStore(STORES.OFFLINE_DATA);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };

      request.onerror = () => reject(new Error(`获取离线数据失败: ${key}`));
    });
  } catch (error) {
    console.error('获取离线数据时出错:', error);
    return null;
  }
}

/**
 * 删除离线存储中的数据
 * @param key 数据键
 */
export async function removeOfflineData(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.OFFLINE_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_DATA);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`删除离线数据失败: ${key}`));
    });
  } catch (error) {
    console.error('删除离线数据时出错:', error);
    throw error;
  }
}

/**
 * 获取所有离线数据的键
 */
export async function getAllOfflineDataKeys(): Promise<string[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.OFFLINE_DATA], 'readonly');
    const store = transaction.objectStore(STORES.OFFLINE_DATA);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => reject(new Error('获取所有离线数据键失败'));
    });
  } catch (error) {
    console.error('获取所有离线数据键时出错:', error);
    return [];
  }
}

/**
 * 保存待同步的关注列表变更
 * @param method HTTP方法
 * @param data 请求数据
 * @param token 认证令牌
 */
export async function savePendingWatchlistChange(method: string, data: any, token: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.PENDING_WATCHLIST], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_WATCHLIST);

    return new Promise((resolve, reject) => {
      const request = store.add({
        id: uuidv4(),
        method,
        data,
        token,
        timestamp: Date.now()
      });

      request.onsuccess = () => {
        // 尝试注册后台同步
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then(registration => registration.sync.register('sync-watchlist'))
            .catch(err => console.error('注册后台同步失败:', err));
        }
        resolve();
      };

      request.onerror = () => reject(new Error('保存待同步的关注列表变更失败'));
    });
  } catch (error) {
    console.error('保存待同步的关注列表变更时出错:', error);
    throw error;
  }
}

/**
 * 保存待同步的投资组合变更
 * @param method HTTP方法
 * @param data 请求数据
 * @param token 认证令牌
 */
export async function savePendingPortfolioChange(method: string, data: any, token: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.PENDING_PORTFOLIO], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_PORTFOLIO);

    return new Promise((resolve, reject) => {
      const request = store.add({
        id: uuidv4(),
        method,
        data,
        token,
        timestamp: Date.now()
      });

      request.onsuccess = () => {
        // 尝试注册后台同步
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then(registration => registration.sync.register('sync-portfolio'))
            .catch(err => console.error('注册后台同步失败:', err));
        }
        resolve();
      };

      request.onerror = () => reject(new Error('保存待同步的投资组合变更失败'));
    });
  } catch (error) {
    console.error('保存待同步的投资组合变更时出错:', error);
    throw error;
  }
}

/**
 * 获取网络状态
 * @returns 是否在线
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * 注册网络状态变化监听器
 * @param onlineCallback 在线回调
 * @param offlineCallback 离线回调
 */
export function registerNetworkListeners(
  onlineCallback: () => void,
  offlineCallback: () => void
): () => void {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);

  // 返回一个清理函数
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}

/**
 * 检查是否支持PWA功能
 */
export function isPwaSupported(): boolean {
  return 'serviceWorker' in navigator && 'caches' in window;
}

/**
 * 检查是否支持后台同步
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * 检查是否支持推送通知
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * 清除所有离线数据
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORES.OFFLINE_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_DATA);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('清除所有离线数据失败'));
    });
  } catch (error) {
    console.error('清除所有离线数据时出错:', error);
    throw error;
  }
}