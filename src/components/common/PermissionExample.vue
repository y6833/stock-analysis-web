<template>
  <div class="permission-example">
    <h3>权限控制示例</h3>
    
    <el-divider>基本权限控制</el-divider>
    
    <div class="example-section">
      <p>以下内容只有拥有 "stock:view" 权限的用户才能看到：</p>
      <div v-permission="'stock:view'" class="permission-block">
        <el-alert
          title="您拥有查看股票的权限"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <div class="example-section">
      <p>以下内容只有拥有 "admin:manage_users" 权限的用户才能看到：</p>
      <div v-permission="'admin:manage_users'" class="permission-block">
        <el-alert
          title="您拥有管理用户的权限"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>多权限控制（任一权限）</el-divider>
    
    <div class="example-section">
      <p>以下内容只要拥有 "portfolio:view" 或 "portfolio:create" 任一权限的用户都能看到：</p>
      <div v-permission="['portfolio:view', 'portfolio:create']" class="permission-block">
        <el-alert
          title="您拥有查看或创建投资组合的权限"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>多权限控制（所有权限）</el-divider>
    
    <div class="example-section">
      <p>以下内容需要同时拥有 "backtest:run_advanced" 和 "backtest:save_results" 权限的用户才能看到：</p>
      <div v-permission:allPermissions="['backtest:run_advanced', 'backtest:save_results']" class="permission-block">
        <el-alert
          title="您拥有运行高级回测和保存结果的权限"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>角色控制</el-divider>
    
    <div class="example-section">
      <p>以下内容只有拥有 "admin" 角色的用户才能看到：</p>
      <div v-permission:role="'admin'" class="permission-block">
        <el-alert
          title="您拥有管理员角色"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <div class="example-section">
      <p>以下内容只有拥有 "premium_user" 或 "enterprise_user" 角色的用户才能看到：</p>
      <div v-permission:role="['premium_user', 'enterprise_user']" class="permission-block">
        <el-alert
          title="您是高级用户或企业用户"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>功能控制</el-divider>
    
    <div class="example-section">
      <p>以下内容只有拥有 "advanced_analytics" 功能权限的用户才能看到：</p>
      <div v-permission:feature="'advanced_analytics'" class="permission-block">
        <el-alert
          title="您可以使用高级分析功能"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>订阅级别控制</el-divider>
    
    <div class="example-section">
      <p>以下内容只有 "premium" 订阅级别的用户才能看到：</p>
      <div v-permission:subscription="'premium'" class="permission-block">
        <el-alert
          title="您拥有高级会员订阅"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>资源访问控制</el-divider>
    
    <div class="example-section">
      <p>以下内容只有拥有编辑报告 ID 123 权限的用户才能看到：</p>
      <div v-permission:resource="{ type: 'report', id: 123, action: 'edit' }" class="permission-block">
        <el-alert
          title="您可以编辑报告 #123"
          type="success"
          :closable="false"
        />
      </div>
    </div>
    
    <el-divider>使用 Composable</el-divider>
    
    <div class="example-section">
      <p>使用 usePermission composable 进行动态权限检查：</p>
      
      <el-button type="primary" @click="checkPermission('stock:view')">
        检查 stock:view 权限
      </el-button>
      
      <el-button type="primary" @click="checkRole('admin')">
        检查 admin 角色
      </el-button>
      
      <div v-if="checkResult !== null" class="mt-3">
        <el-alert
          :title="checkResult ? '权限检查通过' : '权限检查失败'"
          :type="checkResult ? 'success' : 'error'"
          :closable="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePermission } from '@/composables/usePermission'

const { hasPermission, hasRole } = usePermission()
const checkResult = ref<boolean | null>(null)

async function checkPermission(permissionCode: string) {
  checkResult.value = await hasPermission(permissionCode)
}

async function checkRole(roleCode: string) {
  checkResult.value = await hasRole(roleCode)
}
</script>

<style scoped>
.permission-example {
  padding: 20px;
}

.example-section {
  margin-bottom: 20px;
}

.permission-block {
  padding: 10px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  margin-top: 10px;
}

.mt-3 {
  margin-top: 15px;
}
</style>