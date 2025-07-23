/**
 * 资源预加载工具
 * 用于预加载关键资源，提高用户体验
 */

// 资源类型
type ResourceType = 'script' | 'style' | 'image' | 'font' | 'fetch';

// 预加载资源配置
interface PreloadConfig {
    url: string;
    type: ResourceType;
    importance?: 'high' | 'low' | 'auto';
    as?: string;
}

/**
 * 预加载单个资源
 * @param config 预加载配置
 */
export const preloadResource = (config: PreloadConfig): void => {
    const { url, type, importance = 'auto', as } = config;

    // 创建link元素
    const link = document.createElement('link');

    // 设置通用属性
    link.href = url;
    link.rel = 'preload';

    // 设置资源类型
    if (as) {
        link.setAttribute('as', as);
    } else {
        switch (type) {
            case 'script':
                link.setAttribute('as', 'script');
                break;
            case 'style':
                link.setAttribute('as', 'style');
                break;
            case 'image':
                link.setAttribute('as', 'image');
                break;
            case 'font':
                link.setAttribute('as', 'font');
                link.setAttribute('crossorigin', 'anonymous');
                break;
            case 'fetch':
                link.setAttribute('as', 'fetch');
                break;
        }
    }

    // 设置重要性
    link.setAttribute('importance', importance);

    // 添加到文档头部
    document.head.appendChild(link);
};

/**
 * 预获取资源（低优先级预加载）
 * @param url 资源URL
 * @param type 资源类型
 */
export const prefetchResource = (url: string, type: ResourceType): void => {
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'prefetch';

    switch (type) {
        case 'script':
            link.setAttribute('as', 'script');
            break;
        case 'style':
            link.setAttribute('as', 'style');
            break;
        case 'image':
            link.setAttribute('as', 'image');
            break;
        case 'font':
            link.setAttribute('as', 'font');
            link.setAttribute('crossorigin', 'anonymous');
            break;
        case 'fetch':
            link.setAttribute('as', 'fetch');
            break;
    }

    document.head.appendChild(link);
};

/**
 * 预连接到域名
 * @param domain 域名URL
 * @param crossorigin 是否跨域
 */
export const preconnect = (domain: string, crossorigin = false): void => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;

    if (crossorigin) {
        link.setAttribute('crossorigin', 'anonymous');
    }

    document.head.appendChild(link);
};

/**
 * DNS预解析
 * @param domain 域名
 */
export const dnsPrefetch = (domain: string): void => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
};

/**
 * 预加载关键资源
 * 应用启动时调用
 */
export const preloadCriticalResources = (): void => {
    // 预连接到关键域名
    preconnect('https://fonts.googleapis.com', true);
    preconnect('https://cdn.jsdelivr.net', true);

    // DNS预解析
    dnsPrefetch('https://api.example.com');

    // 预加载关键CSS
    preloadResource({
        url: '/assets/css/main.css',
        type: 'style',
        importance: 'high'
    });

    // 预加载logo
    preloadResource({
        url: '/assets/images/logo.png',
        type: 'image',
        importance: 'high'
    });

    // 预加载字体
    preloadResource({
        url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
        type: 'style',
        importance: 'high'
    });
};

/**
 * 根据用户行为智能预加载资源
 * @param routeName 当前路由名称
 */
export const smartPreloadResources = (routeName: string): void => {
    // 根据当前路由预测可能需要的资源
    const resourceMap: Record<string, Array<{ url: string, type: ResourceType }>> = {
        'dashboard': [
            { url: '/assets/js/chart-vendor.js', type: 'script' },
            { url: '/assets/images/dashboard-icons.png', type: 'image' }
        ],
        'stock': [
            { url: '/assets/js/chart-vendor.js', type: 'script' },
            { url: '/assets/js/stock-analysis.js', type: 'script' }
        ],
        'watchlist': [
            { url: '/assets/js/watchlist.js', type: 'script' },
            { url: '/assets/css/watchlist.css', type: 'style' }
        ]
    };

    const resourcesToPreload = resourceMap[routeName];
    if (resourcesToPreload) {
        // 延迟预加载，避免影响当前页面渲染
        setTimeout(() => {
            resourcesToPreload.forEach(resource => {
                prefetchResource(resource.url, resource.type);
            });
        }, 300);
    }
};