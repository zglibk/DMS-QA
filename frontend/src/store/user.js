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
  state: () => ({
    // 用户认证token
    token: localStorage.getItem('token') || null,
    user: {
      id: null,
      username: '',
      realName: '',
      email: '',
      phone: '',
      gender: '',
      birthday: null,
      address: '',
      avatar: '',
      status: 1,
      lastLoginTime: null, // 最后登录时间
      // 部门信息
      departmentId: null,
      departmentName: '',
      // 岗位信息
      positionId: null,
      positionName: '',
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
    menus: []
  }),

  getters: {
    // 获取用户的所有角色ID
    userRoleIds: (state) => (state.user?.roles || []).map(role => role.id),

    // 获取用户的所有角色名称
    userRoleNames: (state) => (state.user?.roles || []).map(role => role.name),

    // 检查用户是否有特定角色
    hasRole: (state) => (roleName) => {
      return (state.user?.roles || []).some(role => role.name === roleName)
    },

    // 检查用户是否有特定菜单权限
    hasMenuPermission: (state) => (menuPath) => {
      return (state.user?.permissions?.menus || []).some(menu => menu.path === menuPath)
    },

    // 检查用户是否有特定操作权限
    hasActionPermission: (state) => (action) => {
      return (state.user?.permissions?.actions || []).includes(action)
    },

    // 获取用户可访问的菜单树
    accessibleMenus: (state) => {
      return buildMenuTree(state.user?.permissions?.menus || [])
    },

    // 检查是否为管理员
    isAdmin: (state) => {
      return (state.user?.roles || []).some(role => role.name === 'admin' || role.name === '系统管理员')
    }
  },

  actions: {
    /**
     * 获取用户完整资料（包含权限信息）
     * 优化逻辑，避免重复API调用导致token失效
     */
    async fetchProfile(forceRefresh = false) {
      try {
        // 如果用户信息已存在且不强制刷新，则跳过基本信息获取
        if (!forceRefresh && this.user && this.user.id && this.user.username) {
          console.log('用户基本信息已存在，跳过重复获取')
          // 仅在权限信息缺失时获取权限
          if (!this.user.roles || this.user.roles.length === 0) {
            await this.fetchUserRolesAndPermissions(this.user.id)
          }
          return { success: true, data: this.user }
        }

        const response = await apiService.get('/api/auth/profile')
        if (response.data.success) {
          const userData = response.data.data
          
          // 设置基本用户信息
          this.user = {
            ...this.user,
            id: userData.id,
            username: userData.username,
            realName: userData.realName,
            email: userData.email,
            phone: userData.phone,
            gender: userData.gender,
            birthday: userData.birthday,
            address: userData.address,
            avatar: userData.avatar,
            status: userData.status,
            departmentId: userData.departmentId,
            departmentName: userData.departmentName,
            positionId: userData.positionId,
            positionName: userData.positionName
          }
          
          // 获取用户角色和权限信息
          await this.fetchUserRolesAndPermissions(userData.id)
        }
        return response.data
      } catch (error) {
        console.error('获取用户资料失败:', error)
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
          console.warn('用户ID不存在，无法获取权限信息')
          // 设置默认权限结构
          this.user.roles = []
          this.user.permissions = {
            menus: [],
            departments: [],
            actions: []
          }
          return
        }

        const response = await apiService.get(`/api/auth/user/${targetUserId}/roles-permissions`)
        if (response.data.success) {
          const data = response.data.data
          console.log('获取到的权限数据:', data)
          
          this.user.roles = data.roles || []
          this.user.permissions = {
            menus: data.menus || data.permissions || [],
            departments: data.departments || [],
            actions: data.actions || []
          }
          
          console.log('设置的用户权限:', this.user.permissions)
          console.log('菜单权限数量:', this.user.permissions.menus.length)
        }
      } catch (error) {
        console.error('获取用户权限失败:', error)
        
        // 如果是401错误，说明token已失效，不需要额外处理
        // 响应拦截器会自动处理token清除和跳转
        if (error.response?.status === 401) {
          console.log('权限验证失败，token可能已失效')
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
        const response = await apiService.get('/api/departments')
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
        const response = await apiService.get('/api/positions')
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
        const response = await apiService.get('/api/roles')
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
        const response = await apiService.get('/api/menus')
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
      this.user = { ...this.user, ...userData }
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
      this.user = {
        id: null,
        username: '',
        realName: '',
        email: '',
        phone: '',
        gender: '',
        birthday: null,
        address: '',
        avatar: '',
        status: 1,
        lastLoginTime: null,
        departmentId: null,
        departmentName: '',
        positionId: null,
        positionName: '',
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