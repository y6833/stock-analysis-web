#!/bin/bash

# 量化交易系统安装脚本
# 用于自动化部署第一阶段的数据获取模块增强

set -e

echo "🚀 开始安装量化交易系统第一阶段..."

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

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 16+ 版本"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        log_error "Node.js 版本过低，需要 16+ 版本"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        log_warning "Python3 未安装，某些功能可能无法使用"
    fi
    
    # 检查MySQL
    if ! command -v mysql &> /dev/null; then
        log_warning "MySQL 客户端未安装，请确保 MySQL 服务器已运行"
    fi
    
    # 检查Redis
    if ! command -v redis-cli &> /dev/null; then
        log_warning "Redis 客户端未安装，请确保 Redis 服务器已运行"
    fi
    
    log_success "系统要求检查完成"
}

# 安装前端依赖
install_frontend_deps() {
    log_info "安装前端依赖..."
    
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json 文件，请在项目根目录运行此脚本"
        exit 1
    fi
    
    npm install
    
    log_success "前端依赖安装完成"
}

# 安装后端依赖
install_backend_deps() {
    log_info "安装后端依赖..."
    
    cd server
    
    if [ ! -f "package.json" ]; then
        log_error "未找到后端 package.json 文件"
        exit 1
    fi
    
    npm install
    
    # 安装ClickHouse客户端
    npm install clickhouse
    
    # 安装WebSocket支持
    npm install egg-socket.io
    
    # 安装其他量化相关依赖
    npm install moment
    npm install lodash
    npm install mathjs
    
    cd ..
    
    log_success "后端依赖安装完成"
}

# 安装Python依赖
install_python_deps() {
    log_info "安装Python依赖..."
    
    if command -v python3 &> /dev/null; then
        # 检查pip
        if ! command -v pip3 &> /dev/null; then
            log_warning "pip3 未安装，跳过Python依赖安装"
            return
        fi
        
        # 创建requirements.txt
        cat > server/scripts/requirements.txt << EOF
akshare>=1.9.0
pandas>=1.5.0
numpy>=1.21.0
h5py>=3.7.0
tables>=3.7.0
qlib>=0.9.0
tushare>=1.2.0
requests>=2.28.0
redis>=4.3.0
clickhouse-driver>=0.2.0
schedule>=1.2.0
python-dotenv>=0.19.0
EOF
        
        # 安装Python依赖
        pip3 install -r server/scripts/requirements.txt
        
        log_success "Python依赖安装完成"
    else
        log_warning "Python3 未安装，跳过Python依赖安装"
    fi
}

# 设置ClickHouse
setup_clickhouse() {
    log_info "设置ClickHouse..."
    
    # 检查ClickHouse是否运行
    if ! curl -s http://localhost:8123/ > /dev/null 2>&1; then
        log_warning "ClickHouse 服务未运行，请手动安装并启动 ClickHouse"
        log_info "安装命令（Ubuntu/Debian）："
        log_info "  curl https://clickhouse.com/ | sh"
        log_info "  sudo ./clickhouse install"
        log_info "  sudo clickhouse start"
        return
    fi
    
    # 创建数据库和表
    log_info "创建ClickHouse数据库和表..."
    
    # 创建初始化SQL脚本
    cat > server/scripts/init_clickhouse.sql << EOF
CREATE DATABASE IF NOT EXISTS stock_data;

CREATE TABLE IF NOT EXISTS stock_data.daily_data (
    symbol String,
    date Date,
    datetime DateTime,
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume UInt64,
    amount Float64,
    change Float64,
    pct_change Float64,
    data_source String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (symbol, date)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS stock_data.minute_data (
    symbol String,
    datetime DateTime,
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume UInt64,
    amount Float64,
    data_source String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(datetime)
ORDER BY (symbol, datetime)
SETTINGS index_granularity = 8192;
EOF
    
    # 执行SQL脚本
    curl -X POST 'http://localhost:8123/' --data-binary @server/scripts/init_clickhouse.sql
    
    log_success "ClickHouse 设置完成"
}

# 设置数据库
setup_database() {
    log_info "设置MySQL数据库..."
    
    # 检查数据库连接
    if ! mysql -h127.0.0.1 -uroot -proot -e "SELECT 1;" > /dev/null 2>&1; then
        log_warning "无法连接到MySQL数据库，请检查连接配置"
        return
    fi
    
    # 运行数据库迁移
    cd server
    npm run migrate
    cd ..
    
    log_success "数据库设置完成"
}

# 设置Redis
setup_redis() {
    log_info "设置Redis..."
    
    # 检查Redis连接
    if ! redis-cli -h 127.0.0.1 -p 6379 -a 123456 ping > /dev/null 2>&1; then
        log_warning "无法连接到Redis，请检查Redis服务是否运行"
        return
    fi
    
    # 清理Redis缓存
    redis-cli -h 127.0.0.1 -p 6379 -a 123456 FLUSHDB
    
    log_success "Redis 设置完成"
}

# 创建配置文件
create_config_files() {
    log_info "创建配置文件..."
    
    # 创建环境变量文件
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# 数据源配置
TUSHARE_TOKEN=983b25aa025eee598034c4741dc776ddc53ddcffbb180cf61
JOINQUANT_TOKEN=

# 数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=stock_analysis

# Redis配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=123456

# ClickHouse配置
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=stock_data

# 应用配置
NODE_ENV=development
PORT=7001
EOF
        log_success "环境变量文件创建完成"
    else
        log_info "环境变量文件已存在，跳过创建"
    fi
    
    # 创建后端环境变量文件
    if [ ! -f "server/.env" ]; then
        cp .env server/.env
        log_success "后端环境变量文件创建完成"
    fi
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 构建前端
    npm run build
    
    log_success "项目构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动后端服务
    cd server
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # 等待后端启动
    sleep 5
    
    # 启动前端服务
    npm run serve &
    FRONTEND_PID=$!
    
    # 启动代理服务
    npm run proxy &
    PROXY_PID=$!
    
    log_success "服务启动完成"
    log_info "前端地址: http://localhost:5173"
    log_info "后端地址: http://localhost:7001"
    log_info "代理地址: http://localhost:3001"
    
    # 保存PID到文件
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    echo $PROXY_PID > .proxy.pid
    
    log_info "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap 'kill $BACKEND_PID $FRONTEND_PID $PROXY_PID; exit' INT
    wait
}

# 主函数
main() {
    echo "🎯 量化交易系统第一阶段安装脚本"
    echo "📋 本脚本将安装以下组件："
    echo "   - 数据源管理器"
    echo "   - ClickHouse时序数据库"
    echo "   - 实时数据推送服务"
    echo "   - 增强版数据同步任务"
    echo ""
    
    read -p "是否继续安装？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "安装已取消"
        exit 0
    fi
    
    check_requirements
    install_frontend_deps
    install_backend_deps
    install_python_deps
    create_config_files
    setup_database
    setup_redis
    setup_clickhouse
    build_project
    
    log_success "🎉 量化交易系统第一阶段安装完成！"
    echo ""
    log_info "下一步："
    log_info "1. 检查配置文件 .env"
    log_info "2. 启动服务: ./scripts/start-services.sh"
    log_info "3. 访问 http://localhost:5173 查看系统"
    echo ""
    
    read -p "是否立即启动服务？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    fi
}

# 运行主函数
main "$@"
