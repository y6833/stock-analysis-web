# 创建数据库
mysql -u root -e "CREATE DATABASE IF NOT EXISTS stock_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS stock_analysis_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS stock_analysis_production CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# 使用数据库
mysql -u root -e "USE stock_analysis;"

# 创建用户表
mysql -u root -e "CREATE TABLE IF NOT EXISTS stock_analysis.users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  nickname VARCHAR(30),
  bio TEXT,
  phone VARCHAR(20),
  location VARCHAR(100),
  website VARCHAR(100),
  avatar LONGTEXT,
  last_login DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;"

# 创建用户偏好设置表
mysql -u root -e "CREATE TABLE IF NOT EXISTS stock_analysis.user_preferences (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  theme VARCHAR(10) NOT NULL DEFAULT 'light',
  language VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  default_dashboard_layout VARCHAR(100) DEFAULT 'default',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  default_stock_symbol VARCHAR(20),
  default_timeframe VARCHAR(20),
  default_chart_type VARCHAR(20),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;"

# 插入示例用户数据
mysql -u root -e "INSERT INTO stock_analysis.users (username, email, password, role, status, nickname, bio, phone, location, website, created_at, updated_at)
VALUES 
('admin', 'admin@example.com', SHA2('admin123', 256), 'admin', 'active', '管理员', '系统管理员', '13800138000', '北京', 'https://example.com', NOW(), NOW()),
('user', 'user@example.com', SHA2('user123', 256), 'user', 'active', '普通用户', '我是一名股票爱好者', '13900139000', '上海', '', NOW(), NOW());"

# 获取插入的用户ID并插入用户偏好设置
mysql -u root -e "INSERT INTO stock_analysis.user_preferences (user_id, theme, language, default_dashboard_layout, email_notifications, push_notifications, default_stock_symbol, default_timeframe, default_chart_type, created_at, updated_at)
VALUES 
((SELECT id FROM stock_analysis.users WHERE username = 'admin'), 'light', 'zh-CN', 'default', TRUE, TRUE, '000001.SZ', 'day', 'candle', NOW(), NOW()),
((SELECT id FROM stock_analysis.users WHERE username = 'user'), 'light', 'zh-CN', 'default', TRUE, TRUE, NULL, NULL, NULL, NOW(), NOW());"
