<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <ReusableHeader />
    
    <!-- 主要内容区域 -->
    <div class="main-content scrollable-content">
      <slot />
    </div>
    
    <!-- 底部版权栏 -->
    <AppFooter />
  </div>
</template>

<script setup>
import ReusableHeader from './ReusableHeader.vue'
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
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.scrollable-content {
  margin-top: 5rem; /* 为固定头部留出空间 */
  margin-bottom: 2.5rem; /* 调整底部边距，减少多余空间 */
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0; /* 移除左右padding，让滚动条贴到浏览器边缘 */
  box-sizing: border-box;
  height: calc(100vh - 7.5rem); /* 精确计算可用高度 */
}

/* 内容区域样式 */
.scrollable-content > * {
  /* max-width: 96%; 保持内容最大宽度 */
  margin: 0 auto;
  padding: 0; /* 移除内边距，让内容组件自己控制宽度 */
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
