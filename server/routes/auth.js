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
const { sql, config, getDynamicConfig, executeQuery } = require('../db');
// 创建路由实例
const router = express.Router();
// JWT密钥（生产环境应使用环境变量）
const SECRET = process.env.JWT_SECRET || 'dms-secret';
// 导入认证中间件
const { authenticateToken } = require('../middleware/auth');
// 导入svg-captcha库，用于生成验证码
const svgCaptcha = require('svg-captcha');

// 验证码存储（生产环境建议使用Redis）
const captchaStore = new Map();

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
 * - 500: 服务器错误/**
 * 生成验证码接口
 * 返回SVG格式的验证码图片和验证码ID
 */
router.get('/captcha', (req, res) => {
  try {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      noise: 5, // 增加干扰线条数
      color: true, // 彩色验证码
      background: '#f0f0f0', // 背景色
      width: 120, // 宽度
      height: 38, // 高度
      charPreset: '0123456789' // 只使用数字
    });
    
    // 生成唯一ID
    const captchaId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    // 存储验证码（30分钟过期）
    const currentTime = Date.now();
    const expiresTime = currentTime + 30 * 60 * 1000; // 30分钟过期
    captchaStore.set(captchaId, {
      text: captcha.text.toLowerCase(),
      expires: expiresTime,
      created: currentTime
    });
    
    // 清理过期验证码（批量清理，提高性能）
    const expiredKeys = [];
    for (const [key, value] of captchaStore.entries()) {
      if (currentTime >= value.expires) {
        expiredKeys.push(key);
      }
    }
    // 批量删除过期验证码
    expiredKeys.forEach(key => captchaStore.delete(key));
    
    res.json({
      captchaId,
      captchaSvg: captcha.data
    });
  } catch (error) {
    console.error('生成验证码失败:', error);
    res.status(500).json({ message: '生成验证码失败' });
  }
});

/**
 * 记录用户登录日志
 * @param {Object} pool - 数据库连接池
 * @param {Object} logData - 登录日志数据
 * @param {number} logData.UserID - 用户ID（可选，登录失败时可能为null）
 * @param {string} logData.Username - 用户名
 * @param {string} logData.RealName - 真实姓名（可选）
 * @param {number} logData.DepartmentID - 部门ID（可选）
 * @param {string} logData.SessionID - 会话ID
 * @param {Date} logData.LoginTime - 登录时间
 * @param {string} logData.IPAddress - IP地址
 * @param {string} logData.UserAgent - 用户代理
 * @param {string} logData.Browser - 浏览器
 * @param {string} logData.OS - 操作系统
 * @param {string} logData.LoginStatus - 登录状态（成功/失败）
 * @param {string} logData.FailureReason - 失败原因（可选）
 */
async function recordLoginLog(pool, logData) {
  try {
    await pool.request()
      .input('UserID', sql.Int, logData.UserID || null)
      .input('Username', sql.NVarChar, logData.Username)
      .input('RealName', sql.NVarChar, logData.RealName || null)
      .input('DepartmentID', sql.Int, logData.DepartmentID || null)
      .input('SessionID', sql.NVarChar, logData.SessionID)
      .input('LoginTime', sql.DateTime2, logData.LoginTime)
      .input('IPAddress', sql.NVarChar, logData.IPAddress)
      .input('UserAgent', sql.NVarChar, logData.UserAgent || '')
      .input('Browser', sql.NVarChar, logData.Browser || '')
      .input('OS', sql.NVarChar, logData.OS || '')
      .input('LoginStatus', sql.NVarChar, logData.LoginStatus)
      .input('IsOnline', sql.Bit, logData.LoginStatus === '成功' ? 1 : 0)
      .input('LastActivity', sql.DateTime2, logData.LoginTime)
      .input('FailureReason', sql.NVarChar, logData.FailureReason || null)
      .query(`
        INSERT INTO [UserLoginLogs] (
          UserID, Username, RealName, DepartmentID, SessionID, 
          LoginTime, IPAddress, UserAgent, Browser, OS, 
          LoginStatus, IsOnline, LastActivity, FailureReason
        ) VALUES (
          @UserID, @Username, @RealName, @DepartmentID, @SessionID,
          @LoginTime, @IPAddress, @UserAgent, @Browser, @OS,
          @LoginStatus, @IsOnline, @LastActivity, @FailureReason
        )
      `);
  } catch (error) {
    console.error('记录登录日志失败:', error);
  }
}

/**
 * 解析用户代理字符串，提取浏览器和操作系统信息
 * @param {string} userAgent - 用户代理字符串
 * @returns {Object} 包含browser和os的对象
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { browser: '', os: '' };
  
  let browser = '';
  let os = '';
  
  // 检测浏览器
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera')) {
    browser = 'Opera';
  } else {
    browser = 'Unknown';
  }
  
  // 检测操作系统
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS')) {
    os = 'iOS';
  } else {
    os = 'Unknown';
  }
  
  return { browser, os };
}

/**
 * 用户登录接口
 * 安全特性：
 * 1. 密码使用bcrypt加密验证
 * 2. JWT token有效期2小时
 * 3. 检查用户状态（是否被禁用）
 * 4. 不泄露具体错误原因（用户名不存在vs密码错误）
 * 5. 验证码验证
 * 6. 记录所有登录尝试（成功和失败）
 */
router.post('/login', async (req, res) => {
  const { username, password, captchaId, captchaText } = req.body;
  // 登录请求参数已记录到系统日志
  const loginTime = new Date();
  const sessionId = require('crypto').randomUUID();
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '未知';
  const userAgent = req.get('User-Agent') || '';
  const { browser, os } = parseUserAgent(userAgent);

  try {
    // 连接数据库
    let pool = await sql.connect(await getDynamicConfig());

    // 先查询用户信息，以便在所有失败情况下都能记录UserID
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT * FROM [User] WHERE Username = @Username');

    const user = result.recordset[0];

    // 验证验证码参数
    if (!captchaId || !captchaText) {
      // 记录登录失败日志
      await recordLoginLog(pool, {
        UserID: user ? user.ID : null,
        Username: username || '未知',
        RealName: user ? user.RealName : null,
        DepartmentID: user ? user.DepartmentID : null,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '验证码参数缺失'
      });
      return res.status(400).json({ message: '请输入验证码' });
    }

    // 获取存储的验证码信息
    const storedCaptcha = captchaStore.get(captchaId);
    if (!storedCaptcha) {
      // 记录登录失败日志
      await recordLoginLog(pool, {
        UserID: user ? user.ID : null,
        Username: username || '未知',
        RealName: user ? user.RealName : null,
        DepartmentID: user ? user.DepartmentID : null,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '验证码不存在或已过期'
      });
      return res.status(400).json({ message: '验证码不存在或已过期，请重新获取' });
    }

    // 检查验证码是否过期
    const currentTime = Date.now();
    if (currentTime >= storedCaptcha.expires) {
      // 立即删除过期的验证码
      captchaStore.delete(captchaId);
      // 记录登录失败日志
      await recordLoginLog(pool, {
        UserID: user ? user.ID : null,
        Username: username || '未知',
        RealName: user ? user.RealName : null,
        DepartmentID: user ? user.DepartmentID : null,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '验证码已过期'
      });
      return res.status(400).json({ message: '验证码已过期，请重新获取' });
    }
    
    // 验证验证码内容（不区分大小写）
    const inputText = captchaText.toLowerCase().trim();
    const storedText = storedCaptcha.text.toLowerCase().trim();
    // 验证码验证逻辑
    
    if (inputText !== storedText) {
      // 记录登录失败日志（如果用户存在则记录UserID）
      await recordLoginLog(pool, {
        UserID: user ? user.ID : null,
        Username: username || '未知',
        RealName: user ? user.RealName : null,
        DepartmentID: user ? user.DepartmentID : null,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '验证码错误'
      });
      return res.status(400).json({ message: '验证码错误，请重新输入' });
    }
    
    // 验证码验证成功，立即删除已使用的验证码，防止重复使用
    captchaStore.delete(captchaId);

    // 用户不存在
    // 用户查询完成
    if (!user) {
      // 记录登录失败日志
      await recordLoginLog(pool, {
        Username: username || '未知',
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '用户不存在'
      });
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 用户被禁用
    if (user.Status === 0) {
      // 记录登录失败日志
      await recordLoginLog(pool, {
        UserID: user.ID,
        Username: user.Username,
        RealName: user.RealName,
        DepartmentID: user.DepartmentID,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '用户已被禁用'
      });
      return res.status(403).json({ message: '该用户已被禁用，请联系管理员' });
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.Password);
    // 密码验证完成
    
    if (!valid) {
      // 记录登录失败日志
      await recordLoginLog(pool, {
        UserID: user.ID,
        Username: user.Username,
        RealName: user.RealName,
        DepartmentID: user.DepartmentID,
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '密码错误'
      });
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 更新用户最后登录时间
    await pool.request()
      .input('UserId', sql.Int, user.ID)
      .input('LoginTime', sql.DateTime, loginTime)
      .query('UPDATE [User] SET LastLoginTime = @LoginTime WHERE ID = @UserId');

    // 重新查询用户信息以获取更新后的LastLoginTime
    const updatedUserResult = await pool.request()
      .input('UserId', sql.Int, user.ID)
      .query('SELECT * FROM [User] WHERE ID = @UserId');
    
    const updatedUser = updatedUserResult.recordset[0];

    // 获取用户角色信息
    const rolesResult = await pool.request()
      .input('UserID', sql.Int, user.ID)
      .query(`
        SELECT r.ID, r.RoleName, r.RoleCode
        FROM [UserRoles] ur
        JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserID AND r.Status = 1
      `);
    
    const userRoles = rolesResult.recordset;
    
    // 检查是否为管理员角色
    const isAdmin = userRoles.some(role => 
      role.RoleCode === 'admin' || 
      role.RoleName === '系统管理员' ||
      role.RoleName === 'admin'
    );

    // 生成JWT token（包含角色信息）
    // 开始生成JWT token
    const token = jwt.sign(
      {
        id: user.ID,
        username: user.Username,
        role: isAdmin ? 'admin' : 'user',
        roleCode: isAdmin ? 'admin' : 'user',
        roles: userRoles
      },
      SECRET,
      { expiresIn: '2h' }
    );
    // JWT token生成完成

    // 获取ERP配置并生成ERP token
    let erpToken = null;
    let erpConfig = null;
    let erpTokenStatus = 'success'; // 记录ERP token获取状态
    let erpMessage = null; // ERP相关提示信息
    
    try {
      // 直接从数据库获取ERP配置数据
      const query = 'SELECT config_key, config_value FROM erp_config ORDER BY config_key';
      const erpConfigResult = await executeQuery(async (pool) => {
        return await pool.request().query(query);
      });
      
      if (erpConfigResult && erpConfigResult.recordset && erpConfigResult.recordset.length > 0) {
        // 将配置数组转换为对象格式便于查找
        const configMap = {};
        erpConfigResult.recordset.forEach(row => {
          configMap[row.config_key] = row.config_value;
        });
        
        erpConfig = {
          baseUrl: configMap['erp_api_url'] || '',
          appId: configMap['erp_app_id'] || '',
          appSecret: configMap['erp_app_secret'] || ''
        };
        
        // 检查ERP配置完整性并提供详细的缺失信息
        const missingConfigs = [];
        if (!erpConfig.baseUrl) missingConfigs.push('ERP API地址(erp_api_url)');
        if (!erpConfig.appId) missingConfigs.push('ERP应用ID(erp_app_id)');
        if (!erpConfig.appSecret) missingConfigs.push('ERP应用密钥(erp_app_secret)');
        
        if (missingConfigs.length === 0) {
          // 配置完整，尝试获取ERP token
          const erpService = require('../services/erpService');
          await erpService.loadConfig(); // 确保配置已加载
          
          // 直接尝试获取token，而不是使用testConnection
          try {
            await erpService.getToken();
            erpToken = erpService.token;
            if (erpToken) {
              console.log('ERP token获取成功，用户:', user.Username);
            } else {
              erpTokenStatus = 'failed';
              erpMessage = 'ERP token获取失败，请检查ERP系统配置';
              console.warn('ERP token获取失败，用户:', user.Username);
            }
          } catch (tokenError) {
            erpTokenStatus = 'failed';
            erpMessage = `ERP token获取失败: ${tokenError.message}`;
            console.error('ERP token获取异常，用户:', user.Username, '错误:', tokenError.message);
          }
        } else {
          erpTokenStatus = 'config_incomplete';
          // 配置不完整时提供具体的缺失配置项信息
          erpMessage = `ERP系统配置不完整，缺少以下配置项：<br>${missingConfigs.map(config => `• ${config}`).join('<br>')}<br><br>请联系管理员完善ERP配置。`;
          console.warn('ERP配置不完整，缺少配置项:', missingConfigs.join(', '), '用户:', user.Username);
        }
      } else {
        erpTokenStatus = 'no_config';
        // 未配置时提供提示信息
        erpMessage = 'ERP系统尚未配置，相关功能暂不可用。请联系管理员进行ERP系统配置。';
        console.warn('未找到ERP配置，用户:', user.Username);
      }
    } catch (erpError) {
      // ERP配置获取异常，不影响DMS登录流程
      erpTokenStatus = 'config_error';
      erpMessage = null; // 配置获取异常时不显示错误信息
      console.error('ERP配置获取异常，但不影响登录:', erpError.message);
    }

    // 记录登录成功日志
    await recordLoginLog(pool, {
      UserID: user.ID,
      Username: user.Username,
      RealName: user.RealName,
      DepartmentID: user.DepartmentID,
      SessionID: sessionId,
      LoginTime: loginTime,
      IPAddress: clientIP,
      UserAgent: userAgent,
      Browser: browser,
      OS: os,
      LoginStatus: '成功'
    });

    // 返回token和用户信息（包含DMS token和ERP token）
    const responseData = { 
      token,
      erpToken,
      erpConfig,
      erpTokenStatus, // ERP token获取状态
      erpMessage, // ERP相关提示信息
      user: {
        id: updatedUser.ID,
        username: updatedUser.Username,
        realName: updatedUser.RealName,
        lastLoginTime: updatedUser.LastLoginTime ? updatedUser.LastLoginTime.toISOString() : null
      }
    };
    
    // 如果ERP token获取失败，在控制台输出详细信息供调试
    if (erpTokenStatus !== 'success') {
      console.log(`用户 ${user.Username} 登录成功，但ERP token状态: ${erpTokenStatus}, 提示: ${erpMessage}`);
    }
    // 登录成功，准备返回响应
    res.json(responseData);

  } catch (err) {
    console.error('登录过程中发生异常:', err);
    
    // 登录过程中出现异常时，确保删除当前验证码
    if (req.body.captchaId) {
      captchaStore.delete(req.body.captchaId);
    }
    
    // 记录系统异常导致的登录失败
    try {
      let pool = await sql.connect(await getDynamicConfig());
      await recordLoginLog(pool, {
        Username: username || '未知',
        SessionID: sessionId,
        LoginTime: loginTime,
        IPAddress: clientIP,
        UserAgent: userAgent,
        Browser: browser,
        OS: os,
        LoginStatus: '失败',
        FailureReason: '系统异常: ' + err.message
      });
    } catch (logError) {
      console.error('记录异常登录日志失败:', logError);
    }
    
    res.status(500).json({ message: '登录失败，请重试' });
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
    
    const hash = await bcrypt.hash('Password112233', 10);
    
    if (result.recordset.length === 0) {
      // 开始事务
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      try {
        // 插入admin用户（不再使用Role字段）
        const userResult = await transaction.request()
          .input('Username', sql.NVarChar, 'admin')
          .input('Password', sql.NVarChar, hash)
          .input('RealName', sql.NVarChar, '系统管理员')
          .input('Status', sql.Int, 1)
          .query('INSERT INTO [User] (Username, Password, RealName, Status) OUTPUT INSERTED.ID VALUES (@Username, @Password, @RealName, @Status)');
        
        const adminUserId = userResult.recordset[0].ID;
        
        // 查找或创建系统管理员角色
        let adminRoleResult = await transaction.request()
          .query("SELECT ID FROM [Roles] WHERE RoleName = '系统管理员' OR Code = 'admin'");
        
        let adminRoleId;
        if (adminRoleResult.recordset.length === 0) {
          // 创建系统管理员角色
          const newRoleResult = await transaction.request()
            .input('RoleName', sql.NVarChar, '系统管理员')
            .input('Code', sql.NVarChar, 'admin')
            .input('Description', sql.NVarChar, '系统管理员角色，拥有所有权限')
            .input('Status', sql.Bit, 1)
            .query('INSERT INTO [Roles] (RoleName, Code, Description, Status) OUTPUT INSERTED.ID VALUES (@RoleName, @Code, @Description, @Status)');
          adminRoleId = newRoleResult.recordset[0].ID;
        } else {
          adminRoleId = adminRoleResult.recordset[0].ID;
        }
        
        // 为admin用户分配系统管理员角色
        await transaction.request()
          .input('UserID', sql.Int, adminUserId)
          .input('RoleID', sql.Int, adminRoleId)
          .query('INSERT INTO [UserRoles] (UserID, RoleID) VALUES (@UserID, @RoleID)');
        
        await transaction.commit();
        res.send('初始化admin用户成功');
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      // 更新现有admin用户的密码
      await pool.request()
        .input('Username', sql.NVarChar, 'admin')
        .input('Password', sql.NVarChar, hash)
        .query('UPDATE [User] SET Password = @Password WHERE Username = @Username');
      res.send('admin用户密码已更新');
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===================== 获取当前用户信息 =====================
// GET /api/auth/profile
// 需登录(token)，返回当前用户所有主要字段
router.get('/profile', authenticateToken, async (req, res) => {
  const username = req.user.username;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query(`
        SELECT 
          u.ID,
          u.Username,
          u.RealName,
          u.Email,
          u.Phone,
          u.Gender,
          u.Birthday,
          u.Address,
          u.Remark,
          u.Avatar,
          u.Status,
          u.DepartmentID,
          d.Name as DepartmentName,
          u.PositionID,
          p.PositionName,
          u.CreatedAt
        FROM [User] u
        LEFT JOIN [Department] d ON u.DepartmentID = d.ID
        LEFT JOIN [Positions] p ON u.PositionID = p.ID
        WHERE u.Username = @Username
      `);
    
    // 获取用户角色信息
    const rolesResult = await pool.request()
      .input('UserID', sql.Int, result.recordset[0]?.ID)
      .query(`
        SELECT r.ID, r.RoleName as name
        FROM [UserRoles] ur
        JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserID
      `);
    
    const user = result.recordset[0];
    if (user) {
      // 添加角色信息
      user.roles = rolesResult.recordset;
      // 限制头像最大长度，防止前端异常（调整为2MB以容纳现有头像数据）
      if (user.Avatar && user.Avatar.length > 2000000) user.Avatar = '';
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
router.post('/profile', authenticateToken, async (req, res) => {
  const username = req.user.username;
  let { RealName, Email, Phone, DepartmentID, Avatar, Gender, Birthday, Address, Remark } = req.body;
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
      .input('DepartmentID', sql.Int, DepartmentID)
      .input('Avatar', sql.NVarChar, Avatar)
      .input('Gender', sql.NVarChar, Gender)
      .input('Birthday', sql.Date, Birthday)
      .input('Address', sql.NVarChar, Address)
      .input('Remark', sql.NVarChar, Remark)
      .query('UPDATE [User] SET RealName=@RealName, Email=@Email, Phone=@Phone, DepartmentID=@DepartmentID, Avatar=@Avatar, Gender=@Gender, Birthday=@Birthday, Address=@Address, Remark=@Remark WHERE Username=@Username');
    // 保存后立即查询最新用户数据返回，字段名与GET /profile保持一致
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query(`
        SELECT 
          u.ID,
          u.Username,
          u.RealName,
          u.Email,
          u.Phone,
          u.Gender,
          u.Birthday,
          u.Address,
          u.Remark,
          u.Avatar,
          u.Status,
          u.DepartmentID,
          d.Name as DepartmentName,
          u.PositionID,
          p.PositionName,
          u.CreatedAt
        FROM [User] u
        LEFT JOIN [Department] d ON u.DepartmentID = d.ID
        LEFT JOIN [Positions] p ON u.PositionID = p.ID
        WHERE u.Username = @Username
      `);
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
router.post('/change-password', authenticateToken, async (req, res) => {
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
router.get('/user-list', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 10, search = '' } = req.query
  try {
    let pool = await sql.connect(await getDynamicConfig())
    let where = "WHERE u.Username != 'admin'" // 过滤系统管理员账号
    if (search) {
      where += ` AND (u.Username LIKE N'%${search}%' OR u.RealName LIKE N'%${search}%' OR u.Email LIKE N'%${search}%' OR u.Phone LIKE N'%${search}%' OR u.Department LIKE N'%${search}%')`
    }
    const countResult = await pool.request().query(`SELECT COUNT(*) AS total FROM [User] u ${where}`)
    const total = countResult.recordset[0].total
    const offset = (page - 1) * pageSize
    const sqlQuery = `
      SELECT * FROM (
        SELECT 
          u.ID, u.Username, u.RealName, 
          ISNULL(u.Department, '未分配') AS Department, 
          u.Email, u.Phone, 
          u.Avatar, ISNULL(u.Status, 1) AS Status, u.CreatedAt, u.LastLoginTime,
          u.Gender, u.Birthday, u.Address, u.Remark, u.UpdatedAt,
          u.DepartmentID,
          p.PositionName AS Position,
          STUFF((
            SELECT ', ' + r.RoleName 
            FROM [UserRoles] ur 
            INNER JOIN [Roles] r ON ur.RoleID = r.ID 
            WHERE ur.UserID = u.ID 
            FOR XML PATH('')
          ), 1, 2, '') AS RoleNames,
          CASE WHEN EXISTS(
            SELECT 1 FROM [UserRoles] ur 
            INNER JOIN [Roles] r ON ur.RoleID = r.ID 
            WHERE ur.UserID = u.ID AND r.RoleCode = 'admin'
          ) THEN 'admin' ELSE 'user' END AS Role,
          ROW_NUMBER() OVER (ORDER BY u.Username) AS RowNum
        FROM [User] u
        LEFT JOIN [Positions] p ON u.PositionID = p.ID
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

// ===================== 获取单个用户详细信息 =====================
// GET /api/auth/user/:userId
/**
 * 获取指定用户的详细信息
 * @param {number} userId - 用户ID
 * @returns {Object} 用户详细信息
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    let pool = await sql.connect(await getDynamicConfig());
    
    // 获取用户基本信息
    const userResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT 
          u.ID, u.Username, u.RealName, u.Department, u.Email, u.Phone, 
          u.Avatar, u.PositionID, u.DepartmentID, u.Gender, u.Birthday, u.Address,
          ISNULL(u.Status, 1) AS Status, u.CreatedAt, u.LastLoginTime
        FROM [User] u
        WHERE u.ID = @UserId
      `);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const user = userResult.recordset[0];
    
    // 获取用户角色信息
    const rolesResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT r.ID, r.RoleName, r.RoleCode
        FROM [UserRoles] ur
        INNER JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserId
      `);
    
    // 组装角色信息
    const roles = rolesResult.recordset;
    const roleNames = roles.map(r => r.RoleName).join(', ');
    const isAdmin = roles.some(r => r.RoleCode === 'admin');
    
    // 返回完整的用户信息
    const userInfo = {
      ...user,
      RoleNames: roleNames,
      Role: isAdmin ? 'admin' : 'user',
      Roles: roles
    };
    
    res.json({ success: true, data: userInfo });
    
  } catch (err) {
    console.error('获取用户详细信息失败:', err);
    res.status(500).json({ success: false, message: '获取用户信息失败，请重试' });
  }
});

// ===================== 用户状态变更接口 =====================
// POST /api/auth/user-status
// 参数: username, status
// 只允许用户修改自己的状态
router.post('/user-status', authenticateToken, async (req, res) => {
  const { username, status } = req.body;
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 查询用户是否存在及是否为管理员
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query(`
        SELECT u.ID, u.Username,
        CASE WHEN EXISTS(
          SELECT 1 FROM [UserRoles] ur 
          INNER JOIN [Roles] r ON ur.RoleID = r.ID 
          WHERE ur.UserID = u.ID AND r.RoleCode = 'admin'
        ) THEN 1 ELSE 0 END AS IsAdmin
        FROM [User] u WHERE u.Username = @Username
      `);
    const user = result.recordset[0];
    if (!user) return res.json({ success: false, message: '用户不存在' });
    if (user.IsAdmin === 1) {
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
// 参数: Username, Password, Role, Department, RealName, Avatar, Email, Phone, PositionID, DepartmentID, Gender, Birthday, Address, Remark
router.post('/add-user', authenticateToken, async (req, res) => {
  const { Username, Password, Department, RealName, Avatar, Email, Phone, PositionID, DepartmentID, Gender, Birthday, Address, Remark } = req.body;
  
  // 检查必填字段并返回具体缺失字段信息
  const requiredFields = {
    'Username': { value: Username, label: '用户名' },
    'Password': { value: Password, label: '密码' },
    'Department': { value: Department, label: '所属部门' },
    'RealName': { value: RealName, label: '真实姓名' }
  };
  
  const missingFields = [];
  for (const [field, config] of Object.entries(requiredFields)) {
    if (!config.value || config.value.trim() === '') {
      missingFields.push(config.label);
    }
  }
  
  if (missingFields.length > 0) {
    return res.json({ 
      success: false, 
      message: `请填写以下必填项：${missingFields.join('、')}`,
      missingFields: missingFields
    });
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
    const result = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .input('Password', sql.NVarChar, hash)
      .input('Department', sql.NVarChar, Department)
      .input('RealName', sql.NVarChar, RealName)
      .input('Avatar', sql.NVarChar, Avatar)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('PositionID', sql.Int, PositionID || null)
      .input('DepartmentID', sql.Int, DepartmentID || null)
      .input('Gender', sql.NVarChar, Gender || null)
      .input('Birthday', sql.Date, Birthday || null)
      .input('Address', sql.NVarChar, Address || null)
      .input('Remark', sql.NVarChar, Remark || null)
      .query('INSERT INTO [User] (Username, Password, Department, RealName, Avatar, Email, Phone, PositionID, DepartmentID, Gender, Birthday, Address, Remark) OUTPUT INSERTED.ID VALUES (@Username, @Password, @Department, @RealName, @Avatar, @Email, @Phone, @PositionID, @DepartmentID, @Gender, @Birthday, @Address, @Remark)');
    
    // 新用户默认分配普通用户角色
    const newUserId = result.recordset[0].ID;
    const defaultRoleResult = await pool.request()
      .query("SELECT ID FROM [Roles] WHERE RoleCode = 'user' OR RoleName = '普通用户'");
    
    if (defaultRoleResult.recordset.length > 0) {
      const defaultRoleId = defaultRoleResult.recordset[0].ID;
      await pool.request()
        .input('UserId', sql.Int, newUserId)
        .input('RoleId', sql.Int, defaultRoleId)
        .query('INSERT INTO [UserRoles] (UserID, RoleID) VALUES (@UserId, @RoleId)');
    }
    
    res.json({ success: true, message: '添加成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 更新用户信息 =====================
// PUT /api/auth/update-user
// 更新用户信息（管理员功能）
router.put('/update-user', authenticateToken, async (req, res) => {
  const { Username, Department, RealName, Avatar, Email, Phone, PositionID, DepartmentID, Gender, Birthday, Address, Remark } = req.body;
  
  // 检查必填字段并返回具体缺失字段信息
  const requiredFields = {
    'Username': { value: Username, label: '用户名' },
    'Department': { value: Department, label: '所属部门' },
    'RealName': { value: RealName, label: '真实姓名' }
  };
  
  const missingFields = [];
  for (const [field, config] of Object.entries(requiredFields)) {
    if (!config.value || config.value.trim() === '') {
      missingFields.push(config.label);
    }
  }
  
  if (missingFields.length > 0) {
    return res.json({ 
      success: false, 
      message: `请填写以下必填项：${missingFields.join('、')}`,
      missingFields: missingFields
    });
  }
  try {
    // 校验头像类型和长度
    if (Avatar && typeof Avatar === 'string' && Avatar.length > 2000000) {
      return res.status(400).json({ success: false, message: '头像图片过大' });
    }
    let pool = await sql.connect(await getDynamicConfig());
    // 检查用户是否存在
    const exist = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .query('SELECT ID FROM [User] WHERE Username=@Username');
    if (exist.recordset.length === 0) {
      return res.json({ success: false, message: '用户不存在' });
    }
    // 更新用户信息（不包括角色，角色通过专门的角色分配接口管理）
    await pool.request()
      .input('Username', sql.NVarChar, Username)
      .input('Department', sql.NVarChar, Department)
      .input('RealName', sql.NVarChar, RealName)
      .input('Avatar', sql.NVarChar, Avatar)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('PositionID', sql.Int, PositionID || null)
      .input('DepartmentID', sql.Int, DepartmentID || null)
      .input('Gender', sql.NVarChar, Gender || null)
      .input('Birthday', sql.Date, Birthday || null)
      .input('Address', sql.NVarChar, Address || null)
      .input('Remark', sql.NVarChar, Remark || null)
      .query('UPDATE [User] SET Department=@Department, RealName=@RealName, Avatar=@Avatar, Email=@Email, Phone=@Phone, PositionID=@PositionID, DepartmentID=@DepartmentID, Gender=@Gender, Birthday=@Birthday, Address=@Address, Remark=@Remark WHERE Username=@Username');
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    console.error('更新用户信息出错:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 获取用户角色和权限信息 =====================
// GET /api/auth/user/:userId/roles-permissions
// 获取指定用户的角色和权限信息
router.get('/user/:userId/roles-permissions', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    let pool = await sql.connect(await getDynamicConfig());
    
    // 获取用户角色信息
    const rolesResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT 
          r.ID,
          r.RoleName as Name,
          r.RoleCode as Code,
          r.Description
        FROM [UserRoles] ur
        INNER JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserId AND r.Status = 1
      `);
    
    // 获取用户完整权限信息（包括角色权限和用户级权限）
    const permissionsResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT DISTINCT
          v.MenuID as id,
          v.MenuName as name,
          v.MenuCode as code,
          v.Path as path,
          m.MenuType as type,
          m.ParentID as parentId,
          v.Permission,
          m.SortOrder,
          v.PermissionSource,
          v.PermissionType,
          v.HasPermission
        FROM [V_UserCompletePermissions] v
        INNER JOIN [Menus] m ON v.MenuID = m.ID
        WHERE v.UserID = @UserId AND v.HasPermission = 1
        ORDER BY m.SortOrder
       `);
    
    const roles = rolesResult.recordset || [];
    const permissions = permissionsResult.recordset || [];
    
    res.json({
      success: true,
      data: {
        roles,
        permissions,
        menus: permissions // 兼容前端
      }
    });
    
  } catch (err) {
    console.error('获取用户角色权限信息出错:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 刷新用户权限缓存 =====================
// POST /api/auth/refresh-permissions
// 参数: userId (可选，不传则刷新当前用户)
// 清除指定用户的权限缓存，强制重新加载权限数据
router.post('/refresh-permissions', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const targetUserId = userId || req.user.id; // 如果没有指定userId，则刷新当前用户
  
  try {
    let pool = await sql.connect(await getDynamicConfig());
    
    // 验证目标用户是否存在
    const userResult = await pool.request()
      .input('UserId', sql.Int, targetUserId)
      .query('SELECT ID, Username FROM [User] WHERE ID = @UserId AND Status = 1');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在或已被禁用' 
      });
    }
    
    const targetUser = userResult.recordset[0];
    
    // 检查权限：只有管理员可以刷新其他用户的权限，普通用户只能刷新自己的权限
    if (userId && userId !== req.user.id) {
      // 检查当前用户是否有管理员权限
      const adminCheckResult = await pool.request()
        .input('UserId', sql.Int, req.user.id)
        .query(`
          SELECT COUNT(*) as count
          FROM [UserRoles] ur
          INNER JOIN [Roles] r ON ur.RoleID = r.ID
          WHERE ur.UserID = @UserId AND r.RoleCode = 'admin' AND r.Status = 1
        `);
      
      if (adminCheckResult.recordset[0].count === 0) {
        return res.status(403).json({ 
          success: false, 
          message: '权限不足，只能刷新自己的权限' 
        });
      }
    }
    
    // 记录权限刷新操作
    await pool.request()
      .input('UserId', sql.Int, req.user.id)
      .input('TargetUserId', sql.Int, targetUserId)
      .input('Action', sql.NVarChar, 'REFRESH_PERMISSIONS')
      .input('Details', sql.NVarChar, `刷新用户 ${targetUser.Username} 的权限缓存`)
      .input('IPAddress', sql.NVarChar, req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown')
      .input('UserAgent', sql.NVarChar, req.headers['user-agent'] || 'unknown')
      .query(`
        INSERT INTO [SystemLogs] (UserID, Action, Details, IPAddress, UserAgent, CreatedAt)
        VALUES (@UserId, @Action, @Details, @IPAddress, @UserAgent, GETDATE())
      `);
    
    // 获取刷新后的用户权限数据
    const permissionsResult = await pool.request()
      .input('UserId', sql.Int, targetUserId)
      .query(`
        SELECT DISTINCT
          v.MenuID as id,
          v.MenuName as name,
          v.MenuCode as code,
          v.Path as path,
          m.MenuType as type,
          m.ParentID as parentId,
          v.Permission,
          m.SortOrder,
          v.PermissionSource,
          v.PermissionType,
          v.HasPermission
        FROM [V_UserCompletePermissions] v
        INNER JOIN [Menus] m ON v.MenuID = m.ID
        WHERE v.UserID = @UserId AND v.HasPermission = 1
        ORDER BY m.SortOrder
      `);
    
    const rolesResult = await pool.request()
      .input('UserId', sql.Int, targetUserId)
      .query(`
        SELECT 
          r.ID,
          r.RoleName as Name,
          r.RoleCode as Code,
          r.Description
        FROM [UserRoles] ur
        INNER JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserId AND r.Status = 1
      `);
    
    const permissions = permissionsResult.recordset || [];
    const roles = rolesResult.recordset || [];
    
    res.json({
      success: true,
      message: `用户 ${targetUser.Username} 的权限缓存已刷新`,
      data: {
        userId: targetUserId,
        username: targetUser.Username,
        permissions,
        roles,
        menus: permissions, // 兼容前端
        refreshTime: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('刷新用户权限缓存出错:', err);
    res.status(500).json({ 
      success: false, 
      message: '刷新权限缓存失败: ' + err.message 
    });
  }
});

// ===================== 重置用户密码 =====================
// POST /api/auth/reset-user-password
// 参数: userID, username, newPassword, notifyMethod
// 管理员重置指定用户的密码
router.post('/reset-user-password', authenticateToken, async (req, res) => {
  const { userId, username, newPassword, notifyMethod } = req.body;
  
  // 参数验证
  if (!userId || !username || !newPassword) {
    return res.json({ success: false, message: '缺少必要参数' });
  }
  
  if (newPassword.length < 6) {
    return res.json({ success: false, message: '密码长度至少6位' });
  }
  
  try {
    let pool = await sql.connect(await getDynamicConfig());
    
    // 验证用户是否存在
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Username', sql.NVarChar, username)
      .query('SELECT ID, Username FROM [User] WHERE ID = @UserID AND Username = @Username');
    
    const user = userResult.recordset[0];
    if (!user) {
      return res.json({ success: false, message: '用户不存在' });
    }
    
    // 加密新密码
    const hash = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Password', sql.NVarChar, hash)
      .query('UPDATE [User] SET Password=@Password WHERE ID = @UserID');
    
    // 根据通知方式处理（这里可以扩展邮件或短信通知功能）
    let notifyMessage = '';
    switch (notifyMethod) {
      case 'email':
        notifyMessage = '已通过邮件通知用户';
        // TODO: 实现邮件通知功能
        break;
      case 'sms':
        notifyMessage = '已通过短信通知用户';
        // TODO: 实现短信通知功能
        break;
      case 'none':
      default:
        notifyMessage = '密码重置成功，未发送通知';
        break;
    }
    
    res.json({ 
      success: true, 
      message: `用户 ${username} 的密码重置成功。${notifyMessage}` 
    });
    
  } catch (err) {
    console.error('重置密码失败:', err);
    res.status(500).json({ success: false, message: '重置密码失败，请重试' });
  }
});

// ===================== 用户角色分配 =====================
// POST /api/auth/user/:userId/assign-roles
// 为指定用户分配角色
router.post('/user/:userId/assign-roles', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { roleIds } = req.body;
  
  // 参数验证
  if (!userId || !Array.isArray(roleIds)) {
    return res.json({ success: false, message: '参数错误' });
  }
  
  try {
    let pool = await sql.connect(await getDynamicConfig());
    
    // 验证用户是否存在
    const userResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query('SELECT ID, Username FROM [User] WHERE ID = @UserId');
    
    const user = userResult.recordset[0];
    if (!user) {
      return res.json({ success: false, message: '用户不存在' });
    }
    
    // 开始事务
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 删除用户现有角色
      await transaction.request()
        .input('UserId', sql.Int, userId)
        .query('DELETE FROM [UserRoles] WHERE UserID = @UserId');
      
      // 分配新角色
      for (const roleId of roleIds) {
        if (roleId && !isNaN(roleId)) {
          await transaction.request()
            .input('UserId', sql.Int, userId)
            .input('RoleId', sql.Int, roleId)
            .query('INSERT INTO [UserRoles] (UserID, RoleID) VALUES (@UserId, @RoleId)');
        }
      }
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        message: `用户 ${user.Username} 的角色分配成功` 
      });
      
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    
  } catch (err) {
    console.error('分配用户角色失败:', err);
    res.status(500).json({ success: false, message: '分配角色失败，请重试' });
  }
});

// ===================== 权限检查 =====================
// GET /api/auth/check-permission/:permission
// 检查当前用户是否具有指定权限
router.get('/check-permission/:permission', authenticateToken, async (req, res) => {
  try {
    const { permission } = req.params;
    const userId = req.user.id;
    
    if (!permission) {
      return res.status(400).json({
        success: false,
        message: '权限标识不能为空'
      });
    }
    
    // 导入权限检查函数
    const { checkUserPermission } = require('../middleware/auth');
    
    // 检查用户权限
    const hasPermission = await checkUserPermission(userId, permission);
    
    res.json({
      success: true,
      data: {
        userId: userId,
        permission: permission,
        hasPermission: hasPermission
      }
    });
    
  } catch (error) {
    console.error('检查权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查权限失败',
      error: error.message
    });
  }
});

/**
 * 用户退出登录接口
 *
 * 路由：POST /api/auth/logout
 *
 * 功能说明：
 * 1. 记录用户退出登录日志
 * 2. 更新UserLoginLogs表中的LogoutTime和IsOnline状态
 *
 * 请求参数：
 * - sessionId: 会话ID（可选，如果不提供则从token中获取）
 *
 * 返回数据：
 * - success: 操作是否成功
 * - message: 操作结果消息
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userInfo = req.user;
    
    // 获取客户端IP地址
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                    '未知';
    
    // 解析User-Agent信息
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os } = parseUserAgent(userAgent);
    
    // 获取数据库连接
    const pool = await sql.connect(await getDynamicConfig());
    
    // 更新用户登录日志，记录退出时间
    const logoutTime = new Date();
    
    // 如果提供了sessionId，则更新指定会话的退出时间
    // 否则更新当前用户最近的在线会话
    let updateQuery;
    let request = pool.request()
      .input('LogoutTime', sql.DateTime2, logoutTime)
      .input('IsOnline', sql.Bit, 0);
    
    if (sessionId) {
      // 更新指定会话
      request.input('SessionID', sql.NVarChar, sessionId);
      updateQuery = `
        UPDATE [UserLoginLogs] 
        SET LogoutTime = @LogoutTime, IsOnline = @IsOnline
        WHERE SessionID = @SessionID AND LogoutTime IS NULL
      `;
    } else {
      // 更新当前用户最近的在线会话
      request.input('UserID', sql.Int, userInfo.UserID);
      updateQuery = `
        UPDATE [UserLoginLogs] 
        SET LogoutTime = @LogoutTime, IsOnline = @IsOnline
        WHERE UserID = @UserID AND IsOnline = 1 AND LogoutTime IS NULL
      `;
    }
    
    const result = await request.query(updateQuery);
    
    // 退出登录已通过更新UserLoginLogs表记录，无需在SystemLogs中重复记录
    
    res.json({
      success: true,
      message: '退出登录成功',
      data: {
        logoutTime: logoutTime,
        affectedRows: result.rowsAffected[0]
      }
    });
    
  } catch (error) {
    console.error('退出登录失败:', error);
    res.status(500).json({
      success: false,
      message: '退出登录失败',
      error: error.message
    });
  }
});

/**
 * Token刷新接口
 * 功能：在token即将过期前刷新token，延长用户会话
 */
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const userInfo = req.user;
    
    // 检查token是否即将过期（剩余时间少于5分钟时允许刷新）
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = userInfo.exp;
    const timeUntilExpiry = tokenExp - currentTime;
    
    // 如果token剩余时间超过5分钟，不允许刷新
    if (timeUntilExpiry > 300) { // 300秒 = 5分钟
      return res.status(400).json({ 
        success: false,
      });
    }
    
    let pool = await sql.connect(await getDynamicConfig());
    
    // 验证用户是否仍然有效
    const userResult = await pool.request()
      .input('UserId', sql.Int, userInfo.id)
      .query('SELECT * FROM [User] WHERE ID = @UserId AND Status = 1');
    
    if (userResult.recordset.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: '用户不存在或已被禁用' 
      });
    }
    
    const user = userResult.recordset[0];
    
    // 获取用户角色信息
    const rolesResult = await pool.request()
      .input('UserID', sql.Int, user.ID)
      .query(`
        SELECT r.ID, r.RoleName, r.RoleCode
        FROM [UserRoles] ur
        JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserID AND r.Status = 1
      `);
    
    const userRoles = rolesResult.recordset;
    
    // 检查是否为管理员角色
    const isAdmin = userRoles.some(role => 
      role.RoleCode === 'admin' || 
      role.RoleName === '系统管理员' ||
      role.RoleName === 'admin'
    );
    
    // 生成新的JWT token
    const newToken = jwt.sign(
      {
        id: user.ID,
        username: user.Username,
        role: isAdmin ? 'admin' : 'user',
        roleCode: isAdmin ? 'admin' : 'user',
        roles: userRoles
      },
      SECRET,
      { expiresIn: '2h' }
    );
    
    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        expiresIn: 7200, // 2小时，单位：秒
        user: {
          id: user.ID,
          username: user.Username,
          realName: user.RealName
        }
      }
    });
    
  } catch (error) {
    console.error('Token刷新失败:', error);
    res.status(500).json({
      success: false,
      message: 'Token刷新失败',
      error: error.message
    });
  }
});

// 导出路由
module.exports = router;