<template>
  <PageLayout title="充值记录" subtitle="查看账户充值历史" narrow>
    <div class="page-content glass-card">
      <Suspense>
        <template #default>
          <RechargeRecords />
        </template>
        <template #fallback>
          <div class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
        </template>
      </Suspense>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import RechargeRecords from '@/components/user/RechargeRecords.vue'
import PageLayout from '@/components/common/PageLayout.vue'
import { ElSkeleton } from 'element-plus'
</script>

<style scoped>
.page-content {
  overflow: hidden;
}

.loading-container {
  padding: var(--spacing-lg);
}
</style>
