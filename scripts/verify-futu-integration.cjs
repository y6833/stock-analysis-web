const fs = require('fs');
const path = require('path');

console.log('🔍 验证富途数据源集成状态\n');

// 检查文件是否存在
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

// 检查文件内容是否包含特定字符串
function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${description}: 文件不存在 - ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const contains = content.includes(searchString);
  console.log(`${contains ? '✅' : '❌'} ${description}: ${searchString}`);
  return contains;
}

console.log('📁 检查文件存在性:');
const files = [
  ['src/services/dataSource/FutuDataSource.ts', '富途数据源实现文件'],
  ['src/services/dataSource/__tests__/FutuDataSource.test.ts', '富途数据源测试文件'],
  ['scripts/test-futu-datasource.cjs', '富途数据源测试脚本'],
  ['docs/futu-datasource-integration.md', '富途数据源集成文档']
];

let allFilesExist = true;
files.forEach(([filePath, description]) => {
  if (!checkFileExists(filePath, description)) {
    allFilesExist = false;
  }
});

console.log('\n📝 检查代码集成:');

// 检查DataSourceFactory.ts
const factoryChecks = [
  ['src/services/dataSource/DataSourceFactory.ts', 'FutuDataSource', 'DataSourceFactory导入富途数据源'],
  ['src/services/dataSource/DataSourceFactory.ts', "'futu'", 'DataSourceFactory包含futu类型'],
  ['src/services/dataSource/DataSourceFactory.ts', 'case \'futu\':', 'DataSourceFactory包含futu case'],
  ['src/services/dataSource/DataSourceFactory.ts', 'new FutuDataSource()', 'DataSourceFactory创建富途实例']
];

let factoryIntegrated = true;
factoryChecks.forEach(([filePath, searchString, description]) => {
  if (!checkFileContent(filePath, searchString, description)) {
    factoryIntegrated = false;
  }
});

// 检查DataSourceManager.ts
const managerChecks = [
  ['src/services/dataSource/DataSourceManager.ts', 'FutuDataSource', 'DataSourceManager导入富途数据源'],
  ['src/services/dataSource/DataSourceManager.ts', "dataSources.set('futu'", 'DataSourceManager注册富途数据源'],
  ['src/services/dataSource/DataSourceManager.ts', "type: 'futu'", 'DataSourceManager配置富途数据源']
];

let managerIntegrated = true;
managerChecks.forEach(([filePath, searchString, description]) => {
  if (!checkFileContent(filePath, searchString, description)) {
    managerIntegrated = false;
  }
});

// 检查服务器配置
const serverConfigChecks = [
  ['server/config/config.default.js', 'futu:', '服务器配置包含富途配置'],
  ['server/config/config.default.js', 'port: 11111', '服务器配置包含OpenD端口']
];

let serverConfigured = true;
serverConfigChecks.forEach(([filePath, searchString, description]) => {
  if (!checkFileContent(filePath, searchString, description)) {
    serverConfigured = false;
  }
});

// 检查文档更新
const docChecks = [
  ['docs/new-data-sources.md', '富途OpenAPI', '数据源文档包含富途说明'],
  ['docs/new-data-sources.md', 'FutuDataSource', '数据源文档包含富途导入示例']
];

let docsUpdated = true;
docChecks.forEach(([filePath, searchString, description]) => {
  if (!checkFileContent(filePath, searchString, description)) {
    docsUpdated = false;
  }
});

console.log('\n📊 集成状态总结:');
console.log(`文件创建: ${allFilesExist ? '✅ 完成' : '❌ 未完成'}`);
console.log(`工厂类集成: ${factoryIntegrated ? '✅ 完成' : '❌ 未完成'}`);
console.log(`管理器集成: ${managerIntegrated ? '✅ 完成' : '❌ 未完成'}`);
console.log(`服务器配置: ${serverConfigured ? '✅ 完成' : '❌ 未完成'}`);
console.log(`文档更新: ${docsUpdated ? '✅ 完成' : '❌ 未完成'}`);

const overallSuccess = allFilesExist && factoryIntegrated && managerIntegrated && serverConfigured && docsUpdated;

console.log(`\n🎯 总体状态: ${overallSuccess ? '✅ 集成成功' : '❌ 需要修复'}`);

if (overallSuccess) {
  console.log('\n🎉 富途数据源已成功集成到系统中！');
  console.log('\n📋 下一步操作:');
  console.log('1. 下载并安装OpenD程序');
  console.log('2. 启动OpenD并登录富途账号');
  console.log('3. 运行测试脚本验证连接: node scripts/test-futu-datasource.cjs');
  console.log('4. 在应用中切换到富途数据源进行测试');
  console.log('5. 根据需要集成富途JavaScript SDK实现真实API调用');
} else {
  console.log('\n⚠️  发现问题，请检查上述失败项并修复。');
}

console.log('\n🔗 相关链接:');
console.log('- 富途OpenAPI: https://www.futunn.com/OpenAPI');
console.log('- API文档: https://openapi.futunn.com/futu-api-doc/intro/intro.html');
console.log('- OpenD下载: https://www.futunn.com/download/openAPI');

// 检查可用的数据源类型
console.log('\n📋 当前支持的数据源类型:');
try {
  const factoryPath = path.join(__dirname, '..', 'src/services/dataSource/DataSourceFactory.ts');
  const factoryContent = fs.readFileSync(factoryPath, 'utf8');
  
  // 提取DataSourceType定义
  const typeMatch = factoryContent.match(/export type DataSourceType =\s*([\s\S]*?)\n\n/);
  if (typeMatch) {
    const types = typeMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('|'))
      .map(line => line.replace(/^\|\s*'([^']+)'.*$/, '$1'))
      .filter(type => type && type !== 'DataSourceType');
    
    types.forEach(type => {
      console.log(`  - ${type}`);
    });
    
    if (types.includes('futu')) {
      console.log('\n✅ 富途数据源类型已正确添加到类型定义中');
    } else {
      console.log('\n❌ 富途数据源类型未找到在类型定义中');
    }
  }
} catch (error) {
  console.log('\n⚠️  无法解析数据源类型定义');
}
