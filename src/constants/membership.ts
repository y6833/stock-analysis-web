/**
 * 会员等级常量
 */

// 会员等级枚举
export enum MembershipLevel {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

// 会员等级名称
export const MEMBERSHIP_LEVEL_NAMES = {
  [MembershipLevel.FREE]: '免费用户',
  [MembershipLevel.BASIC]: '基础会员',
  [MembershipLevel.PREMIUM]: '高级会员',
  [MembershipLevel.ENTERPRISE]: '企业版',
};

// 会员等级顺序（用于比较）
export const MEMBERSHIP_LEVEL_ORDER = {
  [MembershipLevel.FREE]: 0,
  [MembershipLevel.BASIC]: 1,
  [MembershipLevel.PREMIUM]: 2,
  [MembershipLevel.ENTERPRISE]: 3,
};

// 会员等级功能权限
export const MEMBERSHIP_FEATURES = {
  // 基础功能 - 所有会员都可以访问
  DASHBOARD: {
    name: '仪表盘',
    requiredLevel: MembershipLevel.FREE,
  },
  STOCK_ANALYSIS: {
    name: '股票分析',
    requiredLevel: MembershipLevel.FREE,
  },
  MARKET_HEATMAP: {
    name: '大盘云图',
    requiredLevel: MembershipLevel.FREE,
  },
  
  // 中级功能 - 基础会员及以上可以访问
  PORTFOLIO: {
    name: '仓位管理',
    requiredLevel: MembershipLevel.BASIC,
  },
  ALERTS: {
    name: '条件提醒',
    requiredLevel: MembershipLevel.BASIC,
  },
  CUSTOM_DASHBOARD: {
    name: '自定义看板',
    requiredLevel: MembershipLevel.BASIC,
  },
  
  // 高级功能 - 高级会员及以上可以访问
  MARKET_SCANNER: {
    name: '市场扫描器',
    requiredLevel: MembershipLevel.PREMIUM,
  },
  BACKTEST: {
    name: '策略回测',
    requiredLevel: MembershipLevel.PREMIUM,
  },
  SIMULATION: {
    name: '模拟交易',
    requiredLevel: MembershipLevel.PREMIUM,
  },
  EXPORT: {
    name: '导出报告',
    requiredLevel: MembershipLevel.PREMIUM,
  },
  
  // 企业功能 - 企业版会员可以访问
  API_ACCESS: {
    name: 'API访问',
    requiredLevel: MembershipLevel.ENTERPRISE,
  },
  TEAM_MANAGEMENT: {
    name: '团队管理',
    requiredLevel: MembershipLevel.ENTERPRISE,
  },
};

// 页面路径与功能的映射
export const PAGE_FEATURE_MAP: Record<string, keyof typeof MEMBERSHIP_FEATURES> = {
  '/dashboard': 'DASHBOARD',
  '/stock': 'STOCK_ANALYSIS',
  '/market-heatmap': 'MARKET_HEATMAP',
  '/portfolio': 'PORTFOLIO',
  '/alerts': 'ALERTS',
  '/test-dashboard': 'CUSTOM_DASHBOARD',
  '/market-scanner': 'MARKET_SCANNER',
  '/backtest': 'BACKTEST',
  '/simulation': 'SIMULATION',
  '/export': 'EXPORT',
};

/**
 * 检查会员等级是否满足要求
 * @param userLevel 用户会员等级
 * @param requiredLevel 要求的会员等级
 * @returns 是否满足要求
 */
export function checkMembershipLevel(userLevel: string, requiredLevel: string): boolean {
  // 获取等级顺序
  const userOrder = MEMBERSHIP_LEVEL_ORDER[userLevel as MembershipLevel] || 0;
  const requiredOrder = MEMBERSHIP_LEVEL_ORDER[requiredLevel as MembershipLevel] || 0;
  
  // 用户等级顺序必须大于等于要求的等级顺序
  return userOrder >= requiredOrder;
}

/**
 * 获取页面所需的会员等级
 * @param path 页面路径
 * @returns 所需的会员等级
 */
export function getRequiredMembershipLevel(path: string): MembershipLevel {
  // 获取路径对应的功能
  const feature = PAGE_FEATURE_MAP[path];
  
  // 如果找到功能，返回其所需的会员等级
  if (feature && MEMBERSHIP_FEATURES[feature]) {
    return MEMBERSHIP_FEATURES[feature].requiredLevel;
  }
  
  // 默认返回免费等级
  return MembershipLevel.FREE;
}

/**
 * 获取功能所需的会员等级名称
 * @param feature 功能名称
 * @returns 所需的会员等级名称
 */
export function getFeatureRequiredLevelName(feature: keyof typeof MEMBERSHIP_FEATURES): string {
  const level = MEMBERSHIP_FEATURES[feature].requiredLevel;
  return MEMBERSHIP_LEVEL_NAMES[level];
}
