/**
 * API 地址自动检测工具
 * 自动检测可用的后端 API 地址
 */

class ApiDetector {
  constructor() {
    this.detectionTimeout = 3000; // 3秒超时
    this.retryCount = 2; // 重试次数
    this.detectedApiUrl = null;
    this.isDetecting = false;
  }

  /**
   * 获取候选 API 地址列表
   * 按优先级排序
   */
  getCandidateUrls() {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // 候选地址列表 (按优先级排序)
    const candidates = [
      // 1. 当前域名的不同端口 (最高优先级)
      `${currentProtocol}//${currentHost}:3001`,
      `${currentProtocol}//${currentHost}/api`,
      
      // 2. 局域网服务器地址
      'http://192.168.1.57:3001',
      'http://192.168.1.57/api',
      'http://192.168.1.57:8081/api',
      
      // 3. 本地开发地址
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      
      // 4. 其他可能的地址
      `${currentProtocol}//${currentHost}:8081/api`,
      `${currentProtocol}//${currentHost}:8080/api`,
    ];

    // 去重并返回
    return [...new Set(candidates)];
  }

  /**
   * 测试单个 API 地址是否可用
   */
  async testApiUrl(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.detectionTimeout);

      const response = await fetch(`${url}/api/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        mode: 'cors', // 允许跨域
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          url: url,
          data: data,
          responseTime: Date.now()
        };
      }
      
      return { success: false, url: url, error: `HTTP ${response.status}` };
    } catch (error) {
      return { 
        success: false, 
        url: url, 
        error: error.name === 'AbortError' ? 'Timeout' : error.message 
      };
    }
  }

  /**
   * 自动检测可用的 API 地址
   */
  async detectApiUrl() {
    if (this.isDetecting) {
      console.log('API 检测正在进行中...');
      return this.detectedApiUrl;
    }

    this.isDetecting = true;
    console.log('开始自动检测 API 地址...');

    try {
      const candidates = this.getCandidateUrls();
      console.log('候选 API 地址:', candidates);

      // 并发测试所有候选地址
      const testPromises = candidates.map(url => this.testApiUrl(url));
      const results = await Promise.allSettled(testPromises);

      // 找到第一个成功的地址
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value.success) {
          this.detectedApiUrl = result.value.url;
          console.log('✓ 检测到可用 API 地址:', this.detectedApiUrl);
          
          // 保存到本地存储
          localStorage.setItem('detectedApiUrl', this.detectedApiUrl);
          localStorage.setItem('apiDetectionTime', Date.now().toString());
          
          return this.detectedApiUrl;
        }
      }

      // 如果没有找到可用地址，尝试使用缓存的地址
      const cachedUrl = localStorage.getItem('detectedApiUrl');
      if (cachedUrl) {
        console.log('⚠ 未检测到可用地址，使用缓存地址:', cachedUrl);
        this.detectedApiUrl = cachedUrl;
        return cachedUrl;
      }

      console.error('✗ 未找到可用的 API 地址');
      return null;

    } catch (error) {
      console.error('API 检测过程出错:', error);
      return null;
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * 获取当前检测到的 API 地址
   */
  getDetectedUrl() {
    return this.detectedApiUrl || localStorage.getItem('detectedApiUrl');
  }

  /**
   * 手动设置 API 地址
   */
  setApiUrl(url) {
    this.detectedApiUrl = url;
    localStorage.setItem('detectedApiUrl', url);
    localStorage.setItem('apiDetectionTime', Date.now().toString());
    console.log('手动设置 API 地址:', url);
  }

  /**
   * 清除缓存的 API 地址
   */
  clearCache() {
    this.detectedApiUrl = null;
    localStorage.removeItem('detectedApiUrl');
    localStorage.removeItem('apiDetectionTime');
    console.log('API 地址缓存已清除');
  }

  /**
   * 检查缓存是否过期 (默认1小时)
   */
  isCacheExpired(maxAge = 3600000) { // 1小时 = 3600000ms
    const detectionTime = localStorage.getItem('apiDetectionTime');
    if (!detectionTime) return true;
    
    return (Date.now() - parseInt(detectionTime)) > maxAge;
  }

  /**
   * 智能获取 API 地址
   * 优先使用缓存，缓存过期或无效时重新检测
   */
  async getApiUrl(forceDetect = false) {
    // 如果强制检测或缓存过期，重新检测
    if (forceDetect || this.isCacheExpired()) {
      return await this.detectApiUrl();
    }

    // 使用缓存的地址
    const cachedUrl = this.getDetectedUrl();
    if (cachedUrl) {
      console.log('使用缓存的 API 地址:', cachedUrl);
      return cachedUrl;
    }

    // 缓存为空，进行检测
    return await this.detectApiUrl();
  }
}

// 创建全局实例
const apiDetector = new ApiDetector();

export default apiDetector;
