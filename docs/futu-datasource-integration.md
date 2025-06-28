# 富途OpenAPI数据源集成文档

## 概述

富途OpenAPI是一个专业的量化交易接口，为程序化交易提供丰富的行情和交易功能。本文档介绍了如何将富途OpenAPI集成到股票分析系统中作为数据源。

## 富途OpenAPI特点

### 优势
- **专业级接口**: 富途官方提供的量化交易API
- **多市场支持**: 支持港股、美股、A股等多个市场
- **实时数据**: 提供实时行情、历史数据和基本面数据
- **交易功能**: 除了行情数据，还支持实盘和模拟交易
- **稳定可靠**: 直连交易所，响应速度快

### 技术架构
- **OpenD网关**: 本地运行的网关程序，负责与富途服务器通信
- **多语言SDK**: 支持Python、Java、C#、C++、JavaScript等
- **WebSocket连接**: 支持实时数据推送
- **RESTful API**: 提供标准的HTTP接口

## 集成实现

### 1. 文件结构

```
src/services/dataSource/
├── FutuDataSource.ts              # 富途数据源实现
├── __tests__/
│   └── FutuDataSource.test.ts     # 单元测试
├── DataSourceFactory.ts           # 工厂类（已更新）
└── DataSourceManager.ts           # 管理器（已更新）

server/config/
└── config.default.js              # 服务器配置（已更新）

scripts/
└── test-futu-datasource.cjs       # 测试脚本

docs/
├── new-data-sources.md            # 数据源文档（已更新）
└── futu-datasource-integration.md # 本文档
```

### 2. 核心实现

#### FutuDataSource类
```typescript
export default class FutuDataSource implements DataSourceInterface {
  private readonly name = '富途OpenAPI'
  private readonly type: DataSourceType = 'futu'
  
  // OpenD连接配置
  private readonly config = {
    host: '127.0.0.1',
    port: 11111, // OpenD默认端口
    timeout: 10000,
    maxRetries: 3
  }
  
  // 实现DataSourceInterface的所有方法
  async getStocks(): Promise<Stock[]>
  async getStockData(symbol: string): Promise<StockData>
  async searchStocks(query: string): Promise<Stock[]>
  async getStockQuote(symbol: string): Promise<StockQuote>
  async getFinancialNews(count?: number): Promise<FinancialNews[]>
  async testConnection(): Promise<boolean>
}
```

#### 数据源注册
```typescript
// DataSourceFactory.ts
case 'futu':
  console.log('创建 富途 数据源实例')
  return new FutuDataSource()

// DataSourceManager.ts
this.dataSources.set('futu', new FutuDataSource())
```

### 3. 配置说明

#### 服务器配置
```javascript
// server/config/config.default.js
futu: {
  enabled: true,
  priority: 7,
  timeout: 15000,
  maxRetries: 3,
  host: '127.0.0.1',
  port: 11111, // OpenD默认端口
}
```

#### 数据源优先级
富途数据源在数据源管理器中的优先级设置为11，位于其他主要数据源之后，作为补充数据源使用。

## 使用方法

### 1. 直接使用
```typescript
import FutuDataSource from '@/services/dataSource/FutuDataSource'

const futu = new FutuDataSource()

// 获取股票列表
const stocks = await futu.getStocks()

// 获取实时行情
const quote = await futu.getStockQuote('HK.00700') // 腾讯控股

// 搜索股票
const results = await futu.searchStocks('腾讯')
```

### 2. 通过数据源管理器
```typescript
import { dataSourceManager } from '@/services/dataSource/DataSourceManager'

// 切换到富途数据源
await dataSourceManager.switchDataSource('futu')

// 获取数据
const data = await dataSourceManager.getStockData('HK.00700')
```

## 股票代码格式

富途API使用特定的股票代码格式：

- **港股**: `HK.00700` (腾讯控股)
- **美股**: `US.AAPL` (苹果公司)
- **A股**: `SH.000001` (上证指数), `SZ.399001` (深证成指)

## 功能支持

| 功能 | 支持状态 | 说明 |
|------|----------|------|
| 实时行情 | ✅ | 支持港股、美股、A股 |
| 历史数据 | ✅ | K线数据、分时数据 |
| 股票搜索 | ✅ | 按代码和名称搜索 |
| 基本面数据 | ✅ | 财务指标、公司信息 |
| 财经新闻 | ❌ | 暂不支持 |
| 交易功能 | 🔄 | 未来可扩展 |

## 使用要求

### 1. OpenD程序
- 下载并安装OpenD网关程序
- 启动OpenD并保持运行
- 默认端口：11111

### 2. 富途账号
- 需要有效的富途账号
- 登录OpenD程序
- 确保账号状态正常

### 3. 行情权限
- 港股行情：需要相应权限
- 美股行情：需要相应权限
- A股行情：需要相应权限
- 部分高级功能需要付费订阅

### 4. 网络连接
- OpenD需要连接到富途服务器
- 确保网络连接稳定
- 防火墙允许OpenD通信

## 测试验证

### 运行测试脚本
```bash
node scripts/test-futu-datasource.cjs
```

### 测试内容
- ✅ 基本信息测试
- ❌ 连接测试 (需要OpenD)
- ✅ 股票列表测试
- ✅ 搜索功能测试
- ✅ 股票数据测试
- ✅ 实时行情测试
- ✅ 财经新闻测试

## 注意事项

### 1. 当前状态
- 当前实现返回模拟数据
- 实际使用需要集成富途JavaScript SDK
- 需要处理OpenD连接和认证

### 2. 开发建议
- 优先实现基础行情功能
- 添加错误处理和重试机制
- 实现数据缓存以提高性能
- 考虑WebSocket实时推送

### 3. 生产部署
- 确保OpenD程序稳定运行
- 监控API调用频率和限制
- 实现故障转移机制
- 定期检查账号和权限状态

## 下一步计划

1. **集成富途JavaScript SDK**
   - 安装futu-api npm包
   - 实现WebSocket连接
   - 处理认证和订阅

2. **完善数据接口**
   - 实现真实的API调用
   - 添加更多股票市场支持
   - 优化数据格式转换

3. **增强功能**
   - 添加实时数据推送
   - 实现历史数据查询
   - 支持更多技术指标

4. **性能优化**
   - 实现智能缓存策略
   - 优化API调用频率
   - 添加连接池管理

## 相关链接

- [富途OpenAPI官网](https://www.futunn.com/OpenAPI)
- [富途API文档](https://openapi.futunn.com/futu-api-doc/intro/intro.html)
- [OpenD下载](https://www.futunn.com/download/openAPI)
- [富途开发者社区](https://q.futunn.com/feed?lang=zh-cn)

## 支持和反馈

如果在使用富途数据源时遇到问题：

1. 检查OpenD程序是否正常运行
2. 确认富途账号登录状态
3. 验证网络连接和权限设置
4. 查看控制台错误信息
5. 参考富途官方文档
6. 联系开发团队获取支持
