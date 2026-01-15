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
 * 获取ERP token
 * GET /api/erp/token
 */
router.get('/token', authenticateToken, async (req, res) => {
    try {
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
        // console.log('开始同步ERP数据:', { syncType, dateRange, forceUpdate });        
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
        
        // console.log('获取ERP成品入库明细列表:', { StartDate, EndDate });
        
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
        
        // console.log('获取ERP成品出库明细列表:', { StartDate, EndDate });
        
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
 * 查询物料列表
 * GET /api/erp/stock/material
 * 查询参数:
 * - StartDate: 开始时间 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束时间 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/stock/material', authenticateToken, async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const materialData = await erpService.getMaterialList(filters);
        
        res.json({
            code: 0,
            message: '物料列表获取成功',
            data: materialData
        });
    } catch (error) {
        console.error('获取物料列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取物料列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 查询工单列表
 * GET /api/erp/production/work-orders
 * 查询参数:
 * - StartDate: 开始日期 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束日期 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/production/work-orders', authenticateToken, async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const workOrderData = await erpService.getWorkOrderList(filters);
        
        res.json({
            code: 0,
            message: '工单列表获取成功',
            data: workOrderData
        });
    } catch (error) {
        console.error('获取工单列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取工单列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 查询工单明细
 * GET /api/erp/production/work-order/:pNum
 * 路径参数:
 * - pNum: 工单号
 */
router.get('/production/work-order/:pNum', authenticateToken, async (req, res) => {
    try {
        const { pNum } = req.params;
        
        if (!pNum) {
            return res.status(400).json({
                code: -1,
                message: '工单号不能为空',
                data: null
            });
        }
        
        const workOrderDetail = await erpService.getWorkOrderDetail(pNum);
        
        res.json({
            code: 0,
            message: '工单明细获取成功',
            data: workOrderDetail
        });
    } catch (error) {
        console.error('获取工单明细错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取工单明细失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 查询物料入库明细列表
 * GET /api/erp/stock/material-in
 * 查询参数:
 * - StartDate: 开始时间 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束时间 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/stock/material-in', authenticateToken, async (req, res) => {
    try {
        const { StartDate, EndDate } = req.query;
        
        const filters = {};
        if (StartDate) filters.StartDate = StartDate;
        if (EndDate) filters.EndDate = EndDate;
        
        const materialInData = await erpService.getMaterialInList(filters);
        
        res.json({
            code: 0,
            message: '物料入库明细列表获取成功',
            data: materialInData
        });
    } catch (error) {
        console.error('获取物料入库明细列表错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `获取物料入库明细列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 出货报告查询接口
 * GET /api/erp/shipment-report
 * 查询参数:
 * - pNum: 生产施工单号/工单号（可选）
 * - materialId: 产品编号/客户料号（可选，单条查询时使用）
 * - materialName: 产品名称（可选）
 * - cpo: 客户采购订单号CPO（可选，单条查询时使用）
 * - batchQuery: 批量查询参数，JSON数组格式 [{cpo, productId}]（可选）
 * - StartDate: 开始时间 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束时间 (yyyy-MM-dd HH:mm:ss)
 * 
 * 查询逻辑：
 * 1. 有工单号时：直接查询工单明细
 * 2. 有batchQuery时：批量查询多个CPO+产品编号组合
 * 3. 无工单号时：需同时提供产品编号和CPO，从成品入库明细中联合查询
 */
router.get('/shipment-report', authenticateToken, async (req, res) => {
    try {
        const { pNum, materialId, materialName, cpo, batchQuery, StartDate, EndDate, matchMonthRange } = req.query;
        
        // 解析批量查询参数
        let batchQueryList = [];
        if (batchQuery) {
            try {
                batchQueryList = JSON.parse(batchQuery);
                if (!Array.isArray(batchQueryList)) batchQueryList = [];
            } catch (e) {
                console.log('解析batchQuery失败:', e.message);
            }
        }
        
        // 构建时间范围（默认查询最近90天，批量查询时默认90天）
        const defaultDays = 90;
        let endDate = EndDate || new Date().toISOString().replace('T', ' ').slice(0, 19);
        let startDate = StartDate || new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        
        const result = {
            workOrderInfo: null,      // 工单信息
            materialList: [],         // 物料列表（从工单明细获取纸张/材料信息）
            materialInList: [],       // 物料入库明细（包含供应商信息）
            productInfo: []           // 产品信息（改为数组）
        };
        
        // 如果提供了工单号，先查询工单明细获取物料信息
        if (pNum) {
            try {
                const workOrderDetail = await erpService.getWorkOrderDetail(pNum);
                if (workOrderDetail) {
                    // 处理返回数据格式
                    const orderData = workOrderDetail.data || workOrderDetail;
                    
                    // 如果没有指定时间范围，则使用工单的开单日期(InDate)前后N个月作为查询范围
                    if (!StartDate && !EndDate && orderData.InDate) {
                        try {
                            const inDate = new Date(orderData.InDate);
                            if (!isNaN(inDate.getTime())) {
                                const range = parseInt(matchMonthRange) || 1; // 默认前后1个月

                                // 前N个月
                                const start = new Date(inDate);
                                start.setMonth(start.getMonth() - range);
                                startDate = start.toISOString().replace('T', ' ').slice(0, 19);
                                
                                // 后N个月
                                const end = new Date(inDate);
                                end.setMonth(end.getMonth() + range);
                                endDate = end.toISOString().replace('T', ' ').slice(0, 19);
                            }
                        } catch (e) {
                            console.log('解析工单日期失败，使用默认时间范围:', e.message);
                        }
                    }

                    result.workOrderInfo = {
                        PNum: orderData.PNum,
                        OrderNum: orderData.OrderNum,
                        CPO: orderData.CPO,              // CPO
                        Product: orderData.Product,
                        CustomerID: orderData.CustomerID,
                        InDate: orderData.InDate,        // 开单日期
                        DeliveryDate: orderData.DeliveryDate,
                        Sales: orderData.Sales,
                        StatusDes: orderData.StatusDes
                    };
                    
                    // 提取纸张资料（包含品牌/供应商信息）
                    if (orderData.PNumPaperInfoList && Array.isArray(orderData.PNumPaperInfoList)) {
                        result.materialList = orderData.PNumPaperInfoList.map(paper => ({
                            type: '纸张',
                            name: paper.PaperName,
                            brand: paper.Band,           // 品牌即供应商
                            spec: paper.Scale,
                            srcCount: paper.SrcCount,
                            desScale: paper.DesScale
                        }));
                    }
                    
                    // 提取材料资料
                    if (orderData.PNumAMInfoList && Array.isArray(orderData.PNumAMInfoList)) {
                        const amMaterials = orderData.PNumAMInfoList.map(am => ({
                            type: '材料',
                            name: am.AMName,
                            brand: '',
                            spec: am.Scale,
                            count: am.AMCount,
                            unit: am.CalUnit
                        }));
                        result.materialList = result.materialList.concat(amMaterials);
                    }
                    
                    // 提取产品信息（包含CPO）
                    if (orderData.PNumProductInfoList && Array.isArray(orderData.PNumProductInfoList) && orderData.PNumProductInfoList.length > 0) {
                        result.productInfo = orderData.PNumProductInfoList.map(p => ({
                            productId: p.ProductID,
                            cProductId: p.CProductID,
                            product: p.Product,
                            cProduct: p.CProduct,
                            cpo: orderData.CPO || '',  // 从工单信息获取CPO
                            scale: p.Scale,
                            orderCount: p.OrderCount,
                            pCount: p.PCount
                        }));
                    }
                }
            } catch (error) {
                console.log('获取工单明细失败，继续查询物料:', error.message);
            }
        }
        
        // 无工单号时，通过产品编号+CPO从成品入库明细中查询
        if (!pNum && materialId && cpo) {
            try {
                const productInData = await erpService.getProductInSumList({
                    StartDate: startDate,
                    EndDate: endDate
                });
                
                let productInList = [];
                if (Array.isArray(productInData)) {
                    productInList = productInData;
                } else if (productInData && productInData.data && Array.isArray(productInData.data)) {
                    productInList = productInData.data;
                }
                
                // 按产品编号和CPO过滤
                const filteredProducts = productInList.filter(item => {
                    let match = true;
                    
                    // 按产品编号/客户料号匹配 (CProductID)
                    if (materialId) {
                        const searchId = materialId.toLowerCase();
                        const itemCProductId = (item.CProductID || '').toLowerCase();
                        const itemProductId = (item.ProductID || '').toLowerCase();
                        match = match && (itemCProductId.includes(searchId) || itemProductId.includes(searchId));
                    }
                    
                    // 按CPO匹配
                    if (cpo) {
                        const searchCpo = cpo.toLowerCase();
                        const itemCpo = (item.CPO || '').toLowerCase();
                        match = match && itemCpo.includes(searchCpo);
                    }
                    
                    // 按产品名称匹配（可选）
                    if (materialName && item.Product) {
                        match = match && item.Product.toLowerCase().includes(materialName.toLowerCase());
                    }
                    
                    return match;
                });
                
                if (filteredProducts.length > 0) {
                    // 转换为产品信息格式
                    result.productInfo = filteredProducts.map(p => ({
                        productId: p.ProductID || '',
                        cProductId: p.CProductID || '',
                        product: p.Product || '',
                        cProduct: p.CProduct || '',
                        cpo: p.CPO || '',
                        scale: p.Scale || '',
                        orderCount: p.OrderCount || 0,
                        pCount: p.PCount || p.InCount || 0,
                        customerId: p.CustomerID || '',
                        orderNum: p.OrderNum || '',
                        pNum: p.PNum || '',
                        inDate: p.InDate || ''
                    }));
                    
                    // 如果有工单号，尝试获取第一个产品的工单信息
                    const firstPNum = filteredProducts.find(p => p.PNum)?.PNum;
                    if (firstPNum) {
                        try {
                            const workOrderDetail = await erpService.getWorkOrderDetail(firstPNum);
                            if (workOrderDetail) {
                                const orderData = workOrderDetail.data || workOrderDetail;
                                result.workOrderInfo = {
                                    PNum: orderData.PNum,
                                    OrderNum: orderData.OrderNum,
                                    CPO: orderData.CPO,
                                    Product: orderData.Product,
                                    CustomerID: orderData.CustomerID,
                                    InDate: orderData.InDate,
                                    DeliveryDate: orderData.DeliveryDate,
                                    Sales: orderData.Sales,
                                    StatusDes: orderData.StatusDes
                                };
                                
                                // 提取纸张资料
                                if (orderData.PNumPaperInfoList && Array.isArray(orderData.PNumPaperInfoList)) {
                                    result.materialList = orderData.PNumPaperInfoList.map(paper => ({
                                        type: '纸张',
                                        name: paper.PaperName,
                                        brand: paper.Band,
                                        spec: paper.Scale,
                                        srcCount: paper.SrcCount,
                                        desScale: paper.DesScale
                                    }));
                                }
                                
                                // 提取材料资料
                                if (orderData.PNumAMInfoList && Array.isArray(orderData.PNumAMInfoList)) {
                                    const amMaterials = orderData.PNumAMInfoList.map(am => ({
                                        type: '材料',
                                        name: am.AMName,
                                        brand: '',
                                        spec: am.Scale,
                                        count: am.AMCount,
                                        unit: am.CalUnit
                                    }));
                                    result.materialList = result.materialList.concat(amMaterials);
                                }
                            }
                        } catch (err) {
                            console.log('通过成品入库获取工单明细失败:', err.message);
                        }
                    }
                }
            } catch (error) {
                console.log('查询成品入库明细失败:', error.message);
            }
        }
        
        // 批量查询：多个CPO+产品编号组合
        if (batchQueryList.length > 0 && !pNum) {
            try {
                // 同时查询成品入库明细和工单列表
                const [productInData, workOrderData] = await Promise.all([
                    erpService.getProductInSumList({
                        StartDate: startDate,
                        EndDate: endDate
                    }),
                    erpService.getWorkOrderList({
                        StartDate: startDate,
                        EndDate: endDate
                    })
                ]);
                
                let productInList = [];
                if (Array.isArray(productInData)) {
                    productInList = productInData;
                } else if (productInData && productInData.data && Array.isArray(productInData.data)) {
                    productInList = productInData.data;
                }
                
                let workOrderList = [];
                if (Array.isArray(workOrderData)) {
                    workOrderList = workOrderData;
                } else if (workOrderData && workOrderData.data && Array.isArray(workOrderData.data)) {
                    workOrderList = workOrderData.data;
                }
                
                // 根据批量查询列表过滤
                const filteredProducts = [];
                const addedKeys = new Set();  // 用于去重
                
                // 第一轮：从成品入库明细中匹配
                const unmatchedItems = [];  // 未匹配的项目
                
                for (const queryItem of batchQueryList) {
                    const searchCpo = (queryItem.cpo || '').trim();
                    const searchProductId = (queryItem.productId || '').trim();
                    
                    if (!searchCpo || !searchProductId) continue;
                    
                    let matched = false;
                    
                    // 从成品入库明细中查找（已入库的产品）
                    for (const item of productInList) {
                        const itemCpo = (item.CPO || '').trim();
                        const itemCProductId = (item.CProductID || '').trim();
                        const itemProductId = (item.ProductID || '').trim();
                        
                        const cpoMatch = itemCpo.toLowerCase() === searchCpo.toLowerCase();
                        const productIdMatch = itemCProductId.toLowerCase() === searchProductId.toLowerCase() || 
                                               itemProductId.toLowerCase() === searchProductId.toLowerCase();
                        
                        if (cpoMatch && productIdMatch) {
                            matched = true;
                            const key = `${searchCpo.toLowerCase()}-${searchProductId.toLowerCase()}`;
                            if (!addedKeys.has(key)) {
                                addedKeys.add(key);
                                filteredProducts.push({
                                    productId: item.ProductID || '',
                                    cProductId: item.CProductID || '',
                                    product: item.Product || '',
                                    cProduct: item.CProduct || '',
                                    cpo: item.CPO || '',
                                    scale: item.Scale || '',
                                    orderCount: item.OrderCount || 0,
                                    pCount: item.PCount || item.InCount || 0,
                                    customerId: item.CustomerID || '',
                                    orderNum: item.OrderNum || '',
                                    pNum: item.PNum || '',
                                    inDate: item.InDate || '',
                                    source: 'productIn'
                                });
                            }
                            break;
                        }
                    }
                    
                    if (!matched) {
                        unmatchedItems.push({ cpo: searchCpo, productId: searchProductId });
                    }
                }
                
                // 第二轮：对未匹配的项目，通过CPO找到工单号，再从工单明细中匹配
                if (unmatchedItems.length > 0) {
                    // 收集未匹配项目的CPO对应的工单号
                    const cpoToPNums = new Map();  // CPO -> [工单号列表]
                    
                    for (const item of workOrderList) {
                        const itemCpo = (item.CPO || '').trim().toLowerCase();
                        if (itemCpo && item.PNum) {
                            if (!cpoToPNums.has(itemCpo)) {
                                cpoToPNums.set(itemCpo, []);
                            }
                            if (!cpoToPNums.get(itemCpo).includes(item.PNum)) {
                                cpoToPNums.get(itemCpo).push(item.PNum);
                            }
                        }
                    }
                    
                    // 获取需要查询的工单号
                    const pNumsToQuery = new Set();
                    for (const item of unmatchedItems) {
                        const pNums = cpoToPNums.get(item.cpo.toLowerCase());
                        if (pNums) {
                            pNums.forEach(pNum => pNumsToQuery.add(pNum));
                        }
                    }
                    
                    // 查询工单明细获取产品信息
                    const workOrderDetails = new Map();  // PNum -> 工单明细
                    
                    for (const pNumToQuery of pNumsToQuery) {
                        try {
                            const detail = await erpService.getWorkOrderDetail(pNumToQuery);
                            if (detail) {
                                const orderData = detail.data || detail;
                                workOrderDetails.set(pNumToQuery, orderData);
                            }
                        } catch (err) {
                            console.log(`获取工单 ${pNumToQuery} 明细失败:`, err.message);
                        }
                    }
                    
                    // 从工单明细中匹配未匹配的项目
                    for (const queryItem of unmatchedItems) {
                        const searchCpo = queryItem.cpo;
                        const searchProductId = queryItem.productId;
                        const key = `${searchCpo.toLowerCase()}-${searchProductId.toLowerCase()}`;
                        
                        if (addedKeys.has(key)) continue;
                        
                        // 获取该CPO对应的工单号
                        const pNums = cpoToPNums.get(searchCpo.toLowerCase()) || [];
                        
                        for (const pNumItem of pNums) {
                            const orderData = workOrderDetails.get(pNumItem);
                            if (!orderData) continue;
                            
                            // 检查CPO是否匹配
                            const orderCpo = (orderData.CPO || '').trim();
                            if (orderCpo.toLowerCase() !== searchCpo.toLowerCase()) continue;
                            
                            // 从 PNumProductInfoList 中查找产品
                            const productList = orderData.PNumProductInfoList || [];
                            for (const p of productList) {
                                const pCProductId = (p.CProductID || '').trim();
                                const pProductId = (p.ProductID || '').trim();
                                
                                const productIdMatch = pCProductId.toLowerCase() === searchProductId.toLowerCase() ||
                                                       pProductId.toLowerCase() === searchProductId.toLowerCase();
                                
                                if (productIdMatch) {
                                    addedKeys.add(key);
                                    filteredProducts.push({
                                        productId: p.ProductID || '',
                                        cProductId: p.CProductID || '',
                                        product: p.Product || orderData.Product || '',
                                        cProduct: p.CProduct || orderData.OrderNum || '',
                                        cpo: orderData.CPO || '',
                                        scale: p.Scale || '',
                                        orderCount: p.OrderCount || 0,
                                        pCount: p.PCount || 0,
                                        customerId: orderData.CustomerID || '',
                                        orderNum: orderData.OrderNum || '',
                                        pNum: orderData.PNum || '',
                                        inDate: orderData.InDate || '',
                                        source: 'workOrderDetail'  // 标记来源：工单明细
                                    });
                                    break;
                                }
                            }
                            
                            if (addedKeys.has(key)) break;
                        }
                    }
                }
                
                // 统计最终匹配结果
                const finalUnmatched = batchQueryList.filter(q => {
                    const key = `${(q.cpo || '').trim().toLowerCase()}-${(q.productId || '').trim().toLowerCase()}`;
                    return !addedKeys.has(key);
                });
                
                if (filteredProducts.length > 0) {
                    result.productInfo = filteredProducts;
                }
            } catch (error) {
                console.log('批量查询失败:', error.message);
            }
        }
        
        // 先查询物料列表，用于获取型号和子物料类型信息
        // 注意：物料基础信息可能创建于较早时间，需要使用更大的时间范围
        let materialMap = new Map(); // 物料编码 -> 物料信息 的映射
        try {
            // 物料列表查询使用较大的时间范围，确保能获取到所有物料基础信息
            const materialStartDate = '2010-01-01 00:00:00';
            const materialEndDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
            
            const materialData = await erpService.getMaterialList({
                StartDate: materialStartDate,
                EndDate: materialEndDate
            });
            
            let materials = [];
            if (Array.isArray(materialData)) {
                materials = materialData;
            } else if (materialData && materialData.data && Array.isArray(materialData.data)) {
                materials = materialData.data;
            }
            
            // 构建物料编码到物料信息的映射（使用标准化的key）
            materials.forEach(item => {
                if (item.MaterialID) {
                    // 标准化物料编码：去除首尾空格，转为大写
                    const normalizedId = item.MaterialID.trim().toUpperCase();
                    materialMap.set(normalizedId, {
                        model: item.Model,           // 型号
                        materialSubType: item.MSubType, // 子物料类型
                        materialType: item.MType,    // 物料类型
                        brand: item.Band,            // 品牌
                        spec: item.Scale             // 规格
                    });
                }
            });
        } catch (error) {
            console.log('获取物料列表失败:', error.message);
        }
        
        // 查询物料入库明细（获取供应商信息）
        let allMaterialInList = []; // 存储所有入库明细，后续根据物料信息过滤
        try {
            const materialInData = await erpService.getMaterialInList({
                StartDate: startDate,
                EndDate: endDate
            });
            
            if (Array.isArray(materialInData)) {
                allMaterialInList = materialInData;
            } else if (materialInData && materialInData.data && Array.isArray(materialInData.data)) {
                allMaterialInList = materialInData.data;
            }
            
            // 先按查询条件过滤
            if (allMaterialInList.length > 0) {
                allMaterialInList = allMaterialInList.filter(item => {
                    let match = true;
                    
                    // 按物料编号过滤
                    if (materialId && item.MaterialID) {
                        match = match && item.MaterialID.toLowerCase().includes(materialId.toLowerCase());
                    }
                    
                    // 按物料名称过滤
                    if (materialName && item.MName) {
                        match = match && item.MName.toLowerCase().includes(materialName.toLowerCase());
                    }
                    
                    return match;
                });
            }
        } catch (error) {
            console.log('获取物料入库明细失败:', error.message);
        }
        
        // 如果只按物料编号/名称查询，还需要查询基础物料信息添加到materialList
        if ((materialId || materialName) && !pNum) {
            // 方案1: 直接从入库明细中提取匹配的物料信息（更可靠）
            const filteredMaterials = [];
            const addedMaterialIds = new Set(); // 用于去重
            
            // 优先从入库明细中提取（包含物料名称）
            allMaterialInList.forEach(item => {
                if (!item.MaterialID) return;
                
                const normalizedId = item.MaterialID.trim().toUpperCase();
                
                // 防止重复添加相同物料
                if (addedMaterialIds.has(normalizedId)) return;
                
                let match = true;
                
                // 按物料编号匹配
                if (materialId) {
                    match = match && normalizedId.toLowerCase().includes(materialId.toLowerCase());
                }
                
                // 按物料名称匹配
                if (materialName && item.MName) {
                    match = match && item.MName.toLowerCase().includes(materialName.toLowerCase());
                }
                
                if (match) {
                    const materialInfo = materialMap.get(normalizedId) || {};
                    filteredMaterials.push({
                        type: item.MType || materialInfo.materialType || '物料',
                        name: item.MName || normalizedId,  // 使用物料名称，备选物料编码
                        materialId: item.MaterialID,       // 保留物料编码以便后续匹配
                        brand: item.Band || materialInfo.brand,
                        spec: item.Scale || materialInfo.spec,
                        model: materialInfo.model,
                        subType: materialInfo.materialSubType
                    });
                    addedMaterialIds.add(normalizedId);
                }
            });
            
            // 方案2: 如果入库明细没有数据，再从物料基础信息中查找
            if (filteredMaterials.length === 0) {
                materialMap.forEach((info, matId) => {
                    let match = true;
                    
                    if (materialId) {
                        match = match && matId.toLowerCase().includes(materialId.toLowerCase());
                    }
                    
                    // 物料基础信息不含物料名称，如果需要按名称查询则跳过
                    if (materialName) {
                        match = false;
                    }
                    
                    if (match) {
                        filteredMaterials.push({
                            type: info.materialType || '物料',
                            name: matId,  // 物料基础信息中无名称，使用编码
                            materialId: matId,
                            brand: info.brand,
                            spec: info.spec,
                            model: info.model,
                            subType: info.materialSubType
                        });
                    }
                });
            }
            
            if (filteredMaterials.length > 0 && result.materialList.length === 0) {
                result.materialList = filteredMaterials;
            }
        }
        
        // 根据物料信息列表精确过滤物料入库明细
        // 匹配规则：
        // 1. 排除送货单号包含"盘点"或"导入"的记录
        // 2. ID匹配 + 规格匹配
        // 3. 名称匹配 + 规格匹配 (优先)
        if (result.materialList.length > 0 && allMaterialInList.length > 0) {
            
            // 标准化字符串辅助函数：去除空格、统一符号、转小写
            const normalizeStr = (str) => {
                if (!str) return '';
                return String(str).trim().toLowerCase()
                    .replace(/\s+/g, '')      // 去除所有空格
                    .replace(/＊/g, '*')      // 全角*转半角*
                    .replace(/×/g, '*')       // ×转*
                    .replace(/x/g, '*')       // x转*
                    .replace(/（/g, '(')      // 全角括号转半角
                    .replace(/）/g, ')');     // 全角括号转半角
            };

            // 预处理目标物料列表，生成标准化匹配键，避免在循环中重复计算
            const targets = result.materialList.map(m => ({
                original: m,
                normId: normalizeStr(m.materialId),
                normName: normalizeStr(m.name),
                normSpec: normalizeStr(m.spec)
            }));
            
            // 过滤入库明细
            result.materialInList = allMaterialInList.filter(item => {
                const dlyNum = item.DlyNum || '';
                // 1. 强制排除：如果入库记录的 送货单号 ( DlyNum ) 中，包含 "盘点"或"导入"关键字 ，直接丢弃
                if (dlyNum.includes('盘点') || dlyNum.includes('导入')) return false;
                
                // 准备入库记录的对比数据(标准化)
                const itemNormId = normalizeStr(item.MaterialID);
                const itemNormName = normalizeStr(item.MName);
                const itemNormSpec = normalizeStr(item.Scale);
                
                // 遍历工单物料列表进行匹配
                return targets.some(t => {
                    // 2. ID 匹配 + 规格
                    if (t.normId && itemNormId === t.normId && itemNormSpec === t.normSpec) {
                        return true;
                    }
                    
                    // 3. 名称匹配 + 规格
                    if (t.normName && itemNormName === t.normName && itemNormSpec === t.normSpec) {
                        return true;
                    }
                    
                    return false;
                });
            }).map(item => {
                // 从物料列表中获取型号和子物料类型
                const normalizedId = item.MaterialID ? item.MaterialID.trim().toUpperCase() : '';
                const materialInfo = materialMap.get(normalizedId) || {};
                
                return {
                    inId: item.BInMID,              // 入库单号
                    inDate: item.InDate,           // 入库日期
                    dlyNum: item.DlyNum,           // 送货单号
                    supply: item.Supply,           // 供应商（关键字段）
                    materialId: item.MaterialID,   // 物料编码
                    materialName: item.MName,      // 物料名称
                    spec: item.Scale || materialInfo.spec,  // 规格
                    model: materialInfo.model || '',        // 型号
                    brand: item.Band || materialInfo.brand, // 品牌
                    materialType: item.MType || materialInfo.materialType,      // 物料类型
                    materialSubType: materialInfo.materialSubType || '',        // 子物料类型
                    count: item.Acount || item.ACount,  // 入库数量
                    deliveryDate: item.DeliveryDate,    // 计划交货期
                    lastUpdateDate: item.LstUpdateDate  // 最后修改日期
                };
            });
        } else if (allMaterialInList.length > 0 && result.materialList.length === 0) {
            // 如果没有物料信息列表，则显示所有入库明细（按查询条件过滤后的，排除含"盘点"或"导入"的记录）
            result.materialInList = allMaterialInList.filter(item => {
                const dlyNum = item.DlyNum || '';
                // 排除送货单号包含"盘点"或"导入"的记录
                if (dlyNum.includes('盘点') || dlyNum.includes('导入')) return false;
                return true;
            }).map(item => {
                const normalizedId = item.MaterialID ? item.MaterialID.trim().toUpperCase() : '';
                const materialInfo = materialMap.get(normalizedId) || {};
                
                return {
                    inId: item.BInMID,
                    inDate: item.InDate,
                    dlyNum: item.DlyNum,
                    supply: item.Supply,
                    materialId: item.MaterialID,
                    materialName: item.MName,
                    spec: item.Scale || materialInfo.spec,
                    model: materialInfo.model || '',
                    brand: item.Band || materialInfo.brand,
                    materialType: item.MType || materialInfo.materialType,
                    materialSubType: materialInfo.materialSubType || '',
                    count: item.Acount || item.ACount,
                    deliveryDate: item.DeliveryDate,
                    lastUpdateDate: item.LstUpdateDate
                };
            });
        }
        
        res.json({
            code: 0,
            message: '出货报告查询成功',
            data: result
        });
    } catch (error) {
        console.error('出货报告查询错误:', error.message);
        res.status(500).json({
            code: -1,
            message: `出货报告查询失败: ${error.message}`,
            data: null
        });
    }
});



module.exports = router;