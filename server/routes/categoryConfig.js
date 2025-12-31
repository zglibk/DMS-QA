const express = require('express');
const router = express.Router();
const { sql, executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all mappings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query('SELECT * FROM MaterialCategoryMappings ORDER BY ReportCategory, ERPSubCategory');
        });
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Fetch mappings failed:', error);
        res.status(500).json({ success: false, message: 'Fetch failed' });
    }
});

// Add mapping
router.post('/', authenticateToken, async (req, res) => {
    const { ReportCategory, ERPSubCategory } = req.body;
    if (!ReportCategory || !ERPSubCategory) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    try {
        await executeQuery(async (pool) => {
            // Check for duplicate
            const check = await pool.request()
                .input('ReportCategory', sql.NVarChar, ReportCategory)
                .input('ERPSubCategory', sql.NVarChar, ERPSubCategory)
                .query('SELECT COUNT(*) as count FROM MaterialCategoryMappings WHERE ReportCategory = @ReportCategory AND ERPSubCategory = @ERPSubCategory');
            
            if (check.recordset[0].count > 0) {
                throw new Error('Mapping already exists');
            }

            await pool.request()
                .input('ReportCategory', sql.NVarChar, ReportCategory)
                .input('ERPSubCategory', sql.NVarChar, ERPSubCategory)
                .input('CreatedBy', sql.NVarChar, req.user.username)
                .query('INSERT INTO MaterialCategoryMappings (ReportCategory, ERPSubCategory, CreatedBy) VALUES (@ReportCategory, @ERPSubCategory, @CreatedBy)');
        });
        res.json({ success: true, message: 'Added successfully' });
    } catch (error) {
        console.error('Add mapping failed:', error);
        res.status(500).json({ success: false, message: error.message || 'Add failed' });
    }
});

// Delete mapping
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM MaterialCategoryMappings WHERE ID = @ID');
        });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete mapping failed:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// Update mapping
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { ReportCategory, ERPSubCategory } = req.body;
    try {
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .input('ReportCategory', sql.NVarChar, ReportCategory)
                .input('ERPSubCategory', sql.NVarChar, ERPSubCategory)
                .query('UPDATE MaterialCategoryMappings SET ReportCategory = @ReportCategory, ERPSubCategory = @ERPSubCategory WHERE ID = @ID');
        });
        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Update mapping failed:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

module.exports = router;
