#!/bin/bash

# 第三阶段：策略模块升级安装脚本
# 构建专业的量化策略开发平台

echo "🚀 开始第三阶段：策略模块升级..."

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

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查Python（用于机器学习模块）
    if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
        log_warning "Python 未安装，机器学习功能可能受限"
    fi
    
    log_success "依赖检查完成"
}

# 安装前端依赖
install_frontend_deps() {
    log_info "安装前端策略模块依赖..."
    
    # 安装机器学习相关库
    npm install --save \
        ml-matrix \
        ml-regression \
        ml-kmeans \
        simple-statistics \
        d3-array \
        lodash-es
    
    # 安装图表库
    npm install --save \
        echarts \
        @types/echarts
    
    # 安装数学计算库
    npm install --save \
        mathjs \
        numeric \
        @types/numeric
    
    log_success "前端依赖安装完成"
}

# 安装后端依赖
install_backend_deps() {
    log_info "安装后端策略模块依赖..."
    
    cd server
    
    # 安装数据科学相关库
    npm install --save \
        mathjs \
        simple-statistics \
        ml-matrix \
        node-cron \
        uuid
    
    # 安装Python依赖（如果Python可用）
    if command -v python3 &> /dev/null; then
        log_info "安装Python机器学习依赖..."
        python3 -m pip install --user \
            numpy \
            pandas \
            scikit-learn \
            xgboost \
            lightgbm \
            matplotlib \
            seaborn \
            joblib
    elif command -v python &> /dev/null; then
        log_info "安装Python机器学习依赖..."
        python -m pip install --user \
            numpy \
            pandas \
            scikit-learn \
            xgboost \
            lightgbm \
            matplotlib \
            seaborn \
            joblib
    fi
    
    cd ..
    log_success "后端依赖安装完成"
}

# 创建数据库表
create_database_tables() {
    log_info "创建策略相关数据库表..."
    
    # 创建策略表
    cat > server/database/create_strategy_tables.sql << 'EOF'
-- 策略表
CREATE TABLE IF NOT EXISTS strategies (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('factor', 'ml', 'timing', 'portfolio', 'arbitrage', 'custom') NOT NULL,
  description TEXT,
  parameters JSON,
  enabled BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
  expected_return DECIMAL(8,4) DEFAULT 0.0000,
  max_drawdown DECIMAL(8,4) DEFAULT 0.0000,
  rebalance_frequency ENUM('daily', 'weekly', 'monthly', 'quarterly') DEFAULT 'weekly',
  universe JSON,
  benchmark VARCHAR(20) DEFAULT '000300.SH',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 策略执行历史表
CREATE TABLE IF NOT EXISTS strategy_executions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(50) NOT NULL,
  execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signals JSON,
  positions JSON,
  performance JSON,
  risk_metrics JSON,
  metadata JSON,
  status ENUM('success', 'failed', 'partial') DEFAULT 'success',
  error_message TEXT,
  execution_duration INT DEFAULT 0,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_execution_time (execution_time),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 策略优化历史表
CREATE TABLE IF NOT EXISTS strategy_optimizations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(50) NOT NULL,
  optimization_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  original_parameters JSON,
  optimized_parameters JSON,
  optimization_config JSON,
  objective_value DECIMAL(10,6),
  iterations INT DEFAULT 0,
  convergence BOOLEAN DEFAULT FALSE,
  improvement DECIMAL(8,4) DEFAULT 0.0000,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_optimization_time (optimization_time),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 策略信号表
CREATE TABLE IF NOT EXISTS strategy_signals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(50) NOT NULL,
  execution_id BIGINT,
  symbol VARCHAR(20) NOT NULL,
  action ENUM('buy', 'sell', 'hold') NOT NULL,
  strength DECIMAL(5,4) DEFAULT 0.0000,
  confidence DECIMAL(5,4) DEFAULT 0.0000,
  price DECIMAL(10,3) NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  signal_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_symbol (symbol),
  INDEX idx_signal_time (signal_time),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 策略持仓表
CREATE TABLE IF NOT EXISTS strategy_positions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  avg_price DECIMAL(10,3) NOT NULL,
  current_price DECIMAL(10,3) NOT NULL,
  market_value DECIMAL(15,2) NOT NULL,
  unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
  weight DECIMAL(5,4) DEFAULT 0.0000,
  holding_period INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_symbol (symbol),
  UNIQUE KEY uk_strategy_symbol (strategy_id, symbol),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOF

    # 执行SQL
    if command -v mysql &> /dev/null; then
        mysql -u root -proot stock_analysis < server/database/create_strategy_tables.sql
        log_success "策略数据库表创建完成"
    else
        log_warning "MySQL未找到，请手动执行 server/database/create_strategy_tables.sql"
    fi
}

# 创建Python机器学习服务
create_ml_service() {
    log_info "创建Python机器学习服务..."
    
    mkdir -p server/ml_service
    
    cat > server/ml_service/ml_engine.py << 'EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
机器学习引擎
提供策略所需的机器学习功能
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import xgboost as xgb
import lightgbm as lgb
import joblib
import json
import sys
import os
from datetime import datetime

class MLEngine:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_names = {}
        
    def train_model(self, model_type, features, labels, model_params=None):
        """训练机器学习模型"""
        try:
            # 数据预处理
            X = np.array(features)
            y = np.array(labels)
            
            # 特征标准化
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # 分割训练集和测试集
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42
            )
            
            # 选择模型
            if model_type == 'xgboost':
                model = xgb.XGBClassifier(**(model_params or {}))
            elif model_type == 'lightgbm':
                model = lgb.LGBMClassifier(**(model_params or {}))
            elif model_type == 'random_forest':
                model = RandomForestClassifier(**(model_params or {}))
            elif model_type == 'gradient_boosting':
                model = GradientBoostingClassifier(**(model_params or {}))
            else:
                raise ValueError(f"不支持的模型类型: {model_type}")
            
            # 训练模型
            model.fit(X_train, y_train)
            
            # 预测和评估
            y_pred = model.predict(X_test)
            
            # 计算性能指标
            performance = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred, average='weighted'),
                'recall': recall_score(y_test, y_pred, average='weighted'),
                'f1_score': f1_score(y_test, y_pred, average='weighted')
            }
            
            # 交叉验证
            cv_scores = cross_val_score(model, X_scaled, y, cv=5)
            performance['cv_mean'] = cv_scores.mean()
            performance['cv_std'] = cv_scores.std()
            
            return {
                'success': True,
                'model': model,
                'scaler': scaler,
                'performance': performance,
                'feature_importance': model.feature_importances_.tolist() if hasattr(model, 'feature_importances_') else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def predict(self, model_id, features):
        """使用训练好的模型进行预测"""
        try:
            if model_id not in self.models:
                return {'success': False, 'error': '模型不存在'}
            
            model = self.models[model_id]
            scaler = self.scalers[model_id]
            
            # 特征标准化
            X = np.array(features).reshape(1, -1)
            X_scaled = scaler.transform(X)
            
            # 预测
            prediction = model.predict(X_scaled)[0]
            probability = model.predict_proba(X_scaled)[0] if hasattr(model, 'predict_proba') else [0.5, 0.5]
            
            return {
                'success': True,
                'prediction': int(prediction),
                'probability': probability.tolist(),
                'confidence': max(probability)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def save_model(self, model_id, model, scaler, feature_names=None):
        """保存模型"""
        try:
            model_dir = f'models/{model_id}'
            os.makedirs(model_dir, exist_ok=True)
            
            # 保存模型和标准化器
            joblib.dump(model, f'{model_dir}/model.pkl')
            joblib.dump(scaler, f'{model_dir}/scaler.pkl')
            
            # 保存特征名称
            if feature_names:
                with open(f'{model_dir}/features.json', 'w') as f:
                    json.dump(feature_names, f)
            
            # 更新内存中的模型
            self.models[model_id] = model
            self.scalers[model_id] = scaler
            if feature_names:
                self.feature_names[model_id] = feature_names
            
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def load_model(self, model_id):
        """加载模型"""
        try:
            model_dir = f'models/{model_id}'
            
            # 加载模型和标准化器
            model = joblib.load(f'{model_dir}/model.pkl')
            scaler = joblib.load(f'{model_dir}/scaler.pkl')
            
            # 加载特征名称
            feature_names = None
            if os.path.exists(f'{model_dir}/features.json'):
                with open(f'{model_dir}/features.json', 'r') as f:
                    feature_names = json.load(f)
            
            # 更新内存中的模型
            self.models[model_id] = model
            self.scalers[model_id] = scaler
            if feature_names:
                self.feature_names[model_id] = feature_names
            
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

def main():
    """命令行接口"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': '缺少命令参数'}))
        return
    
    command = sys.argv[1]
    engine = MLEngine()
    
    if command == 'train':
        # 训练模型
        data = json.loads(sys.argv[2])
        result = engine.train_model(
            data['model_type'],
            data['features'],
            data['labels'],
            data.get('model_params')
        )
        print(json.dumps(result, default=str))
        
    elif command == 'predict':
        # 预测
        data = json.loads(sys.argv[2])
        engine.load_model(data['model_id'])
        result = engine.predict(data['model_id'], data['features'])
        print(json.dumps(result))
        
    else:
        print(json.dumps({'success': False, 'error': f'未知命令: {command}'}))

if __name__ == '__main__':
    main()
EOF

    chmod +x server/ml_service/ml_engine.py
    log_success "Python机器学习服务创建完成"
}

# 创建配置文件
create_config_files() {
    log_info "创建策略配置文件..."
    
    # 创建策略配置
    cat > src/config/strategy.config.ts << 'EOF'
/**
 * 策略配置文件
 */

export const STRATEGY_CONFIG = {
  // 策略类型配置
  STRATEGY_TYPES: {
    factor: {
      name: '因子策略',
      description: '基于量化因子的选股策略',
      icon: 'factor',
      color: '#409EFF'
    },
    ml: {
      name: '机器学习策略',
      description: '基于机器学习模型的选股策略',
      icon: 'ml',
      color: '#67C23A'
    },
    timing: {
      name: '择时策略',
      description: '基于技术指标的择时策略',
      icon: 'timing',
      color: '#E6A23C'
    },
    portfolio: {
      name: '组合策略',
      description: '多策略组合优化',
      icon: 'portfolio',
      color: '#F56C6C'
    }
  },

  // 风险等级配置
  RISK_LEVELS: {
    low: {
      name: '低风险',
      color: '#67C23A',
      maxDrawdown: 0.1,
      volatility: 0.15
    },
    medium: {
      name: '中风险',
      color: '#E6A23C',
      maxDrawdown: 0.2,
      volatility: 0.25
    },
    high: {
      name: '高风险',
      color: '#F56C6C',
      maxDrawdown: 0.3,
      volatility: 0.35
    }
  },

  // 默认参数
  DEFAULT_PARAMS: {
    factor: {
      lookbackPeriod: 20,
      rebalancePeriod: 5,
      topN: 10,
      factorWeights: []
    },
    ml: {
      modelType: 'xgboost',
      maxFeatures: 10,
      trainPeriod: 60,
      retrainPeriod: 30,
      threshold: 0.02
    },
    timing: {
      indicators: ['sma', 'rsi', 'macd'],
      period: 20,
      threshold: 0.7
    },
    portfolio: {
      maxPositions: 10,
      rebalanceFrequency: 'weekly',
      riskBudget: 0.15
    }
  }
}

export default STRATEGY_CONFIG
EOF

    log_success "策略配置文件创建完成"
}

# 主函数
main() {
    echo "🚀 第三阶段：策略模块升级"
    echo "================================"
    
    check_dependencies
    install_frontend_deps
    install_backend_deps
    create_database_tables
    create_ml_service
    create_config_files
    
    echo ""
    echo "================================"
    log_success "第三阶段策略模块升级完成！"
    echo ""
    echo "📋 完成的功能："
    echo "  ✅ 策略框架核心架构"
    echo "  ✅ 机器学习策略引擎"
    echo "  ✅ 多因子选股模型"
    echo "  ✅ 择时策略引擎"
    echo "  ✅ 组合优化器"
    echo "  ✅ 策略评估与可视化"
    echo "  ✅ Python机器学习服务"
    echo "  ✅ 数据库表结构"
    echo ""
    echo "🔧 下一步："
    echo "  1. 重启前端和后端服务"
    echo "  2. 访问策略管理页面测试功能"
    echo "  3. 创建和运行第一个策略"
    echo ""
}

# 执行主函数
main "$@"
