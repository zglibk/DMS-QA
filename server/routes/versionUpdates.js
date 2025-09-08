/**
 * 版本更新管理路由
 * 
 * 功能说明：
 * 1. 提供版本更新信息的增删改查API接口
 * 2. 支持版本更新内容的存储和管理
 * 3. 集成通知系统，支持版本更新通知推送
 * 4. 提供版本更新统计和查询功能
 * 
 * 作者：DMS-QA Team
 * 创建时间：2025-09-08
 */

const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取版本更新列表
 * GET /api/version-updates
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认10）
 * - status: 状态筛选（draft/published/archived）
 * - search: 搜索关键词
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, pageSize = 10, status, search } = req.query;
        const offset = (page - 1) * pageSize;
        
        let whereClause = 'WHERE vu.IsActive = 1';
        const params = [];
        let paramIndex = 1;
        
        // 状态筛选
        if (status) {
            whereClause += ` AND vu.Status = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: status });
            paramIndex++;
        }
        
        // 搜索功能
        if (search) {
            whereClause += ` AND (vu.Version LIKE @param${paramIndex} OR vu.Title LIKE @param${paramIndex + 1} OR vu.Description LIKE @param${paramIndex + 2})`;
            const searchPattern = `%${search}%`;
            params.push(
                { name: `param${paramIndex}`, type: 'NVarChar', value: searchPattern },
                { name: `param${paramIndex + 1}`, type: 'NVarChar', value: searchPattern },
                { name: `param${paramIndex + 2}`, type: 'NVarChar', value: searchPattern }
            );
            paramIndex += 3;
        }
        
        const connection = await getConnection();
        const request = connection.request();
        
        // 添加参数
        params.forEach(param => {
            request.input(param.name, request.types[param.type], param.value);
        });
        
        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM VersionUpdates vu
            ${whereClause}
        `;
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;
        
        // 查询数据
        const dataQuery = `
            SELECT 
                vu.ID,
                vu.Version,
                vu.Title,
                vu.Description,
                vu.ReleaseDate,
                vu.Status,
                vu.IsMajorUpdate,
                vu.TotalCommits,
                vu.FeaturesCount,
                vu.FixesCount,
                vu.ImprovementsCount,
                vu.OtherCount,
                vu.NotificationSent,
                vu.NotificationDate,
                vu.CreatedAt,
                u.Username as CreatedByName
            FROM VersionUpdates vu
            LEFT JOIN [User] u ON vu.CreatedBy = u.ID
            ${whereClause}
            ORDER BY vu.ReleaseDate DESC, vu.CreatedAt DESC
            OFFSET ${offset} ROWS
            FETCH NEXT ${pageSize} ROWS ONLY
        `;
        
        const dataResult = await request.query(dataQuery);
        
        res.json({
            success: true,
            data: dataResult.recordset,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
        
    } catch (error) {
        console.error('获取版本更新列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新列表失败',
            error: error.message
        });
    }
});

/**
 * 获取单个版本更新详情
 * GET /api/version-updates/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        const request = connection.request();
        
        // 查询版本更新基本信息
        const versionQuery = `
            SELECT 
                vu.*,
                u.Username as CreatedByName
            FROM VersionUpdates vu
            LEFT JOIN [User] u ON vu.CreatedBy = u.ID
            WHERE vu.ID = @id AND vu.IsActive = 1
        `;
        
        request.input('id', request.types.Int, id);
        const versionResult = await request.query(versionQuery);
        
        if (versionResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '版本更新信息不存在'
            });
        }
        
        const versionData = versionResult.recordset[0];
        
        // 查询版本更新详细项目
        const itemsQuery = `
            SELECT *
            FROM VersionUpdateItems
            WHERE VersionUpdateID = @id
            ORDER BY Category, SortOrder, ID
        `;
        
        const itemsResult = await request.query(itemsQuery);
        versionData.items = itemsResult.recordset;
        
        // 解析JSON字段
        if (versionData.ChangelogJson) {
            try {
                versionData.ChangelogData = JSON.parse(versionData.ChangelogJson);
            } catch (e) {
                console.warn('解析ChangelogJson失败:', e);
            }
        }
        
        if (versionData.Contributors) {
            try {
                versionData.ContributorsData = JSON.parse(versionData.Contributors);
            } catch (e) {
                console.warn('解析Contributors失败:', e);
            }
        }
        
        res.json({
            success: true,
            data: versionData
        });
        
    } catch (error) {
        console.error('获取版本更新详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新详情失败',
            error: error.message
        });
    }
});

/**
 * 创建版本更新记录
 * POST /api/version-updates
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            version,
            title,
            description,
            releaseDate,
            status = 'draft',
            isMajorUpdate = false,
            totalCommits = 0,
            featuresCount = 0,
            fixesCount = 0,
            improvementsCount = 0,
            otherCount = 0,
            changelogMarkdown,
            changelogJson,
            contributors,
            items = [],
            sendNotification = false
        } = req.body;
        
        const userId = req.user.id;
        const connection = await getConnection();
        const transaction = connection.transaction();
        
        try {
            await transaction.begin();
            const request = transaction.request();
            
            // 检查版本号是否已存在
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM VersionUpdates
                WHERE Version = @version AND IsActive = 1
            `;
            
            request.input('version', request.types.NVarChar, version);
            const checkResult = await request.query(checkQuery);
            
            if (checkResult.recordset[0].count > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: '该版本号已存在'
                });
            }
            
            // 插入版本更新记录
            const insertQuery = `
                INSERT INTO VersionUpdates (
                    Version, Title, Description, ReleaseDate, Status, IsMajorUpdate,
                    TotalCommits, FeaturesCount, FixesCount, ImprovementsCount, OtherCount,
                    ChangelogMarkdown, ChangelogJson, Contributors, CreatedBy
                )
                OUTPUT INSERTED.ID
                VALUES (
                    @version, @title, @description, @releaseDate, @status, @isMajorUpdate,
                    @totalCommits, @featuresCount, @fixesCount, @improvementsCount, @otherCount,
                    @changelogMarkdown, @changelogJson, @contributors, @userId
                )
            `;
            
            request.input('title', request.types.NVarChar, title);
            request.input('description', request.types.NVarChar, description || null);
            request.input('releaseDate', request.types.DateTime, new Date(releaseDate || Date.now()));
            request.input('status', request.types.NVarChar, status);
            request.input('isMajorUpdate', request.types.Bit, isMajorUpdate);
            request.input('totalCommits', request.types.Int, totalCommits);
            request.input('featuresCount', request.types.Int, featuresCount);
            request.input('fixesCount', request.types.Int, fixesCount);
            request.input('improvementsCount', request.types.Int, improvementsCount);
            request.input('otherCount', request.types.Int, otherCount);
            request.input('changelogMarkdown', request.types.NVarChar, changelogMarkdown || null);
            request.input('changelogJson', request.types.NVarChar, changelogJson || null);
            request.input('contributors', request.types.NVarChar, contributors || null);
            request.input('userId', request.types.Int, userId);
            
            const insertResult = await request.query(insertQuery);
            const versionUpdateId = insertResult.recordset[0].ID;
            
            // 插入版本更新详细项目
            if (items && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const itemRequest = transaction.request();
                    
                    const itemInsertQuery = `
                        INSERT INTO VersionUpdateItems (
                            VersionUpdateID, Category, Title, Description,
                            CommitHash, CommitShortHash, CommitAuthor, CommitDate, CommitEmail,
                            SortOrder, IsHighlight
                        )
                        VALUES (
                            @versionUpdateId, @category, @title, @description,
                            @commitHash, @commitShortHash, @commitAuthor, @commitDate, @commitEmail,
                            @sortOrder, @isHighlight
                        )
                    `;
                    
                    itemRequest.input('versionUpdateId', itemRequest.types.Int, versionUpdateId);
                    itemRequest.input('category', itemRequest.types.NVarChar, item.category || 'other');
                    itemRequest.input('title', itemRequest.types.NVarChar, item.title);
                    itemRequest.input('description', itemRequest.types.NVarChar, item.description || null);
                    itemRequest.input('commitHash', itemRequest.types.NVarChar, item.commitHash || null);
                    itemRequest.input('commitShortHash', itemRequest.types.NVarChar, item.commitShortHash || null);
                    itemRequest.input('commitAuthor', itemRequest.types.NVarChar, item.commitAuthor || null);
                    itemRequest.input('commitDate', itemRequest.types.DateTime, item.commitDate ? new Date(item.commitDate) : null);
                    itemRequest.input('commitEmail', itemRequest.types.NVarChar, item.commitEmail || null);
                    itemRequest.input('sortOrder', itemRequest.types.Int, item.sortOrder || i);
                    itemRequest.input('isHighlight', itemRequest.types.Bit, item.isHighlight || false);
                    
                    await itemRequest.query(itemInsertQuery);
                }
            }
            
            // 如果需要发送通知，创建系统通知
            let noticeId = null;
            if (sendNotification) {
                const noticeRequest = transaction.request();
                const noticeTitle = `系统更新通知 - v${version}`;
                const noticeContent = `
                    <h3>🎉 系统版本更新</h3>
                    <p><strong>版本号：</strong>v${version}</p>
                    <p><strong>发布时间：</strong>${new Date(releaseDate || Date.now()).toLocaleDateString()}</p>
                    ${description ? `<p><strong>更新说明：</strong>${description}</p>` : ''}
                    <hr>
                    <h4>📊 更新统计</h4>
                    <ul>
                        <li>🆕 新增功能：${featuresCount} 项</li>
                        <li>🐛 问题修复：${fixesCount} 项</li>
                        <li>⚡ 优化改进：${improvementsCount} 项</li>
                        <li>📦 其他更改：${otherCount} 项</li>
                        <li>📋 总计提交：${totalCommits} 个</li>
                    </ul>
                    <p>详细更新内容请查看系统更新日志。</p>
                `;
                
                const insertNoticeQuery = `
                    INSERT INTO Notices (
                        Title, Content, Type, Priority, CreatedBy, IsSticky, RequireConfirmation
                    )
                    OUTPUT INSERTED.ID
                    VALUES (
                        @title, @content, 'announcement', @priority, @userId, @isSticky, 0
                    )
                `;
                
                noticeRequest.input('title', noticeRequest.types.NVarChar, noticeTitle);
                noticeRequest.input('content', noticeRequest.types.NVarChar, noticeContent);
                noticeRequest.input('priority', noticeRequest.types.NVarChar, isMajorUpdate ? 'high' : 'normal');
                noticeRequest.input('userId', noticeRequest.types.Int, userId);
                noticeRequest.input('isSticky', noticeRequest.types.Bit, isMajorUpdate);
                
                const noticeResult = await noticeRequest.query(insertNoticeQuery);
                noticeId = noticeResult.recordset[0].ID;
                
                // 更新版本更新记录的通知状态
                const updateVersionRequest = transaction.request();
                const updateVersionQuery = `
                    UPDATE VersionUpdates
                    SET NotificationSent = 1, NotificationDate = GETDATE(), NoticeID = @noticeId
                    WHERE ID = @versionUpdateId
                `;
                
                updateVersionRequest.input('versionUpdateId', updateVersionRequest.types.Int, versionUpdateId);
                updateVersionRequest.input('noticeId', updateVersionRequest.types.Int, noticeId);
                
                await updateVersionRequest.query(updateVersionQuery);
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: sendNotification ? '版本更新记录创建成功，系统通知已发送' : '版本更新记录创建成功',
                data: { 
                    id: versionUpdateId, 
                    version,
                    noticeId: noticeId
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('创建版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 更新版本更新记录
 * PUT /api/version-updates/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const connection = await getConnection();
        const request = connection.request();
        
        // 构建更新字段
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        
        const allowedFields = [
            'Title', 'Description', 'ReleaseDate', 'Status', 'IsMajorUpdate',
            'TotalCommits', 'FeaturesCount', 'FixesCount', 'ImprovementsCount', 'OtherCount',
            'ChangelogMarkdown', 'ChangelogJson', 'Contributors'
        ];
        
        allowedFields.forEach(field => {
            const camelField = field.charAt(0).toLowerCase() + field.slice(1);
            if (updateData.hasOwnProperty(camelField)) {
                updateFields.push(`${field} = @param${paramIndex}`);
                let value = updateData[camelField];
                let type = 'NVarChar';
                
                // 根据字段类型设置正确的SQL类型
                if (field === 'ReleaseDate') {
                    value = new Date(value);
                    type = 'DateTime';
                } else if (field.includes('Count') || field === 'IsMajorUpdate') {
                    type = field === 'IsMajorUpdate' ? 'Bit' : 'Int';
                }
                
                params.push({ name: `param${paramIndex}`, type, value });
                paramIndex++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有有效的更新字段'
            });
        }
        
        // 添加更新时间
        updateFields.push('UpdatedAt = GETDATE()');
        
        // 添加参数
        params.forEach(param => {
            request.input(param.name, request.types[param.type], param.value);
        });
        request.input('id', request.types.Int, id);
        
        const updateQuery = `
            UPDATE VersionUpdates
            SET ${updateFields.join(', ')}
            WHERE ID = @id AND IsActive = 1
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '版本更新记录不存在'
            });
        }
        
        res.json({
            success: true,
            message: '版本更新记录更新成功'
        });
        
    } catch (error) {
        console.error('更新版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '更新版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 删除版本更新记录（软删除）
 * DELETE /api/version-updates/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        const request = connection.request();
        
        const deleteQuery = `
            UPDATE VersionUpdates
            SET IsActive = 0, UpdatedAt = GETDATE()
            WHERE ID = @id AND IsActive = 1
        `;
        
        request.input('id', request.types.Int, id);
        const result = await request.query(deleteQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '版本更新记录不存在'
            });
        }
        
        res.json({
            success: true,
            message: '版本更新记录删除成功'
        });
        
    } catch (error) {
        console.error('删除版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '删除版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 发送版本更新通知
 * POST /api/version-updates/:id/notify
 */
router.post('/:id/notify', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { customTitle, customContent } = req.body;
        const userId = req.user.id;
        
        const connection = await getConnection();
        const transaction = connection.transaction();
        
        try {
            await transaction.begin();
            
            // 获取版本更新信息
            const versionRequest = transaction.request();
            versionRequest.input('id', versionRequest.types.Int, id);
            
            const versionQuery = `
                SELECT *
                FROM VersionUpdates
                WHERE ID = @id AND IsActive = 1
            `;
            
            const versionResult = await versionRequest.query(versionQuery);
            
            if (versionResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: '版本更新记录不存在'
                });
            }
            
            const versionData = versionResult.recordset[0];
            
            // 创建通知记录
            const noticeRequest = transaction.request();
            const noticeTitle = customTitle || `系统更新通知 - v${versionData.Version}`;
            const noticeContent = customContent || `
                <h3>🎉 系统版本更新</h3>
                <p><strong>版本号：</strong>v${versionData.Version}</p>
                <p><strong>发布时间：</strong>${new Date(versionData.ReleaseDate).toLocaleDateString()}</p>
                ${versionData.Description ? `<p><strong>更新说明：</strong>${versionData.Description}</p>` : ''}
                <hr>
                <h4>📊 更新统计</h4>
                <ul>
                    <li>🆕 新增功能：${versionData.FeaturesCount} 项</li>
                    <li>🐛 问题修复：${versionData.FixesCount} 项</li>
                    <li>⚡ 优化改进：${versionData.ImprovementsCount} 项</li>
                    <li>📦 其他更改：${versionData.OtherCount} 项</li>
                    <li>📋 总计提交：${versionData.TotalCommits} 个</li>
                </ul>
                <p>详细更新内容请查看系统更新日志。</p>
            `;
            
            const insertNoticeQuery = `
                INSERT INTO Notices (
                    Title, Content, Type, Priority, CreatedBy, IsSticky, RequireConfirmation
                )
                OUTPUT INSERTED.ID
                VALUES (
                    @title, @content, 'announcement', @priority, @userId, @isSticky, 0
                )
            `;
            
            noticeRequest.input('title', noticeRequest.types.NVarChar, noticeTitle);
            noticeRequest.input('content', noticeRequest.types.NVarChar, noticeContent);
            noticeRequest.input('priority', noticeRequest.types.NVarChar, versionData.IsMajorUpdate ? 'high' : 'normal');
            noticeRequest.input('userId', noticeRequest.types.Int, userId);
            noticeRequest.input('isSticky', noticeRequest.types.Bit, versionData.IsMajorUpdate);
            
            const noticeResult = await noticeRequest.query(insertNoticeQuery);
            const noticeId = noticeResult.recordset[0].ID;
            
            // 更新版本更新记录的通知状态
            const updateVersionRequest = transaction.request();
            const updateVersionQuery = `
                UPDATE VersionUpdates
                SET NotificationSent = 1, NotificationDate = GETDATE(), NoticeID = @noticeId, UpdatedAt = GETDATE()
                WHERE ID = @id
            `;
            
            updateVersionRequest.input('id', updateVersionRequest.types.Int, id);
            updateVersionRequest.input('noticeId', updateVersionRequest.types.Int, noticeId);
            
            await updateVersionRequest.query(updateVersionQuery);
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: '版本更新通知发送成功',
                data: {
                    noticeId,
                    title: noticeTitle
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('发送版本更新通知失败:', error);
        res.status(500).json({
            success: false,
            message: '发送版本更新通知失败',
            error: error.message
        });
    }
});

/**
 * 获取版本更新统计信息
 * GET /api/version-updates/stats
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const request = connection.request();
        
        const statsQuery = `
            SELECT 
                COUNT(*) as totalVersions,
                SUM(CASE WHEN Status = 'published' THEN 1 ELSE 0 END) as publishedVersions,
                SUM(CASE WHEN Status = 'draft' THEN 1 ELSE 0 END) as draftVersions,
                SUM(CASE WHEN IsMajorUpdate = 1 THEN 1 ELSE 0 END) as majorUpdates,
                SUM(TotalCommits) as totalCommits,
                SUM(FeaturesCount) as totalFeatures,
                SUM(FixesCount) as totalFixes,
                SUM(ImprovementsCount) as totalImprovements,
                MAX(ReleaseDate) as latestReleaseDate,
                (
                    SELECT TOP 1 Version
                    FROM VersionUpdates
                    WHERE IsActive = 1 AND Status = 'published'
                    ORDER BY ReleaseDate DESC
                ) as latestVersion
            FROM VersionUpdates
            WHERE IsActive = 1
        `;
        
        const result = await request.query(statsQuery);
        
        res.json({
            success: true,
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('获取版本更新统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新统计失败',
            error: error.message
        });
    }
});

module.exports = router;