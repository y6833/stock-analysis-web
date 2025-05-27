-- 创建回测相关数据表

-- 回测记录表
CREATE TABLE IF NOT EXISTS `backtest_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `backtest_id` varchar(100) NOT NULL COMMENT '回测唯一标识',
  `symbol` varchar(20) NOT NULL COMMENT '股票代码',
  `strategy_type` varchar(50) NOT NULL COMMENT '策略类型',
  `start_date` date NOT NULL COMMENT '回测开始日期',
  `end_date` date NOT NULL COMMENT '回测结束日期',
  `initial_capital` decimal(15,2) NOT NULL COMMENT '初始资金',
  `final_value` decimal(15,2) NOT NULL COMMENT '最终价值',
  `total_return` decimal(10,4) NOT NULL COMMENT '总收益率',
  `annualized_return` decimal(10,4) DEFAULT NULL COMMENT '年化收益率',
  `max_drawdown` decimal(10,4) DEFAULT NULL COMMENT '最大回撤',
  `sharpe_ratio` decimal(10,4) DEFAULT NULL COMMENT '夏普比率',
  `win_rate` decimal(10,4) DEFAULT NULL COMMENT '胜率',
  `profit_factor` decimal(10,4) DEFAULT NULL COMMENT '盈亏比',
  `trade_count` int(11) DEFAULT 0 COMMENT '交易次数',
  `params` text COMMENT '回测参数JSON',
  `result` longtext COMMENT '完整回测结果JSON',
  `status` enum('running','completed','failed') DEFAULT 'completed' COMMENT '回测状态',
  `error_message` text COMMENT '错误信息',
  `execution_time` int(11) DEFAULT NULL COMMENT '执行时间(秒)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_backtest_id` (`backtest_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_symbol` (`symbol`),
  KEY `idx_strategy_type` (`strategy_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回测记录表';

-- 批量回测记录表
CREATE TABLE IF NOT EXISTS `batch_backtest_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `batch_id` varchar(100) NOT NULL COMMENT '批量回测唯一标识',
  `base_params` text NOT NULL COMMENT '基础参数JSON',
  `parameter_grid` text NOT NULL COMMENT '参数网格JSON',
  `total_combinations` int(11) NOT NULL COMMENT '总参数组合数',
  `completed_combinations` int(11) DEFAULT 0 COMMENT '已完成组合数',
  `best_result_id` varchar(100) DEFAULT NULL COMMENT '最佳结果ID',
  `status` enum('running','completed','failed','cancelled') DEFAULT 'running' COMMENT '批量回测状态',
  `error_message` text COMMENT '错误信息',
  `execution_time` int(11) DEFAULT NULL COMMENT '执行时间(秒)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_batch_id` (`batch_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量回测记录表';

-- 股票历史数据表
CREATE TABLE IF NOT EXISTS `stock_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL COMMENT '股票代码',
  `trade_date` date NOT NULL COMMENT '交易日期',
  `open_price` decimal(10,3) NOT NULL COMMENT '开盘价',
  `high_price` decimal(10,3) NOT NULL COMMENT '最高价',
  `low_price` decimal(10,3) NOT NULL COMMENT '最低价',
  `close_price` decimal(10,3) NOT NULL COMMENT '收盘价',
  `volume` bigint(20) DEFAULT NULL COMMENT '成交量',
  `amount` decimal(15,2) DEFAULT NULL COMMENT '成交额',
  `turnover_rate` decimal(8,4) DEFAULT NULL COMMENT '换手率',
  `pe_ratio` decimal(10,2) DEFAULT NULL COMMENT '市盈率',
  `pb_ratio` decimal(10,2) DEFAULT NULL COMMENT '市净率',
  `data_source` varchar(20) DEFAULT 'tushare' COMMENT '数据来源',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_symbol_date` (`symbol`, `trade_date`),
  KEY `idx_symbol` (`symbol`),
  KEY `idx_trade_date` (`trade_date`),
  KEY `idx_symbol_date_range` (`symbol`, `trade_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='股票历史数据表';

-- 回测交易记录表
CREATE TABLE IF NOT EXISTS `backtest_trades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backtest_id` varchar(100) NOT NULL COMMENT '回测ID',
  `trade_id` varchar(100) NOT NULL COMMENT '交易ID',
  `symbol` varchar(20) NOT NULL COMMENT '股票代码',
  `trade_date` date NOT NULL COMMENT '交易日期',
  `trade_time` timestamp NOT NULL COMMENT '交易时间',
  `direction` enum('buy','sell') NOT NULL COMMENT '交易方向',
  `quantity` int(11) NOT NULL COMMENT '交易数量',
  `price` decimal(10,3) NOT NULL COMMENT '交易价格',
  `amount` decimal(15,2) NOT NULL COMMENT '交易金额',
  `commission` decimal(10,2) DEFAULT 0 COMMENT '佣金',
  `stamp_duty` decimal(10,2) DEFAULT 0 COMMENT '印花税',
  `transfer_fee` decimal(10,2) DEFAULT 0 COMMENT '过户费',
  `slippage` decimal(10,2) DEFAULT 0 COMMENT '滑点成本',
  `total_cost` decimal(10,2) DEFAULT 0 COMMENT '总成本',
  `reason` varchar(200) DEFAULT NULL COMMENT '交易原因',
  `signal_strength` decimal(5,2) DEFAULT NULL COMMENT '信号强度',
  `portfolio_value` decimal(15,2) DEFAULT NULL COMMENT '组合价值',
  `cash_balance` decimal(15,2) DEFAULT NULL COMMENT '现金余额',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_backtest_id` (`backtest_id`),
  KEY `idx_symbol` (`symbol`),
  KEY `idx_trade_date` (`trade_date`),
  KEY `idx_direction` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回测交易记录表';

-- 回测绩效指标表
CREATE TABLE IF NOT EXISTS `backtest_performance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backtest_id` varchar(100) NOT NULL COMMENT '回测ID',
  `metric_date` date NOT NULL COMMENT '指标日期',
  `portfolio_value` decimal(15,2) NOT NULL COMMENT '组合价值',
  `cash_balance` decimal(15,2) NOT NULL COMMENT '现金余额',
  `market_value` decimal(15,2) NOT NULL COMMENT '市值',
  `daily_return` decimal(10,6) DEFAULT NULL COMMENT '日收益率',
  `cumulative_return` decimal(10,4) DEFAULT NULL COMMENT '累计收益率',
  `drawdown` decimal(10,4) DEFAULT NULL COMMENT '回撤',
  `volatility` decimal(10,4) DEFAULT NULL COMMENT '波动率',
  `benchmark_value` decimal(15,2) DEFAULT NULL COMMENT '基准价值',
  `benchmark_return` decimal(10,6) DEFAULT NULL COMMENT '基准收益率',
  `alpha` decimal(10,4) DEFAULT NULL COMMENT 'Alpha',
  `beta` decimal(10,4) DEFAULT NULL COMMENT 'Beta',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_backtest_date` (`backtest_id`, `metric_date`),
  KEY `idx_backtest_id` (`backtest_id`),
  KEY `idx_metric_date` (`metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回测绩效指标表';

-- 策略模板表
CREATE TABLE IF NOT EXISTS `strategy_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` varchar(100) NOT NULL COMMENT '模板唯一标识',
  `name` varchar(100) NOT NULL COMMENT '策略名称',
  `description` text COMMENT '策略描述',
  `category` varchar(50) NOT NULL COMMENT '策略分类',
  `strategy_type` varchar(50) NOT NULL COMMENT '策略类型',
  `default_params` text COMMENT '默认参数JSON',
  `param_schema` text COMMENT '参数结构JSON',
  `is_system` tinyint(1) DEFAULT 1 COMMENT '是否系统模板',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否启用',
  `usage_count` int(11) DEFAULT 0 COMMENT '使用次数',
  `avg_performance` decimal(10,4) DEFAULT NULL COMMENT '平均绩效',
  `created_by` int(11) DEFAULT NULL COMMENT '创建者ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_id` (`template_id`),
  KEY `idx_strategy_type` (`strategy_type`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略模板表';

-- 插入默认策略模板
INSERT INTO `strategy_templates` (`template_id`, `name`, `description`, `category`, `strategy_type`, `default_params`, `param_schema`, `is_system`, `is_active`) VALUES
('ma_crossover', '均线交叉策略', '基于短期和长期移动平均线交叉的趋势跟踪策略', '技术分析', 'technical', 
'{"shortPeriod": 5, "longPeriod": 20, "stopLoss": 0.05, "takeProfit": 0.15}',
'{"shortPeriod": {"type": "number", "min": 1, "max": 50, "label": "短期周期"}, "longPeriod": {"type": "number", "min": 10, "max": 200, "label": "长期周期"}, "stopLoss": {"type": "number", "min": 0.01, "max": 0.2, "step": 0.01, "label": "止损比例"}, "takeProfit": {"type": "number", "min": 0.05, "max": 0.5, "step": 0.01, "label": "止盈比例"}}',
1, 1),

('rsi_reversal', 'RSI反转策略', '基于RSI指标的均值回归策略', '技术分析', 'technical',
'{"rsiPeriod": 14, "oversoldLevel": 30, "overboughtLevel": 70, "stopLoss": 0.03, "takeProfit": 0.08}',
'{"rsiPeriod": {"type": "number", "min": 5, "max": 30, "label": "RSI周期"}, "oversoldLevel": {"type": "number", "min": 10, "max": 40, "label": "超卖阈值"}, "overboughtLevel": {"type": "number", "min": 60, "max": 90, "label": "超买阈值"}, "stopLoss": {"type": "number", "min": 0.01, "max": 0.1, "step": 0.01, "label": "止损比例"}, "takeProfit": {"type": "number", "min": 0.02, "max": 0.2, "step": 0.01, "label": "止盈比例"}}',
1, 1),

('bollinger_breakout', '布林带突破策略', '基于布林带的突破策略', '技术分析', 'technical',
'{"period": 20, "stdDev": 2, "stopLoss": 0.04, "takeProfit": 0.12}',
'{"period": {"type": "number", "min": 10, "max": 50, "label": "周期"}, "stdDev": {"type": "number", "min": 1, "max": 3, "step": 0.1, "label": "标准差倍数"}, "stopLoss": {"type": "number", "min": 0.01, "max": 0.1, "step": 0.01, "label": "止损比例"}, "takeProfit": {"type": "number", "min": 0.05, "max": 0.3, "step": 0.01, "label": "止盈比例"}}',
1, 1);

-- 创建索引以提高查询性能
CREATE INDEX idx_backtest_records_user_symbol ON backtest_records(user_id, symbol);
CREATE INDEX idx_backtest_records_performance ON backtest_records(total_return, sharpe_ratio, max_drawdown);
CREATE INDEX idx_stock_history_symbol_date_range ON stock_history(symbol, trade_date, close_price);
CREATE INDEX idx_backtest_trades_backtest_date ON backtest_trades(backtest_id, trade_date);
CREATE INDEX idx_backtest_performance_backtest_date ON backtest_performance(backtest_id, metric_date);
