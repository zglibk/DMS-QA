# 菜单图标重复问题修复方案

## 问题概述
系统中存在大量菜单项使用相同图标的问题，导致用户界面缺乏可识别性，影响用户体验。

## 重复图标分析

### 1. Document 图标（8个菜单项使用）
- 供应商基础信息 → 建议改为 `InfoFilled`
- 出厂检验报告 → 建议改为 `DocumentChecked`
- 样版管理 → 建议改为 `Collection`
- 样品承认书 → 建议改为 `DocumentCopy`
- 质量管理 → 建议改为 `Medal`（已存在但重复）
- 质量报告 → 建议改为 `Notebook`
- 计划详情 → 建议改为 `View`
- 日志详情 → 建议改为 `Reading`

### 2. Tools 图标（4个菜单项使用）
- 仪器供应商 → 建议改为 `Platform`
- 返工管理 → 建议改为 `RefreshRight`
- 生产管理 → 建议改为 `Operation`
- 二次开发 → 保持 `Tools`（最符合语义）

### 3. List 图标（5个菜单项使用）
- 供应商列表 → 建议改为 `Shop`（已存在但重复）
- 投诉列表 → 建议改为 `ChatLineSquare`
- 材料列表 → 建议改为 `Box`（已存在）
- 权限列表 → 保持 `List`（已修复为List）
- 计划管理 → 建议改为 `Calendar`

### 4. Money 图标（4个菜单项使用）
- 材料价格 → 建议改为 `PriceTag`
- 物料单价 → 建议改为 `Coin`
- 质量成本损失 → 保持 `Money`（最符合语义）
- 质量成本统计 → 建议改为 `PieChart`（已存在）

### 5. User 图标（4个菜单项使用）
- 用户管理 → 建议改为 `UserFilled`
- 角色列表 → 建议改为 `Avatar`
- 内部投诉 → 建议改为 `ChatDotRound`
- 系统用户管理 → 建议改为 `Management`

### 6. UserFilled 图标（3个菜单项使用）
- 用户列表 → 保持 `UserFilled`（已修复）
- 角色管理 → 建议改为 `UserFilled`
- 系统角色管理 → 建议改为 `SetUp`

### 7. Setting 图标（3个菜单项使用）
- 设置 → 保持 `Setting`（最符合语义）
- 系统配置 → 建议改为 `Tools`
- 系统配置（重复） → 建议改为 `Operation`

### 8. DataAnalysis 图标（5个菜单项使用）
- 目标统计分析 → 建议改为 `TrendCharts`
- 质量指标 → 保持 `DataAnalysis`（最符合语义）
- 投诉分析 → 建议改为 `PieChart`
- 成本统计 → 建议改为 `Histogram`
- 统计分析 → 建议改为 `DataBoard`

### 9. Files 图标（3个菜单项使用）
- 供应商合同管理 → 建议改为 `Document`
- 审核报告管理 → 建议改为 `FolderOpened`
- 计划模板 → 保持 `Files`（最符合语义）

### 10. Warning 图标（3个菜单项使用）
- 供应商投诉管理 → 建议改为 `ChatLineSquare`
- 投诉管理 → 保持 `Warning`（最符合语义）
- 质量投诉管理 → 建议改为 `Bell`

## 新增图标需求
需要在前端添加以下新图标：
- `InfoFilled`
- `DocumentChecked`
- `Collection`
- `DocumentCopy`
- `Notebook`
- `Reading`
- `Platform`
- `RefreshRight`
- `PriceTag`
- `Coin`
- `ChatDotRound`
- `Management`
- `SetUp`
- `Histogram`
- `DataBoard`

## 实施步骤
1. 更新数据库脚本文件中的图标定义
2. 在前端DynamicMenu.vue中添加新图标的导入和映射
3. 更新breadcrumb.js中的图标配置
4. 验证修复效果

## 预期效果
- 每个菜单项都有独特且语义化的图标
- 提升用户界面的可识别性
- 改善用户体验和导航效率