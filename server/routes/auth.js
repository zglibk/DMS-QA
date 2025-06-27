const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sql, config, getDynamicConfig } = require('../db');
const router = express.Router();
const SECRET = 'dms-secret';
const authMiddleware = require('../middleware/auth');

// ===================== 登录接口 =====================
// POST /api/auth/login
// 参数: { username, password }
// 返回: { token } 登录成功返回JWT token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 查询用户
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT * FROM [User] WHERE Username = @Username');
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: '用户名或密码错误' });
    if (user.Status === 0) return res.status(403).json({ message: '该用户已被禁用，请联系管理员' });
    // 校验密码
    const valid = await bcrypt.compare(password, user.Password);
    if (!valid) return res.status(401).json({ message: '用户名或密码错误' });
    // 生成token
    const token = jwt.sign({ username: user.Username, role: user.Role }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===================== 初始化admin用户 =====================
// GET /api/auth/init-admin
// 用于首次部署时插入admin账号
router.get('/init-admin', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('Username', sql.NVarChar, 'admin')
      .query('SELECT * FROM [User] WHERE Username = @Username');
    if (result.recordset.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await pool.request()
        .input('Username', sql.NVarChar, 'admin')
        .input('Password', sql.NVarChar, hash)
        .input('Role', sql.NVarChar, 'admin')
        .query('INSERT INTO [User] (Username, Password, Role) VALUES (@Username, @Password, @Role)');
      res.send('初始化admin用户成功');
    } else {
      res.send('admin用户已存在');
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===================== 获取当前用户信息 =====================
// GET /api/auth/profile
// 需登录(token)，返回当前用户所有主要字段
router.get('/profile', authMiddleware, async (req, res) => {
  const username = req.user.username;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT Username, RealName, Avatar, Email, Phone, Department, Role, CreatedAt FROM [User] WHERE Username = @Username');
    const user = result.recordset[0];
    if (user) {
      // 限制头像最大长度，防止前端异常
      if (user.Avatar && user.Avatar.length > 1000000) user.Avatar = '';
      res.json({ success: true, data: user });
    } else {
      res.json({ success: false, message: '用户不存在' });
    }
  } catch (err) {
    console.error('获取用户信息出错:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 更新当前用户信息 =====================
// POST /api/auth/profile
// 参数: RealName, Email, Phone, Department, Avatar
// 只允许用户修改自己的部分信息
router.post('/profile', authMiddleware, async (req, res) => {
  const username = req.user.username;
  let { RealName, Email, Phone, Department, Avatar } = req.body;
  try {
    // 校验头像类型和长度
    if (Avatar && typeof Avatar === 'string' && Avatar.length > 2000000) {
      return res.status(400).json({ success: false, message: '头像图片过大' });
    }
    let pool = await sql.connect(await getDynamicConfig());
    await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('RealName', sql.NVarChar, RealName)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('Department', sql.NVarChar, Department)
      .input('Avatar', sql.NVarChar, Avatar)
      .query('UPDATE [User] SET RealName=@RealName, Email=@Email, Phone=@Phone, Department=@Department, Avatar=@Avatar WHERE Username=@Username');
    // 保存后立即查询最新用户数据返回
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT Username, RealName, Avatar, Email, Phone, Department, Role, CreatedAt FROM [User] WHERE Username = @Username');
    const user = result.recordset[0];
    res.json({ success: true, message: '信息已更新', data: user });
  } catch (err) {
    console.error('更新用户信息出错:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 修改密码 =====================
// POST /api/auth/change-password
// 参数: oldPwd, newPwd
// 校验原密码，成功后加密保存新密码
router.post('/change-password', authMiddleware, async (req, res) => {
  const username = req.user.username;
  const { oldPwd, newPwd } = req.body;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 查询原密码
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT Password FROM [User] WHERE Username = @Username');
    const user = result.recordset[0];
    if (!user) return res.json({ success: false, message: '用户不存在' });
    // 校验原密码
    const valid = await bcrypt.compare(oldPwd, user.Password);
    if (!valid) return res.json({ success: false, message: '原密码错误' });
    // 加密新密码并保存
    const hash = await bcrypt.hash(newPwd, 10);
    await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('Password', sql.NVarChar, hash)
      .query('UPDATE [User] SET Password=@Password WHERE Username=@Username');
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 用户列表接口 =====================
// GET /api/auth/user-list?page=1&pageSize=10&search=xxx
router.get('/user-list', authMiddleware, async (req, res) => {
  const { page = 1, pageSize = 10, search = '' } = req.query
  try {
    let pool = await sql.connect(await getDynamicConfig())
    let where = ''
    if (search) {
      where = `WHERE Username LIKE N'%${search}%' OR Email LIKE N'%${search}%' OR Phone LIKE N'%${search}%'`
    }
    const countResult = await pool.request().query(`SELECT COUNT(*) AS total FROM [User] ${where}`)
    const total = countResult.recordset[0].total
    const offset = (page - 1) * pageSize
    const sqlQuery = `
      SELECT * FROM (
        SELECT 
          Username, RealName, Department, Email, Phone, Role, ISNULL(Status, 1) AS Status,
          ROW_NUMBER() OVER (ORDER BY Username) AS RowNum
        FROM [User]
        ${where}
      ) AS T
      WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
    `
    const result = await pool.request().query(sqlQuery)
    res.json({ success: true, data: result.recordset, total })
  } catch (err) {
    console.error('用户列表接口出错:', err);
    res.status(500).json({ success: false, message: err.message })
  }
})

// ===================== 用户状态变更接口 =====================
// POST /api/auth/user-status
// 参数: username, status
// 只允许用户修改自己的状态
router.post('/user-status', authMiddleware, async (req, res) => {
  const { username, status } = req.body;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 查询用户角色
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT Role FROM [User] WHERE Username = @Username');
    const user = result.recordset[0];
    if (!user) return res.json({ success: false, message: '用户不存在' });
    if (user.Role === 'admin') {
      return res.json({ success: false, message: '超级管理员状态不可修改' });
    }
    await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('Status', sql.Int, status)
      .query('UPDATE [User] SET Status=@Status WHERE Username=@Username');
    res.json({ success: true, message: '状态已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 添加用户接口 =====================
// POST /api/auth/add-user
// 参数: Username, Password, Role, Department, RealName, Avatar, Email, Phone
router.post('/add-user', authMiddleware, async (req, res) => {
  const { Username, Password, Role, Department, RealName, Avatar, Email, Phone } = req.body;
  if (!Username || !Password || !Role || !Department || !RealName || !Phone) {
    return res.json({ success: false, message: '请填写所有必填项' });
  }
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 检查用户名唯一
    const exist = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .query('SELECT ID FROM [User] WHERE Username=@Username');
    if (exist.recordset.length > 0) {
      return res.json({ success: false, message: '用户名已存在' });
    }
    // 密码加密
    const hash = await bcrypt.hash(Password, 10);
    await pool.request()
      .input('Username', sql.NVarChar, Username)
      .input('Password', sql.NVarChar, hash)
      .input('Role', sql.NVarChar, Role)
      .input('Department', sql.NVarChar, Department)
      .input('RealName', sql.NVarChar, RealName)
      .input('Avatar', sql.NVarChar, Avatar)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .query('INSERT INTO [User] (Username, Password, Role, Department, RealName, Avatar, Email, Phone) VALUES (@Username, @Password, @Role, @Department, @RealName, @Avatar, @Email, @Phone)');
    res.json({ success: true, message: '添加成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 导出路由
module.exports = router; 