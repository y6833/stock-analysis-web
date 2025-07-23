// Service Worker for 快乐股市 PWA

const CACHE_NAME = 'happy-stock-market-v1';
const OFFLINE_URL = '/offline.html';

// 需要缓存的资源列表
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS和JS文件会在运行时由workbox自动缓存
];

// 安装事件 - 预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 预缓存资源');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // 强制激活，不等待旧的service worker终止
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存 ' + cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 确保立即接管所有客户端
      return self.clients.claim();
    })
  );
});

// 请求拦截 - 实现离线优先策略
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求和浏览器扩展请求
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 处理API请求 - 网络优先，失败时返回缓存
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetchWithNetworkFallbackToCache(event.request)
    );
    return;
  }

  // 处理静态资源 - 缓存优先，失败时回退到网络
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        // 如果缓存中没有，则从网络获取
        return fetch(event.request)
          .then((networkResponse) => {
            // 检查响应是否有效
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 将响应复制一份，一份用于返回，一份用于缓存
            const responseToCache = networkResponse.clone();
            
            // 将获取的资源添加到缓存中
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // 如果是HTML请求，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // 其他资源请求失败时，可以返回一个默认资源
            // 例如，图片请求失败时返回一个默认图片
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/icons/offline-image.png');
            }
            
            // 其他资源请求失败时，返回一个空响应
            return new Response('', {
              status: 408,
              statusText: '请求超时 - 离线模式'
            });
          });
      })
  );
});

// 网络优先，失败时返回缓存的函数
function fetchWithNetworkFallbackToCache(request) {
  return fetch(request)
    .then((networkResponse) => {
      // 检查响应是否有效
      if (!networkResponse || networkResponse.status !== 200) {
        throw new Error('Network response was not ok');
      }
      
      // 将响应复制一份，一份用于返回，一份用于缓存
      const responseToCache = networkResponse.clone();
      
      // 更新缓存
      caches.open(CACHE_NAME)
        .then((cache) => {
          cache.put(request, responseToCache);
        });
      
      return networkResponse;
    })
    .catch(() => {
      // 网络请求失败时，尝试从缓存获取
      return caches.match(request)
        .then((cachedResponse) => {
          // 如果缓存中有响应，返回缓存的响应
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 如果缓存中没有，返回一个JSON格式的错误响应
          if (request.headers.get('accept').includes('application/json')) {
            return new Response(JSON.stringify({
              error: true,
              message: '您当前处于离线状态，无法获取最新数据。'
            }), {
              status: 503,
              statusText: '服务不可用 - 离线模式',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          // 其他类型的请求返回一个通用错误
          return new Response('离线模式：无法获取数据', {
            status: 503,
            statusText: '服务不可用 - 离线模式'
          });
        });
    });
}

// 后台同步 - 用于在恢复网络连接时同步数据
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncWatchlist());
  } else if (event.tag === 'sync-portfolio') {
    event.waitUntil(syncPortfolio());
  }
});

// 同步关注列表数据
async function syncWatchlist() {
  try {
    const db = await openIndexedDB();
    const pendingChanges = await db.getAll('pendingWatchlistChanges');
    
    if (pendingChanges.length === 0) return;
    
    // 处理每个待处理的变更
    for (const change of pendingChanges) {
      try {
        const response = await fetch('/api/v1/watchlist', {
          method: change.method,
          headers: {
            'Content-Type': 'application/json',
            // 添加认证头
            'Authorization': `Bearer ${change.token}`
          },
          body: change.method !== 'DELETE' ? JSON.stringify(change.data) : undefined
        });
        
        if (response.ok) {
          // 如果同步成功，从待处理列表中删除
          await db.delete('pendingWatchlistChanges', change.id);
        }
      } catch (error) {
        console.error('同步关注列表项失败:', error);
      }
    }
  } catch (error) {
    console.error('同步关注列表时出错:', error);
  }
}

// 同步投资组合数据
async function syncPortfolio() {
  try {
    const db = await openIndexedDB();
    const pendingChanges = await db.getAll('pendingPortfolioChanges');
    
    if (pendingChanges.length === 0) return;
    
    // 处理每个待处理的变更
    for (const change of pendingChanges) {
      try {
        const response = await fetch('/api/v1/portfolio', {
          method: change.method,
          headers: {
            'Content-Type': 'application/json',
            // 添加认证头
            'Authorization': `Bearer ${change.token}`
          },
          body: change.method !== 'DELETE' ? JSON.stringify(change.data) : undefined
        });
        
        if (response.ok) {
          // 如果同步成功，从待处理列表中删除
          await db.delete('pendingPortfolioChanges', change.id);
        }
      } catch (error) {
        console.error('同步投资组合项失败:', error);
      }
    }
  } catch (error) {
    console.error('同步投资组合时出错:', error);
  }
}

// 打开IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('happyStockMarketDB', 1);
    
    request.onerror = () => {
      reject(new Error('无法打开IndexedDB'));
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 创建存储待同步的关注列表变更的对象存储
      if (!db.objectStoreNames.contains('pendingWatchlistChanges')) {
        db.createObjectStore('pendingWatchlistChanges', { keyPath: 'id' });
      }
      
      // 创建存储待同步的投资组合变更的对象存储
      if (!db.objectStoreNames.contains('pendingPortfolioChanges')) {
        db.createObjectStore('pendingPortfolioChanges', { keyPath: 'id' });
      }
      
      // 创建存储离线数据的对象存储
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
}

// 推送通知
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || '有新的股票更新',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '快乐股市通知', options)
    );
  } catch (error) {
    console.error('处理推送通知时出错:', error);
  }
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // 如果已经有打开的窗口，则导航到URL
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 否则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});