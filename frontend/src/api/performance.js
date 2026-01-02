import request from '@/utils/api'

export function getReports(params) {
  return request({
    url: '/inspection/performance/list',
    method: 'get',
    params
  })
}

export function getReport(id) {
  return request({
    url: `/inspection/performance/${id}`,
    method: 'get'
  })
}

export function createReport(data) {
  return request({
    url: '/inspection/performance',
    method: 'post',
    data
  })
}

export function updateReport(id, data) {
  return request({
    url: `/inspection/performance/${id}`,
    method: 'put',
    data
  })
}

export function deleteReport(id) {
  return request({
    url: `/inspection/performance/${id}`,
    method: 'delete'
  })
}

export function addReportItem(data) {
  return request({
    url: '/inspection/performance/item',
    method: 'post',
    data
  })
}

export function updateReportItem(id, data) {
  return request({
    url: `/inspection/performance/item/${id}`,
    method: 'put',
    data
  })
}

export function deleteReportItem(id) {
  return request({
    url: `/inspection/performance/item/${id}`,
    method: 'delete'
  })
}

export function getInstruments() {
  return request({
    url: '/inspection/performance/instruments',
    method: 'get'
  })
}

export function getInspectionItems() {
  return request({
    url: '/inspection/performance/inspection-items',
    method: 'get'
  })
}

export function uploadImage(formData) {
  return request({
    url: '/inspection/performance/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function getConfigs() {
  return request({
    url: '/inspection/performance/configs',
    method: 'get'
  })
}

export function getAllConfigs() {
  return request({
    url: '/inspection/performance/configs/all',
    method: 'get'
  })
}

export function addConfig(data) {
  return request({
    url: '/inspection/performance/configs',
    method: 'post',
    data
  })
}

export function updateConfig(id, data) {
  return request({
    url: `/inspection/performance/configs/${id}`,
    method: 'put',
    data
  })
}

export function deleteConfig(id) {
  return request({
    url: `/inspection/performance/configs/${id}`,
    method: 'delete'
  })
}

export function createRecheckReport(id) {
  return request({
    url: `/inspection/performance/${id}/recheck`,
    method: 'post'
  })
}
