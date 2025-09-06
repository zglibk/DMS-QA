const erpConfigLoader = require('../utils/erpConfigLoader');
const { logger, LOG_CATEGORIES, SEVERITY_LEVELS, MODULES } = require('../utils/logger');

/**
 * 迅越ERP系统服务类
 * 用于与迅越ERP系统进行数据交互
 */
class ErpService {
    constructor() {
        // ERP系统基础配置（将从数据库动态加载）
        this.baseUrl = null;
        this.appId = null;
        this.appSecret = null;
        this.token = null;
        this.tokenExpireTime = null;
        this.configLoaded = false;
        this.configLoadingPromise = null; // 用于防止并发加载
        this.externalToken = null; // 外部设置的ERP token
        this.timeout = 30000; // 30秒超时
    }

    /**
     * 设置外部传入的ERP token
     * @param {string} token - 外部获取的ERP token
     */
    setErpToken(token) {
        this.externalToken = token;
        logger.info('设置外部ERP token成功', {
            category: LOG_CATEGORIES.SYSTEM,
            module: MODULES.ERP,
            operationType: 'SET_TOKEN',
            details: { hasToken: !!token }
        });
    }

    /**
     * 清除外部设置的ERP token
     */
    clearErpToken() {
        this.externalToken = null;
        logger.info('清除外部ERP token', {
            category: LOG_CATEGORIES.SYSTEM,
            module: MODULES.ERP,
            operationType: 'CLEAR_TOKEN'
        });
    }

    /**
     * 加载ERP配置
     * 从erp_config表中动态获取配置信息
     */
    async loadConfig() {
        // 如果配置已加载，直接返回
        if (this.configLoaded) {
            return;
        }

        // 如果正在加载中，等待加载完成
        if (this.configLoadingPromise) {
            await this.configLoadingPromise;
            return;
        }

        // 开始加载配置
        this.configLoadingPromise = this._doLoadConfig();
        
        try {
            await this.configLoadingPromise;
        } finally {
            this.configLoadingPromise = null;
        }
    }

    /**
     * 实际执行配置加载的私有方法
     * 直接从数据库获取所有配置项
     */
    async _doLoadConfig() {
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
                
                // 设置ERP连接配置
                this.baseUrl = configMap['erp_api_url'] ;
                this.appId = configMap['erp_app_id'];
                this.appSecret = configMap['erp_app_secret'];
                
                this.configLoaded = true;
                // ERP配置从数据库加载成功
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            // 通过API获取ERP配置失败，使用环境变量配置
            
            // 使用环境变量配置作为备选
            this.baseUrl = process.env.ERP_BASE_URL || 'http://http://192.168.1.168:99';
            this.appId = process.env.ERP_APP_ID || 'default_app_id';
            this.appSecret = process.env.ERP_APP_SECRET || 'default_app_secret';
            this.configLoaded = true;
        }
    }

    /**
     * 重新加载ERP配置
     * 强制从数据库重新获取配置信息
     */
    async reloadConfig() {
        try {
            // 重新加载ERP配置
            this.configLoaded = false;
            this.configLoadingPromise = null; // 重置加载状态
            // 清除token缓存，因为配置可能已更改
            this.token = null;
            this.tokenExpireTime = null;
            // 清除配置加载器的缓存
            erpConfigLoader.clearCache();
            // 重新加载配置
            await this.loadConfig();
            // ERP配置重新加载完成
        } catch (error) {
            // 重新加载ERP配置失败
            throw error;
        }
    }

    /**
     * 设置外部传入的ERP token
     * @param {string} token - 外部获取的token
     * @param {number} expireTime - token过期时间（可选，默认1小时后过期）
     */
    setToken(token, expireTime = null) {
        this.token = token;
        this.tokenExpireTime = expireTime || (Date.now() + (60 * 60 * 1000)); // 默认1小时后过期
        // 设置外部ERP token成功
    }

    /**
     * 清除当前token缓存
     */
    clearToken() {
        this.token = null;
        this.tokenExpireTime = null;
        // ERP token缓存已清除
    }

    /**
     * 获取ERP系统访问token
     * 优先使用外部设置的token，如果没有则获取新token
     * @returns {Promise<string>} 返回token字符串
     * @throws {Error} 当获取token失败时抛出错误
     */
    async getToken() {
        try {
            // 优先使用外部设置的token
            if (this.externalToken) {
                logger.info('使用外部设置的ERP token', {
                    category: LOG_CATEGORIES.SYSTEM,
                    module: MODULES.ERP,
                    operationType: 'GET_TOKEN',
                    details: { source: 'external' }
                });
                return this.externalToken;
            }

            // 确保配置已加载
            await this.loadConfig();
            
            // 检查token是否仍然有效
            if (this.token && this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
                // 使用缓存的token
                return this.token;
            }

            // 正在获取新的ERP token
            
            // 构建请求URL
            const tokenUrl = `${this.baseUrl}/client/token`;
            const params = {
                appid: this.appId,
                appsecret: this.appSecret
            };

            // 使用内置模块发送GET请求获取token
            const http = require('http');
            const url = require('url');
            const querystring = require('querystring');
            
            const fullUrl = `${tokenUrl}?${querystring.stringify(params)}`;
            const parsedUrl = url.parse(fullUrl);
            
            const response = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 80,
                    path: parsedUrl.path,
                    method: 'GET',
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'DMS-QA-System/1.0'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve({ data: jsonData });
                        } catch (error) {
                            reject(new Error('解析响应JSON失败: ' + error.message));
                        }
                    });
                });
                
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });
                
                req.end();
            });

            // ERP token响应日志已移除

            // 检查响应状态
            if (response.data.code === 0) {
                this.token = response.data.data;
                // 设置token过期时间（假设token有效期为1小时）
                this.tokenExpireTime = Date.now() + (60 * 60 * 1000);
                
                logger.info('ERP token获取成功', {
                    category: LOG_CATEGORIES.SYSTEM,
                    module: MODULES.ERP,
                    operationType: 'GET_TOKEN',
                    details: { source: 'api', token: this.token }
                });
                return this.token;
            } else {
                throw new Error(`获取token失败: ${response.data.msg || '未知错误'}`);
            }

        } catch (error) {
            // 获取ERP token时发生错误
            
            // 重置token缓存
            this.token = null;
            this.tokenExpireTime = null;
            
            if (error.response) {
                // 服务器响应了错误状态码
                throw new Error(`ERP服务器错误: ${error.response.status} - ${error.response.data?.msg || error.response.statusText}`);
            } else if (error.request) {
                // 请求已发出但没有收到响应
                throw new Error('无法连接到ERP服务器，请检查网络连接');
            } else {
                // 其他错误
                throw new Error(`请求配置错误: ${error.message}`);
            }
        }
    }

    /**
     * 发送带token的请求到ERP系统
     * @param {string} endpoint - API端点
     * @param {string} method - HTTP方法 (GET, POST, PUT, DELETE)
     * @param {Object} data - 请求数据
     * @param {Object} params - URL参数
     * @returns {Promise<Object>} 返回API响应数据
     */
    async makeRequest(endpoint, method = 'GET', data = null, params = {}) {
        try {
            // 确保配置已加载
            await this.loadConfig();
            
            // 获取有效token
            const token = await this.getToken();
            
            // 构建请求配置
            const config = {
                method: method.toLowerCase(),
                url: `${this.baseUrl}${endpoint}`,
                timeout: 30000, // 30秒超时
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'DMS-QA-System/1.0',
                    'access_token': token // 在请求头中携带token
                },
                params: {
                    ...params,
                    // 也可以在URL参数中携带token（备选方案）
                    // access_token: token
                }
            };

            // 如果有请求数据，添加到配置中
            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                config.data = data;
            }

            // 发送ERP请求
            
            // 使用内置http模块发送请求
            const http = require('http');
            const url = require('url');
            const querystring = require('querystring');
            
            let fullUrl = config.url;
            if (Object.keys(config.params).length > 0) {
                fullUrl += '?' + querystring.stringify(config.params);
            }
            
            const parsedUrl = url.parse(fullUrl);
            
            const response = await new Promise((resolve, reject) => {
                const requestData = config.data ? JSON.stringify(config.data) : null;
                
                const req = http.request({
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 80,
                    path: parsedUrl.path,
                    method: config.method.toUpperCase(),
                    timeout: config.timeout,
                    headers: {
                        ...config.headers,
                        ...(requestData && { 'Content-Length': Buffer.byteLength(requestData) })
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve({ status: res.statusCode, data: jsonData });
                        } catch (error) {
                            reject(new Error('解析响应JSON失败: ' + error.message));
                        }
                    });
                });
                
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });
                
                if (requestData) {
                    req.write(requestData);
                }
                req.end();
            });
            
            // ERP响应状态日志已移除
            return response.data;

        } catch (error) {
            // ERP请求失败
            
            if (error.response?.status === 401) {
                // token可能已过期，清除缓存并重试一次
                // Token可能已过期，清除缓存并重试
                this.token = null;
                this.tokenExpireTime = null;
                
                // 递归重试一次
                if (!params._retry) {
                    params._retry = true;
                    return await this.makeRequest(endpoint, method, data, params);
                }
            }
            
            throw error;
        }
    }

    /**
     * 获取生产数据
     * @param {Object} filters - 过滤条件
     * @returns {Promise<Object>} 生产数据
     */
    async getProductionData(filters = {}) {
        try {
            // 获取ERP生产数据
            // 这里需要根据实际的ERP接口文档来实现
            // 示例端点，实际使用时需要替换为真实的API端点
            return await this.makeRequest('/api/production', 'GET', null, filters);
        } catch (error) {
            // 获取生产数据失败
            throw error;
        }
    }

    /**
     * 获取交付数据
     * @param {Object} filters - 过滤条件
     * @returns {Promise<Object>} 交付数据
     */
    async getDeliveryData(filters = {}) {
        try {
            // 获取ERP交付数据
            // 这里需要根据实际的ERP接口文档来实现
            // 示例端点，实际使用时需要替换为真实的API端点
            return await this.makeRequest('/api/delivery', 'GET', null, filters);
        } catch (error) {
            // 获取交付数据失败
            throw error;
        }
    }

    /**
     * 获取成品入库明细列表
     * @param {Object} filters - 过滤条件
     * @param {string} filters.StartDate - 开始日期，格式为yyyy-MM-dd HH:mm:ss
     * @param {string} filters.EndDate - 结束日期，格式为yyyy-MM-dd HH:mm:ss
     * @returns {Promise<Object>} 成品入库明细数据
     */
    async getProductInSumList(filters = {}) {
        try {
            // 获取ERP成品入库明细列表
            
            // 构建查询参数
            const params = {};
            if (filters.StartDate) {
                params.StartDate = filters.StartDate;
            }
            if (filters.EndDate) {
                params.EndDate = filters.EndDate;
            }
            
            // 调用ERP接口
            const result = await this.makeRequest('/api/stock/productInSum/getList', 'GET', null, params);
            // ERP入库接口返回数据结构日志已移除
            return result;
        } catch (error) {
            // 获取成品入库明细列表失败
            throw error;
        }
    }

    /**
     * 获取成品出库明细列表
     * @param {Object} filters - 过滤条件
     * @param {string} filters.StartDate - 开始日期，格式为yyyy-MM-dd HH:mm:ss
     * @param {string} filters.EndDate - 结束日期，格式为yyyy-MM-dd HH:mm:ss
     * @returns {Promise<Object>} 成品出库明细数据
     */
    async getProductOutSumList(filters = {}) {
        try {
            // 获取ERP成品出库明细列表
            
            // 构建查询参数
            const params = {};
            if (filters.StartDate) {
                params.StartDate = filters.StartDate;
            }
            if (filters.EndDate) {
                params.EndDate = filters.EndDate;
            }
            
            // 调用ERP接口
            const result = await this.makeRequest('/api/stock/productOutSum/getList', 'GET', null, params);
            // ERP出库接口返回数据结构日志已移除
            return result;
        } catch (error) {
            // 获取成品出库明细列表失败
            throw error;
        }
    }

    /**
     * 获取批次统计数据
     * @param {string} startDate - 开始时间 (yyyy-MM-dd HH:mm:ss)
     * @param {string} endDate - 结束时间 (yyyy-MM-dd HH:mm:ss)
     * @returns {Promise<Object>} 批次统计结果
     */
    async getBatchStatistics(startDate, endDate) {
        try {
            logger.info('开始统计ERP批次数据', {
                category: LOG_CATEGORIES.BUSINESS,
                module: MODULES.ERP,
                operationType: 'QUERY',
                details: { startDate, endDate }
            });

            // 并行获取入库和出库数据
            const [inData, outData] = await Promise.all([
                this.getProductInSumList({ StartDate: startDate, EndDate: endDate }),
                this.getProductOutSumList({ StartDate: startDate, EndDate: endDate })
            ]);

            // 统计交检批次数（入库接口直接返回数组）
            let inspectionBatches = 0;
            if (inData && Array.isArray(inData)) {
                inspectionBatches = inData.length;
            } else if (inData && inData.data && Array.isArray(inData.data)) {
                // 如果入库数据也是包装在data字段中
                inspectionBatches = inData.data.length;
            }

            // 统计交货批次数（出库接口返回带data字段的对象）
            let deliveryBatches = 0;
            if (outData && outData.data && Array.isArray(outData.data)) {
                deliveryBatches = outData.data.length;
            } else if (outData && Array.isArray(outData)) {
                // 如果出库数据直接是数组
                deliveryBatches = outData.length;
            }

            const result = {
                inspectionBatches: inspectionBatches,
                deliveryBatches: deliveryBatches,
                inDataCount: (inData && Array.isArray(inData)) ? inData.length : 0,
                outDataCount: (outData && outData.data && Array.isArray(outData.data)) ? outData.data.length : 0,
                dateRange: `${startDate} - ${endDate}`
            };

            logger.info('ERP批次数据统计完成', {
                category: LOG_CATEGORIES.BUSINESS,
                module: MODULES.ERP,
                operationType: 'QUERY',
                details: result
            });

            return result;

        } catch (error) {
            logger.error('统计ERP批次数据失败', {
                category: LOG_CATEGORIES.SYSTEM,
                module: MODULES.ERP,
                operationType: 'QUERY',
                error: error.message,
                stack: error.stack,
                details: { startDate, endDate }
            });

            throw new Error(`统计批次数据失败: ${error.message}`);
        }
    }

    /**
     * 获取指定月份的批次统计数据
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Promise<Object>} 月度批次统计数据
     */
    async getMonthlyBatchStatistics(year, month) {
        try {
            // 构建月份的开始和结束时间（修复时区问题）
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01 00:00:00`;
            
            // 计算该月最后一天，避免时区偏差
            let lastDay;
            if (month === 12) {
                // 12月的情况，下一年1月1日减1天
                lastDay = new Date(year + 1, 0, 0).getDate();
            } else {
                // 其他月份，下个月1日减1天
                lastDay = new Date(year, month, 0).getDate();
            }
            
            const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')} 23:59:59`;

            logger.info('获取月度ERP批次统计', {
                category: LOG_CATEGORIES.BUSINESS,
                module: MODULES.ERP,
                operationType: 'QUERY',
                details: { year, month, startDate, endDateStr }
            });

            const statistics = await this.getBatchStatistics(startDate, endDateStr);
            
            return {
                year,
                month,
                ...statistics
            };

        } catch (error) {
            logger.error('获取月度ERP批次统计失败', {
                category: LOG_CATEGORIES.SYSTEM,
                module: MODULES.ERP,
                operationType: 'QUERY',
                error: error.message,
                stack: error.stack,
                details: { year, month }
            });

            throw new Error(`获取${year}年${month}月批次统计失败: ${error.message}`);
        }
    }

    /**
     * 测试ERP连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        try {
            // 测试ERP系统连接
            const token = await this.getToken();
            return !!token;
        } catch (error) {
            // ERP连接测试失败
            return false;
        }
    }
}

// 创建单例实例
const erpService = new ErpService();

module.exports = erpService;