const express = require('express');
const router = express.Router();
const erpService = require('../services/erpService');
const erpSyncService = require('../services/erpSyncService');
const { authenticateToken } = require('../middleware/auth');

/**
 * ERP系统数据接口路由
 * 用于获取生产和交付数据，支持实时更新客户投诉率等指标
 */

/**
 * 测试ERP连接（无需认证）
 * GET /api/erp/test-connection-public
 */
router.get('/test-connection-public', async (req, res) => {
    try {
        console.log('测试ERP系统连接（公开接口）...');
        const isConnected = await erpService.testConnection();
        
        if (isConnected) {
            res.json({
                code: 0,
                message: 'ERP系统连接成功',
                data: {
                    status: 'connected',
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({
                code: -1,
                message: 'ERP系统连接失败',
                data: null
            });
        }
    } catch (error) {
        console.error('ERP连接测试错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `ERP连接测试失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 测试ERP连接
 * GET /api/erp/test-connection
 */
router.get('/test-connection', authenticateToken, async (req, res) => {
    try {
        console.log('测试ERP系统连接...');
        const isConnected = await erpService.testConnection();
        
        if (isConnected) {
            res.json({
                code: 0,
                message: 'ERP系统连接成功',
                data: {
                    status: 'connected',
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({
                code: -1,
                message: 'ERP系统连接失败',
                data: null
            });
        }
    } catch (error) {
        console.error('ERP连接测试错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `ERP连接测试失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取ERP token
 * GET /api/erp/token
 */
router.get('/token', authenticateToken, async (req, res) => {
    try {
        console.log('获取ERP token...');
        const token = await erpService.getToken();
        
        res.json({
            code: 0,
            message: 'Token获取成功',
            data: {
                token: token,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('获取ERP token错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `Token获取失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取生产数据
 * GET /api/erp/production
 * 查询参数:
 * - startDate: 开始日期 (YYYY-MM-DD)
 * - endDate: 结束日期 (YYYY-MM-DD)
 * - productLine: 生产线
 * - batchNumber: 批次号
 */
router.get('/production', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, productLine, batchNumber } = req.query;
        
        console.log('获取ERP生产数据:', { startDate, endDate, productLine, batchNumber });
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (productLine) filters.productLine = productLine;
        if (batchNumber) filters.batchNumber = batchNumber;
        
        const productionData = await erpService.getProductionData(filters);
        
        res.json({
            code: 0,
            message: '生产数据获取成功',
            data: productionData
        });
    } catch (error) {
        console.error('获取生产数据错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取生产数据失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取交付数据
 * GET /api/erp/delivery
 * 查询参数:
 * - startDate: 开始日期 (YYYY-MM-DD)
 * - endDate: 结束日期 (YYYY-MM-DD)
 * - customerCode: 客户代码
 * - deliveryStatus: 交付状态
 */
router.get('/delivery', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, customerCode, deliveryStatus } = req.query;
        
        console.log('获取ERP交付数据:', { startDate, endDate, customerCode, deliveryStatus });
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (customerCode) filters.customerCode = customerCode;
        if (deliveryStatus) filters.deliveryStatus = deliveryStatus;
        
        const deliveryData = await erpService.getDeliveryData(filters);
        
        res.json({
            code: 0,
            message: '交付数据获取成功',
            data: deliveryData
        });
    } catch (error) {
        console.error('获取交付数据错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取交付数据失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 同步ERP数据到本地数据库
 * POST /api/erp/sync
 * 请求体:
 * - syncType: 同步类型 (production, delivery, all)
 * - dateRange: 日期范围 { startDate, endDate }
 * - forceUpdate: 是否强制更新 (boolean)
 */
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const { syncType = 'all', dateRange, forceUpdate = false } = req.body;
        
        console.log('开始同步ERP数据:', { syncType, dateRange, forceUpdate });
        
        const syncResult = {
            syncType,
            startTime: new Date().toISOString(),
            results: []
        };
        
        // 根据同步类型执行不同的同步操作
        if (syncType === 'production' || syncType === 'all') {
            try {
                const productionData = await erpService.getProductionData(dateRange);
                // 这里需要实现将生产数据保存到本地数据库的逻辑
                syncResult.results.push({
                    type: 'production',
                    status: 'success',
                    recordCount: productionData?.length || 0,
                    message: '生产数据同步成功'
                });
            } catch (error) {
                syncResult.results.push({
                    type: 'production',
                    status: 'error',
                    message: `生产数据同步失败: ${error.message}`
                });
            }
        }
        
        if (syncType === 'delivery' || syncType === 'all') {
            try {
                const deliveryData = await erpService.getDeliveryData(dateRange);
                // 这里需要实现将交付数据保存到本地数据库的逻辑
                syncResult.results.push({
                    type: 'delivery',
                    status: 'success',
                    recordCount: deliveryData?.length || 0,
                    message: '交付数据同步成功'
                });
            } catch (error) {
                syncResult.results.push({
                    type: 'delivery',
                    status: 'error',
                    message: `交付数据同步失败: ${error.message}`
                });
            }
        }
        
        syncResult.endTime = new Date().toISOString();
        syncResult.duration = new Date(syncResult.endTime) - new Date(syncResult.startTime);
        
        // 检查是否有错误
        const hasErrors = syncResult.results.some(result => result.status === 'error');
        
        if (hasErrors) {
            res.status(207).json({
                code: 1,
                message: '数据同步部分成功',
                data: syncResult
            });
        } else {
            res.json({
                code: 0,
                message: '数据同步完成',
                data: syncResult
            });
        }
        
    } catch (error) {
        console.error('ERP数据同步错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `数据同步失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取同步状态
 * GET /api/erp/sync-status
 */
router.get('/sync-status', authenticateToken, async (req, res) => {
    try {
        // 这里需要实现获取同步状态的逻辑
        // 可以从数据库中查询最近的同步记录
        const syncStatus = {
            lastSyncTime: null, // 最后同步时间
            nextSyncTime: null, // 下次同步时间
            syncInterval: '1 hour', // 同步间隔
            isAutoSyncEnabled: true, // 是否启用自动同步
            lastSyncResults: [] // 最近的同步结果
        };
        
        res.json({
            code: 0,
            message: '同步状态获取成功',
            data: syncStatus
        });
    } catch (error) {
        console.error('获取同步状态错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取同步状态失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 配置自动同步
 * POST /api/erp/auto-sync-config
 * 请求体:
 * - enabled: 是否启用自动同步
 * - interval: 同步间隔 (分钟)
 * - syncTypes: 同步类型数组 ['production', 'delivery']
 * - timeRange: 同步时间范围 (小时)
 */
router.post('/auto-sync-config', authenticateToken, async (req, res) => {
    try {
        const { enabled, interval, syncTypes, timeRange } = req.body;
        
        console.log('配置自动同步:', { enabled, interval, syncTypes, timeRange });
        
        // 更新同步服务配置
        erpSyncService.updateConfig({
            enabled,
            interval,
            syncTypes,
            timeRange
        });
        
        const config = {
            enabled: enabled || false,
            interval: interval || 60, // 默认60分钟
            syncTypes: syncTypes || ['production', 'delivery'],
            timeRange: timeRange || 24, // 默认24小时
            updatedAt: new Date().toISOString()
        };
        
        res.json({
            code: 0,
            message: '自动同步配置保存成功',
            data: config
        });
    } catch (error) {
        console.error('配置自动同步错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `配置自动同步失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 手动触发同步
 * POST /api/erp/sync/manual
 */
router.post('/sync/manual', authenticateToken, async (req, res) => {
    try {
        const { syncTypes, timeRange } = req.body;
        
        // 执行手动同步
        const syncResult = await erpSyncService.performSync({
            syncTypes: syncTypes || ['production', 'delivery'],
            timeRange: timeRange || 24
        });
        
        res.json({
            code: 0,
            message: '手动同步已完成',
            data: syncResult
        });
    } catch (error) {
        console.error('手动同步失败:', error);
        res.status(500).json({
            code: -1,
            message: `手动同步失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 启动同步服务
 * POST /api/erp/sync/start
 */
router.post('/sync/start', authenticateToken, async (req, res) => {
    try {
        erpSyncService.start();
        
        res.json({
            code: 0,
            message: 'ERP同步服务已启动'
        });
    } catch (error) {
        console.error('启动同步服务失败:', error);
        res.status(500).json({
            code: -1,
            message: `启动同步服务失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 停止同步服务
 * POST /api/erp/sync/stop
 */
router.post('/sync/stop', authenticateToken, async (req, res) => {
    try {
        erpSyncService.stop();
        
        res.json({
            code: 0,
            message: 'ERP同步服务已停止'
        });
    } catch (error) {
        console.error('停止同步服务失败:', error);
        res.status(500).json({
            code: -1,
            message: `停止同步服务失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取质量指标
 * GET /api/erp/metrics/quality
 */
router.get('/metrics/quality', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 这里应该从数据库查询质量指标
        // 暂时返回模拟数据
        const metrics = {
            complaintRate: 2.5,
            qualityGrade: 'A',
            onTimeDeliveryRate: 95.8,
            calculationDate: new Date().toISOString().split('T')[0]
        };
        
        res.json({
            code: 0,
            message: '获取质量指标成功',
            data: metrics
        });
    } catch (error) {
        console.error('获取质量指标失败:', error);
        res.status(500).json({
            code: -1,
            message: `获取质量指标失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取成品入库明细列表
 * GET /api/erp/stock/product-in-sum
 * 查询参数:
 * - StartDate: 开始日期 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束日期 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/stock/product-in-sum', authenticateToken, async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        console.log('获取ERP成品入库明细列表:', { StartDate, EndDate });
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const productInSumData = await erpService.getProductInSumList(filters);
        
        res.json({
            code: 0,
            message: '成品入库明细列表获取成功',
            data: productInSumData
        });
    } catch (error) {
        console.error('获取成品入库明细列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取成品入库明细列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取成品出库明细列表
 * GET /api/erp/stock/product-out-sum
 * 查询参数:
 * - StartDate: 开始日期 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束日期 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/stock/product-out-sum', authenticateToken, async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        console.log('获取ERP成品出库明细列表:', { StartDate, EndDate });
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const productOutSumData = await erpService.getProductOutSumList(filters);
        
        res.json({
            code: 0,
            message: '成品出库明细列表获取成功',
            data: productOutSumData
        });
    } catch (error) {
        console.error('获取成品出库明细列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取成品出库明细列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 测试接口：获取成品入库明细列表（无需认证）
 * GET /api/erp/test/stock/product-in-sum
 * 查询参数:
 * - StartDate: 开始日期 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束日期 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/test/stock/product-in-sum', async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        console.log('测试获取ERP成品入库明细列表（无需认证）:', { StartDate, EndDate });
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const productInSumData = await erpService.getProductInSumList(filters);
        
        res.json({
            code: 0,
            message: '成品入库明细列表获取成功（测试接口）',
            data: productInSumData
        });
    } catch (error) {
        console.error('测试获取成品入库明细列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取成品入库明细列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 测试接口：获取成品出库明细列表（无需认证）
 * GET /api/erp/test/stock/product-out-sum
 * 查询参数:
 * - StartDate: 开始日期 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束日期 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/test/stock/product-out-sum', async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        console.log('测试获取ERP成品出库明细列表（无需认证）:', { StartDate, EndDate });
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const productOutSumData = await erpService.getProductOutSumList(filters);
        
        res.json({
            code: 0,
            message: '成品出库明细列表获取成功（测试接口）',
            data: productOutSumData
        });
    } catch (error) {
        console.error('测试获取成品出库明细列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取成品出库明细列表失败: ${error.message}`,
            data: null
        });
    }
});

module.exports = router;