#!/bin/bash

# 量化交易系统第二阶段安装脚本
# 特征工程模块安装和配置

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

# 检查第一阶段是否完成
check_phase1_completion() {
    log_info "检查第一阶段完成状态..."
    
    # 检查关键文件是否存在
    local required_files=(
        "src/services/dataSource/DataSourceManager.ts"
        "server/app/service/clickhouse.js"
        "src/services/realtimeDataService.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "第一阶段文件 $file 不存在，请先完成第一阶段安装"
            exit 1
        fi
    done
    
    log_success "第一阶段检查通过"
}

# 安装前端依赖
install_frontend_dependencies() {
    log_info "安装前端特征工程依赖..."
    
    # 安装数学计算库
    npm install mathjs
    npm install ml-matrix
    npm install simple-statistics
    
    # 安装图表库
    npm install echarts
    npm install @types/echarts
    
    # 安装数据处理库
    npm install lodash
    npm install @types/lodash
    
    log_success "前端依赖安装完成"
}

# 安装后端依赖
install_backend_dependencies() {
    log_info "安装后端特征工程依赖..."
    
    cd server
    
    # 安装数学计算库
    npm install mathjs
    npm install ml-matrix
    npm install simple-statistics
    
    # 安装数据处理库
    npm install lodash
    npm install moment
    
    # 安装机器学习库
    npm install ml-regression
    npm install ml-kmeans
    
    cd ..
    
    log_success "后端依赖安装完成"
}

# 安装Python科学计算库
install_python_libraries() {
    log_info "安装Python科学计算库..."
    
    if command -v python3 &> /dev/null; then
        # 更新requirements.txt
        cat >> server/scripts/requirements.txt << EOF

# 第二阶段：特征工程依赖
scikit-learn>=1.3.0
scipy>=1.10.0
statsmodels>=0.14.0
ta-lib>=0.4.0
empyrical>=0.5.0
pyfolio>=0.9.0
zipline>=2.2.0
backtrader>=1.9.0
vectorbt>=0.25.0
alphalens>=0.4.0
EOF
        
        # 安装Python依赖
        pip3 install -r server/scripts/requirements.txt
        
        log_success "Python科学计算库安装完成"
    else
        log_warning "Python3 未安装，跳过Python库安装"
    fi
}

# 创建因子数据库表
create_factor_tables() {
    log_info "创建因子数据库表..."
    
    # 检查MySQL连接
    if ! mysql -h127.0.0.1 -uroot -proot -e "SELECT 1;" > /dev/null 2>&1; then
        log_warning "无法连接到MySQL数据库，跳过表创建"
        return
    fi
    
    # 创建SQL脚本
    cat > server/scripts/create_factor_tables.sql << EOF
-- 因子数据表
CREATE TABLE IF NOT EXISTS factor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    factor_name VARCHAR(100) NOT NULL,
    factor_type ENUM('technical', 'fundamental', 'alternative') NOT NULL,
    factor_value DECIMAL(20,8),
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_symbol_date (symbol, date),
    INDEX idx_factor_name (factor_name),
    INDEX idx_factor_type (factor_type),
    UNIQUE KEY uk_symbol_factor_date (symbol, factor_name, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 因子配置表
CREATE TABLE IF NOT EXISTS factor_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factor_name VARCHAR(100) NOT NULL UNIQUE,
    factor_type ENUM('technical', 'fundamental', 'alternative') NOT NULL,
    description TEXT,
    category VARCHAR(50),
    parameters JSON,
    enabled BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    cache_expiry INT DEFAULT 3600,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 因子计算任务表
CREATE TABLE IF NOT EXISTS factor_calculation_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    factor_configs JSON NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    progress INT DEFAULT 0,
    result JSON,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_status (symbol, status),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 因子相关性矩阵表
CREATE TABLE IF NOT EXISTS factor_correlations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    factor1_name VARCHAR(100) NOT NULL,
    factor2_name VARCHAR(100) NOT NULL,
    correlation DECIMAL(10,8) NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_factors (factor1_name, factor2_name),
    UNIQUE KEY uk_symbol_factors_range (symbol, factor1_name, factor2_name, date_range_start, date_range_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认因子配置
INSERT IGNORE INTO factor_configs (factor_name, factor_type, description, category, parameters, priority) VALUES
('sma_cross', 'technical', '均线交叉信号', '趋势跟踪', '{"shortPeriod": 5, "longPeriod": 20}', 1),
('rsi_divergence', 'technical', 'RSI背离信号', '动量指标', '{"period": 14, "lookback": 20}', 2),
('macd_signal', 'technical', 'MACD信号强度', '动量指标', '{"fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9}', 3),
('bollinger_position', 'technical', '布林带位置', '波动性指标', '{"period": 20, "multiplier": 2}', 4),
('volume_price_trend', 'technical', '量价趋势', '量价关系', '{"period": 10}', 5),
('momentum', 'technical', '动量指标', '动量指标', '{"period": 10}', 6),
('volatility', 'technical', '波动率', '波动性指标', '{"period": 20}', 7),
('trend_strength', 'technical', '趋势强度', '趋势指标', '{"period": 20}', 8),
('roe_trend', 'fundamental', 'ROE趋势', '盈利能力', '{"lookback": 4}', 9),
('pe_relative', 'fundamental', '相对PE', '估值指标', '{}', 10),
('debt_ratio', 'fundamental', '债务比率', '财务健康', '{}', 11),
('revenue_growth', 'fundamental', '营收增长', '成长能力', '{"periods": 4}', 12),
('profit_margin', 'fundamental', '利润率', '盈利能力', '{}', 13),
('sentiment_score', 'alternative', '市场情绪', '情绪指标', '{}', 14),
('money_flow', 'alternative', '资金流向', '资金流向', '{"period": 20}', 15),
('correlation_factor', 'alternative', '市场关联性', '关联性指标', '{"period": 60, "benchmark": "000001"}', 16),
('volatility_regime', 'alternative', '波动率状态', '波动性状态', '{"shortPeriod": 10, "longPeriod": 60}', 17);
EOF
    
    # 执行SQL脚本
    mysql -h127.0.0.1 -uroot -proot stock_analysis < server/scripts/create_factor_tables.sql
    
    log_success "因子数据库表创建完成"
}

# 配置ClickHouse因子表
setup_clickhouse_factor_tables() {
    log_info "配置ClickHouse因子表..."
    
    # 检查ClickHouse连接
    if ! curl -s http://localhost:8123/ > /dev/null 2>&1; then
        log_warning "ClickHouse 服务未运行，跳过因子表创建"
        return
    fi
    
    # 创建ClickHouse因子表
    cat > server/scripts/create_clickhouse_factor_tables.sql << EOF
-- 因子数据表
CREATE TABLE IF NOT EXISTS stock_data.factor_data (
    symbol String,
    factor_name String,
    factor_type Enum8('technical' = 1, 'fundamental' = 2, 'alternative' = 3),
    factor_value Float64,
    date Date,
    datetime DateTime,
    metadata String,
    data_source String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (symbol, factor_name, date)
SETTINGS index_granularity = 8192;

-- 因子相关性表
CREATE TABLE IF NOT EXISTS stock_data.factor_correlations (
    symbol String,
    factor1_name String,
    factor2_name String,
    correlation Float64,
    date_range_start Date,
    date_range_end Date,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date_range_start)
ORDER BY (symbol, factor1_name, factor2_name, date_range_start)
SETTINGS index_granularity = 8192;

-- 因子重要性表
CREATE TABLE IF NOT EXISTS stock_data.factor_importance (
    symbol String,
    factor_name String,
    importance_score Float64,
    importance_rank UInt32,
    calculation_method String,
    date Date,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (symbol, date, importance_rank)
SETTINGS index_granularity = 8192;
EOF
    
    # 执行ClickHouse SQL
    curl -X POST 'http://localhost:8123/' --data-binary @server/scripts/create_clickhouse_factor_tables.sql
    
    log_success "ClickHouse因子表创建完成"
}

# 创建因子计算Python脚本
create_factor_calculation_scripts() {
    log_info "创建因子计算Python脚本..."
    
    # 创建Python因子计算脚本
    cat > server/scripts/factor_calculator.py << 'EOF'
#!/usr/bin/env python3
"""
因子计算脚本
使用Python科学计算库进行高性能因子计算
"""

import numpy as np
import pandas as pd
import talib
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class FactorCalculator:
    def __init__(self):
        self.scaler = StandardScaler()
    
    def calculate_technical_factors(self, data):
        """计算技术指标因子"""
        factors = {}
        
        # 价格数据
        high = np.array(data['high'])
        low = np.array(data['low'])
        close = np.array(data['close'])
        volume = np.array(data['volume'])
        
        # 趋势因子
        factors['sma_5'] = talib.SMA(close, timeperiod=5)
        factors['sma_20'] = talib.SMA(close, timeperiod=20)
        factors['ema_12'] = talib.EMA(close, timeperiod=12)
        factors['ema_26'] = talib.EMA(close, timeperiod=26)
        
        # 动量因子
        factors['rsi'] = talib.RSI(close, timeperiod=14)
        factors['momentum'] = talib.MOM(close, timeperiod=10)
        factors['roc'] = talib.ROC(close, timeperiod=10)
        
        # MACD因子
        macd, macd_signal, macd_hist = talib.MACD(close)
        factors['macd'] = macd
        factors['macd_signal'] = macd_signal
        factors['macd_histogram'] = macd_hist
        
        # 波动率因子
        factors['atr'] = talib.ATR(high, low, close, timeperiod=14)
        factors['volatility'] = pd.Series(close).rolling(20).std()
        
        # 布林带因子
        bb_upper, bb_middle, bb_lower = talib.BBANDS(close)
        factors['bb_upper'] = bb_upper
        factors['bb_lower'] = bb_lower
        factors['bb_position'] = (close - bb_lower) / (bb_upper - bb_lower)
        
        # 成交量因子
        factors['volume_sma'] = talib.SMA(volume, timeperiod=20)
        factors['volume_ratio'] = volume / factors['volume_sma']
        
        return factors
    
    def calculate_fundamental_factors(self, financial_data):
        """计算基本面因子"""
        factors = {}
        
        if not financial_data:
            return factors
        
        df = pd.DataFrame(financial_data)
        
        # 盈利能力因子
        factors['roe'] = df['roe']
        factors['roa'] = df['roa']
        factors['gross_margin'] = df['gross_margin']
        factors['net_margin'] = df['net_margin']
        
        # 成长性因子
        factors['revenue_growth'] = df['revenue'].pct_change()
        factors['profit_growth'] = df['net_profit'].pct_change()
        
        # 财务健康因子
        factors['debt_to_equity'] = df['debt_to_equity']
        factors['current_ratio'] = df['current_ratio']
        factors['quick_ratio'] = df['quick_ratio']
        
        # 估值因子
        factors['pe_ratio'] = df['pe_ratio']
        factors['pb_ratio'] = df['pb_ratio']
        
        return factors
    
    def calculate_alternative_factors(self, data, market_data=None):
        """计算另类因子"""
        factors = {}
        
        close = np.array(data['close'])
        volume = np.array(data['volume'])
        
        # 市场微观结构因子
        returns = np.diff(np.log(close))
        factors['skewness'] = pd.Series(returns).rolling(20).skew()
        factors['kurtosis'] = pd.Series(returns).rolling(20).kurt()
        
        # 流动性因子
        factors['amihud_illiquidity'] = np.abs(returns) / volume[1:]
        
        # 波动率因子
        factors['realized_volatility'] = pd.Series(returns).rolling(20).std() * np.sqrt(252)
        
        # 跳跃检测因子
        factors['jump_indicator'] = self.detect_jumps(returns)
        
        # 如果有市场数据，计算beta等因子
        if market_data is not None:
            market_returns = np.diff(np.log(market_data['close']))
            factors['beta'] = self.calculate_rolling_beta(returns, market_returns)
        
        return factors
    
    def detect_jumps(self, returns, threshold=3):
        """检测价格跳跃"""
        rolling_std = pd.Series(returns).rolling(20).std()
        z_scores = np.abs(returns) / rolling_std
        return (z_scores > threshold).astype(int)
    
    def calculate_rolling_beta(self, stock_returns, market_returns, window=60):
        """计算滚动beta"""
        betas = []
        for i in range(len(stock_returns)):
            if i < window:
                betas.append(np.nan)
            else:
                stock_slice = stock_returns[i-window:i]
                market_slice = market_returns[i-window:i]
                
                if len(market_slice) > 0 and np.var(market_slice) > 0:
                    beta = np.cov(stock_slice, market_slice)[0, 1] / np.var(market_slice)
                    betas.append(beta)
                else:
                    betas.append(np.nan)
        
        return np.array(betas)
    
    def calculate_factor_scores(self, factors_dict):
        """计算因子综合评分"""
        # 将所有因子组合成矩阵
        factor_matrix = []
        factor_names = []
        
        for name, values in factors_dict.items():
            if len(values) > 0 and not np.all(np.isnan(values)):
                factor_matrix.append(values)
                factor_names.append(name)
        
        if len(factor_matrix) == 0:
            return {}
        
        factor_matrix = np.array(factor_matrix).T
        
        # 标准化
        factor_matrix_scaled = self.scaler.fit_transform(factor_matrix)
        
        # PCA降维
        pca = PCA(n_components=min(5, factor_matrix_scaled.shape[1]))
        principal_components = pca.fit_transform(factor_matrix_scaled)
        
        # 计算因子重要性
        feature_importance = np.abs(pca.components_).mean(axis=0)
        
        return {
            'factor_names': factor_names,
            'importance_scores': feature_importance,
            'principal_components': principal_components,
            'explained_variance_ratio': pca.explained_variance_ratio_
        }

if __name__ == "__main__":
    # 示例用法
    calculator = FactorCalculator()
    
    # 模拟数据
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    data = {
        'high': np.random.randn(100).cumsum() + 100,
        'low': np.random.randn(100).cumsum() + 95,
        'close': np.random.randn(100).cumsum() + 98,
        'volume': np.random.randint(1000000, 10000000, 100)
    }
    
    # 计算技术因子
    tech_factors = calculator.calculate_technical_factors(data)
    print("技术因子计算完成，共", len(tech_factors), "个因子")
    
    # 计算因子评分
    scores = calculator.calculate_factor_scores(tech_factors)
    print("因子重要性评分完成")
EOF
    
    chmod +x server/scripts/factor_calculator.py
    
    log_success "因子计算Python脚本创建完成"
}

# 创建测试脚本
create_test_scripts() {
    log_info "创建特征工程测试脚本..."
    
    cat > scripts/test-phase2-features.sh << 'EOF'
#!/bin/bash

# 第二阶段特征工程测试脚本

set -e

echo "🧪 测试第二阶段特征工程功能"

# 测试因子计算API
echo "测试因子计算API..."
curl -s -X POST http://localhost:7001/api/factor/calculate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"000001","factorTypes":["technical"]}' | jq .

# 测试因子配置API
echo "测试因子配置API..."
curl -s http://localhost:7001/api/factor/configs | jq .

# 测试因子相关性API
echo "测试因子相关性API..."
curl -s "http://localhost:7001/api/factor/correlation?symbol=000001" | jq .

# 测试因子重要性API
echo "测试因子重要性API..."
curl -s "http://localhost:7001/api/factor/importance?symbol=000001" | jq .

echo "✅ 第二阶段功能测试完成"
EOF
    
    chmod +x scripts/test-phase2-features.sh
    
    log_success "测试脚本创建完成"
}

# 更新配置文件
update_configurations() {
    log_info "更新配置文件..."
    
    # 更新package.json脚本
    if [ -f "package.json" ]; then
        # 添加因子计算相关脚本
        npm pkg set scripts.factor:calculate="node server/scripts/factor_calculator.js"
        npm pkg set scripts.factor:test="./scripts/test-phase2-features.sh"
    fi
    
    log_success "配置文件更新完成"
}

# 主函数
main() {
    echo "🚀 量化交易系统第二阶段：特征工程模块安装"
    echo "📋 本阶段将安装以下组件："
    echo "   - 技术指标因子引擎"
    echo "   - 基本面因子引擎"
    echo "   - 另类因子引擎"
    echo "   - 因子分析和可视化"
    echo "   - 高性能因子计算"
    echo ""
    
    read -p "是否继续安装第二阶段？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "安装已取消"
        exit 0
    fi
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "server" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    check_phase1_completion
    install_frontend_dependencies
    install_backend_dependencies
    install_python_libraries
    create_factor_tables
    setup_clickhouse_factor_tables
    create_factor_calculation_scripts
    create_test_scripts
    update_configurations
    
    log_success "🎉 第二阶段特征工程模块安装完成！"
    echo ""
    log_info "下一步："
    log_info "1. 重启服务: ./scripts/start-services.sh"
    log_info "2. 测试功能: ./scripts/test-phase2-features.sh"
    log_info "3. 访问因子分析页面查看新功能"
    echo ""
    
    read -p "是否立即重启服务？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/stop-services.sh
        sleep 2
        ./scripts/start-services.sh
    fi
}

# 运行主函数
main "$@"
EOF
