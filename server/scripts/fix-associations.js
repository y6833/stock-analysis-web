'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// 要修复的模型目录
const MODEL_DIR = path.resolve(__dirname, '../app/model');

/**
 * 主函数 - 修复所有模型关联
 */
async function main() {
  try {
    console.log('开始修复模型关联...');

    // 获取所有模型文件
    const modelFiles = await getModelFiles(MODEL_DIR);
    console.log(`找到 ${modelFiles.length} 个模型文件`);

    // 修复每个模型文件
    let fixedCount = 0;
    for (const file of modelFiles) {
      const isFixed = await fixModelFile(file);
      if (isFixed) {
        fixedCount++;
      }
    }

    console.log(`成功修复 ${fixedCount} 个模型文件`);
  } catch (err) {
    console.error('修复过程中发生错误:', err);
  }
}

/**
 * 获取目录中的所有模型文件
 * @param {string} dir - 模型目录路径
 * @returns {Promise<string[]>} - 模型文件路径列表
 */
async function getModelFiles(dir) {
  const files = await readdirAsync(dir);
  const modelFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await statAsync(filePath);

    if (stat.isFile() && file.endsWith('.js') && file !== 'index.js') {
      modelFiles.push(filePath);
    }
  }

  return modelFiles;
}

/**
 * 修复单个模型文件
 * @param {string} filePath - 模型文件路径
 * @returns {Promise<boolean>} - 是否修复了文件
 */
async function fixModelFile(filePath) {
  try {
    // 读取文件内容
    let content = await readFileAsync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const modelName = fileName.replace('.js', '');

    // 检查文件是否包含关联方法
    if (!content.includes('.associate = function')) {
      console.log(`跳过 ${fileName}，未找到关联方法`);
      return false;
    }

    // 首先检查文件是否已经包含前缀声明
    if (content.includes('const prefix = this._associationPrefix || \'\'')) {
      console.log(`跳过 ${fileName}，已包含前缀声明`);

      // 但是检查是否有重复声明
      const duplicatePrefixDeclaration = content.match(
        /(const prefix = this\._associationPrefix \|\| ['"].*?['"]).*?\1/s
      );
      if (duplicatePrefixDeclaration) {
        console.log(`修复 ${fileName} 中的重复前缀声明`);
        // 保留第一个声明，移除其他声明
        const firstDeclaration = duplicatePrefixDeclaration[1];
        content = content.replace(
          new RegExp(
            `(${firstDeclaration}).*?\\s+// 获取模型关联唯一前缀.*?const prefix = this\\._associationPrefix \\|\\| ['"].*?['"]`,
            's'
          ),
          '$1'
        );
      }

      // 检查是否有重复的前缀添加，即 ${prefix}_${prefix}_
      if (content.includes('${prefix}_${prefix}_')) {
        console.log(`修复 ${fileName} 中的重复前缀使用`);
        content = content.replace(/\${prefix}_\${prefix}_/g, '${prefix}_');
      }

      // 检查反斜杠转义的问题
      if (content.includes('\\${prefix}_')) {
        console.log(`修复 ${fileName} 中的前缀转义问题`);
        content = content.replace(/\\(\${prefix}_)/g, '$1');
      }

      // 确保所有的关联别名都使用前缀
      content = fixAssociationAliases(content);

      // 保存更新后的内容
      await writeFileAsync(filePath, content, 'utf8');
      return true;
    }

    // 查找关联方法的位置
    const associateMethodRegex = /(\w+)\.associate\s*=\s*function\s*\(\)\s*{([^}]*)}/s;
    const match = content.match(associateMethodRegex);

    if (!match) {
      console.log(`跳过 ${fileName}，无法匹配关联方法`);
      return false;
    }

    const [fullMethod, className, methodBody] = match;

    // 添加前缀获取代码
    const prefixLine =
      '    // 获取模型关联唯一前缀，确保别名唯一性\n    const prefix = this._associationPrefix || \'\';\n    \n';

    // 修改关联别名，添加前缀
    let newMethodBody = methodBody;

    // 修改关联别名
    newMethodBody = fixAssociationAliases(newMethodBody);

    // 构建新的关联方法
    const newMethod = `${className}.associate = function () {\n${prefixLine}${newMethodBody}}`;

    // 替换原方法
    const newContent = content.replace(fullMethod, newMethod);

    // 如果内容没有变化，说明不需要修复
    if (newContent === content) {
      console.log(`跳过 ${fileName}，已经修复或不需要修复`);
      return false;
    }

    // 保存修改后的文件
    await writeFileAsync(filePath, newContent, 'utf8');
    console.log(`成功修复 ${fileName}`);
    return true;
  } catch (err) {
    console.error(`修复 ${filePath} 时发生错误:`, err);
    return false;
  }
}

/**
 * 修复关联别名，添加前缀
 * @param {string} content - 需要修复的内容
 * @returns {string} - 修复后的内容
 */
function fixAssociationAliases(content) {
  // 替换 as: '...' 形式，但如果已经有 ${prefix}_ 前缀则跳过
  content = content.replace(/as:\s*'(?!\${prefix}_)([^']+)'/g, 'as: `\\${prefix}_$1`');

  // 替换 as: "..." 形式，但如果已经有 ${prefix}_ 前缀则跳过
  content = content.replace(/as:\s*"(?!\${prefix}_)([^"]+)"/g, 'as: `\\${prefix}_$1`');

  // 替换 as: `...` 形式，但如果已经有 ${prefix}_ 前缀则跳过
  content = content.replace(/as:\s*`(?!\${prefix}_)([^`]+)`/g, 'as: `\\${prefix}_$1`');

  return content;
}

// 执行主函数
main().catch(console.error);
