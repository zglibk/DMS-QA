<template>
  <div class="admin-data-visualization">
    <DataVisualizationBoard />
  </div>
</template>

<script setup>
import DataVisualizationBoard from '@/components/DataVisualizationBoard.vue'
</script>

<style scoped>
.admin-data-visualization {
  width: 100%;
  height: calc(100vh - 60px); /* 扣除 admin 顶栏的高度 */
  overflow: hidden;
  margin: 0;
  padding: 0;
}

/* 在后台框架内重置 padding */
:global(.admin-main) {
  padding: 0 !important;
}
</style>
