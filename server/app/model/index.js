'use strict';

module.exports = app => {
  // 加载所有模型
  const models = app.model.models;
  
  // 建立模型之间的关联关系
  Object.keys(models).forEach(modelName => {
    if ('associate' in models[modelName]) {
      models[modelName].associate();
    }
  });
};
