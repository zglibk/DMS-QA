/**
 * API服务封装
 * 使用固定的API地址配置
 */

import axios from 'axios'

class ApiService {
  constructor() {
    this.axiosInstance = null
    this.currentBaseURL = null
    this.isInitialized = false
    this.initPromise = null
  }

  /**
   * 初始化API服务
   */
  async initialize() {
    if (this.isInitialized) {
      return this.axiosInstance
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._doInitialize()
    return this.initPromise
  }

  async _doInitialize() {
    try {
      // 直接使用vite配置的代理路径，与main.js保持一致
      const apiUrl = '/api'
      // ApiService初始化，使用vite代理路径
      this.currentBaseURL = apiUrl

      // 创建axios实例
      // 注意：不设置baseURL，使用main.js中已设置的axios.defaults.baseURL
      this.axiosInstance = axios.create({
        timeout: 10000, // 10秒超时
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // 设置请求拦截器
      this.setupRequestInterceptor()
      
      // 设置响应拦截器
      this.setupResponseInterceptor()

      this.isInitialized = true
      return this.axiosInstance
    } catch (error) {
      console.error('❌ API服务初始化失败:', error)
      this.initPromise = null
      throw error
    }
  }

  /**
   * 设置请求拦截器
   */
  setupRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加认证token（如果有）
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 添加环境标识
        // 设置环境标识
        config.headers['X-Environment'] = 'production'

        // 添加时间戳防止缓存
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }
        return config
      },
      (error) => {
        console.error('📤 请求拦截器错误:', error)
        return Promise.reject(error)
      }
    )
  }

  /**
   * 设置响应拦截器
   */
  setupResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        console.error(`📥 API错误: ${error.response?.status || 'Network'} ${error.config?.url}`)

        // 移除API地址切换逻辑，使用固定地址

        // 处理认证错误
        if (error.response?.status === 401) {
          // 认证失败，清除token
          localStorage.removeItem('token')
          
          // 由路由守卫处理跳转逻辑，避免重复跳转
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 获取axios实例
   */
  async getInstance() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    return this.axiosInstance
  }

  /**
   * GET请求
   */
  async get(url, config = {}) {
    const instance = await this.getInstance()
    return instance.get(url, config)
  }

  /**
   * POST请求
   */
  async post(url, data = {}, config = {}) {
    const instance = await this.getInstance()
    return instance.post(url, data, config)
  }

  /**
   * PUT请求
   */
  async put(url, data = {}, config = {}) {
    const instance = await this.getInstance()
    return instance.put(url, data, config)
  }

  /**
   * DELETE请求
   */
  async delete(url, config = {}) {
    const instance = await this.getInstance()
    return instance.delete(url, config)
  }

  /**
   * 上传文件
   * @param {string} url - 上传地址
   * @param {File} file - 要上传的文件
   * @param {Function} [onProgress] - 上传进度回调函数
   * @returns {Promise} - 上传请求的 Promise
   */
  async upload(url, file, onProgress = null) {
    const instance = await this.getInstance()
    
    const formData = new FormData()
    formData.append('file', file)

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    }

    return instance.post(url, formData, config)
  }

  /**
   * 下载文件
   */
  async download(url, filename = null) {
    const instance = await this.getInstance()
    
    const response = await instance.get(url, {
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || `download_${Date.now()}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    return response
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const instance = await this.getInstance()
      const response = await instance.get('/test-connection')
      return {
        success: true,
        data: response.data,
        baseURL: this.currentBaseURL
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        baseURL: this.currentBaseURL
      }
    }
  }

  /**
   * 重新初始化（强制重新检测API地址）
   */
  async reinitialize() {        
    this.isInitialized = false
    this.initPromise = null
    this.axiosInstance = null
    this.currentBaseURL = null

    return this.initialize()
  }

  /**
   * 根据vite配置和环境获取API地址列表
/**
   * 获取当前API地址
   */
  getCurrentApiUrl() {
    return this.currentBaseURL
  }

  /**
   * 获取baseURL属性（兼容性方法）
   */
  get baseURL() {
    return this.currentBaseURL || '/api'
  }

  /**
   * 获取API状态信息
   */
  async getStatus() {
    const connectionTest = await this.testConnection()
    
    return {
      currentBaseURL: this.currentBaseURL,
      isInitialized: this.isInitialized,
      connectionTest,
      axiosInstance: {
        baseURL: this.currentBaseURL,
        isInitialized: this.isInitialized
      }
    }
  }
}

// 创建全局实例
const apiService = new ApiService()

// 导出实例和类
export default apiService
export { ApiService }
