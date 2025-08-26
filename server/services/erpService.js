const axios = require('axios');
const erpConfigLoader = require('../utils/erpConfigLoader');

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
     */
    async _doLoadConfig() {
        try {
            console.log('正在加载ERP配置...');
            const config = await erpConfigLoader.getErpConnectionConfig();
            
            // 检查配置是否完整，如果不完整则使用默认配置
            if (!config.baseUrl || !config.appId || !config.appSecret) {
                console.warn('数据库配置不完整，使用默认配置');
                this.baseUrl = 'http://192.168.1.168:99';
                this.appId = 'xybfc6ae9da4484e95b27e71ab6c6623b4';
                this.appSecret = 'e020c4d79c7a49e3a7b1ab4b6749a1f6';
            } else {
                this.baseUrl = config.baseUrl;
                this.appId = config.appId;
                this.appSecret = config.appSecret;
            }
            
            this.configLoaded = true;
            
            console.log('ERP配置加载成功:', {
                baseUrl: this.baseUrl,
                appId: this.appId ? this.appId.substring(0, 8) + '...' : null
            });
        } catch (error) {
            console.error('加载ERP配置失败:', error.message);
            // 使用默认配置作为备选
            this.baseUrl = 'http://192.168.1.168:99';
            this.appId = 'xybfc6ae9da4484e95b27e71ab6c6623b4';
            this.appSecret = 'e020c4d79c7a49e3a7b1ab4b6749a1f6';
            this.configLoaded = true;
            console.log('使用默认ERP配置');
        }
    }

    /**
     * 重新加载ERP配置
     * 强制从数据库重新获取配置信息
     */
    async reloadConfig() {
        try {
            console.log('重新加载ERP配置...');
            this.configLoaded = false;
            this.configLoadingPromise = null; // 重置加载状态
            // 清除token缓存，因为配置可能已更改
            this.token = null;
            this.tokenExpireTime = null;
            // 清除配置加载器的缓存
            erpConfigLoader.clearCache();
            // 重新加载配置
            await this.loadConfig();
            console.log('ERP配置重新加载完成');
        } catch (error) {
            console.error('重新加载ERP配置失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取ERP系统访问token
     * @returns {Promise<string>} 返回token字符串
     * @throws {Error} 当获取token失败时抛出错误
     */
    async getToken() {
        try {
            // 确保配置已加载
            await this.loadConfig();
            
            // 检查token是否仍然有效
            if (this.token && this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
                console.log('使用缓存的token');
                return this.token;
            }

            console.log('正在获取新的ERP token...');
            
            // 构建请求URL
            const tokenUrl = `${this.baseUrl}/client/token`;
            const params = {
                appid: this.appId,
                appsecret: this.appSecret
            };

            // 发送GET请求获取token
            const response = await axios.get(tokenUrl, {
                params: params,
                timeout: 10000, // 10秒超时
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'DMS-QA-System/1.0'
                }
            });

            console.log('ERP token响应:', response.data);

            // 检查响应状态
            if (response.data.code === 0) {
                this.token = response.data.data;
                // 设置token过期时间（假设token有效期为1小时）
                this.tokenExpireTime = Date.now() + (60 * 60 * 1000);
                
                console.log('ERP token获取成功:', this.token);
                return this.token;
            } else {
                throw new Error(`获取token失败: ${response.data.msg || '未知错误'}`);
            }

        } catch (error) {
            console.error('获取ERP token时发生错误:', error.message);
            
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

            console.log(`发送ERP请求: ${method.toUpperCase()} ${endpoint}`);
            
            // 发送请求
            const response = await axios(config);
            
            console.log(`ERP响应状态: ${response.status}`);
            return response.data;

        } catch (error) {
            console.error(`ERP请求失败 [${method.toUpperCase()} ${endpoint}]:`, error.message);
            
            if (error.response?.status === 401) {
                // token可能已过期，清除缓存并重试一次
                console.log('Token可能已过期，清除缓存并重试...');
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
            console.log('获取ERP生产数据...');
            // 这里需要根据实际的ERP接口文档来实现
            // 示例端点，实际使用时需要替换为真实的API端点
            return await this.makeRequest('/api/production', 'GET', null, filters);
        } catch (error) {
            console.error('获取生产数据失败:', error.message);
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
            console.log('获取ERP交付数据...');
            // 这里需要根据实际的ERP接口文档来实现
            // 示例端点，实际使用时需要替换为真实的API端点
            return await this.makeRequest('/api/delivery', 'GET', null, filters);
        } catch (error) {
            console.error('获取交付数据失败:', error.message);
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
            console.log('获取ERP成品入库明细列表...', filters);
            
            // 构建查询参数
            const params = {};
            if (filters.StartDate) {
                params.StartDate = filters.StartDate;
            }
            if (filters.EndDate) {
                params.EndDate = filters.EndDate;
            }
            
            // 调用ERP接口
            return await this.makeRequest('/api/stock/productInSum/getList', 'GET', null, params);
        } catch (error) {
            console.error('获取成品入库明细列表失败:', error.message);
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
            console.log('获取ERP成品出库明细列表...', filters);
            
            // 构建查询参数
            const params = {};
            if (filters.StartDate) {
                params.StartDate = filters.StartDate;
            }
            if (filters.EndDate) {
                params.EndDate = filters.EndDate;
            }
            
            // 调用ERP接口
            return await this.makeRequest('/api/stock/productOutSum/getList', 'GET', null, params);
        } catch (error) {
            console.error('获取成品出库明细列表失败:', error.message);
            throw error;
        }
    }

    /**
     * 测试ERP连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        try {
            console.log('测试ERP系统连接...');
            const token = await this.getToken();
            return !!token;
        } catch (error) {
            console.error('ERP连接测试失败:', error.message);
            return false;
        }
    }
}

// 创建单例实例
const erpService = new ErpService();

module.exports = erpService;