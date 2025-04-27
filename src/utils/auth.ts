/**
 * 认证相关工具函数
 */

// Token 存储的键名
const TOKEN_KEY = 'auth_token'
const USER_INFO_KEY = 'user_info'

/**
 * 获取 Token
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 设置 Token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除 Token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 获取用户信息
 */
export function getUserInfo(): any {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY)
  return userInfoStr ? JSON.parse(userInfoStr) : null
}

/**
 * 设置用户信息
 */
export function setUserInfo(userInfo: any): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

/**
 * 移除用户信息
 */
export function removeUserInfo(): void {
  localStorage.removeItem(USER_INFO_KEY)
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken()
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  removeToken()
  removeUserInfo()
}

/**
 * 获取用户ID
 */
export function getUserId(): number {
  const userInfo = getUserInfo()
  return userInfo ? userInfo.id : 0
}
