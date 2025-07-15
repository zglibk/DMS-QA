/**
 * API服务封装
 * 自动处理环境切换和API地址检测
 */

import axios from 'axios'
import smartApiDetector from '../utils/smartApiDetector.js'
import environmentManager from '../config/environment.js'

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
      console.log('🚀 初始化API服务...')

      // 获取最佳API地址
      const apiUrl = await smartApiDetector.getApiUrl()
      
      if (!apiUrl) {
        throw new Error('无法获取可用的API地址')
      }

      this.currentBaseURL = apiUrl
      console.log(`✅ API服务初始化完成: ${apiUrl}`)

      // 创建axios实例
      this.axiosInstance = axios.create({
        baseURL: apiUrl,
        timeout: 10000,
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
        const env = environmentManager.getCurrentEnvironment()
        config.headers['X-Environment'] = env

        // 添加时间戳防止缓存
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }

        console.log(`📤 API请求: ${config.method?.toUpperCase()} ${config.url}`)
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
        console.log(`📥 API响应: ${response.status} ${response.config.url}`)
        return response
      },
      async (error) => {
        console.error(`📥 API错误: ${error.response?.status || 'Network'} ${error.config?.url}`)

        // 网络错误或连接失败时尝试切换API地址
        if (!error.response || error.code === 'NETWORK_ERROR') {
          console.log('🔄 检测到网络错误，尝试切换API地址...')
          
          try {
            // 重新检测API地址
            const newApiUrl = await smartApiDetector.getApiUrl({ forceDetect: true })
            
            if (newApiUrl && newApiUrl !== this.currentBaseURL) {
              console.log(`🔄 切换到新的API地址: ${newApiUrl}`)
              
              // 更新baseURL
              this.currentBaseURL = newApiUrl
              this.axiosInstance.defaults.baseURL = newApiUrl
              
              // 重试原请求
              const originalRequest = error.config
              originalRequest.baseURL = newApiUrl
              
              return this.axiosInstance.request(originalRequest)
            }
          } catch (switchError) {
            console.error('🔄 API地址切换失败:', switchError)
          }
        }

        // 处理认证错误
        if (error.response?.status === 401) {
          console.log('🔐 认证失败，清除token')
          localStorage.removeItem('token')
          // 可以在这里触发重新登录
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
    console.log('🔄 重新初始化API服务...')
    
    this.isInitialized = false
    this.initPromise = null
    this.axiosInstance = null
    this.currentBaseURL = null

    return this.initialize()
  }

  /**
   * 手动设置API地址
   */
  async setApiUrl(url) {
    console.log(`🎯 手动设置API地址: ${url}`)
    
    smartApiDetector.setApiUrl(url)
    await this.reinitialize()
  }

  /**
   * 获取当前API地址
   */
  getCurrentApiUrl() {
    return this.currentBaseURL
  }

  /**
   * 获取API状态信息
   */
  async getStatus() {
    const connectionTest = await this.testConnection()
    const apiStatus = await smartApiDetector.getApiStatus()
    
    return {
      ...apiStatus,
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
