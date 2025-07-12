/**
 * DMS-QA质量管理系统 - 临时SQLite版本
 * 当SQL Server不可用时的备用启动文件
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 使用SQLite数据库适配器
const db = require('./db-sqlite');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'dms-qa-secret-key-2024';

// 中间件配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供访问令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 登录接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查询用户
    const result = await db.executeQuery(async (pool) => {
      return await pool.request().query(
        'SELECT * FROM Users WHERE Username = ?',
        [username]
      );
    });

    if (!result || !result.recordset || result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = result.recordset[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.Password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: user.ID, 
        username: user.Username, 
        role: user.Role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.ID,
        username: user.Username,
        role: user.Role
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取站点配置
app.get('/api/config/site-config', async (req, res) => {
  try {
    const result = await db.executeQuery(async (pool) => {
      return await pool.request().query('SELECT * FROM SiteConfig LIMIT 1');
    });

    const config = result && result.recordset && result.recordset.length > 0 
      ? result.recordset[0] 
      : {
          SiteName: 'DMS质量管理系统',
          SiteDescription: '质量管理系统'
        };

    res.json({
      success: true,
      data: {
        siteName: config.SiteName,
        siteDescription: config.SiteDescription
      }
    });
  } catch (error) {
    console.error('获取站点配置失败:', error);
    res.json({
      success: true,
      data: {
        siteName: 'DMS质量管理系统',
        siteDescription: '质量管理系统'
      }
    });
  }
});

// 获取统计数据（模拟数据）
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      todayCount: 0,
      todayInnerCount: 0,
      todayOuterCount: 0,
      monthCount: 0,
      monthInnerCount: 0,
      monthOuterCount: 0,
      units: [],
      showTodayCount: true,
      showMonthCount: true
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 获取质量统计数据（模拟数据）
app.get('/api/quality-stats', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        passRate: '99.9',
        totalInspections: 100,
        failedInspections: 1,
        complaintRate: '0.2',
        totalDeliveries: 500,
        complaintBatches: 1
      }
    });
  } catch (error) {
    console.error('获取质量统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量统计失败'
    });
  }
});

// 获取投诉记录（模拟数据）
app.get('/api/complaints', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 10
    });
  } catch (error) {
    console.error('获取投诉记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取投诉记录失败'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 初始化数据库
db.initDatabase().then(() => {
  console.log('SQLite数据库初始化完成');

  // 启动服务器
  app.listen(PORT, () => {
    console.log('=== SQLite临时服务已启动 ===');
    console.log(`端口: ${PORT}`);
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`工作目录: ${__dirname}`);
    console.log('默认登录账号: admin / admin123');
    console.log('========================');
  });
}).catch(err => {
  console.error('SQLite数据库初始化失败:', err);
  process.exit(1);
});
