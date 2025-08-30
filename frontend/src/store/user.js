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
import { useStorage } from '@vueuse/core'
import apiService from '../services/apiService.js'

// 在store外部定义useStorage实例，确保它们在整个应用生命周期中保持一致
const persistentUserId = useStorage('user-id', null, localStorage)
const persistentToken = useStorage('user-token', null, localStorage)
const persistentUserData = useStorage('user-data', null, localStorage)

// 定义默认用户对象结构
const defaultUser = {
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
}

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      // 用户认证token - 从useStorage获取初始值
      token: persistentToken.value,
      // 未读通知数量
      unreadNoticeCount: 0,
    // 用户信息 - 使用Proxy来监控修改
    user: process.env.NODE_ENV === 'development' ? (() => {
      // 创建用户对象的Proxy包装函数
      const createUserProxy = (userData) => {
        return new Proxy(userData, {
          set(target, property, value, receiver) {
            const oldValue = target[property]
            
            // 防止设置无效的用户ID，但允许从null/undefined恢复为有效数字
            if (property === 'id') {
              // 如果新值是有效数字，允许设置
              if (typeof value === 'number' && value > 0) {
                // 允许设置有效的用户ID
              } else if (value === null || value === undefined) {
                // 允许清空用户ID（登出时）
              } else {
                console.warn('阻止设置无效的用户ID:', value)
                return false // 阻止设置
              }
            }
            
            const result = Reflect.set(target, property, value, receiver)
            
            // 用户ID已修改
            
            return result
          },
          get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver)
            // 用户ID访问记录
            return value
          }
        })
      }
      
      return createUserProxy({ ...defaultUser })
    })() : { ...defaultUser },
    // 缓存的基础数据
    departments: [],
    positions: [],
    roles: [],
    menus: [],

    // 性能优化：缓存相关
    lastFetchTime: 0, // 最后获取用户信息的时间戳
    fetchCacheDuration: 5 * 60 * 1000, // 5分钟缓存时间
    
    // 调试相关
     _lastPermissionLogTime: 0, // 最后一次权限检查日志输出时间
     _userStateHistory: [], // 用户状态变化历史记录
     
     // 并发控制标志
     _isUpdating: false,
     _isFetchingProfile: false, // 是否正在获取用户资料
     _updateQueue: []
    }
  },

   // 添加全局状态监听器（仅在开发环境）
   ...(process.env.NODE_ENV === 'development' ? {
     $onAction: ({ name, store, args, after, onError }) => {
       // Store Action记录
       
       after((result) => {
         // Store Action完成
       })
       
       onError((error) => {
         console.error(`Store Action错误: ${name}`, error.message)
       })
     }
   } : {}),

   // Pinia持久化配置 - 增强版配置，处理并发和序列化问题
   persist: {
    key: 'user-store',
    storage: localStorage,
    paths: ['token', 'user', 'unreadNoticeCount'],
    // 自定义序列化器，处理特殊对象和并发问题
    serializer: {
      serialize: (state) => {
        try {
          // 并发控制：如果正在更新，跳过序列化
          if (state._isUpdating) {
            return localStorage.getItem('user-store') || '{}'
          }
          
          // 清理不需要持久化的字段
          const cleanState = {
            token: state.token,
            user: state.user ? {
              // 确保所有属性都被正确复制，无论是否为Proxy
              id: state.user.id,
              username: state.user.username,
              Username: state.user.Username,
              realName: state.user.realName,
              RealName: state.user.RealName,
              email: state.user.email,
              Email: state.user.Email,
              phone: state.user.phone,
              Phone: state.user.Phone,
              gender: state.user.gender,
              Gender: state.user.Gender,
              birthday: state.user.birthday,
              Birthday: state.user.Birthday,
              address: state.user.address,
              Address: state.user.Address,
              Avatar: state.user.Avatar,
              status: state.user.status,
              Status: state.user.Status,
              lastLoginTime: state.user.lastLoginTime,
              departmentId: state.user.departmentId,
              DepartmentID: state.user.DepartmentID,
              departmentName: state.user.departmentName,
              DepartmentName: state.user.DepartmentName,
              DeptName: state.user.DeptName,
              positionId: state.user.positionId,
              PositionID: state.user.PositionID,
              positionName: state.user.positionName,
              PositionName: state.user.PositionName,
              CreatedAt: state.user.CreatedAt,
              roles: state.user.roles || [],
              permissions: state.user.permissions || { menus: [], departments: [], actions: [] }
            } : null,
            unreadNoticeCount: state.unreadNoticeCount
          }
          
          // 数据完整性检查
          if (cleanState.user && !cleanState.user.id && state.user?.id) {
            cleanState.user.id = state.user.id
          }
          
          return JSON.stringify(cleanState)
        } catch (error) {
          console.error('序列化失败:', error)
          return localStorage.getItem('user-store') || '{}'
        }
      },
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value)
          
          // 数据完整性验证
          if (parsed.user) {
            // 确保权限对象结构完整
            if (!parsed.user.permissions) {
              parsed.user.permissions = { menus: [], departments: [], actions: [] }
            }
            if (!parsed.user.roles) {
              parsed.user.roles = []
            }
            
            // 确保用户ID是有效的数字
            if (parsed.user.id !== null && parsed.user.id !== undefined) {
              parsed.user.id = Number(parsed.user.id)
              if (isNaN(parsed.user.id) || parsed.user.id <= 0) {
                console.warn('反序列化时发现无效的用户ID:', parsed.user.id)
                // 不要重置为null，保持原值或从localStorage重新获取
                const rawData = localStorage.getItem('user-store')
                if (rawData) {
                  try {
                    const rawParsed = JSON.parse(rawData)
                    if (rawParsed.user?.id && Number(rawParsed.user.id) > 0) {
                      parsed.user.id = Number(rawParsed.user.id)
                    }
                  } catch (e) {
                    console.error('从原始数据恢复用户ID失败:', e)
                  }
                }
              }
            }
          }
          
          return parsed
         } catch (error) {
           console.error('反序列化失败:', error)
           // 反序列化失败时，尝试从localStorage获取原始数据
           const rawData = localStorage.getItem('user-store')
           if (rawData) {
             try {
               const rawParsed = JSON.parse(rawData)
               if (rawParsed.user?.id && Number(rawParsed.user.id) > 0) {
                 return {
                   token: rawParsed.token || null,
                   user: {
                     ...rawParsed.user,
                     id: Number(rawParsed.user.id),
                     permissions: rawParsed.user.permissions || { menus: [], departments: [], actions: [] },
                     roles: rawParsed.user.roles || []
                   },
                   unreadNoticeCount: rawParsed.unreadNoticeCount || 0
                 }
               }
             } catch (e) {
               console.error('从原始数据恢复失败:', e)
             }
           }
           
           // 最后的兜底方案：返回空状态但不覆盖现有数据
           return null
         }
      }
    },
    beforeRestore: (context) => {
      // 准备恢复数据
    },
    afterRestore: (context) => {
       const state = context.store.$state
       
       // 数据完整性验证和修复
       if (state.user && !state.user.id) {
         // 尝试从localStorage原始数据中恢复
         try {
           const rawData = localStorage.getItem('user-store')
           if (rawData) {
             const parsed = JSON.parse(rawData)
             if (parsed.user && parsed.user.id && typeof parsed.user.id === 'number' && parsed.user.id > 0) {
               // 创建恢复的用户对象
               const recoveredUser = {
                 ...state.user,
                 ...parsed.user,
                 permissions: parsed.user.permissions || state.user.permissions || {
                   menus: [],
                   departments: [],
                   actions: []
                 }
               }
               
               // 逐个属性更新，避免直接替换整个对象引用
               Object.keys(recoveredUser).forEach(key => {
                 if (key === 'permissions') {
                   // 权限数据需要深度合并
                   if (!state.user.permissions) {
                     state.user.permissions = { menus: [], departments: [], actions: [] }
                   }
                   if (recoveredUser.permissions) {
                     Object.assign(state.user.permissions, recoveredUser.permissions)
                   }
                 } else {
                   // 只更新有效的属性值，避免设置undefined
                   const value = recoveredUser[key]
                   if (value !== undefined && value !== null) {
                     state.user[key] = value
                   }
                 }
               })
             }
           }
         } catch (error) {
           console.error('从localStorage恢复数据失败:', error)
         }
       }
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
      
      // 调试输出（开发环境）
      if (process.env.NODE_ENV === 'development') {
        const matchingMenus = menus.filter(menu => menu.Permission === action)
        console.log(`hasActionPermission("${action}"):`, {
          result: matchingMenus.length > 0,
          matchingMenus,
          totalMenus: menus.length
        })
      }
      
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
      // 检查用户名是否为 admin
      if (state.user?.username === 'admin' || state.user?.Username === 'admin') {
        return true;
      }
      
      // 检查角色是否为管理员
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

    // 获取用户Admin/System权限数量
    adminPermissionCount: (state) => {
      const adminRouteRegex = /^\/admin(\/.*)?$/
      const systemRouteRegex = /^\/system(\/.*)?$/
      const menus = state.user?.permissions?.menus || []
      
      // 统计admin或system路径的权限数量
      const adminMenus = menus.filter(menu => {
        const path = menu.Path || menu.path; // 兼容大小写字段名
        return path && (adminRouteRegex.test(path) || systemRouteRegex.test(path));
      });
      
      return adminMenus.length;
    },

    // 检查用户是否有任何 /admin 路由下的权限（基于权限数量）
    hasAnyAdminPermission: (state) => {
      const adminRouteRegex = /^\/admin(\/.*)?$/
      const systemRouteRegex = /^\/system(\/.*)?$/
      const menus = state.user?.permissions?.menus || []
      
      // 直接检查是否有admin或system路径的权限，避免循环引用
      return menus.some(menu => {
        const path = menu.Path || menu.path; // 兼容大小写字段名
        return path && (adminRouteRegex.test(path) || systemRouteRegex.test(path));
      });
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

        // 如果从localStorage恢复了完整的用户信息（包括权限），也跳过API调用
        const hasCompletePermissions = this.user.roles && this.user.roles.length > 0 && 
                                      this.user.permissions && this.user.permissions.menus && 
                                      this.user.permissions.menus.length > 0
        
        if (!forceRefresh && hasUsername && hasCompletePermissions) {

          this.lastFetchTime = Date.now() // 更新缓存时间
          return { success: true, data: this.user }
        }
        


        const response = await apiService.get('/auth/profile')

        if (response.data.success) {
          const userData = response.data.data
          

          
          // 设置基本用户信息 - 使用setUser方法确保响应式更新
          // 排除权限字段，避免覆盖已获取的权限数据
          // 保留当前的权限和角色数据，只更新基本信息
          const currentPermissions = this.user?.permissions || { menus: [], departments: [], actions: [] }
          const currentRoles = this.user?.roles || []
          
          const newUserData = {
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
          
          // 先获取用户角色和权限信息
          await this.fetchUserRolesAndPermissions(userData.ID)
          
          // 然后设置基本用户信息，保留已获取的权限数据
          // 合并当前权限数据和新的基本信息
          const finalUserData = {
            ...newUserData,
            permissions: this.user?.permissions || currentPermissions,
            roles: this.user?.roles || currentRoles
          }
          
          this.setUser(finalUserData)
          
          // 权限信息已更新，pinia-plugin-persistedstate 会自动持久化

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
          console.log('⚠️ fetchUserRolesAndPermissions - 用户ID不存在:', {
            传入的userId: userId,
            当前用户ID: this.user?.id
          })
          
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
          


          // 权限数据已更新，pinia-plugin-persistedstate 会自动持久化
        }
      } catch (error) {
        console.error('获取用户权限失败:', error)
        
        // 如果是401错误，说明token已失效，不需要额外处理
        // 响应拦截器会自动处理token清除和跳转
        if (error.response?.status === 401) {
          // token失效，静默处理
          return
        }
        
        // 对于其他错误，保持现有权限数据不变，避免清空已有权限
        // 只在权限数据完全不存在时才设置默认值
        if (!this.user.roles) {
          this.user.roles = []
        }
        if (!this.user.permissions) {
          this.user.permissions = {
            menus: [],
            departments: [],
            actions: []
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('权限获取失败，保持现有权限数据:', {
            角色数量: this.user.roles?.length || 0,
            菜单权限数量: this.user.permissions?.menus?.length || 0
          });
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

    // 手动设置用户信息（增强并发控制）
    setUser(userData) {
      const currentTime = new Date().toLocaleTimeString()
      
      // 并发控制：防止同时更新
      if (this._isUpdating) {
        this._updateQueue.push(() => this.setUser(userData))
        return
      }
      
      this._isUpdating = true
      
      try {
      // 保护权限数据，避免被意外清空
      const currentPermissions = this.user.permissions || {
        menus: [],
        departments: [],
        actions: []
      }
      
      // 如果传入的userData包含permissions，则使用新的权限数据
      // 否则保留当前的权限数据
      const newPermissions = userData.permissions || currentPermissions
      

      
      // 数据完整性验证 - 确保关键字段不为undefined
      const safeUserData = {
        ...this.user,
        ...userData,
        permissions: newPermissions
      }
      
      // 关键字段保护 - 防止undefined值覆盖有效数据
      if (userData.id === undefined && this.user?.id !== undefined) {
        safeUserData.id = this.user.id
      }
      
      if (userData.username === undefined && this.user?.username !== undefined) {
        safeUserData.username = this.user.username
      }
      
      // 使用useStorage自动同步到localStorage
      persistentUserData.value = safeUserData
      
      // 同时更新用户ID的独立存储
      if (safeUserData && safeUserData.id) {
        persistentUserId.value = safeUserData.id
      }
      

      
      // 直接设置用户数据，避免Proxy导致的响应式问题
      this.user = safeUserData
      
      // 检查设置后的用户数据完整性
      this._checkUserDataIntegrity('setUser调用后')
      
      } finally {
        // 释放并发锁
        this._isUpdating = false
        
        // 处理队列中的更新
        if (this._updateQueue.length > 0) {
          const nextUpdate = this._updateQueue.shift()
          setTimeout(nextUpdate, 0)
        }
      }
    },

    // 更新用户权限
    updateUserPermissions(permissions) {
      this.user.permissions = { ...this.user.permissions, ...permissions }
    },

    // 设置token
    setToken(token) {
      // 使用useStorage自动同步到localStorage
      persistentToken.value = token
      this.token = token
      // 同时保存到localStorage以供API请求使用
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    // 清除用户信息（登出时使用）
    clearUser() {
      const currentTime = new Date().toLocaleTimeString()
      const callStack = new Error().stack
      
      // 并发控制：防止同时更新
      if (this._isUpdating) {
        this._updateQueue.push(() => this.clearUser())
        return
      }
      
      this._isUpdating = true
      
      try {
        // 分析调用来源（简化日志，避免响应式循环）
        const stackLines = callStack.split('\n')
        const callerLine = stackLines.find(line => 
          line.includes('.vue') || 
          line.includes('router') || 
          line.includes('interceptor') ||
          line.includes('apiService')
        )
        if (callerLine) {
          // clearUser调用来源记录
        }
        
        // 开始清除用户数据
        
        // 使用useStorage清除持久化数据
        persistentUserData.value = null
        persistentToken.value = null
        persistentUserId.value = null
        
        this.token = null
        
        // 直接重置用户数据，避免Proxy导致的响应式问题
        this.user = {
          id: null,
          username: '',
          roles: [],
          permissions: {
            menus: [],
            departments: [],
            actions: []
          }
        }
        
        this.unreadNoticeCount = 0
        
        // 清除localStorage中的token
        localStorage.removeItem('token')
        
      } finally {
        // 释放并发锁
        this._isUpdating = false
        
        // 处理队列中的更新
        if (this._updateQueue.length > 0) {
          const nextUpdate = this._updateQueue.shift()
          setTimeout(nextUpdate, 0)
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
    },

    /**
     * 刷新通知数据
     * 功能：重新获取未读通知数量，用于通知内容更新后的实时刷新
     */
    async refreshNotifications() {
      try {
        await this.fetchUnreadNoticeCount()
        // 触发全局事件，通知AdminNotificationBell组件刷新通知列表
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('refreshNotifications'))
        }
      } catch (error) {
        console.error('刷新通知数据失败:', error)
      }
    },

    /**
     * 记录用户状态变化历史（调试用）
     * @param {string} action - 操作类型
     * @param {object} details - 详细信息
     */
    _recordUserStateChange(action, details) {
      const record = {
        时间: new Date().toLocaleTimeString(),
        操作: action,
        详情: details,
        时间戳: Date.now()
      }
      
      this._userStateHistory.push(record)
      
      // 只保留最近50条记录
      if (this._userStateHistory.length > 50) {
        this._userStateHistory.shift()
      }
      
      // 记录用户状态变化
    },

    /**
     * 检查用户数据完整性的方法
     * @param {string} context - 检查上下文
     */
    _checkUserDataIntegrity(context = '') {
      // 检查用户数据完整性
      const hasUser = !!this.user
      const hasUserId = !!(this.user?.id)
      const hasPermissions = !!this.user?.permissions
      
      return {
        hasUser,
        hasUserId,
        hasPermissions
      }
    },

    /**
     * 获取用户状态变化历史（调试用）
     */
    getUserStateHistory() {
      return this._userStateHistory
    },

    /**
     * 启动数据完整性监控（开发环境）
     */
    startDataIntegrityMonitor() {
      if (process.env.NODE_ENV !== 'development') return
      
      // 每30秒检查一次数据完整性
      const checkInterval = setInterval(() => {
        this._checkUserDataIntegrity('定期检查')
        
        // 如果发现数据异常，尝试修复
        if (this.user && !this.user.id && this.token) {
          try {
            const rawData = localStorage.getItem('user-store')
            if (rawData) {
              const parsed = JSON.parse(rawData)
              if (parsed.user && parsed.user.id) {
                // 避免直接替换用户对象，而是更新属性以防止触发响应式监听器
                const recoveredData = parsed.user
                
                // 只更新有效的用户ID
                if (recoveredData.id && typeof recoveredData.id === 'number') {
                  this.user.id = recoveredData.id
                }
                
                // 恢复其他用户属性（如果存在且有效）
                if (recoveredData.username) this.user.username = recoveredData.username
                if (recoveredData.Username) this.user.Username = recoveredData.Username
                if (recoveredData.realName) this.user.realName = recoveredData.realName
                if (recoveredData.RealName) this.user.RealName = recoveredData.RealName
                
                // 恢复权限数据
                if (recoveredData.permissions) {
                  this.user.permissions = {
                    menus: recoveredData.permissions.menus || [],
                    departments: recoveredData.permissions.departments || [],
                    actions: recoveredData.permissions.actions || []
                  }
                }
                
                // 恢复角色数据
                if (recoveredData.roles && Array.isArray(recoveredData.roles)) {
                  this.user.roles = recoveredData.roles
                }
              }
            }
          } catch (error) {
            console.error('定期检查中恢复数据失败:', error)
          }
        }
      }, 30000) // 30秒检查一次
      
      // 保存定时器引用以便清理
      this._integrityCheckTimer = checkInterval
    },

    /**
     * 停止数据完整性监控
     */
    stopDataIntegrityMonitor() {
      if (this._integrityCheckTimer) {
        clearInterval(this._integrityCheckTimer)
        this._integrityCheckTimer = null
      }
    },


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