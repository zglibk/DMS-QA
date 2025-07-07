<template>
  <div class="app-footer fixed-footer">
    {{ siteConfig?.footerCopyright || '© 2024 质量数据管理系统 版权所有 | 开发者: David Lee' }}
  </div>
</template>

<script setup>
import { useSiteConfig } from '../../composables/useSiteConfig'

const { siteConfig } = useSiteConfig()
</script>

<style scoped>
.app-footer {
  background: #fff;
  color: #888;
  text-align: center;
  padding: 1rem 0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
}

.fixed-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-footer {
    font-size: 0.8rem;
    padding: 0.75rem 0;
  }
}
</style>
