/**
 * 图片预览服务
 * 提供统一的图片预览功能，支持HTTP方式访问图片
 */
import apiService from './apiService'
import { ElMessage } from 'element-plus'

class ImagePreviewService {
  constructor() {
    this.cache = new Map() // 图片URL缓存
  }

  /**
   * 判断是否为图片文件
   * @param {string} filePath - 文件路径
   * @returns {boolean}
   */
  isImageFile(filePath) {
    if (!filePath) return false
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

  /**
   * 通过记录ID获取图片预览URL（HTTP方式）
   * @param {number|string} recordId - 投诉记录ID
   * @returns {Promise<string>} 图片的Blob URL
   */
  async getImageUrlByRecordId(recordId) {
    if (!recordId) {
      throw new Error('记录ID不能为空')
    }

    const cacheKey = `record_${recordId}`
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      // 通过后端API获取图片数据
      const response = await apiService.get(`/api/complaint/file/${recordId}`, {
        responseType: 'blob'
      })

      const blob = response.data
      const imageUrl = URL.createObjectURL(blob)
      
      // 缓存URL
      this.cache.set(cacheKey, imageUrl)
      
      return imageUrl
    } catch (error) {
      console.error('获取图片失败:', error)
      throw new Error('图片加载失败')
    }
  }

  /**
   * 通过文件路径获取图片预览URL（HTTP方式）
   * @param {string} filePath - 文件路径
   * @param {number|string} recordId - 关联的记录ID（用于API调用）
   * @returns {Promise<string>} 图片的Blob URL
   */
  async getImageUrlByPath(filePath, recordId) {
    if (!filePath || !this.isImageFile(filePath)) {
      throw new Error('无效的图片文件路径')
    }

    // 如果有recordId，优先使用记录ID方式获取
    if (recordId) {
      return await this.getImageUrlByRecordId(recordId)
    }

    // 如果是HTTP URL，直接返回
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath
    }

    // 如果是data URL，直接返回
    if (filePath.startsWith('data:')) {
      return filePath
    }

    // 如果是blob URL，直接返回
    if (filePath.startsWith('blob:')) {
      return filePath
    }

    // 如果是相对路径（上传到服务器的文件），构建服务器URL
    if (!filePath.includes(':\\') && !filePath.startsWith('\\\\')) {
      // 构建服务器文件URL，对路径的各个部分分别进行URL编码
      const pathParts = filePath.split('/')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      return `/files/attachments/${encodedPath}`
    }

    // 其他情况抛出错误，因为我们不使用file://协议
    throw new Error('无法通过HTTP方式访问该文件路径，请提供记录ID')
  }

  /**
   * 预加载图片
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<void>}
   */
  async preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片预加载失败'))
      img.src = imageUrl
    })
  }

  /**
   * 清理缓存中的URL
   * @param {string} cacheKey - 缓存键
   */
  clearCache(cacheKey) {
    if (this.cache.has(cacheKey)) {
      const url = this.cache.get(cacheKey)
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
      this.cache.delete(cacheKey)
    }
  }

  /**
   * 清理所有缓存
   */
  clearAllCache() {
    for (const [key, url] of this.cache.entries()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    }
    this.cache.clear()
  }

  /**
   * 获取文件名（从路径中提取）
   * @param {string} filePath - 文件路径
   * @returns {string}
   */
  getFileName(filePath) {
    if (!filePath) return ''
    
    // 处理Windows路径
    if (filePath.includes('\\')) {
      return filePath.substring(filePath.lastIndexOf('\\') + 1)
    }
    
    // 处理Unix路径
    if (filePath.includes('/')) {
      return filePath.substring(filePath.lastIndexOf('/') + 1)
    }
    
    // 如果没有路径分隔符，直接返回
    return filePath
  }

  /**
   * 创建图片预览组件的配置对象
   * @param {string} filePath - 文件路径
   * @param {number|string} recordId - 记录ID
   * @returns {Object} 预览配置
   */
  createPreviewConfig(filePath, recordId) {
    return {
      filePath,
      recordId,
      fileName: this.getFileName(filePath),
      isImage: this.isImageFile(filePath),
      service: this
    }
  }
}

// 创建单例实例
const imagePreviewService = new ImagePreviewService()

export default imagePreviewService
