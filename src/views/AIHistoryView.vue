<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getApiRoot } from '@/utils/apiBase'
import { getAuthHeaders } from '@/utils/auth'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'

const loading = ref(false)
const records = ref<any[]>([])
const total = ref(0)
const page = ref(1)

async function load() {
  loading.value = true
  try {
    const res = await axios.get(`${getApiRoot()}/ai/history`, {
      params: { page: page.value, pageSize: 15 },
      ...getAuthHeaders(),
    })
    records.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AiPageLayout title="📜 AI 推荐历史" subtitle="查看历史 AI 推荐记录与表现">
    <el-table v-loading="loading" :data="records" stripe class="glass-card">
      <el-table-column prop="stockSymbol" label="代码" width="100" />
      <el-table-column prop="stockName" label="名称" width="120" />
      <el-table-column prop="recommendationType" label="推荐" width="100" />
      <el-table-column prop="confidenceScore" label="置信度" width="80" />
      <el-table-column prop="riskLevel" label="风险" width="80" />
      <el-table-column prop="reasoning" label="理由" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="时间" width="170">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && records.length === 0" description="暂无推荐历史" />

    <el-pagination
      v-if="total > 15"
      v-model:current-page="page"
      :total="total"
      :page-size="15"
      layout="prev, pager, next"
      @current-change="load"
      class="pagination"
    />
  </AiPageLayout>
</template>

<style scoped>
.pagination {
  margin-top: var(--spacing-4);
  justify-content: center;
}
</style>
