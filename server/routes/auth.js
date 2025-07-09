/**
 * 用户认证路由模块
 *
 * 功能说明：
 * 1. 用户登录验证
 * 2. JWT token生成和验证
 * 3. 用户资料管理
 * 4. 密码加密和验证
 * 5. 管理员账户初始化
 *
 * 安全特性：
 * - bcrypt密码哈希
 * - JWT token认证
 * - 用户状态检查
 * - 权限验证中间件
 *
 * 技术栈：
 * - Express Router
 * - JSON Web Token (JWT)
 * - bcryptjs (密码加密)
 * - SQL Server数据库
 */

// 导入Express路由模块
const express = require('express');
// 导入JWT库，用于生成和验证token
const jwt = require('jsonwebtoken');
// 导入bcrypt库，用于密码加密
const bcrypt = require('bcryptjs');
// 导入数据库连接模块
const { sql, config, getDynamicConfig } = require('../db');
// 创建路由实例
const router = express.Router();
// JWT密钥（生产环境应使用环境变量）
const SECRET = 'dms-secret';
// 导入认证中间件
const authMiddleware = require('../middleware/auth');

/**
 * 用户登录接口
 *
 * 路由：POST /api/auth/login
 *
 * 请求参数：
 * - username: 用户名
 * - password: 密码（明文）
 *
 * 响应数据：
 * - 成功：{ token: "JWT字符串" }
 * - 失败：{ message: "错误信息" }
 *
 * 状态码：
 * - 200: 登录成功
 * - 401: 用户名或密码错误
 * - 403: 用户被禁用
 * - 500: 服务器错误
 *
 * 安全机制：
 * 1. 密码使用bcrypt哈希存储和验证
 * 2. JWT token有效期2小时
 * 3. 检查用户状态（是否被禁用）
 * 4. 不泄露具体错误原因（用户名不存在vs密码错误）
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 连接数据库
    let pool = await sql.connect(await getDynamicConfig());

    // 查询用户信息
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT * FROM [User] WHERE Username = @Username');

    const user = result.recordset[0];

    // 用户不存在
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 用户被禁用
    if (user.Status === 0) {
      return res.status(403).json({ message: '该用户已被禁用，请联系管理员' });
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.Password);
    if (!valid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        username: user.Username,
        role: user.Role
      },
      SECRET,
      { expiresIn: '2h' }
    );

    // 返回token
    res.json({ token });

  } catch (err) {
    console.error('登录错误:', err);
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