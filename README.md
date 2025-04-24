# stock-analysis-web

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
node proxy-server.cjs
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

1. 个性化仪表盘 ✅
自定义布局：允许用户选择他们想要在首页看到的信息和图表 ✅
关注列表：用户可以添加自己关注的股票，并在仪表盘上快速查看它们的表现 ✅
市场概览：显示主要指数和行业板块的实时表现 ✅

2. 高级技术分析工具 ✅
更多技术指标：MACD、KDJ、布林带、量能指标等 ✅
形态识别：自动识别头肩顶、双底等经典形态 ✅
趋势线工具：允许用户在图表上绘制趋势线、支撑/阻力位 ✅
多时间周期分析：同时查看日线、周线、月线等不同周期的图表 ✅

3. 基本面分析 ✅
财务数据展示：营收、利润、ROE等关键财务指标 ✅
财报解读：自动提取财报中的关键信息并进行简化解读 ✅
行业对比：将股票与行业平均水平进行对比 ✅
估值分析：PE、PB、PS等估值指标的历史对比 ✅

4. 资讯与研报 ✅
新闻聚合：整合与股票相关的最新新闻 ✅
研报摘要：提供分析师研报的关键观点 ✅
公告提醒：重要公告的自动提醒 ✅
事件日历：显示即将到来的财报发布、分红等重要事件
5. 回测与策略
策略回测：测试简单的交易策略在历史数据上的表现
条件提醒：设置价格、成交量等条件的提醒
模拟交易：不用真实资金就能测试交易策略
6. 社区功能
评论与讨论：用户可以分享对特定股票的看法
热门股票榜：显示社区中讨论最多的股票
专家观点：汇总专业分析师的观点
7. 数据导出与报告
PDF报告：生成专业的股票分析报告
数据导出：将数据导出为Excel或CSV格式
分析记录：保存用户的分析历史
8. 市场扫描器
股票筛选器：根据技术指标、基本面等条件筛选股票
异动监控：监控并提醒市场中的异常波动
板块轮动分析：识别市场中的资金流向和板块轮动