#!/bin/bash

# 量化交易系统测试脚本
# 用于验证第一阶段功能是否正常工作

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

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log_info "测试: $test_name"

    if eval "$test_command" > /dev/null 2>&1; then
        log_success "✅ $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_error "❌ $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 测试API端点
test_api_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="${3:-200}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log_info "测试API: $description"

    local response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:7001$endpoint" || echo "000")

    if [ "$response" = "$expected_status" ]; then
        log_success "✅ $description (状态码: $response)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_error "❌ $description (期望: $expected_status, 实际: $response)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 测试数据库连接
test_database_connection() {
    log_info "测试数据库连接..."

    # 测试MySQL连接
    run_test "MySQL连接" "mysql -h127.0.0.1 -uroot -proot -e 'SELECT 1;'"

    # 测试Redis连接
    run_test "Redis连接" "redis-cli -h 127.0.0.1 -p 6379 -a 123456 ping"

    # 测试ClickHouse连接（可选）
    if curl -s http://localhost:8123/ > /dev/null 2>&1; then
        run_test "ClickHouse连接" "curl -s http://localhost:8123/"
    else
        log_warning "ClickHouse未运行，跳过测试"
    fi
}

# 测试服务状态
test_service_status() {
    log_info "测试服务状态..."

    # 测试后端服务
    test_api_endpoint "/api/health" "后端健康检查"

    # 测试前端服务
    run_test "前端服务" "curl -s http://localhost:5173/ | grep -q 'html'"

    # 测试WebSocket连接
    if command -v wscat &> /dev/null; then
        run_test "WebSocket连接" "timeout 5 wscat -c ws://localhost:7001/realtime --execute 'ping'"
    else
        log_warning "wscat未安装，跳过WebSocket测试"
    fi
}

# 测试数据源功能
test_data_sources() {
    log_info "测试数据源功能..."

    # 测试股票列表获取
    test_api_endpoint "/api/stocks" "获取股票列表"

    # 测试股票搜索
    test_api_endpoint "/api/stocks/search?query=000001" "股票搜索"

    # 测试股票数据获取
    test_api_endpoint "/api/stocks/000001/data" "获取股票数据"

    # 测试股票行情
    test_api_endpoint "/api/stocks/000001/quote" "获取股票行情"

    # 测试数据源状态
    test_api_endpoint "/api/data-sources/status" "数据源状态"

    # 测试Tushare数据源
    log_info "测试Tushare数据源..."
    test_api_endpoint "/api/tushare/test" "Tushare连接测试"
    test_api_endpoint "/api/tushare/stock-basic" "Tushare股票基本信息"

    # 测试其他主要数据源
    log_info "测试其他数据源..."
    test_api_endpoint "/api/zhitu/test" "智兔数服连接测试"
    test_api_endpoint "/api/juhe/test" "聚合数据连接测试"
    test_api_endpoint "/api/sina/test" "新浪财经连接测试"
    test_api_endpoint "/api/eastmoney/test" "东方财富连接测试"
}

# 测试技术分析功能
test_technical_analysis() {
    log_info "测试技术分析功能..."

    # 测试技术指标计算
    test_api_endpoint "/api/analysis/indicators?symbol=000001&indicators=ma,macd" "技术指标计算"

    # 测试K线数据
    test_api_endpoint "/api/stocks/000001/kline?period=daily" "K线数据获取"

    # 测试分析结果
    test_api_endpoint "/api/analysis/000001" "股票分析结果"
}

# 测试缓存功能
test_cache_functionality() {
    log_info "测试缓存功能..."

    # 测试缓存状态
    test_api_endpoint "/api/cache/status" "缓存状态"

    # 测试缓存统计
    test_api_endpoint "/api/cache/stats" "缓存统计"

    # 测试Redis缓存
    run_test "Redis缓存写入" "redis-cli -h 127.0.0.1 -p 6379 -a 123456 set test_key test_value"
    run_test "Redis缓存读取" "redis-cli -h 127.0.0.1 -p 6379 -a 123456 get test_key | grep -q test_value"
    run_test "Redis缓存清理" "redis-cli -h 127.0.0.1 -p 6379 -a 123456 del test_key"
}

# 测试用户认证
test_authentication() {
    log_info "测试用户认证..."

    # 测试登录接口
    local login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' \
        http://localhost:7001/api/auth/login)

    if echo "$login_response" | grep -q "token"; then
        log_success "✅ 用户登录"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # 提取token进行后续测试
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

        # 测试需要认证的接口
        local auth_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $token" \
            http://localhost:7001/api/user/profile)

        if [ "$auth_response" = "200" ]; then
            log_success "✅ 认证接口访问"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            log_error "❌ 认证接口访问"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        log_error "❌ 用户登录"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 2))
}

# 测试实时数据推送
test_realtime_data() {
    log_info "测试实时数据推送..."

    # 创建WebSocket测试脚本
    cat > /tmp/ws_test.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:7001/realtime');

ws.on('open', function open() {
    console.log('WebSocket连接成功');

    // 发送订阅请求
    ws.send(JSON.stringify({
        action: 'subscribe',
        type: 'quote',
        symbol: '000001'
    }));

    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 3000);
});

ws.on('message', function message(data) {
    const msg = JSON.parse(data);
    console.log('收到消息:', msg.action);
});

ws.on('error', function error(err) {
    console.error('WebSocket错误:', err.message);
    process.exit(1);
});
EOF

    if node /tmp/ws_test.js > /dev/null 2>&1; then
        log_success "✅ WebSocket实时数据推送"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "❌ WebSocket实时数据推送"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    rm -f /tmp/ws_test.js
}

# 测试数据同步任务
test_data_sync() {
    log_info "测试数据同步任务..."

    # 测试同步状态
    test_api_endpoint "/api/sync/status" "数据同步状态"

    # 测试手动触发同步
    test_api_endpoint "/api/sync/trigger" "手动触发同步" "200"

    # 测试同步历史
    test_api_endpoint "/api/sync/history" "同步历史记录"
}

# 性能测试
test_performance() {
    log_info "测试系统性能..."

    # 测试API响应时间
    local start_time=$(date +%s%N)
    curl -s http://localhost:7001/api/stocks > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))

    if [ $response_time -lt 2000 ]; then
        log_success "✅ API响应时间: ${response_time}ms"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "❌ API响应时间过长: ${response_time}ms"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# 生成测试报告
generate_report() {
    echo ""
    echo "📊 测试报告"
    echo "=================================="
    echo "总测试数: $TOTAL_TESTS"
    echo "通过: $PASSED_TESTS"
    echo "失败: $FAILED_TESTS"
    echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 所有测试通过！系统运行正常"
        return 0
    else
        log_error "⚠️  有 $FAILED_TESTS 个测试失败，请检查系统配置"
        return 1
    fi
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:7001/api/health > /dev/null 2>&1; then
            log_success "服务已启动"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "服务启动超时"
    return 1
}

# 主函数
main() {
    echo "🧪 量化交易系统测试脚本"
    echo "测试第一阶段：数据获取模块增强"
    echo ""

    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "server" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi

    # 等待服务启动
    if ! wait_for_services; then
        log_error "服务未启动，请先运行 ./scripts/start-services.sh"
        exit 1
    fi

    # 运行测试
    test_database_connection
    test_service_status
    test_data_sources
    test_technical_analysis
    test_cache_functionality
    test_authentication
    test_realtime_data
    test_data_sync
    test_performance

    # 生成报告
    generate_report
}

# 运行主函数
main "$@"
