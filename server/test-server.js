const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.listen(3001, '0.0.0.0', () => {
  console.log('测试服务器已启动，端口3001');
  console.log(`服务器时间: ${new Date().toLocaleString()}`);
});
