/**
 * 通知公告管理系统 - 控制器
 * 功能：处理通知公告相关的业务逻辑
 * 版本：v1.0
 * 创建日期：2025-08-08
 */

const sql = require('mssql');
const { getConnection } = require('../config/database');
const moment = require('moment');

/**
 * 清理内容中的头尾P标签
 * @param {string} content - 原始内容
 * @returns {string} 清理后的内容
 */
const cleanPTags = (content) => {
    if (!content || typeof content !== 'string') {
        return content;
    }
    
    // 移除开头和结尾的P标签，但保留中间的P标签
    let cleaned = content.trim();
    
    // 移除开头的<p>标签（包括带属性的）
    cleaned = cleaned.replace(/^<p[^>]*>/i, '');
    
    // 移除结尾的</p>标签
    cleaned = cleaned.replace(/<\/p>$/i, '');
    
    return cleaned.trim();
};

/**
 * 获取通知公告列表（支持已读未读状态）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getNoticeList = async (req, res) => {
    try {
        const pool = await getConnection();
        const { 
            limit = 10, 
            page = 1, 
            size = 10, 
            type, 
            timeRange, 
            readStatus,
            priority
        } = req.query;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 计算分页参数
        const pageSize = parseInt(size) || parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * pageSize;
        
        let whereClause = 'WHERE n.IsActive = 1';
        
        // 根据类型过滤（只有当type不为空且不为'all'时才过滤）
        if (type && type !== 'all' && type.trim() !== '') {
            whereClause += ` AND n.Type = '${type}'`;
        }
        
        // 根据优先级过滤（只有当priority不为空时才过滤）
        if (priority && priority.trim() !== '') {
            whereClause += ` AND n.Priority = '${priority}'`;
        }
        
        // 根据已读状态过滤（只有当readStatus不为空时才过滤）
        if (readStatus && readStatus.trim() !== '') {
            if (readStatus === 'unread') {
                whereClause += ' AND (nrs.IsRead IS NULL OR nrs.IsRead = 0)';
            } else if (readStatus === 'read') {
                whereClause += ' AND nrs.IsRead = 1';
            }
        }
        
        // 根据时间范围过滤
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    whereClause += ' AND CAST(n.PublishDate as DATE) = CAST(GETDATE() as DATE)';
                    break;
                case 'week':
                    whereClause += ' AND n.PublishDate >= DATEADD(week, -1, GETDATE())';
                    break;
                case 'month':
                    whereClause += ' AND n.PublishDate >= DATEADD(month, -1, GETDATE())';
                    break;
                case 'quarter':
                    whereClause += ' AND n.PublishDate >= DATEADD(quarter, -1, GETDATE())';
                    break;
                case 'year':
                    whereClause += ' AND n.PublishDate >= DATEADD(year, -1, GETDATE())';
                    break;
            }
        }
        
        // 先查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM Notices n
            LEFT JOIN NoticeReadStatus nrs ON n.ID = nrs.NoticeID AND nrs.UserID = @userId
            ${whereClause}
        `;
        
        const countResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(countQuery);
        
        const total = countResult.recordset[0].total;
        
        // 查询通知公告（包含已读状态和分页）- 使用ROW_NUMBER()兼容旧版SQL Server
        const noticeQuery = `
            SELECT * FROM (
                SELECT 
                    n.ID,
                    n.Title,
                    n.Content,
                    n.Type,
                    n.Priority,
                    n.PublishDate,
                    n.CreatedBy,
                    n.IsActive,
                    n.ViewCount,
                    n.IsSticky,
                    n.ExpiryDate,
                    n.RequireConfirmation,
                    ISNULL(nrs.IsRead, 0) as IsRead,
                    nrs.ReadTime,
                    ISNULL(nrs.IsConfirmed, 0) as IsConfirmed,
                    nrs.ConfirmTime,
                    ROW_NUMBER() OVER (ORDER BY n.IsSticky DESC, n.Priority DESC, n.PublishDate DESC) as RowNum
                FROM Notices n
                LEFT JOIN NoticeReadStatus nrs ON n.ID = nrs.NoticeID AND nrs.UserID = @userId
                ${whereClause}
            ) AS PagedResults
            WHERE RowNum > @offset AND RowNum <= @offset + @pageSize
            ORDER BY RowNum
        `;
        
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .input('userId', sql.Int, userId)
            .query(noticeQuery);
        
        // 格式化日期
        const notices = result.recordset.map(notice => ({
            ...notice,
            PublishDate: notice.PublishDate ? moment(notice.PublishDate).format('YYYY-MM-DD HH:mm') : null,
            ExpiryDate: notice.ExpiryDate ? moment(notice.ExpiryDate).format('YYYY-MM-DD HH:mm') : null,
            ReadTime: notice.ReadTime ? moment(notice.ReadTime).format('YYYY-MM-DD HH:mm') : null,
            ConfirmTime: notice.ConfirmTime ? moment(notice.ConfirmTime).format('YYYY-MM-DD HH:mm') : null,
            timeAgo: notice.PublishDate ? moment(notice.PublishDate).fromNow() : null,
            isExpired: notice.ExpiryDate ? moment().isAfter(moment(notice.ExpiryDate)) : false
        }));
        
        res.json({
            success: true,
            data: notices,
            pagination: {
                page: pageNum,
                size: pageSize,
                total: total,
                totalPages: Math.ceil(total / pageSize)
            },
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
 * 获取通知公告详情（自动标记为已读）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getNoticeById = async (req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 查询通知详情（包含已读状态）
        const noticeQuery = `
            SELECT 
                n.ID,
                n.Title,
                n.Content,
                n.Type,
                n.Priority,
                n.PublishDate,
                n.CreatedBy,
                n.IsActive,
                n.ViewCount,
                n.IsSticky,
                n.ExpiryDate,
                n.RequireConfirmation,
                ISNULL(nrs.IsRead, 0) as IsRead,
                nrs.ReadTime,
                ISNULL(nrs.IsConfirmed, 0) as IsConfirmed,
                nrs.ConfirmTime
            FROM Notices n
            LEFT JOIN NoticeReadStatus nrs ON n.ID = nrs.NoticeID AND nrs.UserID = @userId
            WHERE n.ID = @id AND n.IsActive = 1
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query(noticeQuery);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '通知公告不存在'
            });
        }
        
        const notice = result.recordset[0];
        
        // 增加浏览次数
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('UPDATE Notices SET ViewCount = ViewCount + 1 WHERE ID = @id');
        
        // 标记为已读（如果尚未读过）
        if (!notice.IsRead) {
            await pool.request()
                .input('noticeId', sql.Int, parseInt(id))
                .input('userId', sql.Int, userId)
                .query(`
                    MERGE NoticeReadStatus AS target
                    USING (SELECT @noticeId as NoticeID, @userId as UserID) AS source
                    ON target.NoticeID = source.NoticeID AND target.UserID = source.UserID
                    WHEN MATCHED THEN
                        UPDATE SET IsRead = 1, ReadTime = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (NoticeID, UserID, IsRead, ReadTime)
                        VALUES (@noticeId, @userId, 1, GETDATE());
                `);
            
            notice.IsRead = 1;
            notice.ReadTime = moment().format('YYYY-MM-DD HH:mm');
        }
        
        // 格式化日期
        notice.PublishDate = notice.PublishDate ? moment(notice.PublishDate).format('YYYY-MM-DD HH:mm') : null;
        notice.ExpiryDate = notice.ExpiryDate ? moment(notice.ExpiryDate).format('YYYY-MM-DD HH:mm') : null;
        notice.ReadTime = notice.ReadTime ? moment(notice.ReadTime).format('YYYY-MM-DD HH:mm') : null;
        notice.ConfirmTime = notice.ConfirmTime ? moment(notice.ConfirmTime).format('YYYY-MM-DD HH:mm') : null;
        notice.isExpired = notice.ExpiryDate ? moment().isAfter(moment(notice.ExpiryDate)) : false;
        
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
        const pool = await getConnection();
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
            .input('content', sql.NVarChar, cleanPTags(content))
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
        const pool = await getConnection();
        const { id } = req.params;
        const { 
            Title, 
            Content, 
            Type, 
            Priority, 
            ExpiryDate, 
            IsSticky, 
            RequireConfirmation 
        } = req.body;
        
        // 验证必填字段
        if (!Title || !Content) {
            return res.status(400).json({
                success: false,
                message: '标题和内容为必填项'
            });
        }
        
        // 更新通知公告
        const updateQuery = `
            UPDATE Notices 
            SET Title = @title, 
                Content = @content, 
                Type = @type, 
                Priority = @priority,
                ExpiryDate = @expiryDate,
                IsSticky = @isSticky,
                RequireConfirmation = @requireConfirmation,
                UpdatedAt = GETDATE()
            WHERE ID = @id AND IsActive = 1
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('title', sql.NVarChar, Title)
            .input('content', sql.NVarChar, cleanPTags(Content))
            .input('type', sql.NVarChar, Type || 'general')
            .input('priority', sql.NVarChar, Priority || 'medium')
            .input('expiryDate', sql.DateTime, ExpiryDate ? new Date(ExpiryDate) : null)
            .input('isSticky', sql.Bit, IsSticky || false)
            .input('requireConfirmation', sql.Bit, RequireConfirmation || false)
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
        const pool = await getConnection();
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

/**
 * 标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const markAsRead = async (req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 验证通知ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: '通知ID不能为空'
            });
        }
        
        const noticeId = parseInt(id);
        console.log('标记已读 - NoticeID:', noticeId, '用户ID:', userId);
        
        // 先检查是否已存在记录
        const existingRecord = await pool.request()
            .input('noticeId', sql.Int, noticeId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) as count FROM NoticeReadStatus 
                WHERE NoticeID = @noticeId AND UserID = @userId
            `);
        
        if (existingRecord.recordset[0].count > 0) {
            // 更新现有记录
            await pool.request()
                .input('noticeId', sql.Int, noticeId)
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE NoticeReadStatus 
                    SET IsRead = 1, ReadTime = GETDATE() 
                    WHERE NoticeID = @noticeId AND UserID = @userId
                `);
        } else {
            // 插入新记录
            await pool.request()
                .input('noticeId', sql.Int, noticeId)
                .input('userId', sql.Int, userId)
                .query(`
                    INSERT INTO NoticeReadStatus (NoticeID, UserID, IsRead, ReadTime)
                    VALUES (@noticeId, @userId, 1, GETDATE())
                `);
        }
        
        res.json({
            success: true,
            message: '通知已标记为已读'
        });
        
    } catch (error) {
        console.error('标记已读失败:', error);
        res.status(500).json({
            success: false,
            message: '标记已读失败',
            error: error.message
        });
    }
};

/**
 * 确认阅读通知（用于需要确认的重要通知）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const confirmRead = async (req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 确认阅读
        await pool.request()
            .input('noticeId', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query(`
                MERGE NoticeReadStatus AS target
                USING (SELECT @noticeId as NoticeID, @userId as UserID) AS source
                ON target.NoticeID = source.NoticeID AND target.UserID = source.UserID
                WHEN MATCHED THEN
                    UPDATE SET IsRead = 1, ReadTime = ISNULL(ReadTime, GETDATE()), 
                              IsConfirmed = 1, ConfirmTime = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (NoticeID, UserID, IsRead, ReadTime, IsConfirmed, ConfirmTime)
                    VALUES (@noticeId, @userId, 1, GETDATE(), 1, GETDATE());
            `);
        
        res.json({
            success: true,
            message: '通知确认阅读成功'
        });
        
    } catch (error) {
        console.error('确认阅读失败:', error);
        res.status(500).json({
            success: false,
            message: '确认阅读失败',
            error: error.message
        });
    }
};

/**
 * 获取未读通知数量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUnreadCount = async (req, res) => {
    try {
        const pool = await getConnection();
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        
        // 查询未读通知数量
        const countQuery = `
            SELECT COUNT(*) as unreadCount
            FROM Notices n
            LEFT JOIN NoticeReadStatus nrs ON n.ID = nrs.NoticeID AND nrs.UserID = @userId
            WHERE n.IsActive = 1 
            AND (n.ExpiryDate IS NULL OR n.ExpiryDate > GETDATE())
            AND (nrs.IsRead IS NULL OR nrs.IsRead = 0)
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(countQuery);
        
        res.json({
            success: true,
            data: { unreadCount: result.recordset[0].unreadCount },
            message: '未读通知数量获取成功'
        });
        
    } catch (error) {
        console.error('获取未读数量失败:', error);
        res.status(500).json({
            success: false,
            message: '获取未读数量失败',
            error: error.message
        });
    }
};

/**
 * 批量标记为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const markAllAsRead = async (req, res) => {
    try {
        const pool = await getConnection();
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        const { noticeIds } = req.body; // 可选：指定通知ID数组，如果不提供则标记所有未读
        
        if (noticeIds && noticeIds.length > 0) {
            // 标记指定的通知为已读
            const placeholders = noticeIds.map((_, index) => `@id${index}`).join(',');
            
            // 先获取有效的通知ID
            const validNoticesQuery = `
                SELECT n.ID as NoticeID
                FROM Notices n
                WHERE n.ID IN (${placeholders}) AND n.IsActive = 1
            `;
            
            const request = pool.request().input('userId', sql.Int, userId);
            noticeIds.forEach((id, index) => {
                request.input(`id${index}`, sql.Int, parseInt(id));
            });
            
            const validNotices = await request.query(validNoticesQuery);
            
            // 为每个有效的通知ID执行插入或更新操作
            for (const notice of validNotices.recordset) {
                // 先检查是否已存在记录
                const existingRecord = await pool.request()
                    .input('noticeId', sql.Int, notice.NoticeID)
                    .input('userId', sql.Int, userId)
                    .query(`
                        SELECT COUNT(*) as count FROM NoticeReadStatus 
                        WHERE NoticeID = @noticeId AND UserID = @userId
                    `);
                
                if (existingRecord.recordset[0].count > 0) {
                    // 更新现有记录
                    await pool.request()
                        .input('noticeId', sql.Int, notice.NoticeID)
                        .input('userId', sql.Int, userId)
                        .query(`
                            UPDATE NoticeReadStatus 
                            SET IsRead = 1, ReadTime = GETDATE() 
                            WHERE NoticeID = @noticeId AND UserID = @userId
                        `);
                } else {
                    // 插入新记录
                    await pool.request()
                        .input('noticeId', sql.Int, notice.NoticeID)
                        .input('userId', sql.Int, userId)
                        .query(`
                            INSERT INTO NoticeReadStatus (NoticeID, UserID, IsRead, ReadTime)
                            VALUES (@noticeId, @userId, 1, GETDATE())
                        `);
                }
            }
        } else {
            // 标记所有未读通知为已读
            // 先获取所有未读的通知ID
            const unreadNoticesQuery = `
                SELECT n.ID as NoticeID
                FROM Notices n
                LEFT JOIN NoticeReadStatus nrs ON n.ID = nrs.NoticeID AND nrs.UserID = @userId
                WHERE n.IsActive = 1 
                AND n.ID IS NOT NULL
                AND (n.ExpiryDate IS NULL OR n.ExpiryDate > GETDATE())
                AND (nrs.IsRead IS NULL OR nrs.IsRead = 0)
            `;
            
            const unreadNotices = await pool.request()
                .input('userId', sql.Int, userId)
                .query(unreadNoticesQuery);
            
            // 为每个未读通知执行插入或更新操作
            for (const notice of unreadNotices.recordset) {
                // 验证NoticeID不为空
                if (!notice.NoticeID || notice.NoticeID === null || notice.NoticeID === undefined) {
                    console.error('发现无效的NoticeID:', notice);
                    continue;
                }
                
                // 先检查是否已存在记录
                const existingRecord = await pool.request()
                    .input('noticeId', sql.Int, notice.NoticeID)
                    .input('userId', sql.Int, userId)
                    .query(`
                        SELECT COUNT(*) as count FROM NoticeReadStatus 
                        WHERE NoticeID = @noticeId AND UserID = @userId
                    `);
                
                if (existingRecord.recordset[0].count > 0) {
                    // 更新现有记录
                    await pool.request()
                        .input('noticeId', sql.Int, notice.NoticeID)
                        .input('userId', sql.Int, userId)
                        .query(`
                            UPDATE NoticeReadStatus 
                            SET IsRead = 1, ReadTime = GETDATE() 
                            WHERE NoticeID = @noticeId AND UserID = @userId
                        `);
                } else {
                    // 插入新记录
                    await pool.request()
                        .input('noticeId', sql.Int, notice.NoticeID)
                        .input('userId', sql.Int, userId)
                        .query(`
                            INSERT INTO NoticeReadStatus (NoticeID, UserID, IsRead, ReadTime)
                            VALUES (@noticeId, @userId, 1, GETDATE())
                        `);
                }
            }
        }
        
        res.json({
            success: true,
            message: '批量标记已读成功'
        });
        
    } catch (error) {
        console.error('批量标记已读失败:', error);
        res.status(500).json({
            success: false,
            message: '批量标记已读失败',
            error: error.message
        });
    }
};


 
module.exports = {
    getNoticeList,
    getNoticeById,
    createNotice,
    updateNotice,
    deleteNotice,
    markAsRead,
    confirmRead,
    getUnreadCount,
    markAllAsRead
};