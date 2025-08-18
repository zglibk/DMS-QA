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
    // 如果没有文件路径，返回false
    if (!filePath || typeof filePath !== 'string') {
      return false
    }

    // 如果是blob URL，直接认为是图片（因为我们只为图片创建blob URL）
    if (filePath.startsWith('blob:')) {
      return true
    }

    // 如果是base64图片数据，检查MIME类型
    if (filePath.startsWith('data:image/')) {
      return true
    }

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
    console.log(`=== imagePreviewService.getImageUrlByRecordId ===`)
    console.log(`记录ID: ${recordId}`)
    console.log(`缓存键: ${cacheKey}`)

    // 检查缓存并验证有效性
    if (this.cache.has(cacheKey)) {
      const cachedUrl = this.cache.get(cacheKey)
      console.log(`发现缓存URL: ${cachedUrl}`)

      // 验证blob URL是否仍然有效
      if (cachedUrl.startsWith('blob:')) {
        try {
          // 尝试创建一个Image对象来验证blob URL是否有效
          const testImg = new Image()
          const isValid = await new Promise((resolve) => {
            testImg.onload = () => resolve(true)
            testImg.onerror = () => resolve(false)
            testImg.src = cachedUrl
            // 设置超时，避免长时间等待
            setTimeout(() => resolve(false), 1000)
          })

          if (isValid) {
            console.log(`缓存URL有效，使用缓存: ${cachedUrl}`)
            return cachedUrl
          } else {
            console.log(`缓存URL已失效，清理缓存: ${cachedUrl}`)
            this.clearCache(cacheKey)
          }
        } catch (error) {
          console.log(`缓存URL验证失败，清理缓存: ${cachedUrl}`)
          this.clearCache(cacheKey)
        }
      } else {
        // 非blob URL直接使用
        console.log(`使用缓存URL: ${cachedUrl}`)
        return cachedUrl
      }
    }

    try {
      console.log(`调用API: /api/complaint/file/${recordId}`)

      // 通过后端API获取图片数据
      const response = await apiService.get(`/complaint/file/${recordId}`, {
        responseType: 'blob'
      })

      console.log(`API响应状态: ${response.status}`)
      console.log(`响应头Content-Type: ${response.headers['content-type']}`)
      console.log(`Blob大小: ${response.data.size} bytes`)
      console.log(`Blob类型: ${response.data.type}`)

      const blob = response.data

      // 检查blob是否有效
      if (!blob || blob.size === 0) {
        throw new Error('API返回的文件数据为空')
      }

      // 检查是否是图片类型
      if (!blob.type.startsWith('image/')) {
        console.warn(`警告: Blob类型不是图片: ${blob.type}`)
        // 如果后端返回的Content-Type不正确，但文件确实是图片，我们仍然尝试创建URL
      }

      // 尝试读取blob的前几个字节来验证是否是图片
      const arrayBuffer = await blob.slice(0, 10).arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const header = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ')
      console.log(`文件头部字节: ${header}`)

      // 检查是否是JPEG文件 (FF D8 FF)
      if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
        console.log('✓ 确认是JPEG文件格式')
      } else {
        console.warn('⚠ 文件头部不是JPEG格式')
      }

      const imageUrl = URL.createObjectURL(blob)
      console.log(`创建的Blob URL: ${imageUrl}`)

      // 测试blob URL是否可以访问
      try {
        const testResponse = await fetch(imageUrl, { method: 'HEAD' })
        console.log(`Blob URL测试结果: ${testResponse.status}`)
      } catch (testError) {
        console.error('Blob URL测试失败:', testError)
      }

      // 缓存URL
      this.cache.set(cacheKey, imageUrl)
      console.log(`已缓存图片URL`)

      return imageUrl
    } catch (error) {
      console.error('获取图片失败:', error)
      console.error('错误详情:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })

      // 根据不同的错误状态提供更具体的错误信息
      let errorMessage = '图片加载失败'
      if (error.response?.status === 404) {
        errorMessage = '记录不存在或该记录无附件文件'
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (error.message.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络连接'
      } else {
        errorMessage = '图片加载失败: ' + error.message
      }

      throw new Error(errorMessage)
    }
  }

  /**
   * 通过文件路径获取图片预览URL（HTTP方式）
   * @param {string} filePath - 文件路径
   * @param {number|string} recordId - 关联的记录ID（用于API调用）
   * @returns {Promise<string>} 图片的Blob URL
   */
  async getImageUrlByPath(filePath, recordId) {
    // 如果有recordId，优先使用记录ID方式获取（即使filePath为空）
    if (recordId) {
      return await this.getImageUrlByRecordId(recordId)
    }

    // 如果没有recordId，则需要有效的filePath
    if (!filePath || !this.isImageFile(filePath)) {
      throw new Error('无效的图片文件路径')
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
