<template>
  <div class="user-dropdown-container">
    <!-- 用户头像 -->
    <el-avatar 
      :size="avatarSize" 
      :src="userStore.user?.Avatar" 
      class="user-avatar" 
      @click="handleAvatarClick"
    >
      <template v-if="!userStore.user?.Avatar">
        <el-icon><User /></el-icon>
      </template>
    </el-avatar>
    
    <!-- 用户名 -->
    <span 
      v-if="showUsername" 
      class="username" 
      @click="handleUsernameClick"
    >
      {{ userStore.getUserDisplayName() }}
    </span>
    
    <!-- 下拉菜单触发器 -->
    <el-dropdown 
      @visible-change="handleDropdownVisibleChange"
      placement="bottom-end"
      :hide-on-click="true"
    >
      <span class="dropdown-trigger">
        <el-icon 
          class="dropdown-arrow" 
          :class="{ 'dropdown-arrow-up': dropdownVisible }"
        >
          <ArrowDown />
        </el-icon>
      </span>
      
      <template #dropdown>
        <div class="user-dropdown-card">
          <!-- 用户信息区域 -->
          <div class="user-info" v-if="showUserInfo">
            <div class="user-name">{{ userStore.getUserDisplayName() }}</div>
            <div class="user-role" v-if="userStore.userRoleNames && userStore.userRoleNames.length > 0">
              <el-tag 
                v-for="(role, index) in userStore.userRoleNames" 
                :key="role" 
                :type="getRoleTagType(role, index)" 
                size="small" 
                class="role-tag"
              >
                {{ role }}
              </el-tag>
            </div>
            <div class="user-role" v-else>
              <el-tag type="info" size="small" class="role-tag">普通用户</el-tag>
            </div>
            <div class="user-dept" v-if="userStore.user?.DeptName">
              {{ userStore.user.DeptName }}
            </div>
          </div>
          
          <!-- 菜单项 -->
          <div class="user-menu">
            <div class="menu-item" @click="goProfile">
              <el-icon><User /></el-icon>
              <span>个人中心</span>
            </div>
            
            <div class="menu-item" @click="goHome" v-if="isInAdmin">
              <el-icon><House /></el-icon>
              <span>回到前台</span>
            </div>
            
            <div class="menu-item" @click="goAdmin" v-if="!isInAdmin" :class="{ 'is-disabled': !hasAdminPermission }" :style="{ cursor: hasAdminPermission ? 'pointer' : 'not-allowed', opacity: hasAdminPermission ? 1 : 0.5 }">
              <el-icon><Setting /></el-icon>
              <span>登录后台</span>
            </div>
            
            <div class="menu-item" @click="goDocs">
              <el-icon><Document /></el-icon>
              <span>使用文档</span>
            </div>
            
            <div class="menu-item" @click="toggleFullscreen" v-if="showFullscreenToggle">
              <el-icon><FullScreen /></el-icon>
              <span>{{ isFullscreen ? '退出全屏' : '全屏显示' }}</span>
            </div>
          </div>
          
          <!-- 退出登录按钮 -->
          <div class="logout-section">
            <el-button 
              type="danger" 
              plain 
              size="small" 
              class="logout-btn" 
              @click="logout"
            >
              <el-icon style="margin-right: 3px;"><SwitchButton /></el-icon>
              退出登录
            </el-button>
          </div>
        </div>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  ArrowDown, 
  House, 
  Setting, 
  Document, 
  FullScreen, 
  SwitchButton 
} from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'

// Props定义
const props = defineProps({
  // 头像大小
  avatarSize: {
    type: Number,
    default: 32
  },
  // 是否显示用户名
  showUsername: {
    type: Boolean,
    default: true
  },
  // 是否显示用户信息区域
  showUserInfo: {
    type: Boolean,
    default: true
  },
  // 是否显示全屏切换选项
  showFullscreenToggle: {
    type: Boolean,
    default: false
  },
  // 点击头像的行为：'profile' | 'dropdown' | 'none'
  avatarClickAction: {
    type: String,
    default: 'profile',
    validator: (value) => ['profile', 'dropdown', 'none'].includes(value)
  },
  // 点击用户名的行为：'profile' | 'dropdown' | 'none'
  usernameClickAction: {
    type: String,
    default: 'profile',
    validator: (value) => ['profile', 'dropdown', 'none'].includes(value)
  }
})

// 响应式数据
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const dropdownVisible = ref(false)
const isFullscreen = ref(false)

// 计算属性
const isInAdmin = computed(() => route.path.startsWith('/admin'))
const hasAdminPermission = computed(() => {
  // 检查用户是否为系统管理员
  const isAdmin = userStore.isAdmin
  
  // 检查用户是否有任何后台路由权限
  const hasAnyAdmin = userStore.hasAnyAdminPermission
  
  // 检查用户是否有特定的后台访问权限
  const hasDashboard = userStore.hasActionPermission('admin:dashboard:view')
  const hasAccess = userStore.hasActionPermission('admin:access')
  
  // 满足任一条件即可显示"登录后台"菜单项
  return isAdmin || hasAnyAdmin || hasDashboard || hasAccess
})

/**
 * 处理下拉菜单显示状态变化
 * @param {boolean} visible - 下拉菜单是否可见
 */
const handleDropdownVisibleChange = (visible) => {
  dropdownVisible.value = visible
}

/**
 * 处理头像点击事件
 */
const handleAvatarClick = () => {
  if (props.avatarClickAction === 'profile') {
    goProfile()
  } else if (props.avatarClickAction === 'dropdown') {
    // 触发下拉菜单（这里可以通过ref控制）
  }
  // 'none' 则不执行任何操作
}

/**
 * 处理用户名点击事件
 */
const handleUsernameClick = () => {
  if (props.usernameClickAction === 'profile') {
    goProfile()
  } else if (props.usernameClickAction === 'dropdown') {
    // 触发下拉菜单
  }
  // 'none' 则不执行任何操作
}

/**
 * 跳转到个人中心页面
 * 根据当前页面位置决定跳转方式
 */
const goProfile = () => {
  if (isInAdmin.value) {
    // 在后台管理页面中，正常跳转
    router.push('/admin/profile')
  } else {
    // 在前台页面中，新标签页打开
    const profileUrl = router.resolve('/profile').href
    window.open(profileUrl, '_blank')
  }
}

/**
 * 跳转到前台首页
 */
const goHome = () => {
  router.push('/')
}

/**
 * 跳转到后台管理
 */
const goAdmin = async () => {
  // 如果没有后台权限，则不执行跳转
  if (!hasAdminPermission.value) {
    return
  }

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

  // 权限验证
  if (hasAdminPermission.value) {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('您没有后台访问权限，请联系管理员')
  }
}

/**
 * 跳转到使用文档
 */
const goDocs = () => {
  window.open('https://docs.example.com', '_blank')
}

/**
 * 切换全屏状态
 */
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

/**
 * 监听全屏状态变化
 */
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

/**
 * 退出登录
 */
const logout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    userStore.clearUser()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消退出
  }
}

/**
 * 根据角色名称和索引获取标签类型
 * @param {string} roleName - 角色名称
 * @param {number} index - 角色索引
 * @returns {string} Element Plus标签类型
 */
const getRoleTagType = (roleName, index) => {
  // 特定角色的颜色映射
  const roleColorMap = {
    '超级管理员': 'danger',
    '管理员': 'warning',
    '部门管理员': 'primary',
    '质量管理员': 'success',
    '普通用户': 'info'
  }
  
  // 如果有特定映射，使用特定颜色
  if (roleColorMap[roleName]) {
    return roleColorMap[roleName]
  }
  
  // 否则循环使用预定义的标签类型
  const tagTypes = ['primary', 'success', 'warning', 'danger', 'info']
  return tagTypes[index % tagTypes.length]
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.user-dropdown-container {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.user-avatar {
  background: #e6f0ff;
  color: #1677ff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
}

.username {
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: color 0.3s ease;
  white-space: nowrap;
}

.username:hover {
  color: #409EFF;
}

.dropdown-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.dropdown-trigger:hover {
  background-color: #f5f7fa;
}

.dropdown-arrow {
  color: #606266;
  transition: all 0.3s ease;
  font-size: 14px;
}

.dropdown-arrow-up {
  transform: rotate(180deg);
}

.user-dropdown-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 16px;
  min-width: 240px;
  animation: userDropdownFadeIn 0.3s ease-out;
}

.user-info {
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.user-role {
  margin-bottom: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  font-size: 11px;
  font-weight: 400;
  font-family: 'Arial', 'Helvetica', sans-serif;
  border-radius: 4px;
  padding: 2px 6px;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.role-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.user-dept {
  font-size: 12px;
  color: #666;
}

.user-menu {
  margin-bottom: 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: #606266;
}

.menu-item:hover {
  background: #f5f7fa;
  color: #409EFF;
  transform: translateX(4px);
}

.menu-item .el-icon {
  font-size: 16px;
}

.logout-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.logout-btn {
  width: 100%;
  height: 30px;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

@keyframes userDropdownFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .username {
    display: none;
  }
  
  .user-dropdown-card {
    min-width: 200px;
  }
}
</style>