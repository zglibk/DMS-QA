<template>
  <div class="system-config">
    <div class="page-header">
      <h2>系统配置</h2>
      <p>管理数据库连接、文件存储、路径映射、网站配置和主页卡片等系统配置</p>
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

      <!-- 网站LOGO配置标签页 -->
      <el-tab-pane label="网站LOGO配置" name="site">
        <div class="tab-content">
          <SiteConfig />
        </div>
      </el-tab-pane>

      <!-- 主页卡片配置标签页 -->
      <el-tab-pane label="主页卡片配置" name="homecard">
        <div class="tab-content">
          <HomeCardConfig />
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
import SiteConfig from '@/components/admin/SiteConfig.vue'
import HomeCardConfig from '@/components/admin/HomeCardConfig.vue'

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

@media (max-width: 768px) {
  .system-config {
    padding: 12px;
    border-radius: 6px;
  }

  .page-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .page-header h2 {
    font-size: 20px;
    margin-bottom: 6px;
  }

  .page-header p {
    font-size: 13px;
    line-height: 1.6;
  }

  .config-tabs {
    min-height: auto;
  }

  .tab-content {
    padding: 12px 0;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }

  :deep(.el-tabs__nav-wrap) {
    overflow-x: auto;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 12px;
  }
}

@media (max-width: 390px) {
  .system-config {
    padding: 8px;
  }

  :deep(.el-tabs__item) {
    padding: 0 10px;
    font-size: 13px;
  }

  :deep(.el-dialog) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    margin: 12px auto !important;
    max-height: calc(100vh - 24px) !important;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__body) {
    overflow-y: auto;
  }
}

@media (max-width: 375px) {
  .page-header h2 {
    font-size: 18px;
  }
}
</style>
