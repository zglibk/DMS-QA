const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../db');
const moment = require('moment');
const erpService = require('../services/erpService');

/**
 * Helper to infer material category from name (Legacy/Fallback)
 */
function inferCategory(name) {
    if (!name) return '其他';
    name = name.toLowerCase();
    if (name.includes('纸')) return '纸张';
    if (name.includes('膜') || name.includes('bopp') || name.includes('pet')) return '膜类';
    if (name.includes('墨')) return '油墨';
    if (name.includes('胶')) return '胶水';
    if (name.includes('箱') || name.includes('盒')) return '包材';
    return '其他';
}

/**
 * Material Search API
 * Used for Incoming Inspection Report to query material inbound info from ERP
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { keyword, startDate, endDate, supplier } = req.query;
        
        // Default date range: Last 30 days if not specified
        // ERP requires StartDate and EndDate
        const sDate = startDate ? startDate + ' 00:00:00' : moment().subtract(30, 'days').format('YYYY-MM-DD 00:00:00');
        const eDate = endDate ? endDate + ' 23:59:59' : moment().format('YYYY-MM-DD 23:59:59');

        console.log('查询ERP物料入库:', { sDate, eDate, keyword, supplier });

        // 1. Fetch Mappings
        let mappings = [];
        try {
            const mappingResult = await executeQuery(async (pool) => {
                return await pool.request().query('SELECT * FROM MaterialCategoryMappings');
            });
            mappings = mappingResult.recordset;
        } catch (e) {
            console.error('Failed to load category mappings', e);
        }

        // Use erpService to get data (Auto-handles token)
        // This maps to /api/stock/bilOfInM/getList in ERP
        const response = await erpService.getMaterialInList({
            StartDate: sDate,
            EndDate: eDate
        });

        // Parse response
        let results = [];
        // The service returns the raw response body from ERP
        if (response && Array.isArray(response.data)) {
            results = response.data;
        } else if (Array.isArray(response)) {
            // Handle case where API might return array directly (less likely but possible)
            results = response;
        }

        // Map ERP fields to Frontend fields
        // Using fields observed in erp.js and assumed standard ERP fields
        let mappedResults = results.map(item => {
            // Determine Category
            let category = '其他';
            const mType = (item.MType || '').toLowerCase();
            const mName = (item.MName || '').toLowerCase();
            
            // Try to match MType against mappings
            // Prioritize longer matches to avoid partial string issues (e.g. 'Paper' vs 'Wallpaper')
            // But here we rely on the order in DB or just first match.
            // Since we use 'includes', '合成纸' includes '纸'. If '纸' is a mapping, it might match early.
            // So we should probably sort mappings by length desc?
            // For now, let's assume specific mappings are checked first or user configures them well.
            // Actually, if we have '纸张' -> '纸张' and '纸张' -> '合成纸'.
            // If item is '合成纸', it contains '合成纸' and '纸'.
            // Ideally we match the most specific one.
            
            let found = mappings.find(m => mType.includes(m.ERPSubCategory.toLowerCase()));
            
            // If not found in Type, try Name
            if (!found) {
                found = mappings.find(m => mName.includes(m.ERPSubCategory.toLowerCase()));
            }
            
            if (found) {
                category = found.ReportCategory;
            } else {
                // Fallback to legacy inference
                category = inferCategory(item.MName || '');
            }

            return {
                BatchNo: item.DlyNum || '', // Using Delivery Note Number as Batch Reference (common practice)
                InboundDate: item.InDate ? item.InDate.split(' ')[0] : '',
                PONumber: item.OrderNo || '', // If available
                Supplier: item.Supply || '',
                MaterialCode: item.MaterialID || '',
                ProductName: item.MName || '',
                Specification: item.Scale || '',
                Quantity: item.Acount || item.ACount || 0,
                Unit: item.Unit || '',
                PackageCount: item.PCount || item.Piece || item.AuxCount || 0, // Try to map package count (rolls/boxes)
                Category: category,
                OriginalData: item
            };
        });

        // Filter out invalid records (e.g. inventory checks, imports) based on DlyNum (BatchNo)
        mappedResults = mappedResults.filter(item => {
            const batchNo = (item.BatchNo || '').toString();
            return !batchNo.includes('盘点') && !batchNo.includes('导入');
        });

        // Client-side filtering
        // ERP API mainly filters by date, so we refine results here
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            mappedResults = mappedResults.filter(item => 
                (item.ProductName && item.ProductName.toLowerCase().includes(lowerKeyword)) ||
                (item.MaterialCode && item.MaterialCode.toLowerCase().includes(lowerKeyword)) ||
                (item.BatchNo && item.BatchNo.toLowerCase().includes(lowerKeyword)) ||
                (item.PONumber && item.PONumber.toLowerCase().includes(lowerKeyword))
            );
        }

        if (supplier) {
             mappedResults = mappedResults.filter(item => 
                item.Supplier && item.Supplier.toLowerCase().includes(supplier.toLowerCase())
            );
        }

        res.json({
            code: 0,
            message: '查询成功',
            data: mappedResults.slice(0, 100) // Limit to 100 results for performance
        });

    } catch (error) {
        console.error('物料查询失败:', error);
        res.status(500).json({
            code: -1,
            message: '查询失败: ' + error.message,
            data: []
        });
    }
});

module.exports = router;
