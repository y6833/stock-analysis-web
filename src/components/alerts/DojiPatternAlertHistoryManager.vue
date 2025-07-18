<template>
  <div class="doji-alert-history-manager">
    <div class="history-manager-header">
      <h3>{{ title || '十字星形态提醒历史管理' }}</h3>
      <div class="history-manager-actions">
        <el-button type="primary" size="small" @click="exportHistory"> 导出历史记录 </el-button>
        <el-button type="primary" size="small" @click="refreshData"> 刷新 </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <el-tab-pane label="历史记录" name="history">
        <doji-pattern-alert-history-list ref="historyListRef" :title="''" :showStockFilter="true" />
      </el-tab-pane>

      <el-tab-pane label="统计分析" name="stats">
        <doji-pattern-alert-statistics />
      </el-tab-pane>
    </el-tabs>

    <!-- 导出选项对话框 -->
    <el-dialog title="导出历史记录" v-model="exportDialogVisible" width="500px">
      <el-form :model="exportForm" label-width="120px" size="small">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
          />
        </el-form-item>
        <el-form-item label="股票代码">
          <el-input v-model="exportForm.stockCode" placeholder="输入股票代码" clearable />
        </el-form-item>
        <el-form-item label="形态类型">
          <el-select v-model="exportForm.patternType" placeholder="选择形态类型" clearable>
            <el-option label="标准十字星" value="standard" />
            <el-option label="墓碑十字星" value="gravestone" />
            <el-option label="蜻蜓十字星" value="dragonfly" />
            <el-option label="长腿十字星" value="longLegged" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="exportForm.acknowledged" placeholder="选择状态" clearable>
            <el-option label="未确认" :value="false" />
            <el-option label="已确认" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="excel">Excel</el-radio>
            <el-radio label="csv">CSV</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleExport" :loading="exporting"> 导出 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import DojiPatternAlertHistoryList from './DojiPatternAlertHistoryList.vue'
import DojiPatternAlertStatistics from './DojiPatternAlertStatistics.vue'
import dojiPatternAlertHistoryService from '@/services/DojiPatternAlertHistoryService'
import type { DojiPatternType } from '@/services/alertService'

export default defineComponent({
  name: 'DojiPatternAlertHistoryManager',
  components: {
    DojiPatternAlertHistoryList,
    DojiPatternAlertStatistics,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  setup() {
    const activeTab = ref('history')
    const historyListRef = ref<InstanceType<typeof DojiPatternAlertHistoryList> | null>(null)
    const exportDialogVisible = ref(false)
    const exporting = ref(false)

    const exportForm = ref({
      dateRange: null as [string, string] | null,
      stockCode: '',
      patternType: '' as DojiPatternType | '',
      acknowledged: null as boolean | null,
      format: 'excel',
    })

    // 处理标签页切换
    const handleTabChange = () => {
      if (activeTab.value === 'history') {
        refreshData()
      }
    }

    // 刷新数据
    const refreshData = () => {
      if (activeTab.value === 'history' && historyListRef.value) {
        historyListRef.value.loadAlertHistory()
      }
    }

    // 打开导出对话框
    const exportHistory = () => {
      exportDialogVisible.value = true
    }

    // 处理导出
    const handleExport = async () => {
      exporting.value = true
      try {
        const params: any = {}

        if (exportForm.value.dateRange) {
          params.startDate = exportForm.value.dateRange[0]
          params.endDate = exportForm.value.dateRange[1]
        }

        if (exportForm.value.stockCode) {
          params.stockCode = exportForm.value.stockCode
        }

        if (exportForm.value.patternType) {
          params.patternType = exportForm.value.patternType
        }

        if (exportForm.value.acknowledged !== null) {
          params.acknowledged = exportForm.value.acknowledged
        }

        params.format = exportForm.value.format

        const result = await dojiPatternAlertHistoryService.exportAlertHistory(params)

        // 创建下载链接并点击
        const link = document.createElement('a')
        link.href = result.url
        link.download = `十字星形态提醒历史_${new Date().toISOString().split('T')[0]}.${
          exportForm.value.format
        }`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        exportDialogVisible.value = false
        ElMessage.success('导出成功')
      } catch (error) {
        console.error('导出历史记录失败:', error)
        ElMessage.error('导出历史记录失败')
      } finally {
        exporting.value = false
      }
    }

    onMounted(() => {
      refreshData()
    })

    return {
      activeTab,
      historyListRef,
      exportDialogVisible,
      exportForm,
      exporting,
      handleTabChange,
      refreshData,
      exportHistory,
      handleExport,
    }
  },
})
</script>

<style scoped>
.doji-alert-history-manager {
  padding: 16px;
}

.history-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-manager-actions {
  display: flex;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
