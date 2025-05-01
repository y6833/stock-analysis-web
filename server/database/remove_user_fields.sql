-- 从 users 表中删除不再需要的字段
-- 注意：只有在确认 user_memberships 表已创建并且数据已迁移后才能执行此脚本

-- 删除 coins 字段
ALTER TABLE `users` DROP COLUMN `coins`;

-- 删除 membership 字段
ALTER TABLE `users` DROP COLUMN `membership`;

-- 删除 membership_expires 字段
ALTER TABLE `users` DROP COLUMN `membership_expires`;

-- 删除 basic_membership_expires 字段（如果存在）
ALTER TABLE `users` DROP COLUMN IF EXISTS `basic_membership_expires`;

-- 删除 premium_membership_expires 字段（如果存在）
ALTER TABLE `users` DROP COLUMN IF EXISTS `premium_membership_expires`;

-- 删除 enterprise_membership_expires 字段（如果存在）
ALTER TABLE `users` DROP COLUMN IF EXISTS `enterprise_membership_expires`;
