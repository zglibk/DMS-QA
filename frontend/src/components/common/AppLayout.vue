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
  margin-top: calc(var(--header-height) + var(--header-gap)); /* 为固定头部留出空间并增加额外间距 */
  margin-bottom: var(--footer-gap); /* 调整底部边距，减少多余空间 */
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0; /* 移除左右padding，让滚动条贴到浏览器边缘 */
  box-sizing: border-box;
  height: calc(100vh - (var(--header-height) + var(--header-gap)) - var(--footer-gap)); /* 精确计算可用高度（扣除头部与额外间距、底部预留） */
}

/* 内容区域样式 */
.scrollable-content > * {
  /* 统一子页面自适应宽度，避免居中收缩（侧边栏+内容区缩到中间的问题） */
  width: 100%;
  margin: 0;
  padding: 0; /* 让内容组件自己控制内部宽度 */
  box-sizing: border-box;
  overflow: visible; /* 显式取消子容器的滚动，统一由外层滚动 */
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
:global(:root) {
  --header-height: 5rem; /* 顶部导航栏固定高度 */
  --header-gap: 0.75rem; /* 导航栏与下方内容之间的额外间距 */
  --footer-gap: 2.5rem; /* 底部预留间距（与固定版权栏匹配） */
}
</style>
