import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import ComplaintForm from '../views/ComplaintForm.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import PurchaseList from '../views/admin/PurchaseList.vue'
import SupplierList from '../views/admin/SupplierList.vue'
import UserList from '../views/admin/UserList.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/', component: Home },
  { path: '/add', component: ComplaintForm },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue')
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'supplier', component: SupplierList },
      { path: 'user', redirect: '/admin/user/list' },
      { path: 'user/list', component: UserList },
      { path: 'profile', component: () => import('../views/Profile.vue') },
      { path: 'role-list', component: () => import('../views/admin/RoleList.vue'), meta: { requiresAuth: true } },
      { path: 'permission-list', component: () => import('../views/admin/PermissionList.vue'), meta: { requiresAuth: true } },
      { path: 'data-management', component: () => import('../views/admin/DataManagement.vue'), meta: { requiresAuth: true } },
      { path: 'path-analysis', component: () => import('../views/admin/PathAnalysis.vue'), meta: { requiresAuth: true } },
      { path: 'file-copy-test', component: () => import('../views/admin/FileCopyTest.vue'), meta: { requiresAuth: true } },
      { path: 'system-config', component: () => import('../views/admin/SystemConfig.vue'), meta: { requiresAuth: true } },
      { path: 'home-card-config', component: () => import('../components/admin/HomeCardConfig.vue'), meta: { requiresAuth: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫，未登录时强制跳转登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router 