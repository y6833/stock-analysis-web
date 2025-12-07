# 股票分析系统 (Stock Analysis Web)

基于 Vue 3 + TypeScript 开发的专业股票分析系统，提供全面的技术分析、基本面分析和市场数据展示功能。

## 📋 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [部署指南](#部署指南)
- [API 文档](#api-文档)
- [开发指南](#开发指南)

## 🎯 项目概述

这是一个专业的股票分析系统，已完成了大部分核心功能，包括：

- ✅ **个性化仪表盘** - 自定义布局和关注列表
- ✅ **高级技术分析工具** - MACD、KDJ、RSI、布林带等指标
- ✅ **基本面分析** - 财务数据、财报解读、行业对比
- ✅ **市场扫描器** - 股票筛选、异动监控、板块轮动
- ✅ **回测与策略** - 专业回测引擎、策略优化
- ✅ **风险管理** - VaR 计算、压力测试、止损止盈
- ✅ **仓位管理** - Kelly 公式、风险平价、动态调整
- ✅ **会员系统** - 多级会员、权限管理
- ✅ **数据集成** - 多数据源支持（Tushare、AKShare 等）

## ✨ 核心功能

### 1. 个性化仪表盘

- 自定义布局和组件
- 关注列表管理
- 市场概览和指数监控
- 快速筛选功能

### 2. 技术分析工具

- **技术指标**：MACD、KDJ、RSI、布林带、量能指标等
- **形态识别**：自动识别头肩顶、双底、十字星等形态
- **趋势线工具**：绘制趋势线、支撑/阻力位
- **多时间周期**：日线、周线、月线等

### 3. 基本面分析

- 财务数据展示（营收、利润、ROE 等）
- 财报自动解读
- 行业对比分析
- 估值分析（PE、PB、PS 等）

### 4. 市场扫描器

- 多条件股票筛选
- 异动监控和提醒
- 板块轮动分析
- 筛选方案保存

### 5. 回测与策略

- 事件驱动回测引擎
- 精确交易成本建模
- 策略参数优化
- 多策略支持

### 6. 风险管理

- **VaR 风险价值计算**：历史模拟法、参数法、蒙特卡洛
- **压力测试**：历史情景、假设情景、极端事件
- **风险预警**：实时监控、多级预警
- **止损止盈**：多种策略（固定、移动、ATR、波动率）

### 7. 仓位管理

- **Kelly 公式**：基于胜率和盈亏比的最优仓位
- **风险平价**：等风险贡献的多资产配置
- **动态调整**：根据市场波动率实时调整

### 8. 会员系统

- 多级会员（普通、会员、高级、企业）
- 功能权限控制
- 逗币系统和充值管理
- 管理员后台

## 🛠️ 技术栈

### 前端

- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **状态管理**：Pinia
- **路由**：Vue Router
- **图表库**：ECharts
- **UI 组件**：Element Plus

### 后端

- **框架**：Node.js + Egg.js
- **数据库**：MySQL (40+张表)
- **缓存**：Redis (多级缓存策略)
- **认证**：JWT + 会员权限系统

### 数据源

- **Tushare Pro API**：股票基本信息、历史数据、财务数据
- **AKShare API**：实时行情、财经新闻、宏观数据
- **新浪财经 API**：实时行情、分时数据
- **东方财富 API**：资金流向、板块数据

### 开发工具

- **测试框架**：Vitest + Vue Test Utils (前端)，Egg-Mock (后端)
- **代码规范**：ESLint + Prettier
- **版本控制**：Git
- **部署工具**：PM2、Docker

## 🚀 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本
- MySQL 8.0 或更高版本
- Redis 6.x 或更高版本

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 环境配置

创建环境变量文件：

```bash
# 根目录 .env
VITE_API_BASE_URL=http://localhost:7001
TUSHARE_API_TOKEN=your_tushare_token
REDIS_URL=redis://localhost:6379
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=stock_analysis
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password
```

### 启动开发服务器

```bash
# 启动前端开发服务器
npm run serve

# 启动后端服务器（新终端）
npm run dev

# 或使用一键启动（前端+代理）
npm run start
```

前端服务运行在 `http://localhost:5173`  
后端服务运行在 `http://localhost:7001`

### 生产环境构建

```bash
# 构建前端
npm run build

# 启动生产服务器
npm run start:prod
```

## 📁 项目结构

```
stock-analysis-web/
├── src/                    # 前端源代码
│   ├── components/         # Vue组件
│   ├── views/              # 页面视图
│   ├── services/           # 业务服务
│   ├── stores/             # Pinia状态管理
│   ├── router/             # 路由配置
│   └── utils/              # 工具函数
├── server/                 # 后端服务器
│   ├── app/                # 应用代码
│   │   ├── controller/    # 控制器
│   │   ├── service/        # 服务层
│   │   ├── model/          # 数据模型
│   │   └── router/         # 路由
│   ├── config/             # 配置文件
│   ├── database/           # 数据库相关
│   └── scripts/            # 脚本文件
├── scripts/                # 项目脚本
│   ├── deploy-windows.ps1  # Windows部署脚本
│   ├── optimize-build.js   # 构建优化
│   └── clear-cache.js      # 缓存清理
├── public/                 # 静态资源
├── dist/                   # 构建输出
├── docs/                   # 文档（已整合到README）
└── package.json            # 项目配置
```

## 📦 部署指南

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down
```

### PM2 部署

```bash
# 生产环境
npm run start:prod

# 测试环境
npm run start:staging
```

### Windows 部署

```powershell
# 部署到测试环境
npm run deploy:staging

# 部署到生产环境
npm run deploy:production
```

## 📚 API 文档

### 数据获取接口

- `GET /api/v1/stock/list` - 获取股票列表
- `GET /api/v1/stock/:symbol/quote` - 获取股票行情
- `GET /api/v1/stock/:symbol/history` - 获取历史数据
- `GET /api/v1/stock/:symbol/financial` - 获取财务数据

### 分析接口

- `POST /api/v1/analysis/technical` - 技术分析
- `POST /api/v1/analysis/fundamental` - 基本面分析
- `POST /api/v1/screener/search` - 股票筛选

### 回测接口

- `POST /api/v1/backtest/run` - 运行回测
- `GET /api/v1/backtest/:id/result` - 获取回测结果
- `POST /api/v1/backtest/optimize` - 参数优化

### 风险管理接口

- `POST /api/v1/risk/var` - VaR 计算
- `POST /api/v1/risk/stress-test` - 压力测试
- `GET /api/v1/risk/alerts` - 风险预警

### 用户接口

- `POST /api/v1/user/register` - 用户注册
- `POST /api/v1/user/login` - 用户登录
- `GET /api/v1/user/profile` - 获取用户信息
- `PUT /api/v1/user/profile` - 更新用户信息

完整 API 文档请参考后端代码中的路由定义。

## 💻 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码规范检查：

```bash
# 检查代码
npm run ci:lint

# 自动修复
npm run format
```

### Kronos 股票预测

```bash
cd server
python predict_api.py
```

### 测试

```bash
# 运行前端测试
npm test

# 运行后端测试
npm run test:server

# 生成测试覆盖率
npm run test:coverage
```

### 数据库迁移

```bash
cd server
npm run migrate
```

### 数据缓存策略

系统采用多级缓存策略：

1. **本地缓存 (localStorage)**：用户偏好、会话数据
2. **Redis 缓存**：股票列表、行情数据（1-24 小时）
3. **MySQL 数据库**：用户数据、分析记录、交易历史
4. **外部 API**：实时数据获取

### 数据源管理

系统支持多个数据源，可自动切换：

- Tushare Pro API（主要数据源）
- AKShare API（备用数据源）
- 新浪财经 API（实时行情）
- 东方财富 API（资金流向）

数据源切换限制：1 小时内只能切换一次（会员功能）

## 🔐 安全考虑

- JWT Token 认证
- 密码加密存储
- API 请求频率限制
- XSS 和 SQL 注入防护
- 敏感数据脱敏处理

## 📊 性能优化

- 组件懒加载
- 数据分页加载
- 图表渲染优化
- 多级缓存策略
- API 请求优化

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

MIT License

## 📧 联系方式

- **项目仓库**：https://github.com/y6833/stock-analysis-web.git
- **问题反馈**：请通过 GitHub Issues 提交

---

**注意**：本项目仅供学习和研究使用，不构成任何投资建议。投资有风险，入市需谨慎。
