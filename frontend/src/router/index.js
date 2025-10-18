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

  // 首页
  { path: '/', component: Home },

  // 数据可视化页面
  { path: '/data-visualization', component: DataVisualization },

  // 返工分析页面
  { path: '/rework-analysis', component: () => import('../views/ReworkAnalysis.vue') },

  // 出版异常页面
  { path: '/publishing-exceptions', component: () => import('../views/PublishingExceptions.vue') },

  // 版本更新日志页面
  { path: '/version-updates', component: () => import('../views/VersionUpdates.vue') },

  // 二维码扫描页面
  { path: '/qr-scan', component: () => import('../views/QrScanPage.vue') },

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
      // 默认欢迎页面
      { path: '', component: () => import('../views/admin/NewWelcome.vue') },
      
      // 仪表板
      { path: 'dashboard', component: Dashboard },

      // 供应商管理
      { path: 'supplier', redirect: '/admin/supplier/list' }, // 重定向到供应商列表
      { path: 'supplier/list', component: SupplierList },
      { path: 'supplier/material-price', component: MaterialPriceList },
      
      // 供应商管理子菜单
      { path: 'supplier/basic-info', component: () => import('../views/admin/supplier/BasicInfo.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/materials', component: () => import('../views/admin/supplier/MaterialSuppliers.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/equipment', component: () => import('../views/admin/supplier/EquipmentSuppliers.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/quality', component: () => import('../views/admin/supplier/QualityAssessment.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/performance', component: () => import('../views/admin/supplier/Performance.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/contracts', component: () => import('../views/admin/supplier/Contracts.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/qualified', component: () => import('../views/admin/supplier/QualifiedSuppliers.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/audit', component: () => import('../views/admin/supplier/SupplierAudit.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/inspection', component: () => import('../views/admin/supplier/InspectionReports.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/annual-audit-plan', component: () => import('../views/admin/supplier/AnnualAuditPlan.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/audit-reports', component: () => import('../views/admin/supplier/AuditReports.vue'), meta: { requiresAuth: true } },
      { path: 'supplier/complaints', component: () => import('../views/admin/supplier/SupplierComplaints.vue'), meta: { requiresAuth: true } },

      // 样版管理
      { path: 'sample', redirect: '/admin/sample/approval' }, // 重定向到样品承认书
      { path: 'sample/approval', component: () => import('../views/admin/sample/SampleApproval.vue'), meta: { requiresAuth: true } },
      { path: 'sample/color-card', component: () => import('../views/admin/sample/InternalColorCard.vue'), meta: { requiresAuth: true } },

      // 用户管理（旧路径，保持兼容性）
      { path: 'user', redirect: '/admin/user/list' }, // 重定向到用户列表
      { path: 'user/list', component: UserList },

      // 质量管理模块
      {
        path: 'quality',
        redirect: '/admin/quality/complaint'
      },
      {
        path: 'quality/complaint',
        redirect: '/admin/quality/complaint/customer'
      },
      {
          path: 'quality/complaint/internal',
          name: 'InternalComplaint',
          component: () => import('../components/HomeContent.vue'), // 内部投诉页面
          meta: { title: '内部投诉', requiresAuth: true }
        },
        {
          path: 'quality/complaint/customer',
          name: 'CustomerComplaint',
          component: () => import('../views/quality/complaint/CustomerComplaint.vue'), // 客户投诉页面
          meta: { title: '客户投诉', requiresAuth: true }
        },
      {
        path: 'quality/rework',
        component: () => import('../views/admin/ReworkManagement.vue'), // 返工管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'quality/person',
        component: () => import('../views/admin/PersonManagement.vue'), // 人员管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'quality/data-management',
        component: () => import('../views/admin/DataManagement.vue'), // 质量异常数据导入页面
        meta: { requiresAuth: true }
      },
      {
        path: 'quality/targets',
        component: () => import('../views/quality/targets/QualityTargets.vue'), // 质量目标管理页面
        meta: { title: '目标管理', requiresAuth: true }
      },

      {
        path: 'quality/targets/:targetId/statistics',
        component: () => import('../views/quality/targets/QualityTargetStatistics.vue'),
        meta: { title: '目标统计数据', requiresAuth: true }
      },

      // 考核记录管理模块
      {
        path: 'quality/assessment',
        redirect: '/admin/quality/assessment/records'
      },
      {
        path: 'quality/assessment/records',
        component: () => import('../views/quality/assessment/AssessmentRecords.vue'),
        meta: { title: '考核记录管理', requiresAuth: true }
      },
      {
        path: 'quality/assessment/improvement',
        component: () => import('../views/quality/assessment/ImprovementTracking.vue'),
        meta: { title: '改善期跟踪', requiresAuth: true }
      },
      {
        path: 'quality/assessment/statistics',
        component: () => import('../views/quality/assessment/AssessmentStatistics.vue'),
        meta: { title: '考核统计分析', requiresAuth: true }
      },

      // 考核记录管理模块 - 兼容数据库中的另一个路径
      {
        path: 'assessment-records',
        redirect: '/admin/assessment-records/improvement'
      },
      {
        path: 'assessment-records/improvement',
        component: () => import('../views/quality/assessment/ImprovementTracking.vue'),
        meta: { title: '改善期跟踪', requiresAuth: true }
      },
      {
        path: 'publishing-exceptions',
        component: () => import('../components/PublishingExceptionsContent.vue'),
        meta: { title: '出版异常', requiresAuth: true }
      },

      // 工作计划管理模块
      {
        path: 'work-plan',
        redirect: '/admin/work-plan/dashboard'
      },
      {
        path: 'work-plan/dashboard',
        component: () => import('../views/admin/work-plan/WorkDashboard.vue'), // 工作台首页
        meta: { title: '工作台', requiresAuth: true }
      },
      {
        path: 'work-plan/plans',
        component: () => import('../views/admin/work-plan/PlanManagement.vue'), // 计划管理页面
        meta: { title: '计划管理', requiresAuth: true }
      },
      {
        path: 'work-plan/logs',
        component: () => import('../views/admin/work-plan/WorkLogs.vue'), // 工作日志页面
        meta: { title: '工作日志', requiresAuth: true }
      },
      {
        path: 'work-plan/progress',
        component: () => import('../views/admin/work-plan/ProgressTracking.vue'), // 进度跟踪页面
        meta: { title: '进度跟踪', requiresAuth: true }
      },
      {
        path: 'work-plan/statistics',
        component: () => import('../views/admin/work-plan/WorkStatistics.vue'),
        meta: { title: '统计分析', requiresAuth: true }
      },
      {
        path: 'work-plan/templates',
        component: () => import('../views/admin/work-plan/PlanTemplates.vue'),
        meta: { title: '计划模板', requiresAuth: true }
      },
      {
        path: 'work-plan/plans/:id',
        component: () => import('../views/admin/work-plan/PlanDetail.vue'),
        meta: { title: '计划详情', requiresAuth: true }
      },

      // 质量成本损失模块
      {
        path: 'copq',
        redirect: '/admin/copq/material-price'
      },
      {
        path: 'copq/material-price',
        component: MaterialPriceList, // 物料单价页面
        meta: { requiresAuth: true }
      },
      {
        path: 'copq/cost-statistics',
        component: () => import('../views/quality/cost/CostStatistics.vue'), // 质量成本统计页面
        meta: { title: '质量成本统计', requiresAuth: true }
      },
      {
        path: 'copq/quality-cost-statistics',
        component: () => import('../views/quality/cost/CostStatistics.vue'), // 质量成本统计页面（数据库菜单路径）
        meta: { title: '质量成本统计', requiresAuth: true }
      },

      // 系统管理模块
      {
        path: 'system',
        redirect: '/admin/system/user'
      },
      {
        path: 'system/user',
        component: UserList, // 用户管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/role',
        component: () => import('../views/admin/RoleManagement.vue'), // 角色管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/menu',
        component: () => import('../views/admin/MenuManagement.vue'), // 菜单管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/dept',
        component: () => import('../views/admin/DepartmentManagement.vue'), // 部门管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/position',
        component: () => import('../views/admin/PositionManagement.vue'), // 岗位管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/config',
        component: () => import('../views/admin/SystemConfig.vue'), // 系统配置页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/erp',
        component: () => import('../views/admin/ErpManagement.vue'), // ERP管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/notices',
        component: () => import('../views/admin/NoticeManagement.vue'), // 通知公告管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/user-permissions',
        component: () => import('../views/UserPermissions.vue'), // 用户权限管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'user-permissions',
        component: () => import('../views/UserPermissions.vue'), // 用户权限管理页面
        meta: { requiresAuth: true }
      },
      {
        path: 'system/logs',
        component: () => import('../views/admin/SystemLogs.vue'),
        meta: { title: '系统日志', requiresAuth: true }
      },
      {
        path: 'system/logs/analytics',
        component: () => import('../views/admin/SystemLogsAnalytics.vue'),
        meta: { title: '日志统计分析', requiresAuth: true }
      },
      {
        path: 'version-updates',
        component: () => import('../views/VersionUpdates.vue'), // 版本更新日志页面
        meta: { title: '版本更新日志', requiresAuth: true }
      },
      {
        path: 'system/accordion-table-example',
        component: () => import('../examples/AccordionTableExample.vue'), // AccordionTable组件示例页面
        meta: { requiresAuth: true }
      },

      // 仪器管理模块
      {
        path: 'instruments',
        redirect: '/admin/instruments/ledger'
      },
      {
        path: 'instruments/list',
        component: () => import('../views/admin/instruments/InstrumentManagement.vue'), // 仪器管理主页面
        meta: { title: '仪器管理', requiresAuth: true }
      },
      {
        path: 'instruments/ledger',
        component: () => import('../views/admin/instruments/InstrumentManagement.vue'), // 仪器台账页面
        meta: { title: '仪器台账', requiresAuth: true }
      },
      {
        path: 'instruments/calibration',
        component: () => import('../views/admin/instruments/InstrumentManagement.vue'), // 校准检定页面
        meta: { title: '校准检定', requiresAuth: true }
      },
      {
        path: 'instruments/annual-plan',
        component: () => import('../views/admin/instruments/InstrumentManagement.vue'), // 年度计划页面
        meta: { title: '年度计划', requiresAuth: true }
      },

      // 二次开发模块
      {
        path: 'development',
        redirect: '/admin/development/structure-components'
      },
      {
        path: 'development/structure-components',
        component: () => import('../views/development/StructureComponents.vue'), // 结构组件页面
        meta: { requiresAuth: true }
      },
      {
        path: 'supplier/list',
        component: () => import('../views/admin/SupplierList.vue'), // 供应商管理页面
        meta: { requiresAuth: true }
      },

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
      },

      // 返工管理页面（懒加载 + 需要认证）
      {
        path: 'rework-management',
        component: () => import('../views/admin/ReworkManagement.vue'),
        meta: { requiresAuth: true }
      },

      // 人员管理页面（懒加载 + 需要认证）
      {
        path: 'person-management',
        component: () => import('../views/admin/PersonManagement.vue'),
        meta: { requiresAuth: true }
      },

      // 部门管理页面（懒加载 + 需要认证）
      {
        path: 'department-management',
        component: () => import('../views/admin/DepartmentManagement.vue'),
        meta: { requiresAuth: true }
      },

      // 岗位管理页面已在 system/position 路径下配置
      // 角色管理页面（懒加载 + 需要认证）
      {
        path: 'role-management',
        component: () => import('../views/admin/RoleManagement.vue'),
        meta: { requiresAuth: true }
      },

      // 菜单管理页面（懒加载 + 需要认证）
      {
        path: 'menu-management',
        component: () => import('../views/admin/MenuManagement.vue'),
        meta: { requiresAuth: true }
      },


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
 * 功能：实现登录验证和权限控制
 *
 * 工作流程：
 * 1. 检查目标路由是否为登录页
 * 2. 如果不是登录页，检查是否有token
 * 3. 对于admin路由，进行权限验证
 * 4. 无token或权限不足时跳转到相应页面
 *
 * 参数说明：
 * - to: 即将进入的目标路由对象
 * - from: 当前导航正要离开的路由对象
 * - next: 控制导航的函数
 */
router.beforeEach(async (to, from, next) => {
  // 从本地存储获取JWT token
  const token = localStorage.getItem('token')

  // 如果访问的不是登录页且没有token，跳转到登录页
  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }

  // 如果访问admin路由，需要进行权限验证
  if (to.path.startsWith('/admin') && token) {
    try {
      // 简化token验证，减少调试输出
      // 动态导入userStore以避免循环依赖
      const { useUserStore } = await import('../store/user')
      const userStore = useUserStore()
      
      // 智能检查用户信息完整性
      const hasBasicInfo = userStore.user && userStore.user.id &&
                          (userStore.user.username || userStore.user.Username)
      const hasCompletePermissions = userStore.user && userStore.user.permissions && 
                                    userStore.user.permissions.menus && 
                                    userStore.user.permissions.menus.length > 0
      const hasFromLocalStorage = localStorage.getItem('user-info')

      // 如果没有基本信息或权限信息不完整，则获取用户资料
      // 添加额外检查：避免在UserDropdown组件挂载时重复调用
      const shouldFetchProfile = (!hasBasicInfo || !hasCompletePermissions) && 
                                !userStore._isFetchingProfile
      
      if (shouldFetchProfile) {
        // 设置标志防止重复调用
        userStore._isFetchingProfile = true
        if (process.env.NODE_ENV === 'development') {
          console.log('=== Router守卫：需要获取用户资料 ===', {
            hasBasicInfo,
            hasCompletePermissions,
            hasFromLocalStorage: !!hasFromLocalStorage,
            当前用户ID: userStore.user?.id,
            菜单权限数量: userStore.user?.permissions?.menus?.length || 0
          });
        }
        try {
          await userStore.fetchProfile()
          
          // 验证获取后的权限数据
          if (process.env.NODE_ENV === 'development') {
            console.log('=== Router守卫：获取用户资料后 ===', {
              用户ID: userStore.user?.id,
              角色数量: userStore.user?.roles?.length || 0,
              菜单权限数量: userStore.user?.permissions?.menus?.length || 0
            });
          }
        } finally {
          // 清除标志
          userStore._isFetchingProfile = false
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('=== Router守卫：用户信息完整，跳过API调用 ===', {
          用户ID: userStore.user.id,
          菜单权限数量: userStore.user.permissions.menus.length
        });
      }
      
      // 暂时允许所有已登录用户访问后台
      next()
    } catch (error) {
      console.error('权限验证失败:', error)
      // 如果是401错误，说明token无效，清除token并跳转到登录页
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token')
      }
      // 权限验证失败，跳转到登录页
      next('/login')
    }
  } else if (to.path.startsWith('/admin') && !token) {
    // 访问admin路由但没有token，直接跳转到登录页
    next('/login')
  } else {
    // 正常放行
    next()
  }
})

// 导出路由实例供main.js使用
export default router