<template>
  <div class="permission-demo-view">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>权限系统演示</h2>
        </div>
      </template>

      <p class="description">
        本页面演示了系统的权限控制功能，包括基于角色的访问控制和细粒度权限检查。
        不同权限级别的用户将看到不同的内容。
      </p>

      <PermissionExample />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import PermissionExample from '@/components/common/PermissionExample.vue'
</script>

<style scoped>
.permission-demo-view {
  padding: 20px;
}

.page-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.description {
  margin-bottom: 20px;
  color: #606266;
}
</style>