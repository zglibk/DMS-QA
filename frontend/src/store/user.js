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

// 导入Pinia状态管理库
import { defineStore } from 'pinia'
// 导入HTTP请求库
import axios from 'axios'

/**
 * 定义用户状态管理store
 *
 * 参数说明：
 * - 'user': store的唯一标识符
 * - 配置对象：包含state和actions
 */
export const useUserStore = defineStore('user', {
  /**
   * 状态定义
   *
   * 返回一个包含用户信息的对象
   * 所有字段初始值为空字符串
   */
  state: () => ({
    user: {
      Username: '',    // 用户名
      RealName: '',    // 真实姓名
      Avatar: '',      // 头像URL
      Email: '',       // 邮箱地址
      Phone: '',       // 手机号码
      Department: '',  // 部门
      Role: '',        // 角色
      CreatedAt: ''    // 创建时间
    }
  }),

  /**
   * 动作方法
   *
   * 包含异步操作和状态修改的方法
   */
  actions: {
    /**
     * 获取用户资料
     *
     * 功能：从后端API获取当前登录用户的详细信息
     *
     * 工作流程：
     * 1. 从localStorage获取JWT token
     * 2. 发送GET请求到/api/auth/profile
     * 3. 请求头携带Authorization: Bearer <token>
     * 4. 成功时更新store中的用户信息
     */
    async fetchProfile() {
      // 获取认证token
      const token = localStorage.getItem('token')

      // 发送获取用户资料的请求
      const res = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })

      // 检查响应是否成功
      if (res.data.success) {
        // 更新store中的用户信息
        this.user = res.data.data
      }
    },

    /**
     * 设置用户信息
     *
     * 功能：手动更新store中的用户信息
     *
     * 参数：
     * - data: 包含要更新的用户信息的对象
     *
     * 使用展开运算符合并现有数据和新数据
     */
    setUser(data) {
      this.user = { ...this.user, ...data }
    }
  }
})