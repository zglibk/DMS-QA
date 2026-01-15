/**
 * 待办事项管理 API
 * /api/todo-items
 */

const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取当前用户的待办事项列表
 * GET /api/todo-items
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, todoType, page = 1, pageSize = 20, isRead } = req.query;
        const userId = req.user.id;
        const pool = await getConnection();
        
        // 包含分配给我的和我创建的
        let whereConditions = ['(AssignedTo = @userId OR CreatedBy = @userId)'];
        
        // 处理状态筛选 - completed 包含多种已完成状态
        if (status) {
            if (status === 'completed') {
                whereConditions.push("Status IN ('completed', 'approved', 'passed', N'已审核', N'已通过', N'已完成')");
            } else {
                whereConditions.push('Status = @status');
            }
        }
        if (todoType) {
            whereConditions.push('TodoType = @todoType');
        }
        // 支持未读筛选
        if (isRead !== undefined && isRead !== '') {
            whereConditions.push('IsRead = @isRead');
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // 查询总数
        const countRequest = pool.request()
            .input('userId', sql.Int, userId);
        if (status && status !== 'completed') countRequest.input('status', sql.NVarChar(20), status);
        if (todoType) countRequest.input('todoType', sql.NVarChar(50), todoType);
        if (isRead !== undefined && isRead !== '') countRequest.input('isRead', sql.Bit, isRead === 'true' || isRead === '1' ? 1 : 0);
        
        const countResult = await countRequest.query(`
            SELECT COUNT(*) as total FROM TodoItems WHERE ${whereClause}
        `);
        
        const total = countResult.recordset[0].total;
        
        // 使用 ROW_NUMBER 分页（兼容 SQL Server 2008）
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const dataRequest = pool.request()
            .input('userId', sql.Int, userId)
            .input('startRow', sql.Int, offset + 1)
            .input('endRow', sql.Int, offset + parseInt(pageSize));
        if (status && status !== 'completed') dataRequest.input('status', sql.NVarChar(20), status);
        if (todoType) dataRequest.input('todoType', sql.NVarChar(50), todoType);
        if (isRead !== undefined && isRead !== '') dataRequest.input('isRead', sql.Bit, isRead === 'true' || isRead === '1' ? 1 : 0);
        
        const result = await dataRequest.query(`
            SELECT * FROM (
                SELECT *,
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE WHEN Status = 'pending' THEN 0 ELSE 1 END,
                            CASE Priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                            CreatedAt DESC
                    ) AS RowNum
                FROM TodoItems 
                WHERE ${whereClause}
            ) AS T
            WHERE RowNum >= @startRow AND RowNum <= @endRow
        `);
        
        res.json({
            success: true,
            data: result.recordset,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    } catch (error) {
        console.error('获取待办事项失败:', error);
        res.status(500).json({ success: false, message: '获取待办事项失败', error: error.message });
    }
});

/**
 * 获取当前用户待办数量统计
 * GET /api/todo-items/count
 * 
 * 统计逻辑：
 * - 待处理：分配给我审核的待审核记录 + 我创建的待提交记录
 * - 未读：未读的待处理记录
 * - 已完成：我审核通过的 + 我创建且已通过的
 * - 全部：所有与我相关的记录
 */
router.get('/count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN Status IN ('completed', 'approved', 'passed', N'已审核', N'已通过', N'已完成') THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN Status = 'pending' AND IsRead = 0 THEN 1 ELSE 0 END) as unread
                FROM TodoItems 
                WHERE AssignedTo = @userId OR CreatedBy = @userId
            `);
        
        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('获取待办数量失败:', error);
        res.status(500).json({ success: false, message: '获取待办数量失败', error: error.message });
    }
});

/**
 * 按类型统计待办数量
 * GET /api/todo-items/count-by-type
 */
router.get('/count-by-type', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    TodoType,
                    COUNT(*) as total,
                    SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as pending
                FROM TodoItems 
                WHERE AssignedTo = @userId
                GROUP BY TodoType
            `);
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('获取分类统计失败:', error);
        res.status(500).json({ success: false, message: '获取分类统计失败', error: error.message });
    }
});

/**
 * 标记待办为已读
 * PUT /api/todo-items/:id/read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const pool = await getConnection();
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE TodoItems 
                SET IsRead = 1, ReadTime = GETDATE(), UpdatedAt = GETDATE()
                WHERE ID = @id AND AssignedTo = @userId
            `);
        
        res.json({ success: true, message: '已标记为已读' });
    } catch (error) {
        console.error('标记已读失败:', error);
        res.status(500).json({ success: false, message: '标记已读失败', error: error.message });
    }
});

/**
 * 批量标记已读
 * PUT /api/todo-items/batch-read
 */
router.put('/batch-read', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        const userId = req.user.id;
        const pool = await getConnection();
        
        if (!ids || ids.length === 0) {
            return res.status(400).json({ success: false, message: '请选择要标记的待办' });
        }
        
        // 构建安全的ID列表
        const idList = ids.filter(id => Number.isInteger(parseInt(id))).join(',');
        if (!idList) {
            return res.status(400).json({ success: false, message: '无效的ID列表' });
        }
        
        await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE TodoItems 
                SET IsRead = 1, ReadTime = GETDATE(), UpdatedAt = GETDATE()
                WHERE ID IN (${idList}) AND AssignedTo = @userId
            `);
        
        res.json({ success: true, message: '批量标记成功' });
    } catch (error) {
        console.error('批量标记失败:', error);
        res.status(500).json({ success: false, message: '批量标记失败', error: error.message });
    }
});

/**
 * 创建待办事项（内部调用）
 * @param {Object} todoData 待办数据
 */
async function createTodoItem(todoData) {
    const pool = await getConnection();
    
    const result = await pool.request()
        .input('todoType', sql.NVarChar(50), todoData.todoType)
        .input('businessId', sql.Int, todoData.businessId)
        .input('businessNo', sql.NVarChar(50), todoData.businessNo || '')
        .input('title', sql.NVarChar(200), todoData.title)
        .input('content', sql.NVarChar(500), todoData.content || '')
        .input('priority', sql.NVarChar(20), todoData.priority || 'medium')
        .input('createdBy', sql.Int, todoData.createdBy)
        .input('createdByName', sql.NVarChar(50), todoData.createdByName || '')
        .input('assignedTo', sql.Int, todoData.assignedTo)
        .input('assignedToName', sql.NVarChar(50), todoData.assignedToName || '')
        .input('assignedDeptId', sql.Int, todoData.assignedDeptId || null)
        .input('expireTime', sql.DateTime, todoData.expireTime || null)
        .query(`
            INSERT INTO TodoItems (
                TodoType, BusinessID, BusinessNo, Title, Content, Priority,
                CreatedBy, CreatedByName, AssignedTo, AssignedToName, AssignedDeptID, ExpireTime
            ) VALUES (
                @todoType, @businessId, @businessNo, @title, @content, @priority,
                @createdBy, @createdByName, @assignedTo, @assignedToName, @assignedDeptId, @expireTime
            );
            SELECT SCOPE_IDENTITY() as ID;
        `);
    
    return result.recordset[0].ID;
}

/**
 * 完成待办事项（内部调用）
 * @param {number} businessId 业务ID
 * @param {string} todoType 待办类型
 * @param {string} result 处理结果
 */
async function completeTodoItem(businessId, todoType, result) {
    const pool = await getConnection();
    
    await pool.request()
        .input('businessId', sql.Int, businessId)
        .input('todoType', sql.NVarChar(50), todoType)
        .input('result', sql.NVarChar(500), result || '')
        .query(`
            UPDATE TodoItems 
            SET Status = 'completed', Result = @result, CompletedTime = GETDATE(), UpdatedAt = GETDATE()
            WHERE BusinessID = @businessId AND TodoType = @todoType AND Status = 'pending'
        `);
}

/**
 * 取消待办事项（内部调用）
 * @param {number} businessId 业务ID
 * @param {string} todoType 待办类型
 */
async function cancelTodoItem(businessId, todoType) {
    const pool = await getConnection();
    
    await pool.request()
        .input('businessId', sql.Int, businessId)
        .input('todoType', sql.NVarChar(50), todoType)
        .query(`
            UPDATE TodoItems 
            SET Status = 'cancelled', UpdatedAt = GETDATE()
            WHERE BusinessID = @businessId AND TodoType = @todoType AND Status = 'pending'
        `);
}

// 导出函数供其他模块使用
module.exports = router;
module.exports.createTodoItem = createTodoItem;
module.exports.completeTodoItem = completeTodoItem;
module.exports.cancelTodoItem = cancelTodoItem;
