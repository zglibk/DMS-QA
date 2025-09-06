const { executeQuery } = require('../db');

/**
 * ERP配置加载器
 * 用于从erp_config表中动态获取ERP系统配置
 */
class ErpConfigLoader {
    constructor() {
        this.configCache = new Map();
        this.cacheExpireTime = 5 * 60 * 1000; // 缓存5分钟
        this.lastLoadTime = null;
    }

    /**
     * 获取ERP配置
     * @param {string} configKey - 配置键名
     * @param {string} defaultValue - 默认值
     * @returns {Promise<string>} 配置值
     */
    async getConfig(configKey, defaultValue = null) {
        try {
            // 检查缓存是否有效
            if (this.isCacheValid() && this.configCache.has(configKey)) {
                return this.configCache.get(configKey);
            }

            // 从数据库获取配置
            try {
                await this.loadConfigFromDatabase();
            } catch (loadError) {
                // 静默处理加载错误，已在loadConfigFromDatabase中记录
            }
            
            return this.configCache.get(configKey) || defaultValue;
        } catch (error) {
            console.error(`获取ERP配置失败 [${configKey}]:`, error.message);
            return defaultValue;
        }
    }

    /**
     * 获取所有ERP配置
     * @returns {Promise<Object>} 配置对象
     */
    async getAllConfigs() {
        try {
            // 检查缓存是否有效
            if (!this.isCacheValid()) {
                await this.loadConfigFromDatabase();
            }

            // 将Map转换为普通对象
            const configs = {};
            for (const [key, value] of this.configCache.entries()) {
                configs[key] = value;
            }
            return configs;
        } catch (error) {
            console.error('获取所有ERP配置失败:', error.message);
            return {};
        }
    }

    /**
     * 从数据库加载配置
     */
    async loadConfigFromDatabase() {
        try {
            const query = 'SELECT config_key, config_value FROM erp_config WHERE config_value IS NOT NULL';
            const result = await executeQuery(async (pool) => {
                return await pool.request().query(query);
            });

            // 检查executeQuery是否返回null（数据库连接失败）
            if (result === null) {
                console.log('ERP配置加载失败：数据库连接失败');
                // 如果缓存为空，设置默认配置
                if (this.configCache.size === 0) {
                    this.setDefaultConfigs();
                }
                return;
            }

            // 清空缓存并重新加载
            this.configCache.clear();
            
            if (result.recordset && result.recordset.length > 0) {
                result.recordset.forEach(row => {
                    this.configCache.set(row.config_key, row.config_value);
                });
                console.log(`ERP配置加载成功：${result.recordset.length}个配置项`);
            } else {
                console.log('ERP配置加载失败：未找到配置项，使用默认配置');
                this.setDefaultConfigs();
            }

            this.lastLoadTime = Date.now();
        } catch (error) {
            console.log('ERP配置加载失败:', error.message);
            // 如果缓存为空，设置默认配置
            if (this.configCache.size === 0) {
                this.setDefaultConfigs();
            }
            throw error;
        }
    }

    /**
     * 设置默认配置
     */
    setDefaultConfigs() {
        // 使用环境变量或默认值，避免硬编码
        this.configCache.set('erp_api_url', process.env.ERP_BASE_URL);
        this.configCache.set('erp_app_id', process.env.ERP_APP_ID);
        this.configCache.set('erp_app_secret', process.env.ERP_APP_SECRET);
        this.configCache.set('sync_enabled', 'true');
        this.configCache.set('sync_interval', '0 */1 * * *');
        this.configCache.set('sync_types', 'production,delivery');
        this.configCache.set('sync_time_range', '24');
    }

    /**
     * 检查缓存是否有效
     * @returns {boolean} 缓存是否有效
     */
    isCacheValid() {
        return this.lastLoadTime && 
               (Date.now() - this.lastLoadTime) < this.cacheExpireTime;
    }

    /**
     * 清除配置缓存
     */
    clearCache() {
        this.configCache.clear();
        this.lastLoadTime = null;
    }

    /**
     * 获取ERP连接配置
     * 直接从数据库获取所有配置项
     * @returns {Promise<Object>} ERP连接配置对象
     */
    async getErpConnectionConfig() {
        try {
            // 直接从数据库获取所有配置项
            const { executeQuery } = require('../db');
            const query = 'SELECT config_key, config_value FROM erp_config ORDER BY config_key';
            
            const result = await executeQuery(async (pool) => {
                return await pool.request().query(query);
            });
            
            if (result.recordset && result.recordset.length > 0) {
                // 将结果转换为对象格式便于查找
                const configMap = {};
                result.recordset.forEach(row => {
                    configMap[row.config_key] = row.config_value;
                });
                
                const baseUrl = configMap['erp_api_url'] || '';
                const appId = configMap['erp_app_id'] ? configMap['erp_app_id'].replace(/\r?\n/g, '') : '';
                const appSecret = configMap['erp_app_secret'] || '';
                
                // 检查配置键获取情况
                const configStatus = {
                    baseUrl: !!baseUrl,
                    appId: !!appId,
                    appSecret: !!appSecret
                };
                
                const allConfigsLoaded = configStatus.baseUrl && configStatus.appId && configStatus.appSecret;
                console.log(`ERP连接配置通过API拼接${allConfigsLoaded ? '成功' : '失败'}:`, 
                           `baseUrl=${configStatus.baseUrl}, appId=${configStatus.appId}, appSecret=${configStatus.appSecret}`);

                return {
                    baseUrl,
                    appId,
                    appSecret
                };
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            console.log('通过API获取ERP连接配置失败:', error.message);
            // 返回默认配置，使用环境变量避免硬编码
            return {
                baseUrl: process.env.ERP_BASE_URL || 'http://192.168.1.168:99',
                appId: process.env.ERP_APP_ID || 'default_app_id',
                appSecret: process.env.ERP_APP_SECRET || 'default_app_secret'
            };
        }
    }

    /**
     * 获取ERP同步配置
     * @returns {Promise<Object>} ERP同步配置对象
     */
    async getErpSyncConfig() {
        try {
            const [enabled, interval, syncTypes, timeRange] = await Promise.all([
                this.getConfig('sync_enabled', 'true'),
                this.getConfig('sync_interval', '0 */1 * * *'),
                this.getConfig('sync_types', 'production,delivery'),
                this.getConfig('sync_time_range', '24')
            ]);

            return {
                enabled: enabled === 'true',
                interval,
                syncTypes: syncTypes.split(',').map(type => type.trim()),
                timeRange: parseInt(timeRange) || 24
            };
        } catch (error) {
            console.error('获取ERP同步配置失败:', error.message);
            // 返回默认配置
            return {
                enabled: true,
                interval: '0 */1 * * *',
                syncTypes: ['production', 'delivery'],
                timeRange: 24
            };
        }
    }
}

// 创建单例实例
const erpConfigLoader = new ErpConfigLoader();

module.exports = erpConfigLoader;