# 新数据源集成文档

本文档介绍了新集成的三个数据源：Alpha Vantage、AllTick 和富途OpenAPI。

## 概述

### Alpha Vantage
- **官方网站**: https://www.alphavantage.co/
- **API 文档**: https://www.alphavantage.co/documentation/
- **API Key**: UZMT16NQOTELC1O7
- **特点**:
  - 官方API，支持全球市场
  - 包含A股和美股数据
  - 支持实时行情、历史数据和新闻
  - 免费版每天500次调用，每分钟5次

### AllTick
- **官方网站**: https://alltick.co/
- **API 文档**: https://apis.alltick.co/
- **API Key**: 85b75304f6ef5a52123479654ddab44e-c-app
- **特点**:
  - 全球金融市场实时数据提供商
  - 支持股票、外汇、加密货币等多种资产类型
  - 专业级数据质量
  - 支持高频数据访问

### 富途OpenAPI
- **官方网站**: https://www.futunn.com/OpenAPI
- **API 文档**: https://openapi.futunn.com/futu-api-doc/intro/intro.html
- **特点**:
  - 专业量化交易接口
  - 支持港股、美股、A股等多市场
  - 需要通过OpenD网关程序连接
  - 提供实时行情、历史数据和交易功能
  - 需要富途账号和相应权限

## 功能支持

| 功能 | Alpha Vantage | AllTick | 富途OpenAPI |
|------|---------------|---------|-------------|
| 实时行情 | ✅ | ✅ | ✅ |
| 历史数据 | ✅ | ✅ | ✅ |
| 股票搜索 | ✅ | ✅ | ✅ |
| 财经新闻 | ✅ | ❌ | ❌ |
| 全球市场 | ✅ | ✅ | ✅ |
| A股支持 | ✅ | ✅ | ✅ |
| 美股支持 | ✅ | ✅ | ✅ |
| 港股支持 | ✅ | ✅ | ✅ |
| 外汇支持 | ❌ | ✅ | ❌ |
| 加密货币 | ❌ | ✅ | ❌ |
| 交易功能 | ❌ | ❌ | ✅ |

## 使用方法

### 1. 在代码中使用

```typescript
import AlphaVantageDataSource from '@/services/dataSource/AlphaVantageDataSource'
import AlltickDataSource from '@/services/dataSource/AlltickDataSource'
import FutuDataSource from '@/services/dataSource/FutuDataSource'

// 使用 Alpha Vantage
const alphaVantage = new AlphaVantageDataSource()
const quote = await alphaVantage.getStockQuote('AAPL')
const history = await alphaVantage.getStockHistory('AAPL', 'day')

// 使用 AllTick
const allTick = new AlltickDataSource()
const quote2 = await allTick.getStockQuote('AAPL')
const history2 = await allTick.getStockHistory('AAPL', 'day')

// 使用 富途OpenAPI
const futu = new FutuDataSource()
const quote3 = await futu.getStockQuote('HK.00700') // 腾讯控股
const stocks = await futu.getStocks()
```

### 2. 通过数据源管理器使用

```typescript
import { dataSourceManager } from '@/services/dataSource/DataSourceManager'

// 切换到 Alpha Vantage
await dataSourceManager.switchDataSource('alphavantage')
const data = await dataSourceManager.getStockData('AAPL')

// 切换到 AllTick
await dataSourceManager.switchDataSource('alltick')
const data2 = await dataSourceManager.getStockData('AAPL')

// 切换到 富途OpenAPI
await dataSourceManager.switchDataSource('futu')
const data3 = await dataSourceManager.getStockData('HK.00700')
```

## API 接口说明

### Alpha Vantage 主要接口

1. **实时行情**: `GLOBAL_QUOTE`
2. **历史数据**: `TIME_SERIES_DAILY`, `TIME_SERIES_WEEKLY`, `TIME_SERIES_MONTHLY`
3. **搜索**: `SYMBOL_SEARCH`
4. **新闻**: `NEWS_SENTIMENT`

### AllTick 主要接口

1. **实时行情**: `/trade-tick`
2. **历史K线**: `/kline`
3. **盘口数据**: `/depth`
4. **基础信息**: `/basic-info`

## 股票代码格式

### Alpha Vantage
- 美股: `AAPL`, `MSFT`, `GOOGL`
- A股: `000001.SHZ`, `600000.SHG`
- 港股: `0700.HKG`, `0941.HKG`

### AllTick
- 美股: `AAPL.US`, `MSFT.US`, `GOOGL.US`
- A股: `000001.SZ`, `600000.SH`
- 港股: `00700.HK`, `00941.HK`

## 配置说明

### 环境变量配置

```bash
# Alpha Vantage
ALPHA_VANTAGE_API_KEY=UZMT16NQOTELC1O7
ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co/query

# AllTick
ALLTICK_API_KEY=85b75304f6ef5a52123479654ddab44e-c-app
ALLTICK_BASE_URL=https://quote.alltick.io
```

### 数据源优先级

在 `DataSourceManager` 中的优先级设置：

1. 智兔数服 (priority: 1)
2. Tushare (priority: 2)
3. Yahoo Finance (priority: 3)
4. 东方财富 (priority: 4)
5. AKShare (priority: 5)
6. Google Finance (priority: 6)
7. 新浪财经 (priority: 7)
8. 聚合数据 (priority: 8)
9. **Alpha Vantage (priority: 9)**
10. **AllTick (priority: 10)**

## 测试方法

### 1. 使用测试页面

访问 `/data-source-test` 页面，可以直接在浏览器中测试两个数据源的功能。

### 2. 使用测试脚本

```typescript
import { runNewDataSourceTests } from '@/tests/dataSource/newDataSourceTest'

// 运行所有测试
const results = await runNewDataSourceTests()
console.log('测试结果:', results)
```

### 3. 单独测试

```typescript
import { testAlphaVantageDataSource, testAlltickDataSource } from '@/tests/dataSource/newDataSourceTest'

// 测试 Alpha Vantage
const alphaResult = await testAlphaVantageDataSource()

// 测试 AllTick
const alltickResult = await testAlltickDataSource()
```

## 限制和注意事项

### Alpha Vantage
- 免费版每天限制500次调用
- 每分钟最多5次调用
- 部分功能需要付费版本
- 对中国A股的支持有限

### AllTick
- 免费版有调用频率限制
- 需要注意API调用间隔
- 某些高级功能需要付费
- 主要面向专业用户

## 错误处理

两个数据源都实现了完整的错误处理机制：

```typescript
try {
  const quote = await dataSource.getStockQuote('AAPL')
} catch (error) {
  console.error('获取行情失败:', error.message)
  // 自动切换到备用数据源
}
```

## 性能优化

1. **缓存机制**: 股票列表缓存24小时
2. **限流控制**: 自动控制请求频率
3. **错误重试**: 自动重试失败的请求
4. **连接池**: 复用HTTP连接

### 富途OpenAPI 主要接口

1. **实时行情**: `GetBasicQot` - 获取股票实时报价
2. **历史数据**: `GetKL` - 获取K线数据
3. **股票搜索**: `GetSecuritySnapshot` - 获取股票快照
4. **订阅功能**: `Sub` - 订阅实时数据推送

### 富途OpenAPI 使用要求

1. **OpenD程序**: 需要下载并运行OpenD网关程序
2. **富途账号**: 需要有效的富途账号
3. **行情权限**: 部分市场需要相应的行情权限
4. **网络连接**: OpenD需要连接到富途服务器

### 富途OpenAPI 配置说明

```javascript
// 服务器配置 (server/config/config.default.js)
futu: {
  enabled: true,
  priority: 7,
  timeout: 15000,
  maxRetries: 3,
  host: '127.0.0.1',
  port: 11111, // OpenD默认端口
}
```

## 未来计划

1. 添加更多市场支持（期货、期权等）
2. 实现WebSocket实时数据推送
3. 优化数据缓存策略
4. 添加更多技术指标计算
5. 支持更多数据格式导出

## 支持和反馈

如果在使用过程中遇到问题，请：

1. 检查API Key是否正确配置
2. 确认网络连接正常
3. 查看控制台错误信息
4. 使用测试页面验证功能
5. 联系开发团队获取支持
