<template>
  <!-- 前台访问时使用AppLayout布局 -->
  <AppLayout v-if="isFrontendAccess">
    <div class="version-updates-container frontend-layout">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">版本更新日志</h1>
            <p class="page-subtitle">系统版本历史和详细更新内容</p>
          </div>
        </div>
      </div>
      
      <!-- 版本更新内容 -->
      <VersionUpdatesContent />
    </div>
  </AppLayout>
  
  <!-- 后台访问时使用原有布局 -->
  <div v-else class="version-updates-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">版本更新管理</h1>
          <p class="page-subtitle">系统版本历史、统计信息和详细更新内容</p>
        </div>
      </div>
    </div>

    <!-- 版本更新内容组件 -->
    <VersionUpdatesContent />
  </div>
</template>

<script setup>
/**
 * 版本更新详情页面组件
 * 
 * 功能说明：
 * 1. 根据访问路径判断前台/后台布局
 * 2. 引入 VersionUpdatesContent 组件显示具体内容
 * 3. 支持前台用户和后台管理员不同的访问体验
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import AppLayout from '@/components/common/AppLayout.vue'
import VersionUpdatesContent from '@/components/VersionUpdatesContent.vue'

// Store
const userStore = useUserStore()

// 路由
const route = useRoute()

// 判断是否为前台访问
const isFrontendAccess = computed(() => {
  return !route.path.startsWith('/admin')
})
</script>

<style scoped>
.version-updates-container {
  padding: 0;
  min-height: calc(100vh - 120px);
  width: 100%;
  box-sizing: border-box;
}

/* 页面头部样式 */
.page-header {
  width: 80%;
  max-width: 1200px;
  margin: 24px auto 24px auto;
  padding: 0;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 前台页面头部内容左对齐 */
.version-updates-container.frontend-layout .page-header {
  margin: 24px 0 24px 10%;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 后台访问时的页面头部样式 - 100%宽度 */
.version-updates-container:not(.frontend-layout) .page-header {
  width: 100%;
  max-width: none;
  margin: 0 0 24px 0;
  padding: 0 20px;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 后台访问时的内容区域样式 - 100%宽度 */
.version-updates-container:not(.frontend-layout) :deep(.page-container) {
  width: 100%;
  margin: 0;
  padding: 0 20px;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 后台访问时的内容区域样式 - 100%宽度 */
.version-updates-container:not(.frontend-layout) {
  padding: 0;
}

.version-updates-container:not(.frontend-layout) .version-updates-content {
  width: 100%;
  max-width: none;
  padding: 0 20px;
  transition: none; /* 移除过渡动画避免闪烁 */
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #303133;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 8px 0 0 0;
}
</style>