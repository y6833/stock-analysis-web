# 股票数据源 API 密钥配置指南

本文档说明如何获取和配置各个数据源的 API 密钥。

## 📋 数据源概览

| 数据源             | 类型      | 费用          | API 密钥要求      | 限制             |
| ------------------ | --------- | ------------- | ----------------- | ---------------- |
| 智兔数服           | 专业付费  | 低成本        | 是                | 按调用次数计费   |
| Yahoo Finance API  | 免费/付费 | 免费版有限制  | 否(免费)/是(付费) | 免费版有请求限制 |
| Google Finance API | 免费      | 免费          | 否                | 有请求频率限制   |
| 聚合数据           | 免费/付费 | 免费 50 次/天 | 是                | 免费版每天 50 次 |

## 🔑 API 密钥获取方法

### 1. 智兔数服 (ZhiTu Data Service)

**官网**: https://www.zhitudata.com/

**获取步骤**:

1. 注册账号：访问智兔数服官网注册企业账号
2. 实名认证：完成企业实名认证
3. 申请 API：在控制台申请股票数据 API 服务
4. 获取密钥：在 API 管理页面获取 API Key 和 Secret

**配置环境变量**:

```bash
ZHITU_API_KEY=D564FC55-057B-4F6F-932C-C115E78BFAE4
ZHITU_BASE_URL=https://api.zhitudata.com
```

**✅ 已配置状态**: 您的智兔数服 API token 已成功配置

**API 文档**: https://docs.zhitudata.com/

**费用说明**:

- 按调用次数计费，费用在日常运营成本中几乎可以忽略不计
- 提供试用额度，可先测试后付费

---

### 2. Yahoo Finance API

**方式一：免费版 (yfinance)**

- 无需 API 密钥
- 通过 Python yfinance 库或直接 HTTP 请求
- 有请求频率限制

**方式二：RapidAPI 付费版**

- 官网: https://rapidapi.com/apidojo/api/yahoo-finance1/
- 获取 RapidAPI 密钥

**配置环境变量**:

```bash
# 免费版（无需密钥）
YAHOO_FINANCE_FREE=true

# 付费版
YAHOO_FINANCE_RAPIDAPI_KEY=your_rapidapi_key
YAHOO_FINANCE_RAPIDAPI_HOST=yahoo-finance1.p.rapidapi.com
```

**API 文档**:

- 免费版: https://pypi.org/project/yfinance/
- 付费版: https://rapidapi.com/apidojo/api/yahoo-finance1/

---

### 3. Google Finance API

**注意**: Google 已停止官方 Finance API，但可通过以下方式获取数据：

**方式一：Google Sheets Finance 函数**

- 通过 Google Sheets API 调用 GOOGLEFINANCE 函数
- 需要 Google Cloud API 密钥

**方式二：第三方 API**

- 使用 Alpha Vantage、Finnhub 等提供的类似服务

**配置环境变量**:

```bash
# Google Sheets方式
GOOGLE_SHEETS_API_KEY=your_google_api_key
GOOGLE_SHEETS_ID=your_sheet_id

# 替代方案：Alpha Vantage
ALPHA_VANTAGE_API_KEY=f6235795d0b5310a44d87a6a41cd9dfc-c-app
```

**获取 Google API 密钥**:

1. 访问 https://console.cloud.google.com/
2. 创建项目或选择现有项目
3. 启用 Google Sheets API
4. 创建凭据（API 密钥）

---

### 4. 聚合数据 (JuHe Data)

**官网**: https://www.juhe.cn/

**获取步骤**:

1. 注册账号：访问聚合数据官网注册
2. 实名认证：完成个人或企业认证
3. 申请 API：在数据中心申请股票数据 API
4. 获取密钥：在我的 API 页面查看 AppKey

**配置环境变量**:

```bash
JUHE_API_KEY=4191aa94e0f3ba88c66b827fbbe56624
JUHE_BASE_URL=http://web.juhe.cn/finance
```

**✅ 已配置状态**: 您的聚合数据 API 密钥已成功配置

**API 文档**: https://www.juhe.cn/docs/api/id/21

**费用说明**:

- 免费版：每天 50 次调用
- 付费版：按套餐购买，价格实惠

---

## ⚙️ 环境变量配置

### 开发环境配置

创建 `.env.local` 文件（不要提交到版本控制）：

```bash
# 智兔数服
ZHITU_API_KEY=D564FC55-057B-4F6F-932C-C115E78BFAE4
ZHITU_API_SECRET=your_zhitu_api_secret
ZHITU_BASE_URL=https://api.zhitudata.com

# Yahoo Finance
YAHOO_FINANCE_FREE=true
YAHOO_FINANCE_RAPIDAPI_KEY=your_rapidapi_key

# Google Finance (使用Alpha Vantage替代)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# 聚合数据
JUHE_API_KEY=your_juhe_appkey
JUHE_BASE_URL=http://web.juhe.cn/finance

# 通用配置
API_REQUEST_TIMEOUT=10000
API_RETRY_COUNT=3
ENABLE_API_CACHE=true
CACHE_DURATION=300000
```

### 生产环境配置

在服务器上设置环境变量或使用配置管理工具：

```bash
export ZHITU_API_KEY="D564FC55-057B-4F6F-932C-C115E78BFAE4"
export JUHE_API_KEY="your_production_juhe_key"
# ... 其他环境变量
```

---

## 🔧 配置验证

### 测试 API 连接

项目提供了 API 连接测试功能：

1. **前端测试页面**: 访问 `/data-source-test` 页面
2. **后端测试接口**: `GET /api/data-source/test?source=zhitu`
3. **命令行测试**: 运行 `npm run test:api`

### 配置检查清单

- [ ] 所有必需的环境变量已设置
- [ ] API 密钥格式正确
- [ ] 网络可以访问 API 服务器
- [ ] API 账户有足够的调用额度
- [ ] 测试接口返回正常数据

---

## 🚨 安全注意事项

1. **密钥保护**:

   - 不要将 API 密钥提交到版本控制系统
   - 使用环境变量或安全的配置管理工具
   - 定期轮换 API 密钥

2. **访问控制**:

   - 限制 API 密钥的访问权限
   - 监控 API 使用情况
   - 设置异常告警

3. **备份方案**:
   - 配置多个数据源作为备份
   - 实现自动故障切换
   - 监控数据源健康状态

---

## 📞 技术支持

如果在配置过程中遇到问题，请：

1. 检查 API 文档和配置是否正确
2. 查看系统日志获取详细错误信息
3. 联系对应数据源的技术支持
4. 在项目 Issues 中提交问题

---

## 📝 更新日志

- 2024-01-XX: 初始版本，支持 4 个主要数据源
- 待更新: 根据实际使用情况更新配置说明

---

**注意**: 本文档会根据 API 提供商的变化进行更新，请定期检查最新版本。
