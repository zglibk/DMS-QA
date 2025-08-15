/**
 * 数据库连接配置模块
 *
 * 功能说明：
 * 1. 管理SQL Server数据库连接
 * 2. 支持动态配置切换
 * 3. 连接池管理
 * 4. 配置缓存优化
 *
 * 设计特点：
 * - 默认配置 + 动态配置
 * - 连接池复用
 * - 配置缓存机制
 * - 错误处理和重试
 *
 * 数据库要求：
 * - SQL Server 2008R2 或更高版本
 * - 支持TCP/IP连接
 * - 启用混合身份验证
 */

// 导入SQL Server驱动
const sql = require('mssql');

/**
 * 默认数据库连接配置
 *
 * 配置说明：
 * - user: 数据库用户名
 * - password: 数据库密码
 * - server: 数据库服务器地址
 * - database: 数据库名称
 * - options: 连接选项
 * - pool: 连接池配置
 *
 * 注意：生产环境应使用环境变量存储敏感信息
 */
const config = {
  user: process.env.DB_USER || 'sa',                    // 数据库用户名
  password: process.env.DB_PASSWORD || 'Qa369*',       // 数据库密码
  server: process.env.DB_SERVER || '192.168.1.57',     // 数据库服务器IP（默认连接远程）
  port: parseInt(process.env.DB_PORT) || 1433,         // 数据库端口（SQL Server默认端口）
  database: process.env.DB_NAME || 'DMS-QA',           // 数据库名称
  options: {
    encrypt: false,              // 不使用SSL加密（内网环境）
    trustServerCertificate: true, // 信任服务器证书
    enableArithAbort: true,      // 启用算术中止
    useUTC: false,               // 不使用UTC时间
    requestTimeout: 30000,       // 请求超时时间（30秒）
    connectionTimeout: 30000,    // 连接超时时间（30秒）
    parseJSON: true,             // 自动解析JSON字段
    charset: 'utf8',             // 设置字符编码为UTF-8
    collation: 'Chinese_PRC_CI_AS' // 设置中文排序规则
  },
  pool: {
    max: 20,        // 增加最大连接数以支持更多并发请求
    min: 2,         // 保持最小连接数以减少连接创建开销
    idleTimeoutMillis: 60000,  // 增加空闲超时时间
    acquireTimeoutMillis: 30000,  // 获取连接的超时时间
    createTimeoutMillis: 30000,   // 创建连接的超时时间
    destroyTimeoutMillis: 5000,   // 销毁连接的超时时间
    reapIntervalMillis: 1000,     // 检查空闲连接的间隔
    createRetryIntervalMillis: 200  // 重试创建连接的间隔
  }
};

/**
 * 动态配置缓存
 *
 * 目的：避免频繁查询数据库获取配置
 * 机制：内存缓存 + 时间过期
 */
let cachedDynamicConfig = null;  // 缓存的配置对象
let configCacheTime = 0;         // 缓存时间戳
const CONFIG_CACHE_DURATION = 60000; // 缓存有效期（1分钟）

/**
 * 获取动态数据库配置
 *
 * 功能：从DbConfig表获取当前有效的数据库配置
 *
 * 工作流程：
 * 1. 检查缓存是否有效
 * 2. 如果缓存过期，从数据库查询最新配置
 * 3. 更新缓存并返回配置
 * 4. 如果查询失败，返回默认配置
 *
 * 缓存机制：
 * - 减少数据库查询频率
 * - 提高系统性能
 * - 避免配置表锁定
 *
 * 返回值：数据库连接配置对象
 */
async function getDynamicConfig() {
  // 检查缓存是否有效
  const now = Date.now();
  if (cachedDynamicConfig && (now - configCacheTime) < CONFIG_CACHE_DURATION) {
    return cachedDynamicConfig;
  }

  let pool = null;
  try {
    // 使用默认配置连接数据库
    pool = await sql.connect(config);

    // 查询当前有效的数据库配置
    const result = await pool.request()
      .query(`
        SELECT TOP 1
          Host, DatabaseName, DbUser, DbPassword,
          FileStoragePath, FileServerPort, FileUrlPrefix,
          ExcelTempPath, NetworkSharePath
        FROM DbConfig
        WHERE IsCurrent = 1
        ORDER BY ID DESC
      `);

    if (result.recordset.length > 0) {
      const dbConfig = result.recordset[0];

      // 构建新的数据库配置
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
          parseJSON: true,
          charset: 'utf8',             // 设置字符编码为UTF-8
          collation: 'Chinese_PRC_CI_AS' // 设置中文排序规则
        },
        pool: {
          max: 20,        // 增加最大连接数以支持更多并发请求
          min: 2,         // 保持最小连接数以减少连接创建开销
          idleTimeoutMillis: 60000,  // 增加空闲超时时间
          acquireTimeoutMillis: 30000,  // 获取连接的超时时间
          createTimeoutMillis: 30000,   // 创建连接的超时时间
          destroyTimeoutMillis: 5000,   // 销毁连接的超时时间
          reapIntervalMillis: 1000,     // 检查空闲连接的间隔
          createRetryIntervalMillis: 200  // 重试创建连接的间隔
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
          // 只有在连接池已连接或连接中时才关闭
          if (globalPool.connected || globalPool.connecting) {
            await globalPool.close();
          }
        } catch (err) {
          console.log('关闭旧连接池失败:', err.message);
        }
      }

      // 创建新的连接池
      globalPool = new sql.ConnectionPool(dynamicConfig);
      poolConfig = { ...dynamicConfig };

      // 添加错误处理
      globalPool.on('error', (err) => {
        console.error('连接池错误:', err);
        globalPool = null; // 重置连接池，下次重新创建
      });

      // 连接到数据库
      await globalPool.connect();
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
          // 只有在连接池已连接或连接中时才关闭
          if (globalPool.connected || globalPool.connecting) {
            await globalPool.close();
          }
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