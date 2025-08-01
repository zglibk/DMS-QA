/**
 * SQLite数据库适配器 - 临时解决方案
 * 用于在SQL Server不可用时提供基本的登录功能
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// SQLite数据库文件路径
const DB_PATH = path.join(__dirname, 'temp-dms-qa.db');

// 创建数据库连接
function createConnection() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// 初始化数据库表
async function initDatabase() {
  const db = await createConnection();
  
  return new Promise((resolve, reject) => {
    // 创建用户表
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS Users (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          Username TEXT UNIQUE NOT NULL,
          Password TEXT NOT NULL,
          Department TEXT,
          RealName TEXT,
          Avatar TEXT,
          Email TEXT,
          Phone TEXT,
          CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          Status INTEGER DEFAULT 1,
          PositionID INTEGER,
          DepartmentID INTEGER,
          Gender TEXT,
          Birthday DATE,
          Address TEXT,
          Remark TEXT,
          LastLoginTime DATETIME,
          UpdatedAt DATETIME
        )
      `);

      // 插入默认管理员用户 (密码: admin123)
      const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // bcrypt hash for 'admin123'
      db.run(`
        INSERT OR IGNORE INTO Users (Username, Password) 
        VALUES ('admin', ?)
      `, [hashedPassword]);

      // 创建站点配置表
      db.run(`
        CREATE TABLE IF NOT EXISTS SiteConfig (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          SiteName TEXT DEFAULT 'DMS质量管理系统',
          SiteDescription TEXT DEFAULT '质量管理系统',
          CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 插入默认站点配置
      db.run(`
        INSERT OR IGNORE INTO SiteConfig (SiteName, SiteDescription) 
        VALUES ('DMS质量管理系统', '质量管理系统')
      `);

      resolve(db);
    });
  });
}

// 执行查询
function executeQuery(query, params = []) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await createConnection();
      
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        db.all(query, params, (err, rows) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve({ recordset: rows });
          }
        });
      } else {
        db.run(query, params, function(err) {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve({ rowsAffected: [this.changes] });
          }
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

// 模拟SQL Server的连接池接口
class SQLitePool {
  constructor() {
    this.connected = true;
  }

  request() {
    return {
      input: (name, type, value) => {
        // SQLite不需要参数类型定义，直接返回this以支持链式调用
        return this;
      },
      query: async (query, params) => {
        // 处理参数化查询
        if (typeof params === 'object' && params !== null) {
          // 如果params是对象，转换为数组
          const paramArray = Object.values(params);
          return await executeQuery(query, paramArray);
        }
        return await executeQuery(query, params || []);
      }
    };
  }

  async close() {
    // SQLite连接会自动关闭，这里不需要做任何事情
    return Promise.resolve();
  }
}

// 获取连接（兼容原有接口）
async function getConnection() {
  await initDatabase();
  return new SQLitePool();
}

// 安全执行查询
async function executeQuerySafe(queryFn) {
  try {
    const pool = await getConnection();
    return await queryFn(pool);
  } catch (error) {
    console.error('SQLite查询失败:', error);
    return null;
  }
}

module.exports = {
  getConnection,
  executeQuery: executeQuerySafe,
  initDatabase
};
