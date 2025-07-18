<template>
  <div class="doji-pattern-screener-results">
    <el-card class="result-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>筛选结果</span>
          <div class="header-actions">
            <el-button type="success" size="small" :disabled="!hasResults" @click="exportResults">
              导出结果
            </el-button>
            <el-button type="primary" size="small" :disabled="!hasResults" @click="refreshResults">
              刷新
            </el-button>
            <el-button 
              type="info" 
              size="small" 
              :disabled="!hasResults" 
              @click="showAnalysis = !showAnalysis"
            >
              {{ showAnalysis ? '隐藏分析' : '显示分析' }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!hasResults && !loading" class="empty-result">
        <el-empty description="暂无筛选结果，请设置筛选条件并点击"开始筛选""></el-empty>
      </div>

      <div v-else-if="hasResults" class="result-content">
        <div class="result-summary">
          共找到 <strong>{{ screenResult.total }}</strong> 个符合条件的结果
          <span v-if="filteredStocks.length !== screenResult.total" class="filtered-count">
            (当前筛选: <strong>{{ filteredStocks.length }}</strong> 个)
          </span>
        </div>

        <!-- 使用虚拟滚动优化大量数据渲染 -->
        <el-table
          :data="paginatedData"
          style="width: 100%"
          border
          stripe
          :default-sort="{ prop: 'rank', order: 'ascending' }"
          height="500"
          v-infinite-scroll="loadMoreData"
          :infinite-scroll-disabled="infiniteScrollDisabled"
          :infinite-scroll-distance="10"
        >
          <el-table-column prop="rank" label="排名" width="70" sortable />
          <el-table-column prop="stockId" label="股票代码" width="100" />
          <el-table-column prop="stockName" label="股票名称" width="120" />
          <el-table-column label="形态类型" width="120">
            <template #default="scope">
              <el-tag :type="getPatternTagType(scope.row.patternType)">
                {{ getPatternTypeName(scope.row.patternType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="形态日期" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.patternDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="priceChange" label="价格变化" width="120" sortable>
            <template #default="scope">
              <span :class="scope.row.priceChange >= 0 ? 'price-up' : 'price-down'">
                {{ scope.row.priceChange.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="volumeChange" label="成交量变化" width="120" sortable>
            <template #default="scope">
              <span :class="scope.row.volumeChange >= 0 ? 'volume-up' : 'volume-down'">
                {{ scope.row.volumeChange.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="significance" label="显著性" width="100" sortable>
            <template #default="scope">
              <el-progress 
                :percentage="scope.row.significance * 100" 
                :color="getSignificanceColor(scope.row.significance)"
                :stroke-width="10"
                :show-text="false"
              />
              <span>{{ (scope.row.significance * 100).toFixed(0) }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="viewStockDetail(scope.row)">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredStocks.length"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
    
    <!-- 结果分析组件 -->
    <doji-pattern-result-analysis
      v-if="showAnalysis && hasResults"
      :screen-result="{ ...screenResult, stocks: filteredStocks }"
      :loading="loading"
      @refresh="refreshResults"
      @filter-change="handleFilterChange"
    />

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="十字星形态详情"
      width="70%"
      destroy-on-close
    >
      <div v-if="selectedStock" class="stock-detail">
        <div class="detail-header">
          <h3>{{ selectedStock.stockName }} ({{ selectedStock.stockId }})</h3>
          <el-tag :type="getPatternTagType(selectedStock.patternType)" size="large">
            {{ getPatternTypeName(selectedStock.patternType) }}
          </el-tag>
        </div>

        <el-divider />

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="detail-section">
              <h4>基本信息</h4>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="形态日期">{{ formatDate(selectedStock.patternDate) }}</el-descriptions-item>
                <el-descriptions-item label="形态显著性">
                  <el-progress 
                    :percentage="selectedStock.significance * 100" 
                    :color="getSignificanceColor(selectedStock.significance)"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="形态前价格">{{ selectedStock.priceBeforePattern.toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="当前价格">{{ selectedStock.currentPrice.toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="价格变化">
                  <span :class="selectedStock.priceChange >= 0 ? 'price-up' : 'price-down'">
                    {{ selectedStock.priceChange.toFixed(2) }}%
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="成交量变化">
                  <span :class="selectedStock.volumeChange >= 0 ? 'volume-up' : 'volume-down'">
                    {{ selectedStock.volumeChange.toFixed(2) }}%
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="detail-section">
              <h4>形态特征</h4>
              <div class="pattern-description">
                <p>{{ getPatternDescription(selectedStock.patternType) }}</p>
              </div>
              
              <h4 class="mt-4">后续价格走势</h4>
              <div class="price-trend-chart">
                <!-- 这里可以放置价格走势图表 -->
                <div class="chart-placeholder">
                  <el-empty description="价格走势图表加载中..." />
                </div>
              </div>
            </div>
          </el-col>
        </el-row>

        <el-divider />

        <div class="detail-section">
          <h4>相似历史形态</h4>
          <div class="similar-patterns">
            <!-- 这里可以放置相似形态列表 -->
            <el-empty description="暂无相似历史形态数据" />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 导出选项弹窗 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出筛选结果"
      width="30%"
    >
      <el-form label-position="top">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio label="csv">CSV 格式</el-radio>
            <el-radio label="excel">Excel 格式</el-radio>
            <el-radio label="json">JSON 格式</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="导出内容">
          <el-checkbox-group v-model="exportFields">
            <el-checkbox label="stockId">股票代码</el-checkbox>
            <el-checkbox label="stockName">股票名称</el-checkbox>
            <el-checkbox label="patternType">形态类型</el-checkbox>
            <el-checkbox label="patternDate">形态日期</el-checkbox>
            <el-checkbox label="priceChange">价格变化</el-checkbox>
            <el-checkbox label="volumeChange">成交量变化</el-checkbox>
            <el-checkbox label="significance">显著性</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleExport">
            确认导出
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, watch } from 'vue'
import type { DojiType } from '../../types/technical-analysis/doji'
import type { StockScreenResult, UpwardStockResult } from '../../types/technical-analysis/screener'
import DojiPatternResultAnalysis from './DojiPatternResultAnalysis.vue'

export default defineComponent({
  name: 'DojiPatternScreenerResults',
  
  components: {
    DojiPatternResultAnalysis
  },

  props: {
    screenResult: {
      type: Object as PropType<StockScreenResult>,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['refresh', 'view-detail'],

  setup(props, { emit }) {
    // 分页
    const currentPage = ref(1)
    const pageSize = ref(20)
    const virtualScrollData = ref<UpwardStockResult[]>([])
    const loadedItemCount = ref(0)
    const batchSize = 20

    // 详情弹窗
    const detailDialogVisible = ref(false)
    const selectedStock = ref<UpwardStockResult | null>(null)

    // 导出弹窗
    const exportDialogVisible = ref(false)
    const exportFormat = ref('csv')
    const exportFields = ref(['stockId', 'stockName', 'patternType', 'patternDate', 'priceChange', 'volumeChange', 'significance'])
    
    // 分析相关
    const showAnalysis = ref(false)
    const filteredStocks = ref<UpwardStockResult[]>([])
    
    // 初始化筛选结果
    watch(() => props.screenResult, () => {
      filteredStocks.value = [...props.screenResult.stocks]
    }, { immediate: true })

    // 是否有结果
    const hasResults = computed(() => props.screenResult.stocks.length > 0)

    // 分页数据
    const paginatedData = computed(() => {
      if (!filteredStocks.value.length) return []
      
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredStocks.value.slice(start, end)
    })

    // 虚拟滚动相关
    const infiniteScrollDisabled = computed(() => {
      return loadedItemCount.value >= props.screenResult.stocks.length
    })

    // 加载更多数据
    const loadMoreData = () => {
      if (infiniteScrollDisabled.value) return
      
      const nextBatch = props.screenResult.stocks.slice(
        loadedItemCount.value,
        loadedItemCount.value + batchSize
      )
      
      virtualScrollData.value = [...virtualScrollData.value, ...nextBatch]
      loadedItemCount.value += nextBatch.length
    }

    // 监听结果变化，重置虚拟滚动
    watch(() => props.screenResult, () => {
      virtualScrollData.value = props.screenResult.stocks.slice(0, batchSize)
      loadedItemCount.value = Math.min(batchSize, props.screenResult.stocks.length)
      currentPage.value = 1
    }, { deep: true })

    // 刷新结果
    const refreshResults = () => {
      emit('refresh')
    }

    // 查看股票详情
    const viewStockDetail = (stock: UpwardStockResult) => {
      selectedStock.value = stock
      detailDialogVisible.value = true
      emit('view-detail', stock)
    }

    // 导出结果
    const exportResults = () => {
      if (!hasResults.value) return
      exportDialogVisible.value = true
    }

    // 处理导出
    const handleExport = () => {
      if (!hasResults.value) return

      const selectedFields = exportFields.value
      
      if (exportFormat.value === 'csv') {
        exportToCsv(selectedFields)
      } else if (exportFormat.value === 'excel') {
        // 实际项目中可能需要使用第三方库如 xlsx 来实现
        exportToCsv(selectedFields) // 暂时使用 CSV 替代
      } else if (exportFormat.value === 'json') {
        exportToJson(selectedFields)
      }
      
      exportDialogVisible.value = false
    }

    // 导出为 CSV
    const exportToCsv = (fields: string[]) => {
      // 创建表头
      const headerMap: Record<string, string> = {
        stockId: '股票代码',
        stockName: '股票名称',
        patternType: '形态类型',
        patternDate: '形态日期',
        priceChange: '价格变化(%)',
        volumeChange: '成交量变化(%)',
        significance: '显著性(%)',
        rank: '排名'
      }
      
      const headers = fields.map(field => headerMap[field] || field)
      
      // 创建数据行
      const rows = props.screenResult.stocks.map(stock => {
        return fields.map(field => {
          if (field === 'patternType') {
            return getPatternTypeName(stock[field as keyof UpwardStockResult] as DojiType)
          } else if (field === 'patternDate') {
            return formatDate(stock[field as keyof UpwardStockResult] as number)
          } else if (field === 'priceChange' || field === 'volumeChange') {
            return (stock[field as keyof UpwardStockResult] as number).toFixed(2)
          } else if (field === 'significance') {
            return ((stock[field as keyof UpwardStockResult] as number) * 100).toFixed(0)
          } else {
            return stock[field as keyof UpwardStockResult]
          }
        })
      })

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // 创建下载链接
      downloadFile(csvContent, `十字星筛选结果_${formatDate(Date.now())}.csv`, 'text/csv;charset=utf-8;')
    }

    // 导出为 JSON
    const exportToJson = (fields: string[]) => {
      const data = props.screenResult.stocks.map(stock => {
        const item: Record<string, any> = {}
        fields.forEach(field => {
          if (field === 'patternType') {
            item[field] = stock[field as keyof UpwardStockResult]
            item[`${field}Name`] = getPatternTypeName(stock[field as keyof UpwardStockResult] as DojiType)
          } else if (field === 'patternDate') {
            item[field] = stock[field as keyof UpwardStockResult]
            item[`${field}Formatted`] = formatDate(stock[field as keyof UpwardStockResult] as number)
          } else {
            item[field] = stock[field as keyof UpwardStockResult]
          }
        })
        return item
      })

      const jsonContent = JSON.stringify(data, null, 2)
      downloadFile(jsonContent, `十字星筛选结果_${formatDate(Date.now())}.json`, 'application/json')
    }

    // 下载文件
    const downloadFile = (content: string, fileName: string, contentType: string) => {
      const blob = new Blob([content], { type: contentType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // 分页处理
    const handleSizeChange = (size: number) => {
      pageSize.value = size
    }

    const handleCurrentChange = (page: number) => {
      currentPage.value = page
    }

    // 格式化日期
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // 获取形态类型名称
    const getPatternTypeName = (type: DojiType): string => {
      const typeMap: Record<DojiType, string> = {
        standard: '标准十字星',
        dragonfly: '蜻蜓十字星',
        gravestone: '墓碑十字星',
        longLegged: '长腿十字星'
      }
      return typeMap[type] || '未知形态'
    }

    // 获取形态标签类型
    const getPatternTagType = (type: DojiType): string => {
      const typeMap: Record<DojiType, string> = {
        standard: '',
        dragonfly: 'success',
        gravestone: 'danger',
        longLegged: 'warning'
      }
      return typeMap[type] || 'info'
    }

    // 获取显著性颜色
    const getSignificanceColor = (significance: number): string => {
      if (significance >= 0.8) return '#67C23A'
      if (significance >= 0.6) return '#E6A23C'
      if (significance >= 0.4) return '#F56C6C'
      return '#909399'
    }

    // 获取形态描述
    const getPatternDescription = (type: DojiType): string => {
      const descriptions: Record<DojiType, string> = {
        standard: '标准十字星是一种开盘价和收盘价几乎相同的K线形态，表示市场处于犹豫不决的状态。在上升趋势中出现可能预示着反转，在下跌趋势中出现则可能是反弹信号。',
        dragonfly: '蜻蜓十字星的特点是开盘价、收盘价和最高价几乎相同，有一根长下影线。通常在下跌趋势末期出现，是潜在的看涨反转信号。',
        gravestone: '墓碑十字星的特点是开盘价、收盘价和最低价几乎相同，有一根长上影线。通常在上升趋势末期出现，是潜在的看跌反转信号。',
        longLegged: '长腿十字星有较长的上下影线，表示市场波动剧烈但最终收盘价接近开盘价。这种形态表明市场存在高度不确定性，可能预示着重要的转折点。'
      }
      return descriptions[type] || '暂无形态描述'
    }
    
    // 处理分析组件的筛选变化
    const handleFilterChange = (filteredData: UpwardStockResult[]) => {
      filteredStocks.value = filteredData
      currentPage.value = 1 // 重置到第一页
    }

    return {
      currentPage,
      pageSize,
      hasResults,
      paginatedData,
      virtualScrollData,
      infiniteScrollDisabled,
      detailDialogVisible,
      selectedStock,
      exportDialogVisible,
      exportFormat,
      exportFields,
      showAnalysis,
      filteredStocks,
      loadMoreData,
      refreshResults,
      exportResults,
      handleExport,
      viewStockDetail,
      handleSizeChange,
      handleCurrentChange,
      formatDate,
      getPatternTypeName,
      getPatternTagType,
      getSignificanceColor,
      getPatternDescription,
      handleFilterChange
    }
  }
})
</script>

<style scoped>
.result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.empty-result {
  padding: 40px 0;
  text-align: center;
}

.result-summary {
  margin-bottom: 15px;
  font-size: 14px;
  color: #606266;
}

.price-up {
  color: #F56C6C;
  font-weight: bold;
}

.price-down {
  color: #67C23A;
  font-weight: bold;
}

.volume-up {
  color: #F56C6C;
}

.volume-down {
  color: #67C23A;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 详情弹窗样式 */
.stock-detail {
  padding: 0 10px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-section {
  margin-bottom: 20px;
}

.pattern-description {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.mt-4 {
  margin-top: 16px;
}
</style>