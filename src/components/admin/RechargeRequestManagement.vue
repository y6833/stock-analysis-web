<template>
  <div class="recharge-request-management">
    <h2 class="section-title">充值请求管理</h2>
    <p class="section-description">管理和处理用户的逗币充值请求</p>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stats-card">
        <div class="card-header">
          <h3>充值概览</h3>
          <span class="card-icon">💰</span>
        </div>
        <div class="card-body">
          <div class="stat-item">
            <span class="stat-label">总充值请求</span>
            <span class="stat-value">{{ stats.totalRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">待处理</span>
            <span class="stat-value">{{ stats.pendingRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已完成</span>
            <span class="stat-value">{{ stats.completedRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已拒绝</span>
            <span class="stat-value">{{ stats.rejectedRequests }}</span>
          </div>
        </div>
      </div>

      <div class="stats-card">
        <div class="card-header">
          <h3>金额统计</h3>
          <span class="card-icon">📊</span>
        </div>
        <div class="card-body">
          <div class="stat-item">
            <span class="stat-label">总充值金额</span>
            <span class="stat-value">¥{{ stats.totalAmount.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总充值逗币</span>
            <span class="stat-value">{{ stats.totalCoins }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均充值金额</span>
            <span class="stat-value">¥{{ stats.averageAmount.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最高充值金额</span>
            <span class="stat-value">¥{{ stats.maxAmount.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <div class="chart-card">
        <div class="card-header">
          <h3>充值趋势</h3>
          <div class="header-actions">
            <el-select v-model="trendChartPeriod" placeholder="选择时间范围" size="small">
              <el-option label="最近7天" value="7days" />
              <el-option label="最近30天" value="30days" />
              <el-option label="最近90天" value="90days" />
            </el-select>
          </div>
        </div>
        <div class="card-body">
          <div ref="trendChartRef" class="chart-container"></div>
        </div>
      </div>

      <div class="chart-card">
        <div class="card-header">
          <h3>充值金额分布</h3>
        </div>
        <div class="card-body">
          <div ref="amountDistributionChartRef" class="chart-container"></div>
        </div>
      </div>
    </div>

    <!-- 用户充值排行榜 -->
    <div class="ranking-card">
      <div class="card-header">
        <h3>用户充值排行</h3>
        <div class="header-actions">
          <el-select v-model="rankingPeriod" placeholder="选择时间范围" size="small">
            <el-option label="全部时间" value="all" />
            <el-option label="本月" value="month" />
            <el-option label="本年" value="year" />
          </el-select>
        </div>
      </div>
      <div class="card-body">
        <el-table :data="userRankings" stripe style="width: 100%">
          <el-table-column type="index" label="排名" width="80" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
          <el-table-column prop="totalAmount" label="充值金额">
            <template #default="scope"> ¥{{ scope.row.totalAmount.toFixed(2) }} </template>
          </el-table-column>
          <el-table-column prop="totalCoins" label="充值逗币" />
          <el-table-column prop="requestCount" label="充值次数" />
        </el-table>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-card">
      <div class="card-header">
        <h3>充值请求列表</h3>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="exportData">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </div>
      </div>
      <div class="filter-form">
        <el-form :model="filters" inline>
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable>
              <el-option label="待处理" value="pending" />
              <el-option label="已完成" value="completed" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="用户ID">
            <el-input v-model="filters.userId" placeholder="输入用户ID" clearable />
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="金额范围">
            <el-input-number
              v-model="filters.minAmount"
              :min="0"
              :precision="2"
              placeholder="最小金额"
              style="width: 120px"
            />
            <span class="range-separator">至</span>
            <el-input-number
              v-model="filters.maxAmount"
              :min="0"
              :precision="2"
              placeholder="最大金额"
              style="width: 120px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchRequests">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 请求列表 -->
      <div class="request-list">
        <el-table
          v-loading="isLoading"
          :data="requests"
          border
          stripe
          style="width: 100%"
          @sort-change="handleSortChange"
        >
          <el-table-column prop="id" label="ID" width="80" sortable="custom" />
          <el-table-column label="用户信息" width="200">
            <template #default="scope">
              <div class="user-info">
                <div class="username">{{ scope.row.applicantUser?.username || '未知用户' }}</div>
                <div class="email">{{ scope.row.applicantUser?.email || '无邮箱' }}</div>
                <div class="user-id">ID: {{ scope.row.userId }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="充值信息" width="180">
            <template #default="scope">
              <div class="recharge-info">
                <div class="amount">{{ scope.row.amount }} 逗币</div>
                <div class="payment">¥{{ scope.row.paymentAmount }}</div>
                <div class="method">{{ formatPaymentMethod(scope.row.paymentMethod) }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" sortable="custom" prop="status">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ formatStatus(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" show-overflow-tooltip />
          <el-table-column label="申请时间" width="180" sortable="custom" prop="createdAt">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="处理时间" width="180" sortable="custom" prop="processedAt">
            <template #default="scope">
              <span v-if="scope.row.processedAt">
                {{ formatDate(scope.row.processedAt) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="处理人" width="120">
            <template #default="scope">
              <span v-if="scope.row.adminUser">
                {{ scope.row.adminUser.username }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button
                  v-if="scope.row.status === 'pending'"
                  type="success"
                  size="small"
                  @click="handleProcess(scope.row, 'completed')"
                >
                  通过
                </el-button>
                <el-button
                  v-if="scope.row.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="handleProcess(scope.row, 'rejected')"
                >
                  拒绝
                </el-button>
                <el-button type="primary" size="small" @click="handleViewDetail(scope.row)">
                  详情
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="充值请求详情" width="600px">
      <div v-if="detailDialog.request" class="request-detail">
        <div class="detail-section">
          <h3>基本信息</h3>
          <div class="detail-item">
            <span class="detail-label">请求ID:</span>
            <span class="detail-value">{{ detailDialog.request.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">状态:</span>
            <span class="detail-value">
              <el-tag :type="getStatusType(detailDialog.request.status)">
                {{ formatStatus(detailDialog.request.status) }}
              </el-tag>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">申请时间:</span>
            <span class="detail-value">{{ formatDate(detailDialog.request.createdAt) }}</span>
          </div>
          <div class="detail-item" v-if="detailDialog.request.processedAt">
            <span class="detail-label">处理时间:</span>
            <span class="detail-value">{{ formatDate(detailDialog.request.processedAt) }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>用户信息</h3>
          <div class="detail-item">
            <span class="detail-label">用户ID:</span>
            <span class="detail-value">{{ detailDialog.request.userId }}</span>
          </div>
          <div class="detail-item" v-if="detailDialog.request.applicantUser">
            <span class="detail-label">用户名:</span>
            <span class="detail-value">{{ detailDialog.request.applicantUser.username }}</span>
          </div>
          <div class="detail-item" v-if="detailDialog.request.applicantUser">
            <span class="detail-label">邮箱:</span>
            <span class="detail-value">{{ detailDialog.request.applicantUser.email }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>充值信息</h3>
          <div class="detail-item">
            <span class="detail-label">充值数量:</span>
            <span class="detail-value">{{ detailDialog.request.amount }} 逗币</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">支付金额:</span>
            <span class="detail-value">¥{{ detailDialog.request.paymentAmount }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">支付方式:</span>
            <span class="detail-value">{{
              formatPaymentMethod(detailDialog.request.paymentMethod)
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">用户备注:</span>
            <span class="detail-value">{{ detailDialog.request.remark || '无' }}</span>
          </div>
        </div>

        <div class="detail-section" v-if="detailDialog.request.status !== 'pending'">
          <h3>处理信息</h3>
          <div class="detail-item" v-if="detailDialog.request.adminUser">
            <span class="detail-label">处理人:</span>
            <span class="detail-value">{{ detailDialog.request.adminUser.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">处理备注:</span>
            <span class="detail-value">{{ detailDialog.request.adminRemark || '无' }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <template v-if="detailDialog.request && detailDialog.request.status === 'pending'">
            <el-button type="success" @click="handleProcess(detailDialog.request, 'completed')">
              通过
            </el-button>
            <el-button type="danger" @click="handleProcess(detailDialog.request, 'rejected')">
              拒绝
            </el-button>
          </template>
        </span>
      </template>
    </el-dialog>

    <!-- 处理对话框 -->
    <el-dialog
      v-model="processDialog.visible"
      :title="processDialog.action === 'completed' ? '通过充值请求' : '拒绝充值请求'"
      width="500px"
    >
      <div class="process-form">
        <el-form :model="processDialog.form" label-width="100px">
          <el-form-item label="请求ID">
            <span>{{ processDialog.requestId }}</span>
          </el-form-item>
          <el-form-item label="处理备注">
            <el-input
              v-model="processDialog.form.adminRemark"
              type="textarea"
              :rows="3"
              placeholder="请输入处理备注"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="processDialog.visible = false">取消</el-button>
          <el-button
            :type="processDialog.action === 'completed' ? 'success' : 'danger'"
            @click="confirmProcess"
          >
            确认{{ processDialog.action === 'completed' ? '通过' : '拒绝' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import * as echarts from 'echarts'

// 导入服务
import coinsService from '@/services/coinsService'

// 状态
const isLoading = ref(false)
const requests = ref([])
const { showToast } = useToast()

// 图表引用
const trendChartRef = ref(null)
const amountDistributionChartRef = ref(null)
let trendChart = null
let amountDistributionChart = null

// 图表周期
const trendChartPeriod = ref('30days')
const rankingPeriod = ref('all')

// 统计数据
const stats = reactive({
  totalRequests: 0,
  pendingRequests: 0,
  completedRequests: 0,
  rejectedRequests: 0,
  totalAmount: 0,
  totalCoins: 0,
  averageAmount: 0,
  maxAmount: 0,
})

// 用户排行榜
const userRankings = ref([])

// 筛选条件
const filters = reactive({
  status: '',
  userId: '',
  dateRange: [],
  minAmount: null,
  maxAmount: null,
})

// 排序
const sortParams = reactive({
  prop: 'createdAt',
  order: 'descending',
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 详情对话框
const detailDialog = reactive({
  visible: false,
  request: null,
})

// 处理对话框
const processDialog = reactive({
  visible: false,
  requestId: null,
  action: '',
  form: {
    adminRemark: '',
  },
})

// 格式化支付方式
const formatPaymentMethod = (method) => {
  const methods = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '银行转账',
  }
  return methods[method] || method
}

// 格式化状态
const formatStatus = (status) => {
  const statuses = {
    pending: '待处理',
    completed: '已完成',
    rejected: '已拒绝',
    cancelled: '已取消',
  }
  return statuses[status] || status
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info',
  }
  return types[status] || ''
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 获取充值请求列表
const fetchRequests = async (updateStats = true) => {
  isLoading.value = true

  try {
    // 构建查询参数
    const queryParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
      userId: filters.userId ? parseInt(filters.userId) : undefined,
      startDate: filters.dateRange && filters.dateRange[0] ? filters.dateRange[0] : undefined,
      endDate: filters.dateRange && filters.dateRange[1] ? filters.dateRange[1] : undefined,
      minAmount: filters.minAmount || undefined,
      maxAmount: filters.maxAmount || undefined,
      sortProp: sortParams.prop,
      sortOrder: sortParams.order,
    }

    const result = await coinsService.getAllRechargeRequests(queryParams)

    // 检查返回的数据格式
    if (result && result.list) {
      requests.value = result.list
      pagination.total = result.pagination?.total || 0
    } else {
      console.warn('API返回的数据格式不符合预期:', result)
      requests.value = []
      pagination.total = 0
    }

    // 更新统计数据（如果需要）
    if (updateStats) {
      fetchStats()
    }
  } catch (error) {
    console.error('获取充值请求列表失败:', error)
    showToast('获取充值请求列表失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    // 这里应该调用后端API获取统计数据
    // 目前使用前端计算的方式模拟

    // 获取所有请求（不分页）
    const allRequests = await coinsService.getAllRechargeRequests({
      page: 1,
      pageSize: 1000, // 获取较大数量以便统计
    })

    // 检查返回的数据格式
    if (!allRequests || !allRequests.list) {
      console.warn('获取统计数据失败: API返回的数据格式不符合预期', allRequests)
      return
    }

    const list = allRequests.list

    // 计算基本统计数据
    stats.totalRequests = list.length
    stats.pendingRequests = list.filter((req) => req.status === 'pending').length
    stats.completedRequests = list.filter((req) => req.status === 'completed').length
    stats.rejectedRequests = list.filter((req) => req.status === 'rejected').length

    // 计算金额统计
    const completedRequests = list.filter((req) => req.status === 'completed')
    const amounts = completedRequests.map((req) => parseFloat(req.paymentAmount))
    stats.totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
    stats.totalCoins = completedRequests.reduce((sum, req) => sum + req.amount, 0)
    stats.averageAmount =
      completedRequests.length > 0 ? stats.totalAmount / completedRequests.length : 0
    stats.maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0

    // 更新图表
    updateCharts(list)

    // 更新用户排行榜
    updateUserRankings(list)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 更新图表
const updateCharts = (data) => {
  // 更新充值趋势图表
  updateTrendChart(data)

  // 更新金额分布图表
  updateAmountDistributionChart(data)
}

// 更新充值趋势图表
const updateTrendChart = (data) => {
  if (!trendChart) return

  // 根据选择的时间范围筛选数据
  const now = new Date()
  let startDate

  switch (trendChartPeriod.value) {
    case '7days':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      break
    case '90days':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 90)
      break
    case '30days':
    default:
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 30)
      break
  }

  // 筛选时间范围内的数据
  const filteredData = data.filter((item) => new Date(item.createdAt) >= startDate)

  // 按日期分组
  const dateMap = {}
  const amountMap = {}
  const coinsMap = {}

  filteredData.forEach((item) => {
    const date = new Date(item.createdAt).toISOString().split('T')[0]

    if (!dateMap[date]) {
      dateMap[date] = 0
      amountMap[date] = 0
      coinsMap[date] = 0
    }

    dateMap[date]++

    if (item.status === 'completed') {
      amountMap[date] += parseFloat(item.paymentAmount)
      coinsMap[date] += item.amount
    }
  })

  // 准备图表数据
  const dates = Object.keys(dateMap).sort()
  const counts = dates.map((date) => dateMap[date])
  const amounts = dates.map((date) => amountMap[date])
  const coins = dates.map((date) => coinsMap[date])

  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['请求数量', '充值金额(元)', '充值逗币'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        formatter: (value) => {
          // 只显示月-日
          return value.substring(5)
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        position: 'left',
      },
      {
        type: 'value',
        name: '金额',
        position: 'right',
      },
    ],
    series: [
      {
        name: '请求数量',
        type: 'bar',
        data: counts,
        yAxisIndex: 0,
      },
      {
        name: '充值金额(元)',
        type: 'line',
        smooth: true,
        data: amounts,
        yAxisIndex: 1,
      },
      {
        name: '充值逗币',
        type: 'line',
        smooth: true,
        data: coins,
        yAxisIndex: 0,
      },
    ],
  }

  trendChart.setOption(option)
}

// 更新金额分布图表
const updateAmountDistributionChart = (data) => {
  if (!amountDistributionChart) return

  // 只考虑已完成的请求
  const completedRequests = data.filter((item) => item.status === 'completed')

  // 定义金额区间
  const ranges = [
    { min: 0, max: 50, label: '0-50元' },
    { min: 50, max: 100, label: '50-100元' },
    { min: 100, max: 200, label: '100-200元' },
    { min: 200, max: 500, label: '200-500元' },
    { min: 500, max: 1000, label: '500-1000元' },
    { min: 1000, max: Infinity, label: '1000元以上' },
  ]

  // 统计各区间的请求数量
  const countData = ranges.map((range) => {
    const count = completedRequests.filter((item) => {
      const amount = parseFloat(item.paymentAmount)
      return amount > range.min && amount <= range.max
    }).length

    return { name: range.label, value: count }
  })

  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      data: ranges.map((range) => range.label),
    },
    series: [
      {
        name: '充值金额分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: countData,
      },
    ],
  }

  amountDistributionChart.setOption(option)
}

// 更新用户排行榜
const updateUserRankings = (data) => {
  // 根据选择的时间范围筛选数据
  let filteredData = [...data]
  const now = new Date()

  if (rankingPeriod.value === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    filteredData = data.filter((item) => new Date(item.createdAt) >= startOfMonth)
  } else if (rankingPeriod.value === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    filteredData = data.filter((item) => new Date(item.createdAt) >= startOfYear)
  }

  // 只考虑已完成的请求
  const completedRequests = filteredData.filter((item) => item.status === 'completed')

  // 按用户分组统计
  const userStats = {}

  completedRequests.forEach((item) => {
    const userId = item.userId
    const user = item.applicantUser

    if (!userStats[userId]) {
      userStats[userId] = {
        userId,
        username: user ? user.username : `用户${userId}`,
        email: user ? user.email : '-',
        totalAmount: 0,
        totalCoins: 0,
        requestCount: 0,
      }
    }

    userStats[userId].totalAmount += parseFloat(item.paymentAmount)
    userStats[userId].totalCoins += item.amount
    userStats[userId].requestCount++
  })

  // 转换为数组并排序
  const rankings = Object.values(userStats)
  rankings.sort((a, b) => b.totalAmount - a.totalAmount)

  // 取前10名
  userRankings.value = rankings.slice(0, 10)
}

// 重置筛选条件
const resetFilters = () => {
  filters.status = ''
  filters.userId = ''
  filters.dateRange = []
  filters.minAmount = null
  filters.maxAmount = null
  pagination.page = 1
  fetchRequests()
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  fetchRequests()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  pagination.page = page
  fetchRequests()
}

// 处理排序变化
const handleSortChange = (sort) => {
  if (sort.prop) {
    sortParams.prop = sort.prop
    sortParams.order = sort.order
  } else {
    // 默认排序
    sortParams.prop = 'createdAt'
    sortParams.order = 'descending'
  }
  fetchRequests()
}

// 处理查看详情
const handleViewDetail = (request) => {
  detailDialog.request = request
  detailDialog.visible = true
}

// 处理充值请求
const handleProcess = (request, action) => {
  console.log('处理充值请求:', request, action)

  // 确保 requestId 是数字
  processDialog.requestId = parseInt(request.id)

  // 确保 action 是有效的值
  if (!['completed', 'rejected', 'cancelled'].includes(action)) {
    console.error('无效的处理操作:', action)
    showToast('无效的处理操作', 'error')
    return
  }

  processDialog.action = action
  processDialog.form.adminRemark = ''
  processDialog.visible = true
}

// 确认处理
const confirmProcess = async () => {
  try {
    // 检查参数
    if (!processDialog.requestId) {
      showToast('请求ID无效', 'error')
      return
    }

    if (!['completed', 'rejected', 'cancelled'].includes(processDialog.action)) {
      showToast('处理操作无效', 'error')
      return
    }

    // 构建请求数据
    const requestData = {
      status: processDialog.action,
      adminRemark: processDialog.form.adminRemark || '',
    }

    console.log('发送处理请求:', processDialog.requestId, requestData)

    // 发送请求
    const result = await coinsService.processRechargeRequest(processDialog.requestId, requestData)

    console.log('处理请求成功:', result)

    // 显示成功消息
    const actionText =
      processDialog.action === 'completed'
        ? '通过'
        : processDialog.action === 'rejected'
        ? '拒绝'
        : '取消'

    if (processDialog.action === 'completed') {
      // 对于通过的充值请求，显示特殊提示
      ElMessageBox.alert(
        '充值请求已通过，用户的逗币已增加。请注意：用户需要刷新页面或重新登录才能看到更新后的逗币数量。',
        '操作成功',
        {
          confirmButtonText: '我知道了',
          type: 'success',
        }
      )
    } else {
      showToast(`充值请求已${actionText}`, 'success')
    }

    // 关闭对话框
    processDialog.visible = false

    // 如果详情对话框打开，也需要关闭
    if (
      detailDialog.visible &&
      detailDialog.request &&
      detailDialog.request.id === processDialog.requestId
    ) {
      detailDialog.visible = false
    }

    // 刷新列表
    fetchRequests()
  } catch (error: any) {
    console.error('处理充值请求失败:', error)

    // 提取错误信息
    let errorMessage = '未知错误'
    if (error.response && error.response.data) {
      errorMessage = error.response.data.message || error.response.data.error || error.message
    } else if (error.message) {
      errorMessage = error.message
    }

    showToast(`处理充值请求失败: ${errorMessage}`, 'error')
  }
}

// 导出数据
const exportData = () => {
  // 构建CSV内容
  let csvContent =
    'ID,用户ID,用户名,邮箱,充值逗币,支付金额,支付方式,状态,申请时间,处理时间,处理人,备注,管理员备注\n'

  requests.value.forEach((item) => {
    const row = [
      item.id,
      item.userId,
      item.applicantUser ? item.applicantUser.username : '',
      item.applicantUser ? item.applicantUser.email : '',
      item.amount,
      item.paymentAmount,
      formatPaymentMethod(item.paymentMethod),
      formatStatus(item.status),
      item.createdAt,
      item.processedAt || '',
      item.adminUser ? item.adminUser.username : '',
      item.remark || '',
      item.adminRemark || '',
    ]

    // 处理CSV中的特殊字符
    const escapedRow = row.map((cell) => {
      if (cell === null || cell === undefined) return ''
      const str = String(cell)
      // 如果包含逗号、双引号或换行符，则用双引号包裹并将内部的双引号替换为两个双引号
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })

    csvContent += escapedRow.join(',') + '\n'
  })

  // 创建Blob对象
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // 创建下载链接
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  // 设置下载属性
  link.setAttribute('href', url)
  link.setAttribute('download', `充值请求数据_${new Date().toISOString().split('T')[0]}.csv`)

  // 添加到文档并触发点击
  document.body.appendChild(link)
  link.click()

  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 初始化图表
const initCharts = () => {
  // 使用 setTimeout 确保 DOM 已经渲染
  setTimeout(() => {
    try {
      // 初始化充值趋势图表
      if (trendChartRef.value) {
        trendChart = echarts.init(trendChartRef.value)
        console.log('充值趋势图表初始化成功')
      } else {
        console.warn('充值趋势图表容器未找到')
      }

      // 初始化金额分布图表
      if (amountDistributionChartRef.value) {
        amountDistributionChart = echarts.init(amountDistributionChartRef.value)
        console.log('金额分布图表初始化成功')
      } else {
        console.warn('金额分布图表容器未找到')
      }

      // 初始化后立即获取数据
      fetchStats()
    } catch (error) {
      console.error('初始化图表失败:', error)
    }
  }, 300) // 延迟 300ms
}

// 监听窗口大小变化
const handleResize = () => {
  trendChart?.resize()
  amountDistributionChart?.resize()
}

// 监听图表周期变化
watch(trendChartPeriod, () => {
  fetchStats()
})

// 监听排行榜周期变化
watch(rankingPeriod, () => {
  fetchStats()
})

// 初始化
onMounted(() => {
  // 先获取请求列表，但不立即更新统计数据
  fetchRequests(false)

  // 初始化图表（内部会调用 fetchStats）
  initCharts()

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)

  // 销毁图表实例
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }

  if (amountDistributionChart) {
    amountDistributionChart.dispose()
    amountDistributionChart = null
  }
})
</script>

<style>
.recharge-request-management {
  padding: 20px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 24px;
  color: #333;
}

.section-description {
  margin-bottom: 20px;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stats-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e6e6;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.card-icon {
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.card-body {
  padding: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}

.stat-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: bold;
  color: #409eff;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.ranking-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 20px;
}

.filter-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.filter-form {
  padding: 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e6e6;
}

.range-separator {
  margin: 0 5px;
}

.request-list {
  padding: 15px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-weight: bold;
}

.email {
  font-size: 12px;
  color: #666;
}

.user-id {
  font-size: 12px;
  color: #999;
}

.recharge-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amount {
  font-weight: bold;
  color: #e6a23c;
}

.payment {
  color: #409eff;
}

.method {
  font-size: 12px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 5px;
}

.request-detail {
  padding: 10px;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eee;
}

.detail-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.detail-item {
  display: flex;
  margin-bottom: 8px;
}

.detail-label {
  width: 100px;
  color: #666;
}

.detail-value {
  flex: 1;
}
.el-select__selection {
  min-width: 100px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .stats-grid,
  .charts-container {
    grid-template-columns: 1fr;
  }

  .filter-form {
    display: flex;
    flex-direction: column;
  }
}
</style>
