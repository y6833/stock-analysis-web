<script setup lang="ts">
import { ref, computed } from 'vue'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatDate, formatNumber, formatPercent } from '@/utils/formatters'
import type { Stock, StockData } from '@/types/stock'

const props = defineProps<{
  stock: Stock
  stockData: StockData
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 报告类型
const reportType = ref<'basic' | 'comprehensive' | 'custom'>('comprehensive')

// 自定义报告选项
const customOptions = ref({
  includeBasicInfo: true,
  includePriceChart: true,
  includeVolumeChart: true,
  includeTechnicalIndicators: true,
  includeHistoricalData: true,
  includeFinancialSummary: true,
  includeNewsAndEvents: false
})

// 报告生成状态
const isGenerating = ref(false)
const generationProgress = ref(0)

// 报告类型选项
const reportTypeOptions = [
  { value: 'basic', label: '基础报告', description: '包含基本股票信息和价格数据' },
  { value: 'comprehensive', label: '综合报告', description: '包含详细的技术分析和历史数据' },
  { value: 'custom', label: '自定义报告', description: '选择要包含的报告部分' }
]

// 报告标题
const reportTitle = computed(() => {
  return `${props.stock.name} (${props.stock.symbol}) 股票分析报告`
})

// 生成报告
const generateReport = async () => {
  if (isGenerating.value) return
  
  isGenerating.value = true
  generationProgress.value = 0
  
  try {
    // 创建PDF文档
    const doc = new jsPDF()
    
    // 添加报告标题
    doc.setFontSize(18)
    doc.text(reportTitle.value, 14, 22)
    
    // 添加生成日期
    doc.setFontSize(10)
    doc.text(`生成日期: ${formatDate(new Date(), 'yyyy-MM-dd')}`, 14, 30)
    
    let currentY = 40
    
    // 根据报告类型或自定义选项添加内容
    if (reportType.value === 'basic' || 
        reportType.value === 'comprehensive' || 
        (reportType.value === 'custom' && customOptions.value.includeBasicInfo)) {
      currentY = addBasicInfo(doc, currentY)
      generationProgress.value = 20
    }
    
    if (reportType.value === 'comprehensive' || 
        (reportType.value === 'custom' && customOptions.value.includeHistoricalData)) {
      currentY = addHistoricalData(doc, currentY)
      generationProgress.value = 40
    }
    
    if (reportType.value === 'comprehensive' || 
        (reportType.value === 'custom' && customOptions.value.includeTechnicalIndicators)) {
      currentY = addTechnicalIndicators(doc, currentY)
      generationProgress.value = 60
    }
    
    if (reportType.value === 'comprehensive' || 
        (reportType.value === 'custom' && customOptions.value.includeFinancialSummary)) {
      currentY = addFinancialSummary(doc, currentY)
      generationProgress.value = 80
    }
    
    if (reportType.value === 'comprehensive' || 
        (reportType.value === 'custom' && customOptions.value.includeNewsAndEvents)) {
      currentY = addNewsAndEvents(doc, currentY)
    }
    
    generationProgress.value = 100
    
    // 保存PDF
    doc.save(`${props.stock.symbol}_分析报告_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('生成报告失败:', error)
  } finally {
    isGenerating.value = false
  }
}

// 添加基本信息
const addBasicInfo = (doc: jsPDF, startY: number): number => {
  doc.setFontSize(14)
  doc.text('基本信息', 14, startY)
  
  doc.setFontSize(10)
  doc.text(`股票代码: ${props.stock.symbol}`, 14, startY + 10)
  doc.text(`股票名称: ${props.stock.name}`, 14, startY + 18)
  doc.text(`所属市场: ${props.stock.market}`, 14, startY + 26)
  doc.text(`所属行业: ${props.stock.industry}`, 14, startY + 34)
  
  // 添加价格信息
  doc.text(`最新价格: ${props.stockData.close}`, 14, startY + 42)
  doc.text(`最高价: ${props.stockData.high}`, 14, startY + 50)
  doc.text(`最低价: ${props.stockData.low}`, 14, startY + 58)
  
  return startY + 68
}

// 添加历史数据
const addHistoricalData = (doc: jsPDF, startY: number): number => {
  // 检查是否需要添加新页
  if (startY > 200) {
    doc.addPage()
    startY = 20
  }
  
  doc.setFontSize(14)
  doc.text('历史数据', 14, startY)
  
  // 准备表格数据
  const tableData = props.stockData.dates.slice(0, 15).map((date, index) => [
    date,
    props.stockData.prices[index].toString(),
    props.stockData.volumes[index].toString()
  ])
  
  // 添加表格
  (doc as any).autoTable({
    startY: startY + 10,
    head: [['日期', '价格', '成交量']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // 获取表格结束位置
  const finalY = (doc as any).lastAutoTable.finalY
  
  return finalY + 10
}

// 添加技术指标
const addTechnicalIndicators = (doc: jsPDF, startY: number): number => {
  // 检查是否需要添加新页
  if (startY > 200) {
    doc.addPage()
    startY = 20
  }
  
  doc.setFontSize(14)
  doc.text('技术指标', 14, startY)
  
  // 模拟技术指标数据
  const indicators = [
    { name: 'MA5', value: '25.34', description: '5日移动平均线' },
    { name: 'MA10', value: '24.89', description: '10日移动平均线' },
    { name: 'MA20', value: '24.12', description: '20日移动平均线' },
    { name: 'RSI', value: '58.67', description: '相对强弱指标' },
    { name: 'MACD', value: '0.23', description: '指数平滑异同移动平均线' },
    { name: 'KDJ', value: 'K:65.32 D:58.45 J:72.18', description: '随机指标' },
    { name: 'BOLL', value: 'UP:26.45 MID:24.78 LOW:23.11', description: '布林带' }
  ]
  
  // 添加表格
  (doc as any).autoTable({
    startY: startY + 10,
    head: [['指标', '值', '说明']],
    body: indicators.map(indicator => [indicator.name, indicator.value, indicator.description]),
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // 获取表格结束位置
  const finalY = (doc as any).lastAutoTable.finalY
  
  return finalY + 10
}

// 添加财务摘要
const addFinancialSummary = (doc: jsPDF, startY: number): number => {
  // 检查是否需要添加新页
  if (startY > 200) {
    doc.addPage()
    startY = 20
  }
  
  doc.setFontSize(14)
  doc.text('财务摘要', 14, startY)
  
  // 模拟财务数据
  const financialData = [
    { item: '市盈率(PE)', value: '18.45' },
    { item: '市净率(PB)', value: '2.34' },
    { item: '市销率(PS)', value: '3.12' },
    { item: '每股收益(EPS)', value: '1.35' },
    { item: '每股净资产', value: '10.78' },
    { item: '净资产收益率(ROE)', value: '12.45%' },
    { item: '营业收入(亿元)', value: '87.56' },
    { item: '净利润(亿元)', value: '15.23' },
    { item: '营收增长率', value: '15.67%' },
    { item: '净利润增长率', value: '12.34%' }
  ]
  
  // 添加表格
  (doc as any).autoTable({
    startY: startY + 10,
    head: [['财务指标', '值']],
    body: financialData.map(item => [item.item, item.value]),
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // 获取表格结束位置
  const finalY = (doc as any).lastAutoTable.finalY
  
  return finalY + 10
}

// 添加新闻与事件
const addNewsAndEvents = (doc: jsPDF, startY: number): number => {
  // 检查是否需要添加新页
  if (startY > 200) {
    doc.addPage()
    startY = 20
  }
  
  doc.setFontSize(14)
  doc.text('新闻与事件', 14, startY)
  
  // 模拟新闻数据
  const newsData = [
    { date: '2023-05-15', title: '公司发布2023年第一季度财报，营收超预期' },
    { date: '2023-04-28', title: '公司宣布新产品发布计划，市场反应积极' },
    { date: '2023-04-10', title: '公司完成重大收购，扩大市场份额' },
    { date: '2023-03-22', title: '公司获得行业创新奖，技术实力获认可' },
    { date: '2023-03-05', title: '公司宣布股票回购计划，提振投资者信心' }
  ]
  
  // 添加表格
  (doc as any).autoTable({
    startY: startY + 10,
    head: [['日期', '新闻标题']],
    body: newsData.map(news => [news.date, news.title]),
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] }
  })
  
  // 获取表格结束位置
  const finalY = (doc as any).lastAutoTable.finalY
  
  return finalY + 10
}

// 关闭面板
const closePanel = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="report-generator-overlay">
    <div class="report-generator-panel">
      <div class="generator-header">
        <h2>生成股票分析报告</h2>
        <button class="btn-icon-only" @click="closePanel">
          <span>✖</span>
        </button>
      </div>
      
      <div class="generator-content">
        <div class="report-info">
          <h3>{{ reportTitle }}</h3>
          <p>生成日期: {{ formatDate(new Date(), 'yyyy-MM-dd') }}</p>
        </div>
        
        <div class="report-type-selection">
          <h3>选择报告类型</h3>
          
          <div class="report-type-options">
            <div 
              v-for="option in reportTypeOptions" 
              :key="option.value"
              class="report-type-option"
              :class="{ active: reportType === option.value }"
              @click="reportType = option.value as 'basic' | 'comprehensive' | 'custom'"
            >
              <div class="option-info">
                <div class="option-label">{{ option.label }}</div>
                <div class="option-description">{{ option.description }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="reportType === 'custom'" class="custom-options">
          <h3>自定义报告选项</h3>
          
          <div class="options-list">
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeBasicInfo" 
                v-model="customOptions.includeBasicInfo"
              />
              <label for="includeBasicInfo">基本信息</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includePriceChart" 
                v-model="customOptions.includePriceChart"
              />
              <label for="includePriceChart">价格图表</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeVolumeChart" 
                v-model="customOptions.includeVolumeChart"
              />
              <label for="includeVolumeChart">成交量图表</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeTechnicalIndicators" 
                v-model="customOptions.includeTechnicalIndicators"
              />
              <label for="includeTechnicalIndicators">技术指标</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeHistoricalData" 
                v-model="customOptions.includeHistoricalData"
              />
              <label for="includeHistoricalData">历史数据</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeFinancialSummary" 
                v-model="customOptions.includeFinancialSummary"
              />
              <label for="includeFinancialSummary">财务摘要</label>
            </div>
            
            <div class="option-item">
              <input 
                type="checkbox" 
                id="includeNewsAndEvents" 
                v-model="customOptions.includeNewsAndEvents"
              />
              <label for="includeNewsAndEvents">新闻与事件</label>
            </div>
          </div>
        </div>
        
        <div v-if="isGenerating" class="generation-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${generationProgress}%` }"></div>
          </div>
          <div class="progress-text">生成中... {{ generationProgress }}%</div>
        </div>
      </div>
      
      <div class="generator-footer">
        <button 
          class="btn btn-primary" 
          @click="generateReport"
          :disabled="isGenerating"
        >
          <span v-if="!isGenerating">生成报告</span>
          <span v-else class="loading-spinner-small"></span>
        </button>
        <button class="btn btn-outline" @click="closePanel">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-generator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.report-generator-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.generator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.generator-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.generator-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.report-info h3 {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.report-info p {
  color: var(--text-secondary);
  margin: 0;
  font-size: var(--font-size-sm);
}

.report-type-selection h3,
.custom-options h3 {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 600;
}

.report-type-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.report-type-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.report-type-option:hover {
  background-color: var(--bg-tertiary);
}

.report-type-option.active {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}

.option-info {
  flex: 1;
}

.option-label {
  font-weight: 500;
  color: var(--text-primary);
}

.option-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

.options-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.option-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.option-item label {
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.generation-progress {
  margin-top: var(--spacing-md);
}

.progress-bar {
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  text-align: center;
}

.generator-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .report-generator-panel {
    width: 95%;
    max-height: 95vh;
  }
  
  .options-list {
    grid-template-columns: 1fr;
  }
}
</style>
