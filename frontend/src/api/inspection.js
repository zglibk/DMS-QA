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
