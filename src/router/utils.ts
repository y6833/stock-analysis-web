/**
 * Router Utilities
 * Common routing operations and helpers
 */

import type { RouteLocationRaw, Router } from 'vue-router'
import { ElMessage } from 'element-plus'

/**
 * Safe navigation with error handling
 */
export async function safeNavigate(
    router: Router,
    to: RouteLocationRaw,
    options?: {
        replace?: boolean
        showError?: boolean
        fallback?: RouteLocationRaw
    }
): Promise<boolean> {
    try {
        if (options?.replace) {
            await router.replace(to)
        } else {
            await router.push(to)
        }
        return true
    } catch (error: any) {
        console.error('Navigation failed:', error)

        if (options?.showError !== false) {
            ElMessage({
                message: '页面跳转失败，请重试',
                type: 'error',
                duration: 3000,
            })
        }

        // Try fallback navigation
        if (options?.fallback) {
            try {
                await router.push(options.fallback)
                return true
            } catch (fallbackError) {
                console.error('Fallback navigation failed:', fallbackError)
            }
        }

        return false
    }
}

/**
 * Navigate with authentication check
 */
export async function navigateWithAuth(
    router: Router,
    to: RouteLocationRaw,
    options?: {
        loginRedirect?: boolean
        showMessage?: boolean
    }
): Promise<boolean> {
    // Import userService dynamically to avoid circular dependencies
    const { userService } = await import('@/services/userService')

    if (!userService.isLoggedIn()) {
        if (options?.showMessage !== false) {
            ElMessage({
                message: '请先登录',
                type: 'warning',
                duration: 3000,
            })
        }

        if (options?.loginRedirect !== false) {
            return safeNavigate(router, {
                name: 'login',
                query: { redirect: typeof to === 'string' ? to : router.resolve(to).fullPath }
            })
        }

        return false
    }

    return safeNavigate(router, to)
}

/**
 * Navigate with membership check
 */
export async function navigateWithMembership(
    router: Router,
    to: RouteLocationRaw,
    requiredLevel: 'basic' | 'premium' | 'enterprise',
    options?: {
        showMessage?: boolean
        upgradeRedirect?: boolean
    }
): Promise<boolean> {
    // Import stores dynamically to avoid circular dependencies
    const { useUserStore } = await import('@/stores/userStore')
    const userStore = useUserStore()

    if (!userStore.isAuthenticated) {
        return navigateWithAuth(router, to)
    }

    // Check membership level
    const hasAccess = checkMembershipLevel(userStore.membershipLevel, requiredLevel)

    if (!hasAccess) {
        if (options?.showMessage !== false) {
            ElMessage({
                message: `此功能需要${getMembershipLevelName(requiredLevel)}会员`,
                type: 'warning',
                duration: 5000,
            })
        }

        if (options?.upgradeRedirect !== false) {
            return safeNavigate(router, {
                path: '/membership-features',
                query: { redirect: typeof to === 'string' ? to : router.resolve(to).fullPath }
            })
        }

        return false
    }

    return safeNavigate(router, to)
}

/**
 * Check if user has required membership level
 */
export function checkMembershipLevel(
    userLevel: string,
    requiredLevel: 'basic' | 'premium' | 'enterprise'
): boolean {
    const levels = ['free', 'basic', 'premium', 'enterprise']
    const userLevelIndex = levels.indexOf(userLevel)
    const requiredLevelIndex = levels.indexOf(requiredLevel)

    return userLevelIndex >= requiredLevelIndex
}

/**
 * Get membership level display name
 */
export function getMembershipLevelName(level: string): string {
    const names: Record<string, string> = {
        free: '免费',
        basic: '基础',
        premium: '高级',
        enterprise: '企业'
    }
    return names[level] || level
}

/**
 * Generate breadcrumb from route
 */
export function generateBreadcrumb(route: any): Array<{ name: string; path?: string }> {
    const breadcrumb: Array<{ name: string; path?: string }> = []

    // Add home
    breadcrumb.push({ name: '首页', path: '/' })

    // Process route segments
    const segments = route.path.split('/').filter(Boolean)
    let currentPath = ''

    for (let i = 0; i < segments.length; i++) {
        currentPath += '/' + segments[i]
        const segment = segments[i]

        // Skip certain segments
        if (['dev', 'auth'].includes(segment)) continue

        // Get display name for segment
        const name = getSegmentDisplayName(segment, route)
        if (name) {
            breadcrumb.push({
                name,
                path: i === segments.length - 1 ? undefined : currentPath
            })
        }
    }

    return breadcrumb
}

/**
 * Get display name for route segment
 */
function getSegmentDisplayName(segment: string, route: any): string {
    const segmentNames: Record<string, string> = {
        dashboard: '仪表盘',
        stock: '股票分析',
        market: '市场分析',
        portfolio: '投资组合',
        strategies: '交易策略',
        backtest: '策略回测',
        alerts: '价格提醒',
        'doji-pattern': '十字星',
        risk: '风险管理',
        tools: '工具',
        user: '用户中心',
        membership: '会员中心',
        settings: '设置',
        admin: '管理后台',
        heatmap: '热力图',
        industry: '行业分析',
        scanner: '扫描器',
        monitor: '监控',
        'turtle-trading': '海龟交易法',
        'smart-recommendation': '智能推荐',
        professional: '专业版',
        screener: '筛选器',
        monitoring: '监控',
        simulation: '模拟',
        export: '导出',
        profile: '个人资料',
        notifications: '通知',
        'recharge-records': '充值记录',
        'data-source': '数据源',
        cache: '缓存',
    }

    return segmentNames[segment] || route.meta?.title || segment
}

/**
 * Check if route is active (for navigation highlighting)
 */
export function isRouteActive(currentPath: string, targetPath: string, exact = false): boolean {
    if (exact) {
        return currentPath === targetPath
    }

    // Handle root path specially
    if (targetPath === '/') {
        return currentPath === '/'
    }

    return currentPath.startsWith(targetPath)
}

/**
 * Get route meta information
 */
export function getRouteMeta(route: any) {
    return {
        title: route.meta?.title || '',
        requiresAuth: route.meta?.requiresAuth || false,
        requiresAdmin: route.meta?.requiresAdmin || false,
        membershipLevel: route.meta?.requiredMembershipLevel || route.meta?.membershipLevel,
        breadcrumb: generateBreadcrumb(route),
    }
}

/**
 * Preload route component
 */
export async function preloadRoute(router: Router, routeName: string): Promise<boolean> {
    try {
        const route = router.resolve({ name: routeName })
        if (route.matched.length > 0) {
            // Trigger lazy loading of the component
            const component = route.matched[route.matched.length - 1].components?.default
            if (typeof component === 'function') {
                await component()
            }
            return true
        }
        return false
    } catch (error) {
        console.error('Failed to preload route:', routeName, error)
        return false
    }
}

/**
 * Get all routes with specific meta property
 */
export function getRoutesByMeta(router: Router, metaKey: string, metaValue?: any): any[] {
    const routes: any[] = []

    function traverseRoutes(routeList: any[]) {
        for (const route of routeList) {
            if (route.meta && route.meta[metaKey] !== undefined) {
                if (metaValue === undefined || route.meta[metaKey] === metaValue) {
                    routes.push(route)
                }
            }

            if (route.children) {
                traverseRoutes(route.children)
            }
        }
    }

    traverseRoutes(router.getRoutes())
    return routes
}