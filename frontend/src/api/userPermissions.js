/**
 * 用户权限管理API服务
 * 
 * 功能说明：
 * 1. 提供用户权限管理相关的API接口
 * 2. 包括权限查询、授予、撤销、历史记录等功能
 * 3. 统一处理API请求和响应
 */

import request from './request'

/**
 * 用户权限管理API接口
 */
export const userPermissionsAPI = {
  /**
   * 获取用户权限列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.username - 用户名（可选）
   * @param {string} params.menuCode - 菜单代码（可选）
   * @param {string} params.actionCode - 操作代码（可选）
   * @returns {Promise} API响应
   */
  getUserPermissions(params = {}) {
    return request({
      url: '/api/user-permissions',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户完整权限信息
   * @param {string} username - 用户名
   * @returns {Promise} API响应
   */
  getUserCompletePermissions(username) {
    return request({
      url: `/api/user-permissions/complete/${username}`,
      method: 'get'
    })
  },

  /**
   * 授予用户权限
   * @param {Object} data - 权限数据
   * @param {string} data.username - 用户名
   * @param {string} data.menuCode - 菜单代码
   * @param {string} data.actionCode - 操作代码
   * @param {boolean} data.hasPermission - 是否有权限
   * @param {string} data.expiryDate - 过期时间（可选）
   * @param {string} data.reason - 授权原因（可选）
   * @returns {Promise} API响应
   */
  grantPermission(data) {
    return request({
      url: '/api/user-permissions/grant',
      method: 'post',
      data
    })
  },

  /**
   * 批量授予用户权限
   * @param {Array} permissions - 权限数组
   * @returns {Promise} API响应
   */
  batchGrantPermissions(permissions) {
    return request({
      url: '/api/user-permissions/batch-grant',
      method: 'post',
      data: { permissions }
    })
  },

  /**
   * 撤销用户权限
   * @param {number} permissionId - 权限ID
   * @param {string} reason - 撤销原因（可选）
   * @returns {Promise} API响应
   */
  revokePermission(permissionId, reason = '') {
    return request({
      url: `/api/user-permissions/${permissionId}/revoke`,
      method: 'post',
      data: { reason }
    })
  },

  /**
   * 获取权限变更历史
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.username - 用户名（可选）
   * @param {string} params.menuCode - 菜单代码（可选）
   * @param {string} params.actionCode - 操作代码（可选）
   * @param {string} params.startDate - 开始日期（可选）
   * @param {string} params.endDate - 结束日期（可选）
   * @returns {Promise} API响应
   */
  getPermissionHistory(params = {}) {
    return request({
      url: '/api/user-permissions/history',
      method: 'get',
      params
    })
  },

  /**
   * 清理过期权限
   * @returns {Promise} API响应
   */
  cleanupExpiredPermissions() {
    return request({
      url: '/api/user-permissions/cleanup-expired',
      method: 'post'
    })
  },

  /**
   * 获取所有用户列表（用于权限分配）
   * @returns {Promise} API响应
   */
  getAllUsers() {
    return request({
      url: '/api/users/all',
      method: 'get'
    })
  },

  /**
   * 获取所有菜单列表（用于权限分配）
   * @returns {Promise} API响应
   */
  getAllMenus() {
    return request({
      url: '/api/menus/all',
      method: 'get'
    })
  },

  /**
   * 获取菜单的操作列表
   * @param {string} menuCode - 菜单代码
   * @returns {Promise} API响应
   */
  getMenuActions(menuCode) {
    return request({
      url: `/api/menus/${menuCode}/actions`,
      method: 'get'
    })
  }
}

export default userPermissionsAPI