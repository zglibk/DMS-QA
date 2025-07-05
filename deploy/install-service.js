const Service = require('node-windows').Service;
const path = require('path');

// 创建一个新的服务对象
const svc = new Service({
  name: 'DMS-QA-Backend',
  description: 'DMS-QA质量管理系统后端服务',
  script: path.join(__dirname, 'server', 'app.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT", 
      value: "3001"
    }
  ]
});

// 监听安装事件
svc.on('install', function() {
  console.log('✅ DMS-QA后端服务安装成功！');
  console.log('服务名称: DMS-QA-Backend');
  console.log('服务将在系统启动时自动运行');
  console.log('');
  console.log('管理命令:');
  console.log('启动服务: net start DMS-QA-Backend');
  console.log('停止服务: net stop DMS-QA-Backend');
  console.log('');
  console.log('正在启动服务...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  服务已经安装，请先卸载后重新安装');
  console.log('卸载命令: node uninstall-service.js');
});

svc.on('start', function() {
  console.log('🚀 DMS-QA后端服务已启动！');
  console.log('访问地址: http://192.168.1.57:3001/api');
});

svc.on('error', function(err) {
  console.error('❌ 服务安装失败:', err);
});

// 安装服务
console.log('正在安装DMS-QA后端服务...');
svc.install();
