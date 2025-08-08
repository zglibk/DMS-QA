/**
 * API 工具类
 * 功能：提供统一的HTTP请求接口
 * 版本：v1.0
 * 创建日期：2025-08-06
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
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
  error => {
    console.error('响应错误:', error)
    
    // 处理不同的错误状态码
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          // 清除token并跳转到登录页
          localStorage.removeItem('token')
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