# Tushare Pro API 完整集成文档

## 概述

本文档提供了 Tushare Pro API 的完整集成指南，包括所有相关 API 端点的详细信息、配置、使用方法、测试验证和生产环境最佳实践。Tushare Pro 是中国领先的金融数据服务平台，为量化投资者提供高质量的股票、基金、期货、债券等金融数据。

## API 基础信息

### 服务端点

- **基础 URL**: `http://api.tushare.pro`
- **协议**: HTTP POST
- **数据格式**: JSON
- **编码**: UTF-8

### 认证方式

- **认证类型**: Token 认证
- **Token 获取**: 在 [Tushare Pro 官网](https://tushare.pro) 注册并获取 API Token
- **Token 使用**: 在请求体中包含 `token` 字段

### 通用请求格式

```json
{
  "api_name": "接口名称",
  "token": "your_token_here",
  "params": {
    "参数名": "参数值"
  },
  "fields": "字段列表,逗号分隔"
}
```

### 通用响应格式

```json
{
  "request_id": "请求ID",
  "code": 0,
  "msg": "success",
  "data": {
    "fields": ["字段1", "字段2", "字段3"],
    "items": [
      ["值1", "值2", "值3"],
      ["值4", "值5", "值6"]
    ]
  }
}
```

## 功能特性

### ✅ 已完成的功能

1. **配置管理**

   - 环境变量配置支持
   - Token 验证和管理
   - 配置验证和错误处理

2. **速率限制和重试机制**

   - 智能速率限制器
   - 指数退避重试策略
   - 请求统计和监控

3. **核心 API 端点**

   - 股票基础信息 (`stock_basic`)
   - 日线行情 (`daily`)
   - 每日指标 (`daily_basic`)
   - 复权行情 (`pro_bar`)
   - 财务数据 (`income`, `balancesheet`, `cashflow`, `fina_indicator`)
   - 指数数据 (`index_basic`, `index_daily`)
   - 交易日历 (`trade_cal`)

4. **数据处理**

   - TypeScript 类型定义
   - 数据验证和转换
   - 数据质量评估
   - 缓存机制

5. **简化接口**
   - `getAllStocks()` - 获取所有股票列表
   - `getStockHistory()` - 获取股票历史数据
   - `getStockInfo()` - 获取股票基础信息
   - `getStockFinancials()` - 获取财务数据
   - `searchStocks()` - 搜索股票
   - `getBatchStockData()` - 批量获取数据

## 配置说明

### 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# Tushare API 配置
TUSHARE_API_TOKEN=your_tushare_token_here
TUSHARE_BASE_URL=http://api.tushare.pro
TUSHARE_PROXY_URL=/api/tushare
TUSHARE_RATE_LIMIT=200
TUSHARE_DAILY_LIMIT=500
TUSHARE_RETRY_COUNT=3
TUSHARE_TIMEOUT=15000
TUSHARE_DEBUG=false
```

### 配置参数说明

- `TUSHARE_API_TOKEN`: Tushare API Token（必需）
- `TUSHARE_BASE_URL`: Tushare API 基础 URL
- `TUSHARE_PROXY_URL`: 本地代理 URL（避免 CORS 问题）
- `TUSHARE_RATE_LIMIT`: 每分钟请求限制
- `TUSHARE_DAILY_LIMIT`: 每日请求限制
- `TUSHARE_RETRY_COUNT`: 重试次数
- `TUSHARE_TIMEOUT`: 请求超时时间（毫秒）
- `TUSHARE_DEBUG`: 调试模式开关

## 使用方法

### 基础用法

```typescript
import {
  getAllStocks,
  getStockHistory,
  getStockInfo,
  searchStocks,
} from '@/services/tushareService'

// 获取所有股票列表
const stocks = await getAllStocks({ limit: 100 })

// 获取股票历史数据
const stockData = await getStockHistory('000001.SZ', '20240101', '20240131')

// 获取股票基础信息
const stockInfo = await getStockInfo('000001.SZ')

// 搜索股票
const searchResults = await searchStocks('平安')
```

### 高级用法

```typescript
import { getStockFinancials, getBatchStockData, getIndustryStocks } from '@/services/tushareService'

// 获取财务数据
const financials = await getStockFinancials('000001.SZ', '20231231')

// 批量获取股票数据
const batchData = await getBatchStockData(['000001.SZ', '000002.SZ'])

// 获取行业股票
const industryStocks = await getIndustryStocks('银行')
```

### 配置管理

```typescript
import {
  checkTushareConfig,
  getTushareConfigInfo,
  validateTushareTokenAsync,
} from '@/services/tushareService'

// 检查配置
const configCheck = checkTushareConfig()
if (!configCheck.valid) {
  console.error('配置错误:', configCheck.errors)
}

// 获取配置信息
const configInfo = getTushareConfigInfo()

// 验证 Token
const validation = await validateTushareTokenAsync()
```

### 速率限制管理

```typescript
import {
  getRateLimitStats,
  getRemainingRequests,
  resetRateLimitStats,
} from '@/services/tushareService'

// 获取速率限制统计
const stats = getRateLimitStats()

// 获取剩余请求数
const remaining = getRemainingRequests()

// 重置统计
resetRateLimitStats()
```

## 测试和验证

### 快速测试

```typescript
import { quickTest } from '@/utils/tushareTestSuite'

// 运行快速测试
const success = await quickTest()
console.log('测试结果:', success ? '通过' : '失败')
```

### 完整测试套件

```typescript
import { tushareTestSuite } from '@/utils/tushareTestSuite'

// 运行完整测试
const result = await tushareTestSuite.runAllTests()
console.log(`测试完成: ${result.passedTests}/${result.totalTests} 通过`)
```

### 测试页面

在开发模式下，可以访问测试页面：

```
http://localhost:3000/dev/tushare-integration-test
```

测试页面提供以下功能：

- 配置状态检查
- 速率限制监控
- 快速测试和完整测试
- 测试结果展示
- 实时日志输出

## 错误处理

### 常见错误类型

1. **配置错误**

   - Token 未配置或无效
   - 配置参数格式错误

2. **API 错误**

   - 频率限制超限 (40203)
   - 每日限制超限 (40101)
   - 权限不足 (40001)
   - 参数错误 (40301)

3. **网络错误**
   - 连接超时
   - 网络中断
   - 服务器错误

### 错误处理策略

```typescript
try {
  const data = await getStockHistory('000001.SZ')
} catch (error) {
  if (error.code === 40203) {
    // 频率限制，自动重试
    console.log('频率限制，请稍后重试')
  } else if (error.code === 40001) {
    // 权限不足
    console.log('权限不足，请检查 Token')
  } else {
    // 其他错误
    console.error('请求失败:', error.message)
  }
}
```

## 性能优化

### 缓存策略

- 股票列表：24 小时缓存
- 股票行情：5 分钟缓存
- 财经新闻：30 分钟缓存

### 批量请求

```typescript
// 推荐：使用批量接口
const batchData = await getBatchStockData(symbols)

// 避免：循环单个请求
// for (const symbol of symbols) {
//   const data = await getStockHistory(symbol) // 不推荐
// }
```

### 速率限制优化

- 合理设置请求间隔
- 使用缓存减少重复请求
- 批量处理减少请求次数

## 故障排除

### 常见问题

1. **Token 验证失败**

   - 检查 Token 是否正确
   - 确认 Token 是否过期
   - 验证网络连接

2. **频率限制**

   - 检查请求频率设置
   - 确认是否超出限制
   - 等待限制重置

3. **数据获取失败**
   - 检查股票代码格式
   - 确认日期范围有效
   - 验证 API 权限

### 调试方法

1. **启用调试模式**

   ```env
   TUSHARE_DEBUG=true
   ```

2. **查看请求日志**

   ```typescript
   // 在浏览器控制台查看详细日志
   ```

3. **使用测试页面**
   - 访问 `/dev/tushare-integration-test`
   - 运行诊断测试
   - 查看详细错误信息

## 最佳实践

1. **配置管理**

   - 使用环境变量管理敏感信息
   - 定期验证配置有效性
   - 监控 Token 使用情况

2. **错误处理**

   - 实现完善的错误处理机制
   - 提供用户友好的错误信息
   - 记录详细的错误日志

3. **性能优化**

   - 合理使用缓存
   - 避免不必要的重复请求
   - 实施智能重试策略

4. **监控和维护**
   - 监控 API 使用情况
   - 定期检查数据质量
   - 及时更新 API 接口

## 更新日志

### v1.0.0 (2024-01-XX)

- ✅ 完成基础 Tushare API 集成
- ✅ 实现配置管理和认证
- ✅ 添加速率限制和重试机制
- ✅ 完善数据模型和类型定义
- ✅ 实施核心 API 端点
- ✅ 创建测试套件和验证工具

## 支持和反馈

如有问题或建议，请通过以下方式联系：

- 项目 Issues
- 开发团队邮箱
- 技术支持群组
