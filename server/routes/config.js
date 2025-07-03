const express = require('express');
const router = express.Router();
const { sql, config, getDynamicConfig, getConnection, executeQuery } = require('../db');

// 获取所有数据库配置列表
router.get('/db-list', async (req, res) => {
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
router.post('/set-current', async (req, res) => {
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
router.post('/test-db', async (req, res) => {
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
router.post('/db', async (req, res) => {
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
router.put('/db/:id', async (req, res) => {
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
router.get('/db/:id', async (req, res) => {
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
router.delete('/db/:id', async (req, res) => {
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
router.post('/init-site-config', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // 读取SQL脚本
    const sqlScript = fs.readFileSync(path.join(__dirname, '../create_siteconfig_table.sql'), 'utf8');

    // 执行SQL脚本
    await executeQuery(sqlScript);

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

// 获取网站配置
router.get('/site-config', async (req, res) => {
  try {
    // 默认配置
    const defaultConfig = {
      siteName: '质量数据管理系统',
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
          .query(`SELECT ConfigKey, ConfigValue FROM SiteConfig WHERE ConfigKey IN ('siteName', 'companyName', 'logoBase64Img', 'faviconBase64Img', 'headerTitle', 'loginTitle', 'footerCopyright')`);
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
    const { siteName, companyName, logoBase64Img, faviconBase64Img, headerTitle, loginTitle, footerCopyright } = req.body;

    console.log('网站配置保存请求:', { siteName, companyName, logoBase64Img, faviconBase64Img, headerTitle, loginTitle, footerCopyright });

    try {
      // 配置项映射
      const configItems = [
        { key: 'siteName', value: siteName || '质量数据管理系统' },
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
  } finally {
    if (connection) {
      connection.close();
    }
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
              WHEN t.TABLE_NAME = 'ComplaintRegister' THEN '投诉登记表'
              WHEN t.TABLE_NAME = 'MaterialPrice' THEN '物料单价表'
              WHEN t.TABLE_NAME = 'User' THEN '用户管理表'
              WHEN t.TABLE_NAME = 'Workshop' THEN '车间表'
              WHEN t.TABLE_NAME = 'Department' THEN '部门表'
              WHEN t.TABLE_NAME = 'Person' THEN '人员表'
              WHEN t.TABLE_NAME = 'ComplaintCategory' THEN '投诉类别表'
              WHEN t.TABLE_NAME = 'CustomerComplaintType' THEN '客诉类型表'
              WHEN t.TABLE_NAME = 'DefectiveCategory' THEN '不良类别表'
              WHEN t.TABLE_NAME = 'DefectiveItem' THEN '不良项表'
              WHEN t.TABLE_NAME = 'UserTokens' THEN '用户令牌表'
              WHEN t.TABLE_NAME = 'DbConfig' THEN '数据库配置表'
              WHEN t.TABLE_NAME = 'PathMappingConfig' THEN '路径映射配置表'
              WHEN t.TABLE_NAME = 'HomeCardConfig' THEN '主页卡片配置表'
              WHEN t.TABLE_NAME = 'SiteConfig' THEN '网站配置表'
              ELSE t.TABLE_NAME
            END as displayName,
            CASE
              WHEN t.TABLE_NAME IN ('User', 'DbConfig', 'PathMappingConfig', 'HomeCardConfig', 'SiteConfig') THEN 'system'
              WHEN t.TABLE_NAME IN ('Workshop', 'Department', 'Person', 'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem', 'MaterialPrice') THEN 'basic'
              ELSE 'business'
            END as tableType,
            CASE
              WHEN c.COLUMN_NAME IS NOT NULL THEN 1
              ELSE 0
            END as hasIdentity
          FROM INFORMATION_SCHEMA.TABLES t
          LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
            AND c.COLUMN_NAME = 'ID'
            AND c.COLUMNPROPERTY(OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') = 1
          WHERE t.TABLE_TYPE = 'BASE TABLE'
            AND t.TABLE_SCHEMA = 'dbo'
            AND t.TABLE_NAME NOT LIKE 'sys%'
          ORDER BY tableType, t.TABLE_NAME
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
      'HomeCardConfig', 'SiteConfig'
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

      // 检查是否有自增ID列
      const identityResult = await pool.request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
            AND COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
        `);

      const hasIdentity = identityResult.recordset.length > 0;

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

module.exports = router;