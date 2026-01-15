import request from '@/utils/api'

// --- 检验项目管理 ---

export function getInspectionItems() {
  return request({
    url: '/inspection/items',
    method: 'get'
  })
}

export function addInspectionItem(data) {
  return request({
    url: '/inspection/items',
    method: 'post',
    data
  })
}

export function updateInspectionItem(id, data) {
  return request({
    url: `/inspection/items/${id}`,
    method: 'put',
    data
  })
}

export function deleteInspectionItem(id) {
  return request({
    url: `/inspection/items/${id}`,
    method: 'delete'
  })
}

// --- 来料检验报告 ---

export function getIncomingFilterOptions() {
  return request({
    url: '/inspection/incoming/filter-options',
    method: 'get'
  })
}

export function getIncomingReports(params) {
  return request({
    url: '/inspection/incoming/list',
    method: 'get',
    params
  })
}

export function getIncomingReportDetail(id) {
  return request({
    url: `/inspection/incoming/${id}`,
    method: 'get'
  })
}

export function createIncomingReport(formData) {
  return request({
    url: '/inspection/incoming',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function updateIncomingReport(id, formData) {
  return request({
    url: `/inspection/incoming/${id}`,
    method: 'put',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function deleteIncomingReport(id) {
  return request({
    url: `/inspection/incoming/${id}`,
    method: 'delete'
  })
}

export function withdrawIncomingReport(id) {
  return request({
    url: `/inspection/incoming/${id}/withdraw`,
    method: 'post'
  })
}

export function generateReportNo(category) {
  return request({
    url: '/inspection/incoming/generate-report-no',
    method: 'get',
    params: { category }
  })
}

// --- 材料入库查询 ---
export function searchMaterials(params) {
  return request({
    url: '/material/search',
    method: 'get',
    params
  })
}

export function generateInspectionData(data) {
  return request({
    url: '/inspection/incoming/generate-data',
    method: 'post',
    data
  })
}

export function batchGenerateInspectionReports(items) {
  return request({
    url: '/inspection/incoming/batch-generate',
    method: 'post',
    data: { items }
  })
}

export function batchDeleteIncomingReports(ids) {
  return request({
    url: '/inspection/incoming/batch-delete',
    method: 'post',
    data: { ids }
  })
}

// --- 来料检验审核流程 ---

export function submitIncomingReport(id) {
  return request({
    url: `/inspection/incoming/${id}/submit`,
    method: 'post'
  })
}

export function approveIncomingReport(id, remark) {
  return request({
    url: `/inspection/incoming/${id}/approve`,
    method: 'post',
    data: { remark }
  })
}

export function rejectIncomingReport(id, remark) {
  return request({
    url: `/inspection/incoming/${id}/reject`,
    method: 'post',
    data: { remark }
  })
}

export function getIncomingReportAuditLogs(id) {
  return request({
    url: `/inspection/incoming/${id}/audit-logs`,
    method: 'get'
  })
}

// --- 性能实验审核流程 ---

export function submitPerformanceReport(id) {
  return request({
    url: `/inspection/performance/${id}/submit`,
    method: 'post'
  })
}

export function approvePerformanceReport(id, remark) {
  return request({
    url: `/inspection/performance/${id}/approve`,
    method: 'post',
    data: { remark }
  })
}

export function rejectPerformanceReport(id, remark) {
  return request({
    url: `/inspection/performance/${id}/reject`,
    method: 'post',
    data: { remark }
  })
}

export function revokePerformanceReport(id) {
  return request({
    url: `/inspection/performance/${id}/revoke`,
    method: 'post'
  })
}

export function getPerformanceReportAuditLogs(id) {
  return request({
    url: `/inspection/performance/${id}/audit-logs`,
    method: 'get'
  })
}

// --- 出货检验审核流程 ---

export function submitShipmentReport(id) {
  return request({
    url: `/shipment-report/${id}/submit`,
    method: 'post'
  })
}

export function approveShipmentReport(id, remark) {
  return request({
    url: `/shipment-report/${id}/approve`,
    method: 'post',
    data: { remark }
  })
}

export function rejectShipmentReport(id, remark) {
  return request({
    url: `/shipment-report/${id}/reject`,
    method: 'post',
    data: { remark }
  })
}

export function revokeShipmentReport(id) {
  return request({
    url: `/shipment-report/${id}/revoke`,
    method: 'post'
  })
}

export function getShipmentReportAuditLogs(id) {
  return request({
    url: `/shipment-report/${id}/audit-logs`,
    method: 'get'
  })
}
