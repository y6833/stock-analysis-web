<template>
  <div class="network-aware-data-table">
    <!-- 表格加载状态 -->
    <div v-if="loading" class="table-loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- 表格错误状态 -->
    <div v-else-if="error" class="table-error">
      <el-icon><Warning /></el-icon>
      <p>{{ errorMessage }}</p>
      <el-button size="small" @click="retry">重试</el-button>
    </div>
    
    <!-- 表格内容 -->
    <div v-else>
      <!-- 表格工具栏 -->
      <div class="table-toolbar">
        <div class="left-actions">
          <slot name="toolbar-left"></slot>
        </div>
        
        <div class="right-actions">
          <!-- 网络状态指示器 -->
          <div v-if="showNetworkStatus" class="network-status">
            <el-tag 
              :type="isOnline ? (isPoorConnection ? 'warning' : 'success') : 'danger'" 
              size="small"
            >
              {{ isOnline ? (isPoorConnection ? '弱网络' : '在线') : '离线' }}
            </el-tag>
          </div>
          
          <!-- 数据来源指示器 -->
          <div v-if="dataSource" class="data-source">
            <el-tooltip :content="dataSourceTooltip" placement="top">
              <span>
                <el-icon v-if="fromCache"><Memo /></el-icon>
                数据来源: {{ dataSource }}
              </span>
            </el-tooltip>
          </div>
          
          <slot name="toolbar-right"></slot>
        </div>
      </div>
      
      <!-- 实际表格 -->
      <el-table
        v-bind="$attrs"
        :data="displayData"
        :height="tableHeight"
        :max-height="maxHeight"
        v-on="$listeners"
      >
        <slot></slot>
        
        <!-- 无数据提示 -->
        <template #empty>
          <div class="empty-data">
            <el-icon><DocumentRemove /></el-icon>
            <p>{{ emptyText }}</p>
          </div>
        </template>
      </el-table>
      
      <!-- 分页器 -->
      <div v-if="pagination && totalItems > 0" class="table-pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalItems"
          :page-sizes="pageSizes"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Warning, Memo, DocumentRemove } from '@element-plus/icons-vue';
import { useNetworkStatus } from '@/services/networkStatusService';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: '加载数据时出错'
  },
  loadingMessage: {
    type: String,
    default: '加载中...'
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  pagination: {
    type: Boolean,
    default: false
  },
  pageSize: {
    type: Number,
    default: 10
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  totalItems: {
    type: Number,
    default: 0
  },
  dataSource: {
    type: String,
    default: ''
  },
  fromCache: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: [Date, String, Number],
    default: null
  },
  showNetworkStatus: {
    type: Boolean,
    default: true
  },
  maxHeight: {
    type: [String, Number],
    default: null
  },
  adaptiveHeight: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['retry', 'page-change', 'size-change']);

const { isOnline, isPoorConnection } = useNetworkStatus();
const currentPage = ref(1);
const tableHeight = ref<string | number>('auto');

// 计算属性：显示数据
const displayData = computed(() => {
  if (!props.pagination) {
    return props.data;
  }
  
  const start = (currentPage.value - 1) * props.pageSize;
  const end = start + props.pageSize;
  
  return props.data.slice(start, end);
});

// 计算属性：数据源提示
const dataSourceTooltip = computed(() => {
  let tooltip = `数据来源: ${props.dataSource}`;
  
  if (props.fromCache) {
    tooltip += ' (缓存数据)';
  }
  
  if (props.timestamp) {
    const date = new Date(props.timestamp);
    tooltip += `\n更新时间: ${date.toLocaleString()}`;
  }
  
  return tooltip;
});

// 重试加载数据
function retry() {
  emit('retry');
}

// 处理页码变化
function handleCurrentChange(page: number) {
  currentPage.value = page;
  emit('page-change', page);
}

// 处理每页条数变化
function handleSizeChange(size: number) {
  emit('size-change', size);
}

// 计算自适应高度
function calculateAdaptiveHeight() {
  if (!props.adaptiveHeight) return;
  
  const el = document.querySelector('.network-aware-data-table') as HTMLElement;
  if (!el) return;
  
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const offsetTop = rect.top;
  const footerHeight = 60; // 估计的页脚高度
  const toolbarHeight = 50; // 估计的工具栏高度
  const paginationHeight = props.pagination ? 50 : 0;
  
  const availableHeight = viewportHeight - offsetTop - footerHeight - toolbarHeight - paginationHeight;
  tableHeight.value = Math.max(300, availableHeight); // 最小高度300px
}

// 监听数据变化，重置页码
watch(() => props.data, () => {
  currentPage.value = 1;
});

// 生命周期钩子
onMounted(() => {
  calculateAdaptiveHeight();
  
  // 监听窗口大小变化
  if (props.adaptiveHeight) {
    window.addEventListener('resize', calculateAdaptiveHeight);
  }
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  if (props.adaptiveHeight) {
    window.removeEventListener('resize', calculateAdaptiveHeight);
  }
});
</script>

<style scoped>
.network-aware-data-table {
  width: 100%;
}

.table-loading,
.table-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4CAF50;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.table-error .el-icon {
  font-size: 40px;
  color: #f56c6c;
  margin-bottom: 16px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.data-source {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
}

.data-source .el-icon {
  margin-right: 4px;
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
}

.empty-data .el-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>