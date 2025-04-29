<template>
  <div class="test-dashboard">
    <h1 class="title">功能测试中心</h1>
    <p class="description">
      本页面提供对新实现功能的测试入口，方便验证功能是否正常工作。
    </p>

    <div class="test-grid">
      <div class="test-card" @click="navigateTo('/membership-test')">
        <div class="card-icon">⭐</div>
        <div class="card-content">
          <h3>会员系统测试</h3>
          <p>测试会员等级、权限控制和功能访问限制</p>
        </div>
      </div>

      <div class="test-card" @click="navigateTo('/alerts-migration-test')">
        <div class="card-icon">🔔</div>
        <div class="card-content">
          <h3>提醒数据迁移测试</h3>
          <p>测试从localStorage迁移提醒数据到数据库</p>
        </div>
      </div>

      <div class="test-card" @click="navigateTo('/data-source-test')">
        <div class="card-icon">📊</div>
        <div class="card-content">
          <h3>数据源管理测试</h3>
          <p>测试数据源搜索、排序和切换冷却时间</p>
        </div>
      </div>

      <div class="test-card" @click="navigateTo('/membership')">
        <div class="card-icon">👑</div>
        <div class="card-content">
          <h3>会员中心</h3>
          <p>查看会员信息和升级选项</p>
        </div>
      </div>

      <div class="test-card" @click="navigateTo('/settings/data-source')">
        <div class="card-icon">🔄</div>
        <div class="card-content">
          <h3>数据源设置</h3>
          <p>管理数据源和缓存设置</p>
        </div>
      </div>

      <div class="test-card" @click="navigateTo('/alerts')">
        <div class="card-icon">📢</div>
        <div class="card-content">
          <h3>条件提醒</h3>
          <p>管理股票提醒和通知设置</p>
        </div>
      </div>
    </div>

    <div class="implementation-status">
      <h2>实现状态</h2>
      <div class="status-grid">
        <div class="status-item">
          <div class="status-header">
            <h3>提醒数据迁移</h3>
            <div class="status-badge completed">已完成</div>
          </div>
          <p>将条件提醒从localStorage迁移到数据库，支持多设备同步</p>
        </div>

        <div class="status-item">
          <div class="status-header">
            <h3>数据源管理增强</h3>
            <div class="status-badge completed">已完成</div>
          </div>
          <p>添加数据源搜索、排序和切换冷却时间控制</p>
        </div>

        <div class="status-item">
          <div class="status-header">
            <h3>会员系统</h3>
            <div class="status-badge completed">已完成</div>
          </div>
          <p>实现会员等级、权限控制和功能访问限制</p>
        </div>

        <div class="status-item">
          <div class="status-header">
            <h3>数据刷新机制</h3>
            <div class="status-badge completed">已完成</div>
          </div>
          <p>添加全局数据刷新按钮和冷却时间控制</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.test-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 10px;
}

.description {
  text-align: center;
  margin-bottom: 30px;
  color: var(--el-text-color-secondary);
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.test-card {
  display: flex;
  align-items: center;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.test-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--el-box-shadow);
}

.card-icon {
  font-size: 32px;
  margin-right: 20px;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0 0 5px 0;
  color: var(--el-color-primary);
}

.card-content p {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.implementation-status {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
}

.implementation-status h2 {
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 10px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.status-item {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--el-box-shadow-lighter);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-header h3 {
  margin: 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.completed {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.status-badge.in-progress {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.status-badge.planned {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.status-item p {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

@media (max-width: 768px) {
  .test-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
