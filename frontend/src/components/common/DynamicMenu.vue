<template>
  <el-menu
    class="el-menu-vertical-demo"
    router
    background-color="#001529"
    text-color="#fff"
    active-text-color="#409EFF"
    :collapse="collapsed"
    unique-opened
    :default-active="activeMenu"
  >
    <template v-for="menu in menuList">
      <!-- 一级菜单（有子菜单） -->
      <el-sub-menu v-if="menu.children && menu.children.length > 0" :key="'menu-' + (menu.ID || menu.Code || menu.Name)" :index="menu.Path || menu.Code">
        <template #title>
          <el-icon v-if="menu.Icon">
            <component :is="getIconComponent(menu.Icon)" />
          </el-icon>
          <span>{{ menu.Name }}</span>
        </template>
        
        <!-- 二级菜单 -->
        <template v-for="subMenu in menu.children">
          <!-- 二级菜单（有子菜单） -->
          <el-sub-menu v-if="subMenu.children && subMenu.children.length > 0" :key="'submenu-' + (subMenu.ID || subMenu.Code || subMenu.Name)" :index="subMenu.Path || subMenu.Code">
            <template #title>
              <el-icon v-if="subMenu.Icon">
                <component :is="getIconComponent(subMenu.Icon)" />
              </el-icon>
              <span>{{ subMenu.Name }}</span>
            </template>
            
            <!-- 三级菜单项 -->
            <el-menu-item 
              v-for="thirdMenu in subMenu.children" 
              :key="thirdMenu.ID || thirdMenu.Code || thirdMenu.Name" 
              :index="thirdMenu.Path || thirdMenu.Code"
            >
              <el-icon v-if="thirdMenu.Icon">
                <component :is="getIconComponent(thirdMenu.Icon)" />
              </el-icon>
              <span>{{ thirdMenu.Name }}</span>
            </el-menu-item>
          </el-sub-menu>
          
          <!-- 二级菜单项（无子菜单） -->
          <el-menu-item v-else :key="'menuitem-' + (subMenu.ID || subMenu.Code || subMenu.Name)" :index="subMenu.Path || subMenu.Code">
            <el-icon v-if="subMenu.Icon">
              <component :is="getIconComponent(subMenu.Icon)" />
            </el-icon>
            <span>{{ subMenu.Name }}</span>
          </el-menu-item>
        </template>
      </el-sub-menu>
      
      <!-- 一级菜单项（无子菜单） -->
      <el-menu-item v-else :key="'menuitem-' + (menu.ID || menu.Code || menu.Name)" :index="menu.Path || menu.Code">
        <el-icon v-if="menu.Icon">
          <component :is="getIconComponent(menu.Icon)" />
        </el-icon>
        <span>{{ menu.Name }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
/**
 * 动态菜单组件
 * 
 * 功能说明：
 * 1. 根据用户权限动态渲染菜单
 * 2. 支持多级菜单结构（最多三级）
 * 3. 支持菜单图标和路由跳转
 * 4. 支持菜单折叠/展开
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import apiService from '@/services/apiService'

// 引入图标组件
import {
  HomeFilled,
  OfficeBuilding,
  User,
  Setting,
  Lock,
  Grid,
  Document,
  Tools,
  Upload,
  FolderOpened,
  CopyDocument,
  List,
  Money,
  Avatar,
  Briefcase,
  UserFilled,
  Menu,
  Shop,
  Van,
  ChatLineSquare,
  Key,
  PieChart,
  Operation,
  Cpu,
  InfoFilled,
  DocumentChecked,
  Collection,
  DocumentCopy,
  Notebook,
  Reading,
  Platform,
  RefreshRight,
  PriceTag,
  Coin,
  ChatDotRound,
  Management,
  SetUp,
  Histogram,
  DataBoard,
  Medal,
  View,
  Bell,
  Star,
  UserFilled as Users,
  User as UserGroup,
  Avatar as People,
  Monitor,
  Files,
  Message,
  Warning,
  ChatRound,
  Box,
  Link,
  TrendCharts,
  Coordinate as CoordinateIcon,
  Briefcase as Suitcase,
  Search
} from '@element-plus/icons-vue'

// 定义props
const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

// 获取当前路由和用户store
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 菜单数据
const menuList = ref([])
const loading = ref(false)
const error = ref(null)

// 图标映射
const iconMap = {
  HomeFilled,
  OfficeBuilding,
  User,
  Grid,
  Document,
  Setting,
  Tools,
  Upload,
  FolderOpened,
  CopyDocument,
  List,
  Money,
  Avatar,
  Briefcase,
  UserFilled,
  Menu,
  Lock,
  Shop,
  Van,
  ChatLineSquare,
  Key,
  PieChart,
  Operation,
  Cpu,
  InfoFilled,
    DocumentChecked,
    Collection,
    DocumentCopy,
    Notebook,
    Reading,
    Platform,
    RefreshRight,
    PriceTag,
    Coin,
    ChatDotRound,
    Management,
    SetUp,
    Histogram,
    DataBoard,
    Medal,
    View,
    Bell,
    Star,
    Users,
    UserGroup,
    People,
    Odometer: Monitor,
    Database: Files,
    MessageBox: Message,
    WarningFilled: Warning,
    Comment: ChatRound,
    Package: Box,
    Connection: Link,
    Promotion: TrendCharts,
    Coordinate: CoordinateIcon,
    Suitcase,
    Search
  }

// 获取图标组件
const getIconComponent = (iconName) => {
  return iconMap[iconName] || Grid
}

// 计算当前激活的菜单
const activeMenu = computed(() => {
  return route.path
})

// 获取用户菜单
/**
 * 获取用户菜单数据
 * 优化逻辑，避免重复API调用导致token失效
 */
const fetchUserMenus = async () => {
  try {
    loading.value = true
    error.value = null
    
    if (!userStore.token) {
      menuList.value = getDefaultMenus()
      return
    }
    
    // 检查用户信息是否存在，如果不存在则先获取用户信息
    if (!userStore.user || !userStore.user.id) {
      try {
        await userStore.fetchProfile()
      } catch (profileError) {
        console.error('获取用户信息失败:', profileError)
        // 如果获取用户信息失败，使用默认菜单
        menuList.value = getDefaultMenus()
        return
      }
    }
    
    // 直接调用API获取最新的菜单数据
    const response = await apiService.get('/menus/user-menus')
    if (response.data.success) {
      menuList.value = response.data.data || []
    } else {
      throw new Error(response.data.message || '获取菜单数据失败')
    }
  } catch (err) {
    console.error('获取用户菜单失败:', err)
    error.value = err.message || '获取菜单数据失败'
    
    // 使用默认菜单作为后备方案
    menuList.value = getDefaultMenus()
    
    // 显示错误提示（但不影响用户使用）
    if (err.response?.status !== 401) {
      ElMessage.warning('菜单数据加载失败，使用默认菜单')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 构建菜单树结构
 * 将扁平的菜单数据转换为树形结构
 */
const buildMenuTree = (menus) => {
  if (!menus || menus.length === 0) return getDefaultMenus()
  
  const menuMap = new Map()
  const rootMenus = []
  
  // 创建菜单映射
  menus.forEach(menu => {
    menuMap.set(menu.ID, { ...menu, children: [] })
  })
  
  // 构建树形结构
  menus.forEach(menu => {
    const menuItem = menuMap.get(menu.ID)
    if (menu.ParentID && menuMap.has(menu.ParentID)) {
      menuMap.get(menu.ParentID).children.push(menuItem)
    } else {
      rootMenus.push(menuItem)
    }
  })
  
  return rootMenus.length > 0 ? rootMenus : getDefaultMenus()
}

/**
 * 获取默认菜单（当动态菜单接口不可用时的后备方案）
 * 只包含基础的、对所有后台用户开放的菜单
 * 注意：移除了用户管理、权限管理等需要特定权限的菜单
 * 这些菜单应该通过数据库权限控制，而不是在默认菜单中提供
 */
const getDefaultMenus = () => {
  return [
    {
      ID: 1,
      Name: '仪表盘',
      Code: 'dashboard',
      Path: '/admin/dashboard',
      Icon: 'HomeFilled',
      Type: 'menu'
    }
  ]
}

// 监听用户登录状态变化
watch(() => userStore.token, (newToken) => {
  if (newToken) {
    fetchUserMenus()
  } else {
    menuList.value = []
  }
}, { immediate: true })

// 监听菜单列表变化
watch(menuList, (newMenus) => {
  // 菜单列表已更新
}, { deep: true })

// 组件挂载时获取菜单
onMounted(() => {
  fetchUserMenus()
})

// 暴露方法供父组件调用
defineExpose({
  refreshMenus: fetchUserMenus
})
</script>

<style scoped>
/* 菜单样式已在父组件中定义 */
</style>