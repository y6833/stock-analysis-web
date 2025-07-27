/**
 * Realistic Chinese stock market risk monitoring data
 * Based on actual market conditions and typical portfolio risk metrics
 */

export interface RiskMetricData {
  var: number // Value at Risk (95% confidence, 1-day)
  varChange: number
  volatility: number // Annualized volatility %
  volatilityChange: number
  concentration: number // Concentration risk %
  concentrationChange: number
  beta: number // Beta relative to CSI 300
  betaChange: number
  overallScore: number // Risk score 0-100
  overallLevel: 'low' | 'medium' | 'high' | 'critical'
  scoreTrend: 'up' | 'down' | 'stable'
  scoreChange: number
  lastUpdateTime: Date
}

export interface MarketAlert {
  id: string
  level: 'warning' | 'danger' | 'critical'
  title: string
  message: string
  timestamp: number
  source: string
  priority: 'high' | 'medium' | 'low'
  symbol?: string
  actions?: Array<{
    action: string
    label: string
    type?: string
  }>
  isRead?: boolean
}

export interface RiskRecommendation {
  id: string
  title: string
  description: string
  type: 'diversification' | 'risk_management' | 'asset_allocation' | 'position_sizing'
  priority: 'high' | 'medium' | 'low'
  impact: 'positive' | 'negative' | 'neutral'
  expectedReturn?: number
  riskReduction?: number
}

// Realistic risk data based on Chinese market conditions
export const realisticRiskData: RiskMetricData = {
  var: 3.2, // 3.2% daily VaR at 95% confidence - typical for diversified A-share portfolio
  varChange: 0.15,
  volatility: 28.5, // 28.5% annualized volatility - realistic for A-share market
  volatilityChange: -1.2,
  concentration: 35.8, // 35.8% concentration in top 5 holdings - reasonable diversification
  concentrationChange: -2.1,
  beta: 0.92, // 0.92 beta relative to CSI 300 - slightly defensive
  betaChange: -0.03,
  overallScore: 42, // Medium risk score
  overallLevel: 'medium',
  scoreTrend: 'down', // Risk decreasing
  scoreChange: -2.3,
  lastUpdateTime: new Date()
}

// Realistic market alerts based on actual Chinese market scenarios
export const realisticMarketAlerts: MarketAlert[] = [
  {
    id: 'ALERT_20250127_001',
    level: 'warning',
    title: '沪深300指数波动加剧',
    message: '沪深300指数日内波动超过2.5%，建议关注仓位控制，当前市场情绪偏谨慎',
    timestamp: Date.now() - 1800000, // 30分钟前
    source: '市场监控系统',
    priority: 'medium',
    symbol: '000300.SH',
    actions: [
      { action: 'reduce_position', label: '减仓', type: 'warning' },
      { action: 'add_hedge', label: '对冲', type: 'primary' }
    ],
    isRead: false
  },
  {
    id: 'ALERT_20250127_002',
    level: 'danger',
    title: '医药板块集中度风险',
    message: '医药板块持仓占比达到18.5%，超过单一行业15%的风险控制线，建议适当分散',
    timestamp: Date.now() - 3600000, // 1小时前
    source: '风险控制系统',
    priority: 'high',
    actions: [
      { action: 'rebalance', label: '再平衡', type: 'danger' },
      { action: 'diversify', label: '分散投资', type: 'warning' }
    ],
    isRead: false
  },
  {
    id: 'ALERT_20250127_003',
    level: 'critical',
    title: '恒瑞医药跌幅预警',
    message: '恒瑞医药(600276)盘中跌幅达到7.2%，触发个股风险预警线，建议评估止损',
    timestamp: Date.now() - 5400000, // 1.5小时前
    source: '个股监控',
    priority: 'high',
    symbol: '600276.SH',
    actions: [
      { action: 'stop_loss', label: '止损', type: 'danger' },
      { action: 'hold', label: '继续持有', type: 'default' }
    ],
    isRead: false
  },
  {
    id: 'ALERT_20250127_004',
    level: 'warning',
    title: '北向资金净流出',
    message: '今日北向资金净流出45.8亿元，连续3日净流出，外资情绪偏谨慎',
    timestamp: Date.now() - 7200000, // 2小时前
    source: '资金流向监控',
    priority: 'medium',
    actions: [
      { action: 'monitor', label: '持续关注', type: 'primary' }
    ],
    isRead: true
  },
  {
    id: 'ALERT_20250127_005',
    level: 'warning',
    title: '新能源板块估值预警',
    message: '新能源汽车板块平均PE达到45倍，高于历史75分位数，估值偏高需谨慎',
    timestamp: Date.now() - 10800000, // 3小时前
    source: '估值监控系统',
    priority: 'medium',
    symbol: '002594.SZ',
    actions: [
      { action: 'valuation_check', label: '估值检查', type: 'warning' }
    ],
    isRead: true
  },
  {
    id: 'ALERT_20250126_006',
    level: 'warning',
    title: '美联储政策影响',
    message: '美联储暗示可能暂缓降息，可能对A股资金面产生影响，建议关注汇率变化',
    timestamp: Date.now() - 86400000, // 昨天
    source: '宏观经济监控',
    priority: 'low',
    isRead: true
  }
]

// Realistic investment recommendations based on Chinese market practices
export const realisticRiskRecommendations: RiskRecommendation[] = [
  {
    id: 'REC_001',
    title: '优化行业配置降低集中度风险',
    description: '当前医药和金融板块合计占比超过40%，建议增加消费、科技等板块配置，将单一行业占比控制在20%以内',
    type: 'diversification',
    priority: 'high',
    impact: 'positive',
    expectedReturn: 0.8,
    riskReduction: 15.2
  },
  {
    id: 'REC_002',
    title: '调整止损策略应对市场波动',
    description: '鉴于当前市场波动率上升至28.5%，建议将个股止损线从-10%调整至-8%，提高风险控制精度',
    type: 'risk_management',
    priority: 'medium',
    impact: 'positive',
    riskReduction: 8.5
  },
  {
    id: 'REC_003',
    title: '增加防御性资产配置',
    description: '考虑增加银行、公用事业等低贝塔板块配置至15-20%，在市场调整时提供缓冲',
    type: 'asset_allocation',
    priority: 'medium',
    impact: 'neutral',
    riskReduction: 12.0
  },
  {
    id: 'REC_004',
    title: '控制单一个股仓位上限',
    description: '建议将单一个股仓位上限从当前的15%降至10%，避免个股风险对组合造成过大影响',
    type: 'position_sizing',
    priority: 'high',
    impact: 'positive',
    riskReduction: 18.7
  },
  {
    id: 'REC_005',
    title: '利用期权工具进行风险对冲',
    description: '可考虑买入沪深300ETF看跌期权，对冲系统性风险，成本约为组合价值的0.5%',
    type: 'risk_management',
    priority: 'low',
    impact: 'positive',
    riskReduction: 25.0
  }
]

// Market sector risk distribution (realistic Chinese market data)
export const sectorRiskDistribution = {
  '金融': { weight: 22.5, risk: 'medium', beta: 0.85 },
  '医药生物': { weight: 18.5, risk: 'high', beta: 1.15 },
  '食品饮料': { weight: 16.2, risk: 'low', beta: 0.72 },
  '新能源': { weight: 15.8, risk: 'high', beta: 1.35 },
  '房地产': { weight: 8.9, risk: 'medium', beta: 1.08 },
  '消费': { weight: 7.8, risk: 'medium', beta: 0.95 },
  '科技': { weight: 6.2, risk: 'high', beta: 1.28 },
  '其他': { weight: 4.1, risk: 'low', beta: 0.88 }
}

// Historical VaR data for trend analysis
export const historicalVaRData = [
  { date: '2025-01-20', var: 3.8, volatility: 31.2 },
  { date: '2025-01-21', var: 3.6, volatility: 30.1 },
  { date: '2025-01-22', var: 3.4, volatility: 29.5 },
  { date: '2025-01-23', var: 3.3, volatility: 28.9 },
  { date: '2025-01-24', var: 3.1, volatility: 28.2 },
  { date: '2025-01-25', var: 3.2, volatility: 28.5 },
  { date: '2025-01-26', var: 3.0, volatility: 27.8 },
  { date: '2025-01-27', var: 3.2, volatility: 28.5 }
]

// Risk correlation matrix (major holdings)
export const riskCorrelationMatrix = {
  '600519.SH': { // 贵州茅台
    '000858.SZ': 0.65, // 五粮液 - 同行业高相关
    '600036.SH': 0.25, // 招商银行 - 低相关
    '002594.SZ': 0.15, // 比亚迪 - 低相关
    '002415.SZ': 0.20  // 海康威视 - 低相关
  },
  '600036.SH': { // 招商银行
    '000001.SZ': 0.78, // 平安银行 - 同行业高相关
    '601318.SH': 0.72, // 中国平安 - 金融板块相关
    '600519.SH': 0.25, // 贵州茅台 - 低相关
    '002594.SZ': 0.18  // 比亚迪 - 低相关
  }
}

// Market stress test scenarios
export const stressTestScenarios = [
  {
    name: '市场大幅调整(-20%)',
    probability: 0.05,
    expectedLoss: 18.5,
    description: '类似2018年市场调整情况'
  },
  {
    name: '行业轮动(-10%)',
    probability: 0.15,
    expectedLoss: 8.2,
    description: '板块轮动导致的组合调整'
  },
  {
    name: '个股黑天鹅(-30%)',
    probability: 0.08,
    expectedLoss: 4.5,
    description: '单一重仓股出现重大利空'
  },
  {
    name: '流动性紧张(-15%)',
    probability: 0.10,
    expectedLoss: 12.8,
    description: '资金面紧张导致的市场调整'
  }
]
