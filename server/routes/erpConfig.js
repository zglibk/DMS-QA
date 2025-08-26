const express = require('express');
const router = express.Router();
const { sql, getConnection, executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * ERP配置管理和同步日志API路由
 * 用于管理ERP系统配置和查看同步日志
 */

/**
 * 获取ERP配置列表
 * GET /api/erp-config/config
 * 查询参数:
 * - page: 页码
 * - size: 每页数量
 */
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const { page = 1, size = 20 } = req.query;
        const offset = (page - 1) * size;
        
        // 查询配置总数
        const countQuery = 'SELECT COUNT(*) as total FROM erp_config';
        const countResult = await executeQuery(async (pool) => {
            return await pool.request().query(countQuery);
        });
        const total = countResult.recordset[0].total;
        
        // 查询配置列表（兼容 SQL Server 2008R2）
        const query = `
            SELECT * FROM (
                SELECT id, config_key, config_value, description, created_at, updated_at,
                       ROW_NUMBER() OVER (ORDER BY created_at DESC) AS RowNum
                FROM erp_config
            ) AS T
            WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + size}
            ORDER BY T.RowNum
        `;
        
        const result = await executeQuery(async (pool) => {
            return await pool.request().query(query);
        });
        
        res.json({
            success: true,
            message: '获取配置列表成功',
            data: {
                list: result.recordset,
                total: total,
                page: parseInt(page),
                size: parseInt(size)
            }
        });
    } catch (error) {
        console.error('获取配置列表失败:', error);
        res.status(500).json({
            success: false,
            message: `获取配置列表失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 新增ERP配置
 * POST /api/erp-config/config
 * 请求体:
 * - config_key: 配置键
 * - config_value: 配置值
 * - description: 配置描述
 */
router.post('/config', authenticateToken, async (req, res) => {
    try {
        const { config_key, config_value, description } = req.body;
        
        if (!config_key || !config_value || !description) {
            return res.status(400).json({
                success: false,
                message: '配置键、配置值和描述不能为空',
                data: null
            });
        }
        
        // 检查配置键是否已存在
        const checkQuery = 'SELECT id FROM erp_config WHERE config_key = @config_key';
        const checkResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('config_key', sql.NVarChar, config_key)
                .query(checkQuery);
        });
        
        if (checkResult.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: '配置键已存在',
                data: null
            });
        }
        
        // 插入新配置
        const insertQuery = `
            INSERT INTO erp_config (config_key, config_value, description, created_at, updated_at)
            VALUES (@config_key, @config_value, @description, GETDATE(), GETDATE())
        `;
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('config_key', sql.NVarChar, config_key)
                .input('config_value', sql.NVarChar, config_value)
                .input('description', sql.NVarChar, description)
                .query(insertQuery);
        });
        
        res.json({
            success: true,
            message: '配置新增成功',
            data: null
        });
    } catch (error) {
        console.error('新增配置失败:', error);
        res.status(500).json({
            success: false,
            message: `新增配置失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 更新ERP配置
 * PUT /api/erp-config/config/:id
 * 请求体:
 * - config_value: 配置值
 * - description: 配置描述
 */
router.put('/config/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { config_value, description } = req.body;
        
        if (!config_value || !description) {
            return res.status(400).json({
                success: false,
                message: '配置值和描述不能为空',
                data: null
            });
        }
        
        // 检查配置是否存在
        const checkQuery = 'SELECT id FROM erp_config WHERE id = @id';
        const checkResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .query(checkQuery);
        });
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '配置不存在',
                data: null
            });
        }
        
        // 更新配置
        const updateQuery = `
            UPDATE erp_config 
            SET config_value = @config_value, description = @description, updated_at = GETDATE()
            WHERE id = @id
        `;
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .input('config_value', sql.NVarChar, config_value)
                .input('description', sql.NVarChar, description)
                .query(updateQuery);
        });
        
        res.json({
            success: true,
            message: '配置更新成功',
            data: null
        });
    } catch (error) {
        console.error('更新配置失败:', error);
        res.status(500).json({
            success: false,
            message: `更新配置失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 删除ERP配置
 * DELETE /api/erp-config/config/:id
 */
router.delete('/config/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查配置是否存在
        const checkQuery = 'SELECT id FROM erp_config WHERE id = @id';
        const checkResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .query(checkQuery);
        });
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '配置不存在',
                data: null
            });
        }
        
        // 删除配置
        const deleteQuery = 'DELETE FROM erp_config WHERE id = @id';
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .query(deleteQuery);
        });
        
        res.json({
            success: true,
            message: '配置删除成功',
            data: null
        });
    } catch (error) {
        console.error('删除配置失败:', error);
        res.status(500).json({
            success: false,
            message: `删除配置失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取ERP同步日志列表
 * GET /api/erp-config/sync-logs
 * 查询参数:
 * - page: 页码
 * - size: 每页数量
 * - sync_type: 同步类型
 * - status: 同步状态
 * - start_time: 开始时间
 * - end_time: 结束时间
 */
router.get('/sync-logs', authenticateToken, async (req, res) => {
    try {
        const { page = 1, size = 20, sync_type, status, start_time, end_time } = req.query;
        const offset = (page - 1) * size;
        
        // 构建查询条件
        let whereConditions = [];
        let queryParams = {};
        
        if (sync_type) {
            whereConditions.push('sync_types LIKE @sync_type');
            queryParams.sync_type = `%${sync_type}%`;
        }
        
        if (status) {
            whereConditions.push('status = @status');
            queryParams.status = status;
        }
        
        if (start_time) {
            whereConditions.push('start_time >= @start_time');
            queryParams.start_time = start_time;
        }
        
        if (end_time) {
            whereConditions.push('start_time <= @end_time');
            queryParams.end_time = end_time;
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // 查询日志总数
        const countQuery = `SELECT COUNT(*) as total FROM erp_sync_logs ${whereClause}`;
        const countResult = await executeQuery(async (pool) => {
            const request = pool.request();
            Object.keys(queryParams).forEach(key => {
                request.input(key, sql.NVarChar, queryParams[key]);
            });
            return await request.query(countQuery);
        });
        const total = countResult.recordset[0].total;
        
        // 查询日志列表（兼容 SQL Server 2008R2）
        const query = `
            SELECT * FROM (
                SELECT id, sync_id, start_time, end_time, duration, status, sync_types, results, created_at,
                       ROW_NUMBER() OVER (ORDER BY start_time DESC) AS RowNum
                FROM erp_sync_logs
                ${whereClause}
            ) AS T
            WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + size}
            ORDER BY T.RowNum
        `;
        
        const result = await executeQuery(async (pool) => {
            const request = pool.request();
            Object.keys(queryParams).forEach(key => {
                request.input(key, sql.NVarChar, queryParams[key]);
            });
            return await request.query(query);
        });
        
        res.json({
            success: true,
            message: '获取同步日志成功',
            data: {
                list: result.recordset,
                total: total,
                page: parseInt(page),
                size: parseInt(size)
            }
        });
    } catch (error) {
        console.error('获取同步日志失败:', error);
        res.status(500).json({
            success: false,
            message: `获取同步日志失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 获取同步日志详情
 * GET /api/erp-config/sync-logs/:id
 */
router.get('/sync-logs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT id, sync_id, start_time, end_time, duration, status, sync_types, results, created_at
            FROM erp_sync_logs
            WHERE id = @id
        `;
        
        const result = await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .query(query);
        });
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '同步日志不存在',
                data: null
            });
        }
        
        const logDetail = result.recordset[0];
        
        // 解析results字段
        if (logDetail.results) {
            try {
                logDetail.results = JSON.parse(logDetail.results);
            } catch (e) {
                console.warn('解析同步结果JSON失败:', e);
            }
        }
        
        res.json({
            success: true,
            message: '获取同步日志详情成功',
            data: logDetail
        });
    } catch (error) {
        console.error('获取同步日志详情失败:', error);
        res.status(500).json({
            success: false,
            message: `获取同步日志详情失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 手动触发ERP数据同步
 * POST /api/erp-config/manual-sync
 * 请求体:
 * - sync_types: 同步类型数组 ['production', 'delivery']
 * - time_range: 同步时间范围(小时)
 */
router.post('/manual-sync', authenticateToken, async (req, res) => {
    try {
        const { sync_types = ['production', 'delivery'], time_range = 24 } = req.body;
        
        // 生成同步ID
        const sync_id = `manual_${Date.now()}`;
        const start_time = new Date();
        
        // 记录同步开始
        const insertQuery = `
            INSERT INTO erp_sync_logs (sync_id, start_time, status, sync_types, created_at)
            VALUES (@sync_id, @start_time, 'running', @sync_types, GETDATE())
        `;
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('sync_id', sql.NVarChar, sync_id)
                .input('start_time', sql.DateTime, start_time)
                .input('sync_types', sql.NVarChar, sync_types.join(','))
                .query(insertQuery);
        });
        
        // 这里应该调用实际的同步逻辑
        // 暂时模拟同步过程
        setTimeout(async () => {
            try {
                const end_time = new Date();
                const duration = end_time.getTime() - start_time.getTime();
                
                // 模拟同步结果
                const results = {
                    production: { status: 'success', records: 150 },
                    delivery: { status: 'success', records: 89 }
                };
                
                // 更新同步结果
                const updateQuery = `
                    UPDATE erp_sync_logs 
                    SET end_time = @end_time, duration = @duration, status = 'success', results = @results
                    WHERE sync_id = @sync_id
                `;
                
                await executeQuery(async (pool) => {
                    return await pool.request()
                        .input('sync_id', sql.NVarChar, sync_id)
                        .input('end_time', sql.DateTime, end_time)
                        .input('duration', sql.Int, duration)
                        .input('results', sql.NVarChar, JSON.stringify(results))
                        .query(updateQuery);
                });
            } catch (error) {
                console.error('更新同步结果失败:', error);
                // 更新为失败状态
                const updateQuery = `
                    UPDATE erp_sync_logs 
                    SET end_time = GETDATE(), status = 'failed', results = @error
                    WHERE sync_id = @sync_id
                `;
                
                await executeQuery(async (pool) => {
                    return await pool.request()
                        .input('sync_id', sql.NVarChar, sync_id)
                        .input('error', sql.NVarChar, JSON.stringify({ error: error.message }))
                        .query(updateQuery);
                });
            }
        }, 3000); // 模拟3秒同步时间
        
        res.json({
            success: true,
            message: '手动同步已启动',
            data: {
                sync_id: sync_id,
                start_time: start_time
            }
        });
    } catch (error) {
        console.error('手动同步启动失败:', error);
        res.status(500).json({
            success: false,
            message: `手动同步启动失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 清理同步日志
 * DELETE /api/erp-config/sync-logs/cleanup
 * 请求体:
 * - days: 保留天数，默认30天
 */
router.delete('/sync-logs/cleanup', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.body;
        
        const deleteQuery = `
            DELETE FROM erp_sync_logs 
            WHERE created_at < DATEADD(day, -@days, GETDATE())
        `;
        
        const result = await executeQuery(async (pool) => {
            return await pool.request()
                .input('days', sql.Int, days)
                .query(deleteQuery);
        });
        
        res.json({
            success: true,
            message: `已清理${days}天前的同步日志`,
            data: {
                deletedCount: result.rowsAffected[0] || 0
            }
        });
    } catch (error) {
        console.error('清理同步日志失败:', error);
        res.status(500).json({
            success: false,
            message: `清理同步日志失败: ${error.message}`,
            data: null
        });
    }
});

/**
 * 重试失败的同步
 * POST /api/erp-config/sync-logs/:id/retry
 */
router.post('/sync-logs/:id/retry', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取原始同步记录
        const getQuery = 'SELECT sync_types FROM erp_sync_logs WHERE id = @id AND status = \'failed\'';
        const getResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('id', sql.Int, id)
                .query(getQuery);
        });
        
        if (getResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到失败的同步记录',
                data: null
            });
        }
        
        const sync_types = getResult.recordset[0].sync_types.split(',');
        
        // 创建新的同步记录
        const sync_id = `retry_${Date.now()}`;
        const start_time = new Date();
        
        const insertQuery = `
            INSERT INTO erp_sync_logs (sync_id, start_time, status, sync_types, created_at)
            VALUES (@sync_id, @start_time, 'running', @sync_types, GETDATE())
        `;
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('sync_id', sql.NVarChar, sync_id)
                .input('start_time', sql.DateTime, start_time)
                .input('sync_types', sql.NVarChar, sync_types.join(','))
                .query(insertQuery);
        });
        
        res.json({
            success: true,
            message: '重试同步已启动',
            data: {
                sync_id: sync_id,
                start_time: start_time
            }
        });
    } catch (error) {
        console.error('重试同步失败:', error);
        res.status(500).json({
            success: false,
            message: `重试同步失败: ${error.message}`,
            data: null
        });
    }
});

module.exports = router;