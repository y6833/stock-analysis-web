<template>
  <div class="data-source-comparison">
    <h3 class="comparison-title">数据源比较</h3>
    
    <div class="comparison-table-container">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>数据源</th>
            <th>可靠性</th>
            <th>速度</th>
            <th>覆盖范围</th>
            <th>实时行情</th>
            <th>历史数据</th>
            <th>基本面</th>
            <th>新闻</th>
            <th>全球市场</th>
            <th>API限制</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in availableSources" :key="source" :class="{ 'current-source': source === currentSource }">
            <td class="source-name">
              <div class="source-name-container">
                <span>{{ getSourceDetails(source).name }}</span>
                <el-tag v-if="source === currentSource" size="small" type="success">当前</el-tag>
                <el-tag v-if="isRecommended(source)" size="small" type="warning">推荐</el-tag>
              </div>
            </td>
            <td>
              <div class="rating-stars">
                <el-rate
                  v-model="getSourceDetails(source).reliability"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </div>
            </td>
            <td>
              <div class="rating-stars">
                <el-rate
                  v-model="getSourceDetails(source).speed"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </div>
            </td>
            <td>
              <div class="rating-stars">
                <el-rate
                  v-model="getSourceDetails(source).coverage"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </div>
            </td>
            <td>
              <el-tag 
                :type="getSourceDetails(source).features.realtime ? 'success' : 'info'"
                effect="plain"
              >
                {{ getSourceDetails(source).features.realtime ? '支持' : '不支持' }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                :type="getSourceDetails(source).features.history ? 'success' : 'info'"
                effect="plain"
              >
                {{ getSourceDetails(source).features.history ? '支持' : '不支持' }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                :type="getSourceDetails(source).features.fundamental ? 'success' : 'info'"
                effect="plain"
              >
                {{ getSourceDetails(source).features.fundamental ? '支持' : '不支持' }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                :type="getSourceDetails(source).features.news ? 'success' : 'info'"
                effect="plain"
              >
                {{ getSourceDetails(source).features.news ? '支持' : '不支持' }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                :type="getSourceDetails(source).features.global ? 'success' : 'info'"
                effect="plain"
              >
                {{ getSourceDetails(source).features.global ? '支持' : '不支持' }}
              </el-tag>
            </td>
            <td>{{ getSourceDetails(source).apiLimit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="recommendation-section">
      <h4>推荐数据源</h4>
      <div class="recommendation-cards">
        <el-card 
          v-for="source in recommendedSources" 
          :key="source" 
          class="recommendation-card"
          :class="{ 'current-source': source === currentSource }"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <h5>{{ getSourceDetails(source).name }}</h5>
              <div class="card-actions">
                <el-button 
                  v-if="source !== currentSource" 
                  type="primary" 
                  size="small"
                  @click="switchSource(source)"
                >
                  切换
                </el-button>
                <el-button 
                  v-else 
                  type="success" 
                  size="small" 
                  disabled
                >
                  当前使用中
                </el-button>
              </div>
            </div>
          </template>
          <div class="card-content">
            <p class="recommendation-text">{{ getSourceDetails(source).recommendation }}</p>
            <div class="feature-highlights">
              <div class="feature-item" v-if="getSourceDetails(source).features.realtime">
                <i class="el-icon-time"></i> 实时行情
              </div>
              <div class="feature-item" v-if="getSourceDetails(source).features.history">
                <i class="el-icon-data-line"></i> 历史数据
              </div>
              <div class="feature-item" v-if="getSourceDetails(source).features.fundamental">
                <i class="el-icon-document"></i> 基本面数据
              </div>
              <div class="feature-item" v-if="getSourceDetails(source).features.news">
                <i class="el-icon-news"></i> 财经新闻
              </div>
              <div class="feature-item" v-if="getSourceDetails(source).features.global">
                <i class="el-icon-globe"></i> 全球市场
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { stockService } from '@/services/stockService'
import { DataSourceFactory, type DataSourceType, type DataSourceDetails } from '@/services/dataSource/DataSourceFactory'
import { ElMessage } from 'element-plus'

// 属性
const props = defineProps({
  currentSource: {
    type: String as () => DataSourceType,
    required: true
  }
})

// 事件
const emit = defineEmits(['switch-source'])

// 状态
const availableSources = ref<DataSourceType[]>([])
const recommendedSources = ref<DataSourceType[]>([])
const sourceDetails = ref<Record<DataSourceType, DataSourceDetails>>({} as Record<DataSourceType, DataSourceDetails>)

// 获取数据源详细信息
const getSourceDetails = (source: DataSourceType): DataSourceDetails => {
  if (!sourceDetails.value[source]) {
    sourceDetails.value[source] = DataSourceFactory.getDataSourceDetails(source)
  }
  return sourceDetails.value[source]
}

// 判断是否为推荐数据源
const isRecommended = (source: DataSourceType): boolean => {
  return recommendedSources.value.includes(source)
}

// 切换数据源
const switchSource = (source: DataSourceType) => {
  emit('switch-source', source)
}

// 初始化
onMounted(() => {
  // 获取所有可用数据源
  availableSources.value = DataSourceFactory.getAvailableDataSources()
  
  // 获取推荐数据源
  recommendedSources.value = DataSourceFactory.getRecommendedDataSources()
  
  // 预加载所有数据源详情
  availableSources.value.forEach(source => {
    sourceDetails.value[source] = DataSourceFactory.getDataSourceDetails(source)
  })
})
</script>

<style scoped>
.data-source-comparison {
  margin-top: 20px;
}

.comparison-title {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.comparison-table-container {
  overflow-x: auto;
  margin-bottom: 30px;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 15px;
  text-align: center;
  border-bottom: 1px solid #ebeef5;
}

.comparison-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 500;
}

.comparison-table tr:hover {
  background-color: #f5f7fa;
}

.comparison-table tr.current-source {
  background-color: #ecf5ff;
}

.source-name {
  text-align: left;
  font-weight: 500;
}

.source-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-stars {
  display: flex;
  justify-content: center;
}

.recommendation-section {
  margin-top: 30px;
}

.recommendation-section h4 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.recommendation-cards {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.recommendation-card {
  width: 300px;
  margin-bottom: 20px;
}

.recommendation-card.current-source {
  border: 1px solid #67c23a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h5 {
  margin: 0;
  font-size: 16px;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.recommendation-text {
  margin-bottom: 15px;
  color: #606266;
}

.feature-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feature-item {
  background-color: #f0f9eb;
  color: #67c23a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
