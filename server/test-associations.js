const Sequelize = require('sequelize');
const path = require('path');
const fs = require('fs');

// 数据库配置
const sequelize = new Sequelize('stock_analysis', 'root', 'root', {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  timezone: '+08:00',
  logging: false, // 关闭SQL日志
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

// 模拟 app 对象
const app = {
  Sequelize,
  model: {
    models: {}
  }
};

async function loadModels() {
  try {
    console.log('开始加载模型...');
    
    const modelsDir = path.join(__dirname, 'app/model');
    const files = fs.readdirSync(modelsDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js')
      .sort();

    console.log('找到模型文件:', files);

    // 加载所有模型
    for (const file of files) {
      const modelName = path.basename(file, '.js');
      console.log(`加载模型: ${modelName}`);
      
      try {
        const modelDefiner = require(path.join(modelsDir, file));
        const model = modelDefiner(app);
        app.model.models[modelName] = model;
        app.model[model.name] = model;
        console.log(`✓ 模型 ${modelName} 加载成功`);
      } catch (error) {
        console.error(`✗ 模型 ${modelName} 加载失败:`, error.message);
      }
    }

    console.log('\n开始建立关联关系...');
    
    // 建立关联关系
    const associatedModels = new Set();
    
    for (const [modelName, model] of Object.entries(app.model.models)) {
      if (associatedModels.has(modelName)) {
        continue;
      }
      
      if (model.associate && typeof model.associate === 'function') {
        try {
          console.log(`建立 ${modelName} 的关联关系...`);
          model.associate();
          associatedModels.add(modelName);
          console.log(`✓ ${modelName} 关联成功`);
        } catch (error) {
          console.error(`✗ ${modelName} 关联失败:`, error.message);
        }
      }
    }

    console.log('\n模型加载完成!');
    console.log('已加载的模型:', Object.keys(app.model.models));
    
  } catch (error) {
    console.error('加载模型失败:', error);
  }
}

loadModels();
