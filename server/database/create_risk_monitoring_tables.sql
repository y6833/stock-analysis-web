-- 创建风险监控相关表

USE stock_analysis;

-- 创建风险监控配置表
CREATE TABLE IF NOT EXISTS risk_monitoring_configs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  portfolio_id INT UNSIGNED NULL,
  config_name VARCHAR(100) NOT NULL DEFAULT '默认风险配置',
  var_confidence_level DECIMAL(5, 4) NOT NULL DEFAULT 0.05 COMMENT 'VaR置信水平，如0.05表示95%置信度',
  var_time_horizon INT NOT NULL DEFAULT 1 COMMENT 'VaR时间跨度（天）',
  var_method VARCHAR(20) NOT NULL DEFAULT 'historical' COMMENT 'VaR计算方法：historical, parametric, monte_carlo',
  lookback_period INT NOT NULL DEFAULT 252 COMMENT '历史数据回看期（天）',
  monte_carlo_simulations INT NOT NULL DEFAULT 10000 COMMENT '蒙特卡洛模拟次数',
  risk_limits JSON NULL COMMENT '风险限制配置JSON',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (portfolio_id) REFERENCES user_portfolios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_portfolio_id (portfolio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 创建VaR计算记录表
CREATE TABLE IF NOT EXISTS var_calculations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  portfolio_id INT UNSIGNED NULL,
  config_id INT UNSIGNED NOT NULL,
  calculation_date DATETIME NOT NULL COMMENT '计算日期',
  portfolio_value DECIMAL(15, 2) NOT NULL COMMENT '投资组合总价值',
  var_absolute DECIMAL(15, 2) NOT NULL COMMENT 'VaR绝对值（货币单位）',
  var_percentage DECIMAL(8, 6) NOT NULL COMMENT 'VaR百分比',
  expected_shortfall DECIMAL(15, 2) NULL COMMENT '期望损失（ES/CVaR）',
  confidence_level DECIMAL(5, 4) NOT NULL COMMENT '置信水平',
  time_horizon INT NOT NULL COMMENT '时间跨度（天）',
  calculation_method VARCHAR(20) NOT NULL COMMENT '计算方法',
  component_var JSON NULL COMMENT '成分VaR详情JSON',
  risk_metrics JSON NULL COMMENT '其他风险指标JSON',
  calculation_details JSON NULL COMMENT '计算详情和参数JSON',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (portfolio_id) REFERENCES user_portfolios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (config_id) REFERENCES risk_monitoring_configs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_calculation_date (calculation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 创建历史收益率数据表
CREATE TABLE IF NOT EXISTS portfolio_returns (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  portfolio_id INT UNSIGNED NULL,
  return_date DATE NOT NULL COMMENT '收益率日期',
  daily_return DECIMAL(10, 8) NOT NULL COMMENT '日收益率',
  portfolio_value DECIMAL(15, 2) NOT NULL COMMENT '当日投资组合价值',
  benchmark_return DECIMAL(10, 8) NULL COMMENT '基准收益率',
  excess_return DECIMAL(10, 8) NULL COMMENT '超额收益率',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (portfolio_id) REFERENCES user_portfolios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_return_date (return_date),
  UNIQUE KEY unique_portfolio_date (portfolio_id, return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
