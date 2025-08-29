<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '260px'" class="admin-aside">
      <div class="logo-wrap">
        <img :src="siteConfig.logoBase64Img" class="logo-img" />
        <span class="logo-text" v-show="!collapsed">{{ siteConfig.headerTitle }}</span>
      </div>
      <!-- 动态菜单组件 -->
      <DynamicMenu :collapsed="collapsed" ref="dynamicMenuRef" />
    </el-aside>
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-icon" @click="collapsed = !collapsed">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
          <DynamicBreadcrumb />
        </div>
        <div class="header-right">
          <span class="fullscreen-icon-wrap" @click="toggleFullscreen">
            <el-icon class="fullscreen-icon">
              <component :is="isFullscreen ? Aim : FullScreen" />
            </el-icon>
          </span>
          <!-- 通知铃铛组件 -->
          <AdminNotificationBell class="admin-notification-bell" />
          <!-- 用户下拉菜单组件 -->
          <UserDropdown 
            :avatar-size="36"
            :show-username="false"
            :show-user-info="true"
            :show-fullscreen-toggle="true"
            avatar-click-action="profile"
            username-click-action="profile"
          />
          <el-dialog v-model="showProfile" title="个人中心" width="800px" top="8vh" destroy-on-close>
            <Profile />
          </el-dialog>
          

        </div>
      </el-header>
      <!-- 内容区 -->
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, OfficeBuilding, User, Fold, Expand, Grid, Document, Lock, BellFilled, FullScreen, Aim, Setting, Tools, Upload, FolderOpened, CopyDocument, List, Money, Avatar, Briefcase, UserFilled, Menu, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { storeToRefs } from 'pinia'
import Profile from '../Profile.vue'
import { useSiteConfig } from '../../composables/useSiteConfig'
import DynamicBreadcrumb from '../../components/common/DynamicBreadcrumb.vue'
import DynamicMenu from '../../components/common/DynamicMenu.vue'
import UserDropdown from '../../components/common/UserDropdown.vue'
import AdminNotificationBell from '../../components/common/AdminNotificationBell.vue'
import { ElMessage } from 'element-plus'
import api from '../../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

// 使用网站配置
const { siteConfig } = useSiteConfig()

const collapsed = ref(false)
const dynamicMenuRef = ref(null)
// 移除activeMenu计算属性以避免与路由变化的循环依赖
// const activeMenu = computed(() => {
//   if (route.path.startsWith('/admin/user')) return '/admin/user/list'
//   if (route.path.startsWith('/admin/supplier')) return route.path
//   return route.path
// })
const pageTitle = computed(() => {
  switch (route.path) {
    case '/admin/dashboard': return '仪表盘'
    case '/admin/supplier/list': return '供应商列表'
    case '/admin/supplier/material-price': return '材料价格管理'
    case '/admin/user': return '用户管理'
    default: return ''
  }
})

const showProfile = ref(false)

// 移除用户下拉菜单显示状态（已迁移到UserDropdown组件）

const logout = () => {
  userStore.clearUser()
  router.replace('/login')
}

const goDocs = () => {
  window.open('https://your-doc-url.com', '_blank')
}

const goProfile = () => {
  router.push('/admin/profile')
}

/**
 * 跳转到前台首页
 * 功能：从后台管理界面返回到前台首页
 */
const goHome = () => {
  router.push('/')
}



// 移除用户下拉菜单相关方法（已迁移到UserDropdown组件）

const isFullscreen = ref(false)
const toggleFullscreen = () => {
  if (!isFullscreen.value) {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullScreen) el.webkitRequestFullScreen()
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
    else if (el.msRequestFullscreen) el.msRequestFullscreen()
    isFullscreen.value = true
  } else {
    if (document.exitFullscreen) document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen()
    else if (document.msExitFullscreen) document.msExitFullscreen()
    isFullscreen.value = false
  }
}
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})

// 图片加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png'
}

onMounted(async () => {
  try {
    // 初始化用户信息和基础数据
    await userStore.fetchProfile()
    await userStore.initializeBaseData()
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('初始化失败，请重新登录')
    logout()
  }
})
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}
.admin-aside {
  background: #232a32;
  color: #fff;
  height: 100vh;
  box-shadow: 0.125rem 0 0.5rem #232a32;
  transition: width 0.2s;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4rem;
  box-sizing: border-box;
  border-bottom: 1px solid #2c333a;
}
.logo-img {
  width: 2.25rem;
  height: 2.25rem;
  margin-right: 0.625rem;
  border-radius: 0.5rem;
  background: #fff;
}
.logo-text {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  letter-spacing: 0.125rem;
  white-space: nowrap;
  max-width: 7.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
.admin-header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 5rem;
  box-shadow: 0 0.125rem 0.5rem #f0f1f2;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 1.1rem;
}
.collapse-icon {
  font-size: 1.4rem;
  cursor: pointer;
  color: #409EFF;
  margin-right: 0.5rem;
  transition: color 0.2s;
}
.collapse-icon:hover {
  color: #66b1ff;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user-dropdown-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.dropdown-arrow {
  margin-left: 0.5rem;
  transition: transform 0.3s ease;
  color: #909399;
}

.dropdown-arrow:hover {
  color: #409EFF;
}
.user-dropdown-card {
  min-width: 18rem;
  max-width: 22rem;
  width: max-content;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  padding: 0.5rem 0 0.4rem 0;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  animation: userDropdownFadeIn 0.3s ease-out;
  position: relative;
  overflow: hidden;
}


.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem;
  margin-bottom: 0.5rem;
}
.user-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.user-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 2px;
}
.user-role {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.role-tag {
  font-size: 0.7rem;
  font-weight: 500;
  font-family: 'Arial', 'Helvetica', sans-serif;
  border-radius: 8px;
  padding: 2px 6px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.role-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.user-dept {
  font-size: 0.8rem;
  color: #909399;
  margin-top: 2px;
}
.user-menu {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0 1rem;
}
.user-menu .el-menu-item {
  height: 2.8rem;
  line-height: 2.8rem;
  border-radius: 10px;
  margin-bottom: 0.25rem;
  color: #606266;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-size: 0.9rem;
}
.user-menu .el-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: #409EFF;
  transition: width 0.3s ease;
  border-radius: 10px 0 0 10px;
}
.user-menu .el-menu-item.is-active,
.user-menu .el-menu-item:hover {
  background: #f5f7fa;
  color: #409EFF;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}
.user-menu .el-menu-item:hover::before {
  width: 4px;
}
.user-menu .el-menu-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.user-menu .el-menu-item.is-disabled:hover {
  transform: none;
  background: transparent;
  box-shadow: none;
}
.logout-btn {
  margin: 1rem auto 0.25rem auto;
  border-radius: 10px;
  color: #ffffff;
  background: #F56C6C;
  border: none;
  height: 2.5rem;
  width: calc(100% - 3rem);
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
  display: block;
  text-align: center;
}
.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 108, 108, 0.4);
  background: #E6A23C;
}

/* 用户下拉菜单动画 */
@keyframes userDropdownFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-15px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 隐藏通知下拉的箭头，保留用户下拉的箭头 */
.notify-dropdown :deep(.el-popper__arrow) {
  display: none !important;
}
.admin-main {
  background: #fafbfc;
  /* 修复高度计算，头部实际高度为5rem（80px） */
  height: calc(100vh - 5rem);
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
}

/**** 一级菜单样式优化 ****/
.el-menu-vertical-demo {
  width: 100% !important;
  border-right: none !important;
  background: transparent !important;
}
.el-menu-vertical-demo :deep(.el-menu-item) {
  border-left: 4px solid transparent;
  transition: border-color 0.2s, background 0.2s;
  background: #3a4149 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-menu-item:hover) {
  border-left: 4px solid #009587;
  background: #3a4149 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-menu-item.is-active) {
  border-left: 4px solid #009587;
  background: #009587 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-sub-menu__title) {
  background: #3a4149 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-sub-menu.is-active) > .el-sub-menu__title {
  background: #3a4149 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-sub-menu .el-menu-item) {
  background: #232a32 !important;
  color: #fff !important;
}
.el-menu-vertical-demo :deep(.el-sub-menu .el-menu-item.is-active) {
  background: #009587 !important;
  color: #fff !important;
}
/* 用户下拉触发器样式 */
.user-dropdown-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.user-dropdown-trigger:hover {
  background-color: #f5f7fa;
}

.dropdown-arrow {
  margin-left: 6px;
  font-size: 14px;
  color: #909399;
  transition: color 0.2s ease, transform 0.2s ease;
}

.user-dropdown-trigger:hover .dropdown-arrow {
  color: #409EFF;
  transform: translateY(1px);
}

/* 管理员通知铃铛组件样式 */
.admin-notification-bell {
  margin-right: 15px;
}
.fullscreen-icon-wrap {
  margin-right: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.fullscreen-icon {
  font-size: 19px;
  color: #888;
  transition: color 0.2s;
}
.fullscreen-icon:hover {
  color: #409EFF;
}
/* 消息详情对话框样式 */
.notice-detail {
  padding: 0;
  background: #ffffff;
  border-radius: 8px;
}

.notice-header {
  margin-bottom: 20px;
  padding: 20px 24px 0 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8eaed;
}

.notice-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.notice-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
}

.notice-time {
  font-size: 13px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.notice-content {
  font-size: 15px;
  line-height: 1.7;
  color: #374151;
  max-height: 450px;
  overflow-y: auto;
  padding: 0 24px 24px 24px;
  background: #ffffff;
}

.notice-content::-webkit-scrollbar {
  width: 6px;
}

.notice-content::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 3px;
}

.notice-content::-webkit-scrollbar-thumb {
  background: #c1c8cd;
  border-radius: 3px;
  transition: background 0.2s ease;
}

.notice-content::-webkit-scrollbar-thumb:hover {
  background: #9aa0a6;
}

.notice-content :deep(p) {
  margin: 0 0 16px 0;
  text-align: justify;
}

.notice-content :deep(p:last-child) {
  margin-bottom: 0;
}

.notice-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 12px 0;
}

.notice-content :deep(h1),
.notice-content :deep(h2),
.notice-content :deep(h3),
.notice-content :deep(h4),
.notice-content :deep(h5),
.notice-content :deep(h6) {
  color: #1f2937;
  font-weight: 600;
  margin: 20px 0 12px 0;
}

.notice-content :deep(ul),
.notice-content :deep(ol) {
  padding-left: 20px;
  margin: 12px 0;
}

.notice-content :deep(li) {
  margin: 6px 0;
}

.notice-content :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 16px;
  margin: 16px 0;
  color: #6b7280;
  font-style: italic;
}

.notice-content :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.notice-content :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #e9ecef;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px 24px 24px;
  background: #fafbfc;
  border-radius: 0 0 8px 8px;
}

.dialog-footer .el-button {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.dialog-footer .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.3);
}

/* 对话框动画效果 */
:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  border-bottom: none;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

:deep(.el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-dialog__footer) {
  padding: 0;
}

@media (max-width: 600px) {
  .admin-header { padding: 0 0.5rem; height: 3rem; }
  .logo-img { width: 1.5rem; height: 1.5rem; }
  .logo-text { font-size: 0.9rem; }
  .admin-main { padding: 0.5rem; }
  
  .user-dropdown-card {
    min-width: 16rem;
    max-width: 18rem;
  }
  
  .notify-dropdown-card {
    min-width: 260px;
    max-width: 320px;
    height: 400px;
  }
  
  .notice-detail {
    padding: 0 8px;
  }
  
  .notice-title {
    font-size: 16px;
  }
  
  .notice-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>