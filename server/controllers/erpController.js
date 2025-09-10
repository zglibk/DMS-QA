/**
 * ERP系统数据管理 - 控制器
 * 功能：处理ERP系统相关的业务逻辑
 * 版本：v1.0
 * 创建日期：2025-01-15
 */

const ErpService = require('../services/erpService');
const { logger, LOG_CATEGORIES, MODULES } = require('../utils/logger');

// 创建ERP服务实例
const erpService = new ErpService();

/**
 * 获取成品入库明细列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductInSumList = async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        logger.info('开始获取成品入库明细列表', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: { StartDate, EndDate },
            userId: req.user?.id,
            username: req.user?.username
        });
        
        // 构建过滤条件
        const filters = {};
        if (StartDate) {
            filters.StartDate = StartDate;
        }
        if (EndDate) {
            filters.EndDate = EndDate;
        }
        
        // 调用服务层获取数据
        const result = await erpService.getProductInSumList(filters);
        
        // 过滤出生产入库的数据
        const filteredResult = Array.isArray(result) 
            ? result.filter(item => item.ProInTypeDes === '生产入库')
            : [];
        
        logger.info('成功获取成品入库明细列表', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: {
                totalCount: Array.isArray(result) ? result.length : 0,
                filteredCount: filteredResult.length,
                filters
            },
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.json({
            success: true,
            data: filteredResult,
            total: filteredResult.length,
            message: '获取成品入库明细列表成功'
        });
        
    } catch (error) {
        logger.error('获取成品入库明细列表失败', {
            category: LOG_CATEGORIES.SYSTEM,
            module: MODULES.ERP,
            operationType: 'QUERY',
            error: error.message,
            stack: error.stack,
            details: req.query,
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.status(500).json({
            success: false,
            message: '获取成品入库明细列表失败',
            error: error.message
        });
    }
};

/**
 * 获取成品出库明细列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductOutSumList = async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        logger.info('开始获取成品出库明细列表', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: { StartDate, EndDate },
            userId: req.user?.id,
            username: req.user?.username
        });
        
        // 构建过滤条件
        const filters = {};
        if (StartDate) {
            filters.StartDate = StartDate;
        }
        if (EndDate) {
            filters.EndDate = EndDate;
        }
        
        // 调用服务层获取数据
        const result = await erpService.getProductOutSumList(filters);
        
        logger.info('成功获取成品出库明细列表', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: {
                count: Array.isArray(result) ? result.length : 0,
                filters
            },
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.json({
            success: true,
            data: result,
            total: Array.isArray(result) ? result.length : 0,
            message: '获取成品出库明细列表成功'
        });
        
    } catch (error) {
        logger.error('获取成品出库明细列表失败', {
            category: LOG_CATEGORIES.SYSTEM,
            module: MODULES.ERP,
            operationType: 'QUERY',
            error: error.message,
            stack: error.stack,
            details: req.query,
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.status(500).json({
            success: false,
            message: '获取成品出库明细列表失败',
            error: error.message
        });
    }
};

/**
 * 获取批次统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getBatchStatistics = async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        logger.info('开始获取批次统计数据', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: { StartDate, EndDate },
            userId: req.user?.id,
            username: req.user?.username
        });
        
        // 构建过滤条件
        const filters = {};
        if (StartDate) {
            filters.StartDate = StartDate;
        }
        if (EndDate) {
            filters.EndDate = EndDate;
        }
        
        // 调用服务层获取数据
        const result = await erpService.getBatchStatistics(filters);
        
        logger.info('成功获取批次统计数据', {
            category: LOG_CATEGORIES.BUSINESS,
            module: MODULES.ERP,
            operationType: 'QUERY',
            details: result,
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.json({
            success: true,
            data: result,
            message: '获取批次统计数据成功'
        });
        
    } catch (error) {
        logger.error('获取批次统计数据失败', {
            category: LOG_CATEGORIES.SYSTEM,
            module: MODULES.ERP,
            operationType: 'QUERY',
            error: error.message,
            stack: error.stack,
            details: req.query,
            userId: req.user?.id,
            username: req.user?.username
        });
        
        res.status(500).json({
            success: false,
            message: '获取批次统计数据失败',
            error: error.message
        });
    }
};

module.exports = {
    getProductInSumList,
    getProductOutSumList,
    getBatchStatistics
};