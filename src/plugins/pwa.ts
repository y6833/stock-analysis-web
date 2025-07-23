/**
 * PWA插件
 * 负责注册和管理Service Worker
 */

import { ElMessage } from 'element-plus';

// Service Worker注册选项
const SW_OPTIONS = {
  scope: '/',
  updateViaCache: 'none' as const
};

// 注册Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('浏览器不支持Service Worker');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', SW_OPTIONS);
    console.log('Service Worker注册成功，作用域:', registration.scope);
    
    // 监听Service Worker更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新的Service Worker已安装，但尚未激活
          showUpdateNotification();
        }
      });
    });
    
    return registration;
  } catch (error) {
    console.error('Service Worker注册失败:', error);
    return null;
  }
}

// 检查Service Worker更新
export async function checkForUpdates(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('Service Worker更新检查完成');
    }
  } catch (error) {
    console.error('检查Service Worker更新时出错:', error);
  }
}

// 显示更新通知
function showUpdateNotification(): void {
  ElMessage({
    message: '应用有新版本可用，请刷新页面以更新。',
    type: 'info',
    duration: 0,
    showClose: true,
    customClass: 'sw-update-notification',
    dangerouslyUseHTMLString: true,
    onClose: () => {
      window.location.reload();
    }
  });
}

// 卸载Service Worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('Service Worker卸载' + (success ? '成功' : '失败'));
      return success;
    }
    return false;
  } catch (error) {
    console.error('卸载Service Worker时出错:', error);
    return false;
  }
}

// 请求推送通知权限
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('请求通知权限时出错:', error);
    return 'denied';
  }
}

// 订阅推送通知
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('浏览器不支持推送通知');
    return null;
  }
  
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('未获得通知权限');
      return null;
    }
    
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn('未找到Service Worker注册');
      return null;
    }
    
    // 应用服务器公钥（实际应用中应从服务器获取）
    const applicationServerKey = urlBase64ToUint8Array(
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    );
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
    
    console.log('成功订阅推送通知:', subscription);
    
    // 将订阅信息发送到服务器
    // await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('订阅推送通知时出错:', error);
    return null;
  }
}

// 取消订阅推送通知
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    
    const success = await subscription.unsubscribe();
    
    if (success) {
      console.log('成功取消订阅推送通知');
      // 通知服务器取消订阅
      // await sendUnsubscriptionToServer(subscription);
    }
    
    return success;
  } catch (error) {
    console.error('取消订阅推送通知时出错:', error);
    return false;
  }
}

// 将base64字符串转换为Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// 初始化PWA功能
export function initPwa(): void {
  // 注册Service Worker
  registerServiceWorker()
    .then((registration) => {
      if (registration) {
        // 定期检查更新（每小时）
        setInterval(() => checkForUpdates(), 60 * 60 * 1000);
      }
    })
    .catch((error) => {
      console.error('初始化PWA时出错:', error);
    });
  
  // 处理"添加到主屏幕"事件
  window.addEventListener('beforeinstallprompt', (event) => {
    // 阻止Chrome 67及更早版本自动显示安装提示
    event.preventDefault();
    
    // 存储事件以便稍后触发
    (window as any).deferredPrompt = event;
    
    // 可以在这里显示自定义的"添加到主屏幕"按钮
    console.log('可以添加到主屏幕');
  });
  
  // 处理PWA安装完成事件
  window.addEventListener('appinstalled', () => {
    console.log('PWA已成功安装');
    
    // 清除延迟的提示
    (window as any).deferredPrompt = null;
  });
}