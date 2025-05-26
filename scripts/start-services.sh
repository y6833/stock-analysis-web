#!/bin/bash

# 量化交易系统服务启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 $port 已被占用 ($service)"
        return 1
    fi
    return 0
}

# 等待服务启动
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log_info "等待 $service_name 启动..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log_success "$service_name 启动成功"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name 启动超时"
    return 1
}

# 检查依赖服务
check_dependencies() {
    log_info "检查依赖服务..."
    
    # 检查MySQL
    if ! mysql -h127.0.0.1 -uroot -proot -e "SELECT 1;" > /dev/null 2>&1; then
        log_error "MySQL 服务未运行或连接失败"
        log_info "请启动MySQL服务并确保连接配置正确"
        exit 1
    fi
    log_success "MySQL 连接正常"
    
    # 检查Redis
    if ! redis-cli -h 127.0.0.1 -p 6379 -a 123456 ping > /dev/null 2>&1; then
        log_error "Redis 服务未运行或连接失败"
        log_info "请启动Redis服务并确保连接配置正确"
        exit 1
    fi
    log_success "Redis 连接正常"
    
    # 检查ClickHouse（可选）
    if curl -s http://localhost:8123/ > /dev/null 2>&1; then
        log_success "ClickHouse 连接正常"
    else
        log_warning "ClickHouse 服务未运行，时序数据功能将不可用"
    fi
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    if ! check_port 7001 "后端服务"; then
        log_error "后端端口 7001 已被占用，请先停止相关服务"
        exit 1
    fi
    
    cd server
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "未找到后端 package.json 文件"
        exit 1
    fi
    
    # 启动后端服务
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../.backend.pid
    
    cd ..
    
    # 等待后端启动
    if wait_for_service "http://localhost:7001" "后端服务"; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
    else
        log_error "后端服务启动失败"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    if ! check_port 5173 "前端服务"; then
        log_error "前端端口 5173 已被占用，请先停止相关服务"
        exit 1
    fi
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "未找到前端 package.json 文件"
        exit 1
    fi
    
    # 启动前端服务
    npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .frontend.pid
    
    # 等待前端启动
    if wait_for_service "http://localhost:5173" "前端服务"; then
        log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
    else
        log_error "前端服务启动失败"
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
}

# 启动代理服务
start_proxy() {
    log_info "启动代理服务..."
    
    if ! check_port 3001 "代理服务"; then
        log_warning "代理端口 3001 已被占用，跳过代理服务启动"
        return
    fi
    
    # 检查代理配置文件
    if [ -f "proxy-server.js" ]; then
        node proxy-server.js > logs/proxy.log 2>&1 &
        PROXY_PID=$!
        echo $PROXY_PID > .proxy.pid
        
        # 等待代理启动
        if wait_for_service "http://localhost:3001" "代理服务"; then
            log_success "代理服务启动成功 (PID: $PROXY_PID)"
        else
            log_warning "代理服务启动失败，但不影响主要功能"
        fi
    else
        log_warning "未找到代理配置文件，跳过代理服务启动"
    fi
}

# 启动数据同步任务
start_data_sync() {
    log_info "启动数据同步任务..."
    
    # 创建Python数据同步脚本
    if [ -f "server/scripts/data_sync.py" ]; then
        cd server/scripts
        python3 data_sync.py > ../../logs/data_sync.log 2>&1 &
        DATA_SYNC_PID=$!
        echo $DATA_SYNC_PID > ../../.data_sync.pid
        cd ../..
        
        log_success "数据同步任务启动成功 (PID: $DATA_SYNC_PID)"
    else
        log_warning "未找到数据同步脚本，跳过数据同步任务启动"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    log_success "🎉 量化交易系统启动完成！"
    echo ""
    echo "📊 服务状态："
    echo "  ✅ 前端服务: http://localhost:5173"
    echo "  ✅ 后端服务: http://localhost:7001"
    
    if [ -f ".proxy.pid" ]; then
        echo "  ✅ 代理服务: http://localhost:3001"
    fi
    
    if [ -f ".data_sync.pid" ]; then
        echo "  ✅ 数据同步: 运行中"
    fi
    
    echo ""
    echo "📋 管理命令："
    echo "  停止服务: ./scripts/stop-services.sh"
    echo "  查看日志: tail -f logs/*.log"
    echo "  重启服务: ./scripts/restart-services.sh"
    echo ""
    echo "🔗 快速链接："
    echo "  系统首页: http://localhost:5173"
    echo "  API文档: http://localhost:7001/api/docs"
    echo "  管理后台: http://localhost:5173/admin"
    echo ""
}

# 创建日志目录
create_log_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        log_info "创建日志目录: logs/"
    fi
}

# 清理旧的PID文件
cleanup_old_pids() {
    for pid_file in .backend.pid .frontend.pid .proxy.pid .data_sync.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ! kill -0 "$pid" 2>/dev/null; then
                rm -f "$pid_file"
            fi
        fi
    done
}

# 信号处理
cleanup() {
    log_info "正在停止服务..."
    
    # 停止所有服务
    for pid_file in .backend.pid .frontend.pid .proxy.pid .data_sync.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                log_info "停止服务 (PID: $pid)"
            fi
            rm -f "$pid_file"
        fi
    done
    
    log_success "所有服务已停止"
    exit 0
}

# 主函数
main() {
    echo "🚀 量化交易系统服务启动脚本"
    echo ""
    
    # 设置信号处理
    trap cleanup INT TERM
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "server" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    create_log_dir
    cleanup_old_pids
    check_dependencies
    
    # 启动服务
    start_backend
    start_frontend
    start_proxy
    start_data_sync
    
    show_status
    
    # 保持脚本运行
    log_info "按 Ctrl+C 停止所有服务"
    while true; do
        sleep 1
    done
}

# 运行主函数
main "$@"
