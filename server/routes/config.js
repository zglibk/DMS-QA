const express = require('express');
const router = express.Router();
const path = require('path');
const { sql, config, getDynamicConfig, getConnection, executeQuery } = require('../db');
const XLSX = require('xlsx');
const cron = require('node-cron');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// 自动备份调度器相关变量
let autoBackupScheduler = null;
let autoBackupConfig = null;

// =============================================
// 自动备份调度器辅助函数
// ============================================

// 启动自动备份调度器
const startAutoBackupScheduler = async (config) => {
  try {
    // 停止现有的调度器
    if (autoBackupScheduler) {
      autoBackupScheduler.stop();
      autoBackupScheduler = null;
    }

    autoBackupConfig = config;

    // 构建cron表达式
    const cronExpression = buildCronExpression(config);
    console.log('自动备份调度器启动，cron表达式:', cronExpression);

    // 创建新的调度器
    autoBackupScheduler = cron.schedule(cronExpression, async () => {
      console.log('执行自动备份任务...');
      try {
        await executeAutoBackup();
      } catch (error) {
        console.error('自动备份执行失败:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    console.log('自动备份调度器启动成功');
  } catch (error) {
    console.error('启动自动备份调度器失败:', error);
    throw error;
  }
};

// 停止自动备份调度器
const stopAutoBackupScheduler = async () => {
  if (autoBackupScheduler) {
    autoBackupScheduler.stop();
    autoBackupScheduler = null;
    autoBackupConfig = null;
    console.log('自动备份调度器已停止');
  }
};

// 构建cron表达式
const buildCronExpression = (config) => {
  const [hour, minute] = config.backupTime.split(':');

  switch (config.frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${config.weekDay}`;
    case 'monthly':
      return `${minute} ${hour} ${config.monthDay} * *`;
    default:
      return `${minute} ${hour} * * *`; // 默认每日
  }
};

// 获取自动备份服务状态
const getAutoBackupServiceStatus = () => {
  return autoBackupScheduler ? 'running' : 'stopped';
};

// 获取下次备份时间
const getNextBackupTime = () => {
  if (!autoBackupScheduler || !autoBackupConfig) {
    return null;
  }

  try {
    const now = new Date();
    const [hour, minute] = autoBackupConfig.backupTime.split(':');

    let nextDate = new Date();
    nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // 如果今天的时间已过，计算下次执行时间
    if (nextDate <= now) {
      switch (autoBackupConfig.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (7 - nextDate.getDay() + autoBackupConfig.weekDay) % 7);
          if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 7);
          }
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(autoBackupConfig.monthDay);
          break;
      }
    }

    return nextDate.toISOString();
  } catch (error) {
    console.error('计算下次备份时间失败:', error);
    return null;
  }
};

// 执行自动备份
const executeAutoBackup = async () => {
  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `auto-backup_${timestamp}`;

    console.log('开始执行自动备份:', backupName);

    const result = await createAutoBackup({
      backupName: backupName,
      backupType: autoBackupConfig.backupType || 'FULL',
      backupScheme: autoBackupConfig.backupScheme || 'default',
      description: '系统自动备份'
    });

    console.log('自动备份完成:', result);

    // 清理旧备份
    if (autoBackupConfig.retentionCount > 0) {
      await cleanupOldBackups(autoBackupConfig.retentionCount);
    }
  } catch (error) {
    console.error('自动备份执行失败:', error);
    throw error;
  }
};

// 创建自动备份
const createAutoBackup = async (params) => {
  const { backupName, backupType, backupScheme, description } = params;

  try {
    // 获取数据库配置
    const dbConfigResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT ConfigKey, ConfigValue
          FROM SiteConfig
          WHERE ConfigKey IN ('BackupPath', 'DefaultBackupPath', 'AlternativeBackupPath')
        `);
    });

    const dbConfig = {};
    dbConfigResult.recordset.forEach(row => {
      dbConfig[row.ConfigKey] = row.ConfigValue;
    });

    // 确定备份路径
    let backupPath;
    if (backupScheme === 'alternative' && dbConfig.AlternativeBackupPath) {
      backupPath = dbConfig.AlternativeBackupPath;
    } else {
      // 使用默认的SQL Server备份路径
      backupPath = 'D:\\Program Files\\Microsoft SQL Server\\MSSQL10_50.MSSQLSERVER\\MSSQL\\Backup';
    }

    // 生成完整的备份文件路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullBackupPath = `${backupPath}\\${backupName}_${timestamp}.bak`;

    // 插入备份记录
    const insertResult = await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupName', sql.NVarChar, backupName)
        .input('backupType', sql.NVarChar, backupType)
        .input('backupPath', sql.NVarChar, fullBackupPath)
        .input('databaseName', sql.NVarChar, 'DMS-QA')
        .input('backupStartTime', sql.DateTime, new Date())
        .input('createdBy', sql.NVarChar, 'auto-backup')
        .input('description', sql.NVarChar(sql.MAX), description)
        .query(`
          INSERT INTO BackupRecord (
            BackupName, BackupType, BackupPath, DatabaseName,
            BackupStartTime, BackupStatus, CreatedBy, Description
          )
          OUTPUT INSERTED.ID
          VALUES (
            @backupName, @backupType, @backupPath, @databaseName,
            @backupStartTime, 'RUNNING', @createdBy, @description
          )
        `);
    });

    const backupId = insertResult.recordset[0].ID;

    // 执行备份命令
    const backupSql = `BACKUP DATABASE [DMS-QA] TO DISK = N'${fullBackupPath}' WITH INIT`;
    console.log('执行自动备份SQL:', backupSql);

    await executeQuery(async (pool) => {
      return await pool.request().query(backupSql);
    });

    // 获取备份文件大小
    const { spawn } = require('child_process');
    const getFileSizeCommand = `dir "${fullBackupPath}" | findstr "${backupName}"`;

    let backupSize = 0;
    try {
      const sizeResult = await new Promise((resolve, reject) => {
        const child = spawn('cmd', ['/c', getFileSizeCommand], {
          cwd: 'C:\\',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}`));
          }
        });

        child.on('error', reject);
      });

      // 解析文件大小
      const sizeMatch = sizeResult.match(/\s+(\d+)\s+/);
      if (sizeMatch) {
        backupSize = parseInt(sizeMatch[1]);
      }
    } catch (error) {
      console.warn('获取备份文件大小失败:', error);
    }

    // 更新备份记录为成功
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupId', sql.Int, backupId)
        .input('backupSize', sql.BigInt, backupSize)
        .input('backupEndTime', sql.DateTime, new Date())
        .query(`
          UPDATE BackupRecord
          SET BackupStatus = 'SUCCESS',
              BackupSize = @backupSize,
              BackupEndTime = @backupEndTime,
              UpdatedAt = GETDATE()
          WHERE ID = @backupId
        `);
    });

    console.log('自动备份创建成功:', {
      backupId: backupId,
      backupName: backupName,
      backupPath: fullBackupPath,
      backupSize: backupSize
    });

    return {
      backupId: backupId,
      backupName: backupName,
      backupPath: fullBackupPath,
      backupSize: backupSize,
      success: true
    };
  } catch (error) {
    console.error('创建自动备份失败:', error);
    throw error;
  }
};

// 清理旧备份
const cleanupOldBackups = async (retentionCount) => {
  try {
    console.log('开始清理旧备份，保留数量:', retentionCount);

    // 获取自动备份记录，按时间倒序
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .input('retentionCount', retentionCount)
        .query(`
          SELECT ID, BackupName, BackupPath
          FROM (
            SELECT ID, BackupName, BackupPath,
                   ROW_NUMBER() OVER (ORDER BY BackupStartTime DESC) as RowNum
            FROM BackupRecord
            WHERE CreatedBy = 'auto-backup' AND BackupStatus = 'SUCCESS'
          ) t
          WHERE t.RowNum > @retentionCount
        `);
    });

    if (result.recordset.length > 0) {
      console.log(`发现 ${result.recordset.length} 个需要清理的旧备份`);

      for (const backup of result.recordset) {
        try {
          // 删除数据库记录
          await executeQuery(async (pool) => {
            return await pool.request()
              .input('backupId', backup.ID)
              .query('DELETE FROM BackupRecord WHERE ID = @backupId');
          });

          console.log(`已删除旧备份记录: ${backup.BackupName}`);
        } catch (error) {
          console.error(`删除备份记录失败 ${backup.BackupName}:`, error);
        }
      }
    } else {
      console.log('没有需要清理的旧备份');
    }
  } catch (error) {
    console.error('清理旧备份失败:', error);
  }
};

// 获取所有数据库配置列表
router.get('/db-list', authenticateToken, checkPermission('system:config:view'), async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT ID, Host, DatabaseName, DbUser, ConfigName, Remark, IsCurrent, IsValid, UpdatedAt, FileStoragePath, FileServerPort, FileUrlPrefix, ExcelTempPath, NetworkSharePath FROM DbConfig ORDER BY UpdatedAt DESC, ID DESC');

    await pool.close();
    res.json({ success: true, data: result.recordset });
  } catch (e) {
    res.status(500).json({ message: '获取配置列表失败', error: e.message });
  }
});

// 设置当前配置
router.post('/set-current', authenticateToken, checkPermission('system:config:edit'), async (req, res) => {
  const { configId } = req.body;
  if (!configId) {
    return res.status(400).json({ message: '请提供配置ID' });
  }
  try {
    let pool = await sql.connect(config);

    // 先将所有配置的IsCurrent设为0
    await pool.request()
      .query('UPDATE DbConfig SET IsCurrent = 0');

    // 再将指定配置的IsCurrent设为1
    await pool.request()
      .input('ConfigId', sql.Int, configId)
      .query('UPDATE DbConfig SET IsCurrent = 1 WHERE ID = @ConfigId');

    await pool.close();
    res.json({ success: true, message: '当前配置已更新' });
  } catch (e) {
    res.status(500).json({ message: '设置当前配置失败', error: e.message });
  }
});

// 测试数据库连接（不保存，仅测试）
router.post('/test-db', authenticateToken, checkPermission('system:config:edit'), async (req, res) => {
  const { Host, DatabaseName, DbUser, DbPassword } = req.body;
  if (!Host || !DatabaseName || !DbUser || !DbPassword) {
    return res.status(400).json({ message: '请填写所有字段' });
  }
  const testConfig = {
    user: DbUser,
    password: DbPassword,
    server: Host,
    database: DatabaseName,
    options: { encrypt: false, trustServerCertificate: true }
  };
  try {
    let pool = await sql.connect(testConfig);
    await pool.close();
    res.json({ success: true, message: '连接成功' });
  } catch (e) {
    res.status(500).json({ success: false, message: '连接失败', error: e.message });
  }
});

// 保存数据库配置（检查重复记录）
router.post('/db', authenticateToken, checkPermission('system:config:edit'), async (req, res) => {
  const { Host, DatabaseName, DbUser, DbPassword, ConfigName, Remark, FileStoragePath, FileServerPort, FileUrlPrefix, ExcelTempPath, NetworkSharePath } = req.body;
  if (!Host || !DatabaseName || !DbUser || !DbPassword) {
    return res.status(400).json({ message: '请填写所有必填字段' });
  }
  try {
    let pool = await sql.connect(config);

    // 检查是否存在相同的核心数据库连接配置（不包括文件存储字段）
    const checkResult = await pool.request()
      .input('Host', sql.NVarChar(255), Host)
      .input('DatabaseName', sql.NVarChar(255), DatabaseName)
      .input('DbUser', sql.NVarChar(255), DbUser)
      .input('DbPassword', sql.NVarChar(255), DbPassword)
      .query('SELECT ID, ConfigName FROM DbConfig WHERE Host = @Host AND DatabaseName = @DatabaseName AND DbUser = @DbUser AND DbPassword = @DbPassword');

    if (checkResult.recordset.length > 0) {
      const existingConfig = checkResult.recordset[0];
      return res.status(400).json({
        message: `相同的数据库连接配置已存在（配置名：${existingConfig.ConfigName || '默认'}），请选择该配置进行更新，或修改连接参数创建新配置`,
        existingConfigId: existingConfig.ID
      });
    }

    // 插入新配置
    const insertResult = await pool.request()
      .input('Host', sql.NVarChar(255), Host)
      .input('DatabaseName', sql.NVarChar(255), DatabaseName)
      .input('DbUser', sql.NVarChar(255), DbUser)
      .input('DbPassword', sql.NVarChar(255), DbPassword)
      .input('ConfigName', sql.NVarChar(255), ConfigName || '默认配置')
      .input('Remark', sql.NVarChar(500), Remark || '')
      .input('FileStoragePath', sql.NVarChar(500), FileStoragePath || null)
      .input('FileServerPort', sql.Int, FileServerPort || 8080)
      .input('FileUrlPrefix', sql.NVarChar(100), FileUrlPrefix || '/files')
      .input('ExcelTempPath', sql.NVarChar(500), ExcelTempPath || 'file:///C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel')
      .input('NetworkSharePath', sql.NVarChar(500), NetworkSharePath || '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计')
      .query(`INSERT INTO DbConfig (Host, DatabaseName, DbUser, DbPassword, ConfigName, Remark, IsCurrent, IsValid, UpdatedAt, FileStoragePath, FileServerPort, FileUrlPrefix, ExcelTempPath, NetworkSharePath)
              OUTPUT INSERTED.ID
              VALUES (@Host, @DatabaseName, @DbUser, @DbPassword, @ConfigName, @Remark, 0, 1, GETDATE(), @FileStoragePath, @FileServerPort, @FileUrlPrefix, @ExcelTempPath, @NetworkSharePath)`);

    await pool.close();
    res.json({
      success: true,
      message: '配置已保存',
      configId: insertResult.recordset[0].ID
    });
  } catch (e) {
    res.status(500).json({ message: '保存失败', error: e.message });
  }
});

// 更新数据库配置
router.put('/db/:id', authenticateToken, checkPermission('system:config:edit'), async (req, res) => {
  const { id } = req.params;
  const { Host, DatabaseName, DbUser, DbPassword, ConfigName, Remark, FileStoragePath, FileServerPort, FileUrlPrefix, ExcelTempPath, NetworkSharePath } = req.body;

  if (!Host || !DatabaseName || !DbUser || !DbPassword) {
    return res.status(400).json({ message: '请填写所有必填字段' });
  }

  try {
    let pool = await sql.connect(config);

    // 更新配置
    await pool.request()
      .input('ID', sql.Int, id)
      .input('Host', sql.NVarChar(255), Host)
      .input('DatabaseName', sql.NVarChar(255), DatabaseName)
      .input('DbUser', sql.NVarChar(255), DbUser)
      .input('DbPassword', sql.NVarChar(255), DbPassword)
      .input('ConfigName', sql.NVarChar(255), ConfigName || '默认配置')
      .input('Remark', sql.NVarChar(500), Remark || '')
      .input('FileStoragePath', sql.NVarChar(500), FileStoragePath || null)
      .input('FileServerPort', sql.Int, FileServerPort || 8080)
      .input('FileUrlPrefix', sql.NVarChar(100), FileUrlPrefix || '/files')
      .input('ExcelTempPath', sql.NVarChar(500), ExcelTempPath || 'file:///C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel')
      .input('NetworkSharePath', sql.NVarChar(500), NetworkSharePath || '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计')
      .query(`UPDATE DbConfig SET
                Host = @Host,
                DatabaseName = @DatabaseName,
                DbUser = @DbUser,
                DbPassword = @DbPassword,
                ConfigName = @ConfigName,
                Remark = @Remark,
                FileStoragePath = @FileStoragePath,
                FileServerPort = @FileServerPort,
                FileUrlPrefix = @FileUrlPrefix,
                ExcelTempPath = @ExcelTempPath,
                NetworkSharePath = @NetworkSharePath,
                UpdatedAt = GETDATE()
              WHERE ID = @ID`);

    await pool.close();
    res.json({ success: true, message: '配置已更新' });
  } catch (e) {
    res.status(500).json({ message: '更新失败', error: e.message });
  }
});

// 获取单个配置详情
router.get('/db/:id', authenticateToken, checkPermission('system:config:view'), async (req, res) => {
  const { id } = req.params;

  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT * FROM DbConfig WHERE ID = @ID');

    await pool.close();

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: '配置不存在' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (e) {
    res.status(500).json({ message: '获取配置失败', error: e.message });
  }
});

// 删除数据库配置
router.delete('/db/:id', authenticateToken, checkPermission('system:config:delete'), async (req, res) => {
  const { id } = req.params;

  try {
    let pool = await sql.connect(config);

    // 检查配置是否存在
    const checkResult = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT ID, ConfigName FROM DbConfig WHERE ID = @ID');

    if (checkResult.recordset.length === 0) {
      await pool.close();
      return res.status(404).json({ message: '配置不存在' });
    }

    // 删除配置
    await pool.request()
      .input('ID', sql.Int, id)
      .query('DELETE FROM DbConfig WHERE ID = @ID');

    await pool.close();
    res.json({ success: true, message: '配置删除成功' });
  } catch (e) {
    res.status(500).json({ message: '删除失败', error: e.message });
  }
});

// 验证文件存储路径
router.post('/validate-storage-path', async (req, res) => {
  const { path: storagePath } = req.body;

  if (!storagePath) {
    return res.status(400).json({ message: '请提供文件存储路径' });
  }

  try {
    const fs = require('fs').promises;
    const path = require('path');

    // 解析路径
    const resolvedPath = path.resolve(storagePath);

    try {
      // 尝试创建目录
      await fs.mkdir(resolvedPath, { recursive: true });

      // 检查是否可写
      const testFile = path.join(resolvedPath, 'test_write_permission.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      res.json({
        success: true,
        message: '路径验证成功',
        resolvedPath: resolvedPath
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: '路径无效或无写入权限: ' + error.message
      });
    }
  } catch (e) {
    res.status(500).json({ message: '路径验证失败', error: e.message });
  }
});

// 测试存储路径
router.post('/test-storage', async (req, res) => {
  const { path: storagePath } = req.body;

  if (!storagePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件存储路径'
    });
  }

  try {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');

    console.log('测试存储路径:', storagePath);

    // 解析路径
    const resolvedPath = path.resolve(storagePath);
    console.log('解析后的路径:', resolvedPath);

    try {
      // 检查路径是否存在
      const stats = await fs.stat(resolvedPath);
      console.log('路径状态:', {
        exists: true,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mode: stats.mode.toString(8)
      });

      if (!stats.isDirectory()) {
        return res.status(400).json({
          success: false,
          message: '指定的路径不是一个目录',
          details: { resolvedPath }
        });
      }

      // 生成唯一的测试目录名
      const testDirName = 'dms_test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const testDir = path.join(resolvedPath, testDirName);
      console.log('测试目录:', testDir);

      // 尝试创建测试目录
      await fs.mkdir(testDir, { recursive: true });
      console.log('测试目录创建成功');

      // 检查是否可写
      const testFileName = 'test_write_permission.tmp';
      const testFile = path.join(testDir, testFileName);
      const testContent = `DMS-QA 存储测试文件\n创建时间: ${new Date().toISOString()}\n测试ID: ${testDirName}`;

      await fs.writeFile(testFile, testContent, 'utf8');
      console.log('测试文件写入成功');

      // 读取测试文件验证
      const readContent = await fs.readFile(testFile, 'utf8');
      console.log('测试文件读取成功');

      // 检查文件大小
      const fileStats = await fs.stat(testFile);
      console.log('测试文件状态:', { size: fileStats.size });

      // 清理测试文件和目录
      await fs.unlink(testFile);
      console.log('测试文件删除成功');

      await fs.rmdir(testDir);
      console.log('测试目录删除成功');

      res.json({
        success: true,
        message: '存储路径测试成功，可正常读写',
        details: {
          originalPath: storagePath,
          resolvedPath: resolvedPath,
          testDirectory: testDirName,
          testFileSize: fileStats.size,
          testContent: readContent.substring(0, 100) + (readContent.length > 100 ? '...' : ''),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('存储测试详细错误:', error);

      let errorMessage = '存储路径测试失败';
      let errorDetails = {
        originalPath: storagePath,
        resolvedPath: resolvedPath,
        errorCode: error.code,
        errorMessage: error.message
      };

      // 根据错误类型提供更具体的错误信息
      if (error.code === 'ENOENT') {
        errorMessage = '存储路径不存在';
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        errorMessage = '存储路径权限不足，无法读写';
      } else if (error.code === 'ENOTDIR') {
        errorMessage = '指定的路径不是一个目录';
      } else if (error.code === 'ENOSPC') {
        errorMessage = '存储空间不足';
      }

      res.status(400).json({
        success: false,
        message: errorMessage + ': ' + error.message,
        details: errorDetails
      });
    }
  } catch (e) {
    console.error('存储测试系统错误:', e);
    res.status(500).json({
      success: false,
      message: '存储测试系统错误: ' + e.message,
      details: {
        originalPath: storagePath,
        systemError: e.message
      }
    });
  }
});

// 测试数据库连接接口（用于前端连接测试）
router.post('/test-connection', async (req, res) => {
  const { Host, DatabaseName, DbUser, DbPassword } = req.body;

  if (!Host || !DatabaseName || !DbUser || !DbPassword) {
    return res.status(400).json({
      success: false,
      message: '请填写所有必填字段'
    });
  }

  const testConfig = {
    user: DbUser,
    password: DbPassword,
    server: Host,
    database: DatabaseName,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000
    }
  };

  try {
    console.log('测试数据库连接:', { Host, DatabaseName, DbUser });
    let pool = await sql.connect(testConfig);

    // 执行一个简单的查询来验证连接
    const result = await pool.request().query('SELECT 1 as test');

    await pool.close();

    res.json({
      success: true,
      message: '数据库连接测试成功',
      details: {
        server: Host,
        database: DatabaseName,
        user: DbUser,
        testResult: result.recordset[0],
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('数据库连接测试失败:', e);
    res.status(500).json({
      success: false,
      message: '数据库连接测试失败: ' + e.message,
      details: {
        server: Host,
        database: DatabaseName,
        user: DbUser,
        error: e.code || e.message
      }
    });
  }
});

// ===================== 主页卡片配置接口 =====================

// 获取主页卡片配置
router.get('/home-cards', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    // 检查表是否存在
    const tableCheckResult = await connection.request()
      .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HomeCardConfig]') AND type in (N'U')`);

    if (tableCheckResult.recordset[0].count === 0) {
      // 表不存在，返回默认配置
      console.log('HomeCardConfig表不存在，返回默认配置');
      const defaultConfig = {
        showTodayCount: true,
        showMonthCount: true,
        displayUnits: [
          { name: '数码印刷', type: 'workshop', enabled: true },
          { name: '轮转机', type: 'workshop', enabled: true },
          { name: '跟单', type: 'department', enabled: true },
          { name: '设计', type: 'department', enabled: true },
          { name: '品检', type: 'department', enabled: true }
        ]
      };

      return res.json({
        success: true,
        data: defaultConfig,
        message: '获取主页卡片配置成功（使用默认配置）'
      });
    }

    const result = await connection.request()
      .query(`SELECT ConfigKey, ConfigValue FROM HomeCardConfig WHERE IsActive = 1`);

    const config = {};
    result.recordset.forEach(row => {
      const key = row.ConfigKey;
      let value = row.ConfigValue;

      // 尝试解析JSON值
      if (key === 'displayUnits') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('解析displayUnits配置失败:', e);
          value = [];
        }
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      config[key] = value;
    });

    // 设置默认值
    if (!config.hasOwnProperty('showTodayCount')) {
      config.showTodayCount = true;
    }
    if (!config.hasOwnProperty('showMonthCount')) {
      config.showMonthCount = true;
    }
    if (!config.hasOwnProperty('displayUnits')) {
      config.displayUnits = [
        { name: '数码印刷', type: 'workshop', enabled: true },
        { name: '轮转机', type: 'workshop', enabled: true },
        { name: '跟单', type: 'department', enabled: true },
        { name: '设计', type: 'department', enabled: true },
        { name: '品检', type: 'department', enabled: true }
      ];
    }

    res.json({
      success: true,
      data: config,
      message: '获取主页卡片配置成功'
    });
  } catch (error) {
    console.error('获取主页卡片配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// 保存主页卡片配置
router.put('/home-cards', async (req, res) => {
  let connection;
  try {
    const { showTodayCount, showMonthCount, displayUnits, setAsDefault } = req.body;

    connection = await getConnection();

    // 检查表是否存在
    const tableCheckResult = await connection.request()
      .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HomeCardConfig]') AND type in (N'U')`);

    if (tableCheckResult.recordset[0].count === 0) {
      // 表不存在，返回提示信息
      console.log('HomeCardConfig表不存在，无法保存配置');
      return res.json({
        success: false,
        message: '数据库表不存在，请先执行建表SQL脚本。配置已临时生效，但不会持久化保存。',
        data: {
          showTodayCount,
          showMonthCount,
          displayUnits,
          savedAt: new Date().toISOString(),
          persistent: false
        }
      });
    }

    // 开始事务
    const transaction = connection.transaction();
    await transaction.begin();

    try {
      // 更新或插入配置
      const configs = [
        { key: 'showTodayCount', value: showTodayCount ? 'true' : 'false', description: '是否显示今日投诉统计卡片' },
        { key: 'showMonthCount', value: showMonthCount ? 'true' : 'false', description: '是否显示本月投诉统计卡片' },
        { key: 'displayUnits', value: JSON.stringify(displayUnits || []), description: '显示的部门/车间单位配置' }
      ];

      for (const config of configs) {
        // 检查配置是否存在
        const existResult = await transaction.request()
          .input('ConfigKey', config.key)
          .query('SELECT ID FROM HomeCardConfig WHERE ConfigKey = @ConfigKey');

        if (existResult.recordset.length > 0) {
          // 更新现有配置
          await transaction.request()
            .input('ConfigKey', config.key)
            .input('ConfigValue', config.value)
            .query(`UPDATE HomeCardConfig SET
                      ConfigValue = @ConfigValue,
                      UpdatedAt = GETDATE()
                    WHERE ConfigKey = @ConfigKey`);
        } else {
          // 插入新配置
          await transaction.request()
            .input('ConfigKey', config.key)
            .input('ConfigValue', config.value)
            .input('Description', config.description)
            .query(`INSERT INTO HomeCardConfig (ConfigKey, ConfigValue, Description, IsActive, CreatedAt, UpdatedAt)
                    VALUES (@ConfigKey, @ConfigValue, @Description, 1, GETDATE(), GETDATE())`);
        }
      }

      // 提交事务
      await transaction.commit();

      // 如果设为默认，更新默认配置标记
      if (setAsDefault) {
        try {
          // 先清除所有默认标记
          await transaction.request()
            .query(`UPDATE HomeCardConfig SET ConfigValue = REPLACE(ConfigValue, '"isDefault":true', '"isDefault":false') WHERE ConfigKey = 'displayUnits'`);

          // 为当前配置添加默认标记
          const defaultUnits = displayUnits.map(unit => ({ ...unit, isDefault: true }));
          await transaction.request()
            .input('ConfigKey', 'displayUnits')
            .input('ConfigValue', JSON.stringify(defaultUnits))
            .query(`UPDATE HomeCardConfig SET ConfigValue = @ConfigValue WHERE ConfigKey = @ConfigKey`);
        } catch (defaultError) {
          console.error('设置默认配置失败:', defaultError);
        }
      }

      res.json({
        success: true,
        message: setAsDefault ? '主页卡片配置已保存并设为默认' : '主页卡片配置保存成功',
        data: {
          showTodayCount,
          showMonthCount,
          displayUnits,
          savedAt: new Date().toISOString(),
          persistent: true,
          isDefault: setAsDefault || false
        }
      });
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('保存主页卡片配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// ===================== 网站LOGO配置接口 =====================

// 初始化SiteConfig表
router.post('/init-site-config', authenticateToken, checkPermission('system:config:edit'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // 读取SQL脚本
    const sqlScript = fs.readFileSync(path.join(__dirname, '../create_siteconfig_table.sql'), 'utf8');

    // 执行SQL脚本
    await executeQuery(async (pool) => {
      return await pool.request().query(sqlScript);
    });

    res.json({
      success: true,
      message: 'SiteConfig表初始化成功'
    });

  } catch (error) {
    console.error('初始化SiteConfig表失败:', error);
    res.status(500).json({
      success: false,
      message: '初始化失败: ' + error.message
    });
  }
});

// 获取网站配置（公开接口，不需要认证）
router.get('/site-config', async (req, res) => {
  try {
    // 默认配置
    const defaultConfig = {
      siteName: '质量数据管理系统',
      siteDescription: '专业的质量数据管理与分析平台，提供全面的质量控制和数据统计功能',
      companyName: 'DMS质量管理系统',
      logoBase64Img: '/logo.png',
      faviconBase64Img: '/logo.png',
      headerTitle: '质量数据系统',
      loginTitle: 'DMS-QA 质量管理系统',
      footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
    };

    try {
      // 从数据库读取配置
      const result = await executeQuery(async (pool) => {
        return await pool.request()
          .query(`SELECT ConfigKey, ConfigValue FROM SiteConfig WHERE ConfigKey IN ('siteName', 'siteDescription', 'companyName', 'logoBase64Img', 'faviconBase64Img', 'headerTitle', 'loginTitle', 'footerCopyright')`);
      });
      console.log('数据库查询结果:', result);

      if (result && result.recordset && result.recordset.length > 0) {
        // 将数据库结果转换为配置对象
        const dbConfig = {};
        result.recordset.forEach(row => {
          dbConfig[row.ConfigKey] = row.ConfigValue;
        });

        // 合并默认配置和数据库配置
        const finalConfig = { ...defaultConfig, ...dbConfig };
        console.log('最终配置:', finalConfig);

        res.json({
          success: true,
          data: finalConfig,
          message: '获取网站配置成功'
        });
      } else {
        console.log('数据库中没有配置数据，使用默认配置');
        res.json({
          success: true,
          data: defaultConfig,
          message: '获取网站配置成功（使用默认配置）'
        });
      }

    } catch (dbError) {
      console.error('数据库读取失败，使用默认配置:', dbError);
      res.json({
        success: true,
        data: defaultConfig,
        message: '获取网站配置成功（数据库读取失败，使用默认配置）'
      });
    }

  } catch (error) {
    console.error('获取网站配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败: ' + error.message
    });
  }
});

// 保存网站配置
router.put('/site-config', async (req, res) => {
  try {
    const { siteName, siteDescription, companyName, logoBase64Img, faviconBase64Img, headerTitle, loginTitle, footerCopyright } = req.body;

    try {
      // 配置项映射
      const configItems = [
        { key: 'siteName', value: siteName || '质量数据管理系统' },
        { key: 'siteDescription', value: siteDescription || '专业的质量数据管理与分析平台，提供全面的质量控制和数据统计功能' },
        { key: 'companyName', value: companyName || 'DMS质量管理系统' },
        { key: 'logoBase64Img', value: logoBase64Img || '/logo.png' },
        { key: 'faviconBase64Img', value: faviconBase64Img || '/logo.png' },
        { key: 'headerTitle', value: headerTitle || '质量数据系统' },
        { key: 'loginTitle', value: loginTitle || 'DMS-QA 质量管理系统' },
        { key: 'footerCopyright', value: footerCopyright || '© 2025 DMS质量管理系统. All rights reserved.' }
      ];

      // 逐个更新或插入配置项
      for (const item of configItems) {
        try {
          // 使用executeQuery函数的正确方式
          const checkResult = await executeQuery(async (pool) => {
            return await pool.request()
              .input('ConfigKey', sql.NVarChar, item.key)
              .query('SELECT COUNT(*) as count FROM SiteConfig WHERE ConfigKey = @ConfigKey');
          });

          if (checkResult && checkResult.recordset && checkResult.recordset[0].count > 0) {
            // 更新现有配置
            await executeQuery(async (pool) => {
              return await pool.request()
                .input('ConfigValue', sql.NVarChar, item.value)
                .input('ConfigKey', sql.NVarChar, item.key)
                .query('UPDATE SiteConfig SET ConfigValue = @ConfigValue, UpdatedAt = GETDATE() WHERE ConfigKey = @ConfigKey');
            });
            console.log(`更新配置项: ${item.key} = ${item.value.length > 100 ? item.value.substring(0, 100) + '...' : item.value}`);
          } else {
            // 插入新配置
            const description = {
              'siteName': '网站名称',
              'siteDescription': '网站描述信息',
              'companyName': '公司名称',
              'logoBase64Img': '网站LOGO图片BASE64数据',
              'faviconBase64Img': '网站图标BASE64数据',
              'headerTitle': '页面头部标题',
              'loginTitle': '登录页面标题',
              'footerCopyright': '页脚版权信息'
            };

            await executeQuery(async (pool) => {
              return await pool.request()
                .input('ConfigKey', sql.NVarChar, item.key)
                .input('ConfigValue', sql.NVarChar, item.value)
                .input('ConfigType', sql.NVarChar, item.key.includes('Url') ? 'image' : 'text')
                .input('Description', sql.NVarChar, description[item.key] || '网站配置项')
                .query('INSERT INTO SiteConfig (ConfigKey, ConfigValue, ConfigType, Description) VALUES (@ConfigKey, @ConfigValue, @ConfigType, @Description)');
            });
            console.log(`插入配置项: ${item.key} = ${item.value.length > 100 ? item.value.substring(0, 100) + '...' : item.value}`);
          }
        } catch (itemError) {
          console.error(`处理配置项 ${item.key} 失败:`, itemError);
        }
      }

      res.json({
        success: true,
        message: '网站配置保存成功',
        data: {
          siteName: siteName || '质量数据管理系统',
          siteDescription: siteDescription || '专业的质量数据管理与分析平台，提供全面的质量控制和数据统计功能',
          companyName: companyName || 'DMS质量管理系统',
          logoBase64Img: logoBase64Img || '/logo.png',
          faviconBase64Img: faviconBase64Img || '/logo.png',
          headerTitle: headerTitle || '质量数据系统',
          loginTitle: loginTitle || 'DMS-QA 质量管理系统',
          footerCopyright: footerCopyright || '© 2025 DMS质量管理系统. All rights reserved.',
          savedAt: new Date().toISOString(),
          persistent: true
        }
      });

    } catch (dbError) {
      console.error('数据库保存失败:', dbError);
      res.json({
        success: true,
        message: '网站配置保存成功（临时生效，数据库保存失败）',
        data: {
          siteName: siteName || '质量数据管理系统',
          siteDescription: siteDescription || '专业的质量数据管理与分析平台，提供全面的质量控制和数据统计功能',
          companyName: companyName || 'DMS质量管理系统',
          logoBase64Img: logoBase64Img || '/logo.png',
          faviconBase64Img: faviconBase64Img || '/logo.png',
          headerTitle: headerTitle || '质量数据系统',
          loginTitle: loginTitle || 'DMS-QA 质量管理系统',
          footerCopyright: footerCopyright || '© 2025 DMS质量管理系统. All rights reserved.',
          savedAt: new Date().toISOString(),
          persistent: false,
          error: dbError.message
        }
      });
    }

  } catch (error) {
    console.error('保存网站配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败: ' + error.message
    });
  }
});

// ===================== 获取车间和部门数据接口 =====================

// 获取所有车间数据
router.get('/workshops', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      // 检查Workshop表是否存在
      const tableCheckResult = await pool.request()
        .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Workshop]') AND type in (N'U')`);

      if (tableCheckResult.recordset[0].count === 0) {
        // 表不存在，返回默认数据
        console.log('Workshop表不存在，返回默认数据');
        return [
          { ID: 1, Name: '数码印刷' },
          { ID: 2, Name: '轮转机' },
          { ID: 3, Name: '印刷车间' },
          { ID: 4, Name: '裁切车间' },
          { ID: 5, Name: '包装车间' }
        ];
      }

      const workshopResult = await pool.request()
        .query(`SELECT ID, Name FROM Workshop ORDER BY Name`);

      return workshopResult.recordset;
    });

    // 如果executeQuery返回null（表示所有重试都失败），使用默认数据
    const finalResult = result || [
      { ID: 1, Name: '数码印刷' },
      { ID: 2, Name: '轮转机' },
      { ID: 3, Name: '印刷车间' },
      { ID: 4, Name: '裁切车间' },
      { ID: 5, Name: '包装车间' }
    ];

    res.json({
      success: true,
      data: finalResult,
      message: result ? '获取车间数据成功' : '获取车间数据成功（使用默认数据）'
    });
  } catch (error) {
    console.error('获取车间数据失败:', error);
    // 即使出错也返回默认数据，确保前端不会报错
    res.json({
      success: true,
      data: [
        { ID: 1, Name: '数码印刷' },
        { ID: 2, Name: '轮转机' },
        { ID: 3, Name: '印刷车间' },
        { ID: 4, Name: '裁切车间' },
        { ID: 5, Name: '包装车间' }
      ],
      message: '获取车间数据成功（使用默认数据）'
    });
  }
});

// 获取所有部门数据
router.get('/departments', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      // 检查Department表是否存在
      const tableCheckResult = await pool.request()
        .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Department]') AND type in (N'U')`);

      if (tableCheckResult.recordset[0].count === 0) {
        // 表不存在，返回默认数据
        console.log('Department表不存在，返回默认数据');
        return [
          { ID: 1, Name: '跟单' },
          { ID: 2, Name: '设计' },
          { ID: 3, Name: '品检' },
          { ID: 4, Name: '生产部' },
          { ID: 5, Name: '质检部' },
          { ID: 6, Name: '销售部' }
        ];
      }

      const departmentResult = await pool.request()
        .query(`SELECT ID, Name FROM Department ORDER BY Name`);

      return departmentResult.recordset;
    });

    // 如果executeQuery返回null（表示所有重试都失败），使用默认数据
    const finalResult = result || [
      { ID: 1, Name: '跟单' },
      { ID: 2, Name: '设计' },
      { ID: 3, Name: '品检' },
      { ID: 4, Name: '生产部' },
      { ID: 5, Name: '质检部' },
      { ID: 6, Name: '销售部' }
    ];

    res.json({
      success: true,
      data: finalResult,
      message: result ? '获取部门数据成功' : '获取部门数据成功（使用默认数据）'
    });
  } catch (error) {
    console.error('获取部门数据失败:', error);
    // 即使出错也返回默认数据，确保前端不会报错
    res.json({
      success: true,
      data: [
        { ID: 1, Name: '跟单' },
        { ID: 2, Name: '设计' },
        { ID: 3, Name: '品检' },
        { ID: 4, Name: '生产部' },
        { ID: 5, Name: '质检部' },
        { ID: 6, Name: '销售部' }
      ],
      message: '获取部门数据成功（使用默认数据）'
    });
  }
});

// ===================== 数据表初始化接口 =====================

// 获取所有可初始化的表列表
router.get('/table-list', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            t.TABLE_NAME as tableName,
            CASE
              WHEN t.TABLE_NAME = 'BackupRecord' THEN '备份记录表'
              WHEN t.TABLE_NAME = 'ComplaintCategory' THEN '投诉类别表'
              WHEN t.TABLE_NAME = 'ComplaintRegister' THEN '投诉登记表'
              WHEN t.TABLE_NAME = 'ConversionConfig' THEN '转换配置表'
              WHEN t.TABLE_NAME = 'CustomerComplaints' THEN '客户投诉表'
              WHEN t.TABLE_NAME = 'CustomerComplaintType' THEN '客诉类型表'
              WHEN t.TABLE_NAME = 'DbConfig' THEN '数据库配置表'
              WHEN t.TABLE_NAME = 'DefectiveCategory' THEN '不良类别表'
              WHEN t.TABLE_NAME = 'DefectiveItem' THEN '不良项表'
              WHEN t.TABLE_NAME = 'Department' THEN '部门表'
              WHEN t.TABLE_NAME = 'erp_config' THEN 'ERP配置表'
              WHEN t.TABLE_NAME = 'erp_delivery_data' THEN 'ERP交付数据表'
              WHEN t.TABLE_NAME = 'erp_production_data' THEN 'ERP生产数据表'
              WHEN t.TABLE_NAME = 'erp_sync_logs' THEN 'ERP同步日志表'
              WHEN t.TABLE_NAME = 'HomeCardConfig' THEN '主页卡片配置表'
              WHEN t.TABLE_NAME = 'MaterialPrice' THEN '物料单价表'
              WHEN t.TABLE_NAME = 'Menus' THEN '菜单表'
              WHEN t.TABLE_NAME = 'MonthlyBatchStats' THEN '月度批次统计表'
              WHEN t.TABLE_NAME = 'NoticeReadStatus' THEN '通知阅读状态表'
              WHEN t.TABLE_NAME = 'Notices' THEN '通知公告表'
              WHEN t.TABLE_NAME = 'PathMappingConfig' THEN '路径映射配置表'
              WHEN t.TABLE_NAME = 'Person' THEN '人员表'
              WHEN t.TABLE_NAME = 'PlanMilestones' THEN '计划里程碑表'
              WHEN t.TABLE_NAME = 'PlanProgressHistory' THEN '计划进度历史表'
              WHEN t.TABLE_NAME = 'PlanTemplates' THEN '计划模板表'
              WHEN t.TABLE_NAME = 'Positions' THEN '职位表'
              WHEN t.TABLE_NAME = 'ProductionReworkRegister' THEN '生产返工登记表'
              WHEN t.TABLE_NAME = 'publishing_exceptions' THEN '发布异常表'
              WHEN t.TABLE_NAME = 'quality_metrics' THEN '质量指标表'
              WHEN t.TABLE_NAME = 'QualityLevelSettings' THEN '质量等级设置表'
              WHEN t.TABLE_NAME = 'QualityTargets' THEN '质量目标表'
              WHEN t.TABLE_NAME = 'QualityTargetStatistics' THEN '质量目标统计表'
              WHEN t.TABLE_NAME = 'ReworkCategory' THEN '返工类别表'
              WHEN t.TABLE_NAME = 'ReworkMethod' THEN '返工方法表'
              WHEN t.TABLE_NAME = 'RoleDepartments' THEN '角色部门关联表'
              WHEN t.TABLE_NAME = 'RoleMenus' THEN '角色菜单关联表'
              WHEN t.TABLE_NAME = 'Roles' THEN '角色表'
              WHEN t.TABLE_NAME = 'SampleApproval' THEN '样品承认书表'
              WHEN t.TABLE_NAME = 'SiteConfig' THEN '网站配置表'
              WHEN t.TABLE_NAME = 'SupplierComplaints' THEN '供应商投诉表'
              WHEN t.TABLE_NAME = 'User' THEN '用户管理表'
              WHEN t.TABLE_NAME = 'UserLoginLogs' THEN '用户登录日志表'
              WHEN t.TABLE_NAME = 'UserPermissionHistory' THEN '用户权限历史表'
              WHEN t.TABLE_NAME = 'UserPermissions' THEN '用户权限表'
              WHEN t.TABLE_NAME = 'UserRoles' THEN '用户角色关联表'
              WHEN t.TABLE_NAME = 'UserTokens' THEN '用户令牌表'
              WHEN t.TABLE_NAME = 'WorkLogs' THEN '工作日志表'
              WHEN t.TABLE_NAME = 'WorkPlanExecutors' THEN '工作计划执行者表'
              WHEN t.TABLE_NAME = 'WorkPlans' THEN '工作计划表'
              WHEN t.TABLE_NAME = 'WorkReminders' THEN '工作提醒表'
              WHEN t.TABLE_NAME = 'Workshop' THEN '车间表'
              WHEN t.TABLE_NAME = 'WorkTypes' THEN '工作类型表'
              ELSE t.TABLE_NAME
            END as displayName,
            CASE
              WHEN t.TABLE_NAME IN ('User', 'DbConfig', 'PathMappingConfig', 'HomeCardConfig', 'SiteConfig', 'BackupRecord', 'ConversionConfig', 'Menus', 'Roles', 'RoleDepartments', 'RoleMenus', 'UserRoles', 'UserTokens', 'UserLoginLogs', 'UserPermissionHistory', 'UserPermissions') THEN 'system'
              WHEN t.TABLE_NAME IN ('Workshop', 'Department', 'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem', 'MaterialPrice', 'Positions', 'QualityLevelSettings', 'ReworkCategory', 'ReworkMethod', 'WorkTypes', 'Notices', 'NoticeReadStatus') THEN 'basic'
              ELSE 'business'
            END as tableType,
            CASE
              WHEN t.TABLE_NAME IN ('BackupRecord', 'ComplaintCategory', 'ComplaintRegister', 'ConversionConfig', 'CustomerComplaints', 'CustomerComplaintType', 'DbConfig', 'DefectiveCategory', 'DefectiveItem', 'Department', 'erp_config', 'erp_delivery_data', 'erp_production_data', 'erp_sync_logs', 'HomeCardConfig', 'MaterialPrice', 'Menus', 'MonthlyBatchStats', 'NoticeReadStatus', 'Notices', 'PathMappingConfig', 'Person', 'PlanMilestones', 'PlanProgressHistory', 'PlanTemplates', 'Positions', 'ProductionReworkRegister', 'publishing_exceptions', 'quality_metrics', 'QualityLevelSettings', 'QualityTargets', 'QualityTargetStatistics', 'ReworkCategory', 'ReworkMethod', 'RoleDepartments', 'RoleMenus', 'Roles', 'SampleApproval', 'SiteConfig', 'SupplierComplaints', 'User', 'UserLoginLogs', 'UserPermissionHistory', 'UserPermissions', 'UserRoles', 'UserTokens', 'WorkLogs', 'WorkPlanExecutors', 'WorkPlans', 'WorkReminders', 'Workshop', 'WorkTypes') THEN 1
              ELSE 0
            END as hasIdentity
          FROM INFORMATION_SCHEMA.TABLES t
          WHERE t.TABLE_TYPE = 'BASE TABLE'
            AND t.TABLE_SCHEMA = 'dbo'
            AND t.TABLE_NAME NOT LIKE 'sys%'
          ORDER BY
            CASE
              WHEN t.TABLE_NAME IN ('User', 'DbConfig', 'PathMappingConfig', 'HomeCardConfig', 'SiteConfig', 'BackupRecord', 'ConversionConfig', 'Menus', 'Roles', 'RoleDepartments', 'RoleMenus', 'UserRoles', 'UserTokens', 'UserLoginLogs', 'UserPermissionHistory', 'UserPermissions') THEN 'system'
              WHEN t.TABLE_NAME IN ('Workshop', 'Department', 'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem', 'MaterialPrice', 'Positions', 'QualityLevelSettings', 'ReworkCategory', 'ReworkMethod', 'WorkTypes', 'Notices', 'NoticeReadStatus') THEN 'basic'
              ELSE 'business'
            END,
            t.TABLE_NAME
        `);
    });

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('获取表列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取表列表失败: ' + error.message
    });
  }
});

// 获取表的记录数统计
router.get('/table-stats/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    // 验证表名，防止SQL注入
    const validTables = [
      'ComplaintRegister', 'MaterialPrice', 'User', 'Workshop', 'Department',
      'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory',
      'DefectiveItem', 'UserTokens', 'DbConfig', 'PathMappingConfig',
      'HomeCardConfig', 'SiteConfig', 'BackupRecord', 'ConversionConfig',
      'CustomerComplaints', 'Menus', 'MonthlyBatchStats', 'Positions',
      'ProductionReworkRegister', 'QualityLevelSettings', 'ReworkCategory',
      'ReworkMethod', 'RoleDepartments', 'RoleMenus', 'Roles', 'SampleApproval',
      'UserRoles', 'UserLoginLogs', 'UserPermissionHistory', 'UserPermissions',
      'NoticeReadStatus', 'Notices', 'WorkTypes', 'erp_config', 'erp_delivery_data',
      'erp_production_data', 'erp_sync_logs', 'PlanMilestones', 'PlanProgressHistory',
      'PlanTemplates', 'publishing_exceptions', 'quality_metrics', 'QualityTargets',
      'QualityTargetStatistics', 'SupplierComplaints', 'WorkLogs', 'WorkPlanExecutors',
      'WorkPlans', 'WorkReminders'
    ];

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: '无效的表名'
      });
    }

    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`SELECT COUNT(*) as recordCount FROM [${tableName}]`);
    });

    res.json({
      success: true,
      data: {
        tableName,
        recordCount: result.recordset[0].recordCount
      }
    });
  } catch (error) {
    console.error('获取表统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取表统计失败: ' + error.message
    });
  }
});

// 初始化数据表（清空数据并重置自增ID）
router.post('/initialize-table', async (req, res) => {
  try {
    const { tableName, confirmPassword } = req.body;

    // 验证表名
    const validTables = [
      'ComplaintRegister', 'MaterialPrice', 'User', 'Workshop', 'Department',
      'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory',
      'DefectiveItem', 'UserTokens', 'DbConfig', 'PathMappingConfig',
      'HomeCardConfig', 'SiteConfig'
    ];

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: '无效的表名'
      });
    }

    // 验证确认密码（简单的安全措施）
    if (confirmPassword !== 'RESET_TABLE_DATA') {
      return res.status(400).json({
        success: false,
        message: '确认密码错误'
      });
    }

    // 特殊处理：不允许清空系统关键表
    const protectedTables = ['User', 'DbConfig'];
    if (protectedTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: `${tableName} 是系统关键表，不允许清空`
      });
    }

    const result = await executeQuery(async (pool) => {
      // 先获取当前记录数
      const countResult = await pool.request()
        .query(`SELECT COUNT(*) as recordCount FROM [${tableName}]`);

      const originalCount = countResult.recordset[0].recordCount;

      // 检查是否有自增ID列（简化判断，大部分表都有ID自增列）
      const tablesWithIdentity = [
        'ComplaintRegister', 'MaterialPrice', 'User', 'Workshop', 'Department',
        'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory',
        'DefectiveItem', 'UserTokens', 'DbConfig', 'PathMappingConfig',
        'HomeCardConfig', 'SiteConfig'
      ];

      const hasIdentity = tablesWithIdentity.includes(tableName);

      // 清空表数据
      if (hasIdentity) {
        // 有自增ID的表使用 TRUNCATE（会自动重置自增ID）
        await pool.request().query(`TRUNCATE TABLE [${tableName}]`);
      } else {
        // 没有自增ID的表使用 DELETE
        await pool.request().query(`DELETE FROM [${tableName}]`);
      }

      return {
        originalCount,
        hasIdentity,
        tableName
      };
    });

    res.json({
      success: true,
      message: `表 ${tableName} 初始化成功`,
      data: {
        tableName: result.tableName,
        originalCount: result.originalCount,
        hasIdentity: result.hasIdentity,
        message: result.hasIdentity ?
          `已清空 ${result.originalCount} 条记录，自增ID已重置为1` :
          `已清空 ${result.originalCount} 条记录`
      }
    });
  } catch (error) {
    console.error('初始化表失败:', error);
    res.status(500).json({
      success: false,
      message: '初始化表失败: ' + error.message
    });
  }
});







// =============================================
// 数据备份相关接口
// =============================================

// 获取数据库信息
router.get('/database-info', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            DB_NAME() as databaseName,
            CAST(SERVERPROPERTY('ServerName') AS NVARCHAR(255)) as serverName,
            CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(255)) as version,
            CAST(SERVERPROPERTY('Edition') AS NVARCHAR(255)) as edition,
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE') as tableCount
        `);
    });

    // 获取记录数统计 - SQL Server 2008R2 兼容方式
    const recordCountResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            SUM(CAST(si.rows AS BIGINT)) as totalRecords
          FROM sys.tables t
          INNER JOIN sys.sysindexes si ON t.object_id = si.id
          WHERE si.indid < 2
        `);
    });

    // 获取数据库大小信息 - SQL Server 2008R2 兼容
    const sizeResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS BIGINT) * 8.0 / 1024) as usedSizeMB,
            SUM(CAST(size AS BIGINT) * 8.0 / 1024) as totalSizeMB
          FROM sys.database_files
          WHERE type IN (0, 1)
        `);
    });

    const dbInfo = result.recordset[0];
    const recordInfo = recordCountResult.recordset[0];
    const sizeInfo = sizeResult.recordset[0];

    // 获取备份路径配置
    const configResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query('SELECT BackupPath FROM DbConfig');
    });

    const backupPath = configResult.recordset[0]?.BackupPath || 'D:\\DMSBackup';

    res.json({
      success: true,
      data: {
        databaseName: dbInfo.databaseName,
        serverName: dbInfo.serverName,
        version: dbInfo.version,
        edition: dbInfo.edition,
        tableCount: dbInfo.tableCount,
        totalRecords: recordInfo.totalRecords || 0,
        usedSizeMB: Math.round((sizeInfo.usedSizeMB || 0) * 100) / 100,
        totalSizeMB: Math.round((sizeInfo.totalSizeMB || 0) * 100) / 100,
        freeSpaceMB: Math.round(((sizeInfo.totalSizeMB || 0) - (sizeInfo.usedSizeMB || 0)) * 100) / 100,
        backupPath: backupPath
      }
    });
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据库信息失败: ' + error.message
    });
  }
});

// 获取备份列表
router.get('/backup-list', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            ID,
            BackupName,
            BackupType,
            BackupPath,
            BackupSize,
            DatabaseName,
            BackupStartTime,
            BackupEndTime,
            BackupStatus,
            ErrorMessage,
            CreatedBy,
            Description
          FROM BackupRecord
          ORDER BY BackupStartTime DESC
        `);
    });

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份列表失败: ' + error.message
    });
  }
});

// 保存备份路径配置
router.post('/backup-path', async (req, res) => {
  try {
    const { backupPath } = req.body;

    if (!backupPath || !backupPath.trim()) {
      return res.status(400).json({
        success: false,
        message: '备份路径不能为空'
      });
    }

    const trimmedPath = backupPath.trim();

    console.log('配置备份路径:', trimmedPath);

    // 对于网络共享路径，不在应用服务器端创建目录
    // 需要确保SQL Server服务账户有访问网络共享的权限

    // 更新数据库配置
    await executeQuery(async (pool) => {
      // 首先检查是否有记录
      const checkResult = await pool.request()
        .query('SELECT COUNT(*) as count FROM DbConfig');

      if (checkResult.recordset[0].count === 0) {
        // 如果没有记录，插入一条新记录
        return await pool.request()
          .input('backupPath', trimmedPath)
          .query(`
            INSERT INTO DbConfig (Host, DatabaseName, DbUser, DbPassword, BackupPath)
            VALUES ('localhost', 'DMS-QA', 'sa', '', @backupPath)
          `);
      } else {
        // 如果有记录，更新第一条记录
        return await pool.request()
          .input('backupPath', trimmedPath)
          .query(`
            UPDATE DbConfig
            SET BackupPath = @backupPath
            WHERE ID = (SELECT TOP 1 ID FROM DbConfig)
          `);
      }
    });

    res.json({
      success: true,
      message: '备份路径配置保存成功',
      data: {
        backupPath: trimmedPath
      }
    });

  } catch (error) {
    console.error('保存备份路径失败:', error);
    res.status(500).json({
      success: false,
      message: '保存备份路径失败: ' + error.message
    });
  }
});

// 保存默认备份路径配置
router.post('/default-backup-path', async (req, res) => {
  try {
    const { serverPath } = req.body;

    // 更新数据库配置
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('serverPath', serverPath || '')
        .query(`
          UPDATE DbConfig
          SET DefaultBackupPath = @serverPath,
              UpdatedAt = GETDATE()
        `);
    });

    res.json({
      success: true,
      message: '默认备份路径配置保存成功',
      data: {
        serverPath: serverPath || ''
      }
    });

  } catch (error) {
    console.error('保存默认备份路径失败:', error);
    res.status(500).json({
      success: false,
      message: '保存默认备份路径失败: ' + error.message
    });
  }
});

// 保存备选方案路径配置
router.post('/alternative-backup-path', async (req, res) => {
  try {
    const { networkPath } = req.body;

    if (!networkPath) {
      return res.status(400).json({
        success: false,
        message: '请提供网络路径'
      });
    }

    // 更新数据库配置
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('networkPath', networkPath)
        .query(`
          UPDATE DbConfig
          SET BackupPath = @networkPath,
              UpdatedAt = GETDATE()
        `);
    });

    res.json({
      success: true,
      message: '备选方案路径配置保存成功',
      data: {
        networkPath: networkPath
      }
    });

  } catch (error) {
    console.error('保存备选方案路径失败:', error);
    res.status(500).json({
      success: false,
      message: '保存备选方案路径失败: ' + error.message
    });
  }
});

// 创建数据库备份
router.post('/create-backup', async (req, res) => {
  try {
    const { backupName, backupType = 'FULL', description = '', backupScheme = 'default' } = req.body;
    const username = req.user?.username || 'system';

    if (!backupName) {
      return res.status(400).json({
        success: false,
        message: '请提供备份名称'
      });
    }

    // 根据备份方案获取相应的备份路径配置
    let config = {};
    try {
      const configResult = await executeQuery(async (pool) => {
        return await pool.request()
          .query('SELECT BackupPath, DefaultBackupPath, AlternativeBackupPath FROM DbConfig');
      });
      config = configResult.recordset[0] || {};
    } catch (configError) {
      console.warn('获取新配置字段失败，使用基本配置:', configError.message);
      // 如果新字段不存在，只获取基本配置
      const basicConfigResult = await executeQuery(async (pool) => {
        return await pool.request()
          .query('SELECT BackupPath FROM DbConfig');
      });
      config = basicConfigResult.recordset[0] || {};
      config.DefaultBackupPath = '';
      config.AlternativeBackupPath = config.BackupPath || '\\\\tj_server\\公共\\杂七杂八\\品质部临时文件';
    }

    console.log('数据库配置:', config);
    console.log('选择的备份方案:', backupScheme);

    let backupPath;
    let configuredBackupPath;
    let sqlServerBackupPath = null; // 移到外层作用域

    if (backupScheme === 'alternative') {
      // 备选方案：使用网络路径
      configuredBackupPath = config.AlternativeBackupPath || config.BackupPath || '\\\\tj_server\\公共\\杂七杂八\\品质部临时文件';
      backupPath = configuredBackupPath; // 备选方案直接使用配置的网络路径
      console.log('使用备选方案，网络路径:', configuredBackupPath);
    } else {
      // 默认方案：使用SQL Server默认路径或自定义服务器路径

      // 获取远程SQL Server的默认备份路径
      try {
        const defaultPathResult = await executeQuery(async (pool) => {
          return await pool.request().query(`
            DECLARE @BackupDirectory NVARCHAR(4000)
            EXEC master.dbo.xp_instance_regread
              N'HKEY_LOCAL_MACHINE',
              N'SOFTWARE\\Microsoft\\MSSQLServer\\MSSQLServer',
              N'BackupDirectory',
              @BackupDirectory OUTPUT
            SELECT @BackupDirectory as BackupDirectory
          `);
        });
        sqlServerBackupPath = defaultPathResult.recordset[0]?.BackupDirectory;
        console.log('远程SQL Server默认备份路径:', sqlServerBackupPath);
      } catch (err) {
        console.warn('无法获取SQL Server默认备份路径:', err.message);
      }

      // 使用自定义服务器路径或SQL Server默认路径
      if (config.DefaultBackupPath && config.DefaultBackupPath.trim()) {
        backupPath = config.DefaultBackupPath.trim();
        console.log('使用自定义服务器路径:', backupPath);
      } else {
        backupPath = sqlServerBackupPath || 'D:\\Program Files\\Microsoft SQL Server\\MSSQL10_50.MSSQLSERVER\\MSSQL\\Backup';
        console.log('使用SQL Server默认路径:', backupPath);
      }

      configuredBackupPath = config.AlternativeBackupPath || config.BackupPath; // 用于后续的网络复制
    }

    console.log('最终使用的备份路径:', backupPath);

    // 如果配置的是自定义路径，先尝试使用，如果失败则回退到默认路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${backupName}_${timestamp}.bak`;
    const fullBackupPath = `${backupPath}\\${fileName}`;

    console.log('SQL Server备份路径:', sqlServerBackupPath);
    console.log('使用的备份路径:', backupPath);
    console.log('完整备份文件路径:', fullBackupPath);

    // 插入备份记录（记录实际备份路径）
    const insertResult = await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupName', sql.NVarChar, backupName)
        .input('backupType', sql.NVarChar, backupType)
        .input('backupPath', sql.NVarChar, fullBackupPath)
        .input('databaseName', sql.NVarChar, 'DMS-QA')
        .input('backupStartTime', sql.DateTime, new Date())
        .input('createdBy', sql.NVarChar, username)
        .input('description', sql.NVarChar(sql.MAX), description)
        .query(`
          INSERT INTO BackupRecord (
            BackupName, BackupType, BackupPath, DatabaseName,
            BackupStartTime, BackupStatus, CreatedBy, Description
          )
          OUTPUT INSERTED.ID
          VALUES (
            @backupName, @backupType, @backupPath, @databaseName,
            @backupStartTime, 'RUNNING', @createdBy, @description
          )
        `);
    });

    const backupId = insertResult.recordset[0].ID;

    // 执行备份命令
    try {
      console.log('开始执行数据库备份...');
      console.log('备份路径:', backupPath);
      console.log('完整备份文件路径:', fullBackupPath);

      // 首先测试SQL Server是否能访问网络路径
      try {
        const testAccessSql = `
          EXEC xp_cmdshell 'dir "${backupPath}"'
        `;
        console.log('测试网络路径访问权限...');
        const testResult = await executeQuery(async (pool) => {
          return await pool.request().query(testAccessSql);
        });
        console.log('网络路径访问测试结果:', testResult.recordset);
      } catch (testError) {
        console.warn('网络路径访问测试失败:', testError.message);
        console.log('这可能表示SQL Server服务账户没有访问网络共享的权限');
      }

      // 使用最简单的备份命令
      const normalizedPath = fullBackupPath.replace(/\//g, '\\');
      const backupSql = `BACKUP DATABASE [DMS-QA] TO DISK = N'${normalizedPath}' WITH INIT`;

      console.log('执行备份SQL:', backupSql);

      const result = await executeQuery(async (pool) => {
        return await pool.request().query(backupSql);
      });

      console.log('备份命令执行完成，结果:', result);

      // 验证备份文件是否真的创建成功
      try {
        const verifyBackupSql = `
          RESTORE VERIFYONLY FROM DISK = N'${normalizedPath}'
        `;
        console.log('验证备份文件完整性...');
        await executeQuery(async (pool) => {
          return await pool.request().query(verifyBackupSql);
        });
        console.log('备份文件验证成功');
      } catch (verifyError) {
        console.error('备份文件验证失败:', verifyError.message);
        throw new Error('备份文件创建失败或损坏: ' + verifyError.message);
      }

      // 获取备份文件大小
      let backupSize = 0;
      try {
        // 使用SQL Server来获取远程文件大小
        const fileSizeSql = `
          EXEC xp_cmdshell 'dir "${fullBackupPath}" /-c'
        `;
        const sizeResult = await executeQuery(async (pool) => {
          return await pool.request().query(fileSizeSql);
        });

        if (sizeResult.recordset && sizeResult.recordset.length > 0) {
          const output = sizeResult.recordset
            .map(row => row.output)
            .filter(line => line !== null)
            .join('\n');

          console.log('远程文件大小查询结果:', output);

          // 查找包含.bak文件的行
          const lines = output.split('\n');
          for (const line of lines) {
            if (line && line.includes('.bak')) {
              // 提取文件大小（可能包含逗号分隔符）
              const sizeMatch = line.match(/\s+(\d{1,3}(?:,\d{3})*|\d+)\s+/);
              if (sizeMatch) {
                backupSize = parseInt(sizeMatch[1].replace(/,/g, ''));
                console.log('通过SQL Server获取到备份文件大小:', backupSize, 'bytes');
                break;
              }
            }
          }
        }

        // 如果SQL Server方法失败，尝试本地文件系统（适用于本地路径）
        if (backupSize === 0) {
          const fs = require('fs');
          try {
            const stats = fs.statSync(fullBackupPath);
            backupSize = stats.size;
            console.log('通过本地文件系统获取到备份文件大小:', backupSize, 'bytes');
          } catch (fsErr) {
            console.warn('本地文件系统也无法获取文件大小:', fsErr.message);
          }
        }
      } catch (err) {
        console.warn('无法获取备份文件大小:', err.message);
      }

      console.log('备份文件创建完成，路径:', fullBackupPath);
      console.log('备份文件大小:', backupSize, 'bytes');

      // 初始化手动复制相关变量
      let manualCopyRequired = false;
      let copyInstructions = null;

      // 只有在默认方案且配置了网络路径时才进行复制
      if (backupScheme === 'default' && configuredBackupPath && configuredBackupPath.startsWith('\\\\')) {
        try {
          console.log('开始复制备份文件到网络共享路径:', configuredBackupPath);

          const networkBackupPath = `${configuredBackupPath}\\${fileName}`;

          // 首先测试网络路径是否已经映射为本地路径
          let localMappedPath = null;
          try {
            const testResult = await executeQuery(async (pool) => {
              return await pool.request().query(`
                EXEC xp_cmdshell 'dir "\\\\tj_server\\公共\\杂七杂八\\品质部临时文件" /b'
              `);
            });

            if (testResult.recordset && testResult.recordset.length > 0) {
              const testOutput = testResult.recordset
                .map(row => row.output)
                .filter(line => line !== null)
                .join('\n');

              console.log('网络路径访问测试结果:', testOutput);

              // 如果能够访问，说明路径已映射
              if (!testOutput.includes('找不到') && !testOutput.includes('拒绝访问')) {
                localMappedPath = configuredBackupPath;
                console.log('网络路径已映射，可直接访问:', localMappedPath);
              }
            }
          } catch (testErr) {
            console.warn('网络路径测试失败:', testErr.message);
          }

          // 使用robocopy命令，它对网络路径处理更好
          const sourceDir = path.dirname(fullBackupPath);
          const targetDir = path.dirname(networkBackupPath);
          const backupFileName = path.basename(fullBackupPath);

          const robocopyCommand = `robocopy "${sourceDir}" "${targetDir}" "${backupFileName}" /R:1 /W:1`;
          console.log('执行robocopy命令:', robocopyCommand);

          const copyResult = await executeQuery(async (pool) => {
            return await pool.request().query(`
              EXEC xp_cmdshell '${robocopyCommand}'
            `);
          });

          if (copyResult && copyResult.recordset) {
            const copyOutput = copyResult.recordset
              .map(row => row.output)
              .filter(line => line !== null)
              .join('\n');

            console.log('复制命令执行结果:', copyOutput);

            // 检查robocopy是否成功（robocopy返回码0-3表示成功）
            if (copyOutput.includes('Files :') && (copyOutput.includes('1    0    0    1') || copyOutput.includes('Copied :    1'))) {
              console.log('备份文件成功复制到网络共享路径:', networkBackupPath);

              // 更新数据库记录中的备份路径为网络路径
              await executeQuery(async (pool) => {
                return await pool.request()
                  .input('backupId', sql.Int, backupId)
                  .input('networkPath', sql.NVarChar, networkBackupPath)
                  .query(`
                    UPDATE BackupRecord
                    SET BackupPath = @networkPath
                    WHERE ID = @backupId
                  `);
              });

              console.log('备份记录已更新为网络路径');
            } else {
              console.warn('自动复制失败，需要手动复制');
              console.log('手动复制指导:');
              console.log('1. 通过Radmin连接到192.168.1.57服务器');
              console.log('2. 复制文件:', fullBackupPath);
              console.log('3. 粘贴到:', networkBackupPath);

              // 设置标志，稍后在响应中包含手动复制信息
              manualCopyRequired = true;
              copyInstructions = {
                sourceFile: fullBackupPath,
                targetPath: networkBackupPath,
                instructions: [
                  '1. 通过Radmin连接到192.168.1.57服务器',
                  '2. 复制源文件到目标路径',
                  '3. 复制完成后可在系统中更新备份路径'
                ]
              };
            }
          }

        } catch (copyError) {
          console.error('复制备份文件到网络路径失败:', copyError.message);
          console.log('备份文件仍保留在服务器本地路径:', fullBackupPath);
          // 不抛出错误，因为备份本身是成功的
        }
      }

      // 更新备份记录为成功
      console.log('准备更新数据库记录，backupId:', backupId, 'backupSize:', backupSize, 'typeof backupSize:', typeof backupSize);
      await executeQuery(async (pool) => {
        return await pool.request()
          .input('backupId', sql.Int, backupId)
          .input('backupSize', sql.BigInt, backupSize)
          .input('backupEndTime', sql.DateTime, new Date())
          .query(`
            UPDATE BackupRecord
            SET BackupStatus = 'SUCCESS',
                BackupSize = @backupSize,
                BackupEndTime = @backupEndTime,
                UpdatedAt = GETDATE()
            WHERE ID = @backupId
          `);
      });
      console.log('数据库记录更新完成');

      // 根据是否需要手动复制来构建响应
      const responseData = {
        backupId: backupId,
        backupName: fileName,
        backupPath: fullBackupPath,
        backupSize: backupSize
      };

      if (manualCopyRequired) {
        responseData.manualCopyRequired = true;
        responseData.copyInstructions = copyInstructions;
        res.json({
          success: true,
          message: '数据库备份创建成功，但自动复制到网络路径失败，需要手动复制',
          data: responseData
        });
      } else {
        res.json({
          success: true,
          message: '数据库备份创建成功',
          data: responseData
        });
      }

    } catch (backupError) {
      // 更新备份记录为失败
      await executeQuery(async (pool) => {
        return await pool.request()
          .input('backupId', sql.Int, backupId)
          .input('errorMessage', sql.NVarChar, backupError.message)
          .input('backupEndTime', sql.DateTime, new Date())
          .query(`
            UPDATE BackupRecord
            SET BackupStatus = 'FAILED',
                ErrorMessage = @errorMessage,
                BackupEndTime = @backupEndTime,
                UpdatedAt = GETDATE()
            WHERE ID = @backupId
          `);
      });

      throw backupError;
    }

  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备份失败: ' + error.message
    });
  }
});

// 获取备份配置
router.get('/backup-config', authenticateToken, checkPermission('system:backup:view'), async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT
            BackupPath,
            BackupRetentionDays,
            AutoBackupEnabled,
            AutoBackupTime
          FROM DbConfig
        `);
    });

    const config = result.recordset[0] || {};

    res.json({
      success: true,
      data: {
        backupPath: config.BackupPath || 'D:\\DMSBackup',
        backupRetentionDays: config.BackupRetentionDays || 30,
        autoBackupEnabled: config.AutoBackupEnabled || false,
        autoBackupTime: config.AutoBackupTime || '02:00'
      }
    });
  } catch (error) {
    console.error('获取备份配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份配置失败: ' + error.message
    });
  }
});

// 更新备份配置
router.post('/backup-config', authenticateToken, checkPermission('system:backup:edit'), async (req, res) => {
  try {
    const { backupPath, backupRetentionDays, autoBackupEnabled, autoBackupTime } = req.body;

    await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupPath', backupPath)
        .input('backupRetentionDays', backupRetentionDays)
        .input('autoBackupEnabled', autoBackupEnabled)
        .input('autoBackupTime', autoBackupTime)
        .query(`
          UPDATE DbConfig
          SET BackupPath = @backupPath,
              BackupRetentionDays = @backupRetentionDays,
              AutoBackupEnabled = @autoBackupEnabled,
              AutoBackupTime = @autoBackupTime
        `);
    });

    res.json({
      success: true,
      message: '备份配置更新成功'
    });
  } catch (error) {
    console.error('更新备份配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备份配置失败: ' + error.message
    });
  }
});

// 诊断SQL Server备份环境
router.get('/backup-diagnostics', async (req, res) => {
  try {
    const diagnostics = {
      userPermissions: null,
      xpCmdshellEnabled: null,
      backupPermission: null,
      networkAccess: null,
      errors: []
    };

    // 检查当前用户权限
    try {
      const userResult = await executeQuery(async (pool) => {
        return await pool.request().query(`
          SELECT
            SYSTEM_USER as CurrentUser,
            IS_SRVROLEMEMBER('sysadmin') as IsSysAdmin,
            IS_SRVROLEMEMBER('db_backupoperator') as IsBackupOperator
        `);
      });
      diagnostics.userPermissions = userResult.recordset[0];
    } catch (err) {
      diagnostics.errors.push('检查用户权限失败: ' + err.message);
    }

    // 检查xp_cmdshell是否启用
    try {
      const xpResult = await executeQuery(async (pool) => {
        return await pool.request().query(`
          SELECT name, value_in_use
          FROM sys.configurations
          WHERE name = 'xp_cmdshell'
        `);
      });
      diagnostics.xpCmdshellEnabled = xpResult.recordset[0]?.value_in_use === 1;
    } catch (err) {
      diagnostics.errors.push('检查xp_cmdshell状态失败: ' + err.message);
    }

    // 检查备份权限
    try {
      const backupResult = await executeQuery(async (pool) => {
        return await pool.request().query(`
          SELECT HAS_PERMS_BY_NAME(NULL, NULL, 'BACKUP DATABASE') as HasBackupPermission
        `);
      });
      diagnostics.backupPermission = backupResult.recordset[0]?.HasBackupPermission === 1;
    } catch (err) {
      diagnostics.errors.push('检查备份权限失败: ' + err.message);
    }

    // 测试网络路径访问（如果xp_cmdshell可用）
    if (diagnostics.xpCmdshellEnabled) {
      try {
        const networkResult = await executeQuery(async (pool) => {
          return await pool.request().query(`
            EXEC xp_cmdshell 'echo Network test'
          `);
        });
        diagnostics.networkAccess = networkResult.recordset[0]?.output === 'Network test';
      } catch (err) {
        diagnostics.errors.push('测试网络访问失败: ' + err.message);
      }
    }

    res.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    console.error('备份诊断失败:', error);
    res.status(500).json({
      success: false,
      message: '备份诊断失败: ' + error.message
    });
  }
});

// 启用xp_cmdshell功能
router.post('/enable-xp-cmdshell', async (req, res) => {
  try {
    console.log('开始启用xp_cmdshell功能...');

    // 启用高级选项配置
    await executeQuery(async (pool) => {
      return await pool.request().query(`
        EXEC sp_configure 'show advanced options', 1;
        RECONFIGURE;
      `);
    });

    // 启用xp_cmdshell
    await executeQuery(async (pool) => {
      return await pool.request().query(`
        EXEC sp_configure 'xp_cmdshell', 1;
        RECONFIGURE;
      `);
    });

    console.log('xp_cmdshell功能启用成功');

    res.json({
      success: true,
      message: 'xp_cmdshell功能启用成功'
    });

  } catch (error) {
    console.error('启用xp_cmdshell失败:', error);
    res.status(500).json({
      success: false,
      message: '启用xp_cmdshell失败: ' + error.message
    });
  }
});

// 手动更新备份路径（当手动复制完成后）
router.post('/update-backup-path', async (req, res) => {
  try {
    const { backupId, newPath } = req.body;

    if (!backupId || !newPath) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：backupId 和 newPath'
      });
    }

    console.log('更新备份路径，ID:', backupId, '新路径:', newPath);

    // 更新备份记录中的路径
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupId', backupId)
        .input('newPath', newPath)
        .query(`
          UPDATE BackupHistory
          SET BackupPath = @newPath
          WHERE ID = @backupId
        `);
    });

    res.json({
      success: true,
      message: '备份路径更新成功'
    });

  } catch (error) {
    console.error('更新备份路径失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备份路径失败: ' + error.message
    });
  }
});

// 更新备份路径
router.post('/update-backup-path', async (req, res) => {
  try {
    const { backupId, newPath } = req.body;

    if (!backupId || !newPath) {
      return res.status(400).json({
        success: false,
        message: '请提供备份ID和新路径'
      });
    }

    await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupId', sql.Int, backupId)
        .input('newPath', sql.NVarChar, newPath)
        .query(`
          UPDATE BackupRecord
          SET BackupPath = @newPath,
              UpdatedAt = GETDATE()
          WHERE ID = @backupId
        `);
    });

    res.json({
      success: true,
      message: '备份路径更新成功'
    });

  } catch (error) {
    console.error('更新备份路径失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备份路径失败: ' + error.message
    });
  }
});

// 验证备份文件
router.post('/verify-backup', async (req, res) => {
  try {
    const { backupId, backupPath } = req.body;

    if (!backupId || !backupPath) {
      return res.status(400).json({
        success: false,
        message: '请提供备份ID和路径'
      });
    }

    // 使用SQL Server的xp_cmdshell检查文件
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        EXEC xp_cmdshell 'dir "${backupPath}" /a-d'
      `);
    });

    const output = result.recordset
      .map(row => row.output)
      .filter(line => line !== null)
      .join('\n');

    const exists = !output.includes('找不到文件') && !output.includes('File Not Found');
    let size = 0;
    let lastModified = '';

    if (exists) {
      // 解析文件信息
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('.bak')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            size = parseInt(parts[2].replace(/,/g, '')) || 0;
            lastModified = `${parts[0]} ${parts[1]}`;
            break;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        exists,
        size,
        lastModified
      }
    });

  } catch (error) {
    console.error('验证备份文件失败:', error);
    res.status(500).json({
      success: false,
      message: '验证备份文件失败: ' + error.message
    });
  }
});

// 删除备份记录
router.delete('/backup-record/:id', async (req, res) => {
  try {
    const backupId = req.params.id;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        message: '请提供备份ID'
      });
    }

    await executeQuery(async (pool) => {
      return await pool.request()
        .input('backupId', backupId)
        .query(`
          DELETE FROM BackupRecord
          WHERE ID = @backupId
        `);
    });

    res.json({
      success: true,
      message: '备份记录删除成功'
    });

  } catch (error) {
    console.error('删除备份记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除备份记录失败: ' + error.message
    });
  }
});

// =============================================
// 自动备份相关API
// =============================================

// 获取自动备份配置
router.get('/auto-backup-config', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT ConfigKey, ConfigValue
          FROM SiteConfig
          WHERE ConfigKey LIKE 'AutoBackup%'
        `);
    });

    // 将配置转换为对象格式
    const config = {
      enabled: false,
      frequency: 'daily',
      backupTime: '02:00',
      weekDay: 0,
      monthDay: 1,
      retentionCount: 7,
      backupType: 'FULL',
      backupScheme: 'default'
    };

    if (result && result.recordset) {
      result.recordset.forEach(row => {
        const key = row.ConfigKey.replace('AutoBackup', '').toLowerCase();
        let value = row.ConfigValue;

        // 类型转换
        if (key === 'enabled') {
          value = value === 'true' || value === '1';
        } else if (key === 'weekday' || key === 'monthday' || key === 'retentioncount') {
          value = parseInt(value) || config[key === 'weekday' ? 'weekDay' : key === 'monthday' ? 'monthDay' : 'retentionCount'];
        }

        // 映射字段名
        if (key === 'weekday') {
          config.weekDay = value;
        } else if (key === 'monthday') {
          config.monthDay = value;
        } else if (key === 'retentioncount') {
          config.retentionCount = value;
        } else if (key === 'backuptime') {
          config.backupTime = value;
        } else if (key === 'backuptype') {
          config.backupType = value;
        } else if (key === 'backupscheme') {
          config.backupScheme = value;
        } else {
          config[key] = value;
        }
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取自动备份配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自动备份配置失败: ' + error.message
    });
  }
});

// 保存自动备份配置
router.post('/auto-backup-config', async (req, res) => {
  try {
    const {
      enabled,
      frequency,
      backupTime,
      weekDay,
      monthDay,
      retentionCount,
      backupType,
      backupScheme
    } = req.body;

    // 配置映射
    const configMappings = [
      { key: 'AutoBackupEnabled', value: enabled ? 'true' : 'false' },
      { key: 'AutoBackupFrequency', value: frequency },
      { key: 'AutoBackupTime', value: backupTime },
      { key: 'AutoBackupWeekDay', value: weekDay.toString() },
      { key: 'AutoBackupMonthDay', value: monthDay.toString() },
      { key: 'AutoBackupRetentionCount', value: retentionCount.toString() },
      { key: 'AutoBackupType', value: backupType },
      { key: 'AutoBackupScheme', value: backupScheme }
    ];

    await executeQuery(async (pool) => {
      for (const config of configMappings) {
        await pool.request()
          .input('configKey', config.key)
          .input('configValue', config.value)
          .query(`
            IF EXISTS (SELECT 1 FROM SiteConfig WHERE ConfigKey = @configKey)
              UPDATE SiteConfig SET ConfigValue = @configValue WHERE ConfigKey = @configKey
            ELSE
              INSERT INTO SiteConfig (ConfigKey, ConfigValue) VALUES (@configKey, @configValue)
          `);
      }
    });

    // 如果启用了自动备份，启动定时任务
    if (enabled) {
      try {
        await startAutoBackupScheduler(req.body);
      } catch (schedulerError) {
        console.warn('启动自动备份调度器失败:', schedulerError);
      }
    } else {
      try {
        await stopAutoBackupScheduler();
      } catch (schedulerError) {
        console.warn('停止自动备份调度器失败:', schedulerError);
      }
    }

    res.json({
      success: true,
      message: '自动备份配置保存成功'
    });
  } catch (error) {
    console.error('保存自动备份配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存自动备份配置失败: ' + error.message
    });
  }
});

// 获取自动备份状态
router.get('/auto-backup-status', async (req, res) => {
  try {
    // 获取服务状态
    const serviceStatus = getAutoBackupServiceStatus();

    // 获取下次备份时间
    const nextBackupTime = getNextBackupTime();

    // 获取最近的备份记录
    const recentBackupResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT TOP 1
            BackupStartTime as lastBackupTime,
            BackupStatus as lastBackupStatus
          FROM BackupRecord
          WHERE CreatedBy = 'auto-backup'
          ORDER BY BackupStartTime DESC
        `);
    });

    const lastBackup = recentBackupResult.recordset[0] || {};

    // 获取最近的备份日志
    const logsResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT TOP 10
            BackupStartTime as backupTime,
            BackupType as backupType,
            BackupStatus as status,
            CASE
              WHEN BackupStatus = 'SUCCESS' THEN '备份成功'
              WHEN BackupStatus = 'FAILED' THEN ErrorMessage
              ELSE '备份进行中'
            END as message
          FROM BackupRecord
          WHERE CreatedBy = 'auto-backup'
          ORDER BY BackupStartTime DESC
        `);
    });

    res.json({
      success: true,
      data: {
        serviceStatus: serviceStatus,
        nextBackupTime: nextBackupTime,
        lastBackupTime: lastBackup.lastBackupTime,
        lastBackupStatus: lastBackup.lastBackupStatus,
        recentLogs: logsResult.recordset
      }
    });
  } catch (error) {
    console.error('获取自动备份状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自动备份状态失败: ' + error.message
    });
  }
});

// 手动触发自动备份
router.post('/trigger-auto-backup', async (req, res) => {
  try {
    // 获取自动备份配置
    const configResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT ConfigKey, ConfigValue
          FROM SiteConfig
          WHERE ConfigKey LIKE 'AutoBackup%'
        `);
    });

    // 解析配置
    const config = {};
    configResult.recordset.forEach(row => {
      const key = row.ConfigKey.replace('AutoBackup', '').toLowerCase();
      config[key] = row.ConfigValue;
    });

    if (config.enabled !== 'true') {
      return res.status(400).json({
        success: false,
        message: '自动备份功能未启用'
      });
    }

    // 生成备份名称
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `auto-backup_${timestamp}`;

    // 执行备份
    const backupResult = await createAutoBackup({
      backupName: backupName,
      backupType: config.backuptype || 'FULL',
      backupScheme: config.backupscheme || 'default',
      description: '手动触发的自动备份'
    });

    res.json({
      success: true,
      message: '自动备份任务已触发',
      data: backupResult
    });
  } catch (error) {
    console.error('触发自动备份失败:', error);
    res.status(500).json({
      success: false,
      message: '触发自动备份失败: ' + error.message
    });
  }
});

module.exports = router;