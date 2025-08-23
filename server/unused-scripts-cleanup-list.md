# 未使用测试脚本清理清单

## 分析结果总结

经过全面分析，以下脚本在项目中没有被调用或引用，可以考虑清理：

## 可以安全删除的测试脚本

### 权限测试相关脚本
1. `test-complete-permission-flow.js` - 完整权限流程测试
2. `test-frontend-permission-flow.js` - 前端权限流程测试
3. `test-non-admin-permission.js` - 非管理员权限测试
4. `test-permission-check-api.js` - 权限检查API测试
5. `test-permission-history.js` - 权限历史测试
6. `test-permission-real-time-effect.js` - 权限实时效果测试
7. `test-permission-simple.js` - 简单权限测试
8. `test-real-time-permission-effect.js` - 实时权限效果测试
9. `test-user-permission-api.js` - 用户权限API测试
10. `test-user-permission-management.js` - 用户权限管理测试
11. `test-wxq-permission-api.js` - wxq用户权限API测试

### 数据库检查脚本
12. `check-current-user-permissions.js` - 检查当前用户权限
13. `check-permission-menus.js` - 检查权限菜单
14. `check-quality-targets-table.js` - 检查质量目标表
15. `check-table-structure.js` - 检查表结构
16. `check-user-permission-history-table.js` - 检查用户权限历史表
17. `check-user-permissions-table.js` - 检查用户权限表
18. `check-user-permissions-view.js` - 检查用户权限视图
19. `check-user-table-name.js` - 检查用户表名
20. `check-wxq-permissions.js` - 检查wxq权限
21. `check-wxq-role-permissions.js` - 检查wxq角色权限

### 调试和分析脚本
22. `analyze-permission-issue.js` - 分析权限问题
23. `debug-checkuserpermission.js` - 调试用户权限检查
24. `debug-permission-difference.js` - 调试权限差异
25. `debug-permission-field-mismatch.js` - 调试权限字段不匹配
26. `debug-permission-issue.js` - 调试权限问题

### 修复和维护脚本
27. `fix-wxq-permissions.js` - 修复wxq权限
28. `fix-wxq-user-permissions.js` - 修复wxq用户权限
29. `clear-user-cache.js` - 清除用户缓存
30. `delete-publishing-permissions.js` - 删除发布权限
31. `query-publishing-permissions.js` - 查询发布权限

### 验证脚本
32. `verify-frontend-permission.js` - 验证前端权限

## 需要保留的脚本

### 在package.json中被引用的脚本
- 无（server目录下的package.json没有引用这些测试脚本）

### 在文档中被提及的脚本
- `check-db-schema.js` - 在数据库初始化指南中被提及（但该文件不存在）

### 其他重要脚本
- `test-db.js` - 数据库连接测试（基础功能）
- `insert_template_data.js` - 插入模板数据（数据初始化）

## 清理建议

1. **立即可删除**：所有test-*、check-*、debug-*、analyze-*、verify-*、fix-*、clear-*、query-*、delete-*开头的脚本
2. **保留**：`test-db.js`、`insert_template_data.js`等基础功能脚本
3. **备份**：在删除前建议备份到单独的文件夹

## 清理后的效果

- 减少项目文件数量约32个
- 简化项目结构
- 减少维护负担
- 提高项目可读性

---

*生成时间：2025-01-21*
*分析范围：e:\WebProject\DMS-QA\server目录*