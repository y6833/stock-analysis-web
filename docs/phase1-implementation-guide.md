# 量化交易系统第一阶段实施指南

## 📋 概述

本指南详细说明了量化交易系统第一阶段"数据获取模块增强"的实施步骤和使用方法。

## 🎯 第一阶段目标

- ✅ 构建稳定、高效的数据获取和存储系统
- ✅ 实现多数据源管理和故障切换
- ✅ 集成ClickHouse时序数据库
- ✅ 建立实时数据推送服务
- ✅ 优化数据同步和缓存机制

## 🚀 快速开始

### 1. 系统要求

**必需组件：**
- Node.js 16+
- npm 或 yarn
- MySQL 5.7+
- Redis 6.0+

**可选组件：**
- ClickHouse 22.0+（用于时序数据存储）
- Python 3.8+（用于数据处理脚本）

### 2. 一键安装

```bash
# 克隆项目（如果还没有）
git clone <your-repo-url>
cd stock-analysis-web

# 运行安装脚本
./scripts/setup-quantitative-system.sh
```

安装脚本将自动：
- 检查系统要求
- 安装前后端依赖
- 配置数据库和缓存
- 设置ClickHouse（如果可用）
- 创建配置文件

### 3. 启动服务

```bash
# 启动所有服务
./scripts/start-services.sh

# 或者分别启动
./scripts/start-services.sh backend   # 只启动后端
./scripts/start-services.sh frontend # 只启动前端
```

### 4. 验证安装

```bash
# 运行系统测试
./scripts/test-system.sh
```

## 📁 新增文件结构

```
stock-analysis-web/
├── src/services/dataSource/
│   ├── DataSourceManager.ts          # 数据源管理器
│   ├── JoinQuantDataSource.ts        # 聚宽数据源
│   └── DataSourceInterface.ts        # 数据源接口
├── src/services/
│   └── realtimeDataService.ts        # 实时数据服务
├── server/app/service/
│   └── clickhouse.js                 # ClickHouse服务
├── server/app/io/controller/
│   └── realtime.js                   # WebSocket控制器
├── server/app/schedule/
│   └── data_sync_enhanced.js         # 增强数据同步任务
├── scripts/
│   ├── setup-quantitative-system.sh  # 安装脚本
│   ├── start-services.sh             # 启动脚本
│   ├── stop-services.sh              # 停止脚本
│   └── test-system.sh                # 测试脚本
└── docs/
    ├── quantitative-trading-plan.md  # 详细实施方案
    └── phase1-implementation-guide.md # 本文件
```

## 🔧 配置说明

### 环境变量配置

创建 `.env` 文件：

```env
# 数据源配置
TUSHARE_TOKEN=your_tushare_token
JOINQUANT_TOKEN=your_joinquant_token

# 数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=stock_analysis

# Redis配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=123456

# ClickHouse配置
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=stock_data
```

### 数据源配置

在 `server/config/config.default.js` 中配置数据源优先级：

```javascript
config.dataSources = {
  tushare: {
    enabled: true,
    priority: 1,        // 最高优先级
    timeout: 10000,
    maxRetries: 3,
  },
  akshare: {
    enabled: true,
    priority: 2,
    timeout: 15000,
    maxRetries: 3,
  },
  // ... 其他数据源
}
```

## 🌟 新功能介绍

### 1. 数据源管理器

**特性：**
- 多数据源统一管理
- 自动故障切换
- 健康状态监控
- 负载均衡

**使用示例：**

```typescript
import { dataSourceManager } from '@/services/dataSource/DataSourceManager'

// 获取股票数据，自动选择最佳数据源
const stockData = await dataSourceManager.getStockData('000001')

// 指定首选数据源
const quote = await dataSourceManager.getStockQuote('000001', 'tushare')

// 查看数据源健康状态
const healthStatus = dataSourceManager.getHealthStatus()
```

### 2. ClickHouse时序数据库

**特性：**
- 高性能时序数据存储
- 自动分区和索引
- 批量数据插入
- 复杂查询支持

**使用示例：**

```javascript
// 批量插入日线数据
await ctx.service.clickhouse.insertDailyData(dailyDataList)

// 查询历史数据
const historicalData = await ctx.service.clickhouse.queryDailyData(
  '000001', 
  '2023-01-01', 
  '2023-12-31'
)
```

### 3. 实时数据推送

**特性：**
- WebSocket实时通信
- 多种数据类型订阅
- 自动重连机制
- 心跳检测

**使用示例：**

```typescript
import { realtimeDataService } from '@/services/realtimeDataService'

// 连接WebSocket
await realtimeDataService.connect()

// 订阅股票行情
realtimeDataService.subscribeQuote('000001')

// 监听数据更新
realtimeDataService.onQuoteUpdate('000001', (quote) => {
  console.log('实时行情:', quote)
})
```

### 4. 增强数据同步

**特性：**
- 智能批处理
- 错误重试机制
- 多数据源并行同步
- 缓存优化

**配置示例：**

```javascript
config.dataSync = {
  enabled: true,
  batchSize: 20,           // 批处理大小
  batchDelay: 1000,        // 批次间延迟
  maxConcurrency: 5,       // 最大并发数
  retryAttempts: 3,        // 重试次数
}
```

## 📊 监控和管理

### 服务状态监控

```bash
# 查看服务状态
./scripts/stop-services.sh --status

# 查看日志
tail -f logs/backend.log
tail -f logs/frontend.log
tail -f logs/data_sync.log
```

### 数据源健康检查

访问管理后台查看数据源状态：
- 前端：http://localhost:5173/admin/data-sources
- API：http://localhost:7001/api/data-sources/status

### 缓存管理

```bash
# 查看Redis缓存状态
redis-cli -h 127.0.0.1 -p 6379 -a 123456 info memory

# 清理缓存
redis-cli -h 127.0.0.1 -p 6379 -a 123456 flushdb
```

## 🔍 故障排除

### 常见问题

**1. 数据源连接失败**
```bash
# 检查网络连接
curl -I https://api.tushare.pro

# 检查API token
echo $TUSHARE_TOKEN
```

**2. ClickHouse连接失败**
```bash
# 检查ClickHouse服务
curl http://localhost:8123/

# 查看ClickHouse日志
sudo journalctl -u clickhouse-server
```

**3. WebSocket连接问题**
```bash
# 测试WebSocket连接
wscat -c ws://localhost:7001/realtime
```

**4. 数据同步异常**
```bash
# 查看同步日志
tail -f logs/data_sync.log

# 手动触发同步
curl -X POST http://localhost:7001/api/sync/trigger
```

### 性能优化

**1. 数据库优化**
```sql
-- 添加索引
CREATE INDEX idx_symbol_date ON stock_daily_data(symbol, date);

-- 优化查询
EXPLAIN SELECT * FROM stock_daily_data WHERE symbol = '000001';
```

**2. Redis优化**
```bash
# 设置内存策略
redis-cli config set maxmemory-policy allkeys-lru
```

**3. ClickHouse优化**
```sql
-- 优化表
OPTIMIZE TABLE stock_data.daily_data FINAL;
```

## 📈 下一步计划

第一阶段完成后，可以继续实施：

1. **第二阶段：特征工程模块**（3-4周）
   - 技术指标因子库
   - 基本面因子库
   - 另类因子库

2. **第三阶段：策略模块升级**（4-5周）
   - 机器学习策略
   - 策略组合管理
   - 参数优化

3. **第四阶段：回测模块专业化**（3-4周）
   - 事件驱动回测引擎
   - 交易成本建模
   - 风险模型集成

## 📞 技术支持

如遇到问题，请：

1. 查看日志文件：`logs/` 目录
2. 运行测试脚本：`./scripts/test-system.sh`
3. 查看系统状态：`./scripts/stop-services.sh --status`
4. 提交Issue到项目仓库

## 📝 更新日志

### v1.1.0 (第一阶段)
- ✅ 新增数据源管理器
- ✅ 集成ClickHouse时序数据库
- ✅ 实现实时数据推送
- ✅ 优化数据同步机制
- ✅ 添加自动化部署脚本

---

**祝您使用愉快！** 🚀
