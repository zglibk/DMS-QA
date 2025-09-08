# DMS-QA 更新日志

本文档记录了 DMS-QA 质量管理系统的版本更新历史。

## v2.3.0-example (2025-09-08)

### 📊 版本概述
本版本包含 22 个提交，主要改进如下：

- 4 个新功能、6 个问题修复、3 个优化改进

### ✨ 新增功能

- 🎯 feat: 完成用户权限系统集成 ([5519467](../../commit/5519467f4e08cf1f7cc922d2b7836b9bbbfe767c))
- 🎯 feat: 完善系统日志功能模块和数据库初始化脚本 ([87e3740](../../commit/87e3740b3a6a57a56fbcff8368d90e8eb079404f))
- 🎯 feat: 完善系统日志管理功能和UI优化 ([8f6a4c5](../../commit/8f6a4c5dd249b53d3d69c7805c681ec31939baf5))
- 🎯 feat: Update frontend components - 2025-08-30 15:31:11 ([6146bce](../../commit/6146bce2ade740677f04ef5b1b6acb6a1380ea84))

### 🐛 问题修复

- 🔧 修复ERP同步日志功能：支持显示同步类型和记录数 ([8c85ba1](../../commit/8c85ba10f180c99c9f17ea4c9c3b982ce8266cf2))
- 🔧 修复Element Plus按钮组件type属性问题，更新图标配置和清理无用文件 ([ee9300d](../../commit/ee9300d0f5819c913c8d51efab68a80c23e84b18))
- 🔧 修复快捷操作卡片路由跳转 - 更正通知公告和客户签样的目标页面路径 ([7506605](../../commit/75066055fd84afd31b457ce9556adbdfad055629))
- 🔧 修复后台主页布局问题并清理测试脚本 ([a231800](../../commit/a231800874769721545a909a49addf372216c003))
- 🔧 修复仪表盘统计数据显示问题和控制台警告\n\n- 修复后端 dashboard.js 中 executeQuery 函数调用方式\n- 修复前端 NewWelcome.vue 中缺少 List 图标导入\n- 仪表盘统计数据现在正确显示待处理任务和质量预警数量\n- 解决控制台 Vue 组件解析警告 ([006a65a](../../commit/006a65ab9d87492e2aee64789f2c42b02cef6233))
- 🔧 fix: 修复系统日志面包屑导航显示错误问题 ([8b0c0f7](../../commit/8b0c0f76ae7f2affc9a3ca9153ab211a106c0e4f))

### ⚡ 优化改进

- 📈 优化侧边栏折叠功能：修复菜单激活状态显示、添加Tooltip提示、解决LOGO居中问题 ([930d38b](../../commit/930d38bd927dce1814be8fd225fcccdd57089302))
- 📈 优化系统介绍模块：添加按钮切换功能、plain样式和经典颜色方案 ([ae91195](../../commit/ae91195516ea0b2c1e82d21d0f989e94f9220072))
- 📈 优化消息通知管理权限控制和界面显示\n\n- 修复NoticeManagement.vue中按钮权限控制逻辑，将隐藏改为禁用显示\n- 添加ImagePath字段到init.sql的Notices表定义\n- 映射消息通知管理面包屑导航的中文名称\n- 优化UserPermissions.vue权限显示\n- 更新menus.js路由配置 ([e79939e](../../commit/e79939e433ca4cae3c1a805d0e164e8ab5b22e72))

### ♻️ 代码重构

- 🔄 refactor: 删除临时测试脚本文件 ([e5ad123](../../commit/e5ad123595dc28f414ab272e5c46dc0a41479bd8))
- 🔄 调整系统日志分析页面样式：优化标题栏Label宽度、下拉选项宽度和筛选条件选择器最小宽度 ([95b5d3e](../../commit/95b5d3ebb2120e96df6cab4db5ccba96cd5e9e9a))

### 📚 文档更新

- 📝 docs: 完善README.md权限验证系统文档 ([90e74d9](../../commit/90e74d9c2102fa5780dd9d4ed5c42c8ddbfdb63f))

### 📦 其他更改

- 📋 清理app.js中的非必须调试输出语句 ([3f3bceb](../../commit/3f3bcebc21501d0c478590d0231b43d4a5c63e8d))
- 📋 完成ERP数据同步功能开发，包括前端界面、后端API和数据处理逻辑 ([823b460](../../commit/823b4602a1ede20c1e4d26a9be8740cdf49ad695))
- 📋 清理调试输出代码并优化用户管理功能 ([96891f7](../../commit/96891f7731ecbea3180359baf9d65a403ff559ac))
- 📋 移除页面顶级容器内边距和背景色样式 - 修复NewWelcome、Dashboard、Welcome、MaterialPriceList、PathAnalysis、SupplierComplaints、PublishingExceptions、CostStatistics页面的布局样式 ([9002c43](../../commit/9002c435d2502e2c27c76a46cdcfe446df345559))
- 📋 undefined ([[0x7FFC](../../commit/[0x7FFCF200E0A4] ANOMALY: use of REX.w is meaningless (default operand size is 64)))
- 📋 undefined ([[0x7FFC](../../commit/[0x7FFCF200E0A4] ANOMALY: use of REX.w is meaningless (default operand size is 64)))

### 👥 贡献者

感谢以下贡献者的努力：lbk168、

---

