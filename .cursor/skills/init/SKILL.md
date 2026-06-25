---
name: init
description: >-
  Onboard the agent to the stock-analysis-web codebase: scan structure, read
  README and steering docs, and produce a structured project overview. Use when
  the user invokes /init or asks to initialize context for this repository.
disable-model-invocation: true
---

# /init — Agent 入职

在新的对话或接手本仓库任务时，快速建立对 **stock-analysis-web** 的准确上下文，并向用户输出结构化项目概览。

## 执行流程

### 1. 读取核心文档（并行）

| 优先级 | 路径 | 用途 |
|--------|------|------|
| P0 | `README.md` | 产品功能、快速开始、环境要求 |
| P0 | `.kiro/steering/product.md` | 产品定位与当前开发重点 |
| P0 | `.kiro/steering/tech.md` | 技术栈与常用命令 |
| P0 | `.kiro/steering/structure.md` | 目录结构与命名约定 |
| P1 | `package.json` | 前端脚本与依赖 |
| P1 | `server/package.json` | 后端脚本与依赖 |
| P2 | `.kiro/specs/` 下进行中或最新的 spec | 当前功能规格 |
| P2 | 目标模块内的 `README.md` | 局部约定（按需） |

**禁止**读取 `.env`、`server/.env` 等可能含密钥的文件；仅从 `.env.example` / `server/.env.example` 了解变量名。

### 2. 扫描代码库结构

用 Glob 或目录列举快速确认（无需深读所有文件）：

- `src/views/` — 主要页面
- `src/services/` — 前端 API 层
- `src/stores/` — Pinia stores
- `server/app/controller/` — 后端控制器
- `server/app/router.js` — API 注册

验证 steering 文档是否与现状大致一致；若明显过时，在输出中标注。

### 3. 检查运行环境（可选）

仅当用户可能需要本地运行时执行：

- Node 版本是否满足 README 要求（16+）
- 根目录与 `server/` 下是否存在 `node_modules`
- MySQL / Redis 是否可达（只探测，不修改配置）

用户未要求启动服务时，跳过安装与启动，仅在概览中列出命令。

### 4. 输出项目概览

用**中文**填写以下模板（勿照抄 steering 全文）：

```markdown
## 项目概览 — stock-analysis-web

### 是什么
[1-2 句：产品定位与核心价值]

### 技术栈
- 前端：Vue 3 + TypeScript + Vite + Pinia + Element Plus + ECharts
- 后端：Egg.js + MySQL + Redis + JWT
- 数据源：[Tushare、AKShare 等主要来源]

### 目录地图
| 区域 | 关键路径 | 说明 |
|------|----------|------|
| 前端页面 | `src/views/` | … |
| 前端服务 | `src/services/` | … |
| 状态 | `src/stores/` | … |
| 后端 API | `server/app/controller/` | … |
| 文档 | `docs/`、`.kiro/specs/` | … |

### 开发约定
- 命名：Vue 组件 PascalCase；页面以 `View` 结尾；TS/JS 文件 camelCase
- 数据流：组件 → services → API → stores → 组件
- 业务逻辑放服务层，不在组件内直接调 API
- 新功能规格文档放 `.kiro/specs/`

### 常用命令
| 场景 | 命令 |
|------|------|
| 前端 dev | `npm run serve` |
| 后端 dev | `npm run dev` |
| 一键启动 | `npm run start` |
| 前端测试 | `npm test` |
| 后端测试 | `npm run test:server` |
| 构建 | `npm run build` |

### 当前开发重点
[来自 product.md 与最新 spec]

### 注意事项
- 环境变量见 `.env.example`，勿提交密钥
- [文档与代码不一致处，若有则列出]

### 就绪状态
我已了解本仓库结构与约定，可开始处理你的具体任务。
```

## 约束

- **只读**：不修改代码、不安装依赖、不创建 commit，除非用户在下一条指令中明确要求。
- **简洁**：概览控制在 80 行以内；用路径引用代替长文件列表。
- **诚实**：未读到的模块或 spec 不要编造，标注「未确认」。
