# 项目结构与组织

## 目录结构

```
├── .kiro/                  # Kiro AI 助手配置
│   ├── specs/              # 功能规格文档
│   └── steering/           # 指导规则
├── docs/                   # 项目文档
├── public/                 # 静态资源
├── scripts/                # 工具脚本
├── server/                 # 后端服务
│   ├── app/                # 应用代码
│   ├── config/             # 配置文件
│   └── database/           # 数据库相关
└── src/                    # 前端源代码
    ├── assets/             # 静态资源
    ├── components/         # 可复用组件
    │   ├── alerts/         # 提醒相关组件
    │   ├── charts/         # 图表组件
    │   └── common/         # 通用组件
    ├── composables/        # 组合式函数
    ├── config/             # 配置文件
    ├── constants/          # 常量定义
    ├── contexts/           # 上下文提供者
    ├── directives/         # Vue 指令
    ├── modules/            # 功能模块
    ├── plugins/            # 插件
    ├── router/             # 路由配置
    ├── services/           # 服务层
    ├── stores/             # Pinia 状态管理
    ├── tests/              # 测试文件
    ├── types/              # TypeScript 类型定义
    ├── utils/              # 工具函数
    ├── views/              # 页面视图
    └── workers/            # Web Workers
```

## 核心模块说明

### 前端模块

- **components/**: 可复用的 Vue 组件

  - **alerts/**: 提醒相关组件，包括十字星形态提醒
  - **charts/**: 图表相关组件，包括 K 线图、技术指标等
  - **common/**: 通用组件，如表格、表单、模态框等

- **services/**: 服务层，处理 API 调用和数据处理

  - **alertService.ts**: 提醒服务
  - **dataSourceManager.ts**: 数据源管理
  - **tushareService.ts**: Tushare API 服务
  - **userService.ts**: 用户服务

- **stores/**: Pinia 状态管理

  - **userStore.ts**: 用户状态
  - **alertStore.ts**: 提醒状态
  - **stockStore.ts**: 股票数据状态

- **views/**: 页面视图组件
  - **DojiPatternAlertCreateView.vue**: 创建十字星形态提醒
  - **DojiPatternAlertManagementView.vue**: 十字星形态提醒管理

### 后端模块

- **server/app/controller/**: 控制器

  - **alert.js**: 提醒相关 API
  - **stock.js**: 股票数据 API
  - **user.js**: 用户相关 API

- **server/app/service/**: 服务层

  - **alertService.js**: 提醒服务
  - **dataService.js**: 数据服务
  - **userService.js**: 用户服务

- **server/app/model/**: 数据模型
  - **alert.js**: 提醒模型
  - **stock.js**: 股票模型
  - **user.js**: 用户模型

## 命名约定

- **文件命名**:

  - Vue 组件: PascalCase (例如: `DojiPatternAlert.vue`)
  - TypeScript/JavaScript 文件: camelCase (例如: `alertService.ts`)
  - 常量文件: camelCase (例如: `membership.ts`)

- **组件命名**:

  - 页面组件以 "View" 结尾 (例如: `DojiPatternAlertManagementView.vue`)
  - 可复用组件使用功能描述性名称 (例如: `DojiPatternAlertStatistics.vue`)

- **API 路径**:
  - RESTful 风格 (例如: `/api/v1/alerts`, `/api/v1/stocks`)
  - 使用复数名词表示资源集合

## 数据流

1. **前端组件** 通过 **服务层** 调用 API
2. **服务层** 处理 API 响应并更新 **状态管理**
3. **组件** 从 **状态管理** 获取数据并渲染
4. 用户交互触发 **actions**，更新状态并可能调用 API

## 开发规范

- 新功能应先创建规格文档，放在 `.kiro/specs/` 目录下
- 组件应遵循单一职责原则，避免过大的组件
- 业务逻辑应放在服务层，而非组件内
- 使用 TypeScript 类型定义确保类型安全
- 所有 API 调用应通过服务层进行，不在组件中直接调用 API
