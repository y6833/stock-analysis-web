'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'stock_analysis',
  multipleStatements: true // 允许执行多条 SQL 语句
};

// 执行 SQL 文件
async function executeSqlFile(filePath) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log(`执行 SQL 文件: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const [results] = await connection.query(sql);
    console.log('SQL 执行成功:', results);
    
    return results;
  } catch (error) {
    console.error('SQL 执行失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 主函数
async function main() {
  try {
    // 创建 user_memberships 表并迁移数据
    await executeSqlFile(path.join(__dirname, 'create_user_memberships.sql'));
    
    // 确认是否要删除 users 表中的字段
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('是否要从 users 表中删除不再需要的字段？(y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        // 删除 users 表中的字段
        await executeSqlFile(path.join(__dirname, 'remove_user_fields.sql'));
        console.log('迁移完成！');
      } else {
        console.log('已取消删除 users 表中的字段。');
      }
      
      readline.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
