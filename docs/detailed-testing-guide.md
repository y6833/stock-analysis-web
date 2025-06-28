# 详细测试方法指南

本指南提供了验证 Alpha Vantage 和 AllTick 数据源集成的详细测试方法。

## 🎯 测试目标

验证以下功能是否正常工作：
1. **连接测试**：API Key 有效性、网络连接、端点可访问性
2. **数据获取**：实时行情、历史数据、股票搜索、新闻获取
3. **错误处理**：无效请求、网络超时、频率限制
4. **性能测试**：响应时间、并发处理、稳定性
5. **数据完整性**：数据格式、字段完整性、数值有效性

## 🔧 测试方式

### 方式一：可视化测试页面（推荐）

1. **访问测试页面**
   ```
   http://localhost:7001/data-source-test
   ```

2. **基础测试**
   - 点击 "测试 Alpha Vantage" - 测试 Alpha Vantage 基本功能
   - 点击 "测试 AllTick" - 测试 AllTick 基本功能
   - 点击 "测试所有数据源" - 依次测试两个数据源

3. **详细测试**
   - 点击 "连接测试" - 验证 API 连接和端点可访问性
   - 点击 "数据获取测试" - 测试各种数据获取功能
   - 点击 "性能测试" - 测试响应时间和并发性能
   - 点击 "数据完整性测试" - 验证数据格式和完整性

4. **工具功能**
   - 点击 "开始网络监控" - 监控所有网络请求
   - 点击 "导出结果" - 导出测试结果为 JSON 文件
   - 点击 "清除结果" - 清空测试结果

### 方式二：浏览器开发者工具

1. **打开开发者工具**
   - 按 F12 或右键选择 "检查"
   - 切换到 "Console" 标签

2. **运行测试命令**
   ```javascript
   // 快速连接测试
   await testDataSources.quickTest()
   
   // 获取样本数据
   await testDataSources.getSampleData()
   
   // 性能测试
   await testDataSources.performanceTest()
   
   // 数据完整性检查
   await testDataSources.integrityCheck()
   
   // 完整测试套件
   await testDataSources.fullTest()
   
   // 单独测试 Alpha Vantage
   await testDataSources.testAlphaVantage()
   
   // 单独测试 AllTick
   await testDataSources.testAllTick()
   ```

3. **监控网络请求**
   ```javascript
   // 开始监控
   const stopMonitoring = testDataSources.monitorNetwork()
   
   // 执行一些测试...
   await testDataSources.quickTest()
   
   // 停止监控
   stopMonitoring()
   ```

### 方式三：代码直接调用

```typescript
import { ComprehensiveTestRunner } from '@/tests/dataSource/detailedConnectionTest'
import BrowserTestUtils from '@/tests/dataSource/browserConsoleTest'

// 运行完整测试套件
const results = await ComprehensiveTestRunner.runAllTests()
console.log('测试结果:', results)

// 快速连接测试
const connectionStatus = await BrowserTestUtils.quickConnectionTest()
console.log('连接状态:', connectionStatus)
```

## 📊 预期结果

### 成功连接的标志

**Alpha Vantage:**
```json
{
  "symbol": "AAPL",
  "price": 150.25,
  "change": 2.15,
  "changePercent": 1.45,
  "volume": 45678900,
  "timestamp": 1640995200000,
  "market": "US"
}
```

**AllTick:**
```json
{
  "symbol": "AAPL",
  "price": 150.30,
  "volume": 45680000,
  "turnover": 6852450000,
  "timestamp": 1640995260000,
  "market": "US"
}
```

### 历史数据格式

```json
[
  {
    "symbol": "AAPL",
    "date": "2023-12-01",
    "open": 149.50,
    "high": 151.20,
    "low": 148.80,
    "close": 150.25,
    "volume": 45678900,
    "turnover": 6852450000
  }
]
```

### 错误处理示例

**API Key 无效:**
```
Error: Alpha Vantage API错误: Invalid API call
```

**网络超时:**
```
Error: 请求超时，请检查网络连接
```

**频率限制:**
```
Error: API调用频率超限，请稍后重试
```

## 🔍 详细测试步骤

### 1. 连接测试

#### 1.1 API Key 有效性测试

**测试目的**: 验证提供的 API Key 是否有效

**测试步骤**:
1. 使用 API Key 发起测试请求
2. 检查响应状态码
3. 验证返回数据格式

**预期结果**:
- Alpha Vantage: 返回有效的股票数据
- AllTick: 返回有效的行情数据

**失败处理**:
- 检查 API Key 是否正确配置
- 确认 API Key 是否已过期
- 验证 API Key 权限设置

#### 1.2 网络连接测试

**测试目的**: 验证网络连接是否正常

**测试步骤**:
1. 发起 HTTP 请求到 API 端点
2. 检查网络响应时间
3. 验证 DNS 解析是否正常

**预期结果**:
- 响应时间 < 5秒
- HTTP 状态码 200
- 无网络错误

#### 1.3 API 端点可访问性测试

**测试目的**: 验证 API 端点是否可访问

**测试步骤**:
1. 测试各个 API 端点
2. 验证 HTTPS 证书
3. 检查 CORS 设置

**预期结果**:
- 所有端点返回有效响应
- HTTPS 连接正常
- 无 CORS 错误

### 2. 数据获取测试

#### 2.1 实时股票行情测试

**测试股票**: AAPL (苹果公司)

**测试步骤**:
1. 调用 `getStockQuote('AAPL')`
2. 验证返回数据格式
3. 检查数据时效性

**验证点**:
- 股票代码正确
- 价格为正数
- 成交量为非负数
- 时间戳为最近时间

#### 2.2 历史数据测试

**测试参数**: AAPL, 日K线, 最近30天

**测试步骤**:
1. 调用 `getStockHistory('AAPL', 'day')`
2. 验证数据数量
3. 检查数据完整性

**验证点**:
- 返回数据为数组
- 包含必要字段 (date, open, high, low, close, volume)
- 数据按时间排序
- 价格数据合理

#### 2.3 股票搜索测试

**测试关键词**: "Apple", "AAPL"

**测试步骤**:
1. 调用 `searchStocks('Apple')`
2. 验证搜索结果
3. 检查结果相关性

**验证点**:
- 返回结果数量 > 0
- 结果包含相关股票
- 股票信息完整

#### 2.4 财经新闻测试 (仅 Alpha Vantage)

**测试步骤**:
1. 调用 `getFinancialNews(5)`
2. 验证新闻数量
3. 检查新闻内容

**验证点**:
- 返回新闻数量 ≤ 5
- 新闻标题和内容不为空
- 新闻时间为最近时间

### 3. 错误处理验证

#### 3.1 无效股票代码测试

**测试步骤**:
1. 使用无效股票代码 "INVALID123"
2. 观察错误处理
3. 验证错误信息

**预期结果**:
- 抛出明确的错误信息
- 不会导致程序崩溃
- 错误信息有助于调试

#### 3.2 网络超时测试

**测试方法**:
- 快速连续发送多个请求
- 观察限流处理
- 验证重试机制

#### 3.3 API 限流测试

**测试步骤**:
1. 在短时间内发送大量请求
2. 观察限流响应
3. 验证恢复机制

### 4. 性能测试

#### 4.1 响应时间测试

**测试指标**:
- 平均响应时间 < 3秒
- 95% 请求 < 5秒
- 最大响应时间 < 10秒

#### 4.2 并发测试

**测试方法**:
- 同时发送 5 个请求
- 观察成功率
- 检查数据一致性

#### 4.3 稳定性测试

**测试方法**:
- 连续运行 10 次测试
- 统计成功率
- 观察性能趋势

### 5. 数据完整性验证

#### 5.1 数据格式验证

**检查项目**:
- JSON 格式正确
- 字段类型匹配
- 必填字段存在

#### 5.2 数值有效性验证

**检查项目**:
- 价格 > 0
- 成交量 ≥ 0
- 时间戳有效
- 百分比在合理范围

#### 5.3 数据逻辑验证

**检查项目**:
- 最高价 ≥ 最低价
- 开盘价和收盘价在合理范围
- 成交额 = 价格 × 成交量 (近似)

## 🚨 常见问题排查

### 问题 1: API Key 无效

**症状**: 返回 "Invalid API call" 错误

**解决方案**:
1. 检查 API Key 是否正确配置
2. 确认 API Key 格式是否正确
3. 验证 API Key 是否已激活

### 问题 2: 网络连接失败

**症状**: 请求超时或连接被拒绝

**解决方案**:
1. 检查网络连接
2. 确认防火墙设置
3. 验证代理配置

### 问题 3: 数据格式错误

**症状**: 返回的数据格式不符合预期

**解决方案**:
1. 检查 API 版本
2. 确认请求参数
3. 查看 API 文档更新

### 问题 4: 频率限制

**症状**: 返回 "Rate limit exceeded" 错误

**解决方案**:
1. 增加请求间隔
2. 实现指数退避重试
3. 考虑升级 API 计划

## 📈 测试报告模板

```
数据源测试报告
================

测试时间: 2023-12-01 10:00:00
测试环境: 开发环境
测试人员: [姓名]

Alpha Vantage 测试结果:
- 连接测试: ✅ 通过
- 实时行情: ✅ 通过
- 历史数据: ✅ 通过
- 股票搜索: ✅ 通过
- 财经新闻: ✅ 通过
- 性能测试: ✅ 通过 (平均响应时间: 2.3秒)

AllTick 测试结果:
- 连接测试: ✅ 通过
- 实时行情: ✅ 通过
- 历史数据: ✅ 通过
- 股票搜索: ✅ 通过
- 性能测试: ✅ 通过 (平均响应时间: 1.8秒)

总体评估:
- 成功率: 100%
- 平均响应时间: 2.05秒
- 数据完整性: 优秀
- 错误处理: 良好

建议:
1. 继续监控 API 限制使用情况
2. 定期更新 API Key
3. 优化缓存策略以提高性能
```

## 🎯 下一步行动

1. **定期测试**: 建议每周运行一次完整测试
2. **监控告警**: 设置数据源状态监控
3. **性能优化**: 根据测试结果优化缓存和重试策略
4. **文档更新**: 根据测试发现更新使用文档
