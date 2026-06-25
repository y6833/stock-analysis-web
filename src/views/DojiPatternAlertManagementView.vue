<template>
  <DojiPageLayout title="十字星形态提醒管理">
    <template #actions>
      <el-button type="primary" @click="navigateToCreateAlert">创建新提醒</el-button>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="提醒管理" name="management">
        <DojiPatternAlertManagement />
      </el-tab-pane>
      <el-tab-pane label="提醒历史" name="history">
        <DojiPatternAlertHistoryList />
      </el-tab-pane>
      <el-tab-pane label="统计分析" name="statistics">
        <DojiPatternAlertStatistics />
      </el-tab-pane>
    </el-tabs>
  </DojiPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DojiPageLayout from '@/components/doji/DojiPageLayout.vue'
import DojiPatternAlertManagement from '@/components/alerts/DojiPatternAlertManagement.vue'
import DojiPatternAlertHistoryList from '@/components/alerts/DojiPatternAlertHistoryList.vue'
import DojiPatternAlertStatistics from '@/components/alerts/DojiPatternAlertStatistics.vue'

const router = useRouter()
const activeTab = ref('management')

function navigateToCreateAlert() {
  router.push('/doji-pattern/alerts/create')
}
</script>
