#!/usr/bin/env bash
# Oracle Cloud VM 初始化 — 安装 Docker 与基础依赖
# 用法: sudo ./scripts/oracle/setup-vm.sh

set -euo pipefail

echo "==> 更新系统包..."
apt-get update -qq
apt-get upgrade -y -qq

echo "==> 安装依赖..."
apt-get install -y -qq git curl ca-certificates gnupg

if ! command -v docker &>/dev/null; then
  echo "==> 安装 Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
fi

# 当前用户加入 docker 组（若非 root 登录）
if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "==> 用户 $SUDO_USER 已加入 docker 组（重新登录后生效）"
fi

mkdir -p /opt/stock-analysis-web

echo ""
echo "✅ VM 初始化完成"
echo ""
echo "下一步:"
echo "  1. git clone <你的仓库> /opt/stock-analysis-web"
echo "  2. cp .env.oracle.example .env.oracle && nano .env.oracle"
echo "  3. docker compose -f docker-compose.oracle.yml --env-file .env.oracle up -d --build"
echo "  4. 配置 Cloudflare Tunnel → http://127.0.0.1:7001"
echo ""
echo "完整文档: docs/oracle-cloud-deployment.md"
