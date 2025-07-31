<template>
  <div class="content-wrapper">
    <!-- 内容区域容器 -->
    <div class="content-container">
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * 内容包装容器组件
 * 
 * 功能说明：
 * 1. 为主要内容区域提供统一的布局容器
 * 2. 优化内容区域的间距和布局
 * 3. 提供响应式设计支持
 * 4. 统一内容区域的样式规范
 */
</script>

<style scoped>
.content-wrapper {
  width: 100%;
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0;
  margin: 0;
}

.content-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 12px;
  min-height: calc(100vh - 7rem);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  margin-top: 20px;
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-container {
    max-width: 98%;
    padding: 20px 16px;
    margin-top: 15px;
    margin-bottom: 15px;
  }
}

@media (max-width: 768px) {
  .content-container {
    max-width: 100%;
    padding: 16px 8px;
    margin-top: 10px;
    margin-bottom: 10px;
    border-radius: 8px;
  }
}

@media (max-width: 480px) {
  .content-container {
    max-width: 100%;
    padding: 12px 6px;
    margin-top: 5px;
    margin-bottom: 5px;
    border-radius: 6px;
  }
}

/* 内容区域内部元素的优化 */
:deep(.stat-row-flex) {
  margin-bottom: 24px;
}

:deep(.middle-row) {
  margin-top: 24px;
}

:deep(.el-card) {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

:deep(.el-card__header) {
  background: #f8f9fa;
  color: #374151;
  border-radius: 8px 8px 0 0;
  padding: 16px 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}

/* 统计卡片优化 */
:deep(.stat-card) {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.stat-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

/* 表格卡片优化 */
:deep(.table-card) {
  margin-bottom: 24px;
}

:deep(.enhanced-table) {
  border-radius: 8px;
  overflow: hidden;
}

/* 查询卡片优化 */
:deep(.query-card) {
  position: relative;
  max-height: none;
  overflow-y: visible;
}

/* 图表容器优化 */
:deep(.chart-container) {
  /* margin-top: 24px; 已取消 */
}

/* 按钮组优化 */
:deep(.table-actions) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

:deep(.add-complaint-btn),
:deep(.export-btn) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.add-complaint-btn:hover),
:deep(.export-btn:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 分页器优化 */
:deep(.table-footer) {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

:deep(.el-pagination) {
  justify-content: center;
}

/* 加载状态优化 */
:deep(.loading-card) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px dashed #dee2e6;
}

/* 搜索控制区优化 */
:deep(.stats-control) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

:deep(.stats-control-left),
:deep(.stats-control-right) {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 轮播图优化 */
:deep(.stats-carousel) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* 表格头部优化 */
:deep(.table-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

:deep(.table-title) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.stat-card),
:deep(.el-card) {
  animation: fadeInUp 0.6s ease-out;
}

/* 滚动条优化 */
.content-container::-webkit-scrollbar {
  width: 6px;
}

.content-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.content-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.content-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>