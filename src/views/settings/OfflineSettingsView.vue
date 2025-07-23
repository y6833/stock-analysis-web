<template>
  <div class="offline-settings-view">
    <h2>离线模式设置</h2>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>离线功能</span>
          <el-tag v-if="isOnline" type="success" size="small">在线</el-tag>
          <el-tag v-else type="danger" size="small">离线</el-tag>
        </div>
      </template>
      
      <OfflineSettings />
    </el-card>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>离线数据管理</span>
        </div>
      </template>
      
      <div class="data-management">
        <h3>预加载数据</h3>
        <p class="description">
          预加载常用数据以便在离线状态下使用。这将消耗一定的存储空间，但可以提高离线体验。
        </p>
        
        <div class="preload-options">
          <el-checkbox-group v-model="preloadOptions">
            <el-checkbox label="watchlist">关注列表</el-checkbox>
            <el-checkbox label="portfolio">投资组合</el-checkbox>
            <el-checkbox label="market_index">市场指数</el-checkbox>
            <el-checkbox label="popular_stocks">热门股票</el-checkbox>
          </el-checkbox-group>
        </div>
        
        <div class="actions">
          <el-button 
            type="primary" 
            :loading="preloading" 
            :disabled="!isOnline || preloadOptions.length === 0"
            @click="preloadData"
          >
            开始预加载
          </el-button>
        </div>
        
        <el-divider />
        
        <h3>缓存管理</h3>
        <p class="description">
          管理应用程序缓存的数据。清除缓存将删除所有离线数据，但不会影响您的账户数据。
        </p>
        
        <div class="cache-info">
          <div class="info-item">
            <span class="label">缓存大小:</span>
            <span class="value">{{ formatDataSize(offlineDataSize) }}</span>
          </div>
          <div class="info-item">
            <span class="label">缓存项数:</span>
            <span class="value">{{ offlineDataKeys.length }}</span>
          </div>
          <div class="info-item">
            <span class="label">上次更新:</span>
            <span class="value">{{ lastUpdateTime }}</span>
          </div>
        </div>
        
        <div class="actions">
          <el-button 
            type="danger" 
            :disabled="offlineDataKeys.length === 0"
            @click="confirmClearCache"
          >
            清除所有缓存
          </el-button>
        </div>
      </div>
    </el-card>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>安装应用</span>
        </div>
      </template>
      
      <div class="install-app">
        <p class="description">
          将快乐股市安装到您的设备上，以获得更好的离线体验和更快的访问速度。
        </p>
        
        <div v-if="installable" class="actions">
          <el-button type="primary" @click="installApp">
            安装应用
          </el-button>
        </div>
        
        <div v-else class="not-installable">
          <el-alert
            title="无法安装应用"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>可能的原因:</p>
              <ul>
                <li>应用已经安装</li>
                <li>浏览器不支持PWA安装</li>
                <li>您使用的是iOS设备（请使用"添加到主屏幕"功能）</li>
              </ul>
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import OfflineSettings from '@/components/settings/OfflineSettings.vue';
import { useOfflineMode } from '@/composables/useOfflineMode';
import { preloadApiData } from '@/services/apiService';

const { 
  isOnline, 
  offlineDataKeys, 
  offlineDataSize, 
  formatDataSize,
  clearOfflineData,
  loadOfflineDataInfo
} = useOfflineMode();

// 预加载选项
const preloadOptions = ref<string[]>(['watchlist', 'market_index']);
const preloading = ref(false);

// 安装应用
const installable = ref(false);
const deferredPrompt = ref<any>(null);

// 计算上次更新时间
const lastUpdateTime = computed(() => {
  const lastUpdate = localStorage.getItem('offline_data_last_update');
  if (!lastUpdate) return '从未';
  
  try {
    const date = new Date(parseInt(lastUpdate));
    return date.toLocaleString();
  } catch (e) {
    return '未知';
  }
});

// 预加载数据
async function preloadData() {
  if (!isOnline.value) {
    ElMessage.warning('您当前处于离线状态，无法预加载数据');
    return;
  }
  
  if (preloadOptions.value.length === 0) {
    ElMessage.warning('请至少选择一项要预加载的数据');
    return;
  }
  
  try {
    preloading.value = true;
    
    const urls: string[] = [];
    
    // 根据选项构建URL列表
    if (preloadOptions.value.includes('watchlist')) {
      urls.push('/api/v1/watchlist');
    }
    
    if (preloadOptions.value.includes('portfolio')) {
      urls.push('/api/v1/portfolio');
      urls.push('/api/v1/portfolio/performance');
    }
    
    if (preloadOptions.value.includes('market_index')) {
      urls.push('/api/v1/stocks/indices');
    }
    
    if (preloadOptions.value.includes('popular_stocks')) {
      urls.push('/api/v1/stocks/popular');
    }
    
    // 预加载数据
    await preloadApiData(urls);
    
    // 更新最后预加载时间
    localStorage.setItem('offline_data_last_update', Date.now().toString());
    
    // 刷新缓存信息
    await loadOfflineDataInfo();
    
    ElMessage.success('数据预加载成功');
  } catch (error) {
    console.error('预加载数据时出错:', error);
    ElMessage.error('预加载数据时出错');
  } finally {
    preloading.value = false;
  }
}

// 确认清除缓存
async function confirmClearCache() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有离线缓存数据吗？这将删除所有已缓存的股票数据和设置。',
      '清除缓存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    const success = await clearOfflineData();
    if (success) {
      ElMessage.success('缓存已成功清除');
    } else {
      ElMessage.error('清除缓存时出错');
    }
  } catch {
    // 用户取消操作
  }
}

// 安装应用
function installApp() {
  if (!deferredPrompt.value) {
    ElMessage.warning('无法安装应用，请使用Chrome、Edge或Safari的"添加到主屏幕"功能');
    return;
  }
  
  // 显示安装提示
  deferredPrompt.value.prompt();
  
  // 等待用户响应
  deferredPrompt.value.userChoice.then((choiceResult: { outcome: string }) => {
    if (choiceResult.outcome === 'accepted') {
      ElMessage.success('应用安装成功');
    } else {
      ElMessage.info('应用安装已取消');
    }
    
    // 清除提示，无法再次使用
    deferredPrompt.value = null;
    installable.value = false;
  });
}

// 生命周期钩子
onMounted(() => {
  // 加载离线数据信息
  loadOfflineDataInfo();
  
  // 监听beforeinstallprompt事件
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止Chrome 67及更早版本自动显示安装提示
    e.preventDefault();
    
    // 存储事件以便稍后触发
    deferredPrompt.value = e;
    installable.value = true;
  });
  
  // 监听appinstalled事件
  window.addEventListener('appinstalled', () => {
    // 清除提示
    deferredPrompt.value = null;
    installable.value = false;
    
    ElMessage.success('应用已成功安装');
  });
});
</script>

<style scoped>
.offline-settings-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.description {
  color: #606266;
  margin-bottom: 16px;
}

.preload-options {
  margin-bottom: 16px;
}

.actions {
  margin-top: 16px;
}

.cache-info {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item .label {
  width: 100px;
  color: #606266;
}

.not-installable {
  margin-top: 16px;
}

.el-divider {
  margin: 24px 0;
}
</style>