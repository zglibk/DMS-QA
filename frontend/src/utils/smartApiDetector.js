/**
 * 智能API检测器
 * 结合环境管理器，实现智能的API地址检测和切换
 */

import environmentManager from '../config/environment.js';

// 消息通知工具（复用环境管理器的通知器）
class ApiNotifier {
  constructor() {
    this.ElMessage = null;
    this.isProduction = false;
    this.initElMessage();
  }

  async initElMessage() {
    try {
      const { ElMessage } = await import('element-plus');
      this.ElMessage = ElMessage;
      this.isProduction = process.env.NODE_ENV === 'production';
    } catch (error) {
      console.warn('Element Plus 未找到，将使用 console 输出');
    }
  }

  success(message, showInProduction = false) {
    if (this.ElMessage && (showInProduction || !this.isProduction)) {
      this.ElMessage.success({
        message: message,
        duration: 3000,
        showClose: true
      });
    }
    console.log(`✅ ${message}`);
  }

  info(message, showInProduction = false) {
    if (this.ElMessage && (showInProduction || !this.isProduction)) {
      this.ElMessage.info({
        message: message,
        duration: 3000,
        showClose: true
      });
    }
    console.log(`ℹ️ ${message}`);
  }

  warning(message, showInProduction = true) {
    if (this.ElMessage && (showInProduction || !this.isProduction)) {
      this.ElMessage.warning({
        message: message,
        duration: 4000,
        showClose: true
      });
    }
    console.warn(`⚠️ ${message}`);
  }

  error(message, showInProduction = true) {
    if (this.ElMessage && (showInProduction || !this.isProduction)) {
      this.ElMessage.error({
        message: message,
        duration: 5000,
        showClose: true
      });
    }
    console.error(`❌ ${message}`);
  }

  debug(message) {
    if (!this.isProduction) {
      console.log(`🔍 ${message}`);
    }
  }
}

class SmartApiDetector {
  constructor() {
    this.detectionTimeout = 5000; // 5秒超时
    this.fastTimeout = 2000; // 快速检测超时
    this.retryCount = 2;
    this.currentApiUrl = null;
    this.isDetecting = false;
    this.detectionResults = new Map(); // 缓存检测结果
    this.notifier = new ApiNotifier();
  }

  /**
   * 测试API地址连通性
   */
  async testApiConnection(url, timeout = this.detectionTimeout) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`🔍 测试API连接: ${url}`);
      this.notifier.debug(`测试API连接: ${url}`);

      const testUrl = `${url}/api/test-connection`;
      console.log(`📡 完整请求URL: ${testUrl}`);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      console.log(`📊 响应状态: ${response.status}, 响应时间: ${responseTime}ms`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API连接成功: ${url} (${responseTime}ms)`, data);
        this.notifier.debug(`API连接成功: ${url} (${responseTime}ms)`);

        return {
          success: true,
          url: url,
          responseTime: responseTime,
          data: data,
          timestamp: Date.now()
        };
      } else {
        console.error(`❌ API连接失败: ${url} - HTTP ${response.status}`);
        this.notifier.debug(`API连接失败: ${url} - HTTP ${response.status}`);
        return {
          success: false,
          url: url,
          error: `HTTP ${response.status}`,
          responseTime: responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
      console.error(`💥 API连接异常: ${url} - ${errorMsg} (${responseTime}ms)`, error);
      this.notifier.debug(`API连接异常: ${url} - ${errorMsg} (${responseTime}ms)`);

      return {
        success: false,
        url: url,
        error: errorMsg,
        responseTime: responseTime
      };
    }
  }

  /**
   * 并发测试多个API地址
   */
  async testMultipleApis(urls, concurrent = true) {
    this.notifier.debug(`开始测试 ${urls.length} 个API地址 (并发: ${concurrent})`);

    if (concurrent) {
      // 并发测试所有地址
      const promises = urls.map(url => this.testApiConnection(url, this.fastTimeout));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => ({
        url: urls[index],
        result: result.status === 'fulfilled' ? result.value : {
          success: false,
          url: urls[index],
          error: result.reason?.message || 'Unknown error'
        }
      }));
    } else {
      // 顺序测试，找到第一个可用的就返回
      const results = [];
      for (const url of urls) {
        const result = await this.testApiConnection(url, this.fastTimeout);
        results.push({ url, result });

        if (result.success) {
          this.notifier.success(`API连接成功: ${url}`, false);
          break;
        }
      }
      return results;
    }
  }

  /**
   * 智能检测最佳API地址
   */
  async detectBestApi(forceDetect = false) {
    if (this.isDetecting) {
      this.notifier.info('API检测正在进行中...', false);
      return this.currentApiUrl;
    }

    this.isDetecting = true;

    try {
      // 获取当前环境的API地址列表
      const apiUrls = environmentManager.getApiUrls();
      const envSummary = environmentManager.getEnvironmentSummary();

      this.notifier.debug(`当前环境: ${envSummary.description}`);
      this.notifier.debug(`候选API地址: ${apiUrls.join(', ')}`);

      // 检查缓存
      if (!forceDetect) {
        const cachedUrl = this.getCachedApiUrl();
        if (cachedUrl && apiUrls.includes(cachedUrl)) {
          // 快速验证缓存的地址
          const quickTest = await this.testApiConnection(cachedUrl, 1000);
          if (quickTest.success) {
            this.notifier.info(`使用缓存API: ${cachedUrl}`, false);
            this.currentApiUrl = cachedUrl;
            return cachedUrl;
          } else {
            this.notifier.warning('缓存API无效，重新检测', false);
            this.clearApiCache();
          }
        }
      }

      // 智能检测策略
      let bestApi = null;

      // 策略1: 顺序测试（优先级模式）
      this.notifier.debug('策略1: 按优先级顺序测试...');
      const sequentialResults = await this.testMultipleApis(apiUrls, false);

      for (const { url, result } of sequentialResults) {
        if (result.success) {
          bestApi = result;
          break;
        }
      }

      // 策略2: 如果顺序测试没找到，尝试并发测试所有地址
      if (!bestApi) {
        this.notifier.debug('策略2: 并发测试所有地址...');
        const concurrentResults = await this.testMultipleApis(apiUrls, true);

        // 找到所有成功的连接
        const successfulApis = concurrentResults
          .filter(({ result }) => result.success)
          .map(({ result }) => result)
          .sort((a, b) => a.responseTime - b.responseTime); // 按响应时间排序

        if (successfulApis.length > 0) {
          bestApi = successfulApis[0]; // 选择响应最快的
          this.notifier.success(`API检测成功: ${bestApi.url} (${bestApi.responseTime}ms)`, true);
        }
      }

      if (bestApi) {
        this.currentApiUrl = bestApi.url;
        this.cacheApiUrl(bestApi.url);
        this.notifier.success(`API连接就绪: ${bestApi.url}`, false);
        return bestApi.url;
      } else {
        this.notifier.error('未找到可用的API地址', true);
        return null;
      }

    } catch (error) {
      this.notifier.error(`API检测失败: ${error.message}`, true);
      return null;
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * 获取当前API地址
   */
  getCurrentApiUrl() {
    return this.currentApiUrl || this.getCachedApiUrl();
  }

  /**
   * 手动设置API地址
   */
  setApiUrl(url) {
    this.currentApiUrl = url;
    this.cacheApiUrl(url);
    this.notifier.success(`手动设置API: ${url}`, true);
  }

  /**
   * 缓存API地址
   */
  cacheApiUrl(url) {
    const cacheData = {
      url: url,
      timestamp: Date.now(),
      environment: environmentManager.getCurrentEnvironment()
    };
    localStorage.setItem('smartApiCache', JSON.stringify(cacheData));
  }

  /**
   * 获取缓存的API地址
   */
  getCachedApiUrl() {
    try {
      const cacheData = JSON.parse(localStorage.getItem('smartApiCache'));
      if (!cacheData) return null;

      // 检查缓存是否过期（30分钟）
      const maxAge = 30 * 60 * 1000; // 30分钟
      if (Date.now() - cacheData.timestamp > maxAge) {
        console.log('⏰ API缓存已过期');
        return null;
      }

      // 检查环境是否匹配
      if (cacheData.environment !== environmentManager.getCurrentEnvironment()) {
        console.log('🔄 环境已变更，缓存失效');
        return null;
      }

      return cacheData.url;
    } catch (error) {
      console.error('📦 读取API缓存失败:', error);
      return null;
    }
  }

  /**
   * 清除API缓存
   */
  clearApiCache() {
    localStorage.removeItem('smartApiCache');
    this.currentApiUrl = null;
    this.notifier.info('API缓存已清除', true);
  }

  /**
   * 获取API状态信息
   */
  async getApiStatus() {
    const currentUrl = this.getCurrentApiUrl();
    const envSummary = environmentManager.getEnvironmentSummary();
    
    let status = null;
    if (currentUrl) {
      status = await this.testApiConnection(currentUrl, 3000);
    }

    return {
      environment: envSummary,
      currentApiUrl: currentUrl,
      apiStatus: status,
      availableUrls: envSummary.apiUrls,
      cacheInfo: this.getCacheInfo()
    };
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo() {
    try {
      const cacheData = JSON.parse(localStorage.getItem('smartApiCache'));
      return cacheData ? {
        url: cacheData.url,
        age: Date.now() - cacheData.timestamp,
        environment: cacheData.environment
      } : null;
    } catch {
      return null;
    }
  }

  /**
   * 智能获取API地址（主入口方法）
   */
  async getApiUrl(options = {}) {
    const { forceDetect = false, timeout = 10000 } = options;

    // 设置总体超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API检测超时')), timeout);
    });

    try {
      const result = await Promise.race([
        this.detectBestApi(forceDetect),
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      console.error('⚠️ API检测超时或失败:', error.message);
      
      // 降级策略：返回缓存的地址或默认地址
      const cachedUrl = this.getCachedApiUrl();
      if (cachedUrl) {
        console.log('🔄 使用缓存地址作为降级方案');
        return cachedUrl;
      }

      // 最后的降级：返回环境的第一个地址
      const apiUrls = environmentManager.getApiUrls();
      if (apiUrls.length > 0) {
        console.log('🆘 使用默认地址作为最后降级方案');
        return apiUrls[0];
      }

      return null;
    }
  }
}

// 创建全局实例
const smartApiDetector = new SmartApiDetector();

export default smartApiDetector;
