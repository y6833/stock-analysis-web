<template>
  <PageLayout title="权限系统演示" subtitle="演示基于角色的访问控制和细粒度权限检查" narrow>
    <el-card class="page-card glass-card">
      <p class="description">
        本页面演示了系统的权限控制功能，包括基于角色的访问控制和细粒度权限检查。
        不同权限级别的用户将看到不同的内容。
      </p>
      <PermissionExample />
    </el-card>
  </PageLayout>
</template>

<script setup lang="ts">
import PageLayout from '@/components/common/PageLayout.vue'
import PermissionExample from '@/components/common/PermissionExample.vue'
</script>

<style scoped>
.page-card {
  padding: var(--spacing-lg);
}

.description {
  margin-bottom: var(--spacing-lg);
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
