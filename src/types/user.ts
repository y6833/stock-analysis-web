/**
 * 用户相关类型定义
 */

// 用户角色
export type UserRole = 'user' | 'premium' | 'admin'

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'suspended'

// 用户基本信息
export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastLogin?: string
}

// 用户详细信息
export interface UserProfile extends User {
  nickname?: string
  bio?: string
  phone?: string
  location?: string
  website?: string
  preferences: UserPreferences
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  defaultDashboardLayout: string
  emailNotifications: boolean
  pushNotifications: boolean
  defaultStockSymbol?: string
  defaultTimeframe?: string
  defaultChartType?: string
}

// 用户注册请求
export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

// 用户登录请求
export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
}

// 登录响应
export interface LoginResponse {
  user: User
  token: string
  expiresAt: string
}

// 密码重置请求
export interface PasswordResetRequest {
  email: string
}

// 密码更新请求
export interface PasswordUpdateRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

// 用户资料更新请求
export interface ProfileUpdateRequest {
  nickname?: string
  bio?: string
  phone?: string
  location?: string
  website?: string
  avatar?: string
}

// 用户偏好设置更新请求
export interface PreferencesUpdateRequest {
  theme?: 'light' | 'dark' | 'auto'
  language?: 'zh-CN' | 'en-US'
  defaultDashboardLayout?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  defaultStockSymbol?: string
  defaultTimeframe?: string
  defaultChartType?: string
}
