/**
 * 面包屑导航配置
 * 定义系统中各个路由的面包屑显示规则
 */

export const breadcrumbConfig = {
  // 仪表盘
  '/admin': {
    title: '仪表盘',
    icon: 'Dashboard'
  },
  '/admin/dashboard': {
    title: '仪表盘',
    icon: 'Dashboard'
  },

  // 供应商管理
  '/admin/supplier': {
    title: '供应商管理',
    icon: 'Shop'
  },

  // 供应商列表
  '/admin/supplier/list': {
    title: '供应商列表',
    icon: 'List'
  },

  // 供应商材料价格
  '/admin/supplier/material-price': {
    title: '材料价格',
    icon: 'Money'
  },

  // 供应商基础信息
  '/admin/supplier/basic-info': {
    title: '供应商基础信息',
    icon: 'Document'
  },

  // 原材料供应商
  '/admin/supplier/materials': {
    title: '原材料供应商',
    icon: 'Box'
  },

  // 仪器供应商
  '/admin/supplier/equipment': {
    title: '仪器供应商',
    icon: 'Tools'
  },

  // 供应商质量评估
  '/admin/supplier/quality': {
    title: '供应商质量评估',
    icon: 'Medal'
  },

  // 供应商绩效管理
  '/admin/supplier/performance': {
    title: '供应商绩效管理',
    icon: 'TrendCharts'
  },

  // 供应商合同管理
  '/admin/supplier/contracts': {
    title: '供应商合同管理',
    icon: 'Files'
  },

  // 合格供应商清单
  '/admin/supplier/qualified': {
    title: '合格供应商清单',
    icon: 'CircleCheck'
  },

  // 供应商审核
  '/admin/supplier/audit': {
    title: '供应商审核',
    icon: 'View'
  },

  // 出厂检验报告
  '/admin/supplier/inspection-reports': {
    title: '出厂检验报告',
    icon: 'Document'
  },
  '/admin/supplier/annual-audit-plan': {
    title: '年度审核计划',
    icon: 'Calendar'
  },
  '/admin/supplier/audit-reports': {
    title: '审核报告管理',
    icon: 'Files'
  },

  // 样版管理
  '/admin/sample': {
    title: '样版管理',
    icon: 'Document'
  },
  '/admin/sample/approval': {
    title: '样品承认书',
    icon: 'Document'
  },
  '/admin/sample/color-card': {
    title: '内部色卡',
    icon: 'Picture'
  },

  // 用户管理
  '/admin/user': {
    title: '用户管理',
    icon: 'User'
  },

  // 用户列表
  '/admin/user/list': {
    title: '用户列表',
    icon: 'Grid'
  },

  // 人员管理
  '/admin/person-management': {
    title: '人员管理',
    icon: 'Avatar'
  },

  // 返工管理
  '/admin/rework-management': {
    title: '返工管理',
    icon: 'Tools'
  },

  // 权限管理
  '/admin/permission': {
    title: '权限管理',
    icon: 'Lock'
  },

  // 部门管理
  '/admin/department-management': {
    title: '部门管理',
    icon: 'OfficeBuilding'
  },

  // 岗位管理
  '/admin/position-management': {
    title: '岗位管理',
    icon: 'Briefcase'
  },

  // 角色管理
  '/admin/role-management': {
    title: '角色管理',
    icon: 'UserFilled'
  },

  // 菜单管理
  '/admin/menu-management': {
    title: '菜单管理',
    icon: 'Menu'
  },

  // 角色列表
  '/admin/role-list': {
    title: '角色列表',
    icon: 'User'
  },

  // 权限列表
  '/admin/permission-list': {
    title: '权限列表',
    icon: 'Grid'
  },

  // 设置
  '/admin/settings': {
    title: '设置',
    icon: 'Setting'
  },

  // 数据管理
  '/admin/data-management': {
    title: '数据管理',
    icon: 'Upload'
  },

  // 路径格式分析
  '/admin/path-analysis': {
    title: '路径格式分析',
    icon: 'FolderOpened'
  },

  // 文件拷贝测试
  '/admin/file-copy-test': {
    title: '文件拷贝测试',
    icon: 'CopyDocument'
  },

  // 系统配置
  '/admin/system-config': {
    title: '系统配置',
    icon: 'Setting'
  },

  // 主页卡片配置
  '/admin/home-card-config': {
    title: '主页卡片配置',
    icon: 'Grid'
  },

  // 用户中心
  '/admin/profile': {
    title: '用户中心',
    icon: 'User'
  },

  // 质量管理
  '/admin/quality': {
    title: '质量管理',
    icon: 'Document'
  },

  // 质量指标
  '/admin/quality/metrics': {
    title: '质量指标',
    icon: 'DataAnalysis'
  },

  // 质量异常数据导入
  '/admin/quality/data-management': {
    title: '质量异常数据导入',
    icon: 'Upload'
  },

  // 质量报告
  '/admin/quality/reports': {
    title: '质量报告',
    icon: 'Document'
  },

  // 投诉管理
  '/admin/complaint': {
    title: '投诉管理',
    icon: 'Warning'
  },

  // 质量管理 - 投诉管理
  '/admin/quality/complaint': {
    title: '投诉管理',
    icon: 'Warning'
  },

  // 内部投诉
  '/admin/quality/complaint/internal': {
    title: '内部投诉',
    icon: 'User'
  },

  // 客户投诉
  '/admin/quality/complaint/customer': {
    title: '客户投诉',
    icon: 'Phone'
  },

  // 投诉列表
  '/admin/complaint/list': {
    title: '投诉列表',
    icon: 'List'
  },

  // 投诉分析
  '/admin/complaint/analysis': {
    title: '投诉分析',
    icon: 'DataAnalysis'
  },

  // 材料管理
  '/admin/material': {
    title: '材料管理',
    icon: 'Box'
  },

  // 材料列表
  '/admin/material/list': {
    title: '材料列表',
    icon: 'List'
  },

  // 材料价格
  '/admin/material/price': {
    title: '材料价格',
    icon: 'Money'
  },

  // 生产管理
  '/admin/production': {
    title: '生产管理',
    icon: 'Tools'
  },

  // 质量成本损失
  '/admin/copq': {
    title: '质量成本损失',
    icon: 'Money'
  },

  // 质量成本损失 - 物料单价
  '/admin/copq/material-price': {
    title: '物料单价',
    icon: 'Money'
  },

  // 系统管理
  '/admin/system': {
    title: '系统管理',
    icon: 'Setting'
  },

  // 系统管理 - 用户管理
  '/admin/system/user': {
    title: '用户管理',
    icon: 'User'
  },

  // 系统管理 - 角色管理
  '/admin/system/role': {
    title: '角色管理',
    icon: 'UserFilled'
  },

  // 系统管理 - 菜单管理
  '/admin/system/menu': {
    title: '菜单管理',
    icon: 'Menu'
  },

  // 系统管理 - 部门管理
  '/admin/system/department': {
    title: '部门管理',
    icon: 'OfficeBuilding'
  },

  // 系统管理 - 岗位管理
  '/admin/system/position': {
    title: '岗位管理',
    icon: 'Briefcase'
  },

  // 系统配置
  '/admin/system/config': {
    title: '系统配置',
    icon: 'Setting'
  },

  // 供应商管理
  '/admin/supplier/list': {
    title: '供应商管理',
    icon: 'Briefcase'
  },

  // 二次开发
  '/admin/development': {
    title: '二次开发',
    icon: 'Tools'
  },

  // 二次开发 - 结构组件
  '/admin/development/structure-components': {
    title: '结构组件',
    icon: 'Grid'
  },

  // 工作计划管理
  '/admin/work-plan': {
    title: '工作计划',
    icon: 'Calendar'
  },

  // 工作台
  '/admin/work-plan/dashboard': {
    title: '工作台',
    icon: 'Monitor'
  },

  // 计划管理
  '/admin/work-plan/plans': {
    title: '计划管理',
    icon: 'FileText'
  },

  // 计划详情
  '/admin/work-plan/plans/detail': {
    title: '计划详情',
    icon: 'Document'
  },

  // 工作日志
  '/admin/work-plan/logs': {
    title: '工作日志',
    icon: 'BookOpen'
  },

  // 日志详情
  '/admin/work-plan/logs/detail': {
    title: '日志详情',
    icon: 'Document'
  },

  // 进度跟踪
  '/admin/work-plan/progress': {
    title: '进度跟踪',
    icon: 'TrendingUp'
  },

  // 计划模板
  '/admin/work-plan/templates': {
    title: '计划模板',
    icon: 'Files'
  },

  // 工作提醒
  '/admin/work-plan/reminders': {
    title: '工作提醒',
    icon: 'Bell'
  },

  // 统计分析
  '/admin/work-plan/statistics': {
    title: '统计分析',
    icon: 'DataAnalysis'
  }
}

/**
 * 根据路由路径获取面包屑配置
 * @param {string} path - 当前路由路径
 * @returns {Array} 面包屑配置数组
 */
export function getBreadcrumbConfig(path) {
  const breadcrumbs = []
  
  // 添加根路径
  breadcrumbs.push({
    title: '后台管理',
    path: '/admin',
    icon: 'HomeFilled',
    clickable: true
  })

  // 如果是根路径，直接返回
  if (path === '/admin') {
    breadcrumbs.push({
      title: '系统首页',
      path: '/admin',
      icon: 'HomeFilled',
      clickable: false
    })
    return breadcrumbs
  }
  
  if (path === '/admin/dashboard') {
    breadcrumbs.push({
      title: '仪表盘',
      path: '/admin/dashboard',
      icon: 'Dashboard',
      clickable: false
    })
    return breadcrumbs
  }

  // 查找匹配的配置
  const pathSegments = path.split('/').filter(Boolean)
  let currentPath = ''
  
  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += '/' + pathSegments[i]
    
    // 跳过 /admin 段，因为已经添加了根路径
    if (currentPath === '/admin') {
      continue
    }
    
    // 查找当前路径的配置
    let config = findConfigByPath(currentPath)
    
    // 如果没有找到精确匹配，尝试匹配模式路径（处理动态参数）
    if (!config) {
      config = findPatternConfig(currentPath, pathSegments, i)
    }
    
    if (config) {
      breadcrumbs.push({
        title: config.title,
        path: currentPath,
        icon: config.icon,
        clickable: i < pathSegments.length - 1 // 最后一个不可点击
      })
    } else {
      // 如果没有找到配置，尝试根据路径生成默认标题
      const segment = pathSegments[i]
      const defaultTitle = generateDefaultTitle(segment)
      if (defaultTitle) {
        breadcrumbs.push({
          title: defaultTitle,
          path: currentPath,
          icon: 'Grid',
          clickable: i < pathSegments.length - 1
        })
      }
    }
  }

  return breadcrumbs
}

/**
 * 根据路径段生成默认标题
 * @param {string} segment - 路径段
 * @returns {string} 默认标题
 */
function generateDefaultTitle(segment) {
  const titleMap = {
    'dashboard': '仪表盘',
    'supplier': '供应商管理',
    'sample': '样板管理',
    'user': '用户管理',
    'person': '人员管理',
    'permission': '权限管理',
    'settings': '设置',
    'quality': '质量管理',
    'complaint': '投诉管理',
    'material': '材料管理',
    'production': '生产管理',
    'system': '系统管理',
    'list': '列表',
    'management': '管理',
    'config': '配置',
    'analysis': '分析',
    'reports': '报告',
    'metrics': '指标',
    'price': '价格',
    'role': '角色',
    'menu': '菜单',
    'department': '部门',
    'position': '岗位',
    'rework': '返工管理',
    'dept': '部门管理',
    // 工作计划相关映射
    'work-plan': '工作计划',
    'work': '工作',
    'plan': '计划',
    'plans': '计划管理',
    'logs': '工作日志',
    'log': '日志',
    'progress': '进度跟踪',
    'templates': '计划模板',
    'template': '模板',
    'reminders': '工作提醒',
    'reminder': '提醒',
    'statistics': '统计分析',
    'detail': '详情',
    'create': '创建',
    'edit': '编辑',
    'view': '查看'
  }
  
  return titleMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * 根据路径查找配置
 * @param {string} path - 路径
 * @returns {Object|null} 配置对象
 */
function findConfigByPath(path) {
  // 直接匹配
  if (breadcrumbConfig[path]) {
    return breadcrumbConfig[path]
  }

  // 在子路径中查找
  for (const [parentPath, config] of Object.entries(breadcrumbConfig)) {
    if (config.children && config.children[path]) {
      return config.children[path]
    }
  }

  return null
}

/**
 * 查找模式匹配的配置（处理动态路由参数）
 * @param {string} currentPath - 当前路径
 * @param {Array} pathSegments - 路径段数组
 * @param {number} currentIndex - 当前索引
 * @returns {Object|null} 配置对象
 */
function findPatternConfig(currentPath, pathSegments, currentIndex) {
  // 检查是否是数字ID（动态参数）
  const currentSegment = pathSegments[currentIndex]
  const isNumericId = /^\d+$/.test(currentSegment)
  
  if (isNumericId && currentIndex > 0) {
    // 构建模式路径，将数字ID替换为通用标识
    const patternSegments = [...pathSegments]
    patternSegments[currentIndex] = 'detail'
    const patternPath = '/' + patternSegments.slice(0, currentIndex + 1).join('/')
    
    // 查找模式匹配
    if (breadcrumbConfig[patternPath]) {
      return breadcrumbConfig[patternPath]
    }
    
    // 特殊处理工作计划模块的动态路由
    if (currentPath.includes('/work-plan/')) {
      const baseSegments = pathSegments.slice(0, currentIndex)
      const basePath = '/' + baseSegments.join('/')
      
      // 根据父路径确定详情页类型
      if (basePath.includes('/plans')) {
        return {
          title: '计划详情',
          icon: 'Document'
        }
      } else if (basePath.includes('/logs')) {
        return {
          title: '日志详情',
          icon: 'Document'
        }
      } else if (basePath.includes('/templates')) {
        return {
          title: '模板详情',
          icon: 'Document'
        }
      }
    }
  }
  
  return null
}

/**
 * 获取父级路径配置
 * @param {string} path - 当前路径
 * @returns {Object|null} 父级配置
 */
export function getParentConfig(path) {
  for (const [parentPath, config] of Object.entries(breadcrumbConfig)) {
    if (config.children && config.children[path]) {
      return {
        path: parentPath,
        ...config
      }
    }
  }
  return null
}

export default breadcrumbConfig