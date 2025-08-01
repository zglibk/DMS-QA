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
        <el-menu mode="horizontal" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
          <el-menu-item index="home">首页</el-menu-item>
          <el-menu-item index="stats">数据可视化</el-menu-item>
          <el-menu-item index="rework">返工分析</el-menu-item>
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

// 移除了 activeMenu 计算属性以避免与 el-menu 的循环依赖

// 导航相关方法
const handleMenuSelect = (index) => {
  if (index === 'home') {
    router.push('/')
  } else if (index === 'stats') {
    router.push('/data-visualization')
  } else if (index === 'rework') {
    router.push('/rework-analysis')
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
 * 检查用户登录状态和权限，避免不必要的API调用导致token失效
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
      console.error('获取用户信息失败:', error)
      ElMessage.error('获取用户信息失败，请重新登录')
      return
    }
  }

  // 使用现有的用户信息进行权限检查，避免重复API调用
  const currentUser = userStore.user
  
  // 检查用户是否为管理员或具有管理权限
  // 注意：后端返回的用户名字段是Username（大写U），不是username（小写u）
  const isAdminUser = currentUser?.Username === 'admin'
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  const hasManagerRole = userStore.hasRole('manager') || userStore.hasRole('部门经理')
  
  console.log('权限检查调试信息:', {
    currentUser: currentUser,
    isAdminUser: isAdminUser,
    hasAdminRole: hasAdminRole,
    hasManagerRole: hasManagerRole,
    userRoles: userStore.user?.roles
  })
  
  // admin用户、具有admin角色或manager角色的用户可以进入后台
  if (isAdminUser || hasAdminRole || hasManagerRole) {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('您没有后台管理权限，请联系管理员')
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
