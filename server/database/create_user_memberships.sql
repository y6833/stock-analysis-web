-- 创建用户会员表
CREATE TABLE IF NOT EXISTS `user_memberships` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `coins` int(10) unsigned NOT NULL DEFAULT 10,
  `basic_membership_expires` datetime DEFAULT NULL,
  `premium_membership_expires` datetime DEFAULT NULL,
  `enterprise_membership_expires` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_memberships_user_id_unique` (`user_id`),
  CONSTRAINT `user_memberships_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 迁移现有数据
INSERT INTO `user_memberships` (`user_id`, `coins`, `basic_membership_expires`, `premium_membership_expires`, `enterprise_membership_expires`, `created_at`, `updated_at`)
SELECT 
  `id` AS `user_id`, 
  COALESCE(`coins`, 10) AS `coins`,
  CASE WHEN `membership` = 'basic' AND `membership_expires` > NOW() THEN `membership_expires` ELSE NULL END AS `basic_membership_expires`,
  CASE WHEN `membership` = 'premium' AND `membership_expires` > NOW() THEN `membership_expires` ELSE NULL END AS `premium_membership_expires`,
  CASE WHEN `membership` = 'enterprise' AND `membership_expires` > NOW() THEN `membership_expires` ELSE NULL END AS `enterprise_membership_expires`,
  NOW() AS `created_at`,
  NOW() AS `updated_at`
FROM `users`
ON DUPLICATE KEY UPDATE 
  `coins` = VALUES(`coins`),
  `basic_membership_expires` = VALUES(`basic_membership_expires`),
  `premium_membership_expires` = VALUES(`premium_membership_expires`),
  `enterprise_membership_expires` = VALUES(`enterprise_membership_expires`),
  `updated_at` = NOW();
