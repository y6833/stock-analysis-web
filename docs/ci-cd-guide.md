# CI/CD 指南

本文档提供了股票分析网站项目的持续集成和持续部署（CI/CD）系统的详细说明，包括工作流程、配置和最佳实践。

## 目录

1. [CI/CD 概述](#cicd-概述)
2. [工作流程](#工作流程)
3. [环境](#环境)
4. [构建过程](#构建过程)
5. [测试策略](#测试策略)
6. [部署流程](#部署流程)
7. [回滚机制](#回滚机制)
8. [监控与通知](#监控与通知)
9. [最佳实践](#最佳实践)

## CI/CD 概述

我们的 CI/CD 系统基于 GitHub Actions 构建，提供了从代码提交到生产部署的完整自动化流程。主要目标包括：

- 自动化代码质量检查和测试
- 确保每次提交都经过验证
- 简化和标准化部署流程
- 提供快速、可靠的回滚机制
- 保持部署历史记录和可追溯性

## 工作流程

CI/CD 工作流程包括以下阶段：

1. **代码质量检查**：静态代码分析、代码风格检查、类型检查
2. **测试**：单元测试、集成测试、性能测试
3. **构建**：编译、打包、优化
4. **部署**：自动部署到目标环境
5. **验证**：部署后验证
6. **通知**：部署结果通知

工作流程触发条件：

- **Push 到 develop 分支**：自动部署到测试环境
- **Push 到 main 分支**：自动部署到生产环境
- **Pull Request**：运行代码质量检查和测试
- **手动触发**：可以手动触发部署或回滚

## 环境

系统支持以下环境：

### 开发环境

- 用于本地开发
- 配置文件：`.env.development`
- 前端配置：`.env.development`

### 测试环境

- 用于功能验证和测试
- 配置文件：`.env.staging`
- 前端配置：`.env.staging.local`
- URL：https://staging.happystockmarket.com

### 生产环境

- 用于最终用户访问
- 配置文件：`.env.production`
- 前端配置：`.env.production.local`
- URL：https://happystockmarket.com

## 构建过程

构建过程使用 Vite 进行前端构建，主要步骤包括：

1. **安装依赖**：`npm ci`
2. **类型检查**：`npm run type-check`
3. **构建**：`npm run build:staging` 或 `npm run build:production`
4. **优化**：`node scripts/optimize-build.js`
5. **创建部署包**：包含前端构建结果、服务器代码和配置文件

构建优化包括：

- 代码分割
- 资源压缩
- 图片优化
- 缓存策略
- 浏览器兼容性处理

## 测试策略

测试策略包括多层次的测试：

### 单元测试

- 使用 Vitest 和 Jest
- 测试单个组件和函数
- 运行命令：`npm run test:unit`

### 集成测试

- 测试组件之间的交互
- 测试 API 集成
- 运行命令：`npm run test:integration`

### 端到端测试

- 使用 Playwright
- 测试完整用户流程
- 在多个浏览器中运行
- 运行命令：`npm run test:e2e`

### 性能测试

- 测试应用性能
- 检测性能退化
- 运行命令：`npm run test:performance`

### 可访问性测试

- 使用 axe-core 和 Playwright
- 检查 WCAG 合规性
- 运行命令：`npm run test:a11y`

## 部署流程

部署流程包括以下步骤：

1. **准备**：创建当前部署的备份
2. **上传**：将部署包上传到目标服务器
3. **配置**：应用环境特定配置
4. **重启**：重启应用服务
5. **验证**：验证部署是否成功
6. **通知**：发送部署结果通知

部署使用以下工具和脚本：

- **SSH 部署**：使用 `ssh-deploy` GitHub Action
- **部署脚本**：`scripts/post-deploy.sh`
- **验证脚本**：健康检查 API 端点

## 回滚机制

回滚机制提供了在部署失败时快速恢复的能力：

### 自动回滚

在以下情况下会自动触发回滚：

- 部署后服务未启动
- 健康检查失败

### 手动回滚

可以通过以下方式手动触发回滚：

1. **使用 GitHub Actions**：选择"回滚"部署类型并指定版本
2. **使用回滚脚本**：`scripts/rollback.sh [environment] [version]`

回滚可以使用以下版本：

- 构建号（如 42）
- 备份目录名（如 backup_20250724_120000）

## 监控与通知

CI/CD 系统集成了监控和通知功能：

### 部署监控

- 部署状态监控
- 部署历史记录
- 部署性能指标

### 通知渠道

- **Slack**：部署成功和失败通知
- **电子邮件**：关键错误通知
- **GitHub**：工作流程状态更新

## 最佳实践

### 分支策略

- **main**：生产代码，只接受来自 develop 的合并
- **develop**：开发主分支，用于集成功能
- **feature/***：功能分支，从 develop 分支创建
- **hotfix/***：热修复分支，从 main 分支创建

### 提交规范

- 使用语义化提交消息
- 包含相关 issue 编号
- 保持提交粒度适中

### 部署频率

- **测试环境**：每次提交到 develop 分支
- **生产环境**：计划发布或紧急修复

### 安全最佳实践

- 使用环境变量存储敏感信息
- 定期轮换密钥和凭证
- 限制部署权限

### 文档和可追溯性

- 记录每次部署的详细信息
- 保留部署历史
- 关联部署与代码变更

## 使用说明

### 查看部署历史

```bash
node scripts/deployment-history.js list [environment]
```

### 查看特定部署详情

```bash
node scripts/deployment-history.js show [environment] [version]
```

### 清理旧部署记录

```bash
node scripts/deployment-history.js clean [environment] [keep-count]
```

### 手动触发回滚

```bash
./scripts/rollback.sh [environment] [version]
```