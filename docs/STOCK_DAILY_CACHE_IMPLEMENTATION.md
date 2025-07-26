# 股票日线数据缓存系统实现文档

## 概述

本文档描述了股票日线数据缓存系统的实现，该系统旨在减少对Tushare API的调用频率，提高数据获取效率，并为用户提供更快的响应速度。

## 系统架构

### 1. 数据库表结构

创建了 `stock_daily_data` 表来存储股票日线数据：

```sql
CREATE TABLE stock_daily_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ts_code VARCHAR(20) NOT NULL,           -- 股票代码
  trade_date VARCHAR(8) NOT NULL,         -- 交易日期(YYYYMMDD)
  open DECIMAL(10,3),                     -- 开盘价
  high DECIMAL(10,3),                     -- 最高价
  low DECIMAL(10,3),                      -- 最低价
  close DECIMAL(10,3),                    -- 收盘价
  pre_close DECIMAL(10,3),                -- 昨收价
  change_val DECIMAL(10,3),               -- 涨跌额
  pct_chg DECIMAL(10,3),                  -- 涨跌幅(%)
  vol DECIMAL(20,2),                      -- 成交量(手)
  amount DECIMAL(20,3),                   -- 成交额(千元)
  -- ... 其他字段
  cache_priority INT NOT NULL DEFAULT 1,  -- 缓存优先级
  data_source VARCHAR(50) DEFAULT 'tushare',
  is_active BOOLEAN DEFAULT TRUE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_stock_daily_data_code_date (ts_code, trade_date)
);
```

### 2. 核心组件

#### 2.1 数据模型 (`server/app/model/stock_daily_data.js`)
- 定义了Sequelize模型
- 包含完整的股票日线数据字段
- 支持缓存优先级管理
- 与股票基础信息表关联

#### 2.2 缓存服务 (`server/app/service/stockDailyCache.js`)
- **主要功能**：
  - `getDailyData()`: 获取股票日线数据（优先从缓存读取）
  - `getCachedData()`: 从缓存表查询数据
  - `fetchFromAPI()`: 从Tushare API获取数据
  - `updateCache()`: 更新缓存数据
  - `isCacheComplete()`: 检查缓存完整性

- **工作流程**：
  1. 首先查询本地缓存表
  2. 检查缓存数据是否完整
  3. 如果缓存不完整，调用Tushare API
  4. 将API数据更新到缓存表
  5. 返回数据给调用方

#### 2.3 定时任务 (`server/app/schedule/updateStockCache.js`)
- **执行时间**: 每个工作日18:30（股市收盘后）
- **更新策略**：
  - 获取用户关注列表中的股票（优先级1）
  - 获取用户搜索历史中的股票（优先级2）
  - 获取系统推荐的热门股票（优先级3）
  - 分批处理，避免API限流
  - 自动清理90天前的过期数据

#### 2.4 API接口优化 (`server/app/controller/stock.js`)
- 修改了 `getHistory()` 方法
- 使用新的缓存服务 `getStockHistoryData()`
- 支持缓存优先级参数
- 返回数据来源信息

## 缓存优先级策略

系统根据股票的重要性分配不同的缓存优先级：

1. **优先级1**: 用户关注列表中的股票
2. **优先级2**: 用户搜索历史中的股票
3. **优先级3**: 系统推荐的热门股票
4. **优先级4**: 其他股票

## API使用方式

### 获取股票历史数据

```http
GET /api/stocks/{stock_code}/history?start_date=20250720&end_date=20250726&cache_priority=1
```

**参数说明**：
- `stock_code`: 股票代码（如 000001.SZ）
- `start_date`: 开始日期（YYYYMMDD格式）
- `end_date`: 结束日期（YYYYMMDD格式）
- `cache_priority`: 缓存优先级（可选，默认为3）

**响应格式**：
```json
{
  "success": true,
  "data": [
    {
      "ts_code": "000001.SZ",
      "trade_date": "20250724",
      "open": 10.50,
      "high": 10.80,
      "low": 10.30,
      "close": 10.65,
      "pct_chg": 1.91,
      // ... 其他字段
    }
  ],
  "count": 1,
  "data_source": "cache_or_api",
  "data_source_message": "数据来自缓存或Tushare API"
}
```

## 性能优化

### 1. 数据库索引
- 主键索引：`id`
- 唯一索引：`(ts_code, trade_date)`
- 普通索引：`ts_code`, `trade_date`, `cache_priority`, `last_updated`, `is_active`

### 2. 缓存策略
- **缓存优先**: 优先从本地数据库读取
- **API回退**: 缓存不完整时才调用API
- **批量更新**: 定时任务批量更新数据
- **过期清理**: 自动清理90天前的数据

### 3. API限流保护
- 分批处理：每批10只股票
- 批次间延迟：2秒间隔
- 错误处理：单只股票失败不影响其他股票

## 测试验证

系统已通过测试验证：

1. **数据库操作测试**: 成功插入和查询缓存数据
2. **API接口测试**: 成功返回缓存数据
3. **缓存优先级测试**: 正确识别和使用缓存数据

测试结果显示：
- ✅ 缓存表创建成功
- ✅ 数据插入和查询正常
- ✅ API接口返回正确的缓存数据
- ✅ 数据来源标识正确

## 部署说明

### 1. 数据库迁移
```sql
-- 创建缓存表（已完成）
CREATE TABLE stock_daily_data (...);
```

### 2. 环境配置
确保 `.env` 文件中配置了正确的Tushare token：
```
TUSHARE_TOKEN=your_actual_token_here
```

### 3. 定时任务
定时任务会在应用启动后自动注册，无需额外配置。

## 监控和维护

### 1. 数据质量监控
- 监控缓存命中率
- 检查API调用频率
- 验证数据完整性

### 2. 性能监控
- 查询响应时间
- 数据库连接池状态
- 内存使用情况

### 3. 日常维护
- 定期检查定时任务执行状态
- 监控磁盘空间使用
- 清理异常数据

## 后续优化建议

1. **智能缓存**: 根据用户访问模式动态调整缓存策略
2. **数据压缩**: 对历史数据进行压缩存储
3. **分布式缓存**: 使用Redis作为二级缓存
4. **实时更新**: 支持实时数据推送和增量更新
5. **数据分析**: 添加缓存使用情况分析和报告

## 总结

股票日线数据缓存系统已成功实现并通过测试验证。该系统能够：

- ✅ 显著减少对Tushare API的调用频率
- ✅ 提高数据获取速度和用户体验
- ✅ 支持灵活的缓存优先级管理
- ✅ 提供完整的错误处理和回退机制
- ✅ 自动化的数据更新和维护

系统现在可以投入生产使用，为后续的图表显示问题修复和数据真实性验证提供了坚实的基础。
