# 监控与日志指南

本文档提供了股票分析网站项目的监控和日志系统的详细说明，包括配置、使用方法和最佳实践。

## 目录

1. [监控系统概述](#监控系统概述)
2. [性能监控](#性能监控)
3. [错误跟踪](#错误跟踪)
4. [日志系统](#日志系统)
5. [监控面板](#监控面板)
6. [配置选项](#配置选项)
7. [最佳实践](#最佳实践)

## 监控系统概述

监控系统由以下几个主要部分组成：

- **性能监控**：跟踪应用程序性能指标，如API响应时间、页面加载时间等
- **错误跟踪**：捕获和记录应用程序错误，包括前端和后端错误
- **日志系统**：提供结构化日志记录，支持不同级别的日志和日志轮转
- **系统指标**：收集服务器资源使用情况，如CPU负载、内存使用等
- **监控面板**：可视化展示监控数据的管理界面

## 性能监控

### 前端性能监控

前端性能监控通过`performance.ts`工具实现，主要功能包括：

- 测量函数执行时间
- 跟踪API请求响应时间
- 监控页面加载和导航性能
- 监控组件渲染性能

使用示例：

```typescript
import performance from '@/utils/performance';

// 测量函数执行时间
const result = await performance.measure('calculation.complex', async () => {
  // 执行复杂计算
  return complexCalculation();
});

// 手动计时
const timerId = performance.startTimer('custom.operation', { customTag: 'value' });
// 执行操作
performance.stopTimer(timerId);
```

### 后端性能监控

后端性能监控通过`performance.js`工具实现，主要功能包括：

- 测量函数执行时间
- 跟踪数据库查询性能
- 监控API端点响应时间
- 收集系统资源使用情况

使用示例：

```javascript
const performance = require('../utils/performance');

// 测量函数执行时间
const result = await performance.measure('db.query', async () => {
  // 执行数据库查询
  return await db.query('SELECT * FROM stocks');
});

// 使用性能中间件
app.use(performance.performanceMiddleware());
```

## 错误跟踪

### 前端错误跟踪

前端错误跟踪通过`ErrorTrackingService.ts`实现，主要功能包括：

- 捕获未处理的JavaScript异常
- 捕获未处理的Promise拒绝
- 捕获API请求错误
- 支持手动错误报告

使用示例：

```typescript
import errorTracking from '@/services/ErrorTrackingService';

try {
  // 可能抛出错误的代码
} catch (error) {
  errorTracking.trackError(
    error,
    errorTracking.ErrorSeverity.MEDIUM,
    {
      component: 'StockChart',
      action: 'loadData'
    }
  );
}
```

### 后端错误跟踪

后端错误跟踪通过`logger.js`实现，主要功能包括：

- 记录服务器错误
- 提供错误中间件捕获请求处理错误
- 将错误存储到数据库和日志文件

使用示例：

```javascript
const logger = require('../utils/logger');

try {
  // 可能抛出错误的代码
} catch (error) {
  logger.logError(error, 'StockService', { stockId: '12345' });
}

// 使用错误中间件
app.use(logger.errorLogger());
```

## 日志系统

### 前端日志

前端日志通过`logger.ts`实现，主要功能包括：

- 支持不同级别的日志（DEBUG, INFO, WARN, ERROR）
- 可选的远程日志记录
- 内存中日志缓存，用于调试

使用示例：

```typescript
import logger from '@/utils/logger';

logger.debug('初始化组件', 'StockChart');
logger.info('数据加载完成', 'StockChart', { count: 100 });
logger.warn('数据可能不完整', 'StockChart', { missingDays: 2 });
logger.error('加载数据失败', 'StockChart', { error: 'API超时' });
```

### 后端日志

后端日志通过`logger.js`实现，主要功能包括：

- 支持不同级别的日志
- 结构化JSON日志格式
- 日志文件轮转
- 请求日志中间件

使用示例：

```javascript
const logger = require('../utils/logger');

logger.debug('初始化服务', { service: 'StockService' });
logger.info('处理请求', { method: 'GET', path: '/api/stocks' });
logger.warn('API速率限制接近阈值', { rate: '95%' });
logger.error('数据库连接失败', { error: 'Connection refused' });

// 使用请求日志中间件
app.use(logger.requestLogger());
```

## 监控面板

监控面板提供了可视化的监控数据展示，主要功能包括：

- 性能指标图表
- 错误日志查看和过滤
- 系统日志查看和过滤
- 系统资源使用情况监控

访问路径：`/admin/monitoring`

## 配置选项

### 前端监控配置

前端监控配置通过环境变量设置：

```
# 是否启用性能监控
VITE_ENABLE_PERFORMANCE_MONITORING=true

# 性能数据采样率（0-1）
VITE_PERFORMANCE_SAMPLE_RATE=0.1

# 是否启用远程错误跟踪
VITE_ENABLE_ERROR_TRACKING=true

# 错误数据采样率（0-1）
VITE_ERROR_SAMPLE_RATE=1.0

# 远程错误跟踪URL
VITE_ERROR_TRACKING_URL=/api/v1/monitoring/errors
```

### 后端监控配置

后端监控配置通过环境变量设置：

```
# 日志级别（DEBUG, INFO, WARN, ERROR）
LOG_LEVEL=INFO

# 是否将日志写入文件
LOG_TO_FILE=true

# 日志文件路径
LOG_FILE_PATH=./logs/app.log

# 错误日志文件路径
ERROR_LOG_FILE_PATH=./logs/error.log

# 是否启用性能监控
ENABLE_PERFORMANCE_MONITORING=true

# 性能数据采样率（0-1）
PERFORMANCE_SAMPLE_RATE=0.1

# 日志文件最大大小（字节）
MAX_LOG_SIZE=10485760

# 保留的日志文件数量
MAX_LOG_FILES=10
```

## 最佳实践

### 日志最佳实践

1. **使用适当的日志级别**
   - DEBUG：详细的调试信息，仅在开发环境使用
   - INFO：常规操作信息，如请求处理、功能使用等
   - WARN：潜在问题或即将发生的问题
   - ERROR：错误和异常情况

2. **结构化日志**
   - 始终包含上下文信息
   - 使用模块/组件名称标识日志来源
   - 对于错误，包含完整的错误信息和堆栈跟踪

3. **避免过度日志**
   - 避免在循环中记录日志
   - 避免记录敏感信息
   - 在生产环境中禁用DEBUG级别日志

### 性能监控最佳实践

1. **监控关键操作**
   - API请求
   - 数据库查询
   - 复杂计算
   - 用户交互响应时间

2. **设置合理的阈值**
   - API响应时间：< 1000ms
   - 页面加载时间：< 3000ms
   - 数据库查询：< 500ms

3. **使用采样**
   - 在高流量环境中使用采样减少监控开销
   - 为不同环境设置不同的采样率

### 错误跟踪最佳实践

1. **分类错误**
   - 使用适当的严重性级别
   - 添加足够的上下文信息
   - 对类似错误进行分组

2. **设置警报**
   - 为关键错误设置实时警报
   - 监控错误率的突然增加

3. **定期审查**
   - 定期检查错误报告
   - 识别常见错误模式
   - 优先修复高频率和高严重性错误