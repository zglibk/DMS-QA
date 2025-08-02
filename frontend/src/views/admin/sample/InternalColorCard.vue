<template>
  <div class="internal-color-card">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>内部色卡</h2>
      <p>管理内部色卡信息，功能待开发</p>
    </div>

    <!-- 开发中提示 -->
    <el-card class="development-card" shadow="never">
      <div class="development-content">
        <el-icon class="development-icon"><Tools /></el-icon>
        <h3>功能开发中</h3>
        <p>内部色卡管理功能正在开发中，敬请期待...</p>
        <div class="planned-features">
          <h4>计划功能：</h4>
          <ul>
            <li>色卡信息管理</li>
            <li>色卡分类管理</li>
            <li>色卡图像上传</li>
            <li>色卡标准管理</li>
            <li>色卡使用记录</li>
            <li>色卡对比分析</li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Tools } from '@element-plus/icons-vue'
</script>

<style scoped>
.internal-color-card {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.development-card {
  text-align: center;
  padding: 40px 20px;
}

.development-content {
  max-width: 600px;
  margin: 0 auto;
}

.development-icon {
  font-size: 64px;
  color: #409EFF;
  margin-bottom: 20px;
}

.development-content h3 {
  color: #303133;
  font-size: 24px;
  margin-bottom: 16px;
}

.development-content > p {
  color: #606266;
  font-size: 16px;
  margin-bottom: 30px;
}

.planned-features {
  text-align: left;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.planned-features h4 {
  color: #303133;
  margin-bottom: 12px;
}

.planned-features ul {
  margin: 0;
  padding-left: 20px;
}

.planned-features li {
  color: #606266;
  margin-bottom: 8px;
}
</style>