# 数据库集成问题修复总结

## 问题分析

您提出的问题完全正确：**系统之前没有从数据库获取股票数据，而是直接调用外部API**。

从错误日志可以看到两个主要问题：
1. **缺少 `getDefaultStockList` 方法** - 导致 `TypeError: this.getDefaultStockList is not a function`
2. **数据库表混乱** - 系统查询 `stocks` 表，但实际数据在 `stock_basic` 表

## 已修复的问题

### 1. 添加缺失的 `getDefaultStockList` 方法

**文件**: `server/app/service/stock.js`

```javascript
// 获取默认股票列表（当所有数据源都失败时使用）
getDefaultStockList() {
  const { ctx } = this;
  
  ctx.logger.info('返回默认股票列表数据');
  
  // 返回一些主要的股票作为默认数据
  const defaultStocks = [
    { symbol: '000001.SZ', tsCode: '000001.SZ', name: '平安银行', area: '深圳', industry: '银行', market: '深圳', listDate: '19910403' },
    { symbol: '000002.SZ', tsCode: '000002.SZ', name: '万科A', area: '深圳', industry: '房地产开发', market: '深圳', listDate: '19910129' },
    { symbol: '600000.SH', tsCode: '600000.SH', name: '浦发银行', area: '上海', industry: '银行', market: '上海', listDate: '19991110' },
    { symbol: '600036.SH', tsCode: '600036.SH', name: '招商银行', area: '深圳', industry: '银行', market: '上海', listDate: '20020409' },
    { symbol: '600519.SH', tsCode: '600519.SH', name: '贵州茅台', area: '贵州', industry: '白酒', market: '上海', listDate: '20010827' },
    { symbol: '000858.SZ', tsCode: '000858.SZ', name: '五粮液', area: '四川', industry: '白酒', market: '深圳', listDate: '19980427' }
  ];

  return {
    data: defaultStocks,
    count: defaultStocks.length,
    data_source: 'default',
    data_source_message: '所有数据源失败，使用默认股票数据'
  };
}
```

### 2. 修复数据库表查询逻辑

**问题**: 系统中有两个股票表
- `stocks` - Node.js应用使用的表（通过Sequelize ORM定义）
- `stock_basic` - Python脚本使用的表（从Tushare API同步数据）

**解决方案**: 修改查询逻辑，同时支持两个表

```javascript
// 首先尝试从数据库获取
try {
  // 1. 优先尝试从 stocks 表获取（Sequelize ORM）
  let dbStocks = await ctx.model.Stock.findAll({
    attributes: ['symbol', 'tsCode', 'name', 'area', 'industry', 'market', 'listDate'],
    where: { listStatus: 'L' },
    order: [['symbol', 'ASC']],
    limit: 5000
  });

  // 2. 如果 stocks 表没有数据，尝试从 stock_basic 表获取（原始表）
  if (!dbStocks || dbStocks.length === 0) {
    ctx.logger.info('stocks表没有数据，尝试从stock_basic表获取...');
    
    const rawQuery = `
      SELECT ts_code as tsCode, symbol, name, area, industry, market, list_date as listDate 
      FROM stock_basic 
      WHERE list_status = 'L' OR list_status IS NULL
      ORDER BY symbol ASC 
      LIMIT 5000
    `;
    
    const [results] = await app.model.query(rawQuery, {
      type: app.model.QueryTypes.SELECT
    });
    
    if (results && results.length > 0) {
      // 处理 stock_basic 表的数据...
    }
  }
}
```

### 3. 数据同步到两个表

**修改**: 同步方法现在会同时更新两个表

```javascript
// 使用事务批量插入或更新到两个表
const transaction = await app.model.transaction();
try {
  // 1. 同步到 stocks 表（Sequelize ORM）
  for (const stockData of stocksToSync) {
    await ctx.model.Stock.upsert(stockData, { transaction });
  }

  // 2. 同步到 stock_basic 表（原始表，用于Python脚本兼容）
  try {
    // 先清空 stock_basic 表
    await app.model.query('DELETE FROM stock_basic', { transaction });
    
    // 批量插入到 stock_basic 表
    const insertQuery = `
      INSERT INTO stock_basic 
      (ts_code, symbol, name, area, industry, market, list_date, fullname, enname, cnspell, curr_type, list_status, delist_date, is_hs)
      VALUES ?
    `;
    
    await app.model.query(insertQuery, {
      replacements: [stockBasicData],
      transaction
    });
  } catch (stockBasicError) {
    ctx.logger.warn('同步到stock_basic表失败，但stocks表同步成功:', stockBasicError);
  }

  await transaction.commit();
}
```

### 4. 新增管理接口

**文件**: `server/app/controller/stock.js`

新增了以下API接口：

1. **手动同步股票数据**
   - `POST /api/stocks/sync`
   - 手动触发股票数据同步到数据库

2. **获取数据库统计信息**
   - `GET /api/stocks/stats`
   - 获取数据库中股票数据的统计信息

```javascript
// 手动同步股票数据到数据库
async syncStockData() {
  const { ctx, service } = this;

  try {
    ctx.logger.info('开始手动同步股票数据到数据库...');
    
    const result = await service.stock.fetchAndSyncStockList();

    ctx.body = {
      success: true,
      message: '股票数据同步成功',
      data: {
        count: result.count,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
        sync_time: new Date().toISOString()
      }
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '股票数据同步失败',
      error: err.message || '未知错误',
      sync_time: new Date().toISOString()
    };
  }
}
```

### 5. 前端数据库集成

**文件**: `src/services/stockService.ts`

修改前端服务，优先从后端数据库API获取数据：

```typescript
// 获取股票列表 - 从数据库获取
async getStocks() {
  const cacheKey = 'stocks_from_database'
  
  return await smartCache.getOrSet(
    cacheKey,
    async () => {
      try {
        // 直接调用后端API获取股票列表
        const response = await axios.get('/api/stocks')
        
        if (response.data && response.data.data) {
          const stocks = response.data.data
          
          // 添加数据源信息
          result.data_source = response.data.data_source || 'database'
          result.data_source_message = response.data.data_source_message || '数据来自数据库'
          result.is_real_time = false // 数据库数据不是实时的
          
          return result
        }
      } catch (error) {
        // 如果后端API失败，尝试使用外部数据源作为备用
        console.log('数据库获取失败，使用外部数据源作为备用...')
        // 备用逻辑...
      }
    },
    {
      expiry: 60 * 60 * 1000, // 1小时缓存
      version: '2.0',
      tags: ['stocks', 'database']
    }
  )
}
```

## 数据流变化

### 修复前
```
前端 → 外部数据源API (Tushare/新浪/腾讯) → 返回数据
后端 → 外部API → 返回数据
```

### 修复后
```
前端 → 后端API → 数据库（stocks表 或 stock_basic表）→ 返回数据
后端 → 定期同步外部API数据到数据库（两个表）
```

## 数据源优先级

1. **数据库 stocks 表** - 主要数据源（Sequelize ORM）
2. **数据库 stock_basic 表** - 备用数据源（Python脚本兼容）
3. **外部API** - 最后备用（当数据库无数据时）
4. **默认数据** - 兜底方案（所有数据源都失败时）

## 测试验证

创建了测试脚本 `test-database-stocks.cjs` 来验证：
1. 股票统计信息获取
2. 手动数据同步
3. 股票列表获取
4. 数据源验证

## 总结

通过这些修复，系统现在真正实现了：

✅ **从数据库获取股票数据** - 不再直接调用外部API  
✅ **兼容两个股票表** - 支持 stocks 表和 stock_basic 表  
✅ **完善的错误处理** - 添加了缺失的默认方法  
✅ **数据同步机制** - 自动同步外部API数据到数据库  
✅ **管理接口** - 提供手动同步和统计查询功能  
✅ **多级降级策略** - 数据库→API→默认数据的降级机制  

现在系统真正实现了从数据库获取股票数据，同时保持了高可用性和良好的用户体验。
