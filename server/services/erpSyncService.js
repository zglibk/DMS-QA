const cron = require('node-cron');
const erpService = require('./erpService');
const db = require('../db');
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
            console.log('ERP同步服务已在运行中');
            return;
        }

        console.log('启动ERP数据同步服务...');
        this.isRunning = true;

        // 确保配置已加载
        await this.loadSyncConfig();

        // 启动定时任务
        this.startScheduledSync();

        console.log('ERP数据同步服务启动成功');
    }

    /**
     * 停止ERP数据同步服务
     */
    stop() {
        if (!this.isRunning) {
            console.log('ERP同步服务未在运行');
            return;
        }

        console.log('停止ERP数据同步服务...');
        
        // 停止所有定时任务
        this.syncTasks.forEach((task, name) => {
            task.stop();
            console.log(`已停止定时任务: ${name}`);
        });
        this.syncTasks.clear();

        this.isRunning = false;
        console.log('ERP数据同步服务已停止');
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

            console.log('正在加载ERP同步配置...');
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
                console.log('成功加载ERP同步配置:', this.syncConfig);
            } else {
                console.log('未找到同步配置，使用默认配置:', this.syncConfig);
                this.configLoaded = true;
            }
        } catch (error) {
            console.error('加载同步配置失败:', error.message);
            console.log('将使用默认配置:', this.syncConfig);
            this.configLoaded = true;
        }
    }

    /**
     * 重新加载同步配置
     * 强制从数据库重新获取同步配置信息
     */
    async reloadConfig() {
        try {
            console.log('重新加载ERP同步配置...');
            this.configLoaded = false;
            // 清除配置加载器的缓存
            erpConfigLoader.clearCache();
            // 重新加载配置
            await this.loadSyncConfig();
            
            // 如果同步服务正在运行，需要重启以应用新配置
            if (this.isRunning) {
                console.log('重启同步服务以应用新配置...');
                await this.stop();
                await this.start();
            }
            
            console.log('ERP同步配置重新加载完成');
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
            console.log('自动同步已禁用');
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

        console.log(`定时同步任务已启动，执行间隔: ${this.syncConfig.interval}`);
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

        console.log(`开始执行ERP数据同步 [${syncId}]`);

        try {
            // 计算同步时间范围
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (this.syncConfig.timeRange * 60 * 60 * 1000));
            
            const dateRange = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };

            console.log(`同步时间范围: ${dateRange.startDate} 到 ${dateRange.endDate}`);

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
            console.log(`ERP数据同步完成 [${syncId}]`);

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
            console.log('正在同步生产数据...');
            
            // 从ERP获取生产数据
            const productionData = await erpService.getProductionData(dateRange);
            
            if (!productionData || !Array.isArray(productionData)) {
                throw new Error('获取的生产数据格式不正确');
            }

            // 保存到本地数据库
            let insertCount = 0;
            let updateCount = 0;

            for (const record of productionData) {
                const result = await this.saveProductionRecord(record);
                if (result.isNew) {
                    insertCount++;
                } else {
                    updateCount++;
                }
            }

            syncResult.results.push({
                type: 'production',
                status: 'success',
                totalRecords: productionData.length,
                insertCount,
                updateCount,
                message: `生产数据同步成功: 新增${insertCount}条，更新${updateCount}条`
            });

            console.log(`生产数据同步完成: 处理${productionData.length}条记录`);

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
            console.log('正在同步交付数据...');
            
            // 从ERP获取交付数据
            const deliveryData = await erpService.getDeliveryData(dateRange);
            
            if (!deliveryData || !Array.isArray(deliveryData)) {
                throw new Error('获取的交付数据格式不正确');
            }

            // 保存到本地数据库
            let insertCount = 0;
            let updateCount = 0;

            for (const record of deliveryData) {
                const result = await this.saveDeliveryRecord(record);
                if (result.isNew) {
                    insertCount++;
                } else {
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

            console.log(`交付数据同步完成: 处理${deliveryData.length}条记录`);

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
     * @param {Object} record - 生产记录
     * @returns {Object} 保存结果
     */
    async saveProductionRecord(record) {
        try {
            // 检查记录是否已存在
            const existingQuery = `
                SELECT id FROM erp_production_data 
                WHERE batch_number = ? AND production_date = ?
            `;
            const existing = await db.query(existingQuery, [record.batchNumber, record.productionDate]);

            if (existing.length > 0) {
                // 更新现有记录
                const updateQuery = `
                    UPDATE erp_production_data SET
                        product_line = ?,
                        quantity = ?,
                        quality_grade = ?,
                        updated_at = GETDATE()
                    WHERE id = ?
                `;
                await db.query(updateQuery, [
                    record.productLine,
                    record.quantity,
                    record.qualityGrade,
                    existing[0].id
                ]);
                return { isNew: false, id: existing[0].id };
            } else {
                // 插入新记录
                const insertQuery = `
                    INSERT INTO erp_production_data (
                        batch_number, production_date, product_line, 
                        quantity, quality_grade, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
                `;
                const result = await db.query(insertQuery, [
                    record.batchNumber,
                    record.productionDate,
                    record.productLine,
                    record.quantity,
                    record.qualityGrade
                ]);
                return { isNew: true, id: result.insertId };
            }
        } catch (error) {
            console.error('保存生产记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 保存交付记录到本地数据库
     * @param {Object} record - 交付记录
     * @returns {Object} 保存结果
     */
    async saveDeliveryRecord(record) {
        try {
            // 检查记录是否已存在
            const existingQuery = `
                SELECT id FROM erp_delivery_data 
                WHERE delivery_number = ? AND delivery_date = ?
            `;
            const existing = await db.query(existingQuery, [record.deliveryNumber, record.deliveryDate]);

            if (existing.length > 0) {
                // 更新现有记录
                const updateQuery = `
                    UPDATE erp_delivery_data SET
                        customer_code = ?,
                        quantity = ?,
                        delivery_status = ?,
                        updated_at = GETDATE()
                    WHERE id = ?
                `;
                await db.query(updateQuery, [
                    record.customerCode,
                    record.quantity,
                    record.deliveryStatus,
                    existing[0].id
                ]);
                return { isNew: false, id: existing[0].id };
            } else {
                // 插入新记录
                const insertQuery = `
                    INSERT INTO erp_delivery_data (
                        delivery_number, delivery_date, customer_code, 
                        quantity, delivery_status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
                `;
                const result = await db.query(insertQuery, [
                    record.deliveryNumber,
                    record.deliveryDate,
                    record.customerCode,
                    record.quantity,
                    record.deliveryStatus
                ]);
                return { isNew: true, id: result.insertId };
            }
        } catch (error) {
            console.error('保存交付记录失败:', error.message);
            throw error;
        }
    }

    /**
     * 更新质量指标（如客户投诉率）
     * @param {Object} syncResult - 同步结果对象
     */
    async updateQualityMetrics(syncResult) {
        try {
            console.log('正在更新质量指标...');
            
            // 计算客户投诉率
            await this.calculateComplaintRate();
            
            // 计算其他质量指标
            await this.calculateOtherMetrics();
            
            syncResult.results.push({
                type: 'metrics',
                status: 'success',
                message: '质量指标更新成功'
            });
            
            console.log('质量指标更新完成');
            
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
            // 获取最近30天的交付数据和投诉数据
            const deliveryQuery = `
                SELECT COUNT(*) as total_deliveries, SUM(quantity) as total_quantity
                FROM erp_delivery_data 
                WHERE delivery_date >= DATEADD(day, -30, GETDATE())
            `;
            const deliveryResult = await db.query(deliveryQuery);
            
            const complaintQuery = `
                SELECT COUNT(*) as total_complaints
                FROM CustomerComplaints 
                WHERE created_at >= DATEADD(day, -30, GETDATE())
            `;
            const complaintResult = await db.query(complaintQuery);
            
            const totalDeliveries = deliveryResult[0]?.total_deliveries || 0;
            const totalComplaints = complaintResult[0]?.total_complaints || 0;
            
            const complaintRate = totalDeliveries > 0 ? (totalComplaints / totalDeliveries * 100) : 0;
            
            // 保存计算结果
            const updateQuery = `
                INSERT INTO quality_metrics (metric_name, metric_value, calculation_date, created_at)
                VALUES ('complaint_rate', ?, GETDATE(), GETDATE())
            `;
            await db.query(updateQuery, [complaintRate]);
            
            console.log(`客户投诉率计算完成: ${complaintRate.toFixed(2)}%`);
            
        } catch (error) {
            console.error('计算客户投诉率失败:', error.message);
            throw error;
        }
    }

    /**
     * 计算其他质量指标
     */
    async calculateOtherMetrics() {
        // 这里可以添加其他质量指标的计算逻辑
        // 例如：合格率、及时交付率等
        console.log('其他质量指标计算完成');
    }

    /**
     * 保存同步结果
     * @param {Object} syncResult - 同步结果
     */
    async saveSyncResult(syncResult) {
        try {
            const insertQuery = `
                INSERT INTO erp_sync_logs (
                    sync_id, start_time, end_time, duration, 
                    status, sync_types, results, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
            `;
            await db.query(insertQuery, [
                syncResult.syncId,
                syncResult.startTime,
                syncResult.endTime,
                syncResult.duration,
                syncResult.status,
                JSON.stringify(syncResult.syncTypes),
                JSON.stringify(syncResult.results)
            ]);
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
        
        console.log('同步配置已更新:', this.syncConfig);
    }
}

// 创建单例实例
const erpSyncService = new ErpSyncService();

module.exports = erpSyncService;