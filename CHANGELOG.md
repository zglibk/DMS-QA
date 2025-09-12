# DMS-QA 更新日志

本文档记录了 DMS-QA 质量管理系统的版本更新历史。

## vv1.2.3 (2025-09-12)

### 📊 版本概述
本版本包含 50 个提交，主要改进如下：

- 15 个新增功能、16 个问题修复、3 个优化改进、2 个代码重构、2 个文档更新、12 个其他更改

### ✨ 新增功能

- 🎯 feat: Update frontend components - 2025-09-12 15:17:46 ([fc02ae5](../../commit/fc02ae56830dabba92878f8b897081e9fbe8c502))
- 🎯 feat: Update frontend components - 2025-09-09 18:20:27 ([9777aeb](../../commit/9777aeba499fa1038540d8cc66f1d620fffecb66))
- 🎯 feat: 添加版本号输入限制功能，限制只能输入数字和小圆点分隔符 ([7ec8f8f](../../commit/7ec8f8f41a8ea4cb7140c828fe3a54aac4ba9ebf))
- 🎯 添加版本更新管理功能和修复路由中间件引用问题 ([5e1a483](../../commit/5e1a483d561f47bc2acd24d55d0361d208378225))
- 🎯 feat: 完成用户权限系统集成 ([5519467](../../commit/5519467f4e08cf1f7cc922d2b7836b9bbbfe767c))
- 🎯 优化系统介绍模块：添加按钮切换功能、plain样式和经典颜色方案 ([ae91195](../../commit/ae91195516ea0b2c1e82d21d0f989e94f9220072))
- 🎯 feat: 完善系统日志功能模块和数据库初始化脚本 ([87e3740](../../commit/87e3740b3a6a57a56fbcff8368d90e8eb079404f))
- 🎯 feat: 完善系统日志管理功能和UI优化 ([8f6a4c5](../../commit/8f6a4c5dd249b53d3d69c7805c681ec31939baf5))
- 🎯 feat: Update frontend components - 2025-08-30 15:31:11 ([6146bce](../../commit/6146bce2ade740677f04ef5b1b6acb6a1380ea84))
- 🎯 feat: 将前台铃铛组件复用到后台管理界面 ([02faef8](../../commit/02faef88eff80624dc2cb12a08074b96cd8876ca))
- 🎯 feat: Update frontend components - 2025-08-26 19:30:47 ([8d01dfb](../../commit/8d01dfb3bdca2a1a47fd906851dcc06d18a534d2))
- 🎯 feat: 实现ERP配置页面权限控制功能 ([e0de146](../../commit/e0de146c7867f58bd5c04d38eb1a114c975da7b1))
- 🎯 feat: 完成ERP管理模块开发，包含配置管理、同步日志、生产数据、交付数据和质量指标功能 ([579faef](../../commit/579faef02ae77514e2dbed394eb860683651ff30))
- 🎯 feat: Update frontend components - 2025-08-26 14:23:06 ([63a35e8](../../commit/63a35e81d04283a0f384f343e2cd4ad6102bf830))
- 🎯 feat: 为禁用按钮添加自定义CSS样式，改善用户体验 ([43c4c95](../../commit/43c4c95cbd3ce2e68e2c30baa4a1779d4c0d0740))

### 🐛 问题修复

- 🔧 修复ComplaintAnalysisChart.vue中数据钻取函数的API调用问题\n\n- 将drillDownToTimeDetail和drillDownToWorkshopDetail函数中... ([01c91b8](../../commit/01c91b81006fd55709a1362e3d5efe4d27e4ee8b))
- 🔧 修复 NewWelcome.vue 中 API 数据访问问题和其他组件优化 ([4a9d33a](../../commit/4a9d33abafb4cc6e33acde43fba35bbb72453d3e))
- 🔧 修复编辑对话框高度计算和定位问题，解决背景浏览器滚动条及对话框滚动移动问题 ([ea9554a](../../commit/ea9554a8283a5dee5729131922c7d86ae57da69e))
- 🔧 修复时区偏差问题和ERP统计功能优化 ([777ad8c](../../commit/777ad8c56678e70d11a92c9d7d28fd58ca944eb3))
- 🔧 修复ERP同步日志功能：支持显示同步类型和记录数 ([8c85ba1](../../commit/8c85ba10f180c99c9f17ea4c9c3b982ce8266cf2))
- 🔧 修复Element Plus按钮组件type属性问题，更新图标配置和清理无用文件 ([ee9300d](../../commit/ee9300d0f5819c913c8d51efab68a80c23e84b18))
- 🔧 优化侧边栏折叠功能：修复菜单激活状态显示、添加Tooltip提示、解决LOGO居中问题 ([930d38b](../../commit/930d38bd927dce1814be8fd225fcccdd57089302))
- 🔧 修复快捷操作卡片路由跳转 - 更正通知公告和客户签样的目标页面路径 ([7506605](../../commit/75066055fd84afd31b457ce9556adbdfad055629))
- 🔧 修复后台主页布局问题并清理测试脚本 ([a231800](../../commit/a231800874769721545a909a49addf372216c003))
- 🔧 修复仪表盘统计数据显示问题和控制台警告\n\n- 修复后端 dashboard.js 中 executeQuery 函数调用方式\n- 修复前端 NewWelcome.vue 中缺少 List 图标导... ([006a65a](../../commit/006a65ab9d87492e2aee64789f2c42b02cef6233))
- 🔧 fix: 修复系统日志面包屑导航显示错误问题 ([8b0c0f7](../../commit/8b0c0f76ae7f2affc9a3ca9153ab211a106c0e4f))
- 🔧 修复通知编辑后铃铛未自动更新问题 ([56d497d](../../commit/56d497dac0748361f8a9d6aa3e4b7aed25ff25fd))
- 🔧 修复通知管理Content字段头尾部P标签问题\n\n- 在TinyMCE配置中添加P标签处理设置\n- 在后端添加cleanPTags函数清理头尾部P标签\n- 确保保存到数据库的内容不包含多余的P... ([3e51a84](../../commit/3e51a846fe973b6613108cf93c939bfb89f92935))
- 🔧 修复UserDropdown组件焦点样式问题和移除调试输出代码 ([2e84da2](../../commit/2e84da2b9c1f98224dfc66cec281f3340a16d9f6))
- 🔧 修复出版异常页面布局问题：调整内容区宽度自适应，解决右侧sidebar被隐藏的问题 ([323d6b9](../../commit/323d6b9152ddf272a1d47349b7435f4612a3a25c))
- 🔧 修复通知管理功能：移除标题徽标、修复表单验证、优化编辑器样式 ([b0b569a](../../commit/b0b569a7a09a8ab68bcb4fe62b789773e8a8bb64))

### ⚡ 优化改进

- 📈 优化版本更新页面样式：添加内边距和调整Markdown编辑器高度 ([eb006d0](../../commit/eb006d0c9a779da858b43212e9e9d28bb3c7475c))
- 📈 优化消息通知管理权限控制和界面显示\n\n- 修复NoticeManagement.vue中按钮权限控制逻辑，将隐藏改为禁用显示\n- 添加ImagePath字段到init.sql的Notices表定... ([e79939e](../../commit/e79939e433ca4cae3c1a805d0e164e8ab5b22e72))
- 📈 优化用户名显示逻辑：优先显示姓名，统一用户显示名称处理 ([6920e03](../../commit/6920e0377b346277fa9faef713df56db2fc5d98f))

### ♻️ 代码重构

- 🔄 refactor: 删除临时测试脚本文件 ([e5ad123](../../commit/e5ad123595dc28f414ab272e5c46dc0a41479bd8))
- 🔄 调整系统日志分析页面样式：优化标题栏Label宽度、下拉选项宽度和筛选条件选择器最小宽度 ([95b5d3e](../../commit/95b5d3ebb2120e96df6cab4db5ccba96cd5e9e9a))

### 📚 文档更新

- 📝 docs: 完善README.md权限验证系统文档 ([90e74d9](../../commit/90e74d9c2102fa5780dd9d4ed5c42c8ddbfdb63f))
- 📝 docs: 更新README.md文档，同步项目结构和v2.2.2版本功能 ([b52d6bb](../../commit/b52d6bb4f0eecdb91a3347b7fb59dfbe8156b7dc))

### 📦 其他更改

- 📋 清理SystemLogs组件调试输出语句 ([ab45068](../../commit/ab45068b93c4d7ab953406a87d26955825da736f))
- 📋 scripts: Update automation scripts - 2025-09-10 19:04:24 ([e8557b6](../../commit/e8557b6c0b4df22dff212b3f0e641914f5913a67))
- 📋 清理app.js中的非必须调试输出语句 ([3f3bceb](../../commit/3f3bcebc21501d0c478590d0231b43d4a5c63e8d))
- 📋 完成ERP数据同步功能开发，包括前端界面、后端API和数据处理逻辑 ([823b460](../../commit/823b4602a1ede20c1e4d26a9be8740cdf49ad695))
- 📋 清理调试输出代码并优化用户管理功能 ([96891f7](../../commit/96891f7731ecbea3180359baf9d65a403ff559ac))
- 📋 移除页面顶级容器内边距和背景色样式 - 修复NewWelcome、Dashboard、Welcome、MaterialPriceList、PathAnalysis、SupplierComplaints... ([9002c43](../../commit/9002c435d2502e2c27c76a46cdcfe446df345559))
- 📋 清理调试输出和测试脚本，完善消息通知图片功能 ([b653595](../../commit/b6535957535af13365c1c535bbcd9d66576ef209))
- 📋 更新init.sql：添加通知公告管理表结构、扩展字段和权限配置 ([bbbad3f](../../commit/bbbad3f5958db00c7ee3d6e3b2edf5a39e2e2860))
- 📋 移除为解决用户ID丢失问题而创建的测试脚本文件 ([42ac8c9](../../commit/42ac8c91307ce6d24fcd722b1bebd3f2724b72d3))
- 📋 scripts: Update automation scripts - 2025-08-30 10:31:58 ([d1e6ec4](../../commit/d1e6ec46eed02d4128f60895512f879cff8cc2f8))
- 📋 移除通知列表标题列右上角徽标 ([804b4a6](../../commit/804b4a687edb0c3f7bc9891be67fe5ff35c01bba))
- 📋 更新ERP菜单名称：将'ERP管理'改为'ERP对接' ([b58eac9](../../commit/b58eac934d6db9b1fe4424c036895a848f33f6b0))

### 👥 贡献者

感谢以下贡献者的努力：lbk168

---

