<!--
  应用根组件

  功能说明：
  1. 作为整个应用的根容器
  2. 通过router-view渲染当前路由对应的组件
  3. 设置全局响应式字体大小

  设计理念：
  - 保持简洁，只负责路由渲染
  - 响应式设计，适配不同屏幕尺寸
-->
<template>
  <!-- 路由视图容器，渲染当前路由匹配的组件 -->
  <router-view />
</template>

<script setup>
/**
 * 根组件脚本
 *
 * 使用Vue 3组合式API的setup语法糖
 * 当前无需额外逻辑，保持简洁
 */
</script>

<style>
/**
 * 全局样式
 *
 * 响应式字体大小设计：
 * - 桌面端（>600px）：16px基础字体
 * - 移动端（≤600px）：14px基础字体
 *
 * 这样设置可以让整个应用的字体大小
 * 根据屏幕尺寸自动调整，提升用户体验
 */
html {
  font-size: 16px; /* 桌面端基础字体大小 */
}

/* 移动端适配 */
@media (max-width: 600px) {
  html {
    font-size: 14px; /* 移动端基础字体大小 */
  }
}

/**
 * 表格和表单英文字体设置
 * 为所有表格和表单元素设置英文字体族
 */

/* Element Plus 表格字体设置 */
.el-table,
.el-table th,
.el-table td,
.el-table-column,
.el-table__header,
.el-table__body,
.el-table__row,
.el-table__cell {
  font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif !important;
}

/* Element Plus 表单字体设置 */
.el-form,
.el-form-item,
.el-form-item__label,
.el-form-item__content,
.el-input,
.el-input__inner,
.el-textarea,
.el-textarea__inner,
.el-select,
.el-select-dropdown,
.el-option,
.el-date-picker,
.el-time-picker,
.el-cascader,
.el-radio,
.el-radio__label,
.el-checkbox,
.el-checkbox__label,
.el-switch,
.el-slider,
.el-rate,
.el-upload,
.el-dialog,
.el-dialog__header,
.el-dialog__body,
.el-dialog__footer {
  font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif !important;
}

/* 原生HTML表格和表单字体设置 */
table,
th,
td,
form,
input,
textarea,
select,
option,
label,
fieldset,
legend {
  font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif !important;
}

/* 确保所有对话框内容使用英文字体 */
.el-dialog .el-table,
.el-dialog .el-form,
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-textarea {
  font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif !important;
}
</style>