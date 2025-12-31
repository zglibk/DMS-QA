import request from '@/utils/api'

export function getCategoryMappings() {
  return request({
    url: '/category-config',
    method: 'get'
  })
}

export function addCategoryMapping(data) {
  return request({
    url: '/category-config',
    method: 'post',
    data
  })
}

export function deleteCategoryMapping(id) {
  return request({
    url: `/category-config/${id}`,
    method: 'delete'
  })
}

export function updateCategoryMapping(id, data) {
  return request({
    url: `/category-config/${id}`,
    method: 'put',
    data
  })
}
