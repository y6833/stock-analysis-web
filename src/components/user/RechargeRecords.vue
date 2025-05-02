<template>
  <div class="recharge-records">
    <div class="header-section">
      <h2 class="section-title">我的充值记录</h2>

      <!-- 刷新逗币余额按钮 -->
      <el-button type="primary" @click="refreshCoinsBalance" :loading="refreshingCoins">
        <el-icon><Refresh /></el-icon>
        刷新逗币余额
      </el-button>
    </div>

    <!-- 刷新提示 -->
    <div v-if="showCompletedTip" class="completed-tip">
      <el-alert
        title="发现已完成的充值请求"
        type="success"
        description="您有已完成的充值请求，但可能需要刷新才能看到最新的逗币余额。点击上方的'刷新逗币余额'按钮更新。"
        show-icon
        :closable="true"
        @close="showCompletedTip = false"
      />
    </div>

    <!-- 筛选器 -->
    <div class="filter-bar">
      <div class="filter-item">
        <label style="width: 50px">状态:</label>
        <el-select v-model="filters.status" placeholder="全部状态" clearable>
          <el-option label="待处理" value="pending" />
          <el-option label="已完成" value="completed" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </div>

      <el-button type="primary" @click="fetchRequests">
        <el-icon><Search /></el-icon>
        查询
      </el-button>

      <el-button @click="resetFilters">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>

    <!-- 请求列表 -->
    <div class="request-list">
      <el-table v-loading="isLoading" :data="requests" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="充值信息" width="180">
          <template #default="scope">
            <div class="recharge-info">
              <div class="amount">{{ scope.row.amount }} 逗币</div>
              <div class="payment">¥{{ scope.row.paymentAmount }}</div>
              <div class="method">{{ formatPaymentMethod(scope.row.paymentMethod) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ formatStatus(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="申请时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="180">
          <template #default="scope">
            <span v-if="scope.row.processedAt">
              {{ formatDate(scope.row.processedAt) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button
                v-if="scope.row.status === 'pending'"
                type="danger"
                size="small"
                @click="handleCancel(scope.row)"
              >
                取消
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

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="充值请求详情" width="500px">
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
            <span class="detail-label">备注:</span>
            <span class="detail-value">{{ detailDialog.request.remark || '无' }}</span>
          </div>
        </div>

        <div class="detail-section" v-if="detailDialog.request.status !== 'pending'">
          <h3>处理信息</h3>
          <div class="detail-item">
            <span class="detail-label">处理备注:</span>
            <span class="detail-value">{{ detailDialog.request.adminRemark || '无' }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button
            v-if="detailDialog.request && detailDialog.request.status === 'pending'"
            type="danger"
            @click="handleCancel(detailDialog.request)"
          >
            取消申请
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'

// 导入服务
import coinsService from '@/services/coinsService'

// 状态
const isLoading = ref(false)
const refreshingCoins = ref(false)
const showCompletedTip = ref(false)
const requests = ref([])
const { showToast } = useToast()

// 筛选条件
const filters = reactive({
  status: '',
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

// 获取充值请求列表
const fetchRequests = async () => {
  isLoading.value = true

  try {
    const result = await coinsService.getUserRechargeRequests({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
    })

    requests.value = result.list
    pagination.total = result.pagination.total

    // 检查是否有已完成的充值请求，如果有，显示提示
    const hasCompletedRequests = requests.value.some((req) => req.status === 'completed')
    if (hasCompletedRequests) {
      showCompletedTip.value = true
    }
  } catch (error) {
    console.error('获取充值请求列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 刷新逗币余额
const refreshCoinsBalance = async () => {
  refreshingCoins.value = true

  try {
    // 获取最新的逗币余额
    const coins = await coinsService.getUserCoins()

    // 显示成功消息
    showToast(`逗币余额已更新: ${coins}个`, 'success')

    // 隐藏提示
    showCompletedTip.value = false
  } catch (error) {
    console.error('刷新逗币余额失败:', error)
    showToast('刷新逗币余额失败，请稍后再试', 'error')
  } finally {
    refreshingCoins.value = false
  }
}

// 重置筛选条件
const resetFilters = () => {
  filters.status = ''
  pagination.page = 1
  fetchRequests()
}

// 处理分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchRequests()
}

// 处理页码变化
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchRequests()
}

// 格式化状态
const formatStatus = (status: string) => {
  const statusMap = {
    pending: '待处理',
    completed: '已完成',
    rejected: '已拒绝',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap = {
    pending: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info',
  }
  return typeMap[status] || ''
}

// 格式化支付方式
const formatPaymentMethod = (method: string) => {
  const methodMap = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '银行转账',
  }
  return methodMap[method] || method
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// 处理查看详情
const handleViewDetail = async (request) => {
  detailDialog.request = request
  detailDialog.visible = true
}

// 处理取消申请
const handleCancel = async (request) => {
  try {
    await ElMessageBox.confirm('确定要取消此充值申请吗？', '取消充值申请', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await coinsService.cancelRechargeRequest(request.id)

    showToast('充值申请已取消', 'success')

    // 关闭详情对话框（如果打开）
    if (detailDialog.visible && detailDialog.request && detailDialog.request.id === request.id) {
      detailDialog.visible = false
    }

    // 刷新列表
    fetchRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消充值申请失败:', error)
      showToast(`取消充值申请失败: ${error.message}`, 'error')
    }
  }
}

// 初始化
onMounted(() => {
  fetchRequests()
})
</script>

<style scoped>
.recharge-records {
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 24px;
  color: #333;
}

.completed-tip {
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 150px;
}

.request-list {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
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
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
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
</style>
