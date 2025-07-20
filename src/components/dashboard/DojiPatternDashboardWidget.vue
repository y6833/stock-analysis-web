<template>
  <div class="doji-pattern-dashboard-widget">
    <el-card class="widget-card" shadow="hover">
      <template #header>
        <div class="widget-header">
          <div class="header-left">
            <span class="header-icon">✨</span>
            <span class="header-title">十字星形态分析</span>
          </div>
          <el-tag size="small" type="success">新功能</el-tag>
        </div>
      </template>

      <div class="widget-content">
        <div class="feature-summary">
          <p>自动识别股票图表中的十字星形态，帮助您发现潜在的交易机会</p>
        </div>

        <div class="stats-summary" v-if="hasStats">
          <el-row :gutter="10">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ stats.todayPatterns }}</div>
                <div class="stat-label">今日形态</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ stats.upwardStocks }}</div>
                <div class="stat-label">上涨股票</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ stats.avgUpwardPercent }}%</div>
                <div class="stat-label">平均涨幅</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="widget-actions">
          <el-button type="primary" @click="goToScreener">
            <el-icon><Search /></el-icon>
            形态筛选
          </el-button>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button>
              更多功能
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  配置设置
                </el-dropdown-item>
                <el-dropdown-item command="alerts">
                  <el-icon><Bell /></el-icon>
                  创建提醒
                </el-dropdown-item>
                <el-dropdown-item command="system">
                  <el-icon><Tools /></el-icon>
                  系统管理
                </el-dropdown-item>
                <el-dropdown-item command="guide">
                  <el-icon><QuestionFilled /></el-icon>
                  功能指南
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Setting, Bell, ArrowDown, QuestionFilled, Tools } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const router = useRouter()

// 统计数据
const hasStats = ref(false)
const stats = ref({
  todayPatterns: 0,
  upwardStocks: 0,
  avgUpwardPercent: 0,
})

// 获取统计数据
const fetchStats = async () => {
  try {
    // 这里应该调用实际的API获取统计数据
    // 目前使用模拟数据
    stats.value = {
      todayPatterns: Math.floor(Math.random() * 50) + 10,
      upwardStocks: Math.floor(Math.random() * 30) + 5,
      avgUpwardPercent: +(Math.random() * 5 + 1).toFixed(1),
    }
    hasStats.value = true
  } catch (error) {
    console.error('获取十字星统计数据失败:', error)
  }
}

// 导航到十字星筛选工具
const goToScreener = () => {
  router.push('/doji-pattern/screener')
}

// 处理下拉菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'settings':
      router.push('/doji-pattern/settings')
      break
    case 'alerts':
      router.push('/doji-pattern/alerts')
      break
    case 'system':
      router.push('/doji-pattern/system')
      break
    case 'guide':
      showGuide()
      break
  }
}

// 显示功能指南
const showGuide = () => {
  ElMessageBox.alert(
    '十字星形态分析功能可以帮助您识别股票图表中的十字星形态，并筛选出现十字星后上涨的股票。点击"形态筛选"按钮开始使用此功能。',
    '十字星形态分析功能指南',
    {
      confirmButtonText: '前往使用',
      callback: () => {
        router.push('/doji-pattern/screener')
      },
    }
  )
}

// 组件挂载时获取统计数据
onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.widget-card {
  height: 100%;
  transition: all 0.3s ease;
}

.widget-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
}

.feature-summary {
  margin-bottom: 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.stats-summary {
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.stat-item {
  text-align: center;
  padding: 8px 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.widget-actions {
  display: flex;
  gap: 10px;
}
</style>
