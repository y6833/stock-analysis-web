<template>
  <div class="recharge-records-view">
    <div class="container">
      <h1 class="page-title">充值记录</h1>
      <div class="page-content">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import RechargeRecords from '@/components/user/RechargeRecords.vue'
import { ElSkeleton } from 'element-plus'
</script>

<style scoped>
.recharge-records-view {
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.page-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-container {
  padding: 20px;
}
</style>
