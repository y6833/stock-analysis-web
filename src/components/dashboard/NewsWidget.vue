<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(true)
const newsItems = ref<any[]>([])
const newsCategories = ref(['全部', '公司', '行业', '宏观', '政策'])
const selectedCategory = ref('全部')

// 模拟获取新闻数据
onMounted(async () => {
  try {
    await fetchNews()
  } catch (error) {
    console.error('获取新闻失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 获取新闻数据
const fetchNews = async () => {
  isLoading.value = true
  
  // 模拟API请求延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 模拟新闻数据
  newsItems.value = [
    { 
      id: 1, 
      title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元', 
      time: '10分钟前', 
      source: '财经日报', 
      url: '#', 
      important: true,
      category: '宏观'
    },
    { 
      id: 2, 
      title: '科技板块全线上涨，半导体行业领涨', 
      time: '30分钟前', 
      source: '证券时报', 
      url: '#',
      category: '行业'
    },
    { 
      id: 3, 
      title: '多家券商上调A股目标位，看好下半年行情', 
      time: '1小时前', 
      source: '上海证券报', 
      url: '#',
      category: '宏观'
    },
    { 
      id: 4, 
      title: '外资连续三日净流入，北向资金今日净买入超50亿', 
      time: '2小时前', 
      source: '中国证券报', 
      url: '#',
      category: '宏观'
    },
    { 
      id: 5, 
      title: '新能源汽车销量创新高，相关概念股受关注', 
      time: '3小时前', 
      source: '第一财经', 
      url: '#',
      category: '行业'
    },
    { 
      id: 6, 
      title: '某科技公司发布季度财报，净利润同比增长30%', 
      time: '4小时前', 
      source: '财经网', 
      url: '#',
      category: '公司'
    },
    { 
      id: 7, 
      title: '国务院发布新政策支持中小企业发展', 
      time: '5小时前', 
      source: '人民日报', 
      url: '#',
      category: '政策'
    }
  ]
  
  isLoading.value = false
}

// 过滤新闻
const filteredNews = computed(() => {
  if (selectedCategory.value === '全部') {
    return newsItems.value
  }
  return newsItems.value.filter(item => item.category === selectedCategory.value)
})

// 切换分类
const changeCategory = (category: string) => {
  selectedCategory.value = category
}

// 查看更多新闻
const viewMoreNews = () => {
  // 这里应该跳转到新闻页面，但目前还没有实现
  console.log('查看更多新闻')
}
</script>

<template>
  <div class="news-widget">
    <div class="news-categories">
      <button 
        v-for="category in newsCategories" 
        :key="category"
        class="category-btn"
        :class="{ active: selectedCategory === category }"
        @click="changeCategory(category)"
      >
        {{ category }}
      </button>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载新闻...</p>
    </div>
    
    <div v-else class="news-list">
      <div 
        v-for="item in filteredNews" 
        :key="item.id" 
        class="news-item"
        :class="{ 'important-news': item.important }"
      >
        <div class="news-content">
          <h4 class="news-title">{{ item.title }}</h4>
          <div class="news-meta">
            <span class="news-time">{{ item.time }}</span>
            <span class="news-source">{{ item.source }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="widget-footer">
      <button class="btn btn-outline btn-sm" @click="viewMoreNews">
        查看更多
      </button>
      <button class="btn btn-outline btn-sm" @click="fetchNews">
        刷新
      </button>
    </div>
  </div>
</template>

<style scoped>
.news-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.news-categories {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
}

.category-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.category-btn:hover {
  background-color: var(--bg-secondary);
}

.category-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  flex: 1;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(66, 185, 131, 0.2);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.news-list {
  flex: 1;
  overflow-y: auto;
}

.news-item {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  transition: all var(--transition-fast);
}

.news-item:hover {
  background-color: var(--bg-secondary);
}

.important-news {
  background-color: rgba(243, 156, 18, 0.1);
  border-left: 3px solid var(--warning-color);
}

.news-title {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.widget-footer {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}
</style>
