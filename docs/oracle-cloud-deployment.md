# Oracle Cloud 免费 VM 部署指南

前端：**Cloudflare Pages**（免费）  
后端：**Oracle Cloud Always Free VM** + Docker（Egg.js + MySQL + Redis）  
HTTPS：**Cloudflare Tunnel**（免费，无需在 VM 上配证书）

---

## 架构

```
用户
  → Cloudflare Pages（Vue 静态站）
       VITE_API_BASE_URL=https://api.你的域名.com
  → Cloudflare Tunnel（cloudflared，跑在 Oracle VM 上）
  → localhost:7001（Docker api-server）
       ├── MySQL（仅 Docker 内网）
       └── Redis（仅 Docker 内网）
```

---

## 第一步：创建 Oracle Cloud 免费 VM

1. 注册 [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. 创建 **Compute Instance**
   - Shape: **Ampere A1**（ARM，Always Free 额度内）
   - OS: **Ubuntu 22.04** 或 24.04
   - 规格建议：2 OCPU / 12 GB RAM（在免费额度内）
3. 下载 SSH 私钥，记下 **公网 IP**
4. 安全组 / Ingress 规则：至少开放 **22/TCP**（SSH）  
   - 使用 Cloudflare Tunnel 时，**不必**对公网开放 7001/443

```bash
ssh -i your-key.pem ubuntu@<VM_PUBLIC_IP>
```

---

## 第二步：VM 初始化（一键脚本）

在 VM 上执行（需先 `git clone` 本仓库，或上传项目）：

```bash
cd stock-analysis-web
chmod +x scripts/oracle/setup-vm.sh
sudo ./scripts/oracle/setup-vm.sh
```

脚本会安装：Docker、Docker Compose、Git，并创建 `/opt/stock-analysis-web` 目录。

---

## 第三步：配置环境变量

```bash
cd /opt/stock-analysis-web
cp .env.oracle.example .env.oracle
nano .env.oracle
```

**必改项：**

| 变量 | 说明 |
|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 |
| `DB_PASSWORD` | 应用数据库用户密码 |
| `JWT_SECRET` | 随机长字符串（≥32 字符） |
| `ALLOWED_ORIGINS` | Cloudflare Pages 地址，逗号分隔 |
| `DEEPSEEK_API_KEY` | （可选）AI 功能 |

**ALLOWED_ORIGINS 示例：**

```env
ALLOWED_ORIGINS=https://stock-analysis-web.pages.dev,https://stock.你的域名.com
```

---

## 第四步：启动后端 Docker

```bash
docker compose -f docker-compose.oracle.yml --env-file .env.oracle up -d --build
docker compose -f docker-compose.oracle.yml ps
curl -s http://127.0.0.1:7001/api/health/system
```

数据库迁移（首次）：

```bash
docker compose -f docker-compose.oracle.yml exec api-server sh -c "cd /app && npx sequelize-cli db:migrate" 
```

若容器内无 sequelize-cli，可在宿主机进入 server 目录执行，host 改为 VM 内网 IP 或临时映射 3306。

---

## 第五步：Cloudflare Tunnel（API 公网 HTTPS）

### 5.1 在 Cloudflare Dashboard

1. **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**
2. 名称：`stock-api-oracle`
3. 安装 connector：复制 `cloudflared` 安装命令，在 **Oracle VM** 上运行
4. **Public Hostname**：
   - Subdomain: `api`
   - Domain: `你的域名.com`
   - Service: `http://127.0.0.1:7001`
5. 保存后得到：`https://api.你的域名.com`

### 5.2 验证

```bash
curl https://api.你的域名.com/api/health/system
```

---

## 第六步：Cloudflare Pages 前端

1. Cloudflare Dashboard → **Workers & Pages** → 创建 Pages 项目  
   - 连接 GitHub 或本地 `npm run build` 后 `wrangler pages deploy dist`
2. **Settings → Environment variables**（Production）：

```env
VITE_API_BASE_URL=https://api.你的域名.com
```

3. 构建命令：`npm run build`  
4. 输出目录：`dist`

或使用仓库脚本：

```bash
npm run deploy:cf
```

5. 把 Pages 域名加入 `.env.oracle` 的 `ALLOWED_ORIGINS`，重启 API：

```bash
docker compose -f docker-compose.oracle.yml --env-file .env.oracle up -d
```

---

## 第七步：AI 配置（管理后台）

1. 登录站点管理员账号
2. **管理后台 → AI 配置** → 导入 CC Switch JSON → **启用**
3. 密钥保存在 VM 的 `server/data/ai-provider-profiles.json`（已在 `.gitignore`）

---

## 日常运维

```bash
# 查看日志
docker compose -f docker-compose.oracle.yml logs -f api-server

# 更新代码
cd /opt/stock-analysis-web && git pull
docker compose -f docker-compose.oracle.yml --env-file .env.oracle up -d --build

# 备份 MySQL
docker compose -f docker-compose.oracle.yml exec mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" stock_analysis > backup.sql
```

---

## 备选：不用 Tunnel，用 Nginx + Cloudflare 橙云

若已有域名且在 Cloudflare DNS：

1. `A` 记录 `api` → Oracle VM 公网 IP（**代理已开启**）
2. VM 安装 Nginx，使用 `deploy/nginx/oracle-api.conf`
3. SSL 模式：**Flexible**（Cloudflare ↔ 用户 HTTPS，Cloudflare ↔ VM HTTP）

详见 [deploy/nginx/oracle-api.conf](../deploy/nginx/oracle-api.conf)

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 前端 CORS 错误 | 检查 `ALLOWED_ORIGINS` 是否包含 Pages 完整 URL（含 `https://`） |
| API 502 | `docker compose ps` 看 api-server；`curl localhost:7001/api/health/system` |
| Tunnel 不通 | `sudo systemctl status cloudflared` |
| MySQL 起不来 | 检查 `.env.oracle` 密码；`docker compose logs mysql` |

---

## 费用说明

- Oracle Always Free VM：在额度内 **$0/月**
- Cloudflare Pages + Tunnel：**$0**
- 域名：若自有域名，仅域名年费（可用 `*.pages.dev` 免域名费）

---

相关文档：[cloudflare-deployment.md](./cloudflare-deployment.md) · [ai-provider-management.md](./ai-provider-management.md)
