#!/bin/bash

# 策略系统测试脚本
# 测试第三阶段策略模块的各项功能

echo "🧪 开始测试策略系统..."

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

# 测试计数器
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
        log_success "✅ $test_name - 通过"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "❌ $test_name - 失败"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 检查文件存在性
check_file_exists() {
    local file_path="$1"
    local description="$2"
    
    run_test "$description" "test -f '$file_path'"
}

# 检查目录存在性
check_dir_exists() {
    local dir_path="$1"
    local description="$2"
    
    run_test "$description" "test -d '$dir_path'"
}

# 检查npm包是否安装
check_npm_package() {
    local package_name="$1"
    local description="$2"
    
    run_test "$description" "npm list $package_name --depth=0"
}

# 测试前端文件结构
test_frontend_structure() {
    log_info "测试前端文件结构..."
    
    # 策略服务文件
    check_file_exists "src/services/strategy/StrategyManager.ts" "策略管理器文件"
    check_file_exists "src/services/strategy/StrategyOptimizer.ts" "策略优化器文件"
    check_file_exists "src/services/strategy/StrategyEvaluator.ts" "策略评估器文件"
    
    # 策略实现文件
    check_file_exists "src/services/strategy/strategies/BaseStrategy.ts" "策略基类文件"
    check_file_exists "src/services/strategy/strategies/FactorStrategy.ts" "因子策略文件"
    check_file_exists "src/services/strategy/strategies/MLStrategy.ts" "机器学习策略文件"
    check_file_exists "src/services/strategy/strategies/TimingStrategy.ts" "择时策略文件"
    check_file_exists "src/services/strategy/strategies/PortfolioStrategy.ts" "组合策略文件"
    
    # 组件文件
    check_file_exists "src/components/strategy/StrategyVisualization.vue" "策略可视化组件"
    
    # 配置文件
    check_file_exists "src/config/strategy.config.ts" "策略配置文件"
}

# 测试后端文件结构
test_backend_structure() {
    log_info "测试后端文件结构..."
    
    # 服务文件
    check_file_exists "server/app/service/strategy.js" "策略服务文件"
    check_file_exists "server/app/controller/strategy.js" "策略控制器文件"
    
    # 机器学习服务
    check_file_exists "server/ml_service/ml_engine.py" "Python机器学习引擎"
    
    # 数据库文件
    check_file_exists "server/database/create_strategy_tables.sql" "策略数据库表结构"
}

# 测试依赖包安装
test_dependencies() {
    log_info "测试依赖包安装..."
    
    # 前端依赖
    check_npm_package "echarts" "ECharts图表库"
    check_npm_package "mathjs" "数学计算库"
    check_npm_package "ml-matrix" "机器学习矩阵库"
    
    # 后端依赖
    cd server
    check_npm_package "simple-statistics" "统计计算库"
    check_npm_package "uuid" "UUID生成库"
    cd ..
}

# 测试Python环境
test_python_environment() {
    log_info "测试Python环境..."
    
    # 检查Python是否安装
    if command -v python3 &> /dev/null; then
        log_success "Python3 已安装"
        
        # 检查Python包
        run_test "NumPy包" "python3 -c 'import numpy'"
        run_test "Pandas包" "python3 -c 'import pandas'"
        run_test "Scikit-learn包" "python3 -c 'import sklearn'"
        run_test "XGBoost包" "python3 -c 'import xgboost'"
        
    elif command -v python &> /dev/null; then
        log_success "Python 已安装"
        
        # 检查Python包
        run_test "NumPy包" "python -c 'import numpy'"
        run_test "Pandas包" "python -c 'import pandas'"
        run_test "Scikit-learn包" "python -c 'import sklearn'"
        run_test "XGBoost包" "python -c 'import xgboost'"
    else
        log_warning "Python 未安装，机器学习功能可能受限"
    fi
}

# 测试数据库连接
test_database_connection() {
    log_info "测试数据库连接..."
    
    if command -v mysql &> /dev/null; then
        # 测试MySQL连接
        run_test "MySQL连接" "mysql -u root -proot -e 'SELECT 1' 2>/dev/null"
        
        # 测试数据库是否存在
        run_test "stock_analysis数据库" "mysql -u root -proot -e 'USE stock_analysis; SELECT 1' 2>/dev/null"
        
        # 测试策略表是否存在
        run_test "strategies表" "mysql -u root -proot stock_analysis -e 'DESCRIBE strategies' 2>/dev/null"
        run_test "strategy_executions表" "mysql -u root -proot stock_analysis -e 'DESCRIBE strategy_executions' 2>/dev/null"
    else
        log_warning "MySQL未安装，请手动检查数据库"
    fi
}

# 测试API接口
test_api_endpoints() {
    log_info "测试API接口..."
    
    # 检查服务是否运行
    if curl -s http://localhost:7001 > /dev/null 2>&1; then
        log_success "后端服务正在运行"
        
        # 测试策略相关API
        run_test "策略模板API" "curl -s http://localhost:7001/api/strategy/templates"
        run_test "策略列表API" "curl -s http://localhost:7001/api/strategy"
        
    else
        log_warning "后端服务未运行，请先启动服务"
    fi
}

# 测试配置文件
test_configuration() {
    log_info "测试配置文件..."
    
    # 检查TypeScript配置
    check_file_exists "tsconfig.json" "TypeScript配置文件"
    check_file_exists "vite.config.ts" "Vite配置文件"
    
    # 检查包配置
    check_file_exists "package.json" "前端包配置文件"
    check_file_exists "server/package.json" "后端包配置文件"
}

# 生成测试报告
generate_report() {
    echo ""
    echo "================================"
    echo "📊 测试报告"
    echo "================================"
    echo "总测试数: $TOTAL_TESTS"
    echo "通过测试: $PASSED_TESTS"
    echo "失败测试: $FAILED_TESTS"
    echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 所有测试通过！策略系统已准备就绪"
    else
        log_warning "⚠️  有 $FAILED_TESTS 个测试失败，请检查相关配置"
    fi
    
    echo ""
    echo "🔧 如果测试失败，请尝试："
    echo "  1. 重新运行安装脚本: ./scripts/setup-phase3-strategies.sh"
    echo "  2. 检查依赖是否正确安装"
    echo "  3. 确保数据库服务正常运行"
    echo "  4. 启动前端和后端服务"
}

# 主函数
main() {
    echo "🧪 策略系统测试"
    echo "================================"
    
    test_frontend_structure
    test_backend_structure
    test_dependencies
    test_python_environment
    test_database_connection
    test_api_endpoints
    test_configuration
    
    generate_report
}

# 执行主函数
main "$@"
