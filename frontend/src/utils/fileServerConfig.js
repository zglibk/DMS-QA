/**
 * 文件服务器配置工具
 * 从后端动态获取文件服务器端口和URL前缀配置
 * 用于在生产环境和开发环境之间自动适配文件访问URL
 */

import api from '@/utils/api'

// 文件服务器配置缓存
let fileServerConfig = null
let configPromise = null

/**
 * 获取文件服务器配置（带缓存，只请求一次）
 * @returns {Promise<{fileServerPort: number, fileUrlPrefix: string}>}
 */
export const getFileServerConfig = async () => {
  // 如果已有缓存，直接返回
  if (fileServerConfig) {
    return fileServerConfig
  }
  
  // 如果正在请求中，等待已有的请求
  if (configPromise) {
    return configPromise
  }
  
  // 发起新请求
  configPromise = (async () => {
    try {
      const res = await api.get('/config/file-server-config')
      if (res.success && res.data) {
        fileServerConfig = {
          fileServerPort: res.data.fileServerPort || 8080,
          fileUrlPrefix: res.data.fileUrlPrefix || '/files'
        }
      } else {
        // 使用默认配置
        fileServerConfig = {
          fileServerPort: 8080,
          fileUrlPrefix: '/files'
        }
      }
    } catch (e) {
      console.warn('获取文件服务器配置失败，使用默认值:', e)
      fileServerConfig = {
        fileServerPort: 8080,
        fileUrlPrefix: '/files'
      }
    }
    
    configPromise = null
    return fileServerConfig
  })()
  
  return configPromise
}

/**
 * 获取文件服务器配置（同步版本，需要先调用initFileServerConfig初始化）
 * @returns {{fileServerPort: number, fileUrlPrefix: string}}
 */
export const getFileServerConfigSync = () => {
  return fileServerConfig || {
    fileServerPort: 8080,
    fileUrlPrefix: '/files'
  }
}

/**
 * 初始化文件服务器配置（在应用启动时调用）
 */
export const initFileServerConfig = async () => {
  await getFileServerConfig()
}

/**
 * 获取文件服务器URL前缀 - 根据环境自适应
 * 开发环境使用Vite代理，生产环境使用配置的文件服务器端口
 * @returns {string}
 */
export const getFileServerPrefix = () => {
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 开发环境：使用Vite代理
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ''
  }
  
  // 生产环境：使用配置的文件服务器端口
  const config = getFileServerConfigSync()
  return `${protocol}//${hostname}:${config.fileServerPort}`
}

/**
 * 构建文件完整URL - 根据环境自适应
 * @param {string} relativePath - 相对路径，如 /files/customer-complaint/xxx.png
 * @returns {string} 完整的文件访问URL
 */
export const buildFileUrl = (relativePath) => {
  if (!relativePath) return ''
  
  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  
  return getFileServerPrefix() + relativePath
}

/**
 * 构建指定类型的文件URL
 * @param {string} filename - 文件名
 * @param {string} type - 文件类型，如 'customer-complaint', 'supplier-complaint', 'publishing-exceptions' 等
 * @returns {string} 完整的文件访问URL
 */
export const buildTypedFileUrl = (filename, type) => {
  if (!filename) return ''
  
  const config = getFileServerConfigSync()
  const prefix = config.fileUrlPrefix || '/files'
  
  return buildFileUrl(`${prefix}/${type}/${filename}`)
}

export default {
  getFileServerConfig,
  getFileServerConfigSync,
  initFileServerConfig,
  getFileServerPrefix,
  buildFileUrl,
  buildTypedFileUrl
}
