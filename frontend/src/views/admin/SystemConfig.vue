<template>
  <div class="system-config">
    <div class="page-header">
      <h2>系统配置</h2>
      <p>管理数据库连接、文件存储和路径映射等系统配置</p>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- 连接配置标签页 -->
      <el-tab-pane label="连接配置" name="connection">
        <div class="tab-content">
          <ConnectionConfig />
        </div>
      </el-tab-pane>

      <!-- 文件存储配置标签页 -->
      <el-tab-pane label="文件存储配置" name="storage">
        <div class="tab-content">
          <StorageConfig />
        </div>
      </el-tab-pane>

      <!-- 路径映射配置标签页 -->
      <el-tab-pane label="路径映射配置" name="mapping">
        <div class="tab-content">
          <PathMappingConfig />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ConnectionConfig from '@/components/admin/ConnectionConfig.vue'
import StorageConfig from '@/components/admin/StorageConfig.vue'
import PathMappingConfig from '@/components/admin/PathMappingConfig.vue'

const activeTab = ref('connection')
</script>

<style scoped>
.system-config {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.page-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
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

.config-tabs {
  min-height: 500px;
}

.tab-content {
  padding: 20px 0;
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: #e4e7ed;
}
</style>
