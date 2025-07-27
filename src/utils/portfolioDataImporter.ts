/**
 * Portfolio Data Importer
 * Provides functionality to import portfolio and transaction data from various sources
 */

import { mockHoldings, mockTransactions, type MockHolding, type MockTransaction } from '@/data/mockPortfolioData'

export interface ImportOptions {
  format: 'csv' | 'excel' | 'json'
  hasHeaders: boolean
  delimiter?: string
}

export interface ImportResult {
  success: boolean
  message: string
  data?: {
    holdings?: MockHolding[]
    transactions?: MockTransaction[]
  }
  errors?: string[]
}

/**
 * Import holdings data from file
 */
export async function importHoldingsFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
  try {
    const text = await file.text()
    
    switch (options.format) {
      case 'csv':
        return importHoldingsFromCSV(text, options)
      case 'json':
        return importHoldingsFromJSON(text)
      default:
        return {
          success: false,
          message: `不支持的文件格式: ${options.format}`
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Import transactions data from file
 */
export async function importTransactionsFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
  try {
    const text = await file.text()
    
    switch (options.format) {
      case 'csv':
        return importTransactionsFromCSV(text, options)
      case 'json':
        return importTransactionsFromJSON(text)
      default:
        return {
          success: false,
          message: `不支持的文件格式: ${options.format}`
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Import holdings from CSV
 */
function importHoldingsFromCSV(csvText: string, options: ImportOptions): ImportResult {
  try {
    const lines = csvText.trim().split('\n')
    const delimiter = options.delimiter || ','
    
    if (lines.length === 0) {
      return { success: false, message: 'CSV文件为空' }
    }

    let dataLines = lines
    if (options.hasHeaders) {
      dataLines = lines.slice(1)
    }

    const holdings: MockHolding[] = []
    const errors: string[] = []

    dataLines.forEach((line, index) => {
      const columns = line.split(delimiter).map(col => col.trim().replace(/"/g, ''))
      
      if (columns.length < 6) {
        errors.push(`第${index + 1}行数据不完整`)
        return
      }

      try {
        const holding: MockHolding = {
          symbol: columns[0],
          name: columns[1],
          quantity: parseInt(columns[2]),
          avgPrice: parseFloat(columns[3]),
          currentPrice: parseFloat(columns[4]),
          marketValue: parseInt(columns[2]) * parseFloat(columns[4]),
          profitLoss: (parseFloat(columns[4]) - parseFloat(columns[3])) * parseInt(columns[2]),
          profitLossPercent: ((parseFloat(columns[4]) - parseFloat(columns[3])) / parseFloat(columns[3])) * 100,
          buyDate: columns[5] || new Date().toISOString().split('T')[0],
          lastUpdate: new Date().toISOString(),
          notes: columns[6] || ''
        }

        holdings.push(holding)
      } catch (error) {
        errors.push(`第${index + 1}行数据格式错误`)
      }
    })

    return {
      success: true,
      message: `成功导入${holdings.length}条持仓记录`,
      data: { holdings },
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    return {
      success: false,
      message: `CSV解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Import transactions from CSV
 */
function importTransactionsFromCSV(csvText: string, options: ImportOptions): ImportResult {
  try {
    const lines = csvText.trim().split('\n')
    const delimiter = options.delimiter || ','
    
    if (lines.length === 0) {
      return { success: false, message: 'CSV文件为空' }
    }

    let dataLines = lines
    if (options.hasHeaders) {
      dataLines = lines.slice(1)
    }

    const transactions: MockTransaction[] = []
    const errors: string[] = []

    dataLines.forEach((line, index) => {
      const columns = line.split(delimiter).map(col => col.trim().replace(/"/g, ''))
      
      if (columns.length < 8) {
        errors.push(`第${index + 1}行数据不完整`)
        return
      }

      try {
        const quantity = parseInt(columns[4])
        const price = parseFloat(columns[5])
        const commission = parseFloat(columns[7]) || 0
        const amount = quantity * price
        
        const transaction: MockTransaction = {
          id: `T${Date.now()}_${index}`,
          date: columns[0],
          symbol: columns[1],
          name: columns[2],
          type: columns[3].toLowerCase() === 'buy' ? 'buy' : 'sell',
          quantity,
          price,
          amount,
          commission,
          totalAmount: amount + commission,
          notes: columns[8] || ''
        }

        transactions.push(transaction)
      } catch (error) {
        errors.push(`第${index + 1}行数据格式错误`)
      }
    })

    return {
      success: true,
      message: `成功导入${transactions.length}条交易记录`,
      data: { transactions },
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    return {
      success: false,
      message: `CSV解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Import holdings from JSON
 */
function importHoldingsFromJSON(jsonText: string): ImportResult {
  try {
    const data = JSON.parse(jsonText)
    
    if (!Array.isArray(data)) {
      return { success: false, message: 'JSON数据必须是数组格式' }
    }

    const holdings: MockHolding[] = data.map((item, index) => {
      if (!item.symbol || !item.name || !item.quantity || !item.avgPrice || !item.currentPrice) {
        throw new Error(`第${index + 1}条记录缺少必要字段`)
      }

      return {
        symbol: item.symbol,
        name: item.name,
        quantity: Number(item.quantity),
        avgPrice: Number(item.avgPrice),
        currentPrice: Number(item.currentPrice),
        marketValue: Number(item.quantity) * Number(item.currentPrice),
        profitLoss: (Number(item.currentPrice) - Number(item.avgPrice)) * Number(item.quantity),
        profitLossPercent: ((Number(item.currentPrice) - Number(item.avgPrice)) / Number(item.avgPrice)) * 100,
        buyDate: item.buyDate || new Date().toISOString().split('T')[0],
        lastUpdate: new Date().toISOString(),
        notes: item.notes || ''
      }
    })

    return {
      success: true,
      message: `成功导入${holdings.length}条持仓记录`,
      data: { holdings }
    }
  } catch (error) {
    return {
      success: false,
      message: `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Import transactions from JSON
 */
function importTransactionsFromJSON(jsonText: string): ImportResult {
  try {
    const data = JSON.parse(jsonText)
    
    if (!Array.isArray(data)) {
      return { success: false, message: 'JSON数据必须是数组格式' }
    }

    const transactions: MockTransaction[] = data.map((item, index) => {
      if (!item.date || !item.symbol || !item.name || !item.type || !item.quantity || !item.price) {
        throw new Error(`第${index + 1}条记录缺少必要字段`)
      }

      const quantity = Number(item.quantity)
      const price = Number(item.price)
      const commission = Number(item.commission) || 0
      const amount = quantity * price

      return {
        id: item.id || `T${Date.now()}_${index}`,
        date: item.date,
        symbol: item.symbol,
        name: item.name,
        type: item.type.toLowerCase() === 'buy' ? 'buy' : 'sell',
        quantity,
        price,
        amount,
        commission,
        totalAmount: amount + commission,
        notes: item.notes || ''
      }
    })

    return {
      success: true,
      message: `成功导入${transactions.length}条交易记录`,
      data: { transactions }
    }
  } catch (error) {
    return {
      success: false,
      message: `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * Export holdings to CSV
 */
export function exportHoldingsToCSV(holdings: MockHolding[]): string {
  const headers = ['股票代码', '股票名称', '持仓数量', '平均成本', '当前价格', '买入日期', '备注']
  const rows = holdings.map(holding => [
    holding.symbol,
    holding.name,
    holding.quantity.toString(),
    holding.avgPrice.toFixed(2),
    holding.currentPrice.toFixed(2),
    holding.buyDate,
    holding.notes || ''
  ])

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

/**
 * Export transactions to CSV
 */
export function exportTransactionsToCSV(transactions: MockTransaction[]): string {
  const headers = ['交易日期', '股票代码', '股票名称', '交易类型', '数量', '价格', '金额', '手续费', '备注']
  const rows = transactions.map(transaction => [
    transaction.date,
    transaction.symbol,
    transaction.name,
    transaction.type === 'buy' ? '买入' : '卖出',
    transaction.quantity.toString(),
    transaction.price.toFixed(2),
    transaction.amount.toFixed(2),
    transaction.commission.toFixed(2),
    transaction.notes || ''
  ])

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

/**
 * Get sample data for demonstration
 */
export function getSampleData() {
  return {
    holdings: mockHoldings,
    transactions: mockTransactions
  }
}
