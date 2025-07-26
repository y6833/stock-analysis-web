# Tushare Pro API 生产环境使用指南

## 概述

本文档提供了在生产环境中使用 Tushare Pro API 的完整指南，包括 API 限制、最佳实践、性能优化建议、安全考虑和监控策略。

## API 限制和配额

### 基础限制

#### 请求频率限制
- **基础用户**: 每分钟 200 次请求
- **VIP 用户**: 根据积分等级提升限制
- **单次请求**: 最多返回 6000 条记录
- **并发限制**: 建议不超过 5 个并发请求

#### 每日请求限制
- **基础用户**: 每日 500 次请求
- **2000积分**: 每日 2000 次请求
- **5000积分**: 每日 5000 次请求
- **更高积分**: 更高的每日限制

#### 数据访问权限
- **基础数据**: 需要 2000 积分
- **VIP 接口**: 需要 5000 积分
- **实时数据**: 需要更高积分等级

### 积分获取方式
1. **注册奖励**: 新用户获得基础积分
2. **邀请奖励**: 邀请新用户注册
3. **充值购买**: 直接购买积分
4. **社区贡献**: 参与社区建设

## 最佳实践

### 1. 请求优化

#### 批量请求策略
```typescript
// ✅ 推荐：使用日期范围批量获取
const data = await getStockHistory('000001.SZ', '20240101', '20241231')

// ❌ 避免：逐日请求
for (const date of dates) {
  await getStockHistory('000001.SZ', date, date) // 效率低下
}
```

#### 字段选择优化
```typescript
// ✅ 推荐：只请求需要的字段
const result = await tushareRequest('stock_basic', {}, 
  'ts_code,symbol,name,industry,list_date')

// ❌ 避免：请求所有字段
const result = await tushareRequest('stock_basic', {})
```

#### 分页处理
```typescript
// ✅ 推荐：合理分页
async function getAllStocks() {
  const allStocks = []
  let offset = 0
  const limit = 5000 // 接近单次请求上限
  
  while (true) {
    const stocks = await tushareRequest('stock_basic', { 
      offset, 
      limit 
    })
    
    if (stocks.items.length === 0) break
    
    allStocks.push(...stocks.items)
    offset += limit
    
    // 避免频率限制
    await sleep(300) // 300ms 间隔
  }
  
  return allStocks
}
```

### 2. 缓存策略

#### 数据缓存分级
```typescript
// 基础数据缓存（长期有效）
const CACHE_DURATION = {
  STOCK_LIST: 24 * 60 * 60 * 1000, // 24小时
  TRADE_CALENDAR: 7 * 24 * 60 * 60 * 1000, // 7天
  FINANCIAL_DATA: 3 * 30 * 24 * 60 * 60 * 1000, // 3个月
  DAILY_DATA: 60 * 60 * 1000, // 1小时
  REALTIME_DATA: 5 * 60 * 1000 // 5分钟
}

// 缓存实现示例
class TushareCache {
  private cache = new Map()
  
  async get(key: string, fetcher: () => Promise<any>, duration: number) {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data
    }
    
    const data = await fetcher()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }
}
```

#### Redis 缓存集成
```typescript
// 生产环境推荐使用 Redis
import Redis from 'ioredis'

class RedisTushareCache {
  private redis = new Redis(process.env.REDIS_URL)
  
  async get(key: string, fetcher: () => Promise<any>, ttl: number) {
    const cached = await this.redis.get(key)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    const data = await fetcher()
    await this.redis.setex(key, ttl, JSON.stringify(data))
    return data
  }
}
```

### 3. 错误处理和重试

#### 智能重试策略
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [40203, 40101, 500, 502, 503, 504]
}

async function robustTushareRequest(apiName: string, params: any) {
  return await retryManager.executeWithRetry(async () => {
    // 检查速率限制
    await tushareRateLimiter.waitForNextRequest(apiName)
    
    // 执行请求
    const result = await tushareRequest(apiName, params)
    
    // 记录成功请求
    tushareRateLimiter.recordRequest(apiName)
    
    return result
  }, `${apiName} 请求`)
}
```

#### 熔断器模式
```typescript
import { CircuitBreaker } from './enhancedErrorHandler'

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000
})

async function protectedTushareRequest(apiName: string, params: any) {
  return await circuitBreaker.execute(async () => {
    return await tushareRequest(apiName, params)
  })
}
```

### 4. 监控和告警

#### 关键指标监控
```typescript
const MONITORING_METRICS = {
  // 请求指标
  requestCount: 'tushare.requests.total',
  errorCount: 'tushare.errors.total',
  errorRate: 'tushare.errors.rate',
  
  // 性能指标
  responseTime: 'tushare.response_time',
  queueLength: 'tushare.queue.length',
  
  // 业务指标
  dailyQuotaUsage: 'tushare.quota.daily_usage',
  rateLimitHits: 'tushare.rate_limit.hits'
}

// 监控实现
class TushareMonitoring {
  recordMetric(metric: string, value: number, tags?: Record<string, string>) {
    // 发送到监控系统 (如 Prometheus, DataDog 等)
    console.log(`[METRIC] ${metric}: ${value}`, tags)
  }
  
  recordRequest(apiName: string, duration: number, success: boolean) {
    this.recordMetric(MONITORING_METRICS.requestCount, 1, { api: apiName })
    this.recordMetric(MONITORING_METRICS.responseTime, duration, { api: apiName })
    
    if (!success) {
      this.recordMetric(MONITORING_METRICS.errorCount, 1, { api: apiName })
    }
  }
}
```

#### 告警规则
```yaml
# 示例告警配置 (Prometheus AlertManager)
groups:
  - name: tushare_alerts
    rules:
      - alert: TushareHighErrorRate
        expr: rate(tushare_errors_total[5m]) / rate(tushare_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Tushare API 错误率过高"
          
      - alert: TushareQuotaExhausted
        expr: tushare_quota_daily_usage > 0.9
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Tushare API 每日配额即将耗尽"
```

## 性能优化

### 1. 连接池管理
```typescript
// HTTP 连接池配置
const httpAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000
})

// 使用连接池
const tushareClient = axios.create({
  baseURL: 'http://api.tushare.pro',
  httpsAgent: httpAgent,
  timeout: 30000
})
```

### 2. 请求队列管理
```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private concurrency = 3
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.process()
    })
  }
  
  private async process() {
    if (this.processing) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency)
      await Promise.all(batch.map(request => request()))
      
      // 避免频率限制
      if (this.queue.length > 0) {
        await this.sleep(1000 / this.concurrency)
      }
    }
    
    this.processing = false
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 3. 数据压缩和传输优化
```typescript
// 启用 gzip 压缩
const tushareClient = axios.create({
  baseURL: 'http://api.tushare.pro',
  headers: {
    'Accept-Encoding': 'gzip, deflate'
  },
  decompress: true
})

// 数据流式处理
async function streamLargeDataset(apiName: string, params: any) {
  const stream = new PassThrough({ objectMode: true })
  
  // 分批获取数据
  let offset = 0
  const batchSize = 5000
  
  const processNextBatch = async () => {
    try {
      const batch = await tushareRequest(apiName, {
        ...params,
        offset,
        limit: batchSize
      })
      
      if (batch.items.length === 0) {
        stream.end()
        return
      }
      
      batch.items.forEach(item => stream.write(item))
      offset += batchSize
      
      // 控制请求频率
      setTimeout(processNextBatch, 300)
    } catch (error) {
      stream.destroy(error)
    }
  }
  
  processNextBatch()
  return stream
}
```

## 安全考虑

### 1. Token 安全管理
```typescript
// ✅ 推荐：使用环境变量
const TUSHARE_TOKEN = process.env.TUSHARE_API_TOKEN

// ✅ 推荐：Token 轮换
class TokenManager {
  private tokens: string[] = []
  private currentIndex = 0
  
  constructor(tokens: string[]) {
    this.tokens = tokens
  }
  
  getCurrentToken(): string {
    return this.tokens[this.currentIndex]
  }
  
  rotateToken(): void {
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length
  }
}

// ❌ 避免：硬编码 Token
const TUSHARE_TOKEN = 'your_token_here' // 不安全
```

### 2. 请求日志和审计
```typescript
class TushareAuditLogger {
  logRequest(apiName: string, params: any, userId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      apiName,
      params: this.sanitizeParams(params),
      userId,
      ip: this.getClientIP()
    }
    
    // 记录到审计日志
    console.log('[AUDIT]', JSON.stringify(logEntry))
  }
  
  private sanitizeParams(params: any): any {
    // 移除敏感信息
    const sanitized = { ...params }
    delete sanitized.token
    return sanitized
  }
}
```

### 3. 数据脱敏
```typescript
function sanitizeFinancialData(data: any): any {
  // 对敏感财务数据进行脱敏处理
  return {
    ...data,
    // 保留趋势，隐藏具体数值
    revenue: data.revenue ? Math.round(data.revenue / 1000000) * 1000000 : null
  }
}
```

## 部署和运维

### 1. 环境配置
```bash
# 生产环境变量
TUSHARE_API_TOKEN=your_production_token
TUSHARE_BASE_URL=http://api.tushare.pro
TUSHARE_RATE_LIMIT=200
TUSHARE_DAILY_LIMIT=5000
TUSHARE_TIMEOUT=30000
TUSHARE_RETRY_COUNT=3

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_TTL_DEFAULT=3600

# 监控配置
MONITORING_ENABLED=true
ALERT_WEBHOOK_URL=https://your-alert-webhook.com
```

### 2. 健康检查
```typescript
// 健康检查端点
app.get('/health/tushare', async (req, res) => {
  try {
    // 检查 API 连接
    const result = await tushareRequest('trade_cal', { limit: 1 })
    
    // 检查配额使用情况
    const quotaUsage = getRemainingRequests()
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      api_connection: 'ok',
      daily_quota_remaining: quotaUsage.dailyRemaining,
      minute_quota_remaining: quotaUsage.minuteRemaining
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})
```

### 3. 容器化部署
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/tushare || exit 1

# 启动应用
CMD ["npm", "start"]
```

### 4. 监控和日志
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - TUSHARE_API_TOKEN=${TUSHARE_API_TOKEN}
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  redis_data:
```

## 故障排除

### 常见问题和解决方案

#### 1. 频率限制问题
```
错误: 40203 - 频率限制超限
解决方案:
- 检查请求间隔设置
- 实现智能退避算法
- 考虑升级积分等级
```

#### 2. 权限不足问题
```
错误: 40001 - 权限不足
解决方案:
- 验证 Token 有效性
- 检查积分余额
- 确认接口权限要求
```

#### 3. 数据质量问题
```
问题: 返回数据不完整或异常
解决方案:
- 实现数据验证逻辑
- 添加数据质量检查
- 使用多数据源验证
```

### 应急预案

#### 1. API 服务中断
- 启用熔断器保护
- 切换到缓存数据
- 通知相关人员
- 记录影响范围

#### 2. 配额耗尽
- 暂停非关键请求
- 启用数据缓存
- 联系 Tushare 支持
- 考虑紧急升级

#### 3. 数据异常
- 停止数据写入
- 启用数据验证
- 回滚到最后已知良好状态
- 分析异常原因

## 总结

在生产环境中使用 Tushare Pro API 需要综合考虑性能、可靠性、安全性和成本等多个方面。通过遵循本文档的最佳实践，可以构建一个稳定、高效的金融数据服务系统。

### 关键要点
1. **合理规划请求策略**，避免超出 API 限制
2. **实施多层缓存机制**，提高响应速度
3. **建立完善的监控体系**，及时发现和解决问题
4. **制定应急预案**，确保服务连续性
5. **持续优化性能**，降低运营成本

### 持续改进
- 定期评估 API 使用效率
- 监控成本和性能指标
- 收集用户反馈
- 跟进 Tushare Pro 新功能和变更
