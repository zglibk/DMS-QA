const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Qa369*',
  server: '192.168.1.57',
  database: 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    parseJSON: true
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
          enableArithAbort: true,
          useUTC: false,
          requestTimeout: 30000,
          connectionTimeout: 30000,
          parseJSON: true
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

// 全局连接池实例
let globalPool = null;
let poolConfig = null;

// 获取数据库连接（使用单例模式的连接池）
async function getConnection() {
  try {
    const dynamicConfig = await getDynamicConfig();

    // 检查是否需要重新创建连接池（配置变化时）
    const configChanged = !poolConfig || JSON.stringify(poolConfig) !== JSON.stringify(dynamicConfig);

    if (!globalPool || configChanged || !globalPool.connected) {
      // 如果有旧的连接池，先关闭它
      if (globalPool) {
        try {
          await globalPool.close();
        } catch (err) {
          console.log('关闭旧连接池失败:', err.message);
        }
      }

      // 创建新的连接池
      globalPool = new sql.ConnectionPool(dynamicConfig);
      poolConfig = { ...dynamicConfig };

      // 连接到数据库
      await globalPool.connect();

      // 添加错误处理
      globalPool.on('error', (err) => {
        console.error('连接池错误:', err);
        globalPool = null; // 重置连接池，下次重新创建
      });
    }

    return globalPool;
  } catch (error) {
    console.error('数据库连接失败:', error);
    globalPool = null; // 重置连接池
    throw error;
  }
}

// 安全执行数据库查询的辅助函数
async function executeQuery(queryFn) {
  let retryCount = 0;
  const maxRetries = 3; // 增加重试次数

  while (retryCount <= maxRetries) {
    try {
      const pool = await getConnection();

      // 检查连接池状态
      if (!pool || !pool.connected) {
        throw new Error('连接池未连接');
      }

      return await queryFn(pool);
    } catch (error) {
      retryCount++;
      console.error(`数据库查询失败 (尝试 ${retryCount}/${maxRetries + 1}):`, error.message);

      if (retryCount > maxRetries) {
        // 最后一次重试失败，返回默认数据而不是抛出错误
        console.warn('数据库查询最终失败，返回默认数据');
        return null; // 返回null，让调用方处理默认数据
      }

      // 重置连接池，准备重试
      if (globalPool) {
        try {
          await globalPool.close();
        } catch (closeErr) {
          console.log('关闭连接池失败:', closeErr.message);
        }
      }
      globalPool = null;
      poolConfig = null;

      // 递增等待时间再重试
      const waitTime = Math.min(200 * retryCount, 1000); // 最多等待1秒
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

module.exports = {
  sql,
  config,
  getDynamicConfig,
  getConnection,
  executeQuery
};