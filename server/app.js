const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const complaintRouter = require('./routes/complaint');
const authRouter = require('./routes/auth');
const configRouter = require('./routes/config');
const importRouter = require('./routes/import');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// 添加请求日志中间件
app.use((req, res, next) => {
  const logMessage = `${new Date().toLocaleString()} - ${req.method} ${req.url}`;
  console.log(logMessage);
  next();
});

// 测试端点
app.get('/api/test-connection', (req, res) => {
  const testMessage = `连接测试成功 - 服务器时间: ${new Date().toLocaleString()}`;
  console.log(testMessage);
  require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${testMessage}\n`);
  res.json({
    success: true,
    message: testMessage,
    serverPid: process.pid,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/complaint', complaintRouter);
app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);
app.use('/api/import', importRouter);

// 静态文件服务 - 提供拷贝的附件文件访问
app.use('/files/attachments', express.static(path.join(__dirname, 'uploads/attachments')));

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

app.listen(3001, '0.0.0.0',  () => {
  console.log('=== 后端服务已启动 ===');
  console.log('端口: 3001');
  console.log('时间:', new Date().toLocaleString());
  console.log('工作目录:', process.cwd());
  console.log('========================');
}).on('error', (error) => {
  console.error('服务器启动错误:', error);
});