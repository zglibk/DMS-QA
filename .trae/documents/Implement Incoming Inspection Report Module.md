# 实施计划：来料检验报告模块 (最终修订版 V5)

我将根据您的最新修正（分页默认5条/页）更新实施计划。

## 1. 数据库设计与设置
创建 SQL 脚本 (`server/scripts/create_incoming_inspection_tables.sql`)：

### 1.1 `InspectionItems` (检验项目配置表)
*   **字段**: `ID`, `ItemName`, `Description`, `SortOrder`, `Status`, `DataType` (Normal, Dimension, InitialAdhesion, HoldingPower, Force).
*   **初始数据**: 包含尺寸等特殊项目。

### 1.2 `IncomingInspectionReports` (检验报告主表)
*   **字段**: `ID`, `ReportNo`, `Supplier`, `ProductName`, `Specification`, `Quantity`, `ArrivalDate`, `SamplingQuantity`, `InspectionBasis`, `PONumber`, `Type`, `TestImages` (存储多张图片路径), `ReportResult`, `ReportRemark`, `Inspector`, `InspectionDate`, `Auditor`, `AuditDate`, `Status`.

### 1.3 `IncomingInspectionDetails` (检验报告明细表)
*   **字段**: `ID`, `ReportID`, `ItemID`, `ItemName`, `InspectionContent`, `SingleItemJudgment`, `ResultJudgment`, `ItemRemark`, `SampleValues` (JSON), `Unit`, `SubMethod`.

## 2. 菜单配置
创建脚本 (`server/scripts/add_incoming_inspection_menus.js`)：
*   **一级菜单**: 使用现有的 "检验报告"。
*   **二级菜单**: "来料检验报告", "性能实验报告", "检验项目管理"。

## 3. 后端开发
*   **API**: `inspectionItems.js`, `incomingInspection.js`.
*   **SQL 兼容性**: 兼容 SQL Server 2008 R2。
*   **图片上传**: 支持多图上传。

## 4. 前端开发 (Vue 3 + Element Plus)
### 4.1 UI 样式与权限
*   **分页**: 所有列表页面的分页器默认设置为 **5条/页** (`page-sizes="[5, 10, 20, 50]"`).
*   **表格样式**: 居中对齐，不换行。
*   **权限**: 按钮权限控制。

### 4.2 `IncomingInspection.vue`
*   **多图上传**: 支持预览和批量提交。
*   **尺寸计算**: 长宽平均值组合 / 直径平均值。
*   **其他逻辑**: 5组数据限制，自动计算，单位换算。

### 4.3 其他组件
*   `InspectionItems.vue`
*   `PerformanceTestReport.vue`

## 5. 执行步骤
1.  **数据库**: 建表。
2.  **菜单**: 添加菜单。
3.  **后端**: API 开发。
4.  **前端**: 组件开发 (默认5条/页)。
5.  **验证**: 测试分页默认值。
