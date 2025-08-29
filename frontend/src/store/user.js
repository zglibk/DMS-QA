/**
 * 用户状态管理 Store
 *
 * 功能说明：
 * 1. 管理当前登录用户的信息
 * 2. 提供获取用户资料的方法
 * 3. 提供更新用户信息的方法
 *
 * 使用Pinia状态管理库，相比Vuex更简洁易用
 *
 * 使用方式：
 * import { useUserStore } from '@/store/user'
 * const userStore = useUserStore()
 */

import { defineStore } from 'pinia'
import apiService from '../services/apiService.js'

export const useUserStore = defineStore('user', {
  state: () => {
    // 从localStorage恢复用户信息
    const savedUser = localStorage.getItem('user-info')
    let restoredUser = null

    try {
      restoredUser = savedUser ? JSON.parse(savedUser) : null
      // 静默恢复用户信息，减少调试输出
    } catch (error) {
      localStorage.removeItem('user-info')
    }

    return {
      // 用户认证token
      token: localStorage.getItem('token') || null,
      // 未读通知数量
      unreadNoticeCount: 0,
    user: restoredUser || {
      id: null,
      username: '',
      Username: '', // 兼容后端字段
      realName: '',
      RealName: '', // 兼容后端字段
      email: '',
      Email: '', // 兼容后端字段
      phone: '',
      Phone: '', // 兼容后端字段
      gender: '',
      Gender: '', // 兼容后端字段
      birthday: null,
      Birthday: null, // 兼容后端字段
      address: '',
      Address: '', // 兼容后端字段
      Avatar: '',
      status: 1,
      Status: 1, // 兼容后端字段
      lastLoginTime: null, // 最后登录时间
      // 部门信息
      departmentId: null,
      DepartmentID: null, // 兼容后端字段
      departmentName: '',
      DepartmentName: '', // 兼容后端字段
      // 岗位信息
      positionId: null,
      PositionID: null, // 兼容后端字段
      positionName: '',
      PositionName: '', // 兼容后端字段
      CreatedAt: null, // 后端字段
      // 角色信息（支持多角色）
      roles: [],
      // 权限信息
      permissions: {
        menus: [], // 用户可访问的菜单列表
        departments: [], // 用户可管理的部门列表
        actions: [] // 用户可执行的操作权限
      }
    },
    // 缓存的基础数据
    departments: [],
    positions: [],
    roles: [],
    menus: [],

    // 性能优化：缓存相关
    lastFetchTime: 0, // 最后获取用户信息的时间戳
    fetchCacheDuration: 5 * 60 * 1000 // 5分钟缓存时间
    }
  },

  getters: {
    // 获取用户的所有角色ID
    userRoleIds: (state) => (state.user?.roles || []).map(role => role.ID || role.id),

    // 获取用户的所有角色名称
    userRoleNames: (state) => (state.user?.roles || []).map(role => role.Name || role.name),

    // 检查用户是否有特定角色
    hasRole: (state) => (roleName) => {
      return (state.user?.roles || []).some(role => (role.Name || role.name) === roleName)
    },

    // 检查用户是否有特定菜单权限
    hasMenuPermission: (state) => (menuPath) => {
      return (state.user?.permissions?.menus || []).some(menu => menu.path === menuPath)
    },

    // 检查用户是否有特定操作权限
    hasActionPermission: (state) => (action) => {
      // 从菜单权限中提取Permission字段进行匹配
      const menus = state.user?.permissions?.menus || []
      return menus.some(menu => menu.Permission === action)
    },

    // 检查用户是否有特定操作权限（支持用户级权限优先级）
    hasActionPermissionAsync: (state) => async (action) => {
      try {
        // 如果是管理员，直接返回true
        if ((state.user?.roles || []).some(role => 
          role.name === 'admin' || role.name === '系统管理员' ||
          role.Name === 'admin' || role.Name === '系统管理员' ||
          role.code === 'admin' || role.Code === 'admin'
        )) {
          return true
        }

        // 调用后端API检查完整权限（包括用户级权限优先级）
        const response = await apiService.get(`/auth/check-permission/${encodeURIComponent(action)}`)
        if (response.data.success) {
          return response.data.data.hasPermission
        }
        
        // API调用失败时，回退到本地权限检查
        const menus = state.user?.permissions?.menus || []
        return menus.some(menu => menu.Permission === action)
      } catch (error) {
        console.warn('权限检查API调用失败，使用本地权限检查:', error)
        // API调用失败时，回退到本地权限检查
        const menus = state.user?.permissions?.menus || []
        return menus.some(menu => menu.Permission === action)
      }
    },

    // 获取用户可访问的菜单树
    accessibleMenus: (state) => {
      return buildMenuTree(state.user?.permissions?.menus || [])
    },

    // 检查是否为管理员
    isAdmin: (state) => {
      return (state.user?.roles || []).some(role => 
        (role.Name || role.name) === 'admin' || 
        (role.Name || role.name) === '系统管理员'
      )
    },

    // 通用权限检查方法
    hasPermission: (state) => (permission) => {
      // 检查是否为管理员，管理员拥有所有权限
      // 兼容不同的字段名格式：name/Name, code/Code
      if ((state.user?.roles || []).some(role => 
        role.name === 'admin' || role.name === '系统管理员' ||
        role.Name === 'admin' || role.Name === '系统管理员' ||
        role.code === 'admin' || role.Code === 'admin'
      )) {
        return true
      }
      
      // 检查菜单权限中是否包含该权限
      const menus = state.user?.permissions?.menus || []
      return menus.some(menu => {
        // 检查菜单的Permission字段
        if (menu.Permission === permission) {
          return true
        }
        // 检查菜单代码是否匹配权限
        if (menu.MenuCode && permission.includes(menu.MenuCode)) {
          return true
        }
        // 检查路径是否匹配权限
        if (menu.path && permission.includes(menu.path.replace('/', ''))) {
          return true
        }
        return false
      })
    },

    // 检查用户是否有任何 /admin 路由下的权限（使用正则表达式）
    hasAnyAdminPermission: (state) => {
      const adminRouteRegex = /^\/admin(\/.*)?$/
      return (state.user?.permissions?.menus || []).some(menu => 
        menu.path && adminRouteRegex.test(menu.path)
      )
    }
  },

  actions: {
    /**
     * 获取用户完整资料（包含权限信息）
     * 优化逻辑，避免重复API调用导致token失效
     */
    async fetchProfile(forceRefresh = false) {
      try {
        // 减少调试输出，只在强制刷新时输出

        // 检查缓存是否有效
        const now = Date.now()
        const cacheValid = !forceRefresh &&
                          this.lastFetchTime > 0 &&
                          (now - this.lastFetchTime) < this.fetchCacheDuration

        // 如果用户信息已存在且缓存有效，则跳过获取
        const hasUsername = this.user && this.user.id && (this.user.username || this.user.Username)
        if (cacheValid && hasUsername) {
          // 仅在权限信息缺失时获取权限
          if (!this.user.roles || this.user.roles.length === 0 ||
              !this.user.permissions || !this.user.permissions.menus) {
            await this.fetchUserRolesAndPermissions(this.user.id)
          }
          return { success: true, data: this.user }
        }

        // 如果从localStorage恢复了完整的用户信息，也跳过API调用
        if (!forceRefresh && hasUsername && this.user.roles && this.user.roles.length > 0) {
          this.lastFetchTime = Date.now() // 更新缓存时间
          return { success: true, data: this.user }
        }

        const response = await apiService.get('/auth/profile')

        if (response.data.success) {
          const userData = response.data.data
          
          // 设置基本用户信息 - 使用setUser方法确保响应式更新
          const newUserData = {
            ...this.user,
            id: userData.ID,
            username: userData.Username, // 将后端的Username映射到前端的username
            Username: userData.Username, // 保留原字段以兼容现有代码
            realName: userData.RealName,
            RealName: userData.RealName, // 保留原字段以兼容现有代码
            email: userData.Email,
            Email: userData.Email, // 保留原字段以兼容现有代码
            phone: userData.Phone,
            Phone: userData.Phone, // 保留原字段以兼容现有代码
            gender: userData.Gender,
            Gender: userData.Gender, // 保留原字段以兼容现有代码
            birthday: userData.Birthday,
            Birthday: userData.Birthday, // 保留原字段以兼容现有代码
            address: userData.Address,
            Address: userData.Address, // 保留原字段以兼容现有代码
            Avatar: userData.Avatar,
            status: userData.Status,
            Status: userData.Status, // 保留原字段以兼容现有代码
            departmentId: userData.DepartmentID,
            DepartmentID: userData.DepartmentID, // 保留原字段以兼容现有代码
            departmentName: userData.DepartmentName,
            DepartmentName: userData.DepartmentName, // 保留原字段以兼容现有代码
            positionId: userData.PositionID,
            PositionID: userData.PositionID, // 保留原字段以兼容现有代码
            positionName: userData.PositionName,
            PositionName: userData.PositionName, // 保留原字段以兼容现有代码
            CreatedAt: userData.CreatedAt
          }
          
          // 使用setUser方法确保响应式更新
          this.setUser(newUserData)
          
          // 获取用户角色和权限信息
          await this.fetchUserRolesAndPermissions(userData.ID)

          // 更新缓存时间
          this.lastFetchTime = Date.now()
        }
        return response.data
      } catch (error) {
        throw error
      }
    },

    /**
     * 获取用户角色和权限信息
     * 增强错误处理，避免401错误导致token被清除
     */
    async fetchUserRolesAndPermissions(userId = null) {
      try {
        // 使用传入的userId或当前用户ID，确保ID存在
        const targetUserId = userId || this.user.id
        if (!targetUserId) {
          // 设置默认权限结构
          this.user.roles = []
          this.user.permissions = {
            menus: [],
            departments: [],
            actions: []
          }
          return
        }

        const response = await apiService.get(`/auth/user/${targetUserId}/roles-permissions`)
        if (response.data.success) {
          const data = response.data.data
          
          this.user.roles = data.roles || []
          this.user.permissions = {
            menus: data.menus || data.permissions || [],
            departments: data.departments || [],
            actions: data.actions || []
          }      

          // 保存更新后的用户信息（包含权限）到localStorage
          try {
            localStorage.setItem('user-info', JSON.stringify(this.user))
          } catch (error) {
            // 静默处理保存失败
          }
        }
      } catch (error) {
        console.error('获取用户权限失败:', error)
        
        // 如果是401错误，说明token已失效，不需要额外处理
        // 响应拦截器会自动处理token清除和跳转
        if (error.response?.status === 401) {
          // token失效，静默处理
          return
        }
        
        // 对于其他错误，设置默认权限，避免影响用户体验
        this.user.roles = []
        this.user.permissions = {
          menus: [],
          departments: [],
          actions: []
        }
      }
    },

    // 获取所有部门列表
    async fetchDepartments() {
      try {
        const response = await apiService.get('/departments')
        if (response.data.success) {
          this.departments = response.data.data
        }
        return response.data
      } catch (error) {
        console.error('获取部门列表失败:', error)
        throw error
      }
    },

    // 获取所有岗位列表
    async fetchPositions() {
      try {
        const response = await apiService.get('/positions')
        if (response.data.success) {
          this.positions = response.data.data
        }
        return response.data
      } catch (error) {
        console.error('获取岗位列表失败:', error)
        throw error
      }
    },

    // 获取所有角色列表
    async fetchRoles() {
      try {
        const response = await apiService.get('/roles')
        if (response.data.success) {
          this.roles = response.data.data
        }
        return response.data
      } catch (error) {
        console.error('获取角色列表失败:', error)
        throw error
      }
    },

    // 获取所有菜单列表
    async fetchMenus() {
      try {
        const response = await apiService.get('/menus')
        if (response.data.success) {
          this.menus = response.data.data
        }
        return response.data
      } catch (error) {
        console.error('获取菜单列表失败:', error)
        throw error
      }
    },

    // 初始化基础数据
    async initializeBaseData() {
      try {
        await Promise.all([
          this.fetchDepartments(),
          this.fetchPositions(),
          this.fetchRoles(),
          this.fetchMenus()
        ])
      } catch (error) {
        console.error('初始化基础数据失败:', error)
      }
    },

    // 手动设置用户信息
    setUser(userData) {
      // 完全替换user对象以确保响应式更新
      this.user = { ...this.user, ...userData }

      // 保存用户信息到localStorage以支持页面刷新后恢复
      try {
        localStorage.setItem('user-info', JSON.stringify(this.user))
      } catch (error) {
        // 静默处理保存失败
      }
    },

    // 更新用户权限
    updateUserPermissions(permissions) {
      this.user.permissions = { ...this.user.permissions, ...permissions }
    },

    // 设置token
    setToken(token) {
      this.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    // 清除用户信息（登出时使用）
    clearUser() {
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user-info') // 清除用户信息缓存
      this.user = {
        id: null,
        username: '',
        Username: '',
        realName: '',
        RealName: '',
        email: '',
        Email: '',
        phone: '',
        Phone: '',
        gender: '',
        Gender: '',
        birthday: null,
        Birthday: null,
        address: '',
        Address: '',
        Avatar: '',
        status: 1,
        Status: 1,
        lastLoginTime: null,
        departmentId: null,
        DepartmentID: null,
        departmentName: '',
        DepartmentName: '',
        positionId: null,
        PositionID: null,
        positionName: '',
        PositionName: '',
        CreatedAt: null,
        roles: [],
        permissions: {
          menus: [],
          departments: [],
          actions: []
        }
      }
    },

    // 根据部门ID获取部门名称
    getDepartmentName(departmentId) {
      const department = this.departments.find(dept => dept.id === departmentId)
      return department ? department.name : ''
    },

    // 根据岗位ID获取岗位名称
    getPositionName(positionId) {
      const position = this.positions.find(pos => pos.id === positionId)
      return position ? position.name : ''
    },

    // 根据角色ID获取角色名称
    getRoleName(roleId) {
      const role = this.roles.find(r => r.id === roleId)
      return role ? role.name : ''
    },

    /**
     * 获取用户显示名称
     * 功能：优先显示用户姓名，没有姓名时显示用户名
     * @returns {string} 用户显示名称
     */
    getUserDisplayName() {
      return this.user?.RealName || this.user?.realName || this.user?.Username || this.user?.username || '用户'
    },

    /**
     * 获取未读通知数量
     * 功能：从后端API获取当前用户的未读通知数量并更新全局状态
     */
    async fetchUnreadNoticeCount() {
      try {
        const response = await apiService.get('/notice/unread/count')
        if (response.data.success) {
          this.unreadNoticeCount = response.data.data?.unreadCount || 0
        }
        return this.unreadNoticeCount
      } catch (error) {
        console.error('获取未读通知数量失败:', error)
        this.unreadNoticeCount = 0
        return 0
      }
    },

    /**
     * 更新未读通知数量
     * 功能：手动设置未读通知数量（用于实时更新）
     */
    setUnreadNoticeCount(count) {
      this.unreadNoticeCount = count || 0
    },

    /**
     * 减少未读通知数量
     * 功能：当标记通知为已读时调用
     */
    decreaseUnreadNoticeCount(count = 1) {
      this.unreadNoticeCount = Math.max(0, this.unreadNoticeCount - count)
    },

    /**
     * 清零未读通知数量
     * 功能：当全部标记为已读时调用
     */
    clearUnreadNoticeCount() {
      this.unreadNoticeCount = 0
    }
  }
})

// 辅助函数：构建菜单树结构
function buildMenuTree(menus) {
  const menuMap = new Map()
  const rootMenus = []

  // 创建菜单映射
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] })
  })

  // 构建树结构
  menus.forEach(menu => {
    const menuItem = menuMap.get(menu.id)
    if (menu.parentId && menuMap.has(menu.parentId)) {
      menuMap.get(menu.parentId).children.push(menuItem)
    } else {
      rootMenus.push(menuItem)
    }
  })

  return rootMenus
}