<template>
  <div class="app-header fixed-header">
    <!-- 左侧logo及系统名 -->
    <div class="header-left">
      <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="logo" class="logo" @error="handleLogoError" />
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
      <el-button type="primary" text class="admin-btn" @click="goAdmin">登录后台</el-button>
      <el-avatar :size="32" :src="user.Avatar" class="avatar-icon" @click="goProfile">
        <template v-if="!user.Avatar">
          <el-icon><User /></el-icon>
        </template>
      </el-avatar>
      <span class="username" @click="goProfile">{{ user?.Username || '用户' }}</span>
      <el-dropdown>
        <span class="el-dropdown-link">
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="goProfile">个人中心</el-dropdown-item>
            <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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

const logout = () => {
  userStore.clearUser()
  router.push('/login')
}

/**
 * 进入后台管理页面
 * 基于菜单权限系统进行权限验证
 */
const goAdmin = async () => {
  // 检查用户是否已登录
  if (!userStore.token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }

  // 检查是否已有用户信息，如果没有则获取
  if (!userStore.user || !userStore.user.id) {
    try {
      await userStore.fetchProfile()
    } catch (error) {
      ElMessage.error('获取用户信息失败，请重新登录')
      return
    }
  }

  // 基于菜单权限系统进行权限验证
  // 使用正则表达式检查用户是否有任何 /admin 路由下的权限
  const hasAnyAdminRoutePermission = userStore.hasAnyAdminPermission
  
  // 检查用户是否有后台管理相关的操作权限
  const hasAdminActionPermission = userStore.hasActionPermission('admin:dashboard:view') ||
                                   userStore.hasActionPermission('admin:access')
  
  // 如果用户有任何 /admin 路由权限或操作权限，则允许进入后台
  if (hasAnyAdminRoutePermission || hasAdminActionPermission) {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('您没有后台访问权限，请联系管理员')
  }
}

const handleLogoError = (event) => {
  event.target.src = '/logo.png'
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

.avatar-icon {
  background: #e6f0ff;
  color: #1677ff;
  cursor: pointer;
}

.username {
  font-size: 15px;
  color: #333;
  margin-left: 4px;
  cursor: pointer;
}

.el-dropdown-link {
  cursor: pointer;
  color: #606266;
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.el-dropdown-link:hover {
  background-color: #f5f7fa;
  color: #409EFF;
  transform: translateY(-1px);
}

/* 下拉菜单美化样式 */
:deep(.el-dropdown-menu) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 8px;
  min-width: 200px;
  background: #ffffff;
  backdrop-filter: blur(10px);
  animation: dropdownFadeIn 0.3s ease-out;
}

:deep(.el-dropdown-menu__item) {
  border-radius: 8px;
  margin: 2px 0;
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

:deep(.el-dropdown-menu__item:hover) {
  background: #f5f7fa;
  color: #409EFF;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

:deep(.el-dropdown-menu__item.is-divided) {
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
  padding-top: 16px;
}

:deep(.el-dropdown-menu__item.is-divided::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e4e7ed, transparent);
}

/* 下拉菜单动画 */
@keyframes dropdownFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 下拉箭头美化 */
:deep(.el-popper__arrow) {
  display: none;
}

/* 为下拉菜单添加毛玻璃效果 */
:deep(.el-popper) {
  backdrop-filter: blur(10px);
}

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
  
  .username {
    display: none;
  }
}
</style>
