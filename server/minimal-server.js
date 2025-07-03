const express = require('express');
const cors = require('cors');

console.log('开始启动服务器...');

const app = express();

// 添加错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

app.use(cors());
app.use(express.json());

// 测试端点
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: '最小服务器正常运行' });
});

// 临时的site-config路由
app.get('/api/config/site-config', (req, res) => {
  const defaultConfig = {
    siteName: '质量数据管理系统',
    companyName: 'DMS质量管理系统',
    logoBase64Img: '/logo.png',
    faviconBase64Img: '/logo.png',
    headerTitle: '质量数据系统',
    loginTitle: 'DMS-QA 质量管理系统',
    footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
  };
  res.json({
    success: true,
    data: defaultConfig,
    message: '获取网站配置成功（临时默认配置）'
  });
});

// 简单的登录路由
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // 简单的用户验证
  if (username === 'admin' && password === '123456') {
    res.json({
      success: true,
      message: '登录成功',
      token: 'temporary-token-' + Date.now(),
      user: {
        Username: 'admin',
        RealName: '管理员',
        Role: 'admin',
        Department: '系统管理',
        Email: 'admin@example.com'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    });
  }
});

// 简单的用户信息路由
app.get('/api/auth/profile', (req, res) => {
  const token = req.headers.authorization;
  if (token && token.startsWith('Bearer ')) {
    res.json({
      success: true,
      data: {
        Username: 'admin',
        RealName: '管理员',
        Role: 'admin',
        Department: '系统管理',
        Email: 'admin@example.com'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '未提供token，拒绝访问'
    });
  }
});

// 添加简单的complaint路由
app.get('/api/complaint/month-stats', (req, res) => {
  res.json({
    success: true,
    showTodayCount: true,
    showMonthCount: true,
    todayCount: 0,
    monthCount: 0,
    units: [],
    config: {
      displayUnits: []
    }
  });
});

app.get('/api/complaint/workshop-options', (req, res) => {
  res.json({
    success: true,
    data: ['数码印刷', '轮转机', '印刷车间', '裁切车间']
  });
});

app.get('/api/complaint/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    total: 0,
    page: 1,
    pageSize: 10
  });
});

app.listen(3002, '0.0.0.0', () => {
  console.log('=== 最小服务器已启动 ===');
  console.log('端口: 3002');
  console.log('时间:', new Date().toLocaleString());
  console.log('========================');
}).on('error', (error) => {
  console.error('服务器启动错误:', error);
});
