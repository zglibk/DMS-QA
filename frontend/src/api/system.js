import request from '@/utils/api'

export function getElectronicSeals(params) {
  return request({
    url: '/electronic-seals',
    method: 'get',
    params
  })
}
