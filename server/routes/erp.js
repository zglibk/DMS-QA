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
        
        console.log('获取ERP物料列表:', { StartDate, EndDate });
        
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
        
        console.log('获取ERP工单列表:', { StartDate, EndDate });
        
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
        
        console.log('获取ERP工单明细:', { pNum });
        
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
        
        console.log('获取ERP物料入库明细列表:', { StartDate, EndDate });
        
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
 * - materialId: 物料编号（可选）
 * - materialName: 物料名称（可选）
 * - StartDate: 开始时间 (yyyy-MM-dd HH:mm:ss)
 * - EndDate: 结束时间 (yyyy-MM-dd HH:mm:ss)
 */
router.get('/shipment-report', authenticateToken, async (req, res) => {
    try {
        const { pNum, materialId, materialName, StartDate, EndDate } = req.query;
        
        console.log('出货报告查询:', { pNum, materialId, materialName, StartDate, EndDate });
        
        // 构建时间范围（默认查询最近30天）
        const endDate = EndDate || new Date().toISOString().replace('T', ' ').slice(0, 19);
        const startDate = StartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        
        const result = {
            workOrderInfo: null,      // 工单信息
            materialList: [],         // 物料列表（从工单明细获取纸张/材料信息）
            materialInList: [],       // 物料入库明细（包含供应商信息）
            productInfo: null         // 产品信息
        };
        
        // 如果提供了工单号，先查询工单明细获取物料信息
        if (pNum) {
            try {
                const workOrderDetail = await erpService.getWorkOrderDetail(pNum);
                if (workOrderDetail) {
                    // 处理返回数据格式
                    const orderData = workOrderDetail.data || workOrderDetail;
                    result.workOrderInfo = {
                        PNum: orderData.PNum,
                        OrderNum: orderData.OrderNum,
                        Product: orderData.Product,
                        CustomerID: orderData.CustomerID,
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
                    
                    // 提取产品信息
                    if (orderData.PNumProductInfoList && Array.isArray(orderData.PNumProductInfoList) && orderData.PNumProductInfoList.length > 0) {
                        result.productInfo = orderData.PNumProductInfoList.map(p => ({
                            productId: p.ProductID,
                            cProductId: p.CProductID,
                            product: p.Product,
                            cProduct: p.CProduct,
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
        
        // 查询物料入库明细（获取供应商信息）
        try {
            const materialInData = await erpService.getMaterialInList({
                StartDate: startDate,
                EndDate: endDate
            });
            
            let materialInList = [];
            if (Array.isArray(materialInData)) {
                materialInList = materialInData;
            } else if (materialInData && materialInData.data && Array.isArray(materialInData.data)) {
                materialInList = materialInData.data;
            }
            
            // 根据条件过滤
            if (materialInList.length > 0) {
                result.materialInList = materialInList.filter(item => {
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
                }).map(item => ({
                    inId: item.BInMID,              // 入库单号
                    inDate: item.InDate,           // 入库日期
                    dlyNum: item.DlyNum,           // 送货单号
                    purId: item.PurID,             // 采购单号
                    supply: item.Supply,           // 供应商（关键字段）
                    materialId: item.MaterialID,   // 物料编码
                    materialName: item.MName,      // 物料名称
                    spec: item.Scale,              // 规格
                    brand: item.Band,              // 品牌
                    materialType: item.MType,      // 物料类型
                    materialSubType: item.MSubType, // 子物料类型
                    count: item.Acount || item.ACount,  // 入库数量
                    deliveryDate: item.DeliveryDate,    // 计划交货期
                    lastUpdateDate: item.LstUpdateDate  // 最后修改日期
                }));
            }
        } catch (error) {
            console.log('获取物料入库明细失败:', error.message);
        }
        
        // 如果只按物料编号/名称查询，还需要查询基础物料信息
        if ((materialId || materialName) && !pNum) {
            try {
                const materialData = await erpService.getMaterialList({
                    StartDate: startDate,
                    EndDate: endDate
                });
                
                let materials = [];
                if (Array.isArray(materialData)) {
                    materials = materialData;
                } else if (materialData && materialData.data && Array.isArray(materialData.data)) {
                    materials = materialData.data;
                }
                
                // 过滤并添加基础物料信息
                if (materials.length > 0) {
                    const filteredMaterials = materials.filter(item => {
                        let match = true;
                        
                        if (materialId && item.MaterialID) {
                            match = match && item.MaterialID.toLowerCase().includes(materialId.toLowerCase());
                        }
                        
                        if (materialName && item.MName) {
                            match = match && item.MName.toLowerCase().includes(materialName.toLowerCase());
                        }
                        
                        return match;
                    }).map(item => ({
                        type: item.MType || '物料',
                        name: item.MName,
                        brand: item.Band,
                        spec: item.Scale,
                        model: item.Model,
                        unit: item.CalUnit,
                        weight: item.DingLiang,
                        subType: item.MSubType
                    }));
                    
                    result.materialList = result.materialList.concat(filteredMaterials);
                }
            } catch (error) {
                console.log('获取物料列表失败:', error.message);
            }
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