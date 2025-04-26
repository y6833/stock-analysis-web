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

  // 暂时禁用参数验证插件
  // validate: {
  //   enable: true,
  //   package: 'egg-validate',
  // },
};
