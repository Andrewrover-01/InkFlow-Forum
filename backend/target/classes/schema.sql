CREATE DATABASE IF NOT EXISTS inkflow_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inkflow_forum;

CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `bio` TEXT,
    `role` VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    `avatar` VARCHAR(500),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `category` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `icon` VARCHAR(100),
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tag` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `summary` VARCHAR(500),
    `status` VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    `view_count` BIGINT DEFAULT 0,
    `is_pinned` TINYINT(1) DEFAULT 0,
    `is_locked` TINYINT(1) DEFAULT 0,
    `author_id` BIGINT NOT NULL,
    `category_id` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_author_id` (`author_id`),
    INDEX `idx_category_id` (`category_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    FULLTEXT INDEX `ft_title_content` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post_tag` (
    `post_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,
    PRIMARY KEY (`post_id`, `tag_id`),
    INDEX `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reply` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `content` LONGTEXT NOT NULL,
    `floor` INT NOT NULL DEFAULT 1,
    `post_id` BIGINT NOT NULL,
    `author_id` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_post_id` (`post_id`),
    INDEX `idx_author_id` (`author_id`),
    INDEX `idx_floor` (`post_id`, `floor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comment` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `content` TEXT NOT NULL,
    `reply_id` BIGINT NOT NULL,
    `author_id` BIGINT NOT NULL,
    `parent_id` BIGINT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_reply_id` (`reply_id`),
    INDEX `idx_author_id` (`author_id`),
    INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `like` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `post_id` BIGINT,
    `reply_id` BIGINT,
    `comment_id` BIGINT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_post_id` (`post_id`),
    INDEX `idx_reply_id` (`reply_id`),
    INDEX `idx_comment_id` (`comment_id`),
    UNIQUE KEY `uk_user_post` (`user_id`, `post_id`),
    UNIQUE KEY `uk_user_reply` (`user_id`, `reply_id`),
    UNIQUE KEY `uk_user_comment` (`user_id`, `comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `from_user_id` BIGINT,
    `post_id` BIGINT,
    `reply_id` BIGINT,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_is_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hot_novel` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `rank` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `author` VARCHAR(100),
    `category` VARCHAR(50),
    `hot_score` DOUBLE DEFAULT 0,
    `source_url` VARCHAR(500),
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_rank` (`rank`),
    INDEX `idx_hot_score` (`hot_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data
INSERT INTO `user` (`name`, `email`, `password`, `role`, `bio`, `created_at`, `updated_at`) VALUES
('管理员', 'admin@inkflow.com', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', 'InkFlow论坛管理员', NOW(), NOW()),
('测试用户', 'test@inkflow.com', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MEMBER', '普通会员', NOW(), NOW());

INSERT INTO `category` (`name`, `description`, `slug`, `icon`, `sort_order`, `created_at`) VALUES
('综合讨论', '什么话题都可以在这里讨论', 'general', '💬', 1, NOW()),
('小说推荐', '分享你最喜欢的小说', 'novel-rec', '📚', 2, NOW()),
('玄幻修仙', '玄幻修仙类小说讨论', 'xuanhuan', '⚔️', 3, NOW()),
('都市言情', '都市言情类小说讨论', 'dushi', '💕', 4, NOW()),
('历史穿越', '历史穿越类小说讨论', 'lishi', '🏯', 5, NOW()),
('科幻末世', '科幻末世类小说讨论', 'kehuan', '🚀', 6, NOW());

INSERT INTO `hot_novel` (`rank`, `title`, `author`, `category`, `hot_score`, `source_url`, `created_at`, `updated_at`) VALUES
(1, '斗破苍穹', '天蚕土豆', '玄幻', 9.8, 'https://www.qidian.com/book/1', NOW(), NOW()),
(2, '斗罗大陆', '唐家三少', '玄幻', 9.7, 'https://www.qidian.com/book/2', NOW(), NOW()),
(3, '完美世界', '辰东', '玄幻', 9.6, 'https://www.qidian.com/book/3', NOW(), NOW()),
(4, '遮天', '辰东', '玄幻', 9.5, 'https://www.qidian.com/book/4', NOW(), NOW()),
(5, '凡人修仙传', '忘语', '修仙', 9.4, 'https://www.qidian.com/book/5', NOW(), NOW()),
(6, '修真世界', '方想', '修仙', 9.3, 'https://www.qidian.com/book/6', NOW(), NOW()),
(7, '盘龙', '我吃西红柿', '玄幻', 9.2, 'https://www.qidian.com/book/7', NOW(), NOW()),
(8, '吞噬星空', '我吃西红柿', '科幻', 9.1, 'https://www.qidian.com/book/8', NOW(), NOW()),
(9, '雪鹰领主', '我吃西红柿', '玄幻', 9.0, 'https://www.qidian.com/book/9', NOW(), NOW()),
(10, '择天记', '猫腻', '玄幻', 8.9, 'https://www.qidian.com/book/10', NOW(), NOW());
