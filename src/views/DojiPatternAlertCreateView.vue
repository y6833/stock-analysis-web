<template>
  <div class="doji-pattern-alert-create-view">
    <div class="page-header">
      <h2>创建十字星形态提醒</h2>
      <div class="page-actions">
        <el-button @click="navigateBack">返回提醒管理</el-button>
      </div>
    </div>

    <el-card class="create-alert-card">
      <el-form ref="alertFormRef" :model="alertForm" :rules="alertFormRules" label-width="120px" label-position="top">
        <el-form-item label="股票代码" prop="stockCode">
          <el-input v-model="alertForm.stockCode" placeholder="输入股票代码，如：600000" clearable>
            <template #append>
              <el-button @click="openStockSelector">选择</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="股票名称" prop="stockName">
          <el-input v-model="alertForm.stockName" placeholder="股票名称将自动填充" disabled></el-input>
        </el-form-item>

        <el-form-item label="形态类型" prop="patternType">
          <el-select v-model="alertForm.patternType" placeholder="选择十字星形态类型" style="width: 100%">
            <el-option label="标准十字星" value="standard" />
            <el-option label="墓碑十字星" value="gravestone" />
            <el-option label="蜻蜓十字星" value="dragonfly" />
            <el-option label="长腿十字星" value="longLegged" />
          </el-select>
        </el-form-item>

        <el-form-item label="提醒条件" prop="condition">
          <el-select v-model="alertForm.condition" placeholder="选择提醒触发条件" style="width: 100%">
            <el-option label="形态出现" value="pattern_appears" />
            <el-option label="形态伴随成交量变化" value="pattern_with_volume" />
            <el-option label="形态接近支撑位" value="pattern_near_support" />
            <el-option label="形态接近阻力位" value="pattern_near_resistance" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="alertForm.priority" placeholder="选择提醒优先级" style="width: 100%">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="notes">
          <el-input v-model="alertForm.notes" type="textarea" :rows="3" placeholder="可选：添加提醒备注信息" maxlength="200"
            show-word-limit></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitAlert" :loading="submitting">
            创建提醒
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 股票选择器对话框 -->
    <el-dialog v-model="stockSelectorVisible" title="选择股票" width="60%" :before-close="closeStockSelector">
      <div class="stock-selector">
        <el-input v-model="stockSearchKeyword" placeholder="输入股票代码或名称搜索" clearable @input="searchStocks">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>

        <el-table :data="stockSearchResults" style="width: 100%; margin-top: 16px" @row-click="selectStock"
          highlight-current-row>
          <el-table-column prop="code" label="股票代码" width="120" />
          <el-table-column prop="name" label="股票名称" />
          <el-table-column prop="market" label="市场" width="80" />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="closeStockSelector">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface AlertForm {
  stockCode: string
  stockName: string
  patternType: string
  condition: string
  priority: string
  notes: string
}

interface StockInfo {
  code: string
  name: string
  market: string
}

export default defineComponent({
  name: 'DojiPatternAlertCreateView',
  components: {
    Search
  },
  setup() {
    const router = useRouter()
    const alertFormRef = ref<FormInstance>()
    const submitting = ref(false)
    const stockSelectorVisible = ref(false)
    const stockSearchKeyword = ref('')
    const stockSearchResults = ref<StockInfo[]>([])

    // 表单数据
    const alertForm = reactive<AlertForm>({
      stockCode: '',
      stockName: '',
      patternType: '',
      condition: '',
      priority: '',
      notes: ''
    })

    // 表单验证规则
    const alertFormRules: FormRules = {
      stockCode: [
        { required: true, message: '请输入股票代码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '股票代码格式不正确', trigger: 'blur' }
      ],
      patternType: [
        { required: true, message: '请选择形态类型', trigger: 'change' }
      ],
      condition: [
        { required: true, message: '请选择提醒条件', trigger: 'change' }
      ],
      priority: [
        { required: true, message: '请选择优先级', trigger: 'change' }
      ]
    }

    // 返回上一页
    const navigateBack = () => {
      router.back()
    }

    // 打开股票选择器
    const openStockSelector = () => {
      stockSelectorVisible.value = true
      searchStocks()
    }

    // 关闭股票选择器
    const closeStockSelector = () => {
      stockSelectorVisible.value = false
      stockSearchKeyword.value = ''
      stockSearchResults.value = []
    }

    // 搜索股票
    const searchStocks = async () => {
      // 模拟股票搜索数据
      const mockStocks: StockInfo[] = [
        { code: '600000', name: '浦发银行', market: 'SH' },
        { code: '000001', name: '平安银行', market: 'SZ' },
        { code: '600036', name: '招商银行', market: 'SH' },
        { code: '000002', name: '万科A', market: 'SZ' },
        { code: '600519', name: '贵州茅台', market: 'SH' }
      ]

      if (stockSearchKeyword.value) {
        stockSearchResults.value = mockStocks.filter(stock =>
          stock.code.includes(stockSearchKeyword.value) ||
          stock.name.includes(stockSearchKeyword.value)
        )
      } else {
        stockSearchResults.value = mockStocks
      }
    }

    // 选择股票
    const selectStock = (stock: StockInfo) => {
      alertForm.stockCode = stock.code
      alertForm.stockName = stock.name
      closeStockSelector()
    }

    // 提交表单
    const submitAlert = async () => {
      if (!alertFormRef.value) return

      try {
        await alertFormRef.value.validate()
        submitting.value = true

        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))

        ElMessage.success('提醒创建成功')
        router.push('/doji-pattern/alerts')
      } catch (error) {
        console.error('创建提醒失败:', error)
        ElMessage.error('创建提醒失败')
      } finally {
        submitting.value = false
      }
    }

    // 重置表单
    const resetForm = () => {
      if (!alertFormRef.value) return
      alertFormRef.value.resetFields()
    }

    onMounted(() => {
      // 组件挂载后的初始化逻辑
    })

    return {
      alertFormRef,
      alertForm,
      alertFormRules,
      submitting,
      stockSelectorVisible,
      stockSearchKeyword,
      stockSearchResults,
      navigateBack,
      openStockSelector,
      closeStockSelector,
      searchStocks,
      selectStock,
      submitAlert,
      resetForm
    }
  }
})
</script>

<style scoped>
.doji-pattern-alert-create-view {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.create-alert-card {
  max-width: 600px;
}

.stock-selector {
  min-height: 300px;
}

.el-table {
  cursor: pointer;
}

.el-table .el-table__row:hover {
  background-color: #f5f7fa;
}
</style>