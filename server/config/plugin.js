'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  // 启用 sequelize 插件
  sequelize: {
    enable: true,
    package: 'egg-sequelize',
  },

  // 启用 JWT 插件
  jwt: {
    enable: true,
    package: 'egg-jwt',
  },

  // 启用 CORS 插件
  cors: {
    enable: true,
    package: 'egg-cors',
  },

  // 启用参数验证插件
  validate: {
    enable: true,
    package: 'egg-validate',
  },

  // 启用 MySQL 插件
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },

  // 暂时禁用 Redis 插件
  redis: {
    enable: false,
    package: 'egg-redis',
  },
};
