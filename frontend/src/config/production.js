/**
 * 生产环境优化配置
 * 确保编译打包后的正常运行
 */

class ProductionOptimizer {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isBuild = process.env.NODE_ENV === 'production' || process.env.VITE_BUILD === 'true';
  }

  /**
   * 获取优化后的环境配置
   */
  getOptimizedConfig() {
    const baseConfig = {
      // 开发环境配置
      development: {
        name: 'development',
        description: '开发环境',
        detection: {
          hostnames: ['localhost', '127.0.0.1'],
          ports: ['3000', '5173', '8080', '8081'],
          protocols: ['http:', 'https:']
        },
        apiUrls: [
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          'http://192.168.1.57:3001',
          'http://192.168.1.57/api',
        ],
        features: {
          debug: true,
          showNotifications: true,
          autoReload: true
        }
      },

      // 生产环境配置
      production: {
        name: 'production',
        description: '生产环境',
        detection: {
          hostnames: ['192.168.1.57'],
          ports: ['80', '8081', '8080'],
          protocols: ['http:', 'https:']
        },
        apiUrls: [
          // 生产环境使用相对路径，避免硬编码IP
          '/api',                               // Nginx代理（最优）
          'http://192.168.1.57/api',           // 绝对路径备用
          'http://192.168.1.57:3001',          // 直连后端
          'http://192.168.1.57:8081/api',      // 备用端口
        ],
        features: {
          debug: false,
          showNotifications: false,  // 生产环境减少通知
          autoReload: false
        }
      }
    };

    // 生产环境优化
    if (this.isProduction) {
      // 优化生产环境的API地址
      baseConfig.production.apiUrls = this.optimizeProductionUrls(
        baseConfig.production.apiUrls
      );
      
      // 减少调试信息
      baseConfig.production.features.debug = false;
      baseConfig.production.features.showNotifications = false;
    }

    return baseConfig;
  }

  /**
   * 优化生产环境的API地址
   */
  optimizeProductionUrls(urls) {
    const currentHost = this.getCurrentHost();
    const currentProtocol = this.getCurrentProtocol();
    
    // 构建优化后的URL列表
    const optimizedUrls = [];
    
    // 1. 优先使用相对路径（与当前域名相同）
    optimizedUrls.push('/api');
    
    // 2. 使用当前协议和主机
    if (currentHost && currentHost !== 'localhost') {
      optimizedUrls.push(`${currentProtocol}//${currentHost}/api`);
      optimizedUrls.push(`${currentProtocol}//${currentHost}:3001`);
    }
    
    // 3. 添加原始配置作为备用
    urls.forEach(url => {
      if (!optimizedUrls.includes(url)) {
        optimizedUrls.push(url);
      }
    });
    
    return optimizedUrls;
  }

  /**
   * 获取当前主机名
   */
  getCurrentHost() {
    if (typeof window !== 'undefined') {
      return window.location.hostname;
    }
    return null;
  }

  /**
   * 获取当前协议
   */
  getCurrentProtocol() {
    if (typeof window !== 'undefined') {
      return window.location.protocol;
    }
    return 'http:';
  }

  /**
   * 获取构建时的环境变量
   */
  getBuildTimeConfig() {
    return {
      NODE_ENV: process.env.NODE_ENV,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
      VITE_BUILD_TIME: process.env.VITE_BUILD_TIME || new Date().toISOString(),
      VITE_VERSION: process.env.VITE_VERSION || '1.0.0'
    };
  }

  /**
   * 检查是否为静态部署
   */
  isStaticDeployment() {
    // 检查是否为静态文件部署（如通过 file:// 协议访问）
    if (typeof window !== 'undefined') {
      return window.location.protocol === 'file:';
    }
    return false;
  }

  /**
   * 获取运行时环境信息
   */
  getRuntimeInfo() {
    const info = {
      isProduction: this.isProduction,
      isBuild: this.isBuild,
      isStaticDeployment: this.isStaticDeployment(),
      buildTimeConfig: this.getBuildTimeConfig(),
      currentLocation: null
    };

    if (typeof window !== 'undefined') {
      info.currentLocation = {
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        pathname: window.location.pathname
      };
    }

    return info;
  }

  /**
   * 生产环境错误处理
   */
  handleProductionError(error, context = '') {
    if (this.isProduction) {
      // 生产环境只记录到控制台，不显示用户通知
      console.error(`[生产环境错误] ${context}:`, error);
      
      // 可以在这里添加错误上报逻辑
      this.reportError(error, context);
    } else {
      // 开发环境显示详细错误
      console.error(`[开发环境错误] ${context}:`, error);
    }
  }

  /**
   * 错误上报（生产环境）
   */
  reportError(error, context) {
    // 这里可以集成错误监控服务
    // 例如：Sentry, LogRocket, 或自定义错误收集
    try {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        context: context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        buildInfo: this.getBuildTimeConfig()
      };
      
      // 发送到错误收集服务
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorInfo)
      // }).catch(() => {
      //   // 忽略错误上报失败
      // });
      
      console.log('错误信息已记录:', errorInfo);
    } catch (reportError) {
      // 忽略错误上报过程中的错误
      console.warn('错误上报失败:', reportError);
    }
  }

  /**
   * 性能监控
   */
  trackPerformance(name, startTime) {
    if (this.isProduction) {
      const duration = Date.now() - startTime;
      console.log(`[性能] ${name}: ${duration}ms`);
      
      // 可以在这里添加性能监控逻辑
      // 例如：Google Analytics, 自定义性能收集
    }
  }

  /**
   * 功能开关
   */
  isFeatureEnabled(featureName) {
    const features = {
      // 开发环境功能
      debugMode: !this.isProduction,
      detailedLogging: !this.isProduction,
      errorNotifications: !this.isProduction,
      
      // 生产环境功能
      errorReporting: this.isProduction,
      performanceTracking: this.isProduction,
      
      // 通用功能
      apiAutoDetection: true,
      caching: true,
      retryMechanism: true
    };

    return features[featureName] || false;
  }
}

// 创建全局实例
const productionOptimizer = new ProductionOptimizer();

export default productionOptimizer;
