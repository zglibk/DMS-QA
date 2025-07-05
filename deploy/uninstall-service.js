const Service = require('node-windows').Service;
const path = require('path');

// 创建服务对象（必须与安装时的配置一致）
const svc = new Service({
  name: 'DMS-QA-Backend',
  script: path.join(__dirname, 'server', 'app.js')
});

// 监听卸载事件
svc.on('uninstall', function() {
  console.log('✅ DMS-QA后端服务卸载成功！');
  console.log('服务已从系统中移除');
});

svc.on('stop', function() {
  console.log('🛑 DMS-QA后端服务已停止');
});

svc.on('error', function(err) {
  console.error('❌ 服务卸载失败:', err);
});

// 卸载服务
console.log('正在卸载DMS-QA后端服务...');
svc.uninstall();
