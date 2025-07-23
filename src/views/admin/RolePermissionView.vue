<template>
  <div class="role-permission-view">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>角色与权限管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="refreshData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </div>
      </template>

      <RolePermissionManager ref="managerRef" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
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
.role-permission-view {
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

.header-actions {
  display: flex;
  gap: 10px;
}
</style>