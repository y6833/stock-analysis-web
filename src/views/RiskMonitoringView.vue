<template>
  <div class="risk-monitoring-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>风险监控系统</h1>
      <p class="page-description">VaR风险价值计算 | 投资组合风险评估 | 实时风险监控</p>
    </div>

    <!-- 风险仪表盘 -->
    <div class="dashboard-section">
      <h2>风险概览</h2>
      <div class="dashboard-cards" v-if="dashboardData">
        <div class="risk-card">
          <div class="card-header">
            <h3>投资组合总数</h3>
            <span class="card-icon">📊</span>
          </div>
          <div class="card-value">{{ dashboardData.summary.totalPortfolios }}</div>
        </div>

        <div class="risk-card">
          <div class="card-header">
            <h3>总资产价值</h3>
            <span class="card-icon">💰</span>
          </div>
          <div class="card-value">
            {{ formatCurrency(dashboardData.summary.totalPortfolioValue) }}
          </div>
        </div>

        <div class="risk-card">
          <div class="card-header">
            <h3>总VaR风险</h3>
            <span class="card-icon">⚠️</span>
          </div>
          <div class="card-value risk-value">
            {{ formatCurrency(dashboardData.summary.totalVaR) }}
          </div>
        </div>

        <div class="risk-card">
          <div class="card-header">
            <h3>平均风险比例</h3>
            <span class="card-icon">📈</span>
          </div>
          <div class="card-value">
            {{ (dashboardData.summary.avgVarPercentage * 100).toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="action-section">
      <div class="action-buttons">
        <button @click="showConfigDialog = true" class="btn btn-primary">
          <span class="btn-icon">⚙️</span>
          风险配置
        </button>
        <button @click="showCalculateDialog = true" class="btn btn-secondary">
          <span class="btn-icon">🧮</span>
          计算VaR
        </button>
        <button @click="refreshDashboard" class="btn btn-outline" :disabled="isLoading">
          <span class="btn-icon">🔄</span>
          刷新数据
        </button>
      </div>
    </div>

    <!-- VaR计算历史 -->
    <div class="history-section">
      <h2>VaR计算历史</h2>
      <div class="history-table" v-if="varHistory.length > 0">
        <table>
          <thead>
            <tr>
              <th>计算日期</th>
              <th>投资组合价值</th>
              <th>VaR绝对值</th>
              <th>VaR百分比</th>
              <th>期望损失</th>
              <th>计算方法</th>
              <th>风险等级</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in varHistory" :key="item.id">
              <td>{{ formatDate(item.calculationDate) }}</td>
              <td>{{ formatCurrency(item.portfolioValue) }}</td>
              <td class="risk-value">{{ formatCurrency(item.varAbsolute) }}</td>
              <td>{{ (item.varPercentage * 100).toFixed(2) }}%</td>
              <td class="risk-value">{{ formatCurrency(item.expectedShortfall) }}</td>
              <td>
                <span class="method-tag" :class="item.method">
                  {{ getMethodName(item.method) }}
                </span>
              </td>
              <td>
                <span class="risk-level" :style="{ color: getRiskLevel(item.varPercentage).color }">
                  {{ getRiskLevel(item.varPercentage).level }}
                </span>
              </td>
              <td>
                <button @click="viewDetail(item.id)" class="btn-link">查看详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <p>暂无VaR计算记录</p>
        <button @click="showCalculateDialog = true" class="btn btn-primary">开始计算</button>
      </div>
    </div>

    <!-- 风险配置对话框 -->
    <div v-if="showConfigDialog" class="modal-overlay" @click="closeConfigDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingConfig ? '编辑风险配置' : '创建风险配置' }}</h3>
          <button @click="closeConfigDialog" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveConfig">
            <div class="form-group">
              <label>配置名称</label>
              <input
                v-model="configForm.configName"
                type="text"
                placeholder="请输入配置名称"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>置信水平</label>
                <select v-model="configForm.varConfidenceLevel">
                  <option value="0.01">99%</option>
                  <option value="0.05">95%</option>
                  <option value="0.10">90%</option>
                </select>
              </div>
              <div class="form-group">
                <label>时间跨度（天）</label>
                <input v-model.number="configForm.varTimeHorizon" type="number" min="1" max="30" />
              </div>
            </div>

            <div class="form-group">
              <label>计算方法</label>
              <select v-model="configForm.varMethod">
                <option value="historical">历史模拟法</option>
                <option value="parametric">参数法</option>
                <option value="monte_carlo">蒙特卡洛模拟</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>回看期（天）</label>
                <input
                  v-model.number="configForm.lookbackPeriod"
                  type="number"
                  min="30"
                  max="1000"
                />
              </div>
              <div class="form-group" v-if="configForm.varMethod === 'monte_carlo'">
                <label>模拟次数</label>
                <input
                  v-model.number="configForm.monteCarloSimulations"
                  type="number"
                  min="1000"
                  max="100000"
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeConfigDialog" class="btn btn-outline">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- VaR计算对话框 -->
    <div v-if="showCalculateDialog" class="modal-overlay" @click="closeCalculateDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>计算VaR风险价值</h3>
          <button @click="closeCalculateDialog" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="calculateVaR">
            <div class="form-group">
              <label>选择投资组合</label>
              <select v-model="calculateForm.portfolioId" required>
                <option value="">请选择投资组合</option>
                <option v-for="portfolio in portfolios" :key="portfolio.id" :value="portfolio.id">
                  {{ portfolio.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>选择风险配置</label>
              <select v-model="calculateForm.configId" required>
                <option value="">请选择风险配置</option>
                <option v-for="config in configs" :key="config.id" :value="config.id">
                  {{ config.configName }} ({{ getMethodName(config.varMethod) }})
                </option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeCalculateDialog" class="btn btn-outline">
                取消
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isCalculating">
                {{ isCalculating ? '计算中...' : '开始计算' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  varCalculationService,
  type RiskConfig,
  type VarHistoryItem,
  type RiskDashboardData,
} from '@/services/risk/VarCalculationService'
import { portfolioService } from '@/services/portfolio/PortfolioService'
import { showToast } from '@/utils/toast'

// 响应式数据
const isLoading = ref(false)
const isSaving = ref(false)
const isCalculating = ref(false)
const showConfigDialog = ref(false)
const showCalculateDialog = ref(false)
const editingConfig = ref<RiskConfig | null>(null)

const dashboardData = ref<RiskDashboardData | null>(null)
const varHistory = ref<VarHistoryItem[]>([])
const configs = ref<RiskConfig[]>([])
const portfolios = ref<any[]>([])

// 表单数据
const configForm = ref({
  configName: '',
  varConfidenceLevel: 0.05,
  varTimeHorizon: 1,
  varMethod: 'historical' as 'historical' | 'parametric' | 'monte_carlo',
  lookbackPeriod: 252,
  monteCarloSimulations: 10000,
  portfolioId: null as number | null,
})

const calculateForm = ref({
  portfolioId: null as number | null,
  configId: null as number | null,
})

// 计算属性
const getRiskLevel = computed(() => {
  return (varPercentage: number) => varCalculationService.getRiskLevel(varPercentage)
})

// 方法
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(value)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const getMethodName = (method: string): string => {
  const methodNames = {
    historical: '历史模拟',
    parametric: '参数法',
    monte_carlo: '蒙特卡洛',
  }
  return methodNames[method as keyof typeof methodNames] || method
}

// 初始化数据
const initData = async () => {
  isLoading.value = true
  try {
    await Promise.all([loadDashboard(), loadVarHistory(), loadConfigs(), loadPortfolios()])
  } catch (error) {
    console.error('初始化数据失败:', error)
    showToast({ message: '数据加载失败', type: 'error' })
  } finally {
    isLoading.value = false
  }
}

const loadDashboard = async () => {
  const result = await varCalculationService.getRiskDashboard()
  if (result.success && result.data) {
    dashboardData.value = result.data
  }
}

const loadVarHistory = async () => {
  const result = await varCalculationService.getVarHistory()
  if (result.success && result.data) {
    varHistory.value = result.data
  }
}

const loadConfigs = async () => {
  const result = await varCalculationService.getConfigs()
  if (result.success && result.data) {
    configs.value = result.data
  }
}

const loadPortfolios = async () => {
  const result = await portfolioService.getPortfolios()
  if (result.success && result.data) {
    portfolios.value = result.data
  }
}

// 对话框操作
const closeConfigDialog = () => {
  showConfigDialog.value = false
  editingConfig.value = null
  resetConfigForm()
}

const closeCalculateDialog = () => {
  showCalculateDialog.value = false
  calculateForm.value = {
    portfolioId: null,
    configId: null,
  }
}

const resetConfigForm = () => {
  configForm.value = {
    configName: '',
    varConfidenceLevel: 0.05,
    varTimeHorizon: 1,
    varMethod: 'historical',
    lookbackPeriod: 252,
    monteCarloSimulations: 10000,
    portfolioId: null,
  }
}

// 保存配置
const saveConfig = async () => {
  isSaving.value = true
  try {
    const result = editingConfig.value
      ? await varCalculationService.updateConfig(editingConfig.value.id!, configForm.value)
      : await varCalculationService.createConfig(configForm.value)

    if (result.success) {
      showToast({ message: editingConfig.value ? '配置更新成功' : '配置创建成功', type: 'success' })
      closeConfigDialog()
      await loadConfigs()
    } else {
      showToast({ message: result.message || '操作失败', type: 'error' })
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    showToast({ message: '保存失败', type: 'error' })
  } finally {
    isSaving.value = false
  }
}

// 计算VaR
const calculateVaR = async () => {
  if (!calculateForm.value.portfolioId || !calculateForm.value.configId) {
    showToast({ message: '请选择投资组合和风险配置', type: 'warning' })
    return
  }

  isCalculating.value = true
  try {
    const result = await varCalculationService.calculateVaR(
      calculateForm.value.portfolioId,
      calculateForm.value.configId
    )

    if (result.success) {
      showToast({ message: 'VaR计算完成', type: 'success' })
      closeCalculateDialog()
      await Promise.all([loadVarHistory(), loadDashboard()])
    } else {
      showToast({ message: result.message || '计算失败', type: 'error' })
    }
  } catch (error) {
    console.error('VaR计算失败:', error)
    showToast({ message: '计算失败', type: 'error' })
  } finally {
    isCalculating.value = false
  }
}

// 查看详情
const viewDetail = async (id: number) => {
  try {
    const result = await varCalculationService.getVarDetail(id)
    if (result.success && result.data) {
      // 这里可以打开详情对话框或跳转到详情页面
      console.log('VaR详情:', result.data)
      showToast({ message: '详情功能开发中', type: 'info' })
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    showToast({ message: '获取详情失败', type: 'error' })
  }
}

// 刷新仪表盘
const refreshDashboard = async () => {
  await initData()
  showToast({ message: '数据已刷新', type: 'success' })
}

// 生命周期
onMounted(() => {
  initData()
})
</script>

<style scoped>
.risk-monitoring-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.page-description {
  color: #666;
  font-size: 1.1rem;
}

.dashboard-section {
  margin-bottom: 40px;
}

.dashboard-section h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #333;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.risk-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.risk-card:hover {
  transform: translateY(-5px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h3 {
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
}

.card-icon {
  font-size: 1.5rem;
}

.card-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
}

.risk-value {
  color: #ff4d4f;
  font-weight: bold;
}

.action-section {
  margin-bottom: 40px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 1.1rem;
}

.history-section h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #333;
}

.history-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.history-table table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e9ecef;
}

.history-table td {
  padding: 15px;
  border-bottom: 1px solid #e9ecef;
}

.history-table tr:hover {
  background: #f8f9fa;
}

.method-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.method-tag.historical {
  background: #e6f7ff;
  color: #1890ff;
}

.method-tag.parametric {
  background: #f6ffed;
  color: #52c41a;
}

.method-tag.monte_carlo {
  background: #fff2e8;
  color: #fa8c16;
}

.risk-level {
  font-weight: 600;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: #764ba2;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state p {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 25px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .history-table {
    overflow-x: auto;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>
