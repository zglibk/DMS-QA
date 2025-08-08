/**
 * 通知公告管理系统 - 控制器
 * 功能：处理通知公告相关的业务逻辑
 * 版本：v1.0
 * 创建日期：2025-08-08
 */

const sql = require('mssql');
const { poolPromise } = require('../config/database');
const moment = require('moment');

/**
 * 获取通知公告列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getNoticeList = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { limit = 10, type = 'all', timeRange } = req.query;
        
        let whereClause = 'WHERE IsActive = 1';
        
        // 根据类型过滤
        if (type !== 'all') {
            whereClause += ` AND Type = '${type}'`;
        }
        
        // 根据时间范围过滤
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    whereClause += ' AND CAST(PublishDate as DATE) = CAST(GETDATE() as DATE)';
                    break;
                case 'week':
                    whereClause += ' AND PublishDate >= DATEADD(week, -1, GETDATE())';
                    break;
                case 'month':
                    whereClause += ' AND PublishDate >= DATEADD(month, -1, GETDATE())';
                    break;
                case 'quarter':
                    whereClause += ' AND PublishDate >= DATEADD(quarter, -1, GETDATE())';
                    break;
                case 'year':
                    whereClause += ' AND PublishDate >= DATEADD(year, -1, GETDATE())';
                    break;
            }
        }
        
        // 查询通知公告
        const noticeQuery = `
            SELECT TOP (@limit)
                ID,
                Title,
                Content,
                Type,
                Priority,
                PublishDate,
                CreatedBy,
                IsActive,
                ViewCount
            FROM Notices 
            ${whereClause}
            ORDER BY Priority DESC, PublishDate DESC
        `;
        
        const result = await pool.request()
            .input('limit', sql.Int, parseInt(limit))
            .query(noticeQuery);
        
        // 格式化日期
        const notices = result.recordset.map(notice => ({
            ...notice,
            PublishDate: notice.PublishDate ? moment(notice.PublishDate).format('YYYY-MM-DD HH:mm') : null,
            timeAgo: notice.PublishDate ? moment(notice.PublishDate).fromNow() : null
        }));
        
        res.json({
            success: true,
            data: notices,
            message: '通知公告获取成功'
        });
        
    } catch (error) {
        console.error('获取通知公告失败:', error);
        res.status(500).json({
            success: false,
            message: '获取通知公告失败',
            error: error.message
        });
    }
};

/**
 * 获取通知公告详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getNoticeById = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        // 查询通知详情
        const noticeQuery = `
            SELECT 
                ID,
                Title,
                Content,
                Type,
                Priority,
                PublishDate,
                CreatedBy,
                IsActive,
                ViewCount
            FROM Notices 
            WHERE ID = @id AND IsActive = 1
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(noticeQuery);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '通知公告不存在'
            });
        }
        
        // 增加浏览次数
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('UPDATE Notices SET ViewCount = ViewCount + 1 WHERE ID = @id');
        
        const notice = result.recordset[0];
        notice.PublishDate = notice.PublishDate ? moment(notice.PublishDate).format('YYYY-MM-DD HH:mm') : null;
        
        res.json({
            success: true,
            data: notice,
            message: '通知公告详情获取成功'
        });
        
    } catch (error) {
        console.error('获取通知公告详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取通知公告详情失败',
            error: error.message
        });
    }
};

/**
 * 创建通知公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createNotice = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { title, content, type = 'notice', priority = 'normal' } = req.body;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 验证必填字段
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: '标题和内容为必填项'
            });
        }
        
        // 插入通知公告
        const insertQuery = `
            INSERT INTO Notices (Title, Content, Type, Priority, CreatedBy, IsActive, ViewCount)
            VALUES (@title, @content, @type, @priority, @createdBy, 1, 0);
            SELECT SCOPE_IDENTITY() as ID;
        `;
        
        const result = await pool.request()
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('type', sql.NVarChar, type)
            .input('priority', sql.NVarChar, priority)
            .input('createdBy', sql.Int, userId)
            .query(insertQuery);
        
        res.json({
            success: true,
            data: { id: result.recordset[0].ID },
            message: '通知公告创建成功'
        });
        
    } catch (error) {
        console.error('创建通知公告失败:', error);
        res.status(500).json({
            success: false,
            message: '创建通知公告失败',
            error: error.message
        });
    }
};

/**
 * 更新通知公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateNotice = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { title, content, type, priority } = req.body;
        
        // 验证必填字段
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: '标题和内容为必填项'
            });
        }
        
        // 更新通知公告
        const updateQuery = `
            UPDATE Notices 
            SET Title = @title, Content = @content, Type = @type, Priority = @priority, UpdatedAt = GETDATE()
            WHERE ID = @id AND IsActive = 1
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('type', sql.NVarChar, type)
            .input('priority', sql.NVarChar, priority)
            .query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '通知公告不存在'
            });
        }
        
        res.json({
            success: true,
            message: '通知公告更新成功'
        });
        
    } catch (error) {
        console.error('更新通知公告失败:', error);
        res.status(500).json({
            success: false,
            message: '更新通知公告失败',
            error: error.message
        });
    }
};

/**
 * 删除通知公告（软删除）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteNotice = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        // 软删除通知公告
        const deleteQuery = `
            UPDATE Notices 
            SET IsActive = 0
            WHERE ID = @id
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(deleteQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '通知公告不存在'
            });
        }
        
        res.json({
            success: true,
            message: '通知公告删除成功'
        });
        
    } catch (error) {
        console.error('删除通知公告失败:', error);
        res.status(500).json({
            success: false,
            message: '删除通知公告失败',
            error: error.message
        });
    }
};

module.exports = {
    getNoticeList,
    getNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
};