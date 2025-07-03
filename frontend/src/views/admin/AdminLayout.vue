<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="logo-wrap">
        <img src="/logo.png" class="logo-img" />
        <span class="logo-text" v-show="!collapsed">质量数据系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        router
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409EFF"
        :collapse="collapsed"
        unique-opened
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span v-show="!collapsed">仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/supplier">
          <el-icon><OfficeBuilding /></el-icon>
          <span v-show="!collapsed">供应商管理</span>
        </el-menu-item>
        <el-sub-menu index="/admin/user">
          <template #title>
            <el-icon><User /></el-icon>
            <span v-show="!collapsed">用户管理</span>
          </template>
          <el-menu-item index="/admin/user/list">
            <el-icon><Grid /></el-icon>
            <span v-show="!collapsed">用户列表</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/admin/permission">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span v-show="!collapsed">权限管理</span>
          </template>
          <el-menu-item index="/admin/role-list">
            <el-icon><User /></el-icon>
            <span v-show="!collapsed">角色列表</span>
          </el-menu-item>
          <el-menu-item index="/admin/permission-list">
            <el-icon><Grid /></el-icon>
            <span v-show="!collapsed">权限列表</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/admin/settings">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span v-show="!collapsed">设置</span>
          </template>
          <el-menu-item index="/admin/data-management">
            <el-icon><Upload /></el-icon>
            <span v-show="!collapsed">数据管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/path-analysis">
            <el-icon><FolderOpened /></el-icon>
            <span v-show="!collapsed">路径格式分析</span>
          </el-menu-item>
          <el-menu-item index="/admin/file-copy-test">
            <el-icon><CopyDocument /></el-icon>
            <span v-show="!collapsed">文件拷贝测试</span>
          </el-menu-item>
          <el-menu-item index="/admin/system-config">
            <el-icon><Setting /></el-icon>
            <span v-show="!collapsed">系统配置</span>
          </el-menu-item>
          <el-menu-item index="/admin/home-card-config">
            <el-icon><Grid /></el-icon>
            <span v-show="!collapsed">主页卡片配置</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-icon" @click="collapsed = !collapsed">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>后台管理</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path.startsWith('/admin/user')">用户管理</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/user/list'">用户列表</el-breadcrumb-item>
            <el-breadcrumb-item v-else-if="route.path === '/admin/dashboard'">仪表盘</el-breadcrumb-item>
            <el-breadcrumb-item v-else-if="route.path === '/admin/supplier'">供应商管理</el-breadcrumb-item>
            <el-breadcrumb-item v-else-if="route.path.startsWith('/admin/data-management') || route.path.startsWith('/admin/path-analysis') || route.path.startsWith('/admin/file-copy-test') || route.path.startsWith('/admin/system-config')">设置</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/data-management'">数据管理</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/path-analysis'">路径格式分析</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/file-copy-test'">文件拷贝测试</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/system-config'">系统配置</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path === '/admin/profile'">用户中心</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="fullscreen-icon-wrap" @click="toggleFullscreen">
            <el-icon class="fullscreen-icon">
              <component :is="isFullscreen ? Aim : FullScreen" />
            </el-icon>
          </span>
          <el-dropdown trigger="click" placement="bottom-end">
            <span class="notify-icon-wrap">
              <el-badge :value="4" class="notify-badge-on-avatar">
                <el-icon class="notify-bell-on-avatar"><BellFilled /></el-icon>
              </el-badge>
            </span>
            <template #dropdown>
              <el-card class="notify-dropdown-card">
                <div class="notify-title">质量异常反馈</div>
                <el-divider style="margin: 8px 0;" />
                <el-timeline>
                  <el-timeline-item v-for="(msg, idx) in notifyList" :key="idx" :timestamp="msg.time" :color="msg.color">
                    <span class="notify-msg-title">{{ msg.title }}</span>
                    <div class="notify-msg-content">{{ msg.content }}</div>
                  </el-timeline-item>
                </el-timeline>
                <el-divider style="margin: 8px 0;" />
                <el-button type="text" style="width:100%;color:#409EFF;">查看全部</el-button>
              </el-card>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" placement="bottom-end">
            <span class="user-dropdown-trigger">
              <el-avatar :size="36" :src="user.Avatar" style="background:#eee;">
                <template v-if="!user.Avatar">
                  <el-icon><User /></el-icon>
                </template>
              </el-avatar>
            </span>
            <template #dropdown>
              <el-card class="user-dropdown-card">
                <div class="user-info">
                  <el-avatar :size="48" :src="user.Avatar" style="background:#eee;">
                    <template v-if="!user.Avatar">
                      <el-icon><User /></el-icon>
                    </template>
                  </el-avatar>
                  <div class="user-meta">
                    <div class="user-name">{{ user.Username || 'Super' }}</div>
                    <div class="user-role">{{ user.Role === 'admin' ? '管理员' : user.Role === 'user' ? '普通用户' : '-' }}</div>
                  </div>
                </div>
                <el-divider style="margin: 8px 0;" />
                <el-menu class="user-menu" mode="vertical" :default-active="''">
                  <el-menu-item @click="goProfile"><el-icon><User /></el-icon> 个人中心</el-menu-item>
                  <el-menu-item @click="goDocs"><el-icon><Document /></el-icon> 使用文档</el-menu-item>
                  <el-menu-item disabled><el-icon><Lock /></el-icon> 锁定屏幕</el-menu-item>
                </el-menu>
                <el-divider style="margin: 8px 0;" />
                <el-button type="default" class="logout-btn" @click="logout" style="width:100%;">退出登录</el-button>
              </el-card>
            </template>
          </el-dropdown>
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
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, OfficeBuilding, User, Fold, Expand, Grid, Document, Lock, BellFilled, FullScreen, Aim, Setting, Tools, Upload, FolderOpened, CopyDocument } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { storeToRefs } from 'pinia'
import Profile from '../Profile.vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const collapsed = ref(false)
const activeMenu = computed(() => route.path.startsWith('/admin/user') ? '/admin/user/list' : route.path)

// 网站配置
const siteConfig = reactive({
  logoUrl: '/logo.png',
  headerTitle: '质量数据系统',
  siteName: '质量数据管理系统'
})
const pageTitle = computed(() => {
  switch (route.path) {
    case '/admin/dashboard': return '仪表盘'
    case '/admin/supplier': return '供应商管理'
    case '/admin/user': return '用户管理'
    default: return ''
  }
})

const showProfile = ref(false)

const notifyList = ref([
  { title: '投诉单已处理', content: '客户A投诉单#20240613已完成整改。', time: '2024-06-13 10:10', color: '#67C23A' },
  { title: '新投诉待审核', content: '客户B提交了新的质量异常投诉。', time: '2024-06-12 09:30', color: '#E6A23C' },
  { title: '整改逾期提醒', content: '投诉单#20240610整改已超期，请尽快处理。', time: '2024-06-11 15:20', color: '#F56C6C' },
  { title: '投诉单已分派', content: '投诉单#20240609已分派至品控部。', time: '2024-06-10 08:00', color: '#409EFF' }
])

const logout = () => {
  localStorage.removeItem('token')
  router.replace('/login')
}

const goDocs = () => {
  window.open('https://your-doc-url.com', '_blank')
}

const goProfile = () => {
  router.push('/admin/profile')
}

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

// 加载网站配置
const loadSiteConfig = async () => {
  try {
    const response = await axios.get('/api/config/site-config')
    if (response.data.success) {
      Object.assign(siteConfig, response.data.data)
      // 更新页面标题
      document.title = siteConfig.siteName
    }
  } catch (error) {
    console.error('加载网站配置失败:', error)
  }
}

// LOGO加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png' // 回退到默认LOGO
}

onMounted(() => {
  userStore.fetchProfile()
  loadSiteConfig()

  // 监听网站配置更新事件
  window.addEventListener('siteConfigUpdated', (event) => {
    Object.assign(siteConfig, event.detail)
    document.title = siteConfig.siteName
  })
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
  height: 3.75rem;
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
.user-dropdown-card {
  min-width: 16rem;
  box-shadow: 0 0.25rem 1.5rem rgba(0,0,0,0.08);
  border-radius: 0.75rem;
  padding: 1rem 0 0.5rem 0;
  background: #fff;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
}
.user-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.user-name {
  font-weight: bold;
  font-size: 1rem;
  color: #222;
}
.user-role {
  font-size: 0.85rem;
  color: #009587;
  font-weight: 500;
}
.user-menu {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0 0.5rem;
}
.user-menu .el-menu-item {
  height: 2.4rem;
  line-height: 2.4rem;
  border-radius: 0.4rem;
  margin-bottom: 0.15rem;
  color: #333;
}
.user-menu .el-menu-item.is-active,
.user-menu .el-menu-item:hover {
  background: #f5f6fa;
  color: #009587;
}
.logout-btn {
  margin: 0 auto 0.5rem auto;
  border-radius: 0.4rem;
  color: #222;
  border: 1px solid #eee;
  display: block;
  width: 90%;
}
.admin-main {
  background: #fafbfc;
  height: calc(100vh - 3.75rem);
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
.avatar-notify-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.notify-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 15px 0 0;
  position: relative;
  height: 36px;
  cursor: pointer;
}
.notify-badge-on-avatar {
  position: static;
  display: flex;
  align-items: center;
  --el-badge-bg-color: #F56C6C;
}
.notify-badge-on-avatar .el-badge__content {
  font-size: 7px !important;
  min-width: 11px !important;
  height: 11px !important;
  line-height: 11px !important;
  padding: 0 2px !important;
  top: 2px !important;
  right: 0 !important;
}
.notify-bell-on-avatar {
  font-size: 19px;
  color: #888;
  background: none;
  border-radius: 50%;
  padding: 0;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
@media (max-width: 600px) {
  .admin-header { padding: 0 0.5rem; height: 3rem; }
  .logo-img { width: 1.5rem; height: 1.5rem; }
  .logo-text { font-size: 0.9rem; }
  .admin-main { padding: 0.5rem; }
}
</style> 