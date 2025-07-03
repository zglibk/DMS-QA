const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Qa369*',
  server: '192.168.1.57',
  database: 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 缓存动态配置，避免频繁查询数据库
let cachedDynamicConfig = null;
let configCacheTime = 0;
const CONFIG_CACHE_DURATION = 60000; // 缓存1分钟

// 获取动态数据库配置
async function getDynamicConfig() {
  // 检查缓存是否有效
  const now = Date.now();
  if (cachedDynamicConfig && (now - configCacheTime) < CONFIG_CACHE_DURATION) {
    return cachedDynamicConfig;
  }

  let pool = null;
  try {
    // 首先尝试从数据库获取配置
    pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT TOP 1 Host, DatabaseName, DbUser, DbPassword, FileStoragePath, FileServerPort, FileUrlPrefix, ExcelTempPath, NetworkSharePath FROM DbConfig WHERE IsCurrent = 1 ORDER BY ID DESC');

    if (result.recordset.length > 0) {
      const dbConfig = result.recordset[0];
      cachedDynamicConfig = {
        user: dbConfig.DbUser,
        password: dbConfig.DbPassword,
        server: dbConfig.Host,
        database: dbConfig.DatabaseName,
        FileStoragePath: dbConfig.FileStoragePath,
        FileServerPort: dbConfig.FileServerPort,
        FileUrlPrefix: dbConfig.FileUrlPrefix,
        ExcelTempPath: dbConfig.ExcelTempPath,
        NetworkSharePath: dbConfig.NetworkSharePath,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };
      configCacheTime = now;
      return cachedDynamicConfig;
    } else {
      cachedDynamicConfig = config; // 没有找到配置，缓存默认配置
      configCacheTime = now;
      return config;
    }
  } catch (err) {
    console.log('获取动态配置失败，使用默认配置:', err.message);
    // 如果有缓存的配置，使用缓存的
    if (cachedDynamicConfig) {
      return cachedDynamicConfig;
    }
    return config; // 出错时返回默认配置
  } finally {
    // 确保连接池被正确关闭
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.log('关闭数据库连接池失败:', closeErr.message);
      }
    }
  }
}

// 获取数据库连接
async function getConnection() {
  try {
    const dynamicConfig = await getDynamicConfig();
    const pool = await sql.connect(dynamicConfig);
    return pool;
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

module.exports = {
  sql,
  config,
  getDynamicConfig,
  getConnection
};