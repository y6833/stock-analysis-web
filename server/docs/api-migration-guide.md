# API 迁移指南

## 概述

本指南帮助开发者从旧的 API 结构迁移到新的 v1 RESTful API 结构。新的 API 提供了更好的一致性、版本控制和 GraphQL 支持。

## 主要变更

### 1. API 版本控制

所有 API 端点现在都包含版本前缀：

**旧版本:**

```
GET /api/stocks
POST /api/auth/login
```

**新版本:**

```
GET /api/v1/stocks
POST /api/v1/auth/login
```

### 2. 一致的响应格式

所有 API 响应现在使用统一的格式：

**成功响应:**

```json
{
  "success": true,
  "message": "success",
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "v1"
  }
}
```

**错误响应:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": null,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "v1"
  }
}
```

### 3. RESTful 资源命名

端点现在遵循 RESTful 约定：

| 操作             | 旧端点                                                  | 新端点                                              |
| ---------------- | ------------------------------------------------------- | --------------------------------------------------- |
| 获取关注列表     | `GET /api/watchlists`                                   | `GET /api/v1/watchlists`                            |
| 创建关注列表     | `POST /api/watchlists`                                  | `POST /api/v1/watchlists`                           |
| 获取特定关注列表 | `GET /api/watchlists/:id/stocks`                        | `GET /api/v1/watchlists/:id`                        |
| 关注列表项目     | `POST /api/watchlists/:id/stocks`                       | `POST /api/v1/watchlists/:id/items`                 |
| 更新关注列表项目 | `PUT /api/watchlists/:watchlistId/stocks/:itemId/notes` | `PUT /api/v1/watchlists/:watchlistId/items/:itemId` |

### 4. 分页支持

所有列表端点现在支持标准化分页：

**请求参数:**

- `page`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 20, 最大: 100)
- `sort`: 排序字段 (默认: id)
- `order`: 排序方向 (ASC/DESC, 默认: DESC)

**响应格式:**

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 5. GraphQL 支持

新增 GraphQL 端点，支持灵活的数据查询：

**端点:** `POST /api/v1/graphql`

**示例查询:**

```graphql
query GetStockWithQuote($symbol: String!) {
  stock(symbol: $symbol) {
    symbol
    name
    exchange
    quote {
      price
      change
      changePercent
      volume
    }
  }
}
```

## 迁移步骤

### 1. 更新 API 基础 URL

将所有 API 调用的基础 URL 从 `/api` 更新为 `/api/v1`：

```javascript
// 旧版本
const API_BASE = '/api'

// 新版本
const API_BASE = '/api/v1'
```

### 2. 更新响应处理

更新客户端代码以处理新的响应格式：

```javascript
// 旧版本
axios.get('/api/stocks').then((response) => {
  const stocks = response.data // 直接是数据数组
})

// 新版本
axios.get('/api/v1/stocks').then((response) => {
  const stocks = response.data.data // 数据在data字段中
  const meta = response.data.meta // 元数据信息
})
```

### 3. 更新错误处理

```javascript
// 旧版本
axios.get('/api/stocks').catch((error) => {
  console.error(error.response.data.message)
})

// 新版本
axios.get('/api/v1/stocks').catch((error) => {
  const errorInfo = error.response.data.error
  console.error(`${errorInfo.code}: ${errorInfo.message}`)
})
```

### 4. 实现分页

对于列表数据，添加分页支持：

```javascript
// 获取分页数据
const getStocks = async (page = 1, pageSize = 20) => {
  const response = await axios.get('/api/v1/stocks', {
    params: { page, pageSize },
  })

  return {
    data: response.data.data,
    pagination: response.data.meta.pagination,
  }
}
```

### 5. 版本控制策略

支持多种版本指定方式：

```javascript
// 方式1: URL路径 (推荐)
axios.get('/api/v1/stocks')

// 方式2: 查询参数
axios.get('/api/stocks?version=v1')

// 方式3: 请求头
axios.get('/api/stocks', {
  headers: { 'API-Version': 'v1' },
})

// 方式4: Accept头
axios.get('/api/stocks', {
  headers: { Accept: 'application/vnd.stockanalysis.v1+json' },
})
```

## GraphQL 迁移

### 基本查询

```javascript
// REST方式
const getStock = async (symbol) => {
  const stockResponse = await axios.get(`/api/v1/stocks/${symbol}`)
  const quoteResponse = await axios.get(`/api/v1/stocks/${symbol}/quote`)

  return {
    ...stockResponse.data.data,
    quote: quoteResponse.data.data,
  }
}

// GraphQL方式
const getStock = async (symbol) => {
  const query = `
    query GetStock($symbol: String!) {
      stock(symbol: $symbol) {
        symbol
        name
        exchange
        quote {
          price
          change
          changePercent
        }
      }
    }
  `

  const response = await axios.post('/api/v1/graphql', {
    query,
    variables: { symbol },
  })

  return response.data.data.stock
}
```

### 批量查询

```javascript
// GraphQL批量查询
const getMultipleStocks = async (symbols) => {
  const query = `
    query GetStocks($symbols: [String!]!) {
      stocks(symbols: $symbols) {
        symbol
        name
        quote {
          price
          change
        }
      }
    }
  `

  const response = await axios.post('/api/v1/graphql', {
    query,
    variables: { symbols },
  })

  return response.data.data.stocks
}
```

## 兼容性说明

### 向后兼容

- 旧的 API 端点在过渡期内仍然可用
- 建议在 6 个月内完成迁移
- 旧端点将在 v2 版本中移除

### 新功能

- GraphQL 查询支持
- 统一的错误处理
- 标准化分页
- API 版本控制
- 改进的响应格式

## 测试建议

### 1. 单元测试更新

```javascript
// 更新测试以验证新的响应格式
describe('Stock API v1', () => {
  it('should return stocks with proper format', async () => {
    const response = await request(app).get('/api/v1/stocks').expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('data')
    expect(response.body).toHaveProperty('meta')
    expect(response.body.meta).toHaveProperty('version', 'v1')
  })
})
```

### 2. 集成测试

```javascript
// 测试版本控制
describe('API Versioning', () => {
  it('should handle version in URL path', async () => {
    const response = await request(app).get('/api/v1/stocks').expect(200)

    expect(response.headers['x-api-version']).toBe('v1')
  })

  it('should handle version in header', async () => {
    const response = await request(app).get('/api/stocks').set('API-Version', 'v1').expect(200)

    expect(response.headers['x-api-version']).toBe('v1')
  })
})
```

## 常见问题

### Q: 如何处理现有的 API 调用？

A: 建议逐步迁移，先更新基础 URL，然后更新响应处理逻辑。

### Q: GraphQL 是否会替代 REST API？

A: 不会，两者并存。GraphQL 适合复杂查询，REST 适合简单 CRUD 操作。

### Q: 如何处理认证？

A: 认证方式保持不变，JWT token 仍然通过 Authorization 头传递。

### Q: 分页参数是否必需？

A: 不是必需的，有默认值。但建议明确指定以获得可预测的结果。

## 支持

如有迁移问题，请：

1. 查看 API 文档：`GET /api/v1/docs`
2. 检查 GraphQL Schema：`GET /api/v1/docs/graphql`
3. 联系技术支持团队
