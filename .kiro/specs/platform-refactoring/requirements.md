# 平台重构规格

## 目标

1. 保留现有功能并优化架构
2. 新增 AI 功能（推荐、条件筛选、金股）
3. 支持 Cloudflare Pages 部署
4. 重构视觉设计系统

## 阶段一（已完成）

- [x] 统一 API 基址 `src/utils/apiBase.ts`
- [x] Cloudflare Pages 配置
- [x] 服务端 DeepSeek 代理 + AI 增强推荐
- [x] 前端 AI 中心（推荐 / 筛选 / 金股）
- [x] AI 主题样式
- [x] **AI 配置管理页（CC Switch 兼容）** — `/admin` → AI 配置 Tab

## 阶段三（本次完善）

- [x] 统一剩余 hardcoded API（Dashboard、Predict、tushare、config.ts、WebSocket）
- [x] 推荐历史真实落库 + stats 接 `recommendationPerformanceTracker`
- [x] AI 增强分析接真实股票历史/技术指标数据
- [x] `user_ai_preferences` 迁移 + GET/PUT API + 偏好设置页
- [x] AI 推荐历史页 `/ai/history`
- [x] AI 状态返回真实 Provider/Model
- [x] 智能推荐页：修复 timeHorizon bug、AI 深度分析弹窗、stats 无数据隐藏
- [x] 导航/admin 补 AI 配置入口

## 阶段四（部署 — Oracle + Cloudflare）

- [x] `docker-compose.oracle.yml` 仅后端栈
- [x] CORS 环境变量 `ALLOWED_ORIGINS`
- [x] [docs/oracle-cloud-deployment.md](../../docs/oracle-cloud-deployment.md)
- [x] VM 初始化脚本 `scripts/oracle/setup-vm.sh`
- [ ] 用户自行完成 Oracle 注册与 Tunnel 配置

## 阶段五（样式与工程优化 — 进行中）

- [x] 通用 `PageLayout` 组件 + 全局布局样式（`global.css`）
- [x] AI 子页面统一 `AiPageLayout`（筛选 / 金股 / 历史 / 偏好）
- [x] 修复金股页模板闭合错误
- [x] `realtimeService` 统一 WS 基址 + `VITE_ENABLE_WS` 开关
- [x] `npm run dev:all` 前后端并行启动
- [x] 策略/用户页迁移 PageLayout（推荐、预测、设置、提醒、回测、关注列表、管理后台）
- [x] 市场/组合/十字星批次（扫描器、行业分析、模拟交易、组合管理、仓位管理、十字星 5 页）
- [x] 共享布局：`DojiPageLayout`、`split-layout`、`section-divider`、`feature-intro`
- [x] 新闻/导出/监控/回测/海龟/用户中心批次（7 页）
- [x] 全站 UI 统一迁移（`PageLayout` / `AiPageLayout` / `DojiPageLayout`；保留 Home / Auth / 404 专用布局）
- [x] 推荐绩效自动跟踪（actualReturn 回填 + 定时任务）
- [x] AI E2E 测试（`tests/e2e/ai-features.spec.ts`）

## 部署架构

见 [docs/oracle-cloud-deployment.md](../../docs/oracle-cloud-deployment.md) · [docs/cloudflare-deployment.md](../../docs/cloudflare-deployment.md)
