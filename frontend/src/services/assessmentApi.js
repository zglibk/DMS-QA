/**
 * 考核记录管理API服务
 * 功能：提供考核记录相关的API调用方法，整合ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表的数据
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

import api from '@/services/api'

/**
 * 获取考核记录列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.employeeName - 员工姓名
 * @param {string} params.department - 部门
 * @param {string} params.status - 状态
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.sortBy - 排序字段
 * @param {string} params.sortOrder - 排序方向
 * @returns {Promise} API响应
 */
export const getAssessmentRecords = (params) => {
  return api.get('/assessment/records', { params })
}

/**
 * 获取单个考核记录详情
 * @param {number} id - 考核记录ID
 * @returns {Promise} API响应
 */
export const getAssessmentRecord = (id) => {
  return api.get(`/assessment/records/${id}`)
}

/**
 * 创建考核记录
 * @param {Object} data - 考核记录数据
 * @param {number} data.complaintID - 投诉/返工/异常ID
 * @param {string} data.personName - 责任人姓名
 * @param {string} data.personType - 责任人类型
 * @param {number} data.assessmentAmount - 考核金额
 * @param {string} data.assessmentDate - 考核日期
 * @param {string} data.remarks - 备注
 * @param {string} data.createdBy - 创建人
 * @returns {Promise} API响应
 */
export const createAssessmentRecord = (data) => {
  return api.post('/assessment/records', data)
}

/**
 * 更新考核记录
 * @param {number} id - 考核记录ID
 * @param {Object} data - 更新数据
 * @returns {Promise} API响应
 */
export const updateAssessmentRecord = (id, data) => {
  return api.put(`/assessment/records/${id}`, data)
}

/**
 * 删除考核记录
 * @param {number} id - 考核记录ID
 * @returns {Promise} API响应
 */
export const deleteAssessmentRecord = (id) => {
  return api.delete(`/assessment/records/${id}`)
}

/**
 * 生成考核记录
 * 从ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表自动生成考核记录
 * 新版本：存储过程已优化，自动处理所有未生成的记录，不再需要日期参数
 * @param {Object} params - 生成参数（可选）
 * @param {boolean} params.resetRecords - 是否重置现有记录
 * @param {boolean} params.resetAutoIncrement - 是否重置自增ID
 * @returns {Promise} API响应
 */
export const generateAssessmentRecords = (params = {}) => {
  return api.post('/assessment/generate', params)
}

/**
 * 处理改善期返还
 * @param {Array} recordIds - 考核记录ID数组
 * @param {Object} data - 返还处理数据
 * @param {string} data.operatorName - 操作人姓名
 * @param {string} data.remarks - 备注
 * @returns {Promise} API响应
 */
export const processReturns = (recordIds, data) => {
  return api.post('/assessment/process-returns', {
    recordIds,
    ...data
  })
}

/**
 * 处理单个记录返还
 * @param {number} id - 考核记录ID
 * @param {Object} data - 返还处理数据
 * @param {string} data.operatorName - 操作人姓名
 * @param {number} data.returnPercentage - 返还比例
 * @param {string} data.remarks - 备注
 * @returns {Promise} API响应
 */
export const processReturn = (id, data) => {
  return api.post(`/assessment/records/${id}/return`, data)
}

/**
 * 获取考核统计数据
 * 整合ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表的统计信息
 * @param {Object} params - 查询参数
 * @param {number} params.year - 年度
 * @param {number} params.month - 月份
 * @param {string} params.employeeName - 员工姓名
 * @param {string} params.department - 部门
 * @returns {Promise} API响应
 */
export const getAssessmentStatistics = (params) => {
  return api.get('/assessment/statistics', { params })
}

/**
 * 获取人员列表
 * @returns {Promise} API响应
 */
export const getPersons = () => {
  return api.get('/assessment/persons')
}

/**
 * 导出考核记录为Excel文件
 * @param {Object} params - 导出参数，包含筛选条件和列配置
 * @param {string} params.columns - JSON字符串格式的可见列配置
 * @returns {Promise} API响应，返回Excel文件的Blob数据
 */
export const exportAssessmentRecords = (params) => {
  return api.get('/assessment/export', { params, responseType: 'blob' })
}

/**
 * 获取考核记录历史
 * @param {number} id - 考核记录ID
 * @returns {Promise} API响应，包含记录信息和历史变更记录
 */
export const getAssessmentHistory = (id) => {
  return api.get(`/assessment/${id}/history`)
}

/**
 * 获取用户的列设置配置
 * @param {string} userId - 用户ID
 * @returns {Promise} API响应，包含用户的列设置配置
 */
export const getColumnSettings = (userId) => {
  return api.get(`/assessment/column-settings/${userId}`)
}

/**
 * 获取改善期跟踪数据
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.employeeName - 员工姓名
 * @param {string} params.department - 部门
 * @param {string} params.status - 状态
 * @returns {Promise} API响应
 */
export const getImprovementTracking = (params) => {
  return api.get('/assessment/improvement-tracking', { params })
}

/**
 * 获取改善期概览数据
 * @param {Object} params - 查询参数（可选）
 * @param {string} params.employeeName - 员工姓名
 * @param {string} params.department - 部门
 * @param {string} params.trackingStatus - 跟踪状态
 * @returns {Promise} API响应
 */
export const getImprovementOverview = (params) => {
  return api.get('/assessment/improvement-overview', { params })
}

/**
 * 自动返还处理
 * @param {Object} data - 返还处理数据
 * @param {string} data.operatorName - 操作人姓名
 * @param {string} data.remarks - 备注
 * @returns {Promise} API响应
 */
export const autoReturn = (data) => {
  return api.post('/assessment/auto-return', data)
}

/**
 * 保存用户的列设置配置
 * @param {string} userId - 用户ID
 * @param {Object} columnSettings - 列设置配置对象
 * @param {string} userName - 用户姓名（可选）
 * @returns {Promise} API响应
 */
export const saveColumnSettings = (userId, columnSettings, userName) => {
  return api.post(`/assessment/column-settings/${userId}`, { 
    columnSettings,
    userName 
  })
}

/**
 * 删除用户的列设置配置
 * @param {string} userId - 用户ID
 * @returns {Promise} API响应
 */
export const deleteColumnSettings = (userId) => {
  return api.delete(`/assessment/column-settings/${userId}`)
}
