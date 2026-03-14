const express = require('express');
const router = express.Router();
const { sql, getConnection, executeQuery } = require('../db');

// 获取所有对策内容（按分类分组）
router.get('/', async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query('SELECT * FROM QualityMeasures ORDER BY Category, ID');
        });

        // 整理数据结构，按 Category 分组
        const measures = result.recordset;
        const grouped = measures.reduce((acc, curr) => {
            if (!acc[curr.Category]) {
                acc[curr.Category] = [];
            }
            acc[curr.Category].push(curr);
            return acc;
        }, {});

        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        console.error('获取对策内容失败:', error);
        res.status(500).json({ success: false, message: '获取数据失败' });
    }
});

// 新增对策内容
router.post('/', async (req, res) => {
    const { Category, Content } = req.body;
    if (!Category || !Content) {
        return res.status(400).json({ success: false, message: '分类和内容不能为空' });
    }

    try {
        await executeQuery(async (pool) => {
            await pool.request()
                .input('Category', sql.NVarChar, Category)
                .input('Content', sql.NVarChar, Content)
                .query('INSERT INTO QualityMeasures (Category, Content) VALUES (@Category, @Content)');
        });

        res.json({ success: true, message: '添加成功' });
    } catch (error) {
        console.error('添加对策内容失败:', error);
        res.status(500).json({ success: false, message: '添加失败' });
    }
});

// 更新对策内容
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { Category, Content } = req.body;

    try {
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .input('Category', sql.NVarChar, Category)
                .input('Content', sql.NVarChar, Content)
                .query('UPDATE QualityMeasures SET Category = @Category, Content = @Content, UpdatedAt = GETDATE() WHERE ID = @ID');
        });

        res.json({ success: true, message: '更新成功' });
    } catch (error) {
        console.error('更新对策内容失败:', error);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 删除对策内容
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM QualityMeasures WHERE ID = @ID');
        });

        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除对策内容失败:', error);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

module.exports = router;