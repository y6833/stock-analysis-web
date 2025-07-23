# 数据验证和转换系统使用指南

## 概述

数据验证和转换系统是一个全面的数据质量管理解决方案，旨在确保从不同数据源获取的数据的一致性、准确性和可靠性。该系统提供了数据验证、质量检查和格式标准化功能，可以帮助开发者和数据分析师处理来自多个数据源的异构数据。

## 主要功能

### 1. 数据验证

- **字段验证**：检查数据字段是否符合预定义的规则，如类型、格式、范围等
- **必填字段检查**：确保所有必需的字段都存在且有效
- **格式验证**：验证特定格式的字段，如日期、股票代码等
- **自定义验证规则**：支持添加特定业务逻辑的自定义验证规则

### 2. 数据质量检查

- **完整性检查**：确保数据包含所有必要的字段
- **一致性检查**：验证数据内部的逻辑一致性，如价格关系
- **异常检测**：识别可能的异常值，如异常的价格变化或成交量
- **数据源特定检查**：针对不同数据源的特定质量要求进行检查

### 3. 数据转换和标准化

- **字段映射**：将不同数据源的字段名称映射到标准字段名
- **类型转换**：确保数据类型的一致性，如将字符串转换为数字
- **格式标准化**：统一日期格式、数字精度等
- **数据源特定转换**：处理不同数据源的特定格式和约定

## 系统架构

数据验证和转换系统由以下组件组成：

1. **数据验证器 (DataValidator)**：负责验证数据字段和检查数据质量
2. **数据转换器 (DataTransformer)**：负责字段映射和数据格式标准化
3. **数据质量服务 (DataQualityService)**：集成验证器和转换器，提供统一的数据处理接口
4. **数据质量管理控制器 (DataQualityManagementController)**：提供 RESTful API 接口
5. **前端数据验证服务 (DataValidationService)**：提供前端访问数据质量 API 的接口

## 使用方法

### 后端使用

#### 1. 使用数据质量服务

```javascript
// 在 Service 中使用
const result = await this.ctx.service.dataQualityService.processData(
  data,
  'stockQuote',
  'tushare',
  { strict: true }
)

if (result.success) {
  // 使用处理后的数据
  const processedData = result.data
  // ...
} else {
  // 处理错误
  console.error('数据处理失败:', result.issues)
}
```

#### 2. 批量处理数据

```javascript
// 批量处理数据
const batchResult = await this.ctx.service.dataQualityService.processBatchData(
  dataArray,
  'stockHistory',
  'akshare',
  { skipQualityCheck: false }
)

if (batchResult.success) {
  // 使用处理后的数据
  const processedDataArray = batchResult.data
  // ...
} else {
  // 处理错误
  console.error('批量数据处理失败:', batchResult.stats)
}
```

### 前端使用

#### 1. 使用数据验证服务

```typescript
import { dataValidationService } from '@/services/dataValidationService'

// 处理单个数据
async function processStockData(data) {
  try {
    const result = await dataValidationService.processData(data, 'stockQuote', 'tushare', {
      strict: true,
    })

    if (result.success) {
      // 使用处理后的数据
      return result.data
    } else {
      // 显示错误信息
      const errors = dataValidationService.formatValidationErrors(result.validation)
      console.error('数据验证失败:', errors)
      return null
    }
  } catch (error) {
    console.error('处理数据时出错:', error)
    return null
  }
}
```

#### 2. 批量处理数据

```typescript
import { dataValidationService } from '@/services/dataValidationService'

// 批量处理数据
async function processBatchStockData(dataArray) {
  try {
    const result = await dataValidationService.processBatchData(dataArray, 'stockQuote', 'tushare')

    if (result.success) {
      // 使用处理后的数据
      return result.data
    } else {
      // 显示统计信息
      console.error('批量处理统计:', result.stats)
      // 显示失败项
      if (result.failedItems) {
        console.error('失败项:', result.failedItems)
      }
      return []
    }
  } catch (error) {
    console.error('批量处理数据时出错:', error)
    return []
  }
}
```

## API 参考

### 数据验证器 (DataValidator)

- `validateData(data, schema, source)`: 验证单个数据对象
- `validateField(field, value, rule)`: 验证单个字段
- `checkDataQuality(data, dataType, source)`: 检查数据质量
- `processData(data, schema, dataType, source, options)`: 处理数据（验证和质量检查）
- `processBatchData(dataArray, schema, dataType, source, options)`: 批量处理数据

### 数据转换器 (DataTransformer)

- `transformData(data, dataType, source, options)`: 转换单个数据对象
- `transformBatchData(dataArray, dataType, source, options)`: 批量转换数据
- `mapStockQuoteFields(data, source)`: 映射股票行情数据字段
- `mapStockHistoryFields(data, source)`: 映射股票历史数据字段
- `mapStockInfoFields(data, source)`: 映射股票基本信息字段

### 数据质量服务 (DataQualityService)

- `processData(data, dataType, source, options)`: 处理数据（验证、质量检查和转换）
- `processBatchData(dataArray, dataType, source, options)`: 批量处理数据
- `getStats()`: 获取数据质量统计信息
- `resetStats()`: 重置统计信息

### 前端数据验证服务 (DataValidationService)

- `validateData(data, dataType, source, options)`: 验证数据
- `validateBatchData(dataArray, dataType, source, options)`: 批量验证数据
- `transformData(data, dataType, source, options)`: 转换数据
- `transformBatchData(dataArray, dataType, source, options)`: 批量转换数据
- `processData(data, dataType, source, options)`: 处理数据
- `processBatchData(dataArray, dataType, source, options)`: 批量处理数据
- `getStats()`: 获取统计信息
- `resetStats()`: 重置统计信息
- `formatValidationErrors(result)`: 格式化验证错误
- `formatQualityIssues(result)`: 格式化质量问题
- `formatStats(stats)`: 格式化统计信息

## 支持的数据类型

系统当前支持以下数据类型的验证和转换：

1. **stockQuote**: 股票行情数据
2. **stockHistory**: 股票历史数据
3. **stockInfo**: 股票基本信息

每种数据类型都有特定的验证规则和转换映射。

## 支持的数据源

系统当前支持以下数据源：

1. **tushare**: Tushare Pro API
2. **akshare**: AKShare API
3. **sina**: 新浪财经 API
4. **eastmoney**: 东方财富 API
5. **netease**: 网易财经 API
6. **tencent**: 腾讯股票 API
7. **yahoo_finance**: Yahoo Finance API
8. **alltick**: AllTick API
9. **juhe**: 聚合数据 API
10. **zhitu**: 智兔数服 API

每个数据源都有特定的字段映射和转换规则。

## 配置选项

### 数据处理选项

- `skipValidation`: 跳过数据验证
- `skipQualityCheck`: 跳过数据质量检查
- `skipStandardization`: 跳过数据标准化
- `skipFieldMapping`: 跳过字段映射
- `skipTypeConversion`: 跳过类型转换
- `strict`: 严格模式（验证失败时返回错误）
- `throwOnError`: 出错时抛出异常

## 最佳实践

1. **始终验证外部数据**：对从外部 API 获取的所有数据进行验证和标准化
2. **使用批处理**：对大量数据使用批处理功能，提高效率
3. **处理验证错误**：妥善处理验证错误，提供用户友好的错误消息
4. **监控数据质量**：定期检查数据质量统计信息，识别潜在问题
5. **自定义验证规则**：根据业务需求添加自定义验证规则

## 故障排除

### 常见问题

1. **验证失败**：检查数据是否符合验证规则，查看具体的错误消息
2. **转换错误**：确保数据源配置正确，检查字段映射
3. **性能问题**：对大量数据使用批处理，考虑跳过不必要的验证或质量检查

### 错误代码和解决方案

| 错误类型       | 可能原因           | 解决方案                     |
| -------------- | ------------------ | ---------------------------- |
| 字段验证失败   | 数据格式不正确     | 检查数据格式，修正输入数据   |
| 必填字段缺失   | 数据不完整         | 确保所有必填字段都存在       |
| 数据一致性问题 | 数据内部逻辑不一致 | 检查数据源，修正不一致的数据 |
| 字段映射失败   | 未知的数据源或字段 | 添加新的字段映射规则         |

## 扩展和自定义

### 添加新的数据类型

1. 在 `DataQualityService` 中添加新的验证模式
2. 在 `DataTransformer` 中添加新的类型映射器
3. 在 `DataValidator` 中添加新的质量检查规则

### 添加新的数据源

1. 在 `DataTransformer` 中添加新的字段映射
2. 在 `DataValidator` 中添加新的数据源特定验证规则
3. 更新统计跟踪以包含新的数据源

## 结论

数据验证和转换系统是确保数据质量和一致性的关键组件。通过正确使用这个系统，可以显著提高数据处理的可靠性和效率，减少由于数据问题导致的错误和异常。
