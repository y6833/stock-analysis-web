<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const isLoading = ref(true)
const newsItems = ref([])
const categories = ref(['全部', '宏观经济', '公司新闻', '行业动态', '政策法规', '市场评论'])
const selectedCategory = ref('全部')
const searchQuery = ref('')

// 模拟新闻数据
const mockNewsData = [
  {
    id: 1,
    title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
    summary: '中国人民银行决定于2023年9月15日下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。此举旨在保持银行体系流动性合理充裕，促进经济稳定增长。',
    source: '央行网站',
    category: '宏观经济',
    date: '2023-09-10',
    time: '14:30',
    url: '#',
    important: true,
    image: 'https://via.placeholder.com/300x200?text=央行降准'
  },
  {
    id: 2,
    title: '科技板块全线上涨，半导体行业领涨',
    summary: '今日A股市场科技板块表现强势，半导体、芯片设计等细分领域涨幅居前。分析师认为，这与近期国家对科技创新的政策支持以及全球半导体行业复苏有关。',
    source: '证券时报',
    category: '市场评论',
    date: '2023-09-10',
    time: '15:45',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=科技板块'
  },
  {
    id: 3,
    title: '多家券商上调A股目标位，看好下半年行情',
    summary: '近期多家券商发布研报，上调A股年内目标位，普遍看好下半年市场表现。分析认为，经济复苏、政策支持以及外资持续流入是支撑市场的主要因素。',
    source: '上海证券报',
    category: '市场评论',
    date: '2023-09-09',
    time: '09:15',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=券商观点'
  },
  {
    id: 4,
    title: '外资连续三日净流入，北向资金今日净买入超50亿',
    summary: '据统计数据显示，北向资金连续三个交易日净流入A股市场，今日净买入金额超过50亿元，主要集中在金融、消费等蓝筹板块。',
    source: '中国证券报',
    category: '市场评论',
    date: '2023-09-08',
    time: '16:00',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=外资流入'
  },
  {
    id: 5,
    title: '新能源汽车销量创新高，相关概念股受关注',
    summary: '中汽协数据显示，8月新能源汽车销量同比增长30%，创历史新高。市场分析认为，随着技术进步和政策支持，新能源汽车产业链相关公司有望持续受益。',
    source: '第一财经',
    category: '行业动态',
    date: '2023-09-08',
    time: '10:30',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=新能源汽车'
  },
  {
    id: 6,
    title: '国务院发布数字经济发展新政策，提出五年发展目标',
    summary: '国务院近日发布《关于促进数字经济发展的指导意见》，提出到2025年数字经济核心产业增加值占GDP比重达到10%的发展目标，并明确了重点发展方向和支持措施。',
    source: '新华社',
    category: '政策法规',
    date: '2023-09-07',
    time: '11:20',
    url: '#',
    important: true,
    image: 'https://via.placeholder.com/300x200?text=数字经济政策'
  },
  {
    id: 7,
    title: '某科技巨头宣布大规模回购计划，股价应声上涨',
    summary: '某科技巨头今日宣布启动500亿元回购计划，这是该公司历史上规模最大的一次回购。消息公布后，公司股价大幅上涨，带动相关板块走强。',
    source: '财经日报',
    category: '公司新闻',
    date: '2023-09-07',
    time: '14:00',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=股票回购'
  },
  {
    id: 8,
    title: '制造业PMI连续三个月回升，经济复苏势头向好',
    summary: '国家统计局公布的数据显示，8月制造业PMI为50.2%，连续三个月回升并站上荣枯线。分析认为，这表明我国经济复苏势头持续向好，企业生产经营活动逐步恢复正常。',
    source: '经济观察报',
    category: '宏观经济',
    date: '2023-09-06',
    time: '09:30',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=PMI数据'
  },
  {
    id: 9,
    title: '某医药公司新药获批上市，市场潜力巨大',
    summary: '某医药公司今日宣布，其自主研发的创新药物已获国家药监局批准上市。分析师预计，该药物年销售额有望达到50亿元，将成为公司新的业绩增长点。',
    source: '医药经济报',
    category: '公司新闻',
    date: '2023-09-05',
    time: '13:45',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=医药新药'
  },
  {
    id: 10,
    title: '证监会发布新规，加强上市公司信息披露监管',
    summary: '证监会近日发布《上市公司信息披露管理办法》修订版，进一步规范上市公司信息披露行为，提高信息披露质量，保护投资者合法权益。新规将于10月1日起施行。',
    source: '证券日报',
    category: '政策法规',
    date: '2023-09-04',
    time: '16:30',
    url: '#',
    important: true,
    image: 'https://via.placeholder.com/300x200?text=信息披露新规'
  },
  {
    id: 11,
    title: '某互联网巨头发布季度财报，营收超预期',
    summary: '某互联网巨头发布2023年第二季度财报，营收同比增长15%，净利润增长20%，均超市场预期。公司表示，云计算和人工智能业务是主要增长动力。',
    source: '互联网周刊',
    category: '公司新闻',
    date: '2023-09-03',
    time: '19:00',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=财报发布'
  },
  {
    id: 12,
    title: '房地产调控政策再松绑，一线城市率先放宽限购',
    summary: '多个一线城市近日宣布调整房地产政策，放宽购房限制，降低首付比例和贷款利率。分析认为，这将有助于稳定房地产市场，提振相关产业链。',
    source: '中国房地产报',
    category: '政策法规',
    date: '2023-09-02',
    time: '10:00',
    url: '#',
    important: true,
    image: 'https://via.placeholder.com/300x200?text=房地产政策'
  },
  {
    id: 13,
    title: '人工智能产业迎来新一轮投资热潮，相关公司股价大涨',
    summary: '随着ChatGPT等大型语言模型的爆发式增长，人工智能产业迎来新一轮投资热潮。A股市场上，芯片、算力、大模型等AI产业链相关公司股价普遍大涨。',
    source: '科技日报',
    category: '行业动态',
    date: '2023-09-01',
    time: '11:30',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=AI产业'
  },
  {
    id: 14,
    title: '某新能源企业宣布重大技术突破，电池能量密度提升30%',
    summary: '某新能源企业今日宣布在电池技术领域取得重大突破，新一代电池能量密度提升30%，充电速度提高50%。该技术预计将于明年实现量产。',
    source: '能源评论',
    category: '公司新闻',
    date: '2023-08-31',
    time: '15:15',
    url: '#',
    important: false,
    image: 'https://via.placeholder.com/300x200?text=电池技术'
  },
  {
    id: 15,
    title: '央行行长发表重要讲话，强调稳健货币政策',
    summary: '中国人民银行行长在某论坛上发表重要讲话，强调将继续实施稳健的货币政策，保持流动性合理充裕，支持实体经济发展，防范金融风险。',
    source: '金融时报',
    category: '宏观经济',
    date: '2023-08-30',
    time: '14:00',
    url: '#',
    important: true,
    image: 'https://via.placeholder.com/300x200?text=央行讲话'
  }
]

// 初始化页面
onMounted(() => {
  // 设置新闻数据
  newsItems.value = mockNewsData
  isLoading.value = false
})

// 选择分类
const selectCategory = (category) => {
  selectedCategory.value = category
}

// 过滤新闻
const filteredNews = computed(() => {
  let result = newsItems.value
  
  // 按分类过滤
  if (selectedCategory.value !== '全部') {
    result = result.filter(item => item.category === selectedCategory.value)
  }
  
  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.summary.toLowerCase().includes(query) ||
      item.source.toLowerCase().includes(query)
    )
  }
  
  return result
})

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取相对时间
const getRelativeTime = (dateStr, timeStr) => {
  const now = new Date()
  const newsDate = new Date(`${dateStr} ${timeStr}`)
  const diffMs = now - newsDate
  
  // 转换为秒
  const diffSec = Math.floor(diffMs / 1000)
  
  if (diffSec < 60) {
    return '刚刚'
  } else if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}分钟前`
  } else if (diffSec < 86400) {
    return `${Math.floor(diffSec / 3600)}小时前`
  } else if (diffSec < 604800) {
    return `${Math.floor(diffSec / 86400)}天前`
  } else {
    return `${formatDate(dateStr)}`
  }
}
</script>

<template>
  <div class="news-view">
    <div class="page-header">
      <h1>市场资讯</h1>
      <p class="subtitle">及时了解市场动态，把握投资机会</p>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载新闻资讯...</p>
    </div>
    
    <div v-else class="news-content">
      <!-- 搜索和筛选 -->
      <div class="news-filters card">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索新闻..." 
            class="search-input"
          />
        </div>
        
        <div class="category-tabs">
          <button 
            v-for="category in categories" 
            :key="category"
            class="category-tab"
            :class="{ 'active': selectedCategory === category }"
            @click="selectCategory(category)"
          >
            {{ category }}
          </button>
        </div>
      </div>
      
      <!-- 新闻列表 -->
      <div class="news-list">
        <div v-if="filteredNews.length === 0" class="no-news">
          <p>没有找到符合条件的新闻</p>
        </div>
        
        <div 
          v-else
          v-for="news in filteredNews" 
          :key="news.id"
          class="news-card"
          :class="{ 'important': news.important }"
        >
          <div class="news-image">
            <img :src="news.image" :alt="news.title" />
            <div class="news-category">{{ news.category }}</div>
          </div>
          
          <div class="news-content">
            <h3 class="news-title">{{ news.title }}</h3>
            <p class="news-summary">{{ news.summary }}</p>
            
            <div class="news-meta">
              <span class="news-source">{{ news.source }}</span>
              <span class="news-time">{{ getRelativeTime(news.date, news.time) }}</span>
            </div>
          </div>
          
          <div class="news-actions">
            <button class="btn btn-outline btn-sm">阅读全文</button>
            <button class="btn-icon-only">
              <span>⭐</span>
            </button>
            <button class="btn-icon-only">
              <span>🔗</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination">
        <button class="btn btn-outline btn-sm">上一页</button>
        <div class="page-numbers">
          <button class="page-number active">1</button>
          <button class="page-number">2</button>
          <button class="page-number">3</button>
          <span>...</span>
          <button class="page-number">10</button>
        </div>
        <button class="btn btn-outline btn-sm">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  margin: var(--spacing-lg) 0;
  text-align: center;
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 700px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.news-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

/* 搜索和筛选 */
.news-filters {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) calc(var(--spacing-md) * 2 + 1em);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  width: 100%;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.category-tabs {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.category-tab {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.category-tab:hover {
  background-color: var(--bg-tertiary);
}

.category-tab.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* 新闻列表 */
.news-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.no-news {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
}

.news-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.news-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.news-card.important {
  border-left: 4px solid var(--accent-color);
}

.news-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.news-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.news-card:hover .news-image img {
  transform: scale(1.05);
}

.news-category {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}

.news-content {
  padding: var(--spacing-md);
  flex: 1;
}

.news-title {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
  line-height: 1.4;
}

.news-summary {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  margin: 0 0 var(--spacing-md) 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.news-actions {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-icon-only {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-md);
}

.btn-icon-only:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.page-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.page-number:hover {
  background-color: var(--bg-tertiary);
}

.page-number.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .news-list {
    grid-template-columns: 1fr;
  }
  
  .category-tabs {
    justify-content: center;
  }
  
  .pagination {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>
