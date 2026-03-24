<template>
  <div class="frontend-fullscreen-wrap">
    <DataVisualizationBoard />
  </div>
</template>

<script setup>
import DataVisualizationBoard from '@/components/DataVisualizationBoard.vue'
</script>

<style scoped>
.frontend-fullscreen-wrap {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 覆盖可能被父级继承的任何边距 */
:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
