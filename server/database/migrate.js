'use strict';

const path = require('path');
const fs = require('fs');
const Sequelize = require('sequelize');

// 数据库配置
const config = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'stock_analysis',
  username: 'root',
  password: 'root',
  timezone: '+08:00',
  define: {
    underscored: true,
    freezeTableName: false,
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_general_ci',
    },
    timestamps: true,
  },
};

// 创建Sequelize实例
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

// 获取迁移文件目录
const migrationsPath = path.join(__dirname, 'migrations');

// 执行迁移
async function migrate() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 获取所有迁移文件
    const files = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    // 执行迁移
    for (const file of files) {
      console.log(`执行迁移: ${file}`);
      const migration = require(path.join(migrationsPath, file));
      await migration.up(sequelize.getQueryInterface(), Sequelize);
    }

    console.log('所有迁移执行完成');
    process.exit(0);
  } catch (error) {
    console.error('迁移执行失败:', error);
    process.exit(1);
  }
}

// 执行迁移
migrate();
