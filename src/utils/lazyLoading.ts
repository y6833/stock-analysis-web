/**
 * 资源懒加载工具
 * 提供预加载、预获取和懒加载功能
 */

/**
 * 预加载组件
 * @param viewPath 组件路径
 */
export const preloadView = (viewPath: string): void => {
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = viewPath;
    document.head.appendChild(prefetchLink);
};

/**
 * 预获取组件
 * @param viewPath 组件路径
 */
export const prefetchView = (viewPath: string): void => {
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.as = 'script';
    prefetchLink.href = viewPath;
    document.head.appendChild(prefetchLink);
};

/**
 * 带有加载状态的动态导入
 * @param importFn 导入函数
 * @returns 带有加载状态的组件
 */
export const lazyLoadView = (importFn: () => Promise<any>) => {
    const AsyncComponent = () => ({
        component: importFn(),
        loading: {
            template: `
        <div class="lazy-loading-wrapper">
          <div class="lazy-loading-spinner"></div>
          <div class="lazy-loading-text">加载中...</div>
        </div>
      `,
        },
        delay: 200,
        timeout: 10000,
    });

    return AsyncComponent;
};

/**
 * 预加载关键路由
 * 在应用启动时预加载最常用的路由
 */
export const preloadCriticalRoutes = (): void => {
    // 预加载关键路由
    const criticalRoutes = [
        '/src/views/HomeView.vue',
        '/src/views/DashboardView.vue',
        '/src/views/StockAnalysisView.vue',
        '/src/views/auth/LoginView.vue',
    ];

    // 延迟预加载，避免影响初始加载性能
    setTimeout(() => {
        criticalRoutes.forEach(route => {
            preloadView(route);
        });
    }, 1000);
};

/**
 * 根据用户行为智能预加载
 * @param routeName 当前路由名称
 */
export const smartPreload = (routeName: string): void => {
    // 根据当前路由预测可能的下一个路由
    const preloadMap: Record<string, string[]> = {
        'home': ['/src/views/DashboardView.vue', '/src/views/auth/LoginView.vue'],
        'login': ['/src/views/DashboardView.vue', '/src/views/auth/RegisterView.vue'],
        'dashboard': ['/src/views/StockAnalysisView.vue', '/src/views/WatchlistView.vue'],
        'stock': ['/src/views/StockMonitorView.vue', '/src/views/MarketHeatmapView.vue'],
    };

    const routesToPreload = preloadMap[routeName];
    if (routesToPreload) {
        // 延迟预加载，避免影响当前页面渲染
        setTimeout(() => {
            routesToPreload.forEach(route => {
                prefetchView(route);
            });
        }, 300);
    }
};