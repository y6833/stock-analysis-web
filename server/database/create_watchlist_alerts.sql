-- 创建关注列表提醒表
CREATE TABLE IF NOT EXISTS `watchlist_alerts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `watchlist_id` INT UNSIGNED NOT NULL,
  `symbol` VARCHAR(20) NOT NULL,
  `stock_name` VARCHAR(50) NOT NULL,
  `condition` VARCHAR(20) NOT NULL COMMENT 'price_above, price_below, volume_above, change_above, change_below',
  `value` DECIMAL(10, 2) NOT NULL COMMENT '提醒阈值',
  `message` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_triggered` TINYINT(1) NOT NULL DEFAULT 0,
  `last_triggered_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_watchlist_id` (`watchlist_id`),
  CONSTRAINT `fk_watchlist_alerts_watchlist_id` FOREIGN KEY (`watchlist_id`) REFERENCES `user_watchlists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 创建关注列表提醒历史表
CREATE TABLE IF NOT EXISTS `watchlist_alert_histories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `alert_id` INT UNSIGNED NOT NULL,
  `triggered_value` DECIMAL(10, 2) NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_alert_id` (`alert_id`),
  CONSTRAINT `fk_watchlist_alert_histories_alert_id` FOREIGN KEY (`alert_id`) REFERENCES `watchlist_alerts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
