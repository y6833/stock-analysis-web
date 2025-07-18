<template>
  <div class="doji-pattern-alert-management-view">
    <div class="page-header">
      <h2>十字星形态提醒管理</h2>
      <div class="page-actions">
        <el-button type="primary" @click="navigateToCreateAlert"> 创建新提醒 </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="提醒管理" name="management">
        <doji-pattern-alert-management />
      </el-tab-pane>
      <el-tab-pane label="提醒历史" name="history">
        <doji-pattern-alert-history-list />
      </el-tab-pane>
      <el-tab-pane label="统计分析" name="statistics">
        <doji-pattern-alert-statistics />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import DojiPatternAlertManagement from '@/components/alerts/DojiPatternAlertManagement.vue'
import DojiPatternAlertHistoryList from '@/components/alerts/DojiPatternAlertHistoryList.vue'
import DojiPatternAlertStatistics from '@/components/alerts/DojiPatternAlertStatistics.vue'

export default defineComponent({
  name: 'DojiPatternAlertManagementView',
  components: {
    DojiPatternAlertManagement,
    DojiPatternAlertHistoryList,
    DojiPatternAlertStatistics,
  },
  setup() {
    const router = useRouter()
    const activeTab = ref('management')

    // 处理标签页点击
    const handleTabClick = () => {
      // 可以在这里添加标签页切换逻辑
    }

    // 导航到创建提醒页面
    const navigateToCreateAlert = () => {
      router.push('/doji-pattern/alerts/create')
    }

    return {
      activeTab,
      handleTabClick,
      navigateToCreateAlert,
    }
  },
})
</script>

<style scoped>
.doji-pattern-alert-management-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}
</style>
