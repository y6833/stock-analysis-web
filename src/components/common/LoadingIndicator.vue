<template>
  <div 
    v-if="loading" 
    class="loading-indicator" 
    :class="{ 
      'is-fullscreen': fullscreen, 
      'is-overlay': overlay && !fullscreen,
      [`size-${size}`]: true
    }"
  >
    <div class="loading-spinner">
      <el-icon class="loading-icon" :size="iconSize">
        <component :is="icon" />
      </el-icon>
    </div>
    <div v-if="text" class="loading-text">{{ text }}</div>
    <div v-if="showProgress && progress !== null" class="loading-progress">
      <el-progress 
        :percentage="progress" 
        :stroke-width="4" 
        :text-inside="true" 
        :show-text="showProgressText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';

const props = defineProps({
  // 是否显示加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 加载文本
  text: {
    type: String,
    default: '加载中...'
  },
  // 是否全屏显示
  fullscreen: {
    type: Boolean,
    default: false
  },
  // 是否显示遮罩层
  overlay: {
    type: Boolean,
    default: true
  },
  // 加载图标
  icon: {
    type: String,
    default: 'Loading'
  },
  // 组件大小：small, medium, large
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  },
  // 进度值（0-100）
  progress: {
    type: Number,
    default: null
  },
  // 是否显示进度条
  showProgress: {
    type: Boolean,
    default: false
  },
  // 是否在进度条中显示文本
  showProgressText: {
    type: Boolean,
    default: true
  }
});

// 根据大小计算图标大小
const iconSize = computed(() => {
  switch (props.size) {
    case 'small':
      return 24;
    case 'large':
      return 48;
    case 'medium':
    default:
      return 32;
  }
});
</script>

<style scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.loading-indicator.is-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 100;
}

.loading-indicator.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  animation: rotate 1.5s linear infinite;
  color: var(--primary-color, #409eff);
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-secondary, #606266);
}

.loading-progress {
  margin-top: 16px;
  width: 200px;
}

/* 大小变体 */
.loading-indicator.size-small .loading-text {
  font-size: 12px;
  margin-top: 8px;
}

.loading-indicator.size-small .loading-progress {
  width: 150px;
  margin-top: 12px;
}

.loading-indicator.size-large .loading-text {
  font-size: 16px;
  margin-top: 16px;
}

.loading-indicator.size-large .loading-progress {
  width: 250px;
  margin-top: 20px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>