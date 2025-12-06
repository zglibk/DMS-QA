/**
 * 仪器管理API服务
 * 
 * 功能说明：
 * 1. 提供仪器台账管理相关的API接口
 * 2. 提供第三方校准检定结果管理的API接口
 * 3. 提供年度校准计划管理的API接口
 * 4. 提供管理编号自动生成的API接口
 * 5. 统一处理API请求和响应
 */

import api from './index'

/**
 * 仪器管理API接口
 */
export const instrumentApi = {
  // ==================== 管理编号生成 ====================
  
  /**
   * 获取下一个管理编号
   * @param {string} prefix - 前缀类型 ('WSJ' 或 'LAB')
   * @returns {Promise} API响应
   */
  getNextManagementCode(prefix) {
    return api.get(`/api/instruments/next-management-code/${prefix}`)
  },

  // ==================== 仪器台账管理 ====================
  
  /**
   * 获取仪器列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页数量
   * @param {string} params.search - 搜索关键词（可选）
   * @param {string} params.category - 仪器类别（可选）
   * @param {string} params.status - 仪器状态（可选）
   * @param {string} params.department - 使用部门（可选）
   * @returns {Promise} API响应
   */
  getInstruments(params = {}) {
    return api.get('/api/instruments', { params })
  },

  /**
   * 获取没有校准记录的仪器列表（用于校准结果登记）
   * @returns {Promise} API响应
   */
  getAvailableInstrumentsForCalibration() {
    return api.get('/api/instruments/available-for-calibration')
  },

  /**
   * 获取仪器详情
   * @param {number} id - 仪器ID
   * @returns {Promise} API响应
   */
  getInstrument(id) {
    return api.get(`/api/instruments/${id}`)
  },

  /**
   * 创建仪器
   * @param {Object} data - 仪器数据
   * @returns {Promise} API响应
   */
  createInstrument(data) {
    return api.post('/api/instruments', data)
  },

  /**
   * 更新仪器
   * @param {number} id - 仪器ID
   * @param {Object} data - 仪器数据
   * @returns {Promise} API响应
   */
  updateInstrument(id, data) {
    return api.put(`/api/instruments/${id}`, data)
  },

  /**
   * 删除仪器
   * @param {number} id - 仪器ID
   * @returns {Promise} API响应
   */
  deleteInstrument(id) {
    return api.delete(`/api/instruments/${id}`)
  },

  /**
   * 导出仪器台账
   * @param {Object} params - 导出参数
   * @returns {Promise} API响应
   */
  exportInstruments(params = {}) {
    return api.get('/api/instruments/export', { 
      params,
      responseType: 'blob'
    })
  },

  // ==================== 校准检定结果管理 ====================

  /**
   * 生成校准结果编号
   * @returns {Promise} API响应
   */
  generateResultCode() {
    return api.get('/api/instruments/generate-result-code')
  },

  /**
   * 获取校准结果列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页数量
   * @param {string} params.search - 搜索关键词（可选）
   * @param {string} params.status - 校准状态（可选）
   * @param {string} params.startDate - 开始日期（可选）
   * @param {string} params.endDate - 结束日期（可选）
   * @returns {Promise} API响应
   */
  getCalibrationResults(params = {}) {
    return api.get('/api/instruments/calibration-results', { params })
  },

  /**
   * 获取校准结果详情
   * @param {number} id - 校准结果ID
   * @returns {Promise} API响应
   */
  getCalibrationResult(id) {
    return api.get(`/api/instruments/calibration-results/${id}`)
  },

  /**
   * 创建校准结果
   * @param {Object} data - 校准结果数据
   * @returns {Promise} API响应
   */
  createCalibrationResult(data) {
    return api.post('/api/instruments/calibration-results', data)
  },

  /**
   * 更新校准结果
   * @param {number} id - 校准结果ID
   * @param {Object} data - 校准结果数据
   * @returns {Promise} API响应
   */
  updateCalibrationResult(id, data) {
    return api.put(`/api/instruments/calibration-results/${id}`, data)
  },

  /**
   * 删除校准结果
   * @param {number} id - 校准结果ID
   * @returns {Promise} API响应
   */
  deleteCalibrationResult(id) {
    return api.delete(`/api/instruments/calibration-results/${id}`)
  },

  /**
   * 上传校准证书
   * @param {FormData} formData - 文件数据
   * @returns {Promise} API响应
   */
  uploadCalibrationCertificate(formData) {
    return api.post('/api/instruments/calibration-results/upload-certificate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 下载校准证书
   * @param {number} id - 校准结果ID
   * @returns {Promise} API响应
   */
  downloadCalibrationCertificate(id) {
    return api.get(`/api/instruments/calibration-results/${id}/certificate`, {
      responseType: 'blob'
    })
  },

  /**
   * 导出校准结果
   * @param {Object} params - 导出参数
   * @returns {Promise} API响应
   */
  exportCalibrationResults(params = {}) {
    return api.get('/api/instruments/calibration-results/export', { 
      params,
      responseType: 'blob'
    })
  },

  // ==================== 年度校准计划管理 ====================

  /**
   * 获取年度校准计划
   * @param {Object} params - 查询参数
   * @param {number} params.year - 计划年度
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页数量
   * @returns {Promise} API响应
   */
  getAnnualPlan(params = {}) {
    return api.get('/api/instruments/annual-plans', { params })
  },

  /**
   * 获取年度计划详情
   * @param {number} id - 计划ID
   * @returns {Promise} API响应
   */
  getAnnualPlanDetail(id) {
    return api.get(`/api/instruments/annual-plan/${id}`)
  },

  /**
   * 创建年度计划
   * @param {Object} data - 计划数据
   * @returns {Promise} API响应
   */
  createAnnualPlan(data) {
    return api.post('/api/instruments/annual-plan', data)
  },

  /**
   * 更新年度计划
   * @param {number} id - 计划ID
   * @param {Object} data - 计划数据
   * @returns {Promise} API响应
   */
  updateAnnualPlan(id, data) {
    return api.put(`/api/instruments/annual-plan/${id}`, data)
  },

  /**
   * 删除年度计划
   * @param {number} id - 计划ID
   * @returns {Promise} API响应
   */
  deleteAnnualPlan(id) {
    return api.delete(`/api/instruments/annual-plan/${id}`)
  },

  /**
   * 删除指定年度的所有计划
   * @param {number} year - 计划年度
   * @returns {Promise} API响应
   */
  deleteAnnualPlanByYear(year) {
    return api.delete(`/api/instruments/annual-plans/year/${year}`)
  },

  /**
   * 自动生成年度计划
   * @param {Object} data - 生成参数
   * @param {number} data.year - 计划年度
   * @returns {Promise} API响应
   */
  generateAnnualPlan(data) {
    return api.post('/api/instruments/annual-plan/generate', data)
  },

  /**
   * 获取年度计划统计信息
   * @param {number} year - 计划年度
   * @returns {Promise} API响应
   */
  getAnnualPlanStatistics(year) {
    return api.get(`/api/instruments/annual-plan/statistics/${year}`)
  },

  /**
   * 更新年度计划状态
   * @param {number} id - 计划ID
   * @param {Object} data - 状态数据
   * @param {string} data.status - 状态值
   * @param {string} data.actualDate - 实际完成日期（可选）
   * @param {number} data.actualCost - 实际费用（可选）
   * @returns {Promise} API响应
   */
  updateAnnualPlanStatus(id, data) {
    return api.patch(`/api/instruments/annual-plan/${id}/status`, data)
  },

  /**
   * 标记计划完成
   * @param {number} id - 计划ID
   * @returns {Promise} API响应
   */
  markPlanCompleted(id) {
    return api.post(`/api/instruments/annual-plan/${id}/complete`)
  },

  /**
   * 导出年度计划表
   * @param {Object} params - 导出参数
   * @param {number} params.year - 计划年度
   * @returns {Promise} API响应
   */
  exportAnnualPlan(params = {}) {
    return api.get('/api/instruments/annual-plan/export', { 
      params,
      responseType: 'blob'
    })
  },

  /**
   * 导出年度实施表
   * @param {Object} params - 导出参数
   * @param {number} params.year - 计划年度
   * @returns {Promise} API响应
   */
  exportImplementationTable(params = {}) {
    return api.get('/api/instruments/annual-plan/export-implementation', { 
      params,
      responseType: 'blob'
    })
  },

  // ==================== 辅助功能接口 ====================

  /**
   * 获取仪器类别列表
   * @returns {Promise} API响应
   */
  getCategories() {
    return api.get('/api/instruments/categories')
  },

  /**
   * 获取部门列表
   * @returns {Promise} API响应
   */
  getDepartments() {
    return api.get('/api/instruments/departments')
  },

  /**
   * 获取人员列表
   * @returns {Promise} API响应
   */
  getPersons() {
    return api.get('/api/instruments/persons')
  },

  /**
   * 获取人员列表（旧方法名，保持兼容性）
   * @returns {Promise} API响应
   */
  getPersonnel() {
    return api.get('/api/instruments/personnel')
  },

  /**
   * 获取仪器统计信息
   * @returns {Promise} API响应
   */
  getInstrumentStatistics() {
    return api.get('/api/instruments/statistics')
  },

  /**
   * 获取校准统计信息
   * @param {Object} params - 查询参数
   * @param {number} params.year - 统计年度（可选）
   * @returns {Promise} API响应
   */
  getCalibrationStatistics(params = {}) {
    return api.get('/api/instruments/calibration-statistics', { params })
  },

  /**
   * 检查出厂编号和管理编号重复性
   * @param {Object} params - 检查参数
   * @param {string} params.instrumentCode - 出厂编号（可选）
   * @param {string} params.managementCode - 管理编号（可选）
   * @param {number} params.excludeId - 排除的仪器ID（编辑时使用，可选）
   * @returns {Promise} API响应
   */
  checkDuplicate(params = {}) {
    return api.post('/api/instruments/check-duplicate', params)
  },

  // ==================== 批量导入 ====================

  /**
   * 下载导入模板
   * @returns {Promise} 文件下载
   */
  downloadImportTemplate() {
    return api.get('/api/instruments/import/template', {
      responseType: 'blob'
    })
  },

  /**
   * 预览导入数据
   * @param {FormData} formData - 包含Excel文件的FormData
   * @returns {Promise} API响应
   */
  previewImport(formData) {
    return api.post('/api/instruments/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 执行批量导入
   * @param {Array} data - 预览后确认导入的数据
   * @returns {Promise} API响应
   */
  executeImport(data) {
    return api.post('/api/instruments/import/execute', { data })
  },

  // ==================== 校准预警管理 ====================

  /**
   * 获取校准预警信息
   * @param {Object} params - 查询参数
   * @param {number} params.warningDays - 预警天数（默认30天）
   * @returns {Promise} API响应
   */
  getCalibrationWarnings(params = {}) {
    return api.get('/api/instruments/calibration-warnings', { params })
  },

  /**
   * 生成校准预警通知
   * @param {Object} data - 参数
   * @param {number} data.warningDays - 预警天数
   * @returns {Promise} API响应
   */
  generateWarningNotices(data = {}) {
    return api.post('/api/instruments/generate-warning-notices', data)
  }
}

export default instrumentApi