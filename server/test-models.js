const Sequelize = require('sequelize');

// 数据库配置
const sequelize = new Sequelize('stock_analysis', 'root', 'root', {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  timezone: '+08:00',
  logging: console.log,
  define: {
    underscored: true,
    freezeTableName: false,
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_general_ci',
    },
    timestamps: true,
  },
});

async function testModels() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 测试查询 stocks 表
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM stocks');
    console.log('stocks 表记录数:', results[0].count);

    // 测试查询 users 表
    const [userResults] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    console.log('users 表记录数:', userResults[0].count);

    console.log('模型测试完成');
    process.exit(0);
  } catch (error) {
    console.error('模型测试失败:', error);
    process.exit(1);
  }
}

testModels();
