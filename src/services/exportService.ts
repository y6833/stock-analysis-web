/**
 * 数据导出服务
 * 提供数据导出和报告生成功能
 */

import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import type { Stock, StockData } from '@/types/stock'
import type { BacktestResult } from '@/types/backtest'
import { formatDate, formatNumber, formatPercent } from '@/utils/formatters'

// 导出格式
export type ExportFormat = 'csv' | 'excel' | 'pdf'

// 导出服务
export const exportService = {
  /**
   * 导出股票数据
   * @param stock 股票信息
   * @param data 股票数据
   * @param format 导出格式
   */
  exportStockData(stock: Stock, data: StockData, format: ExportFormat): void {
    const filename = `${stock.symbol}_${stock.name}_${formatDate(new Date(), 'yyyy-MM-dd')}`
    
    // 准备数据
    const exportData = data.dates.map((date, index) => ({
      日期: date,
      开盘价: data.prices[index],
      最高价: data.high,
      最低价: data.low,
      收盘价: data.close,
      成交量: data.volumes[index]
    }))
    
    switch (format) {
      case 'csv':
        this.exportCSV(exportData, `${filename}.csv`)
        break
      case 'excel':
        this.exportExcel(exportData, `${filename}.xlsx`)
        break
      case 'pdf':
        this.exportStockPDF(stock, data, `${filename}.pdf`)
        break
    }
  },
  
  /**
   * 导出回测结果
   * @param result 回测结果
   * @param format 导出格式
   */
  exportBacktestResult(result: BacktestResult, format: ExportFormat): void {
    const filename = `回测结果_${result.params.symbol}_${formatDate(new Date(result.createdAt), 'yyyy-MM-dd')}`
    
    // 准备交易数据
    const tradesData = result.trades.map(trade => ({
      时间: formatDate(new Date(trade.timestamp), 'yyyy-MM-dd HH:mm'),
      方向: trade.direction === 'buy' ? '买入' : '卖出',
      价格: trade.price,
      数量: trade.quantity,
      金额: trade.amount,
      佣金: trade.commission,
      滑点: trade.slippage,
      原因: trade.reason
    }))
    
    // 准备绩效数据
    const performanceData = [
      { 指标: '总回报率', 值: formatPercent(result.performance.totalReturn) },
      { 指标: '年化回报率', 值: formatPercent(result.performance.annualizedReturn) },
      { 指标: '最大回撤', 值: formatPercent(result.performance.maxDrawdown) },
      { 指标: '夏普比率', 值: result.performance.sharpeRatio.toFixed(2) },
      { 指标: '胜率', 值: formatPercent(result.performance.winRate) },
      { 指标: '盈亏比', 值: result.performance.profitFactor.toFixed(2) },
      { 指标: '总交易次数', 值: result.performance.totalTrades },
      { 指标: '盈利交易次数', 值: result.performance.profitableTrades },
      { 指标: '亏损交易次数', 值: result.performance.lossTrades },
      { 指标: '平均盈利', 值: formatNumber(result.performance.averageProfit) },
      { 指标: '平均亏损', 值: formatNumber(result.performance.averageLoss) },
      { 指标: '平均持仓周期', 值: `${result.performance.averageHoldingPeriod}天` }
    ]
    
    switch (format) {
      case 'csv':
        this.exportCSV(tradesData, `${filename}_交易记录.csv`)
        this.exportCSV(performanceData, `${filename}_绩效指标.csv`)
        break
      case 'excel':
        this.exportBacktestExcel(result, `${filename}.xlsx`)
        break
      case 'pdf':
        this.exportBacktestPDF(result, `${filename}.pdf`)
        break
    }
  },
  
  /**
   * 导出投资组合数据
   * @param portfolio 投资组合数据
   * @param format 导出格式
   */
  exportPortfolio(portfolio: any, format: ExportFormat): void {
    const filename = `投资组合_${formatDate(new Date(), 'yyyy-MM-dd')}`
    
    // 准备持仓数据
    const positionsData = portfolio.positions.map((position: any) => ({
      股票代码: position.symbol,
      股票名称: position.name,
      持仓数量: position.quantity,
      平均成本: position.averageCost,
      当前价格: position.currentPrice,
      市值: position.marketValue,
      未实现盈亏: position.unrealizedPnL,
      未实现盈亏百分比: formatPercent(position.unrealizedPnLPercent),
      已实现盈亏: position.realizedPnL,
      总盈亏: position.totalPnL,
      总盈亏百分比: formatPercent(position.totalPnLPercent),
      开仓日期: formatDate(new Date(position.openDate), 'yyyy-MM-dd')
    }))
    
    switch (format) {
      case 'csv':
        this.exportCSV(positionsData, `${filename}.csv`)
        break
      case 'excel':
        this.exportExcel(positionsData, `${filename}.xlsx`)
        break
      case 'pdf':
        this.exportPortfolioPDF(portfolio, `${filename}.pdf`)
        break
    }
  },
  
  /**
   * 导出为CSV
   * @param data 数据
   * @param filename 文件名
   */
  exportCSV(data: any[], filename: string): void {
    if (data.length === 0) return
    
    // 获取表头
    const headers = Object.keys(data[0])
    
    // 生成CSV内容
    let csvContent = headers.join(',') + '\n'
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // 处理包含逗号的字段
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"`
          : value
      })
      csvContent += values.join(',') + '\n'
    })
    
    // 创建Blob并下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, filename)
  },
  
  /**
   * 导出为Excel
   * @param data 数据
   * @param filename 文件名
   */
  exportExcel(data: any[], filename: string): void {
    if (data.length === 0) return
    
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data)
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    // 导出工作簿
    XLSX.writeFile(wb, filename)
  },
  
  /**
   * 导出回测结果为Excel
   * @param result 回测结果
   * @param filename 文件名
   */
  exportBacktestExcel(result: BacktestResult, filename: string): void {
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    
    // 准备交易数据
    const tradesData = result.trades.map(trade => ({
      时间: formatDate(new Date(trade.timestamp), 'yyyy-MM-dd HH:mm'),
      方向: trade.direction === 'buy' ? '买入' : '卖出',
      价格: trade.price,
      数量: trade.quantity,
      金额: trade.amount,
      佣金: trade.commission,
      滑点: trade.slippage,
      原因: trade.reason
    }))
    
    // 准备绩效数据
    const performanceData = [
      { 指标: '总回报率', 值: formatPercent(result.performance.totalReturn) },
      { 指标: '年化回报率', 值: formatPercent(result.performance.annualizedReturn) },
      { 指标: '最大回撤', 值: formatPercent(result.performance.maxDrawdown) },
      { 指标: '夏普比率', 值: result.performance.sharpeRatio.toFixed(2) },
      { 指标: '胜率', 值: formatPercent(result.performance.winRate) },
      { 指标: '盈亏比', 值: result.performance.profitFactor.toFixed(2) },
      { 指标: '总交易次数', 值: result.performance.totalTrades },
      { 指标: '盈利交易次数', 值: result.performance.profitableTrades },
      { 指标: '亏损交易次数', 值: result.performance.lossTrades },
      { 指标: '平均盈利', 值: formatNumber(result.performance.averageProfit) },
      { 指标: '平均亏损', 值: formatNumber(result.performance.averageLoss) },
      { 指标: '平均持仓周期', 值: `${result.performance.averageHoldingPeriod}天` }
    ]
    
    // 准备权益曲线数据
    const equityData = result.equity.dates.map((date, index) => ({
      日期: date,
      权益: result.equity.values[index],
      回撤: result.drawdowns.values[index]
    }))
    
    // 创建工作表并添加到工作簿
    const tradesSheet = XLSX.utils.json_to_sheet(tradesData)
    XLSX.utils.book_append_sheet(wb, tradesSheet, '交易记录')
    
    const performanceSheet = XLSX.utils.json_to_sheet(performanceData)
    XLSX.utils.book_append_sheet(wb, performanceSheet, '绩效指标')
    
    const equitySheet = XLSX.utils.json_to_sheet(equityData)
    XLSX.utils.book_append_sheet(wb, equitySheet, '权益曲线')
    
    // 导出工作簿
    XLSX.writeFile(wb, filename)
  },
  
  /**
   * 导出股票数据为PDF
   * @param stock 股票信息
   * @param data 股票数据
   * @param filename 文件名
   */
  exportStockPDF(stock: Stock, data: StockData, filename: string): void {
    // 创建PDF文档
    const doc = new jsPDF()
    
    // 添加标题
    doc.setFontSize(18)
    doc.text(`${stock.name} (${stock.symbol}) 股票数据报告`, 14, 22)
    
    // 添加生成日期
    doc.setFontSize(10)
    doc.text(`生成日期: ${formatDate(new Date(), 'yyyy-MM-dd')}`, 14, 30)
    
    // 添加股票基本信息
    doc.setFontSize(12)
    doc.text(`市场: ${stock.market}`, 14, 40)
    doc.text(`行业: ${stock.industry}`, 14, 48)
    
    // 添加价格信息
    doc.text(`最新价格: ${data.close}`, 14, 56)
    doc.text(`最高价: ${data.high}`, 14, 64)
    doc.text(`最低价: ${data.low}`, 14, 72)
    
    // 准备表格数据
    const tableData = data.dates.slice(0, 20).map((date, index) => [
      date,
      data.prices[index].toString(),
      data.volumes[index].toString()
    ])
    
    // 添加表格
    (doc as any).autoTable({
      startY: 80,
      head: [['日期', '价格', '成交量']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    // 保存PDF
    doc.save(filename)
  },
  
  /**
   * 导出回测结果为PDF
   * @param result 回测结果
   * @param filename 文件名
   */
  exportBacktestPDF(result: BacktestResult, filename: string): void {
    // 创建PDF文档
    const doc = new jsPDF()
    
    // 添加标题
    doc.setFontSize(18)
    doc.text(`回测结果报告: ${result.params.symbol}`, 14, 22)
    
    // 添加生成日期
    doc.setFontSize(10)
    doc.text(`生成日期: ${formatDate(new Date(), 'yyyy-MM-dd')}`, 14, 30)
    
    // 添加回测参数信息
    doc.setFontSize(14)
    doc.text('回测参数', 14, 40)
    
    doc.setFontSize(10)
    doc.text(`策略类型: ${result.params.strategyType}`, 14, 48)
    doc.text(`时间范围: ${result.params.timeRange}`, 14, 54)
    doc.text(`回测频率: ${result.params.frequency}`, 14, 60)
    doc.text(`初始资金: ${formatNumber(result.params.initialCapital)}`, 14, 66)
    
    // 添加绩效指标
    doc.setFontSize(14)
    doc.text('绩效指标', 14, 76)
    
    // 准备绩效表格数据
    const performanceData = [
      ['总回报率', formatPercent(result.performance.totalReturn)],
      ['年化回报率', formatPercent(result.performance.annualizedReturn)],
      ['最大回撤', formatPercent(result.performance.maxDrawdown)],
      ['夏普比率', result.performance.sharpeRatio.toFixed(2)],
      ['胜率', formatPercent(result.performance.winRate)],
      ['盈亏比', result.performance.profitFactor.toFixed(2)],
      ['总交易次数', result.performance.totalTrades.toString()],
      ['盈利交易次数', result.performance.profitableTrades.toString()],
      ['亏损交易次数', result.performance.lossTrades.toString()],
      ['平均盈利', formatNumber(result.performance.averageProfit)],
      ['平均亏损', formatNumber(result.performance.averageLoss)],
      ['平均持仓周期', `${result.performance.averageHoldingPeriod}天`]
    ]
    
    // 添加绩效表格
    (doc as any).autoTable({
      startY: 80,
      head: [['指标', '值']],
      body: performanceData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    // 添加交易记录
    doc.addPage()
    doc.setFontSize(14)
    doc.text('交易记录', 14, 20)
    
    // 准备交易表格数据
    const tradesData = result.trades.slice(0, 20).map(trade => [
      formatDate(new Date(trade.timestamp), 'yyyy-MM-dd'),
      trade.direction === 'buy' ? '买入' : '卖出',
      trade.price.toString(),
      trade.quantity.toString(),
      formatNumber(trade.amount),
      trade.reason
    ])
    
    // 添加交易表格
    (doc as any).autoTable({
      startY: 25,
      head: [['日期', '方向', '价格', '数量', '金额', '原因']],
      body: tradesData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    // 保存PDF
    doc.save(filename)
  },
  
  /**
   * 导出投资组合为PDF
   * @param portfolio 投资组合数据
   * @param filename 文件名
   */
  exportPortfolioPDF(portfolio: any, filename: string): void {
    // 创建PDF文档
    const doc = new jsPDF()
    
    // 添加标题
    doc.setFontSize(18)
    doc.text('投资组合报告', 14, 22)
    
    // 添加生成日期
    doc.setFontSize(10)
    doc.text(`生成日期: ${formatDate(new Date(), 'yyyy-MM-dd')}`, 14, 30)
    
    // 添加投资组合概览
    doc.setFontSize(14)
    doc.text('投资组合概览', 14, 40)
    
    doc.setFontSize(10)
    doc.text(`总资产: ${formatNumber(portfolio.totalAssets)}`, 14, 48)
    doc.text(`现金: ${formatNumber(portfolio.cash)}`, 14, 54)
    doc.text(`持仓市值: ${formatNumber(portfolio.marketValue)}`, 14, 60)
    doc.text(`总收益率: ${formatPercent(portfolio.totalReturn)}`, 14, 66)
    
    // 添加持仓明细
    doc.setFontSize(14)
    doc.text('持仓明细', 14, 76)
    
    // 准备持仓表格数据
    const positionsData = portfolio.positions.map((position: any) => [
      position.symbol,
      position.name,
      position.quantity.toString(),
      formatNumber(position.averageCost),
      formatNumber(position.currentPrice),
      formatNumber(position.marketValue),
      formatPercent(position.unrealizedPnLPercent)
    ])
    
    // 添加持仓表格
    (doc as any).autoTable({
      startY: 80,
      head: [['代码', '名称', '数量', '成本', '现价', '市值', '收益率']],
      body: positionsData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    // 保存PDF
    doc.save(filename)
  }
}

export default exportService
