# Tushare Pro API 完整参考文档

## 概述

本文档提供了 Tushare Pro API 的完整参考指南，包括所有相关 API 端点的详细信息、参数说明、响应格式、速率限制和最佳实践。

## API 基础信息

### 服务端点

- **基础 URL**: `http://api.tushare.pro`
- **协议**: HTTP POST
- **数据格式**: JSON
- **编码**: UTF-8

### 认证方式

- **认证类型**: Token 认证
- **Token 获取**: 在 [Tushare Pro 官网](https://tushare.pro) 注册并获取 API Token
- **Token 使用**: 在请求体中包含 `token` 字段

### 通用请求格式

```json
{
  "api_name": "接口名称",
  "token": "your_token_here",
  "params": {
    "参数名": "参数值"
  },
  "fields": "字段列表,逗号分隔"
}
```

### 通用响应格式

```json
{
  "request_id": "请求ID",
  "code": 0,
  "msg": "success",
  "data": {
    "fields": ["字段1", "字段2", "字段3"],
    "items": [
      ["值1", "值2", "值3"],
      ["值4", "值5", "值6"]
    ]
  }
}
```

## 错误代码说明

| 错误代码 | 说明             | 解决方案                   |
| -------- | ---------------- | -------------------------- |
| 0        | 成功             | -                          |
| 40001    | 权限不足         | 检查 Token 权限或升级积分  |
| 40002    | Token 无效       | 重新获取有效的 Token       |
| 40101    | 每日请求限制超限 | 等待次日重置或升级积分     |
| 40203    | 频率限制超限     | 降低请求频率，等待限制重置 |
| 40301    | 参数错误         | 检查请求参数格式和必填项   |
| 50001    | 服务器错误       | 稍后重试或联系技术支持     |

## 速率限制

### 基础限制

- **每分钟请求数**: 200 次（基础用户）
- **每日请求数**: 500 次（基础用户）
- **单次请求数据量**: 最多 6000 条记录

### 积分系统

- **2000 积分**: 基础数据访问权限
- **5000 积分**: VIP 接口访问权限
- **更高积分**: 更高的请求频率和数据量限制

## 核心 API 端点详细说明

### 1. 基础数据类 API

#### 1.1 股票列表 (stock_basic)

**接口名称**: `stock_basic`  
**权限要求**: 2000 积分  
**更新频率**: 每日更新  
**描述**: 获取股票基础信息，包括股票代码、名称、上市日期等

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | N | TS 股票代码 |
| name | str | N | 股票名称 |
| market | str | N | 市场类别（主板/创业板/科创板/CDR/北交所） |
| list_status | str | N | 上市状态（L 上市/D 退市/P 暂停上市，默认 L） |
| exchange | str | N | 交易所（SSE 上交所/SZSE 深交所/BSE 北交所） |
| is_hs | str | N | 是否沪深港通标的（N 否/H 沪股通/S 深股通） |

**输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | TS 代码 |
| symbol | str | 股票代码 |
| name | str | 股票名称 |
| area | str | 地域 |
| industry | str | 所属行业 |
| market | str | 市场类型 |
| list_date | str | 上市日期 |
| is_hs | str | 是否沪深港通标的 |

**示例请求**:

```json
{
  "api_name": "stock_basic",
  "token": "your_token",
  "params": {
    "list_status": "L",
    "exchange": "SSE"
  },
  "fields": "ts_code,symbol,name,area,industry,list_date"
}
```

#### 1.2 交易日历 (trade_cal)

**接口名称**: `trade_cal`  
**权限要求**: 基础权限  
**更新频率**: 年度更新  
**描述**: 获取各交易所交易日历数据

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| exchange | str | N | 交易所（SSE/SZSE/BSE） |
| cal_date | str | N | 日历日期（YYYYMMDD） |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |
| is_open | str | N | 是否交易（0 休市/1 交易） |

**输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| exchange | str | 交易所 |
| cal_date | str | 日历日期 |
| is_open | int | 是否交易（0 休市/1 交易） |
| pretrade_date | str | 上一交易日 |

### 2. 行情数据类 API

#### 2.1 日线行情 (daily)

**接口名称**: `daily`  
**权限要求**: 基础权限  
**更新频率**: 每日 15:00-16:00 更新  
**描述**: 获取股票日线行情数据（未复权）

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | N | 股票代码（支持多个，逗号分隔） |
| trade_date | str | N | 交易日期（YYYYMMDD） |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |

**输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| trade_date | str | 交易日期 |
| open | float | 开盘价 |
| high | float | 最高价 |
| low | float | 最低价 |
| close | float | 收盘价 |
| pre_close | float | 昨收价 |
| change | float | 涨跌额 |
| pct_chg | float | 涨跌幅 |
| vol | float | 成交量（手） |
| amount | float | 成交额（千元） |

#### 2.2 复权行情 (pro_bar)

**接口名称**: `pro_bar`  
**权限要求**: 基础权限  
**更新频率**: 实时更新  
**描述**: 获取股票复权行情数据，支持前复权、后复权

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | Y | 股票代码 |
| api | str | N | 接口名称（默认 pro_bar） |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |
| adj | str | N | 复权类型（None 不复权/qfq 前复权/hfq 后复权） |
| freq | str | N | 数据频度（D 日线/W 周线/M 月线） |

#### 2.3 每日指标 (daily_basic)

**接口名称**: `daily_basic`  
**权限要求**: 基础权限  
**更新频率**: 每日更新  
**描述**: 获取股票每日技术指标数据

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | N | 股票代码 |
| trade_date | str | N | 交易日期 |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |

**输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| trade_date | str | 交易日期 |
| close | float | 当日收盘价 |
| turnover_rate | float | 换手率 |
| turnover_rate_f | float | 换手率（自由流通股） |
| volume_ratio | float | 量比 |
| pe | float | 市盈率 |
| pe_ttm | float | 市盈率 TTM |
| pb | float | 市净率 |
| ps | float | 市销率 |
| ps_ttm | float | 市销率 TTM |
| dv_ratio | float | 股息率 |
| dv_ttm | float | 股息率 TTM |
| total_share | float | 总股本 |
| float_share | float | 流通股本 |
| free_share | float | 自由流通股本 |
| total_mv | float | 总市值 |
| circ_mv | float | 流通市值 |

### 3. 财务数据类 API

#### 3.1 利润表 (income)

**接口名称**: `income`  
**权限要求**: 2000 积分  
**更新频率**: 财报发布后更新  
**描述**: 获取上市公司利润表数据

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | Y | 股票代码 |
| ann_date | str | N | 公告日期 |
| start_date | str | N | 公告开始日期 |
| end_date | str | N | 公告结束日期 |
| period | str | N | 报告期 |
| report_type | str | N | 报告类型 |
| comp_type | str | N | 公司类型（1 一般工商业/2 银行/3 保险/4 证券） |

**主要输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| ann_date | str | 公告日期 |
| end_date | str | 报告期 |
| total_revenue | float | 营业总收入 |
| revenue | float | 营业收入 |
| operate_profit | float | 营业利润 |
| total_profit | float | 利润总额 |
| n_income | float | 净利润 |
| n_income_attr_p | float | 归属于母公司股东的净利润 |
| basic_eps | float | 基本每股收益 |
| diluted_eps | float | 稀释每股收益 |

#### 3.2 资产负债表 (balancesheet)

**接口名称**: `balancesheet`
**权限要求**: 2000 积分
**更新频率**: 财报发布后更新
**描述**: 获取上市公司资产负债表数据

**主要输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| ann_date | str | 公告日期 |
| end_date | str | 报告期 |
| total_assets | float | 资产总计 |
| total_liab | float | 负债合计 |
| total_hldr_eqy_exc_min_int | float | 股东权益合计 |
| total_cur_assets | float | 流动资产合计 |
| total_nca | float | 非流动资产合计 |
| total_cur_liab | float | 流动负债合计 |
| total_ncl | float | 非流动负债合计 |

#### 3.3 现金流量表 (cashflow)

**接口名称**: `cashflow`
**权限要求**: 2000 积分
**更新频率**: 财报发布后更新
**描述**: 获取上市公司现金流量表数据

**主要输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| ann_date | str | 公告日期 |
| end_date | str | 报告期 |
| n_cashflow_act | float | 经营活动现金流量净额 |
| n_cashflow_inv_act | float | 投资活动现金流量净额 |
| n_cashflow_fin_act | float | 筹资活动现金流量净额 |
| c_cash_equ_end_period | float | 期末现金及现金等价物余额 |

#### 3.4 财务指标 (fina_indicator)

**接口名称**: `fina_indicator`
**权限要求**: 2000 积分
**更新频率**: 财报发布后更新
**描述**: 获取上市公司财务指标数据

**主要输出字段**:
| 字段名 | 类型 | 描述 |
|--------|------|------|
| ts_code | str | 股票代码 |
| ann_date | str | 公告日期 |
| end_date | str | 报告期 |
| eps | float | 基本每股收益 |
| dt_eps | float | 稀释每股收益 |
| total_revenue_ps | float | 每股营业总收入 |
| revenue_ps | float | 每股营业收入 |
| capital_rese_ps | float | 每股资本公积 |
| surplus_rese_ps | float | 每股盈余公积 |
| undist_profit_ps | float | 每股未分配利润 |
| extra_item | float | 非经常性损益 |
| profit_dedt | float | 扣除非经常性损益后的净利润 |
| gross_margin | float | 毛利 |
| current_ratio | float | 流动比率 |
| quick_ratio | float | 速动比率 |
| cash_ratio | float | 保守速动比率 |
| ar_turn | float | 应收账款周转率 |
| ca_turn | float | 流动资产周转率 |
| fa_turn | float | 固定资产周转率 |
| assets_turn | float | 总资产周转率 |
| op_income | float | 经营活动净收益 |
| valuechange_income | float | 价值变动净收益 |
| interst_income | float | 利息费用 |
| daa | float | 总资产增长率 |
| ebit | float | 息税前利润 |
| ebitda | float | 息税折旧摊销前利润 |
| fcff | float | 企业自由现金流量 |
| fcfe | float | 股权自由现金流量 |

#### 3.5 业绩预告 (forecast)

**接口名称**: `forecast`
**权限要求**: 2000 积分
**更新频率**: 实时更新
**描述**: 获取上市公司业绩预告数据

**输入参数**:
| 参数名 | 类型 | 必选 | 描述 |
|--------|------|------|------|
| ts_code | str | N | 股票代码 |
| ann_date | str | N | 公告日期 |
| start_date | str | N | 公告开始日期 |
| end_date | str | N | 公告结束日期 |
| period | str | N | 报告期 |
| type | str | N | 预告类型 |

#### 3.6 业绩快报 (express)

**接口名称**: `express`
**权限要求**: 2000 积分
**更新频率**: 实时更新
**描述**: 获取上市公司业绩快报数据

### 4. 指数数据类 API

#### 4.1 指数基本信息 (index_basic)

**接口名称**: `index_basic`  
**权限要求**: 基础权限  
**更新频率**: 不定期更新  
**描述**: 获取指数基础信息

#### 4.2 指数日线行情 (index_daily)

**接口名称**: `index_daily`  
**权限要求**: 基础权限  
**更新频率**: 每日更新  
**描述**: 获取指数日线行情数据

### 5. 特色数据类 API

#### 5.1 龙虎榜数据 (top_list)

**接口名称**: `top_list`  
**权限要求**: 2000 积分  
**更新频率**: 每日更新  
**描述**: 获取龙虎榜每日统计数据

#### 5.2 资金流向 (moneyflow)

**接口名称**: `moneyflow`  
**权限要求**: 2000 积分  
**更新频率**: 每日更新  
**描述**: 获取个股资金流向数据

#### 5.3 融资融券 (margin)

**接口名称**: `margin`  
**权限要求**: 2000 积分  
**更新频率**: 每日更新  
**描述**: 获取融资融券交易汇总数据

## 使用限制和注意事项

### 1. 请求频率限制

- 基础用户：每分钟 200 次，每日 500 次
- 高级用户：根据积分等级提升限制
- 建议在请求间添加适当延时

### 2. 数据获取建议

- 批量获取数据时使用日期范围而非逐日请求
- 优先使用缓存机制减少重复请求
- 合理设置字段参数，只获取需要的数据

### 3. 错误处理

- 实现指数退避重试机制
- 监控错误代码并相应处理
- 记录请求日志便于问题排查

### 4. 数据质量

- 注意停牌期间可能无数据
- 财务数据存在修正和重述情况
- 实时数据可能有延迟

## 最佳实践

### 1. 配置管理

```typescript
// 环境变量配置
const config = {
  token: process.env.TUSHARE_TOKEN,
  baseUrl: 'http://api.tushare.pro',
  timeout: 30000,
  retryCount: 3,
  rateLimit: 200,
}
```

### 2. 请求封装

```typescript
async function tushareRequest(apiName: string, params: any) {
  const response = await fetch('http://api.tushare.pro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_name: apiName,
      token: config.token,
      params: params,
    }),
  })
  return response.json()
}
```

### 3. 错误处理

```typescript
async function safeRequest(apiName: string, params: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await tushareRequest(apiName, params)
      if (result.code === 0) return result.data
      if (result.code === 40203) {
        await sleep(60000) // 频率限制，等待1分钟
        continue
      }
      throw new Error(`API Error: ${result.code} - ${result.msg}`)
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(1000 * Math.pow(2, i)) // 指数退避
    }
  }
}
```

## 相关链接

- [Tushare Pro 官网](https://tushare.pro)
- [API 在线调试工具](https://tushare.pro/webclient)
- [积分获取说明](https://tushare.pro/document/1?doc_id=13)
- [数据字典](https://tushare.pro/document/2?doc_id=209)
