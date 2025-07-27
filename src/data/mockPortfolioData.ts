/**
 * Mock portfolio data for demonstration purposes
 */

export interface MockHolding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  profitLoss: number
  profitLossPercent: number
  buyDate: string
  lastUpdate: string
  notes?: string
}

export interface MockTransaction {
  id: string
  date: string
  symbol: string
  name: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  commission: number
  totalAmount: number
  notes?: string
}

export interface MockPortfolio {
  id: number
  name: string
  description: string
  isDefault: boolean
  totalValue: number
  totalCost: number
  totalProfit: number
  totalProfitPercent: number
  createdAt: string
  updatedAt: string
}

// Realistic Chinese stock market holdings data
export const mockHoldings: MockHolding[] = [
  {
    symbol: '000001.SZ',
    name: '平安银行',
    quantity: 1000,
    avgPrice: 12.85,
    currentPrice: 13.42,
    marketValue: 13420,
    profitLoss: 570,
    profitLossPercent: 4.44,
    buyDate: '2024-03-15',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '股份制银行龙头，ROE稳定在11%左右'
  },
  {
    symbol: '600036.SH',
    name: '招商银行',
    quantity: 500,
    avgPrice: 36.80,
    currentPrice: 38.95,
    marketValue: 19475,
    profitLoss: 1075,
    profitLossPercent: 5.84,
    buyDate: '2024-02-20',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '零售银行之王，资产质量优异，PB 0.9倍'
  },
  {
    symbol: '600519.SH',
    name: '贵州茅台',
    quantity: 20,
    avgPrice: 1685.50,
    currentPrice: 1742.00,
    marketValue: 34840,
    profitLoss: 1130,
    profitLossPercent: 3.35,
    buyDate: '2024-01-10',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '白酒行业绝对龙头，品牌护城河深厚，PE 18倍'
  },
  {
    symbol: '000858.SZ',
    name: '五粮液',
    quantity: 100,
    avgPrice: 128.60,
    currentPrice: 135.80,
    marketValue: 13580,
    profitLoss: 720,
    profitLossPercent: 5.60,
    buyDate: '2024-04-08',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '高端白酒第二梯队，渠道改革见效，PE 15倍'
  },
  {
    symbol: '002415.SZ',
    name: '海康威视',
    quantity: 800,
    avgPrice: 31.25,
    currentPrice: 33.80,
    marketValue: 27040,
    profitLoss: 2040,
    profitLossPercent: 8.16,
    buyDate: '2024-05-22',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '安防龙头，AI+物联网转型，海外业务恢复'
  },
  {
    symbol: '300059.SZ',
    name: '东方财富',
    quantity: 1500,
    avgPrice: 12.40,
    currentPrice: 13.85,
    marketValue: 20775,
    profitLoss: 2175,
    profitLossPercent: 11.69,
    buyDate: '2024-06-18',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '互联网券商，受益于市场活跃度提升'
  },
  {
    symbol: '600276.SH',
    name: '恒瑞医药',
    quantity: 300,
    avgPrice: 52.80,
    currentPrice: 49.65,
    marketValue: 14895,
    profitLoss: -945,
    profitLossPercent: -5.97,
    buyDate: '2024-07-12',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '创新药龙头，研发投入高，短期承压但长期看好'
  },
  {
    symbol: '002594.SZ',
    name: '比亚迪',
    quantity: 200,
    avgPrice: 248.90,
    currentPrice: 267.50,
    marketValue: 53500,
    profitLoss: 3720,
    profitLossPercent: 7.47,
    buyDate: '2024-08-05',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '新能源汽车全球龙头，垂直一体化优势明显'
  },
  {
    symbol: '000002.SZ',
    name: '万科A',
    quantity: 2000,
    avgPrice: 8.95,
    currentPrice: 9.28,
    marketValue: 18560,
    profitLoss: 660,
    profitLossPercent: 3.69,
    buyDate: '2024-09-10',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '地产龙头，估值底部，政策边际改善'
  },
  {
    symbol: '600887.SH',
    name: '伊利股份',
    quantity: 600,
    avgPrice: 28.50,
    currentPrice: 30.20,
    marketValue: 18120,
    profitLoss: 1020,
    profitLossPercent: 5.96,
    buyDate: '2024-10-15',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '乳业龙头，品牌力强，渠道下沉空间大'
  },
  {
    symbol: '000858.SZ',
    name: '宁德时代',
    quantity: 150,
    avgPrice: 185.60,
    currentPrice: 198.40,
    marketValue: 29760,
    profitLoss: 1920,
    profitLossPercent: 6.90,
    buyDate: '2024-11-20',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '动力电池全球龙头，技术领先，产业链完善'
  },
  {
    symbol: '601318.SH',
    name: '中国平安',
    quantity: 800,
    avgPrice: 42.30,
    currentPrice: 44.85,
    marketValue: 35880,
    profitLoss: 2040,
    profitLossPercent: 6.03,
    buyDate: '2024-12-08',
    lastUpdate: '2025-01-27 15:30:00',
    notes: '综合金融龙头，寿险改革见效，科技赋能'
  }
]

// Realistic Chinese stock market transaction data
export const mockTransactions: MockTransaction[] = [
  {
    id: 'T20240115001',
    date: '2024-01-15',
    symbol: '600519.SH',
    name: '贵州茅台',
    type: 'buy',
    quantity: 20,
    price: 1685.50,
    amount: 33710.00,
    commission: 16.86, // 万分之五佣金
    totalAmount: 33726.86,
    notes: '年初布局核心资产，茅台估值合理'
  },
  {
    id: 'T20240220002',
    date: '2024-02-20',
    symbol: '600036.SH',
    name: '招商银行',
    type: 'buy',
    quantity: 500,
    price: 36.80,
    amount: 18400.00,
    commission: 9.20,
    totalAmount: 18409.20,
    notes: '银行股估值底部，招行基本面优异'
  },
  {
    id: 'T20240315003',
    date: '2024-03-15',
    symbol: '000001.SZ',
    name: '平安银行',
    type: 'buy',
    quantity: 1000,
    price: 12.85,
    amount: 12850.00,
    commission: 6.43,
    totalAmount: 12856.43,
    notes: '银行板块配置，平安银行零售转型见效'
  },
  {
    id: 'T20240408004',
    date: '2024-04-08',
    symbol: '000858.SZ',
    name: '五粮液',
    type: 'buy',
    quantity: 100,
    price: 128.60,
    amount: 12860.00,
    commission: 6.43,
    totalAmount: 12866.43,
    notes: '白酒板块补充，五粮液渠道改革进展顺利'
  },
  {
    id: 'T20240522005',
    date: '2024-05-22',
    symbol: '002415.SZ',
    name: '海康威视',
    type: 'buy',
    quantity: 800,
    price: 31.25,
    amount: 25000.00,
    commission: 12.50,
    totalAmount: 25012.50,
    notes: '科技股回调买入，海康AI转型加速'
  },
  {
    id: 'T20240618006',
    date: '2024-06-18',
    symbol: '300059.SZ',
    name: '东方财富',
    type: 'buy',
    quantity: 1500,
    price: 12.40,
    amount: 18600.00,
    commission: 9.30,
    totalAmount: 18609.30,
    notes: '券商股受益于市场活跃度提升'
  },
  {
    id: 'T20240712007',
    date: '2024-07-12',
    symbol: '600276.SH',
    name: '恒瑞医药',
    type: 'buy',
    quantity: 300,
    price: 52.80,
    amount: 15840.00,
    commission: 7.92,
    totalAmount: 15847.92,
    notes: '医药龙头估值底部，长期成长确定性高'
  },
  {
    id: 'T20240805008',
    date: '2024-08-05',
    symbol: '002594.SZ',
    name: '比亚迪',
    type: 'buy',
    quantity: 200,
    price: 248.90,
    amount: 49780.00,
    commission: 24.89,
    totalAmount: 49804.89,
    notes: '新能源汽车龙头，全球竞争力强'
  },
  {
    id: 'T20240910009',
    date: '2024-09-10',
    symbol: '000002.SZ',
    name: '万科A',
    type: 'buy',
    quantity: 2000,
    price: 8.95,
    amount: 17900.00,
    commission: 8.95,
    totalAmount: 17908.95,
    notes: '地产龙头估值极低，政策底部配置'
  },
  {
    id: 'T20241015010',
    date: '2024-10-15',
    symbol: '600887.SH',
    name: '伊利股份',
    type: 'buy',
    quantity: 600,
    price: 28.50,
    amount: 17100.00,
    commission: 8.55,
    totalAmount: 17108.55,
    notes: '消费龙头，品牌护城河深厚'
  },
  {
    id: 'T20241120011',
    date: '2024-11-20',
    symbol: '300750.SZ',
    name: '宁德时代',
    type: 'buy',
    quantity: 150,
    price: 185.60,
    amount: 27840.00,
    commission: 13.92,
    totalAmount: 27853.92,
    notes: '动力电池全球龙头，技术壁垒高'
  },
  {
    id: 'T20241208012',
    date: '2024-12-08',
    symbol: '601318.SH',
    name: '中国平安',
    type: 'buy',
    quantity: 800,
    price: 42.30,
    amount: 33840.00,
    commission: 16.92,
    totalAmount: 33856.92,
    notes: '综合金融龙头，寿险改革见效'
  },
  {
    id: 'T20241220013',
    date: '2024-12-20',
    symbol: '600276.SH',
    name: '恒瑞医药',
    type: 'sell',
    quantity: 100,
    price: 48.50,
    amount: 4850.00,
    commission: 4.85, // 卖出含印花税
    totalAmount: 4845.15,
    notes: '部分减仓，锁定收益'
  },
  {
    id: 'T20250108014',
    date: '2025-01-08',
    symbol: '000858.SZ',
    name: '五粮液',
    type: 'sell',
    quantity: 50,
    price: 132.80,
    amount: 6640.00,
    commission: 6.64,
    totalAmount: 6633.36,
    notes: '春节前获利了结部分白酒股'
  },
  {
    id: 'T20250115015',
    date: '2025-01-15',
    symbol: '002415.SZ',
    name: '海康威视',
    type: 'buy',
    quantity: 200,
    price: 33.20,
    amount: 6640.00,
    commission: 3.32,
    totalAmount: 6643.32,
    notes: '科技股调整后加仓'
  },
  {
    id: 'T20250122016',
    date: '2025-01-22',
    symbol: '600036.SH',
    name: '招商银行',
    type: 'buy',
    quantity: 300,
    price: 38.50,
    amount: 11550.00,
    commission: 5.78,
    totalAmount: 11555.78,
    notes: '银行股年报行情前加仓'
  }
]

// Mock portfolio data
export const mockPortfolios: MockPortfolio[] = [
  {
    id: 1,
    name: '稳健投资组合',
    description: '以银行、白酒等稳健股票为主的投资组合',
    isDefault: true,
    totalValue: 100514,
    totalCost: 97414,
    totalProfit: 3100,
    totalProfitPercent: 3.18,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-27T15:30:00Z'
  }
]

// Helper functions
export function calculatePortfolioSummary(holdings: MockHolding[]) {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0)
  const totalCost = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.avgPrice), 0)
  const totalProfit = totalValue - totalCost
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  return {
    totalValue,
    totalCost,
    totalProfit,
    totalProfitPercent,
    holdingCount: holdings.length
  }
}

export function getRecentTransactions(transactions: MockTransaction[], limit: number = 10) {
  return transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
