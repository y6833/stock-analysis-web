<template>
  <div class="monitoring-dashboard">
    <h2>系统监控面板</h2>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="性能指标" name="performance">
        <div class="metrics-container">
          <div class="metric-card">
            <h3>API 响应时间</h3>
            <div class="chart-container">
              <LineChart :data="apiResponseTimeData" :options="apiChartOptions" />
            </div>
            <div class="metric-stats">
              <div class="stat-item">
                <span class="stat-label">平均:</span>
                <span class="stat-value">{{ formatDuration(averageApiResponseTime) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最大:</span>
                <span class="stat-value">{{ formatDuration(maxApiResponseTime) }}</span>
              </div>
            </div>
          </div>
          
          <div class="metric-card">
            <h3>页面加载时间</h3>
            <div class="chart-container">
              <LineChart :data="pageLoadTimeData" :options="pageChartOptions" />
            </div>
          </div>
          
          <div class="metric-card">
            <h3>内存使用</h3>
            <div class="chart-container">
              <LineChart :data="memoryUsageData" :options="memoryChartOptions" />
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="错误跟踪" name="errors">
        <div class="error-filters">
          <el-select v-model="errorSeverityFilter" placeholder="严重程度" clearable>
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="严重" value="critical" />
          </el-select>
          
          <el-button type="primary" @click="fetchErrors">刷新</el-button>
        </div>
        
        <el-table
          :data="filteredErrors"
          style="width: 100%"
          :default-sort="{ prop: 'timestamp', order: 'descending' }"
        >
          <el-table-column prop="timestamp" label="时间" sortable width="180">
            <template #default="scope">
              {{ formatDate(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="severity" label="严重程度" width="100">
            <template #default="scope">
              <el-tag :type="getErrorSeverityType(scope.row.severity)">
                {{ getErrorSeverityLabel(scope.row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="component" label="组件" width="150" />
          <el-table-column prop="message" label="错误信息" />
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button type="text" @click="showErrorDetails(scope.row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="系统日志" name="logs">
        <div class="log-filters">
          <el-select v-model="logLevelFilter" placeholder="日志级别" clearable>
            <el-option label="调试" value="DEBUG" />
            <el-option label="信息" value="INFO" />
            <el-option label="警告" value="WARN" />
            <el-option label="错误" value="ERROR" />
          </el-select>
          
          <el-button type="primary" @click="fetchLogs">刷新</el-button>
          <el-button @click="downloadLogs">下载日志</el-button>
        </div>
        
        <el-table
          :data="filteredLogs"
          style="width: 100%"
          :default-sort="{ prop: 'timestamp', order: 'descending' }"
        >
          <el-table-column prop="timestamp" label="时间" sortable width="180">
            <template #default="scope">
              {{ formatDate(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="level" label="级别" width="100">
            <template #default="scope">
              <el-tag :type="getLogLevelType(scope.row.level)">
                {{ scope.row.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="模块" width="150" />
          <el-table-column prop="message" label="日志内容" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import LineChart from '../charts/LineChart.vue';
import { ElMessage } from 'element-plus';
import performanceService from '../../services/PerformanceService';
import errorTrackingService from '../../services/ErrorTrackingService';
import logService from '../../services/LogService';

// Active tab
const activeTab = ref('performance');

// Performance metrics data
const apiResponseTimeData = ref([]);
const pageLoadTimeData = ref([]);
const memoryUsageData = ref([]);

// Chart options
const apiChartOptions = ref({
  title: 'API 响应时间 (ms)',
  xAxisLabel: '时间',
  yAxisLabel: '响应时间 (ms)',
  color: '#409EFF'
});

const pageChartOptions = ref({
  title: '页面加载时间 (ms)',
  xAxisLabel: '时间',
  yAxisLabel: '加载时间 (ms)',
  color: '#67C23A'
});

const memoryChartOptions = ref({
  title: '内存使用 (MB)',
  xAxisLabel: '时间',
  yAxisLabel: '内存 (MB)',
  color: '#E6A23C'
});

// Computed metrics
const averageApiResponseTime = computed(() => {
  if (apiResponseTimeData.value.length === 0) return 0;
  const sum = apiResponseTimeData.value.reduce((acc, item) => acc + item.value, 0);
  return sum / apiResponseTimeData.value.length;
});

const maxApiResponseTime = computed(() => {
  if (apiResponseTimeData.value.length === 0) return 0;
  return Math.max(...apiResponseTimeData.value.map(item => item.value));
});

// Error tracking data
const errors = ref([]);
const errorSeverityFilter = ref('');
const errorDetailsVisible = ref(false);
const selectedError = ref(null);

// Computed error data
const filteredErrors = computed(() => {
  let result = [...errors.value];
  
  // Apply filters
  if (errorSeverityFilter.value) {
    result = result.filter(error => error.severity === errorSeverityFilter.value);
  }
  
  return result;
});

// Log data
const logs = ref([]);
const logLevelFilter = ref('');
const logDetailsVisible = ref(false);
const selectedLog = ref(null);

// Computed log data
const filteredLogs = computed(() => {
  let result = [...logs.value];
  
  // Apply filters
  if (logLevelFilter.value) {
    result = result.filter(log => log.level === logLevelFilter.value);
  }
  
  return result;
});

// Fetch data methods
async function fetchPerformanceMetrics() {
  try {
    const [apiData, pageData, memoryData] = await Promise.all([
      performanceService.getMetrics('api.response'),
      performanceService.getMetrics('page.load'),
      performanceService.getSystemMetrics()
    ]);
    
    apiResponseTimeData.value = apiData;
    pageLoadTimeData.value = pageData;
    memoryUsageData.value = memoryData;
  } catch (error) {
    ElMessage.error('获取性能指标失败');
    console.error('Failed to fetch performance metrics:', error);
  }
}

async function fetchErrors() {
  try {
    const filters = {
      severity: errorSeverityFilter.value
    };
    
    const data = await errorTrackingService.getErrors(filters);
    errors.value = data;
  } catch (error) {
    ElMessage.error('获取错误数据失败');
    console.error('Failed to fetch errors:', error);
  }
}

async function fetchLogs() {
  try {
    const filters = {
      level: logLevelFilter.value
    };
    
    const data = await logService.getLogs(filters);
    logs.value = data;
  } catch (error) {
    ElMessage.error('获取日志数据失败');
    console.error('Failed to fetch logs:', error);
  }
}

// Utility methods
function formatDuration(ms) {
  return `${ms.toFixed(2)} ms`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function getErrorSeverityType(severity) {
  switch (severity) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    case 'critical': return 'danger';
    default: return 'info';
  }
}

function getErrorSeverityLabel(severity) {
  switch (severity) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
    case 'critical': return '严重';
    default: return severity;
  }
}

function getLogLevelType(level) {
  switch (level) {
    case 'DEBUG': return 'info';
    case 'INFO': return 'success';
    case 'WARN': return 'warning';
    case 'ERROR': return 'danger';
    default: return 'info';
  }
}

function showErrorDetails(error) {
  selectedError.value = error;
  errorDetailsVisible.value = true;
}

function downloadLogs() {
  try {
    const filters = {
      level: logLevelFilter.value
    };
    
    logService.downloadLogs(filters);
    ElMessage.success('日志下载已开始');
  } catch (error) {
    ElMessage.error('下载日志失败');
    console.error('Failed to download logs:', error);
  }
}

// Data refresh interval
let refreshInterval;

// Lifecycle hooks
onMounted(() => {
  fetchPerformanceMetrics();
  fetchErrors();
  fetchLogs();
  
  // Set up refresh interval
  refreshInterval = setInterval(() => {
    if (activeTab.value === 'performance') {
      fetchPerformanceMetrics();
    }
  }, 60000); // Refresh every minute
});

onUnmounted(() => {
  // Clear refresh interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.monitoring-dashboard {
  padding: 20px;
}

.metrics-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.metric-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-container {
  height: 300px;
  margin-bottom: 15px;
}

.metric-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-right: 5px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
}

.error-filters,
.log-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>