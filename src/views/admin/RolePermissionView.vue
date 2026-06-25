<template>
  <PageLayout title="角色与权限管理" subtitle="管理角色、权限与用户授权">
    <template #actions>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </template>

    <el-card class="page-card glass-card">
      <RolePermissionManager ref="managerRef" />
    </el-card>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import PageLayout from '@/components/common/PageLayout.vue'
import RolePermissionManager from '@/components/admin/RolePermissionManager.vue'

const managerRef = ref()

function refreshData() {
  if (managerRef.value) {
    managerRef.value.loadRoles()
    managerRef.value.loadPermissions()
    if (managerRef.value.activeTab === 'user-roles') {
      managerRef.value.loadUsers()
    }
  }
}
</script>

<style scoped>
.page-card {
  overflow: hidden;
}
</style>
