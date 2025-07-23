<template>
  <div class="error-handling-demo">
    <h2>错误处理与加载状态演示</h2>
    
    <div class="demo-section">
      <h3>错误消息演示</h3>
      <div class="demo-controls">
        <el-button @click="showErrorMessage('error')">显示错误消息</el-button>
        <el-button @click="showErrorMessage('warning')">显示警告消息</el-button>
        <el-button @click="showErrorMessage('info')">显示信息消息</el-button>
      </div>
      
      <ErrorMessage
        v-if="errorState.show"
        :type="errorState.type"
        :message="errorState.message"
        :details="errorState.details"
        :suggestion="errorState.suggestion"
        :dismissible="true"
        @dismiss="clearError"
      />
    </div>
    
    <div class="demo-section">
      <h3>加载状态演示</h3>
      <div class="demo-controls">
        <el-button @click="showGlobalLoading">显示全局加载</el-button>
        <el-button @click="hideGlobalLoading">隐藏全局加载</el-button>
      </div>
      
      <div class="loading-demo-container" v-loading="componentLoading">
        <h4>组件加载状态</h4>
        <div class="demo-controls">
          <el-button @click="toggleComponentLoading">切换组件加载状态</el-button>
        </div>
        <div v-if="!componentLoading" class="demo-content">
          这里是组件内容，当加载状态为true时将被遮罩
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>API请求演示</h3>
      <div class="demo-controls">
        <el-button @click="simulateSuccessRequest">模拟成功请求</el-button>
        <el-button @click="simulateErrorRequest">模拟失败请求</el-button>
        <el-button @click="simulateNetworkError">模拟网络错误</el-button>
      </div>
      
      <div v-if="apiResult" class="api-result">
        <h4>API响应结果</h4>
        <pre>{{ JSON.stringify(apiResult, null, 2) }}</pre>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>进度指示器演示</h3>
      <div class="demo-controls">
        <el-button @click="startProgress">开始进度演示</el-button>
        <el-button @click="resetProgress">重置进度</el-button>
      </div>
      
      <LoadingIndicator
        :loading="showProgress"
        text="加载中..."
        :progress="progress"
        :show-progress="true"
        size="medium"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import loadingService from '@/services/loadingService';
import errorHandlingService, { ErrorType, ErrorSeverity } from '@/services/errorHandlingService';
import { useErrorHandling } from '@/composables/useErrorHandling';

// 使用错误处理composable
const { errorState, showError, clearError, handleError } = useErrorHandling();

// 组件加载状态
const componentLoading = ref(false);

// API结果
const apiResult = ref(null);

// 进度演示
const showProgress = ref(false);
const progress = ref(0);
let progressInterval: number | null = null;

// 显示错误消息
const showErrorMessage = (type: 'error' | 'warning' | 'info') => {
  const messages = {
    error: '发生错误，无法完成操作',
    warning: '警告：此操作可能导致数据丢失',
    info: '请注意：系统将在30分钟后进行维护'
  };
  
  const details = type === 'error' ? '错误详情：\n请求超时，服务器无响应' : undefined;
  const suggestion = type === 'error' ? '请检查您的网络连接并重试' : 
                    type === 'warning' ? '请确保保存所有重要数据' : undefined;
  
  showError(messages[type], type, details, suggestion);
};

// 切换组件加载状态
const toggleComponentLoading = () => {
  componentLoading.value = !componentLoading.value;
};

// 显示全局加载
const showGlobalLoading = () => {
  loadingService.showGlobalLoading('全局加载中...');
  
  // 3秒后自动隐藏
  setTimeout(() => {
    loadingService.hideGlobalLoading();
  }, 3000);
};

// 隐藏全局加载
const hideGlobalLoading = () => {
  loadingService.hideGlobalLoading(true);
};

// 模拟成功请求
const simulateSuccessRequest = async () => {
  try {
    loadingService.showGlobalLoading('请求中...');
    
    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    apiResult.value = {
      success: true,
      data: {
        id: 123,
        name: '示例数据',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    handleError(error, '请求失败');
  } finally {
    loadingService.hideGlobalLoading();
  }
};

// 模拟失败请求
const simulateErrorRequest = async () => {
  try {
    loadingService.showGlobalLoading('请求中...');
    
    // 模拟API请求
    await new Promise((_, reject) => setTimeout(() => {
      reject({
        response: {
          status: 400,
          data: {
            message: '请求参数无效',
            errors: {
              name: '名称不能为空',
              email: '邮箱格式不正确'
            }
          }
        }
      });
    }, 1500));
  } catch (error) {
    handleError(error, '请求失败');
    apiResult.value = null;
  } finally {
    loadingService.hideGlobalLoading();
  }
};

// 模拟网络错误
const simulateNetworkError = async () => {
  try {
    loadingService.showGlobalLoading('请求中...');
    
    // 模拟网络错误
    await new Promise((_, reject) => setTimeout(() => {
      const error = new Error('Network Error');
      error.message = 'Network Error';
      reject(error);
    }, 1500));
  } catch (error) {
    handleError(error, '网络错误');
    apiResult.value = null;
  } finally {
    loadingService.hideGlobalLoading();
  }
};

// 开始进度演示
const startProgress = () => {
  showProgress.value = true;
  progress.value = 0;
  
  // 清除之前的定时器
  if (progressInterval !== null) {
    clearInterval(progressInterval);
  }
  
  // 创建新的定时器
  progressInterval = window.setInterval(() => {
    progress.value += 10;
    
    if (progress.value >= 100) {
      clearInterval(progressInterval);
      progressInterval = null;
      
      // 完成后延迟隐藏
      setTimeout(() => {
        showProgress.value = false;
      }, 1000);
    }
  }, 500);
};

// 重置进度
const resetProgress = () => {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  
  progress.value = 0;
  showProgress.value = false;
};

// 组件卸载时清理
onUnmounted(() => {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
  }
});
</script>

<style scoped>
.error-handling-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.demo-controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.loading-demo-container {
  position: relative;
  min-height: 150px;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 4px;
}

.demo-content {
  margin-top: 20px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.api-result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: auto;
}

.api-result pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>