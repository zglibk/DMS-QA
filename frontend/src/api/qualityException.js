import request from '../utils/api'

export function getList(params) {
  return request({
    url: '/quality-exceptions',
    method: 'get',
    params
  })
}

export function getDetail(id) {
  return request({
    url: `/quality-exceptions/${id}`,
    method: 'get'
  })
}

export function create(data) {
  return request({
    url: '/quality-exceptions',
    method: 'post',
    data
  })
}

export function update(id, data) {
  return request({
    url: `/quality-exceptions/${id}`,
    method: 'put',
    data
  })
}

export function del(id) {
  return request({
    url: `/quality-exceptions/${id}`,
    method: 'delete'
  })
}
