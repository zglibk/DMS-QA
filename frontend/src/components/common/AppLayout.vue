<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <AppHeader />
    
    <!-- 主要内容区域 -->
    <div class="main-content scrollable-content">
      <slot />
    </div>
    
    <!-- 底部版权栏 -->
    <AppFooter />
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
</script>

<style scoped>
.app-layout {
  background: #f5f7fa;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-content {
  width: 100vw;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.scrollable-content {
  margin-top: 5rem; /* 为固定头部留出空间 */
  margin-bottom: 2.5rem; /* 调整底部边距，减少多余空间 */
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 2%; /* 减少左右padding，使用更小的百分比 */
  box-sizing: border-box;
  height: calc(100vh - 7.5rem); /* 精确计算可用高度 */
}

/* 内容区域样式 */
.scrollable-content > * {
  max-width: 96%; /* 增加最大宽度，减少两侧空白 */
  margin: 0 auto;
  padding: 20px;
}

/* 全局样式重置 */
:global(body, html, #app) {
  margin: 0;
  padding: 0;
  background: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 自定义滚动条样式 */
:global(::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:global(::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 4px;
}

:global(::-webkit-scrollbar-thumb) {
  background: #c1c1c1;
  border-radius: 4px;
}

:global(::-webkit-scrollbar-thumb:hover) {
  background: #a8a8a8;
}
</style>
