#!/usr/bin/env node

'use strict';

// 设置环境变量，跳过迁移
process.env.NODE_ENV = 'development';
process.env.EGG_SKIP_MIGRATION = 'true';

// 直接启动应用，不运行迁移
const Application = require('egg').Application;
const app = new Application({
  baseDir: __dirname,
  type: 'application',
});

app.listen(7001, () => {
  console.log('Server started on port 7001');
});
