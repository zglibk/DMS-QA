const express = require('express');
const router = express.Router();
const { sql, config } = require('../db');

// 获取所有数据库配置列表
router.get('/db-list', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT ID, Host, DatabaseName, DbUser, ConfigName, Remark, IsCurrent, IsValid, UpdatedAt FROM DbConfig ORDER BY UpdatedAt DESC, ID DESC');

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
  const { Host, DatabaseName, DbUser, DbPassword, ConfigName, Remark } = req.body;
  if (!Host || !DatabaseName || !DbUser || !DbPassword) {
    return res.status(400).json({ message: '请填写所有字段' });
  }
  try {
    let pool = await sql.connect(config);

    // 检查是否存在相同的配置
    const checkResult = await pool.request()
      .input('Host', sql.NVarChar(255), Host)
      .input('DatabaseName', sql.NVarChar(255), DatabaseName)
      .input('DbUser', sql.NVarChar(255), DbUser)
      .input('DbPassword', sql.NVarChar(255), DbPassword)
      .query('SELECT COUNT(*) as count FROM DbConfig WHERE Host = @Host AND DatabaseName = @DatabaseName AND DbUser = @DbUser AND DbPassword = @DbPassword');

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ message: '相同的数据库配置已存在，无需重复保存' });
    }

    // 插入新配置
    await pool.request()
      .input('Host', sql.NVarChar(255), Host)
      .input('DatabaseName', sql.NVarChar(255), DatabaseName)
      .input('DbUser', sql.NVarChar(255), DbUser)
      .input('DbPassword', sql.NVarChar(255), DbPassword)
      .input('ConfigName', sql.NVarChar(255), ConfigName || '默认配置')
      .input('Remark', sql.NVarChar(500), Remark || '')
      .query('INSERT INTO DbConfig (Host, DatabaseName, DbUser, DbPassword, ConfigName, Remark, IsCurrent, IsValid, UpdatedAt) VALUES (@Host, @DatabaseName, @DbUser, @DbPassword, @ConfigName, @Remark, 0, 1, GETDATE())');

    await pool.close();
    res.json({ success: true, message: '配置已保存' });
  } catch (e) {
    res.status(500).json({ message: '保存失败', error: e.message });
  }
});

module.exports = router; 