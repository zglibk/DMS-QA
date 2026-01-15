<template>
  <div class="frontend-layout">
    <div class="header-wrapper">
      <ReusableHeader />
    </div>
    
    <div class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <div class="footer-wrapper">
      <div class="copyright">
        © {{ currentYear }} 珠海腾佳印务有限公司 版权所有
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ReusableHeader from '@/components/common/ReusableHeader.vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.frontend-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  padding-bottom: 50px; /* Space for fixed footer */
}

.header-wrapper {
  height: 70px; /* 5rem to match ReusableHeader height */
  width: 100%;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 1600px; /* Increased from 1400px */
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}

.footer-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #fff;
  padding: 12px 0; /* Reduce padding slightly */
  border-top: 1px solid #ebeef5;
  z-index: 1000;
}

.copyright {
  text-align: center;
  color: #909399;
  font-size: 14px;
}

/* Transition effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>