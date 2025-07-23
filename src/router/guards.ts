/**
 * Unified Route Guards
 * Consolidates all route protection logic into a single, efficient system
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/services/authService'
import { tushareService } from '@/services/tushareService'
import { useUserStore } from '@/stores/userStore'
import pageService from '@/services/pageService'
import { MembershipLevel } from '@/constants/membership'

// Session storage for permission messages
const SESSION_STORAGE_KEY = 'shown_permission_messages'

// Track last path to avoid duplicate processing
let lastPath = ''

// Helper functions for permission message tracking
const getShownPermissionMessages = (): Set<string> => {
    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
        return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
        return new Set()
    }
}

const saveShownPermissionMessages = (messages: Set<string>): void => {
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...messages]))
    } catch (error) {
        console.error('Failed to save shown permission messages:', error)
    }
}

const hasShownPermissionMessage = (path: string): boolean => {
    return getShownPermissionMessages().has(path)
}

const markPermissionMessageShown = (path: string): void => {
    const messages = getShownPermissionMessages()
    messages.add(path)
    saveShownPermissionMessages(messages)
}

/**
 * Main route guard that handles all authentication and authorization
 */
export async function routeGuard(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) {
    // Prevent duplicate processing for same path
    if (to.path === from.path && to.path === lastPath) {
        console.log('[Route Guard] Same path redirect detected, allowing:', to.path)
        return next()
    }

    lastPath = to.path

    // Update current path for API call control
    if (to.path !== from.path) {
        tushareService.updateCurrentPath(to.path)
    }

    // Set page title
    if (to.meta.title) {
        document.title = `${to.meta.title} - 股票分析系统`
    }

    // Extract route metadata
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const hideForAuth = to.matched.some((record) => record.meta.hideForAuth)

    // Get user authentication status
    const isLoggedIn = authService.isLoggedIn()

    // 1. Handle unauthenticated access to protected routes
    if (requiresAuth && !isLoggedIn) {
        return next({
            name: 'login',
            query: { redirect: to.fullPath },
        })
    }

    // 2. Redirect authenticated users away from auth pages
    if (isLoggedIn && hideForAuth) {
        return next({ name: 'dashboard' })
    }

    // 3. All basic checks passed, continue to permission guard
    return next()
}

/**
 * Check membership-based access control
 */
async function checkMembershipAccess(
    to: RouteLocationNormalized,
    userStore: any
): Promise<boolean> {
    const requiredLevel = to.meta.requiredMembershipLevel as MembershipLevel
    const membershipLevel = to.meta.membershipLevel as string

    // Check new-style membership level requirements
    if (requiredLevel) {
        switch (requiredLevel) {
            case MembershipLevel.BASIC:
                return ['basic', 'premium', 'enterprise'].includes(userStore.membershipLevel)
            case MembershipLevel.PREMIUM:
                return ['premium', 'enterprise'].includes(userStore.membershipLevel)
            case MembershipLevel.ENTERPRISE:
                return userStore.membershipLevel === 'enterprise'
            default:
                return true
        }
    }

    // Check legacy-style membership level requirements
    if (membershipLevel) {
        switch (membershipLevel) {
            case 'basic':
                return ['basic', 'premium', 'enterprise'].includes(userStore.membershipLevel)
            case 'premium':
                return ['premium', 'enterprise'].includes(userStore.membershipLevel)
            case 'enterprise':
                return userStore.membershipLevel === 'enterprise'
            default:
                return true
        }
    }

    return true
}

/**
 * Navigation guard for development routes
 */
export function devRouteGuard(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) {
    // Only allow dev routes in development mode
    if (import.meta.env.PROD && to.path.startsWith('/dev')) {
        return next({ name: 'not-found' })
    }

    return next()
}

/**
 * After navigation guard for cleanup and analytics
 */
export function afterNavigationGuard(to: RouteLocationNormalized) {
    // Update document title
    if (to.meta.title) {
        document.title = `${to.meta.title} - 股票分析系统`
    }

    // Track page views (if analytics is enabled)
    if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        // Add analytics tracking here
        console.log('Page view:', to.path)
    }

    // Clear any temporary states
    // This could include clearing search queries, resetting forms, etc.
}

/**
 * Error handler for navigation failures
 */
export function navigationErrorHandler(error: any) {
    console.error('Navigation error:', error)

    // Handle specific error types
    if (error.name === 'NavigationDuplicated') {
        // Ignore duplicate navigation errors
        return
    }

    // Show user-friendly error message
    ElMessage({
        message: '页面导航失败，请刷新页面重试',
        type: 'error',
        duration: 5000,
    })
}