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
        <el-menu mode="horizontal" :default-active="activeMenu" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
          <el-menu-item index="home">首页</el-menu-item>
          <el-menu-item index="complaint">投诉管理</el-menu-item>
          <el-menu-item index="stats">数据可视化</el-menu-item>
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
      <span class="username" @click="goProfile">{{ user.Username }}</span>
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

// 根据当前路由计算活跃菜单
const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '/home') return 'home'
  if (path === '/add' || path.includes('/complaint')) return 'complaint'
  if (path === '/data-visualization' || path.includes('/stats')) return 'stats'
  return 'home'
})

// 导航相关方法
const handleMenuSelect = (index) => {
  if (index === 'home') {
    router.push('/')
  } else if (index === 'complaint') {
    router.push('/add')
  } else if (index === 'stats') {
    router.push('/data-visualization')
  }
}

const goProfile = () => {
  router.push('/profile')
}

const logout = () => {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

const goAdmin = () => {
  if (user.value.Role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('无后台权限')
  }
}

const handleLogoError = (event) => {
  event.target.src = '/logo.png'
}
</script>

<style scoped>
.app-header {
  background: #fff;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 4rem;
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
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logo-text {
    display: none;
  }
  
  .nav-menu :deep(.el-menu-item) {
    padding: 0 16px !important;
    margin: 0 4px;
  }
  
  .header-right {
    gap: 0.375rem;
  }
  
  .username {
    display: none;
  }
}
</style>
