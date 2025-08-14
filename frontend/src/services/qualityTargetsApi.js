/**
 * 质量目标管理API服务
 * 功能：提供质量目标相关的API调用方法
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

import api from '@/services/api'

/**
 * 获取质量目标列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 * @param {string} params.targetName - 目标名称
 * @param {string} params.category - 目标分类
 * @param {number} params.year - 考核年度
 * @param {string} params.status - 状态
 * @returns {Promise} API响应
 */
export const getQualityTargets = (params) => {
  return api.get('/quality-targets', { params })
}

/**
 * 获取质量目标详情
 * @param {number} id - 目标ID
 * @returns {Promise} API响应
 */
export const getQualityTargetById = (id) => {
  return api.get(`/quality-targets/${id}`)
}

/**
 * 创建质量目标
 * @param {Object} data - 目标数据
 * @param {string} data.targetName - 目标名称
 * @param {string} data.category - 目标分类
 * @param {number} data.targetValue - 目标值
 * @param {string} data.unit - 单位
 * @param {string} data.assessmentUnit - 考核单位
 * @param {string} data.responsiblePerson - 责任人
 * @param {number} data.year - 考核年度
 * @param {string} data.status - 状态
 * @param {number} data.weight - 权重
 * @param {string} data.description - 目标描述
 * @param {string} data.remarks - 备注
 * @returns {Promise} API响应
 */
export const createQualityTarget = (data) => {
  return api.post('/quality-targets', data)
}

/**
 * 更新质量目标
 * @param {number} id - 目标ID
 * @param {Object} data - 更新数据
 * @returns {Promise} API响应
 */
export const updateQualityTarget = (id, data) => {
  return api.put(`/quality-targets/${id}`, data)
}

/**
 * 删除质量目标
 * @param {number} id - 目标ID
 * @returns {Promise} API响应
 */
export const deleteQualityTarget = (id) => {
  return api.delete(`/quality-targets/${id}`)
}

/**
 * 批量删除质量目标
 * @param {Array<number>} ids - 目标ID数组
 * @returns {Promise} API响应
 */
export const batchDeleteQualityTargets = (ids) => {
  return api.post('/quality-targets/batch-delete', { ids })
}

/**
 * 获取质量目标选项数据
 * @returns {Promise} API响应
 */
export const getQualityTargetOptions = () => {
  // 添加时间戳参数避免304缓存问题
  return api.get('/quality-targets/options', {
    params: {
      _t: Date.now()
    }
  })
}

/**
 * 导出质量目标数据
 * @param {Object} params - 导出参数
 * @returns {Promise} API响应
 */
export const exportQualityTargets = (params) => {
  return api.get('/quality-targets/export', { params, responseType: 'blob' })
}

/**
 * 获取质量目标统计概览
 * @param {Object} params - 查询参数
 * @param {number} params.year - 年度
 * @returns {Promise} API响应
 */
export const getQualityTargetOverview = (params) => {
  return api.get('/quality-targets/statistics/overview', { params })
}

/**
 * 获取质量目标分类统计
 * @param {Object} params - 查询参数
 * @param {number} params.year - 年度
 * @returns {Promise} API响应
 */
export const getQualityTargetCategoryStats = (params) => {
  return api.get('/quality-targets/statistics/category', { params })
}

/**
 * 获取质量目标达成情况统计
 * @param {Object} params - 查询参数
 * @param {number} params.year - 年度
 * @param {string} params.category - 分类
 * @returns {Promise} API响应
 */
export const getQualityTargetAchievementStats = (params) => {
  return api.get('/quality-targets/statistics/achievement', { params })
}

/**
 * 获取质量目标趋势统计
 * @param {Object} params - 查询参数
 * @param {number} params.year - 年度
 * @param {string} params.period - 统计周期 (month/quarter)
 * @returns {Promise} API响应
 */
export const getQualityTargetTrendStats = (params) => {
  return api.get('/quality-targets/statistics/trend', { params })
}

/**
 * 添加质量目标统计数据
 * @param {Object} data - 统计数据
 * @param {number} data.targetId - 目标ID
 * @param {string} data.period - 统计周期
 * @param {number} data.actualValue - 实际值
 * @param {number} data.achievementRate - 达成率
 * @param {string} data.remarks - 备注
 * @returns {Promise} API响应
 */
export const addQualityTargetStatistics = (data) => {
  return api.post('/quality-targets/statistics', data)
}

/**
 * 更新质量目标统计数据
 * @param {number} id - 统计数据ID
 * @param {Object} data - 更新数据
 * @returns {Promise} API响应
 */
export const updateQualityTargetStatistics = (id, data) => {
  return api.put(`/quality-targets/statistics/${id}`, data)
}

/**
 * 获取质量目标统计数据列表
 * @param {Object} params - 查询参数
 * @param {number} params.targetId - 目标ID
 * @param {string} params.period - 统计周期
 * @param {number} params.year - 年度
 * @returns {Promise} API响应
 */
export const getQualityTargetStatistics = (params) => {
  return api.get('/quality-targets/statistics', { params })
}