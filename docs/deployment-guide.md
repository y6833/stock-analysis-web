# 部署指南

本文档提供了股票分析网站项目的部署说明，包括环境配置、构建过程和部署步骤。

## 目录

1. [环境要求](#环境要求)
2. [环境配置](#环境配置)
3. [构建过程](#构建过程)
4. [部署方法](#部署方法)
   - [手动部署](#手动部署)
   - [自动化部署](#自动化部署)
   - [Docker部署](#docker部署)
5. [环境特定配置](#环境特定配置)
6. [回滚流程](#回滚流程)
7. [监控与日志](#监控与日志)

## 环境要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本
- MySQL 8.0 或更高版本
- Redis 6.x 或更高版本
- Nginx (用于生产环境)
- PM2 (用于进程管理)

## 环境配置

项目使用环境变量进行配置。每个环境（开发、测试、生产）都有自己的环境变量文件：

- `.env.development` - 开发环境配置
- `.env.staging` - 测试环境配置
- `.env.production` - 生产环境配置

此外，还有特定于前端的环境变量文件：

- `.env.development` - 开发环境前端配置
- `.env.staging.local` - 测试环境前端配置
- `.env.production.local` - 生产环境前端配置

## 构建过程

### 前端构建

项目使用Vite进行构建，针对不同环境有不同的构建命令：

```bash
# 开发环境构建
npm run build

# 测试环境构建
npm run build:staging

# 生产环境构建
npm run build:production

# 带分析报告的构建
npm run build:analyze

# 优化构建
npm run build:optimize
```

构建输出位于`dist`目录。

### 后端构建

后端服务器不需要特殊的构建步骤，但需要安装依赖：

```bash
cd server
npm install --production
```

## 部署方法

### 手动部署

#### Windows环境

使用提供的PowerShell脚本进行部署：

```powershell
# 部署到测试环境
npm run deploy:staging

# 部署到生产环境
npm run deploy:production
```

或直接运行脚本：

```powershell
.\scripts\deploy-windows.ps1 -Environment staging
.\scripts\deploy-windows.ps1 -Environment production
```

#### Linux/Unix环境

使用提供的Shell脚本进行部署：

```bash
# 部署到测试环境
./scripts/deploy.sh staging

# 部署到生产环境
./scripts/deploy.sh production
```

### 自动化部署

项目配置了GitHub Actions工作流，可以自动构建和部署：

- 推送到`develop`分支会自动部署到测试环境
- 推送到`main`分支会自动部署到生产环境
- 也可以手动触发工作流，选择要部署的环境

### Docker部署

使用Docker Compose进行容器化部署：

```bash
# 构建Docker镜像
npm run docker:build

# 启动服务
npm run docker:up

# 停止服务
npm run docker:down
```

## 环境特定配置

### 开发环境

- 启用模拟数据
- 启用调试工具
- 禁用性能监控
- API指向本地服务器

### 测试环境

- 禁用模拟数据
- 启用调试工具
- 启用性能监控
- API指向测试服务器

### 生产环境

- 禁用模拟数据
- 禁用调试工具
- 启用性能监控
- API指向生产服务器
- 启用更严格的缓存策略

## 回滚流程

如果部署出现问题，可以使用以下步骤回滚：

1. 使用GitHub Actions界面回滚到之前的成功构建
2. 或手动部署之前的版本：

```bash
# 查看部署历史
pm2 logs

# 回滚到特定版本
npm run deploy:rollback -- v1.2.3
```

## 监控与日志

- 应用程序日志位于`logs`目录
- 使用PM2进行进程监控：`pm2 monit`
- 性能监控数据可在应用程序的管理界面查看
- 错误报告会自动发送到配置的错误跟踪服务