const cron = require('node-cron');
const erpService = require('./erpService');
const { getConnection, executeQuery, sql } = require('../db');
const erpConfigLoader = require('../utils/erpConfigLoader');

/**
 * ERP数据同步服务
 * 用于定时自动同步ERP系统的生产和交付数据，实现实时更新客户投诉率等指标
 */
class ErpSyncService {
    constructor() {
        this.isRunning = false;
        this.syncTasks = new Map(); // 存储定时任务
        this.syncConfig = {
            enabled: false,
            interval: '0 */1 * * *', // 默认每小时执行一次
            syncTypes: ['production', 'delivery'],
            timeRange: 24 // 同步最近24小时的数据
        };
        this.lastSyncResults = [];
        this.configLoaded = false;
    }

    /**
     * 启动ERP数据同步服务
     */
    async start() {
        if (this.isRunning) {
            // ERP同步服务已在运行中
            return;
        }

        // 启动ERP数据同步服务
        this.isRunning = true;

        // 确保配置已加载
        await this.loadSyncConfig();

        // 启动定时任务
        this.startScheduledSync();

        // ERP数据同步服务启动成功
    }

    /**
     * 停止ERP数据同步服务
     */
    stop() {
        if (!this.isRunning) {
            // ERP同步服务未在运行
            return;
        }

        // 停止ERP数据同步服务
        
        // 停止所有定时任务
        this.syncTasks.forEach((task, name) => {
            task.stop();
            // 已停止定时任务
        });
        this.syncTasks.clear();

        this.isRunning = false;
        // ERP数据同步服务已停止
    }

    /**
     * 加载同步配置
     * 从数据库中获取ERP同步相关配置
     */
    async loadSyncConfig() {
        try {
            if (this.configLoaded) {
                return;
            }

            // 正在加载ERP同步配置
            // 从配置加载器获取同步配置
            const syncConfig = await erpConfigLoader.getErpSyncConfig();
            
            if (syncConfig) {
                this.syncConfig = {
                    enabled: syncConfig.enabled || false,
                    interval: syncConfig.interval || 30000,
                    syncTypes: syncConfig.syncTypes || ['production', 'delivery'],
                    timeRange: syncConfig.timeRange || {
                        start: '00:00',
                        end: '23:59'
                    }
                };
                this.configLoaded = true;
                // 成功加载ERP同步配置
            } else {
                // 未找到同步配置，使用默认配置
                this.configLoaded = true;
            }
        } catch (error) {
            console.error('加载同步配置失败:', error.message);
            // 将使用默认配置
            this.configLoaded = true;
        }
    }

    /**
     * 重新加载同步配置
     * 强制从数据库重新获取同步配置信息
     */
    async reloadConfig() {
        try {
            // 重新加载ERP同步配置
            this.configLoaded = false;
            // 清除配置加载器的缓存
            erpConfigLoader.clearCache();
            // 重新加载配置
            await this.loadSyncConfig();
            
            // 如果同步服务正在运行，需要重启以应用新配置
            if (this.isRunning) {
                // 重启同步服务以应用新配置
                await this.stop();
                await this.start();
            }
            
            // ERP同步配置重新加载完成
        } catch (error) {
            console.error('重新加载ERP同步配置失败:', error.message);
            throw error;
        }
    }

    /**
     * 启动定时同步任务
     */
    startScheduledSync() {
        if (!this.syncConfig.enabled) {
            // 自动同步已禁用
            return;
        }

        // 创建定时任务
        const task = cron.schedule(this.syncConfig.interval, async () => {
            await this.performSync();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        // 启动任务
        task.start();
        this.syncTasks.set('main-sync', task);

        // 定时同步任务已启动
    }

    /**
     * 执行数据同步
     * @param {Object} options - 同步选项
     */
    async performSync(options = {}) {
        const syncId = Date.now().toString();
        const syncResult = {
            syncId,
            startTime: new Date().toISOString(),
            syncTypes: options.syncTypes || this.syncConfig.syncTypes,
            results: [],
            status: 'running'
        };

        // 开始执行ERP数据同步

        try {
            // 计算同步时间范围
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (this.syncConfig.timeRange * 60 * 60 * 1000));
            
            const dateRange = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };

            // 同步时间范围

            // 同步生产数据
            if (syncResult.syncTypes.includes('production')) {
                await this.syncProductionData(dateRange, syncResult);
            }

            // 同步交付数据
            if (syncResult.syncTypes.includes('delivery')) {
                await this.syncDeliveryData(dateRange, syncResult);
            }

            // 更新客户投诉率等指标
            await this.updateQualityMetrics(syncResult);

            syncResult.status = 'completed';
            // ERP数据同步完成

        } catch (error) {
            console.error(`ERP数据同步失败 [${syncId}]:`, error.message);
            syncResult.status = 'failed';
            syncResult.error = error.message;
        }

        syncResult.endTime = new Date().toISOString();
        syncResult.duration = new Date(syncResult.endTime) - new Date(syncResult.startTime);

        // 保存同步结果
        this.saveSyncResult(syncResult);
        
        // 更新最近同步结果（保留最近10次）
        this.lastSyncResults.unshift(syncResult);
        if (this.lastSyncResults.length > 10) {
            this.lastSyncResults = this.lastSyncResults.slice(0, 10);
        }

        return syncResult;
    }

    /**
     * 同步生产数据
     * @param {Object} dateRange - 日期范围
     * @param {Object} syncResult - 同步结果对象
     */
    async syncProductionData(dateRange, syncResult) {
        try {
            // 正在同步生产数据
            
            // 从ERP获取生产数据（生产情况统计表）
            const productionData = await erpService.getProductionDataAnaly({
                StartDate: `${dateRange.startDate} 00:00:00`,
                EndDate: `${dateRange.endDate} 23:59:59`
            });
            
            // 处理返回数据格式
            let dataList = [];
            if (Array.isArray(productionData)) {
                dataList = productionData;
            } else if (productionData && productionData.data && Array.isArray(productionData.data)) {
                dataList = productionData.data;
            } else {
                console.log('生产数据格式:', typeof productionData, productionData);
                syncResult.results.push({
                    type: 'production',
                    status: 'warning',
                    message: '获取的生产数据为空或格式不正确'
                });
                return;
            }

            // 保存到本地数据库
            let insertCount = 0;
            let updateCount = 0;

            for (const record of dataList) {
                const result = await this.saveProductionRecord(record);
                if (result && result.isNew) {
                    insertCount++;
                } else if (result) {
                    updateCount++;
                }
            }

            syncResult.results.push({
                type: 'production',
                status: 'success',
                totalRecords: dataList.length,
                insertCount,
                updateCount,
                message: `生产数据同步成功: 新增${insertCount}条，更新${updateCount}条`
            });

            // 生产数据同步完成

        } catch (error) {
            console.error('同步生产数据失败:', error.message);
            syncResult.results.push({
                type: 'production',
                status: 'error',
                message: `生产数据同步失败: ${error.message}`
            });
        }
    }

    /**
     * 同步交付数据
     * @param {Object} dateRange - 日期范围
     * @param {Object} syncResult - 同步结果对象
     */
    async syncDeliveryData(dateRange, syncResult) {
        try {
            // 正在同步交付数据
            
            // 从ERP获取交付数据（成品出库明细）
            const deliveryData = await erpService.getProductOutSumList({
                StartDate: `${dateRange.startDate} 00:00:00`,
                EndDate: `${dateRange.endDate} 23:59:59`
            });
            
            // 处理返回数据格式
            let dataList = [];
            if (Array.isArray(deliveryData)) {
                dataList = deliveryData;
            } else if (deliveryData && deliveryData.data && Array.isArray(deliveryData.data)) {
                dataList = deliveryData.data;
            } else {
                console.log('交付数据格式:', typeof deliveryData, deliveryData);
                syncResult.results.push({
                    type: 'delivery',
                    status: 'warning',
                    message: '获取的交付数据为空或格式不正确'
                });
                return;
            }

            // 保存到本地数据库
            let insertCount = 0;
            let updateCount = 0;

            for (const record of dataList) {
                const result = await this.saveDeliveryRecord(record);
                if (result && result.isNew) {
                    insertCount++;
                } else if (result) {
                    updateCount++;
                }
            }

            syncResult.results.push({
                type: 'delivery',
                status: 'success',
                totalRecords: deliveryData.length,
                insertCount,
                updateCount,
                message: `交付数据同步成功: 新增${insertCount}条，更新${updateCount}条`
            });

            // 交付数据同步完成

        } catch (error) {
            console.error('同步交付数据失败:', error.message);
            syncResult.results.push({
                type: 'delivery',
                status: 'error',
                message: `交付数据同步失败: ${error.message}`
            });
        }
    }

    /**
     * 保存生产记录到本地数据库
     * @param {Object} record - 生产记录（ERP格式）
     * @returns {Object} 保存结果
     */
    async saveProductionRecord(record) {
        try {
            // 映射ERP字段到本地数据库字段
            const batchNumber = record.PNum || '';  // 工单号
            const productionDate = record.ShiftDate || new Date().toISOString();
            const productLine = record.DevName || '';  // 设备名称
            const quantity = record.PCount || 0;  // 数量
            const qualityGrade = record.StatusDes || '';  // 状态

            const pool = await getConnection();
            
            // 检查记录是否已存在
            const existResult = await pool.request()
                .input('batchNumber', sql.NVarChar, batchNumber)
                .input('productionDate', sql.NVarChar, productionDate)
                .query(`
                    SELECT id FROM erp_production_data 
                    WHERE batch_number = @batchNumber AND production_date = @productionDate
                `);

            if (existResult.recordset.length > 0) {
                // 更新现有记录
                await pool.request()
                    .input('productLine', sql.NVarChar, productLine)
                    .input('quantity', sql.Decimal(18, 2), quantity)
                    .input('qualityGrade', sql.NVarChar, qualityGrade)
                    .input('id', sql.Int, existResult.recordset[0].id)
                    .query(`
                        UPDATE erp_production_data SET
                            product_line = @productLine,
                            quantity = @quantity,
                            quality_grade = @qualityGrade,
                            updated_at = GETDATE()
                        WHERE id = @id
                    `);
                return { isNew: false, id: existResult.recordset[0].id };
            } else {
                // 插入新记录
                const insertResult = await pool.request()
                    .input('batchNumber', sql.NVarChar, batchNumber)
                    .input('productionDate', sql.NVarChar, productionDate)
                    .input('productLine', sql.NVarChar, productLine)
                    .input('quantity', sql.Decimal(18, 2), quantity)
                    .input('qualityGrade', sql.NVarChar, qualityGrade)
                    .query(`
                        INSERT INTO erp_production_data (
                            batch_number, production_date, product_line, 
                            quantity, quality_grade, created_at, updated_at
                        ) 
                        OUTPUT INSERTED.id
                        VALUES (@batchNumber, @productionDate, @productLine, 
                                @quantity, @qualityGrade, GETDATE(), GETDATE())
                    `);
                return { isNew: true, id: insertResult.recordset[0]?.id };
            }
        } catch (error) {
            console.error('保存生产记录失败:', error.message);
            return null;
        }
    }

    /**
     * 保存交付记录到本地数据库
     * @param {Object} record - 交付记录（ERP格式）
     * @returns {Object} 保存结果
     */
    async saveDeliveryRecord(record) {
        try {
            // 映射ERP字段到本地数据库字段
            const deliveryNumber = record.OutID || '';  // 出库单号
            const deliveryDate = record.OutDate || new Date().toISOString();
            const customerCode = record.CustomerID || '';  // 客户编码
            const quantity = record.OutCount || 0;  // 实际送货数
            const deliveryStatus = 'delivered';  // 默认状态

            const pool = await getConnection();
            
            // 检查记录是否已存在
            const existResult = await pool.request()
                .input('deliveryNumber', sql.NVarChar, deliveryNumber)
                .input('deliveryDate', sql.NVarChar, deliveryDate)
                .query(`
                    SELECT id FROM erp_delivery_data 
                    WHERE delivery_number = @deliveryNumber AND delivery_date = @deliveryDate
                `);

            if (existResult.recordset.length > 0) {
                // 更新现有记录
                await pool.request()
                    .input('customerCode', sql.NVarChar, customerCode)
                    .input('quantity', sql.Decimal(18, 2), quantity)
                    .input('deliveryStatus', sql.NVarChar, deliveryStatus)
                    .input('id', sql.Int, existResult.recordset[0].id)
                    .query(`
                        UPDATE erp_delivery_data SET
                            customer_code = @customerCode,
                            quantity = @quantity,
                            delivery_status = @deliveryStatus,
                            updated_at = GETDATE()
                        WHERE id = @id
                    `);
                return { isNew: false, id: existResult.recordset[0].id };
            } else {
                // 插入新记录
                const insertResult = await pool.request()
                    .input('deliveryNumber', sql.NVarChar, deliveryNumber)
                    .input('deliveryDate', sql.NVarChar, deliveryDate)
                    .input('customerCode', sql.NVarChar, customerCode)
                    .input('quantity', sql.Decimal(18, 2), quantity)
                    .input('deliveryStatus', sql.NVarChar, deliveryStatus)
                    .query(`
                        INSERT INTO erp_delivery_data (
                            delivery_number, delivery_date, customer_code, 
                            quantity, delivery_status, created_at, updated_at
                        ) 
                        OUTPUT INSERTED.id
                        VALUES (@deliveryNumber, @deliveryDate, @customerCode, 
                                @quantity, @deliveryStatus, GETDATE(), GETDATE())
                    `);
                return { isNew: true, id: insertResult.recordset[0]?.id };
            }
        } catch (error) {
            console.error('保存交付记录失败:', error.message);
            return null;
        }
    }

    /**
     * 更新质量指标（如客户投诉率）
     * @param {Object} syncResult - 同步结果对象
     */
    async updateQualityMetrics(syncResult) {
        try {
            // 正在更新质量指标
            
            // 计算客户投诉率
            await this.calculateComplaintRate();
            
            // 计算其他质量指标
            await this.calculateOtherMetrics();
            
            syncResult.results.push({
                type: 'metrics',
                status: 'success',
                message: '质量指标更新成功'
            });
            
            // 质量指标更新完成
            
        } catch (error) {
            console.error('更新质量指标失败:', error.message);
            syncResult.results.push({
                type: 'metrics',
                status: 'error',
                message: `质量指标更新失败: ${error.message}`
            });
        }
    }

    /**
     * 计算客户投诉率
     */
    async calculateComplaintRate() {
        try {
            const pool = await getConnection();
            
            // 获取最近30天的交付数据
            const deliveryResult = await pool.request()
                .query(`
                    SELECT COUNT(*) as total_deliveries, ISNULL(SUM(quantity), 0) as total_quantity
                    FROM erp_delivery_data 
                    WHERE delivery_date >= DATEADD(day, -30, GETDATE())
                `);
            
            // 获取最近30天的投诉数据
            const complaintResult = await pool.request()
                .query(`
                    SELECT COUNT(*) as total_complaints
                    FROM CustomerComplaints 
                    WHERE CreatedAt >= DATEADD(day, -30, GETDATE())
                `);
            
            const totalDeliveries = deliveryResult.recordset[0]?.total_deliveries || 0;
            const totalComplaints = complaintResult.recordset[0]?.total_complaints || 0;
            
            const complaintRate = totalDeliveries > 0 ? (totalComplaints / totalDeliveries * 100) : 0;
            
            // 检查quality_metrics表是否存在
            const tableExists = await pool.request()
                .query(`
                    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME = 'quality_metrics'
                `);
            
            if (tableExists.recordset[0].cnt > 0) {
                // 保存计算结果
                await pool.request()
                    .input('metricValue', sql.Decimal(18, 4), complaintRate)
                    .query(`
                        INSERT INTO quality_metrics (metric_name, metric_value, calculation_date, created_at)
                        VALUES ('complaint_rate', @metricValue, GETDATE(), GETDATE())
                    `);
            }
            
            // 客户投诉率计算完成
            console.log(`客户投诉率: ${complaintRate.toFixed(2)}% (投诉: ${totalComplaints}, 交付: ${totalDeliveries})`);
            
        } catch (error) {
            console.error('计算客户投诉率失败:', error.message);
            // 不抛出错误，允许继续执行
        }
    }

    /**
     * 计算其他质量指标
     */
    async calculateOtherMetrics() {
        // 这里可以添加其他质量指标的计算逻辑
        // 例如：合格率、及时交付率等
        // 其他质量指标计算完成
    }

    /**
     * 保存同步结果
     * @param {Object} syncResult - 同步结果
     */
    async saveSyncResult(syncResult) {
        try {
            const pool = await getConnection();
            
            // 检查erp_sync_logs表是否存在
            const tableExists = await pool.request()
                .query(`
                    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME = 'erp_sync_logs'
                `);
            
            if (tableExists.recordset[0].cnt > 0) {
                await pool.request()
                    .input('syncId', sql.NVarChar, syncResult.syncId)
                    .input('startTime', sql.NVarChar, syncResult.startTime)
                    .input('endTime', sql.NVarChar, syncResult.endTime || '')
                    .input('duration', sql.Int, syncResult.duration || 0)
                    .input('status', sql.NVarChar, syncResult.status)
                    .input('syncTypes', sql.NVarChar, JSON.stringify(syncResult.syncTypes))
                    .input('results', sql.NVarChar, JSON.stringify(syncResult.results))
                    .query(`
                        INSERT INTO erp_sync_logs (
                            sync_id, start_time, end_time, duration, 
                            status, sync_types, results, created_at
                        ) VALUES (@syncId, @startTime, @endTime, @duration, 
                                  @status, @syncTypes, @results, GETDATE())
                    `);
            }
        } catch (error) {
            console.error('保存同步结果失败:', error.message);
        }
    }

    /**
     * 获取同步状态
     * @returns {Object} 同步状态信息
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.syncConfig,
            lastSyncResults: this.lastSyncResults,
            activeTasks: Array.from(this.syncTasks.keys())
        };
    }

    /**
     * 更新同步配置
     * @param {Object} newConfig - 新的配置
     */
    updateConfig(newConfig) {
        this.syncConfig = { ...this.syncConfig, ...newConfig };
        
        // 重启定时任务
        if (this.isRunning) {
            this.stop();
            this.start();
        }
        
        // 同步配置已更新
    }
}

// 创建单例实例
const erpSyncService = new ErpSyncService();

module.exports = erpSyncService;