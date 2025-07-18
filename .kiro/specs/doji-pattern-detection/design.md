# 十字星形态识别与筛选功能设计文档

## 概述

十字星形态识别与筛选功能旨在为用户提供自动化的 K 线形态识别工具，特别关注十字星这一重要的技术分析信号。该功能将集成到现有的股票分析系统中，不仅能够识别各种十字星形态，还能筛选出出现十字星后上涨的股票，帮助投资者发现潜在的交易机会。

## 架构

### 整体架构

十字星形态识别与筛选功能将采用前后端结合的架构：

1. **前端组件**：

   - 形态识别引擎（实时计算）
   - 可视化标记组件（在图表上显示）
   - 十字星筛选器（筛选出现十字星后上涨的股票）
   - 形态统计分析组件（分析后续价格走势）

2. **后端服务**：

   - 形态统计分析服务（历史成功率和后续走势）
   - 形态数据存储（缓存已识别形态）
   - 提醒服务（基于形态的提醒）
   - 筛选服务（市场扫描器集成）

3. **数据流**：
   ```
   K线数据 → 形态识别引擎 → 识别结果 → 可视化展示
                                    ↓
                              形态统计分析 → 后续走势分析
                                    ↓
                           十字星筛选器 → 上涨股票筛选
   ```

### 技术选型

1. **前端**：

   - 使用 TypeScript 实现形态识别算法
   - 利用 ECharts 自定义系列实现可视化标记
   - Vue 3 组件封装交互界面
   - Pinia 状态管理形态识别结果

2. **后端**：
   - Node.js + Egg.js 实现形态分析服务
   - MySQL 存储形态统计数据
   - Redis 缓存常用股票的形态识别结果
   - WebSocket 推送实时形态识别提醒

## 组件和接口

### 核心组件

#### 1. DojiPatternDetector（十字星检测器）

主要职责：分析 K 线数据，识别各类十字星形态

```typescript
class DojiPatternDetector {
  // 配置参数
  private config: {
    bodyThreshold: number // 实体与影线比例阈值
    equalPriceThreshold: number // 开盘收盘价相等的容差
    longLegThreshold: number // 长腿十字星的影线长度阈值
  }

  // 方法
  constructor(config?: Partial<DojiConfig>)
  detectPatterns(klines: KLineData[]): DojiPattern[]
  detectStandardDoji(candle: KLineData): boolean
  detectDragonfly(candle: KLineData): boolean
  detectGravestone(candle: KLineData): boolean
  detectLongLeggedDoji(candle: KLineData): boolean

  // 辅助方法
  private calculateBodySize(candle: KLineData): number
  private calculateShadowRatio(candle: KLineData): number
  private isPriceEqual(price1: number, price2: number): boolean
}
```

#### 2. DojiPatternVisualizer（十字星可视化器）

主要职责：在图表上标记识别出的十字星形态

```typescript
class DojiPatternVisualizer {
  // 属性
  private chart: ECharts
  private patterns: DojiPattern[]
  private markersVisible: boolean

  // 方法
  constructor(chart: ECharts)
  setPatterns(patterns: DojiPattern[]): void
  showMarkers(): void
  hideMarkers(): void
  toggleMarkers(): void
  highlightPattern(patternId: string): void

  // 渲染方法
  private renderMarkers(): void
  private createTooltip(pattern: DojiPattern): string
}
```

#### 3. DojiPatternScreener（十字星筛选器）

主要职责：筛选出现十字星后上涨的股票

```typescript
class DojiPatternScreener {
  // 方法
  screenStocks(criteria: DojiScreenCriteria): Promise<StockScreenResult[]>
  getRecentPatterns(days: number, patternType?: DojiType): Promise<StockPatternResult[]>
  getUpwardStocksAfterDoji(days: number, upwardPercent?: number): Promise<UpwardStockResult[]>
  subscribeToPatterns(stockIds: string[], patternTypes: DojiType[]): void

  // 数据访问
  private fetchHistoricalPatterns(stockId: string, days: number): Promise<DojiPattern[]>
  private analyzePriceMovement(
    stockId: string,
    patternDate: Date,
    days: number
  ): Promise<PriceMovement>
}
```

#### 4. DojiPatternAnalyzer（十字星分析器）

主要职责：分析十字星形态后的价格走势

```typescript
class DojiPatternAnalyzer {
  // 方法
  analyzePriceMovement(pattern: DojiPattern, days: number): PriceMovementAnalysis
  calculateSuccessRate(
    patternType: DojiType,
    timeframe: string,
    marketCondition?: MarketCondition
  ): SuccessRateStats
  getPriceDistribution(patternType: DojiType, days: number): PriceDistribution

  // 统计分析
  private calculateAveragePriceChange(patterns: DojiPattern[], days: number): number
  private categorizeMarketCondition(date: Date): MarketCondition
  private findSimilarPatterns(pattern: DojiPattern): DojiPattern[]
}
```

### 数据模型

#### 1. DojiPattern（十字星形态）

```typescript
interface DojiPattern {
  id: string
  stockId: string
  stockName: string
  timestamp: number
  type: DojiType // 'standard' | 'dragonfly' | 'gravestone' | 'longLegged'
  candle: {
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
  significance: number // 0-1，表示形态的显著性
  context: {
    trend: TrendType // 'uptrend' | 'downtrend' | 'sideways'
    nearSupportResistance: boolean
    volumeChange: number // 相对于平均成交量的变化百分比
  }
}
```

#### 2. PriceMovement（价格走势）

```typescript
interface PriceMovement {
  patternId: string
  stockId: string
  patternDate: number
  priceChanges: {
    day1: number // 1天后的价格变化百分比
    day3: number // 3天后的价格变化百分比
    day5: number // 5天后的价格变化百分比
    day10: number // 10天后的价格变化百分比
  }
  volumeChanges: {
    day1: number
    day3: number
    day5: number
  }
  isUpward: boolean // 是否上涨（基于5天价格变化）
}
```

#### 3. UpwardStockResult（上涨股票结果）

```typescript
interface UpwardStockResult {
  stockId: string
  stockName: string
  patternDate: number
  patternType: DojiType
  priceBeforePattern: number
  currentPrice: number
  priceChange: number // 百分比
  volumeChange: number // 百分比
  significance: number // 形态显著性
  rank: number // 排名（基于上涨幅度）
}
```

#### 4. DojiScreenCriteria（十字星筛选条件）

```typescript
interface DojiScreenCriteria {
  patternTypes: DojiType[]
  daysRange: number // 查找最近几天内的形态
  minUpwardPercent?: number // 最小上涨幅度
  sortBy: 'priceChange' | 'volumeChange' | 'patternDate' | 'significance'
  sortDirection: 'asc' | 'desc'
  marketCondition?: MarketCondition // 市场环境筛选
  limit: number // 结果数量限制
}
```

### API 接口

#### 1. 十字星筛选 API

```
POST /api/v1/screener/doji/upward
参数:
  - days: 查找最近几天内的形态（如3）
  - patternTypes: 十字星类型数组（如['standard']）
  - minUpwardPercent: 最小上涨幅度（如3.0）
  - sortBy: 排序字段
  - sortDirection: 排序方向
  - limit: 结果数量限制
返回:
  - 符合条件的上涨股票列表
  - 每只股票的形态和价格变动详情
```

#### 2. 价格走势分析 API

```
GET /api/v1/patterns/doji/price-movement
参数:
  - stockId: 股票ID
  - patternDate: 形态日期
  - days: 分析天数
返回:
  - 价格走势分析
  - 成交量变化
  - 与历史平均表现对比
```

#### 3. 形态统计 API

```
GET /api/v1/patterns/doji/stats
参数:
  - type: 十字星类型
  - days: 分析天数（1、3、5、10）
  - marketCondition: 市场环境
返回:
  - 上涨概率
  - 平均涨跌幅
  - 样本数量
  - 价格分布统计
```

#### 4. 最近形态 API

```
GET /api/v1/patterns/doji/recent
参数:
  - days: 查找天数
  - type: 十字星类型
  - limit: 结果数量限制
返回:
  - 最近出现形态的股票列表
  - 形态详情和后续价格变动
```

## 数据流程

### 十字星筛选流程

1. 用户打开十字星筛选工具
2. 设置筛选条件（最近天数、形态类型、最小上涨幅度等）
3. 系统查询数据库中符合条件的十字星形态
4. 分析每个形态后的价格走势，筛选出上涨的股票
5. 按照指定条件排序并返回结果

### 形态识别流程

1. 用户加载股票 K 线图
2. 前端 DojiPatternDetector 分析 K 线数据
3. 识别出的形态传递给 DojiPatternVisualizer
4. 在图表上标记十字星形态
5. 用户可以点击形态查看详细信息和后续价格走势

### 价格走势分析流程

1. 系统识别出十字星形态
2. 记录形态出现后 1 天、3 天、5 天、10 天的价格变化
3. 计算平均涨跌幅和上涨概率
4. 根据市场环境分类统计
5. 生成价格走势分布图表

## 用户界面设计

### 1. 十字星筛选器界面

专门的十字星筛选工具界面：

- 筛选条件区域（形态类型、时间范围、上涨幅度等）
- 结果排序选项
- 结果列表，包含：
  - 股票代码和名称
  - 形态出现日期
  - 形态类型和显著性
  - 后续价格变动（1 天、3 天、5 天）
  - 成交量变化
  - 排名指标

### 2. 图表标记

十字星形态将在 K 线图上以特殊标记显示：

- 标准十字星：蓝色菱形标记
- 墓碑十字星：红色倒三角标记
- 蜻蜓十字星：绿色正三角标记
- 长腿十字星：紫色圆形标记

标记将放置在 K 线的上方或下方，不干扰原始 K 线显示。

### 3. 形态详情面板

当用户点击形态标记时，将显示详情面板，包含：

- 形态类型和特征描述
- 后续价格走势图表（1 天、3 天、5 天、10 天）
- 历史统计数据（上涨概率、平均涨幅）
- 相似市场环境下的表现对比

### 4. 价格走势分析界面

专门的价格走势分析页面：

- 不同类型十字星的后续表现对比
- 上涨概率和平均涨幅统计图表
- 不同市场环境下的表现对比
- 价格分布直方图

## 性能考虑

1. **计算优化**：

   - 使用滑动窗口算法减少重复计算
   - 缓存中间结果避免重复分析
   - 使用 Web Worker 进行形态识别计算

2. **数据缓存**：

   - 缓存常用股票的形态识别结果
   - 使用 Redis 存储热门股票的分析结果
   - 实现增量计算，只处理新数据

3. **筛选优化**：

   - 使用索引优化数据库查询
   - 分页加载大量筛选结果
   - 预计算常用筛选条件的结果

4. **渲染优化**：
   - 使用虚拟列表显示大量筛选结果
   - 懒加载形态详情和分析内容
   - 优化图表标记渲染性能

## 错误处理

1. **数据异常处理**：

   - 处理 K 线数据缺失或异常情况
   - 在数据不完整时提供降级分析
   - 明确标识低可信度的识别结果

2. **筛选结果处理**：
   - 当没有符合条件的结果时提供友好提示
   - 提供筛选条件建议
   - 显示近似匹配的结果

## 扩展性

该设计具有良好的扩展性，可以：

1. 轻松添加新的十字星变种识别
2. 扩展筛选条件（如结合其他技术指标）
3. 添加更多价格走势分析维度
4. 集成其他 K 线形态识别（如锤子线、吞没形态等）

## 测试策略

1. **单元测试**：

   - 测试各类十字星的识别算法
   - 验证价格走势计算准确性
   - 测试筛选逻辑和排序功能

2. **集成测试**：

   - 测试形态识别与筛选功能的集成
   - 验证前后端数据交互
   - 测试大数据量下的性能表现

3. **用户体验测试**：
   - 测试筛选工具的易用性
   - 验证结果展示的清晰度
   - 测试在不同设备上的响应式表现
