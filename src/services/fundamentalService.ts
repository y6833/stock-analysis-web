/**
 * 基本面分析服务
 * 提供获取和处理财务数据的功能
 */

import type { 
  FundamentalAnalysis, 
  FinancialSummary, 
  FinancialStatement,
  ValuationAnalysis,
  IndustryComparison,
  FinancialReportAnalysis
} from '@/types/fundamental'

/**
 * 获取股票的基本面分析数据
 * @param symbol 股票代码
 * @returns 基本面分析数据
 */
export async function getFundamentalAnalysis(symbol: string): Promise<FundamentalAnalysis> {
  try {
    // 这里应该调用后端API获取数据
    // 由于目前没有实际的API，我们使用模拟数据
    return generateMockFundamentalData(symbol)
  } catch (error) {
    console.error('获取基本面数据失败:', error)
    throw error
  }
}

/**
 * 获取财务摘要数据
 * @param symbol 股票代码
 * @returns 财务摘要数据
 */
export async function getFinancialSummary(symbol: string): Promise<FinancialSummary> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.summary
  } catch (error) {
    console.error('获取财务摘要失败:', error)
    throw error
  }
}

/**
 * 获取财务报表数据
 * @param symbol 股票代码
 * @returns 财务报表数据
 */
export async function getFinancialStatements(symbol: string): Promise<FinancialStatement[]> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.statements
  } catch (error) {
    console.error('获取财务报表失败:', error)
    throw error
  }
}

/**
 * 获取估值分析数据
 * @param symbol 股票代码
 * @returns 估值分析数据
 */
export async function getValuationAnalysis(symbol: string): Promise<ValuationAnalysis> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.valuation
  } catch (error) {
    console.error('获取估值分析失败:', error)
    throw error
  }
}

/**
 * 获取行业对比数据
 * @param symbol 股票代码
 * @returns 行业对比数据
 */
export async function getIndustryComparison(symbol: string): Promise<IndustryComparison> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.industryComparison
  } catch (error) {
    console.error('获取行业对比失败:', error)
    throw error
  }
}

/**
 * 获取财报解读数据
 * @param symbol 股票代码
 * @returns 财报解读数据
 */
export async function getFinancialReportAnalysis(symbol: string): Promise<FinancialReportAnalysis> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.reportAnalysis
  } catch (error) {
    console.error('获取财报解读失败:', error)
    throw error
  }
}

/**
 * 生成模拟的基本面数据
 * @param symbol 股票代码
 * @returns 模拟的基本面分析数据
 */
function generateMockFundamentalData(symbol: string): FundamentalAnalysis {
  // 根据股票代码生成一些随机但合理的数据
  const isFinancial = symbol.startsWith('6') // 假设6开头的是金融股
  const isTech = symbol.startsWith('3') // 假设3开头的是科技股
  const isIndustrial = symbol.startsWith('0') // 假设0开头的是工业股
  
  let industry = '制造业'
  let name = '示例公司'
  
  if (isFinancial) {
    industry = '金融业'
    name = '某银行'
  } else if (isTech) {
    industry = '信息技术'
    name = '某科技'
  } else if (isIndustrial) {
    industry = '工业'
    name = '某工业'
  }
  
  // 生成财务摘要
  const summary: FinancialSummary = {
    revenue: {
      name: '营业收入',
      value: Math.round(Math.random() * 10000 + 5000),
      unit: '百万元',
      description: '公司在报告期内的总收入',
      trend: Math.random() > 0.3 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 30 - 5)
    },
    netProfit: {
      name: '净利润',
      value: Math.round(Math.random() * 2000 + 500),
      unit: '百万元',
      description: '公司在报告期内的净利润',
      trend: Math.random() > 0.4 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 40 - 10)
    },
    grossMargin: {
      name: '毛利率',
      value: (Math.random() * 30 + 20).toFixed(2),
      unit: '%',
      description: '毛利润占营业收入的百分比',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 10 - 3)
    },
    netMargin: {
      name: '净利率',
      value: (Math.random() * 15 + 5).toFixed(2),
      unit: '%',
      description: '净利润占营业收入的百分比',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 15 - 5)
    },
    roe: {
      name: '净资产收益率(ROE)',
      value: (Math.random() * 20 + 5).toFixed(2),
      unit: '%',
      description: '净利润占股东权益的百分比',
      trend: Math.random() > 0.6 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 20 - 5)
    },
    debtToAsset: {
      name: '资产负债率',
      value: (Math.random() * 40 + 30).toFixed(2),
      unit: '%',
      description: '总负债占总资产的百分比',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 10 - 5)
    },
    eps: {
      name: '每股收益(EPS)',
      value: (Math.random() * 2 + 0.5).toFixed(2),
      unit: '元',
      description: '净利润除以总股本',
      trend: Math.random() > 0.6 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 30 - 10)
    },
    bps: {
      name: '每股净资产(BPS)',
      value: (Math.random() * 10 + 5).toFixed(2),
      unit: '元',
      description: '股东权益除以总股本',
      trend: Math.random() > 0.7 ? 'up' : 'down',
      changePercent: Math.round(Math.random() * 15 - 5)
    }
  }
  
  // 生成财务报表
  const statements: FinancialStatement[] = [
    {
      type: 'income',
      period: 'annual',
      reportDate: '2023-12-31',
      items: [
        {
          name: '营业收入',
          value: Math.round(Math.random() * 10000 + 5000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 30 - 5)
        },
        {
          name: '营业成本',
          value: Math.round(Math.random() * 7000 + 3000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 25 - 5)
        },
        {
          name: '毛利润',
          value: Math.round(Math.random() * 3000 + 1000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 35 - 5)
        },
        {
          name: '销售费用',
          value: Math.round(Math.random() * 500 + 200),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 20 - 5)
        },
        {
          name: '管理费用',
          value: Math.round(Math.random() * 400 + 150),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 15 - 5)
        },
        {
          name: '研发费用',
          value: Math.round(Math.random() * 600 + 300),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 40 - 5)
        },
        {
          name: '财务费用',
          value: Math.round(Math.random() * 200 + 50),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 10 - 5)
        },
        {
          name: '营业利润',
          value: Math.round(Math.random() * 2500 + 800),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 35 - 10)
        },
        {
          name: '利润总额',
          value: Math.round(Math.random() * 2400 + 750),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 35 - 10)
        },
        {
          name: '净利润',
          value: Math.round(Math.random() * 2000 + 500),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 40 - 10)
        }
      ]
    },
    {
      type: 'balance',
      period: 'annual',
      reportDate: '2023-12-31',
      items: [
        {
          name: '总资产',
          value: Math.round(Math.random() * 50000 + 20000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 20 - 5)
        },
        {
          name: '流动资产',
          value: Math.round(Math.random() * 25000 + 10000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 25 - 5)
        },
        {
          name: '非流动资产',
          value: Math.round(Math.random() * 25000 + 10000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 15 - 5)
        },
        {
          name: '总负债',
          value: Math.round(Math.random() * 30000 + 12000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 20 - 5)
        },
        {
          name: '流动负债',
          value: Math.round(Math.random() * 15000 + 6000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 25 - 5)
        },
        {
          name: '非流动负债',
          value: Math.round(Math.random() * 15000 + 6000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 15 - 5)
        },
        {
          name: '股东权益',
          value: Math.round(Math.random() * 20000 + 8000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 20 - 5)
        }
      ]
    },
    {
      type: 'cash_flow',
      period: 'annual',
      reportDate: '2023-12-31',
      items: [
        {
          name: '经营活动现金流量净额',
          value: Math.round(Math.random() * 3000 + 1000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 40 - 10)
        },
        {
          name: '投资活动现金流量净额',
          value: -Math.round(Math.random() * 2000 + 500),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 30 - 15)
        },
        {
          name: '筹资活动现金流量净额',
          value: Math.round(Math.random() * 1000 - 500),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 50 - 25)
        },
        {
          name: '现金及现金等价物净增加额',
          value: Math.round(Math.random() * 1500 - 300),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 60 - 30)
        },
        {
          name: '期末现金及现金等价物余额',
          value: Math.round(Math.random() * 5000 + 2000),
          unit: '百万元',
          yoyChange: Math.round(Math.random() * 25 - 10)
        }
      ]
    }
  ]
  
  // 生成估值分析
  const generateHistoryData = (baseValue: number, volatility: number) => {
    const history = []
    let value = baseValue
    
    for (let i = 0; i < 20; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      
      value = value * (1 + (Math.random() * volatility * 2 - volatility))
      
      history.push({
        date: date.toISOString().split('T')[0],
        value: parseFloat(value.toFixed(2))
      })
    }
    
    return history.reverse()
  }
  
  const valuation: ValuationAnalysis = {
    pe: {
      name: '市盈率(PE)',
      value: parseFloat((Math.random() * 30 + 10).toFixed(2)),
      industry: parseFloat((Math.random() * 25 + 15).toFixed(2)),
      market: parseFloat((Math.random() * 20 + 15).toFixed(2)),
      history: generateHistoryData(20, 0.1),
      percentile: Math.round(Math.random() * 100),
      description: '股价与每股收益的比率，反映了投资者愿意为每元收益支付的价格'
    },
    pb: {
      name: '市净率(PB)',
      value: parseFloat((Math.random() * 3 + 1).toFixed(2)),
      industry: parseFloat((Math.random() * 2.5 + 1.5).toFixed(2)),
      market: parseFloat((Math.random() * 2 + 1.5).toFixed(2)),
      history: generateHistoryData(2, 0.08),
      percentile: Math.round(Math.random() * 100),
      description: '股价与每股净资产的比率，反映了投资者愿意为每元净资产支付的价格'
    },
    ps: {
      name: '市销率(PS)',
      value: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      industry: parseFloat((Math.random() * 4 + 2).toFixed(2)),
      market: parseFloat((Math.random() * 3 + 2).toFixed(2)),
      history: generateHistoryData(3, 0.12),
      percentile: Math.round(Math.random() * 100),
      description: '股价与每股销售额的比率，反映了投资者愿意为每元销售额支付的价格'
    },
    pcf: {
      name: '市现率(PCF)',
      value: parseFloat((Math.random() * 15 + 5).toFixed(2)),
      industry: parseFloat((Math.random() * 12 + 8).toFixed(2)),
      market: parseFloat((Math.random() * 10 + 7).toFixed(2)),
      history: generateHistoryData(10, 0.15),
      percentile: Math.round(Math.random() * 100),
      description: '股价与每股经营现金流的比率，反映了投资者愿意为每元现金流支付的价格'
    },
    dividend: {
      name: '股息率',
      value: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      industry: parseFloat((Math.random() * 4 + 2).toFixed(2)),
      market: parseFloat((Math.random() * 3 + 2).toFixed(2)),
      history: generateHistoryData(3, 0.05),
      percentile: Math.round(Math.random() * 100),
      description: '年度股息与股价的比率，反映了投资者从股票投资中获得的现金回报率'
    },
    evToEbitda: {
      name: 'EV/EBITDA',
      value: parseFloat((Math.random() * 12 + 6).toFixed(2)),
      industry: parseFloat((Math.random() * 10 + 8).toFixed(2)),
      market: parseFloat((Math.random() * 9 + 7).toFixed(2)),
      history: generateHistoryData(9, 0.1),
      percentile: Math.round(Math.random() * 100),
      description: '企业价值与息税折旧摊销前利润的比率，是一种常用的企业估值指标'
    }
  }
  
  // 生成行业对比
  const industryComparison: IndustryComparison = {
    industry,
    companyCount: Math.round(Math.random() * 50 + 30),
    items: {
      revenue: {
        name: '营业收入',
        value: Math.round(Math.random() * 10000 + 5000),
        industryAvg: Math.round(Math.random() * 8000 + 4000),
        industryMax: Math.round(Math.random() * 20000 + 15000),
        industryMin: Math.round(Math.random() * 2000 + 1000),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      netProfit: {
        name: '净利润',
        value: Math.round(Math.random() * 2000 + 500),
        industryAvg: Math.round(Math.random() * 1500 + 400),
        industryMax: Math.round(Math.random() * 5000 + 3000),
        industryMin: Math.round(Math.random() * 200 + 100),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      grossMargin: {
        name: '毛利率',
        value: parseFloat((Math.random() * 30 + 20).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 25 + 15).toFixed(2)),
        industryMax: parseFloat((Math.random() * 50 + 30).toFixed(2)),
        industryMin: parseFloat((Math.random() * 10 + 5).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      netMargin: {
        name: '净利率',
        value: parseFloat((Math.random() * 15 + 5).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 12 + 4).toFixed(2)),
        industryMax: parseFloat((Math.random() * 25 + 15).toFixed(2)),
        industryMin: parseFloat((Math.random() * 3 + 1).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      roe: {
        name: '净资产收益率(ROE)',
        value: parseFloat((Math.random() * 20 + 5).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 15 + 5).toFixed(2)),
        industryMax: parseFloat((Math.random() * 30 + 20).toFixed(2)),
        industryMin: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      debtToAsset: {
        name: '资产负债率',
        value: parseFloat((Math.random() * 40 + 30).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 45 + 35).toFixed(2)),
        industryMax: parseFloat((Math.random() * 70 + 60).toFixed(2)),
        industryMin: parseFloat((Math.random() * 20 + 10).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      pe: {
        name: '市盈率(PE)',
        value: parseFloat((Math.random() * 30 + 10).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 25 + 15).toFixed(2)),
        industryMax: parseFloat((Math.random() * 50 + 40).toFixed(2)),
        industryMin: parseFloat((Math.random() * 10 + 5).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      },
      pb: {
        name: '市净率(PB)',
        value: parseFloat((Math.random() * 3 + 1).toFixed(2)),
        industryAvg: parseFloat((Math.random() * 2.5 + 1.5).toFixed(2)),
        industryMax: parseFloat((Math.random() * 5 + 3).toFixed(2)),
        industryMin: parseFloat((Math.random() * 1 + 0.5).toFixed(2)),
        rank: Math.round(Math.random() * 10 + 1),
        totalCompanies: Math.round(Math.random() * 50 + 30),
        percentile: Math.round(Math.random() * 100)
      }
    }
  }
  
  // 生成财报解读
  const reportAnalysis: FinancialReportAnalysis = {
    reportDate: '2023-12-31',
    period: 'annual',
    summary: `${name}2023年度业绩${Math.random() > 0.6 ? '稳健增长' : '略有下滑'}，营业收入同比${Math.random() > 0.6 ? '增长' : '下降'}${Math.round(Math.random() * 20 + 5)}%，净利润同比${Math.random() > 0.6 ? '增长' : '下降'}${Math.round(Math.random() * 30 + 5)}%。公司${Math.random() > 0.6 ? '持续加大研发投入' : '控制成本支出'}，${Math.random() > 0.6 ? '毛利率有所提升' : '毛利率略有下降'}。`,
    highlights: [
      `营业收入达到${Math.round(Math.random() * 10000 + 5000)}百万元，${Math.random() > 0.6 ? '同比增长' : '同比下降'}${Math.round(Math.random() * 20 + 5)}%`,
      `净利润达到${Math.round(Math.random() * 2000 + 500)}百万元，${Math.random() > 0.6 ? '同比增长' : '同比下降'}${Math.round(Math.random() * 30 + 5)}%`,
      `研发投入${Math.round(Math.random() * 600 + 300)}百万元，${Math.random() > 0.7 ? '同比增长' : '同比下降'}${Math.round(Math.random() * 40 + 10)}%`,
      `经营活动现金流量净额${Math.round(Math.random() * 3000 + 1000)}百万元，${Math.random() > 0.6 ? '同比增长' : '同比下降'}${Math.round(Math.random() * 40 + 10)}%`,
      `拟每股派发现金股利${(Math.random() * 0.5 + 0.1).toFixed(2)}元`
    ],
    risks: [
      `行业竞争加剧，可能导致${Math.random() > 0.5 ? '产品价格下降' : '市场份额减少'}`,
      `原材料价格${Math.random() > 0.5 ? '波动' : '上涨'}，可能影响公司毛利率`,
      `技术迭代加速，研发投入${Math.random() > 0.5 ? '不足' : '效果不及预期'}可能影响公司长期竞争力`,
      `宏观经济不确定性增加，可能影响下游需求`,
      `${Math.random() > 0.5 ? '国际贸易环境变化' : '政策法规调整'}可能带来不确定性`
    ],
    outlook: `展望未来，公司将${Math.random() > 0.6 ? '继续加大研发投入' : '优化产品结构'}，${Math.random() > 0.6 ? '拓展新市场' : '深耕现有市场'}，${Math.random() > 0.6 ? '提升产品竞争力' : '控制成本提高效率'}。管理层对${Math.random() > 0.7 ? '2024年业绩持谨慎乐观态度' : '行业长期发展前景充满信心'}。`
  }
  
  // 返回完整的基本面分析数据
  return {
    symbol,
    name,
    industry,
    summary,
    statements,
    valuation,
    industryComparison,
    reportAnalysis
  }
}

// 导出服务
export const fundamentalService = {
  getFundamentalAnalysis,
  getFinancialSummary,
  getFinancialStatements,
  getValuationAnalysis,
  getIndustryComparison,
  getFinancialReportAnalysis
}

export default fundamentalService
