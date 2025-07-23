<template>
  <div class="network-aware-image" :class="{ 'is-loading': loading }">
    <img
      v-if="!loading && !error"
      :src="optimizedSrc"
      :alt="alt"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
    />
    <div v-else-if="loading" class="image-placeholder">
      <div class="loading-spinner"></div>
    </div>
    <div v-else class="image-error">
      <el-icon><PictureFilled /></el-icon>
      <span>图片加载失败</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PictureFilled } from '@element-plus/icons-vue';
import { useNetworkStatus } from '@/services/networkStatusService';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: [Number, String],
    default: 'auto'
  },
  height: {
    type: [Number, String],
    default: 'auto'
  },
  lazy: {
    type: Boolean,
    default: true
  },
  fallbackSrc: {
    type: String,
    default: ''
  }
});

const { isPoorConnection } = useNetworkStatus();

const loading = ref(true);
const error = ref(false);
const observer = ref<IntersectionObserver | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const shouldLoad = ref(!props.lazy);

// 根据网络状态优化图片URL
const optimizedSrc = computed(() => {
  const url = new URL(props.src, window.location.href);
  
  // 如果是弱网络，尝试加载较低质量的图片
  if (isPoorConnection.value) {
    // 如果是我们自己的图片服务，添加质量参数
    if (url.hostname === window.location.hostname || url.hostname.includes('our-image-cdn.com')) {
      url.searchParams.set('q', '60'); // 降低质量到60%
      url.searchParams.set('w', '480'); // 限制宽度
    }
    
    // 如果有备用的低质量图片，使用它
    if (props.fallbackSrc) {
      return props.fallbackSrc;
    }
  }
  
  return url.toString();
});

// 图片样式
const imageStyle = computed(() => {
  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height
  };
});

// 处理图片加载完成
function handleLoad() {
  loading.value = false;
}

// 处理图片加载错误
function handleError() {
  loading.value = false;
  error.value = true;
  
  // 如果有备用图片且当前不是备用图片，尝试加载备用图片
  if (props.fallbackSrc && props.src !== props.fallbackSrc) {
    const img = new Image();
    img.src = props.fallbackSrc;
    img.onload = () => {
      error.value = false;
      imageRef.value = img;
    };
  }
}

// 设置懒加载
onMounted(() => {
  if (props.lazy && 'IntersectionObserver' in window) {
    const el = document.querySelector('.network-aware-image') as HTMLElement;
    
    observer.value = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          shouldLoad.value = true;
          observer.value?.disconnect();
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    observer.value.observe(el);
  } else {
    shouldLoad.value = true;
  }
});
</script>

<style scoped>
.network-aware-image {
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 100px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4CAF50;
  animation: spin 1s linear infinite;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>