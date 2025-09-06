/**
 * API 统一导入入口
 * 功能：提供统一的API接口导入，支持token自动刷新
 * 版本：v2.0
 * 创建日期：2025-08-01
 * 更新日期：2025-09-05
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'

// Token刷新状态管理
let isRefreshing = false
let failedQueue = []

/**
 * 处理队列中的请求
 * @param {Error|null} error - 错误对象
 * @param {string|null} token - 新的token
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

/**
 * 检查token是否即将过期（剩余时间少于5分钟）
 * @param {string} token - JWT token
 * @returns {boolean} 是否需要刷新
 */
const shouldRefreshToken = (token) => {
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = payload.exp - currentTime
    
    // 如果剩余时间少于5分钟（300秒），需要刷新
    return timeUntilExpiry < 300 && timeUntilExpiry > 0
  } catch (error) {
    console.error('解析token失败:', error)
    return false
  }
}

/**
 * 刷新token
 * @returns {Promise<string>} 新的token
 */
const refreshToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh-token', {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.data.success && response.data.token) {
      const newToken = response.data.token
      localStorage.setItem('token', newToken)
      return newToken
    } else {
      throw new Error('Token刷新失败')
    }
  } catch (error) {
    console.error('Token刷新失败:', error)
    throw error
  }
}

/**
 * 保存当前页面状态到sessionStorage
 * 包含用户身份信息，确保只有同一用户才能恢复状态
 */
const savePageState = () => {
  try {
    // 从token中获取用户ID
    const token = localStorage.getItem('token')
    let userId = null
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.id // JWT token中用户ID字段名为'id'
      } catch (error) {
        console.warn('解析token中的用户ID失败:', error)
      }
    }
    
    const pageState = {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      timestamp: Date.now(),
      userId: userId // 保存用户ID用于验证
    }
    sessionStorage.setItem('pageStateBeforeLogin', JSON.stringify(pageState))
  } catch (error) {
    console.error('保存页面状态失败:', error)
  }
}

/**
 * 恢复页面状态
 * 验证用户身份，确保只有同一用户才能恢复状态
 * @param {string} currentUserId - 当前登录用户的ID
 * @returns {string|null} 要恢复的页面路径，如果验证失败或无状态则返回null
 */
export const restorePageState = (currentUserId = null) => {
  try {
    const savedState = sessionStorage.getItem('pageStateBeforeLogin')
    if (savedState) {
      const pageState = JSON.parse(savedState)
      
      // 如果没有提供当前用户ID，尝试从token中获取
      if (!currentUserId) {
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
           currentUserId = payload.id // JWT token中用户ID字段名为'id'
          } catch (error) {
            console.warn('解析当前token中的用户ID失败:', error)
          }
        }
      }
      
      // 验证用户身份：只有同一用户才能恢复状态
      if (pageState.userId && currentUserId && pageState.userId !== currentUserId) {
        console.log('用户身份不匹配，清除之前用户的页面状态')
        sessionStorage.removeItem('pageStateBeforeLogin')
        return null
      }
      
      // 检查状态是否在合理时间内（避免恢复过期状态）
      const timeDiff = Date.now() - pageState.timestamp
      if (timeDiff < 30 * 60 * 1000) { // 30分钟内有效
        sessionStorage.removeItem('pageStateBeforeLogin')
        return pageState.pathname + pageState.search + pageState.hash
      } else {
        // 状态过期，清除
        sessionStorage.removeItem('pageStateBeforeLogin')
        console.log('页面状态已过期，已清除')
      }
    }
  } catch (error) {
    console.error('恢复页面状态失败:', error)
    // 发生错误时清除可能损坏的状态
    sessionStorage.removeItem('pageStateBeforeLogin')
  }
  return null
}

// 创建axios实例
const api = axios.create({
  baseURL: '/api',  // 使用vite代理路径
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  async config => {
    // 从localStorage获取token
    let token = localStorage.getItem('token')
    
    if (token) {
      // 检查token是否即将过期，如果是则尝试刷新
      if (shouldRefreshToken(token)) {
        if (!isRefreshing) {
          isRefreshing = true
          
          try {
            // 静默刷新token
            const newToken = await refreshToken()
            token = newToken
            isRefreshing = false
            processQueue(null, newToken)
          } catch (error) {
            isRefreshing = false
            processQueue(error, null)
            // 刷新失败，继续使用原token，让后端返回401
          }
        } else {
          // 如果正在刷新，将请求加入队列
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(newToken => {
            config.headers.Authorization = `Bearer ${newToken}`
            return config
          }).catch(error => {
            return Promise.reject(error)
          })
        }
      }
      
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response
  },
  async error => {
    console.error('响应错误:', error)
    
    // 处理不同的错误状态码
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token过期或无效，保存当前页面状态
          savePageState()
          
          // 清除token和用户数据
          localStorage.removeItem('token')
          // 清除Pinia中的用户数据
          const userStore = useUserStore()
          userStore.clearUser()
          
          // 静默跳转到登录页，不显示错误提示
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('权限不足')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default api

/**
 * 工作计划相关API
 */
export const workPlanApi = {
  // 获取计划列表
  getPlanList: (params) => api.get('/work-plan/plans', { params }),
  
  // 获取计划详情
  getPlanById: (id) => api.get(`/work-plan/plans/${id}`),
  
  // 创建计划
  createPlan: (data) => api.post('/work-plan/plans', data),
  
  // 更新计划
  updatePlan: (id, data) => api.put(`/work-plan/plans/${id}`, data),
  
  // 删除计划
  deletePlan: (id) => api.delete(`/work-plan/plans/${id}`),
  
  // 获取工作类型
  getWorkTypes: () => api.get('/work-plan/work-types'),
  
  // 获取可分配用户
  getAssignableUsers: () => api.get('/work-plan/assignable-users'),
  
  // 获取部门列表
  getDepartments: () => api.get('/work-plan/departments'),
  
  // 统计相关API
  getStatisticsOverview: (params) => api.get('/work-plan/statistics/overview', { params }),
  getUserStats: (params) => api.get('/work-plan/statistics/users', { params }),
  getTypeStats: (params) => api.get('/work-plan/statistics/types', { params }),
  getTrendStats: (params) => api.get('/work-plan/statistics/trend', { params }),
  getStatusStats: (params) => api.get('/work-plan/statistics/status', { params }),
  getDepartmentStats: (params) => api.get('/work-plan/statistics/departments', { params }),
  
  // 工作日志相关
  getLogList: (params) => api.get('/work-plan/logs', { params }),
  createLog: (data) => api.post('/work-plan/logs', data),
  updateLog: (id, data) => api.put(`/work-plan/logs/${id}`, data),
  deleteLog: (id) => api.delete(`/work-plan/logs/${id}`),
  
  // 里程碑相关
  getPlanMilestones: (planId) => api.get(`/work-plan/plans/${planId}/milestones`),
  createMilestone: (data) => api.post('/work-plan/milestones', data),
  updateMilestoneStatus: (id, data) => api.put(`/work-plan/milestones/${id}/status`, data),
  deleteMilestone: (id) => api.delete(`/work-plan/milestones/${id}`)
}