# 技术栈与构建系统

## 前端技术栈

- **框架**: Vue 3
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **UI 组件库**: Element Plus
- **图表库**: ECharts
- **HTTP 客户端**: Axios
- **单元测试**: Vitest + Vue Test Utils

## 后端技术栈

- **服务器**: Node.js + Egg.js
- **数据库**: MySQL
- **缓存**: Redis
- **认证**: JWT + 会员权限系统

## 数据源

- **Tushare Pro API**: 股票基本信息、历史数据、财务数据
- **AKShare API**: 实时行情、财经新闻、宏观数据
- **新浪财经 API**: 实时行情、分时数据
- **东方财富 API**: 资金流向、板块数据
- **AllTick API**: 行情数据

## 常用命令

### 开发环境

```sh
# 启动前端服务
npm run serve

# 启动后端服务
npm run dev

# 启动代理服务器（用于解决API跨域问题）
npm run proxy

# 同时启动前端和代理服务器
npm run start
```

### 构建与测试

```sh
# 构建生产版本
npm run build

# 运行所有前端测试
npm test

# 以监视模式运行前端测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 使用UI界面运行测试
npm run test:ui

# 运行后端测试
npm run test:server
```

### 数据源测试

```sh
# 检查数据源状态
npm run check-datasources

# 修复数据源问题
npm run fix-datasources

# 检查API密钥
npm run check-api-keys

# 测试Tushare API
npm run test-tushare

# 测试AKShare API
npm run test-akshare
```

### 系统维护

```sh
# 检查后端状态
npm run check-backend

# 检查Python环境
npm run check-python

# 修复系统错误
npm run fix-system

# 修复所有问题
npm run fix-all
```

## 代码风格与规范

- 使用 Prettier 进行代码格式化
- 遵循 Vue 3 组合式 API 风格
- 使用 TypeScript 类型定义
- 组件使用 PascalCase 命名
- 服务和工具使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名
