# 数据库访问层优化指南

本文档提供了关于数据库访问层优化的详细说明，包括连接池管理、查询优化和索引策略。

## 1. 优化概述

数据库访问层优化主要包括以下几个方面：

1. **连接池管理**：优化数据库连接的创建、使用和回收
2. **查询优化**：提高 SQL 查询的执行效率
3. **索引策略**：为常用查询添加适当的索引
4. **缓存集成**：减少对数据库的直接访问
5. **性能监控**：识别和解决性能瓶颈

## 2. 连接池管理

### 2.1 连接池配置

连接池配置在`config/config.default.js`中设置：

```javascript
// 连接池配置
pool: {
  max: 10,        // 最大连接数
  min: 2,         // 最小连接数
  idle: 10000,    // 连接最大空闲时间（毫秒）
  acquire: 30000, // 获取连接最大等待时间（毫秒）
  evict: 30000    // 清除空闲连接的检查间隔（毫秒）
}
```

### 2.2 动态连接池调整

`DatabaseOptimizer`类可以根据系统负载动态调整连接池大小：

```javascript
// 根据CPU核心数和内存情况动态调整连接池大小
const maxConnections = Math.max(5, Math.min(cpuCount * 2, 20))
```

### 2.3 连接池监控

使用`DatabaseService.getConnectionPoolStats()`方法监控连接池状态：

```javascript
const poolStats = await dbService.getConnectionPoolStats()
// 返回: { total: 10, acquired: 3, idle: 7, pending: 0 }
```

## 3. 查询优化

### 3.1 优化的查询方法

`DatabaseService`提供了优化的查询方法：

```javascript
// 基本查询
const users = await dbService.findAll('User', {
  where: { is_active: true },
  limit: 10,
})

// 分页查询
const result = await dbService.findAndCountAll('Stock', {
  page: 1,
  pageSize: 20,
  where: { exchange: 'SZSE' },
})
```

### 3.2 批量操作

对于大量数据的插入，使用批量操作提高性能：

```javascript
// 批量插入
const result = await dbService.bulkCreate('SystemLog', logs, {
  ignoreDuplicates: true,
})
```

### 3.3 查询性能监控

系统会自动记录慢查询（执行时间超过 100ms 的查询）：

```javascript
// 慢查询会被记录到日志和数据库
if (duration > 100) {
  this.logger.warn(`[DatabaseService] 慢查询 (${duration}ms): ${sql}`)
}
```

## 4. 索引策略

### 4.1 已添加的索引

系统已为常用查询添加了以下索引：

- 用户相关索引：`email`, `username`, `last_login_at`
- 股票相关索引：`symbol`, `name`, `exchange`
- 关注列表相关索引：`user_id + stock_code`, `created_at`
- 投资组合相关索引：`portfolio_id + stock_code`, `updated_at`
- 交易记录相关索引：`portfolio_id`, `stock_code`, `trade_date`
- 提醒相关索引：`user_id`, `stock_code`, `is_active`
- 十字星形态相关索引：`stock_code`, `pattern_date`, `pattern_type`
- 系统日志相关索引：`level`, `created_at`
- 页面访问相关索引：`page_id + access_date`, `user_id`

### 4.2 索引管理

使用`DatabaseOptimizer`类管理索引：

```javascript
// 确保索引存在
await dbOptimizer.ensureIndex('users', ['email'], 'idx_users_email', true)

// 获取表的索引信息
const tableStats = await dbOptimizer.getTableStats('users')
console.log(tableStats.indexes)
```

## 5. 缓存集成

### 5.1 查询缓存

`DatabaseService`支持查询结果缓存：

```javascript
// 使用缓存的查询
const stocks = await dbService.findAll('Stock', {
  limit: 20,
  useCache: true,
  cacheTTL: 300, // 缓存5分钟
})
```

### 5.2 缓存管理

缓存管理方法：

```javascript
// 清除特定模型的缓存
await dbService.clearModelCache('Stock')
```

### 5.3 备用缓存

当 Redis 不可用时，系统会自动使用内存缓存作为备用：

```javascript
// 内存缓存作为备用
if (!this.app.redis) {
  this.app.redis = memoryCache
}
```

## 6. 性能监控

### 6.1 慢查询监控

系统会记录执行时间超过阈值的查询：

```javascript
// 记录慢查询
if (duration > 100) {
  this.logger.warn(`[DatabaseService] 慢查询 (${duration}ms): ${sql}`)
  await this.recordSlowQuery(sql, duration, parameters)
}
```

### 6.2 数据库健康检查

使用`DatabaseService.getHealthStatus()`方法检查数据库健康状态：

```javascript
const healthStatus = await dbService.getHealthStatus()
// 返回: { status: 'healthy', version: '8.0.26', connectionPool: {...}, timestamp: '...' }
```

### 6.3 表统计信息

使用`DatabaseOptimizer.getTableStats()`方法获取表的统计信息：

```javascript
const tableStats = await dbOptimizer.getTableStats('users')
// 返回表的行数、大小、索引等信息
```

## 7. 最佳实践

### 7.1 查询优化

- 只选择需要的字段：`attributes: ['id', 'name', 'email']`
- 使用适当的`where`条件限制结果集
- 对大结果集使用分页：`page: 1, pageSize: 20`
- 对频繁访问的数据使用缓存：`useCache: true`

### 7.2 事务管理

对于需要保证一致性的操作，使用事务：

```javascript
await this.sequelize.transaction(async (transaction) => {
  // 在事务中执行查询
  const count = await model.count({ where, transaction })
  const rows = await model.findAll({ ...queryOptions, transaction })
  return { count, rows }
})
```

### 7.3 批量操作

对于大量数据的操作，使用批量方法并考虑分批处理：

```javascript
// 如果记录数量大于100，分批插入
if (records.length > 100) {
  const batchSize = 100
  const batches = []

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    batches.push(batch)
  }

  let results = []
  for (const batch of batches) {
    const batchResults = await model.bulkCreate(batch, options)
    results = results.concat(batchResults)
  }

  return results
}
```

### 7.4 定期维护

定期执行数据库维护任务：

```javascript
// 分析和优化表
await dbOptimizer.analyzeAndOptimizeTable(tableName)

// 执行完整的数据库维护
await dbOptimizer.performMaintenance()
```

## 8. API 参考

### 8.1 DatabaseService

- `findAll(modelName, options)`: 优化的查询方法
- `findAndCountAll(modelName, options)`: 优化的分页查询方法
- `bulkCreate(modelName, records, options)`: 批量插入数据
- `query(sql, options)`: 执行原始 SQL 查询
- `clearModelCache(modelName)`: 清除模型相关的缓存
- `getConnectionPoolStats()`: 获取连接池状态
- `getHealthStatus()`: 获取数据库健康状态

### 8.2 DatabaseOptimizer

- `ensureIndexes()`: 确保所有必要的索引都已创建
- `ensureIndex(table, fields, indexName, unique)`: 确保特定索引存在
- `analyzeAndOptimizeTable(tableName)`: 分析表并优化
- `getTableStats(tableName)`: 获取表统计信息
- `getAllTables()`: 获取所有表的列表
- `performMaintenance()`: 执行数据库维护任务

### 8.3 数据库健康 API

- `GET /api/v1/database/health`: 获取数据库健康状态
- `GET /api/v1/database/connection-pool`: 获取连接池状态
- `GET /api/v1/database/slow-queries`: 获取慢查询列表
- `GET /api/v1/database/tables`: 获取所有表列表
- `GET /api/v1/database/table-stats`: 获取表统计信息
- `POST /api/v1/database/maintain-table`: 执行表维护
- `POST /api/v1/database/maintain-database`: 执行数据库完整维护
- `POST /api/v1/database/clear-model-cache`: 清除特定模型的缓存
