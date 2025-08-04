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
          <span v-show="!collapsed">{{ menu.Name }}</span>
        </template>
        
        <!-- 二级菜单 -->
        <template v-for="subMenu in menu.children">
          <!-- 二级菜单（有子菜单） -->
          <el-sub-menu v-if="subMenu.children && subMenu.children.length > 0" :key="'submenu-' + (subMenu.ID || subMenu.Code || subMenu.Name)" :index="subMenu.Path || subMenu.Code">
            <template #title>
              <el-icon v-if="subMenu.Icon">
                <component :is="getIconComponent(subMenu.Icon)" />
              </el-icon>
              <span v-show="!collapsed">{{ subMenu.Name }}</span>
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
              <span v-show="!collapsed">{{ thirdMenu.Name }}</span>
            </el-menu-item>
          </el-sub-menu>
          
          <!-- 二级菜单项（无子菜单） -->
          <el-menu-item v-else :key="'menuitem-' + (subMenu.ID || subMenu.Code || subMenu.Name)" :index="subMenu.Path || subMenu.Code">
            <el-icon v-if="subMenu.Icon">
              <component :is="getIconComponent(subMenu.Icon)" />
            </el-icon>
            <span v-show="!collapsed">{{ subMenu.Name }}</span>
          </el-menu-item>
        </template>
      </el-sub-menu>
      
      <!-- 一级菜单项（无子菜单） -->
      <el-menu-item v-else :key="'menuitem-' + (menu.ID || menu.Code || menu.Name)" :index="menu.Path || menu.Code">
        <el-icon v-if="menu.Icon">
          <component :is="getIconComponent(menu.Icon)" />
        </el-icon>
        <span v-show="!collapsed">{{ menu.Name }}</span>
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
  Shop
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
  Shop
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
    
    console.log('=== DynamicMenu: 开始获取用户菜单 ===')
    console.log('当前token状态:', {
      store_token: !!userStore.token,
      localStorage_token: !!localStorage.getItem('token'),
      token_length: userStore.token?.length || 0
    })
    
    if (!userStore.token) {
      console.log('Token不存在，使用默认菜单')
      menuList.value = getDefaultMenus()
      return
    }
    
    // 检查用户信息是否存在，如果不存在则先获取用户信息
    if (!userStore.user || !userStore.user.id) {
      console.log('用户信息不存在，先获取用户基本信息')
      try {
        await userStore.fetchProfile()
      } catch (profileError) {
        console.error('获取用户信息失败:', profileError)
        // 如果获取用户信息失败，使用默认菜单
        menuList.value = getDefaultMenus()
        return
      }
    }
    
    console.log('调用API获取用户菜单')
    // 直接调用API获取最新的菜单数据
    const response = await apiService.get('/api/menus/user-menus')
    console.log('API响应:', response)
    if (response.data.success) {
      console.log('API获取菜单成功，菜单数量:', response.data.data?.length || 0)
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

// 获取默认菜单（当动态菜单接口不可用时的后备方案）
const getDefaultMenus = () => {
  return [
    {
      ID: 1,
      Name: '仪表盘',
      Code: 'dashboard',
      Path: '/admin/dashboard',
      Icon: 'HomeFilled',
      Type: 'menu'
    },
    {
      ID: 2,
      Name: '供应商管理',
      Code: 'supplier',
      Path: '/admin/supplier',
      Icon: 'OfficeBuilding',
      Type: 'menu',
      children: [
        {
          ID: 21,
          Name: '供应商列表',
          Code: 'supplier-list',
          Path: '/admin/supplier/list',
          Icon: 'List',
          Type: 'menu'
        },
        {
          ID: 22,
          Name: '材料价格',
          Code: 'material-price',
          Path: '/admin/supplier/material-price',
          Icon: 'Money',
          Type: 'menu'
        }
      ]
    },
    {
      ID: 3,
      Name: '用户管理',
      Code: 'user',
      Path: '/admin/user',
      Icon: 'User',
      Type: 'menu',
      children: [
        {
          ID: 31,
          Name: '用户列表',
          Code: 'user-list',
          Path: '/admin/user/list',
          Icon: 'Grid',
          Type: 'menu'
        },
        {
          ID: 32,
          Name: '人员管理',
          Code: 'person-management',
          Path: '/admin/person-management',
          Icon: 'Avatar',
          Type: 'menu'
        }
      ]
    },
    {
      ID: 4,
      Name: '返工管理',
      Code: 'rework-management',
      Path: '/admin/rework-management',
      Icon: 'Tools',
      Type: 'menu'
    },
    {
      ID: 5,
      Name: '权限管理',
      Code: 'permission',
      Path: '/admin/permission',
      Icon: 'Setting',
      Type: 'menu',
      children: [
        {
          ID: 51,
          Name: '部门管理',
          Code: 'department-management',
          Path: '/admin/department-management',
          Icon: 'OfficeBuilding',
          Type: 'menu'
        },
        {
          ID: 52,
          Name: '岗位管理',
          Code: 'position-management',
          Path: '/admin/position-management',
          Icon: 'Briefcase',
          Type: 'menu'
        },
        {
          ID: 53,
          Name: '角色管理',
          Code: 'role-management',
          Path: '/admin/role-management',
          Icon: 'UserFilled',
          Type: 'menu'
        },
        {
          ID: 54,
          Name: '菜单管理',
          Code: 'menu-management',
          Path: '/admin/menu-management',
          Icon: 'Menu',
          Type: 'menu'
        }
      ]
    },
    {
      ID: 6,
      Name: '设置',
      Code: 'settings',
      Path: '/admin/settings',
      Icon: 'Tools',
      Type: 'menu',
      children: [
        {
          ID: 61,
          Name: '数据管理',
          Code: 'data-management',
          Path: '/admin/data-management',
          Icon: 'Upload',
          Type: 'menu'
        },
        {
          ID: 62,
          Name: '系统配置',
          Code: 'system-config',
          Path: '/admin/system-config',
          Icon: 'Setting',
          Type: 'menu'
        },
        {
          ID: 63,
          Name: '主页卡片配置',
          Code: 'home-card-config',
          Path: '/admin/home-card-config',
          Icon: 'Grid',
          Type: 'menu'
        }
      ]
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
  console.log('=== DynamicMenu: 菜单列表已更新 ===')
  console.log('新菜单数据:', newMenus)
  console.log('菜单数量:', newMenus?.length || 0)
}, { deep: true })

// 组件挂载时获取菜单
onMounted(() => {
  console.log('=== DynamicMenu: 组件已挂载，开始获取菜单 ===')
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