# 十字星形态识别与筛选功能需求文档

## 介绍

十字星（Doji）是一种重要的 K 线形态，其开盘价和收盘价几乎相同，形成一个十字形状。在技术分析中，十字星通常被视为市场犹豫或潜在反转的信号。本功能旨在自动识别股票图表中的各种十字星形态，并提供筛选工具，帮助投资者快速找到出现十字星后上涨的股票，从而把握潜在的交易机会。

## 需求

### 需求 1

**用户故事:** 作为一名技术分析师，我希望系统能自动识别 K 线图中的各种十字星形态，以便我能快速找到潜在的市场反转点。

#### 接受标准

1. 当用户查看股票 K 线图时，系统 SHALL 自动标记出图表中的十字星形态。
2. 当系统识别到十字星形态时，系统 SHALL 以视觉方式（如特殊标记或颜色）在图表上突出显示。
3. 系统 SHALL 能识别以下类型的十字星形态：
   - 标准十字星（开盘价=收盘价）
   - 墓碑十字星（开盘价=收盘价=最低价）
   - 蜻蜓十字星（开盘价=收盘价=最高价）
   - 长腿十字星（上下影线较长）
4. 系统 SHALL 允许用户调整十字星识别的敏感度参数（开盘价与收盘价的最大差异百分比）。
5. 当用户将鼠标悬停在已识别的十字星上时，系统 SHALL 显示该形态的详细信息。

### 需求 2

**用户故事:** 作为一名交易者，我希望能够筛选出最近出现标准十字星后上涨的股票，以便我能发现潜在的交易机会。

#### 接受标准

1. 系统 SHALL 提供专门的十字星筛选工具，允许用户筛选最近特定时间范围（如 3 天内）出现过标准十字星的股票。
2. 系统 SHALL 能够识别出现十字星后股价上涨的股票，并优先显示这些股票。
3. 系统 SHALL 允许用户设置上涨幅度的筛选条件（如上涨超过 3%）。
4. 系统 SHALL 提供筛选结果的排序选项，如按上涨幅度、成交量变化等排序。
5. 系统 SHALL 在筛选结果中显示十字星出现的日期、位置和后续价格变动情况。

### 需求 3

**用户故事:** 作为一名量化分析师，我希望能设置基于十字星形态的自动提醒和筛选条件，以便我能构建相关的交易策略。

#### 接受标准

1. 系统 SHALL 允许用户创建基于十字星形态的条件提醒。
2. 当用户设置的股票出现指定类型的十字星形态时，系统 SHALL 发送通知。
3. 系统 SHALL 在市场扫描器中添加十字星形态作为筛选条件。
4. 系统 SHALL 允许用户查看过去特定时间段内出现十字星形态的所有股票列表。
5. 系统 SHALL 提供十字星形态的统计分析，如不同市场条件下的成功率。

### 需求 4

**用户故事:** 作为一名交易者，我希望能够分析十字星形态后的价格走势模式，以便优化我的交易策略。

#### 接受标准

1. 系统 SHALL 提供十字星形态后的价格走势统计分析。
2. 系统 SHALL 计算并显示不同类型十字星后 1 天、3 天、5 天的平均涨跌幅。
3. 系统 SHALL 分析并展示十字星在不同市场环境（牛市、熊市、震荡市）下的成功率。
4. 系统 SHALL 允许用户查看历史上出现类似形态的案例和后续走势。
5. 系统 SHALL 提供可视化图表，展示十字星后的价格走势分布情况。

### 需求 5

**用户故事:** 作为系统管理员，我希望十字星识别功能能高效运行且易于维护，以确保系统性能不受影响。

#### 接受标准

1. 十字星识别算法 SHALL 在前端实时运行，不增加服务器负载。
2. 系统 SHALL 缓存已识别的十字星形态，避免重复计算。
3. 当用户更改时间周期或股票时，系统 SHALL 高效重新计算十字星形态。
4. 系统 SHALL 提供性能监控，确保十字星识别不影响整体系统响应速度。
5. 系统 SHALL 允许管理员调整全局十字星识别参数和算法设置。
