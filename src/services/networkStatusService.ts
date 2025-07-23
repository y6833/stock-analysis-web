/**
 * 网络状态服务
 * 负责监控网络状态并提供相关功能
 */

import { ref, computed } from 'vue';
import { registerNetworkListeners, isOnline } from './offlineDataService';

// 网络状态
const online = ref(isOnline());
// 网络质量
const networkQuality = ref<'good' | 'poor' | 'unknown'>('unknown');
// 网络类型
const connectionType = ref<string>('unknown');
// 最后一次测量的网络延迟（毫秒）
const latency = ref<number | null>(null);

// 网络状态变化监听器
let cleanupListener: (() => void) | null = null;

/**
 * 初始化网络状态监听
 */
export function initNetworkMonitoring() {
  // 清理之前的监听器
  if (cleanupListener) {
    cleanupListener();
  }

  // 注册新的监听器
  cleanupListener = registerNetworkListeners(
    () => {
      online.value = true;
      measureNetworkQuality();
    },
    () => {
      online.value = false;
      networkQuality.value = 'unknown';
      connectionType.value = 'unknown';
      latency.value = null;
    }
  );

  // 初始测量网络质量
  if (online.value) {
    measureNetworkQuality();
  }

  // 定期测量网络质量（每60秒）
  const intervalId = setInterval(() => {
    if (online.value) {
      measureNetworkQuality();
    }
  }, 60000);

  // 返回清理函数
  return () => {
    if (cleanupListener) {
      cleanupListener();
      cleanupListener = null;
    }
    clearInterval(intervalId);
  };
}

/**
 * 测量网络质量
 */
async function measureNetworkQuality() {
  try {
    // 获取连接信息（如果可用）
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        connectionType.value = conn.effectiveType || 'unknown';
        
        // 根据连接类型初步判断网络质量
        if (['slow-2g', '2g'].includes(conn.effectiveType)) {
          networkQuality.value = 'poor';
        } else if (['3g', '4g', '5g'].includes(conn.effectiveType)) {
          networkQuality.value = 'good';
        }
      }
    }

    // 测量延迟
    const start = Date.now();
    const response = await fetch('/api/ping', { 
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (response.ok) {
      latency.value = Date.now() - start;
      
      // 根据延迟进一步判断网络质量
      if (latency.value < 300) {
        networkQuality.value = 'good';
      } else if (latency.value > 1000) {
        networkQuality.value = 'poor';
      }
    }
  } catch (error) {
    console.warn('测量网络质量失败:', error);
    // 如果测量失败但仍然在线，可能是网络质量差
    if (online.value) {
      networkQuality.value = 'poor';
    }
  }
}

/**
 * 手动测量网络质量
 */
export async function checkNetworkQuality(): Promise<void> {
  if (online.value) {
    await measureNetworkQuality();
  }
}

/**
 * 获取当前网络状态
 */
export function useNetworkStatus() {
  const isOnline = computed(() => online.value);
  const isOffline = computed(() => !online.value);
  const isPoorConnection = computed(() => 
    online.value && networkQuality.value === 'poor'
  );

  return {
    isOnline,
    isOffline,
    isPoorConnection,
    networkQuality: computed(() => networkQuality.value),
    connectionType: computed(() => connectionType.value),
    latency: computed(() => latency.value),
    checkNetworkQuality
  };
}

/**
 * 获取适合当前网络状态的请求超时时间
 */
export function getNetworkAwareTimeout(): number {
  if (!online.value) {
    return 3000; // 离线状态下的短超时
  }
  
  if (networkQuality.value === 'poor') {
    return 15000; // 弱网络下的长超时
  }
  
  return 8000; // 正常网络下的标准超时
}

/**
 * 获取适合当前网络状态的图片质量
 * @returns 图片质量百分比 (0-100)
 */
export function getNetworkAwareImageQuality(): number {
  if (!online.value || networkQuality.value === 'poor') {
    return 60; // 弱网络下的低质量图片
  }
  
  return 90; // 正常网络下的高质量图片
}

/**
 * 获取适合当前网络状态的数据加载策略
 */
export function getNetworkAwareLoadingStrategy() {
  const baseStrategy = {
    useCache: true,
    loadEssentialFirst: true,
    batchSize: 20,
    prefetchDepth: 1
  };
  
  if (!online.value) {
    return {
      ...baseStrategy,
      useCache: true,
      batchSize: 10,
      prefetchDepth: 0
    };
  }
  
  if (networkQuality.value === 'poor') {
    return {
      ...baseStrategy,
      batchSize: 10,
      prefetchDepth: 0
    };
  }
  
  return baseStrategy;
}