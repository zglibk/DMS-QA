<template>
  <div class="app-header fixed-header">
    <!-- 左侧logo及系统名 -->
    <div class="header-left">
      <img v-if="siteConfig?.logoBase64Img" :src="siteConfig.logoBase64Img" alt="logo" class="logo" @error="handleLogoError" />
      <span class="logo-text">{{ siteConfig?.siteName || '质量数据管理系统' }}</span>
    </div>
    <!-- 中间菜单栏 -->
    <div class="header-center">
      <div class="nav-menu-wrap">
        <el-menu mode="horizontal" @select="handleMenuSelect" class="nav-menu" :ellipsis="false" :default-active="activeMenu">
          <el-menu-item index="home">首页</el-menu-item>
          <el-menu-item index="stats">数据可视化</el-menu-item>
          <el-menu-item index="rework">返工分析</el-menu-item>
          <el-menu-item index="publishing-exceptions">出版异常</el-menu-item>
        </el-menu>
      </div>
    </div>
    <!-- 右侧用户区 -->
    <div class="header-right">  
      <!-- 通知铃铛组件 -->
      <AdminNotificationBell 
        v-if="userStore.token" 
        class="notification-component"
      />
      <!-- 用户下拉菜单组件 -->
      <UserDropdown 
        :avatar-size="32"
        :show-username="true"
        :show-user-info="false"
        :show-fullscreen-toggle="false"
        avatar-click-action="profile"
        username-click-action="profile"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown, User } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../../store/user'
import { storeToRefs } from 'pinia'
import { useSiteConfig } from '../../composables/useSiteConfig'
import AdminNotificationBell from './AdminNotificationBell.vue'
import UserDropdown from './UserDropdown.vue'

// 路由和用户状态
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const { siteConfig } = useSiteConfig()

/**
 * 根据当前路由计算激活的菜单项
 */
const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '/home') {
    return 'home'
  } else if (path === '/data-visualization') {
    return 'stats'
  } else if (path === '/rework-analysis') {
    return 'rework'
  } else if (path === '/publishing-exceptions') {
    return 'publishing-exceptions'
  }
  return ''
})

// 导航相关方法
const handleMenuSelect = (index) => {
  if (index === 'home') {
    router.push('/')
  } else if (index === 'stats') {
    router.push('/data-visualization')
  } else if (index === 'rework') {
    router.push('/rework-analysis')
  } else if (index === 'publishing-exceptions') {
    router.push('/publishing-exceptions')
  }
}

/**
 * 跳转到个人中心页面
 * 在后台管理页面中正常跳转，在其他页面中新标签页打开
 */
const goProfile = () => {
  // 检查当前是否在后台管理页面
  const isInAdminPage = route.path.startsWith('/admin')
  
  if (isInAdminPage) {
    // 在后台管理页面中，正常跳转
    router.push('/admin/profile')
  } else {
    // 在其他页面中，新标签页打开
    const profileUrl = router.resolve('/profile').href
    window.open(profileUrl, '_blank')
  }
}

// logout方法和goAdmin方法已迁移到UserDropdown组件

const handleLogoError = (event) => {
  event.target.style.display = 'none' // 隐藏加载失败的图片
}


</script>

<style scoped>
.app-header {
  background: #FFF; /*背景填充色 */
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 5rem;
  padding: 0 2.5rem;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  height: 2.25rem;
  margin-right: 0.625rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #b0b4ba;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

.nav-menu-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-menu {
  background: transparent;
  border-bottom: none;
  display: inline-block;
  min-width: 0;
  flex-shrink: 0;
}

.nav-menu :deep(.el-menu-item) {
  background: transparent !important;
  position: relative;
  padding: 0 24px !important;
  margin: 0 8px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
}

/* 悬停背景效果 - 已禁用 */

/* 底部指示线 */
.nav-menu :deep(.el-menu-item)::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  border-radius: 2px 2px 0 0;
  transform: translateX(-50%);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 悬停背景效果已禁用 */

.nav-menu :deep(.el-menu-item:hover)::after,
.nav-menu :deep(.el-menu-item.is-active)::after {
  width: 80%;
}

.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
  background: transparent !important;
  color: #409EFF !important;
  box-shadow: none !important;
  border-bottom: none !important;
  transform: translateY(-1px);
}

/* 激活状态背景效果已禁用 */

.nav-menu :deep(.el-menu-item.is-active) {
  font-weight: 600;
  color: #409EFF !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.admin-btn {
  margin-right: 0.625rem;
}

.notification-component {
  margin-right: 0.5rem;
}

/* 前台通知铃铛样式调整 */
.notification-component :deep(.notification-bell) {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.notification-component :deep(.notification-bell:hover) {
  background: rgba(64, 158, 255, 0.15);
  color: #409EFF;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* AdminNotificationBell 组件样式适配 */
.notification-component :deep(.admin-notification-bell) {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.notification-component :deep(.admin-notification-bell:hover) {
  background: rgba(64, 158, 255, 0.15);
  color: #409EFF;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 用户相关样式已迁移到UserDropdown组件 */

/* 响应式设计 */
@media (max-width: 768px) {
  .logo-text {
    display: none;
  }
  
  .nav-menu :deep(.el-menu-item) {
    padding: 0 16px !important;
    margin: 0 4px;
    font-size: 15px;
  }
  
  .header-right {
    gap: 0.375rem;
  }
  
  /* 用户名响应式隐藏已迁移到UserDropdown组件 */
}
</style>