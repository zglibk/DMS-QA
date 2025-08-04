/**
 * 环境配置管理器
 * 支持开发环境和生产环境的自动切换
 *
 * 使用方法:
 * import environmentManager from '@/config/environment.js'
 *
 * // 获取当前环境
 * const env = environmentManager.getCurrentEnvironment()
 *
 * // 获取API地址列表
 * const apiUrls = environmentManager.getApiUrls()
 */

// 消息通知工具
class MessageNotifier {
  constructor() {
    this.ElMessage = null;
    this.isProduction = false;
    this.initElMessage();
  }

  async initElMessage() {
    try {
      // 动态导入 Element Plus 消息组件
      const { ElMessage } = await import('element-plus');
      this.ElMessage = ElMessage;

      // 检查是否为生产环境
      this.isProduction = process.env.NODE_ENV === 'production';
    } catch (error) {
      console.warn('Element Plus 未找到，将使用 console 输出');
    }
  }

  // 成功消息
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

  // 信息消息
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

  // 警告消息
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

  // 错误消息
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

  // 调试消息（仅开发环境）
  debug(message) {
    if (!this.isProduction) {
      console.log(`🔍 ${message}`);
    }
  }
}

class EnvironmentManager {
  constructor() {
    this.currentEnv = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = this.initConfig();
    this.notifier = new MessageNotifier();

    // 延迟初始化，确保 Element Plus 已加载
    setTimeout(() => {
      this.getSmartEnvironment();
    }, 100);
  }

  /**
   * 初始化环境配置
   */
  initConfig() {
    return {
      // 开发环境配置
      development: {
        name: 'development',
        description: '开发环境',
        // 开发环境的识别条件
        detection: {
          hostnames: ['localhost', '127.0.0.1', '192.168.1.100'], // 开发机IP
          ports: ['3000', '5173', '8080', '8081'], // 常见开发端口
          protocols: ['http:', 'https:']
        },
        // API地址优先级（开发环境优先本地）
        apiUrls: [
          'http://localhost:3001',           // 本地后端（SQL Server版本）
          'http://localhost:3002',           // 本地后端（SQLite临时版本）
          'http://127.0.0.1:3001',          // 本地后端备用（SQL Server）
          'http://127.0.0.1:3002',          // 本地后端备用（SQLite）
          'http://192.168.1.57:3001',       // 远程后端
          'http://192.168.1.57/api',        // 远程后端（Nginx代理）
          'http://192.168.1.57:8081/api',   // 远程后端（8081端口）
        ],
        // 其他开发环境配置
        features: {
          debug: true,
          mockData: false,
          autoReload: true
        }
      },

      // 生产环境配置
      production: {
        name: 'production',
        description: '生产环境',
        // 生产环境的识别条件
        detection: {
          hostnames: ['192.168.1.57'], // 生产服务器IP
          ports: ['80', '8081', '8080'], // 生产环境端口
          protocols: ['http:', 'https:']
        },
        // API地址优先级（生产环境优先远程）
        apiUrls: this.isProduction ? [
          '/api',                           // 相对路径（最优，避免跨域）
          'http://192.168.1.57/api',        // Nginx代理
          'http://192.168.1.57:3001',       // 直连后端
          'http://192.168.1.57:8081/api',   // 备用端口
        ] : [
          'http://localhost:3001',           // 本地后端（主要）
          'http://127.0.0.1:3001',          // 本地后端备用
          'http://192.168.1.57/api',        // Nginx代理
          'http://192.168.1.57:3001',       // 直连后端
          'http://192.168.1.57:8081/api',   // 备用端口
        ],
        // 生产环境配置
        features: {
          debug: !this.isProduction,
          mockData: false,
          autoReload: false,
          showNotifications: !this.isProduction  // 生产环境减少通知
        }
      },

      // 测试环境配置（可选）
      testing: {
        name: 'testing',
        description: '测试环境',
        detection: {
          hostnames: ['192.168.1.58', 'test.local'],
          ports: ['80', '8081'],
          protocols: ['http:']
        },
        apiUrls: [
          'http://192.168.1.58:3001',
          'http://192.168.1.58/api',
        ],
        features: {
          debug: true,
          mockData: true,
          autoReload: false
        }
      }
    };
  }

  /**
   * 自动检测当前环境
   */
  detectEnvironment() {
    const currentLocation = window.location;
    const hostname = currentLocation.hostname;
    const port = currentLocation.port;
    const protocol = currentLocation.protocol;

    this.notifier.debug(`检测环境信息: ${hostname}:${port || '80'} (${protocol})`);

    // 遍历所有环境配置进行匹配
    for (const [envName, envConfig] of Object.entries(this.config)) {
      const { detection } = envConfig;

      // 检查主机名匹配
      const hostnameMatch = detection.hostnames.some(h =>
        hostname === h || hostname.includes(h)
      );

      // 检查端口匹配（如果指定了端口）
      const portMatch = !port || detection.ports.includes(port);

      // 检查协议匹配
      const protocolMatch = detection.protocols.includes(protocol);

      if (hostnameMatch && portMatch && protocolMatch) {
        this.currentEnv = envName;
        this.notifier.success(`环境检测: ${envConfig.description}`, false);
        return envName;
      }
    }

    // 默认环境判断逻辑
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.currentEnv = 'development';
      this.notifier.info('环境检测: 开发环境 (默认)', false);
    } else {
      this.currentEnv = 'production';
      this.notifier.info('环境检测: 生产环境 (默认)', false);
    }

    return this.currentEnv;
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment() {
    if (!this.currentEnv) {
      this.detectEnvironment();
    }
    return this.currentEnv;
  }

  /**
   * 获取当前环境配置
   */
  getCurrentConfig() {
    const env = this.getCurrentEnvironment();
    return this.config[env];
  }

  /**
   * 获取当前环境的API地址列表
   */
  getApiUrls() {
    const config = this.getCurrentConfig();
    return config.apiUrls;
  }

  /**
   * 获取环境特性配置
   */
  getFeatures() {
    const config = this.getCurrentConfig();
    return config.features;
  }

  /**
   * 手动设置环境
   */
  setEnvironment(envName) {
    if (this.config[envName]) {
      this.currentEnv = envName;
      this.notifier.success(`手动切换到: ${this.config[envName].description}`, true);
      // 保存到本地存储
      localStorage.setItem('manualEnvironment', envName);
      return true;
    }
    this.notifier.error(`未知环境: ${envName}`, true);
    return false;
  }

  /**
   * 清除手动设置的环境
   */
  clearManualEnvironment() {
    localStorage.removeItem('manualEnvironment');
    this.currentEnv = null;
    this.notifier.info('已清除手动环境设置，将重新自动检测', true);
  }

  /**
   * 获取手动设置的环境
   */
  getManualEnvironment() {
    return localStorage.getItem('manualEnvironment');
  }

  /**
   * 智能环境检测（考虑手动设置）
   */
  getSmartEnvironment() {
    // 优先使用手动设置的环境
    const manualEnv = this.getManualEnvironment();
    if (manualEnv && this.config[manualEnv]) {
      this.currentEnv = manualEnv;
      this.notifier.info(`使用手动设置: ${this.config[manualEnv].description}`, false);
      return manualEnv;
    }

    // 自动检测环境
    return this.detectEnvironment();
  }

  /**
   * 获取环境信息摘要
   */
  getEnvironmentSummary() {
    const env = this.getCurrentEnvironment();
    const config = this.getCurrentConfig();
    const isManual = !!this.getManualEnvironment();

    return {
      environment: env,
      description: config.description,
      isManual: isManual,
      apiUrls: config.apiUrls,
      features: config.features,
      location: {
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol
      }
    };
  }
}

// 创建全局实例
const environmentManager = new EnvironmentManager();

export default environmentManager;
