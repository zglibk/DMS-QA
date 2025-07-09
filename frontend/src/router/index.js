/**
 * Vue Router 路由配置文件
 *
 * 功能说明：
 * 1. 定义应用的所有路由规则
 * 2. 配置路由守卫进行权限控制
 * 3. 支持懒加载优化性能
 *
 * 路由结构：
 * - /login: 登录页面
 * - /: 首页（投诉记录管理）
 * - /complaint/*: 投诉相关页面
 * - /admin/*: 管理后台（嵌套路由）
 * - /profile: 个人资料页面
 */

// 导入Vue Router核心函数
import { createRouter, createWebHistory } from 'vue-router'

// 导入主要页面组件（直接导入，首次加载）
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import ComplaintList from '../views/ComplaintList.vue'
import DataVisualization from '../views/DataVisualization.vue'

// 导入管理后台相关组件
import AdminLayout from '../views/admin/AdminLayout.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import PurchaseList from '../views/admin/PurchaseList.vue'
import SupplierList from '../views/admin/SupplierList.vue'
import MaterialPriceList from '../views/admin/MaterialPriceList.vue'
import UserList from '../views/admin/UserList.vue'

/**
 * 路由配置数组
 *
 * 路由说明：
 * - 使用懒加载（import()）的组件会在首次访问时才加载，优化首屏性能
 * - meta.requiresAuth: true 表示需要认证的路由
 * - children 数组定义嵌套路由
 */
const routes = [
  // 登录页面
  { path: '/login', component: Login },

  // 首页 - 投诉记录管理
  { path: '/', component: Home },

  // 投诉相关页面
  { path: '/complaint/list', component: ComplaintList },

  // 数据可视化页面
  { path: '/data-visualization', component: DataVisualization },

  // 个人资料页面（懒加载）
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue')
  },

  // 管理后台路由（嵌套路由结构）
  {
    path: '/admin',
    component: AdminLayout, // 管理后台布局组件
    children: [
      // 仪表板
      { path: 'dashboard', component: Dashboard },

      // 供应商管理
      { path: 'supplier/list', component: SupplierList },
      { path: 'supplier/material-price', component: MaterialPriceList },

      // 用户管理
      { path: 'user', redirect: '/admin/user/list' }, // 重定向到用户列表
      { path: 'user/list', component: UserList },

      // 个人资料（管理后台版本）
      { path: 'profile', component: () => import('../views/Profile.vue') },

      // 权限管理相关页面（懒加载 + 需要认证）
      {
        path: 'role-list',
        component: () => import('../views/admin/RoleList.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'permission-list',
        component: () => import('../views/admin/PermissionList.vue'),
        meta: { requiresAuth: true }
      },

      // 数据管理页面
      {
        path: 'data-management',
        component: () => import('../views/admin/DataManagement.vue'),
        meta: { requiresAuth: true }
      },

      // 路径分析页面
      {
        path: 'path-analysis',
        component: () => import('../views/admin/PathAnalysis.vue'),
        meta: { requiresAuth: true }
      },

      // 文件复制测试页面
      {
        path: 'file-copy-test',
        component: () => import('../views/admin/FileCopyTest.vue'),
        meta: { requiresAuth: true }
      },

      // 系统配置页面
      {
        path: 'system-config',
        component: () => import('../views/admin/SystemConfig.vue'),
        meta: { requiresAuth: true }
      },

      // 首页卡片配置页面
      {
        path: 'home-card-config',
        component: () => import('../components/admin/HomeCardConfig.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

/**
 * 创建路由实例
 *
 * 配置说明：
 * - history: createWebHistory() 使用HTML5 History模式
 *   优点：URL更美观，无#号
 *   注意：需要服务器配置支持，否则刷新页面会404
 * - routes: 路由配置数组
 */
const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 全局前置路由守卫
 *
 * 功能：实现简单的登录验证
 *
 * 工作流程：
 * 1. 检查目标路由是否为登录页
 * 2. 如果不是登录页，检查是否有token
 * 3. 无token时强制跳转到登录页
 * 4. 有token或访问登录页时正常放行
 *
 * 参数说明：
 * - to: 即将进入的目标路由对象
 * - from: 当前导航正要离开的路由对象
 * - next: 控制导航的函数
 */
router.beforeEach((to, from, next) => {
  // 从本地存储获取JWT token
  const token = localStorage.getItem('token')

  // 如果访问的不是登录页且没有token，跳转到登录页
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    // 正常放行
    next()
  }
})

// 导出路由实例供main.js使用
export default router