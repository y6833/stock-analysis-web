'use strict';

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'stock_analysis',
  multipleStatements: true
};

// 执行SQL文件
async function executeSqlFile(filePath) {
  console.log(`执行SQL文件: ${filePath}`);
  
  // 读取SQL文件内容
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // 创建数据库连接
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 执行SQL
    const [results] = await connection.query(sql);
    console.log('SQL执行成功:', results);
    return results;
  } catch (error) {
    console.error('SQL执行失败:', error);
    throw error;
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 手动创建页面管理相关表
async function createPageTables() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 创建系统页面表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`system_pages\` (
        \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`path\` varchar(100) NOT NULL COMMENT '页面路径',
        \`name\` varchar(50) NOT NULL COMMENT '页面名称',
        \`description\` text COMMENT '页面描述',
        \`icon\` varchar(50) DEFAULT NULL COMMENT '页面图标',
        \`component\` varchar(100) NOT NULL COMMENT '页面组件路径',
        \`is_menu\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否在菜单中显示',
        \`parent_id\` int(10) unsigned DEFAULT NULL COMMENT '父页面ID',
        \`sort_order\` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序顺序',
        \`is_enabled\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
        \`requires_auth\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否需要认证',
        \`requires_admin\` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要管理员权限',
        \`required_membership_level\` varchar(20) NOT NULL DEFAULT 'free' COMMENT '所需会员等级',
        \`meta\` json DEFAULT NULL COMMENT '额外元数据',
        \`created_at\` datetime NOT NULL,
        \`updated_at\` datetime NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`path\` (\`path\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('系统页面表创建成功');
    
    // 创建页面权限表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`page_permissions\` (
        \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`page_id\` int(10) unsigned NOT NULL COMMENT '页面ID',
        \`membership_level\` varchar(20) NOT NULL COMMENT '会员等级',
        \`has_access\` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否有访问权限',
        \`created_at\` datetime NOT NULL,
        \`updated_at\` datetime NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_page_membership\` (\`page_id\`,\`membership_level\`),
        CONSTRAINT \`page_permissions_ibfk_1\` FOREIGN KEY (\`page_id\`) REFERENCES \`system_pages\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('页面权限表创建成功');
    
    return true;
  } catch (error) {
    console.error('创建页面管理相关表失败:', error);
    throw error;
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 主函数
async function main() {
  try {
    // 创建页面管理相关表
    await createPageTables();
    console.log('页面管理相关表创建成功');
  } catch (error) {
    console.error('执行失败:', error);
  }
}

// 执行主函数
main();
