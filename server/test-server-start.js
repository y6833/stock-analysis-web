const { Application } = require('egg');

console.log('开始测试 Egg.js 应用启动...');

try {
  // 创建应用实例
  const app = new Application({
    baseDir: __dirname,
    type: 'application',
  });

  console.log('✅ Egg.js 应用实例创建成功');

  // 监听应用启动事件
  app.ready(() => {
    console.log('🎉 Egg.js 应用启动成功！');
    console.log(`服务器运行在: http://localhost:${app.config.cluster.listen.port || 7001}`);
    
    // 测试数据库连接
    if (app.model && app.model.sequelize) {
      app.model.sequelize.authenticate()
        .then(() => {
          console.log('✅ 数据库连接成功');
        })
        .catch(err => {
          console.error('❌ 数据库连接失败:', err.message);
        });
    }
  });

  // 监听错误事件
  app.on('error', (err) => {
    console.error('❌ 应用启动错误:', err);
  });

  // 启动应用
  app.listen(7001, () => {
    console.log('🚀 服务器已启动在端口 7001');
  });

} catch (error) {
  console.error('❌ 应用启动失败:', error);
  process.exit(1);
}
