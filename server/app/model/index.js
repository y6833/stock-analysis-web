'use strict';

module.exports = app => {
  // 确保所有模型都已加载
  app.beforeStart(async () => {
    // 加载所有模型
    const models = app.model.models;

    // 建立模型之间的关联关系
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate && typeof models[modelName].associate === 'function') {
        models[modelName].associate();
      }
    });
  });
};
