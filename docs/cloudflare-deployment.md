# Cloudflare 部署指南

> **推荐后端托管：** [Oracle Cloud 免费 VM 部署指南](./oracle-cloud-deployment.md)（Egg.js + MySQL + Redis + Tunnel）

## 架构

```
用户 → Cloudflare Pages（静态前端 dist/）
         ↓ HTTPS
       Cloudflare Tunnel / api.你的域名.com
         ↓
       Oracle VM（Egg.js :7001 + MySQL + Redis）
```

## 方式 A：前端直连后端公网地址

1. 将 Egg.js 部署到公网服务器（端口 7001）
2. 配置 CORS 允许 Pages 域名
3. Cloudflare Pages 环境变量：
   ```
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```
4. 构建部署：
   ```bash
   npm run build
   npm run deploy:cf
   ```

## 方式 B：同域 API 反代（推荐）

1. `VITE_API_BASE_URL` **留空**（前端使用相对路径 `/api`）
2. Cloudflare Pages 环境变量：
   ```
   BACKEND_URL=https://api.yourdomain.com
   ```
3. `functions/api/[[path]].js` 自动将 `/api/*` 转发到后端
4. 部署后访问 `https://your-pages.pages.dev/api/health/system` 验证反代

## SPA 路由

`public/_redirects` 已配置 `/* /index.html 200`，支持 Vue Router history 模式。

## 本地验证 Cloudflare 构建

```bash
npm run build
npx wrangler pages dev dist
```

## 后端部署清单

- [ ] 按 [oracle-cloud-deployment.md](./oracle-cloud-deployment.md) 创建 Oracle VM
- [ ] `docker compose -f docker-compose.oracle.yml` 启动后端
- [ ] Cloudflare Tunnel 指向 `http://127.0.0.1:7001`
- [ ] `ALLOWED_ORIGINS` 包含 Pages 域名
- [ ] Pages 设置 `VITE_API_BASE_URL=https://api.你的域名.com`
- [ ] `server/.env` / `.env.oracle` 配置 `DEEPSEEK_API_KEY`（可选）

## 安全注意

- **不要**在 Cloudflare 环境变量中设置 `VITE_DEEPSEEK_API_KEY`
- DeepSeek 密钥仅配置在服务端 `server/.env` 的 `DEEPSEEK_API_KEY`
