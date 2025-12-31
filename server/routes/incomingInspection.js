const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, executeQuery } = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// --- Helper for generating random data ---
function inferCategory(name) {
    if (!name) return '其他';
    name = name.toLowerCase();
    if (name.includes('纸')) return '纸张';
    if (name.includes('膜') || name.includes('bopp') || name.includes('pet')) return '膜类';
    if (name.includes('墨') || name.includes('胶') || name.includes('液') || name.includes('剂')) return '化学辅料';
    return '其他';
}

async function generateReportNumber(pool, category) {
    // Determine Type Code: Y for Paper, F for Others
    // Raw (Y): 纸张
    // Aux (F): 膜类, 化学辅料, 其他, etc.
    let typeCode = 'F'; 
    if (category === '纸张') {
        typeCode = 'Y';
    }

    const date = new Date();
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `TJ${typeCode}${yy}${mm}`;

    // Query DB for max ReportNo with this prefix
    const result = await pool.request()
        .input('Prefix', sql.NVarChar, `${prefix}%`)
        .query(`
            SELECT TOP 1 ReportNo 
            FROM IncomingInspectionReports 
            WHERE ReportNo LIKE @Prefix AND LEN(ReportNo) = 10
            ORDER BY ReportNo DESC
        `);
    
    let seq = 1;
    if (result.recordset.length > 0) {
        const lastNo = result.recordset[0].ReportNo;
        // Extract last 3 digits
        const lastSeq = parseInt(lastNo.slice(-3));
        if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
        }
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
}

function parseAcceptanceCriteria(criteria) {
    if (!criteria) return null;
    // Remove all whitespace to simplify regex
    // But keep spaces if they separate numbers? No, usually not needed for regex matching numbers
    // Let's normalize spaces
    const cleanStr = criteria.trim();

    // 1. Range: "2.2~3.0" or "2.2-3.0" or "2.2gf~3.0gf"
    // Regex: Number followed by optional unit, then ~ or -, then Number
    // Note: - can be minus sign, so we need to be careful. usually range is positive.
    const rangeRegex = /([\d\.]+)[^\d\.~-]*[~-][^\d\.]*([\d\.]+)/;
    const rangeMatch = cleanStr.match(rangeRegex);
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        if (!isNaN(min) && !isNaN(max)) {
            return { type: 'range', min, max };
        }
    }

    // 2. Tolerance: "10 ± 0.5" or "10±0.5"
    const toleranceRegex = /([\d\.]+)[^\d\.]*[±][^\d\.]*([\d\.]+)/;
    const toleranceMatch = cleanStr.match(toleranceRegex);
    if (toleranceMatch) {
        const base = parseFloat(toleranceMatch[1]);
        const tol = parseFloat(toleranceMatch[2]);
        if (!isNaN(base) && !isNaN(tol)) {
            return { type: 'range', min: base - tol, max: base + tol };
        }
    }

    // 3. Greater than: "≥ 8" or ">= 8" or "> 8"
    const gtRegex = /(?:≥|>=|>)\s*([\d\.]+)/;
    const gtMatch = cleanStr.match(gtRegex);
    if (gtMatch) {
        const val = parseFloat(gtMatch[1]);
        if (!isNaN(val)) {
            return { type: 'min', val };
        }
    }

    // 4. Less than: "≤ 10" or "<= 10" or "< 10"
    const ltRegex = /(?:≤|<=|<)\s*([\d\.]+)/;
    const ltMatch = cleanStr.match(ltRegex);
    if (ltMatch) {
        const val = parseFloat(ltMatch[1]);
        if (!isNaN(val)) {
            return { type: 'max', val };
        }
    }

    return null;
}

function generateMockValues(item, count = 5) {
    const name = (item.ItemName || '').trim();
    const standard = item.InspectionStandard || '';
    const criteria = item.AcceptanceCriteria || ''; // Use AcceptanceCriteria first
    const ruleStr = item.AutoGenerateRule;
    let values = [];

    console.log(`Generating mock values for: ${name}, Standard: ${standard}, Criteria: ${criteria}`);

    // Special logic for "持粘性" -> Always equals standard
    if (name.includes('持粘性') || name.includes('持粘力')) {
        const val = criteria || standard || '≥ 24h';
        for(let i=0; i<count; i++) values.push(val);
        console.log(`Matched '持粘性', generated: ${values}`);
        return values;
    }

    // Special logic for "初粘性" -> Integer with # suffix
    if (name.includes('初粘性') || name.includes('初粘力')) {
        // Extract number from criteria like "≥ 8#"
        // Try multiple regexes
        let minVal = 4; // Default
        
        const targetStr = criteria || standard;
        const match = targetStr.match(/(\d+)\s*#/);
        
        if (match) {
             minVal = parseInt(match[1]);
        } else {
             // Fallback: try find just a number if no # found (e.g. ">= 8")
             const numMatch = targetStr.match(/(\d+)/);
             if (numMatch) {
                 minVal = parseInt(numMatch[1]);
             }
        }
        
        console.log(`Matched '初粘性', extracted minVal: ${minVal} from '${targetStr}'`);

        for (let i = 0; i < count; i++) {
            // Generate integer >= minVal, up to max 12
            // e.g. if minVal is 8, range is [8, 12]. If minVal > 12, just use minVal.
            const maxVal = 12;
            let val;
            if (minVal >= maxVal) {
                val = minVal;
            } else {
                val = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
            }
            values.push(`${val}#`);
        }
        console.log(`Generated values: ${values}`);
        return values;
    }

    // 1. Try Parse Rule
    let rule = null;
    if (ruleStr) {
        try {
            rule = JSON.parse(ruleStr);
        } catch (e) {
            console.warn('Invalid AutoGenerateRule JSON', e);
        }
    }

    // 2. Apply Rule if Exists
    if (rule && rule.type) {
        if (rule.type === 'fixed') {
            for (let i = 0; i < count; i++) values.push(rule.value || 'OK');
            return values;
        } 
        else if (rule.type === 'enum') {
            const passRate = rule.passRate !== undefined ? rule.passRate : 100;
            for (let i = 0; i < count; i++) {
                // Determine OK/NG based on passRate
                const isOK = (Math.random() * 100) < passRate;
                values.push(isOK ? '合格' : '不合格');
            }
            return values;
        }
        else if (rule.type === 'random_range') {
            let base = parseFloat(rule.base);
            // If base is missing, try to parse from InspectionStandard (e.g. "0.05 +/- 0.01")
            if (isNaN(base)) {
                base = parseFloat(standard);
            }
            if (isNaN(base)) base = 0; // Fallback

            const minOffset = parseFloat(rule.minOffset) || 0;
            const maxOffset = parseFloat(rule.maxOffset) || 0;
            const precision = parseInt(rule.precision) || 2;

            for (let i = 0; i < count; i++) {
                const range = maxOffset - minOffset;
                const randomOffset = minOffset + (Math.random() * range);
                const val = base + randomOffset;
                values.push(val.toFixed(precision));
            }
            return values;
        }
    }

    // 3. Smart Inference from AcceptanceCriteria or InspectionStandard
    // This handles cases where AutoGenerateRule is not configured but criteria text exists
    const targetStr = criteria || standard;
    const parsed = parseAcceptanceCriteria(targetStr);
    
    if (parsed) {
        // Infer precision from string (e.g. if string has "3.0", use 1 decimal; "3.00" use 2)
        // Simple heuristic: find first number with decimal point
        const decimalMatch = targetStr.match(/\.(\d+)/);
        const precision = decimalMatch ? decimalMatch[1].length : (parsed.type === 'min' || parsed.type === 'max' ? 1 : 2);

        for (let i = 0; i < count; i++) {
            let val;
            if (parsed.type === 'range') {
                // Generate strictly within range (safety margin 10% from edges if range is wide enough?)
                // Just uniform distribution within range for now
                val = parsed.min + Math.random() * (parsed.max - parsed.min);
            } else if (parsed.type === 'min') {
                // Generate val >= min. e.g. [min, min * 1.2] or [min, min + 5]
                // If min is small (e.g. 0.5), range should be small. If large (e.g. 100), range larger.
                // Let's use +10% to +20% buffer to be safe and realistic
                const buffer = (parsed.val === 0 ? 1 : parsed.val) * 0.2; 
                val = parsed.val + (Math.random() * buffer); 
            } else if (parsed.type === 'max') {
                // Generate val <= max. e.g. [max * 0.8, max]
                // Avoid negative numbers unless max < 0
                const lowerBound = parsed.val > 0 ? parsed.val * 0.8 : parsed.val * 1.2;
                val = lowerBound + Math.random() * (parsed.val - lowerBound);
            }
            
            // Format
            values.push(val.toFixed(precision));
        }
        return values;
    }

    // 4. Fallback to Heuristics (Old Logic)
    // Simple heuristic for demo purposes
    // In a real system, InspectionItems should have UpperLimit/LowerLimit/TargetValue columns
    if (name.includes('厚度')) {
        // Assume standard like "0.05 +/- 0.01" or just "0.05"
        const base = parseFloat(standard) || 0.05; 
        for(let i=0; i<count; i++) {
            // Random variation +/- 10%
            const val = base + (Math.random() * base * 0.1 * (Math.random() > 0.5 ? 1 : -1));
            values.push(val.toFixed(3));
        }
    } else if (name.includes('宽') || name.includes('长')) {
        const base = parseFloat(standard) || 500;
        for(let i=0; i<count; i++) {
            const val = base + (Math.random() * 2 * (Math.random() > 0.5 ? 1 : -1));
            values.push(val.toFixed(1));
        }
    } else if (name.includes('量') || name.includes('重')) {
         const base = parseFloat(standard) || 10;
        for(let i=0; i<count; i++) {
            const val = base + (Math.random() * base * 0.05 * (Math.random() > 0.5 ? 1 : -1));
            values.push(val.toFixed(2));
        }
    } else {
        // Qualitative
        for(let i=0; i<count; i++) {
            values.push('OK');
        }
    }
    return values;
}

// --- Routes ---

// 自动生成检验数据
router.post('/generate-data', authenticateToken, async (req, res) => {
    const { category, sampleSize } = req.body;
    try {
        const result = await executeQuery(async (pool) => {
            // Get items for this category (or items with no category as fallback/global items)
            // If category is provided, prioritize it. 
            // Also include items where MaterialCategory is NULL or '通用'
            
            let query = `
                SELECT * FROM InspectionItems 
                WHERE Status = 1 
                AND (MaterialCategory = @Category OR MaterialCategory IS NULL OR MaterialCategory = '通用' OR MaterialCategory = '')
                ORDER BY SortOrder ASC
            `;
            
            return await pool.request()
                .input('Category', sql.NVarChar, category || '')
                .query(query);
        });

        const items = result.recordset;
        const generatedItems = items.map(item => {
            const sampleValues = generateMockValues(item, sampleSize || 5);
            
            // Determine judgment based on values
            // For now, if all are OK or within range (mock logic assumes generated are within range), then OK.
            const isAllOK = sampleValues.every(v => {
                // 如果值等于 "OK" 或 等于 "合格"，直接通过
                if (v === 'OK' || v === '合格') return true;

                // 如果值等于标准（对于持粘性等文本匹配场景）
                const criteria = item.AcceptanceCriteria || item.InspectionStandard || '';
                if (criteria && v === criteria) return true;

                // 特殊处理持粘性：如果都是 ">= 24h" 这种格式，尝试提取数字比较
                // 但如果生成的数据就是 ">= 24h" 且标准也是 ">= 24h"，上面的 v === criteria 已经通过了。
                // 这里处理的是：生成了具体时间（如 "25h"），标准是 ">= 24h" 的情况
                // 或者生成了 ">= 24h"，但标准写的是 "≥ 24h" (符号不同)
                if ((item.ItemName || '').includes('持粘性') || (item.ItemName || '').includes('持粘力')) {
                    // 尝试标准化比较
                    const vNumMatch = String(v).match(/(\d+)/);
                    const cNumMatch = String(criteria).match(/(\d+)/);
                    if (vNumMatch && cNumMatch) {
                        const vNum = parseFloat(vNumMatch[1]);
                        const cNum = parseFloat(cNumMatch[1]);
                        // 假设都是大于等于关系
                        if (vNum >= cNum) return true;
                    }
                }

                // 尝试解析为数字
                return !isNaN(parseFloat(v));
            });
            
            return {
                ItemID: item.ID,
                ItemName: item.ItemName,
                InspectionContent: item.Description, // Map Description to Content
                InspectionStandard: item.InspectionStandard,
                AcceptanceCriteria: item.AcceptanceCriteria,
                SampleValues: sampleValues,
                SingleItemJudgment: isAllOK ? '合格' : '不合格',
                ResultJudgment: isAllOK ? '合格' : '不合格',
                ItemRemark: '',
                Unit: item.Unit || '', // Get from item if available
                SubMethod: '',
                DataType: item.DataType, // Add DataType
                InspectionBasis: item.InspectionBasis || '', // Add InspectionBasis
            };
        });

        res.json({ success: true, data: generatedItems });

    } catch (error) {
        console.error('生成数据失败:', error);
        res.status(500).json({ success: false, message: '生成数据失败' });
    }
});

// 获取报告列表
const uploadDir = path.join(__dirname, '../uploads/inspection/incoming');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 处理文件名编码问题
    let originalName = file.originalname;
    try {
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {}
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    cb(null, `incoming-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- Routes ---
// 生成新的报告编号
router.get('/generate-report-no', authenticateToken, async (req, res) => {
    const { category } = req.query;
    try {
        const reportNo = await executeQuery(async (pool) => {
            return await generateReportNumber(pool, category);
        });
        res.json({ success: true, reportNo });
    } catch (error) {
        console.error('生成编号失败:', error);
        res.status(500).json({ success: false, message: '生成编号失败' });
    }
});

// 获取报告列表
router.get('/list', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 20, supplier, reportNo, startDate, endDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  try {
    const result = await executeQuery(async (pool) => {
        let whereClause = 'WHERE 1=1';
        const inputs = [];
        
        if (supplier) {
            whereClause += ` AND Supplier LIKE @Supplier`;
            inputs.push({ name: 'Supplier', type: sql.NVarChar, value: `%${supplier}%` });
        }
        if (reportNo) {
            whereClause += ` AND ReportNo LIKE @ReportNo`;
            inputs.push({ name: 'ReportNo', type: sql.NVarChar, value: `%${reportNo}%` });
        }
        if (startDate) {
            whereClause += ` AND InspectionDate >= @StartDate`;
            inputs.push({ name: 'StartDate', type: sql.Date, value: startDate });
        }
        if (endDate) {
             whereClause += ` AND InspectionDate <= @EndDate`;
             inputs.push({ name: 'EndDate', type: sql.Date, value: endDate });
        }

        const query = `
            SELECT * FROM (
                SELECT ROW_NUMBER() OVER (ORDER BY r.CreatedAt DESC) AS RowNum, 
                       r.ID, r.ReportNo, r.Supplier, r.ProductName, r.InspectionDate, r.ReportResult, r.Status, r.CreatedAt,
                       ISNULL(u.RealName, r.CreatedBy) as CreatorName, r.CreatedBy, u.DepartmentID as CreatorDepartmentID,
                       u.PositionID as CreatorPositionID, p.ParentID as CreatorParentPositionID
                FROM IncomingInspectionReports r
                LEFT JOIN [User] u ON r.CreatedBy = u.Username
                LEFT JOIN Positions p ON u.PositionID = p.ID
                ${whereClause.replace(/AND Supplier/g, 'AND r.Supplier').replace(/AND ReportNo/g, 'AND r.ReportNo').replace(/AND InspectionDate/g, 'AND r.InspectionDate')}
            ) AS RowConstrainedResult WHERE RowNum > @Offset AND RowNum <= (@Offset + @PageSize)
        `;
        
        const countQuery = `SELECT COUNT(*) AS Total FROM IncomingInspectionReports r ${whereClause.replace(/AND Supplier/g, 'AND r.Supplier').replace(/AND ReportNo/g, 'AND r.ReportNo').replace(/AND InspectionDate/g, 'AND r.InspectionDate')}`;

        const request = pool.request();
        inputs.forEach(i => request.input(i.name, i.type, i.value));
        request.input('Offset', sql.Int, offset);
        request.input('PageSize', sql.Int, parseInt(pageSize));
        
        const listResult = await request.query(query);
        const countResult = await request.query(countQuery);
        
        return {
            list: listResult.recordset,
            total: countResult.recordset[0].Total
        };
    });
    
    res.json({ success: true, data: result.list, total: result.total });
  } catch (error) {
      console.error('获取列表失败:', error);
      res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取报告详情
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await executeQuery(async (pool) => {
            const master = await pool.request()
                .input('ID', sql.Int, id)
                .query(`
                    SELECT r.*, 
                           u1.RealName as InspectorRealName,
                           u2.RealName as AuditorRealName
                    FROM IncomingInspectionReports r
                    LEFT JOIN [User] u1 ON r.Inspector = u1.Username
                    LEFT JOIN [User] u2 ON r.Auditor = u2.Username
                    WHERE r.ID = @ID
                `);
            
            if (master.recordset.length === 0) return null;
            
            const details = await pool.request()
                .input('ReportID', sql.Int, id)
                .query(`
                    SELECT d.*, i.MaterialCategory 
                    FROM IncomingInspectionDetails d
                    LEFT JOIN InspectionItems i ON d.ItemID = i.ID
                    WHERE d.ReportID = @ReportID
                `);
                
            return {
                ...master.recordset[0],
                details: details.recordset
            };
        });
        
        if (!result) {
            return res.status(404).json({ success: false, message: '报告不存在' });
        }
        
        // 解析 SampleValues JSON
        if (result.details) {
            result.details.forEach(d => {
                if (d.SampleValues) {
                    try {
                        d.SampleValues = JSON.parse(d.SampleValues);
                    } catch (e) {
                        d.SampleValues = [];
                    }
                }
            });
        }
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取详情失败:', error);
        res.status(500).json({ success: false, message: '获取详情失败' });
    }
});

// 创建报告
router.post('/', authenticateToken, upload.array('files'), async (req, res) => {
    console.log('Received create report request');
    try {
        const reportData = JSON.parse(req.body.data);
        console.log('Report Data:', JSON.stringify(reportData, null, 2));
        
        const files = req.files || [];
        console.log('Files:', files.length);
        
        // 处理上传的图片路径
        const imagePaths = files.map(f => `/files/inspection/incoming/${f.filename}`);
        // 如果已有图片（如从其他地方引用，虽然这里通常是新上传），这里只处理新上传的
        // 实际上 TestImages 应该存储所有图片路径字符串
        // 这里假设只处理新上传的，前端可能已经合并了？
        // 简单起见，TestImages 字段存储新上传的路径。如果需要支持"保留旧图片+新图片"，前端应在 reportData.TestImages 中传递旧图片，后端拼接。
        // 但这是 Create 接口，通常全是新的。
        
        const allImages = [...(reportData.TestImages ? reportData.TestImages.split(',') : []), ...imagePaths].filter(Boolean).join(',');

        await executeQuery(async (pool) => {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            
            try {
                // 1. Insert Master
                const masterRequest = new sql.Request(transaction);
                const masterResult = await masterRequest
                    .input('ReportNo', sql.NVarChar, reportData.ReportNo)
                    .input('Supplier', sql.NVarChar, reportData.Supplier)
                    .input('ProductName', sql.NVarChar, reportData.ProductName)
                    .input('Specification', sql.NVarChar, reportData.Specification)
                    .input('Quantity', sql.Decimal(18, 2), reportData.Quantity || 0)
                    .input('PackageCount', sql.Int, reportData.PackageCount || 0)
                    .input('ArrivalDate', sql.Date, reportData.ArrivalDate || null)
                    .input('SamplingQuantity', sql.Int, reportData.SamplingQuantity || 0)
                    .input('InspectionBasis', sql.NVarChar, reportData.InspectionBasis)
                    .input('PONumber', sql.NVarChar, reportData.PONumber)
                    .input('Type', sql.NVarChar, reportData.Type)
                    .input('TestImages', sql.NVarChar, allImages)
                    .input('ReportResult', sql.NVarChar, reportData.ReportResult)
                    .input('ReportRemark', sql.NVarChar, reportData.ReportRemark)
                    .input('Inspector', sql.NVarChar, reportData.Inspector)
                    .input('InspectionDate', sql.Date, reportData.InspectionDate || new Date())
                    .input('Auditor', sql.NVarChar, reportData.Auditor)
                    .input('AuditDate', sql.Date, reportData.AuditDate || null)
                    .input('Status', sql.NVarChar, reportData.Status || 'Saved')
                    .input('CreatedBy', sql.NVarChar, req.user.username)
                    .query(`
                        INSERT INTO IncomingInspectionReports (
                            ReportNo, Supplier, ProductName, Specification, Quantity, PackageCount, ArrivalDate, 
                            SamplingQuantity, InspectionBasis, PONumber, Type, TestImages, 
                            ReportResult, ReportRemark, Inspector, InspectionDate, Auditor, AuditDate, 
                            Status, CreatedBy, CreatedAt, UpdatedAt
                        ) VALUES (
                            @ReportNo, @Supplier, @ProductName, @Specification, @Quantity, @PackageCount, @ArrivalDate,
                            @SamplingQuantity, @InspectionBasis, @PONumber, @Type, @TestImages,
                            @ReportResult, @ReportRemark, @Inspector, @InspectionDate, @Auditor, @AuditDate,
                            @Status, @CreatedBy, GETDATE(), GETDATE()
                        );
                        SELECT SCOPE_IDENTITY() AS ID;
                    `);
                
                const reportId = masterResult.recordset[0].ID;
                
                // 2. Insert Details
                if (reportData.details && reportData.details.length > 0) {
                    for (const detail of reportData.details) {
                        const detailRequest = new sql.Request(transaction);
                        await detailRequest
                            .input('ReportID', sql.Int, reportId)
                            .input('ItemID', sql.Int, detail.ItemID)
                            .input('ItemName', sql.NVarChar, detail.ItemName)
                            .input('InspectionContent', sql.NVarChar, detail.InspectionContent)
                            .input('SingleItemJudgment', sql.NVarChar, detail.SingleItemJudgment)
                            .input('ResultJudgment', sql.NVarChar, detail.ResultJudgment)
                            .input('ItemRemark', sql.NVarChar, detail.ItemRemark)
                            .input('SampleValues', sql.NVarChar, JSON.stringify(detail.SampleValues || []))
                            .input('Unit', sql.NVarChar, detail.Unit)
                            .input('InspectionBasis', sql.NVarChar, detail.InspectionBasis) // Added
                            .input('SubMethod', sql.NVarChar, detail.SubMethod)
                            .input('InspectionStandard', sql.NVarChar, detail.InspectionStandard)
                            .input('AcceptanceCriteria', sql.NVarChar, detail.AcceptanceCriteria)
                            .query(`
                                INSERT INTO IncomingInspectionDetails (
                                    ReportID, ItemID, ItemName, InspectionContent, SingleItemJudgment,
                                    ResultJudgment, ItemRemark, SampleValues, Unit, InspectionBasis, SubMethod,
                                    InspectionStandard, AcceptanceCriteria
                                ) VALUES (
                                    @ReportID, @ItemID, @ItemName, @InspectionContent, @SingleItemJudgment,
                                    @ResultJudgment, @ItemRemark, @SampleValues, @Unit, @InspectionBasis, @SubMethod,
                                    @InspectionStandard, @AcceptanceCriteria
                                )
                            `);
                    }
                }
                
                await transaction.commit();
                console.log('Transaction committed successfully, Report ID:', reportId);
            } catch (err) {
                console.error('Transaction failed, rolling back:', err);
                await transaction.rollback();
                throw err;
            }
        });
        
        res.json({ success: true, message: '创建成功' });
    } catch (error) {
        console.error('创建失败:', error);
        res.status(500).json({ success: false, message: '创建失败: ' + error.message });
    }
});

// 更新报告 (简化：支持更新字段和追加图片，不删除旧图片除非前端处理)
router.put('/:id', authenticateToken, upload.array('files'), async (req, res) => {
    const { id } = req.params;
    try {
        const reportData = JSON.parse(req.body.data);
        const files = req.files || [];
        
        const newImagePaths = files.map(f => `/files/inspection/incoming/${f.filename}`);
        
        // 合并图片: 前端应传递 oldImages 列表或在 TestImages 中包含旧路径
        // 假设 reportData.TestImages 包含最终的路径列表（不包含新上传的）
        // 或者 reportData.TestImages 是旧的字符串，我们需要 append
        // 更好的方式：前端负责维护 TestImages 字符串（包含旧的），我们只需 append 新的。
        // 但是前端提交的是 FormData，data 字段是 JSON。
        // 假设 reportData.TestImages 是"保留下来的旧图片路径，逗号分隔"。
        
        const finalImages = [
            ...(reportData.TestImages ? reportData.TestImages.split(',') : []),
            ...newImagePaths
        ].filter(Boolean).join(',');

        await executeQuery(async (pool) => {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            
            try {
                // 1. Update Master
                const masterRequest = new sql.Request(transaction);
                await masterRequest
                    .input('ID', sql.Int, id)
                    .input('ReportNo', sql.NVarChar, reportData.ReportNo)
                    .input('Supplier', sql.NVarChar, reportData.Supplier)
                    .input('ProductName', sql.NVarChar, reportData.ProductName)
                    .input('Specification', sql.NVarChar, reportData.Specification)
                    .input('Quantity', sql.Decimal(18, 2), reportData.Quantity)
                    .input('PackageCount', sql.Int, reportData.PackageCount)
                    .input('ArrivalDate', sql.Date, reportData.ArrivalDate)
                    .input('SamplingQuantity', sql.Int, reportData.SamplingQuantity)
                    .input('InspectionBasis', sql.NVarChar, reportData.InspectionBasis)
                    .input('PONumber', sql.NVarChar, reportData.PONumber)
                    .input('Type', sql.NVarChar, reportData.Type)
                    .input('TestImages', sql.NVarChar, finalImages)
                    .input('ReportResult', sql.NVarChar, reportData.ReportResult)
                    .input('ReportRemark', sql.NVarChar, reportData.ReportRemark)
                    .input('Inspector', sql.NVarChar, reportData.Inspector)
                    .input('InspectionDate', sql.Date, reportData.InspectionDate)
                    .input('Auditor', sql.NVarChar, reportData.Auditor)
                    .input('AuditDate', sql.Date, reportData.AuditDate)
                    .input('Status', sql.NVarChar, reportData.Status)
                    .input('UpdatedBy', sql.NVarChar, req.user.username)
                    .query(`
                        UPDATE IncomingInspectionReports SET
                            ReportNo = @ReportNo, Supplier = @Supplier, ProductName = @ProductName,
                            Specification = @Specification, Quantity = @Quantity, PackageCount = @PackageCount, ArrivalDate = @ArrivalDate,
                            SamplingQuantity = @SamplingQuantity, InspectionBasis = @InspectionBasis,
                            PONumber = @PONumber, Type = @Type, TestImages = @TestImages,
                            ReportResult = @ReportResult, ReportRemark = @ReportRemark,
                            Inspector = @Inspector, InspectionDate = @InspectionDate,
                            Auditor = @Auditor, AuditDate = @AuditDate, Status = @Status,
                            UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                        WHERE ID = @ID
                    `);
                
                // 2. Update Details (Delete All and Re-insert is simplest for now)
                const deleteRequest = new sql.Request(transaction);
                await deleteRequest.input('ReportID', sql.Int, id).query('DELETE FROM IncomingInspectionDetails WHERE ReportID = @ReportID');
                
                if (reportData.details && reportData.details.length > 0) {
                    for (const detail of reportData.details) {
                        const detailRequest = new sql.Request(transaction);
                        await detailRequest
                            .input('ReportID', sql.Int, id)
                            .input('ItemID', sql.Int, detail.ItemID)
                            .input('ItemName', sql.NVarChar, detail.ItemName)
                            .input('InspectionContent', sql.NVarChar, detail.InspectionContent)
                            .input('SingleItemJudgment', sql.NVarChar, detail.SingleItemJudgment)
                            .input('ResultJudgment', sql.NVarChar, detail.ResultJudgment)
                            .input('ItemRemark', sql.NVarChar, detail.ItemRemark)
                            .input('SampleValues', sql.NVarChar, JSON.stringify(detail.SampleValues || []))
                            .input('Unit', sql.NVarChar, detail.Unit)
                            .input('InspectionBasis', sql.NVarChar, detail.InspectionBasis) // Added
                            .input('SubMethod', sql.NVarChar, detail.SubMethod)
                            .input('InspectionStandard', sql.NVarChar, detail.InspectionStandard)
                            .input('AcceptanceCriteria', sql.NVarChar, detail.AcceptanceCriteria)
                            .query(`
                                INSERT INTO IncomingInspectionDetails (
                                    ReportID, ItemID, ItemName, InspectionContent, SingleItemJudgment,
                                    ResultJudgment, ItemRemark, SampleValues, Unit, InspectionBasis, SubMethod,
                                    InspectionStandard, AcceptanceCriteria
                                ) VALUES (
                                    @ReportID, @ItemID, @ItemName, @InspectionContent, @SingleItemJudgment,
                                    @ResultJudgment, @ItemRemark, @SampleValues, @Unit, @InspectionBasis, @SubMethod,
                                    @InspectionStandard, @AcceptanceCriteria
                                )
                            `);
                    }
                }
                
                await transaction.commit();
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        });
        
        res.json({ success: true, message: '更新成功' });
    } catch (error) {
        console.error('更新失败:', error);
        res.status(500).json({ success: false, message: '更新失败: ' + error.message });
    }
});

// 删除报告
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`尝试删除来料检验报告 ID: ${id}, 用户: ${req.user.username}, 角色: ${req.user.roles}`);
    
    try {
        const result = await executeQuery(async (pool) => {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            
            try {
                // 1. Check Report Status and Creator
                const check = await new sql.Request(transaction)
                    .input('ID', sql.Int, id)
                    .query('SELECT * FROM IncomingInspectionReports WHERE ID = @ID');
                
                if (check.recordset.length === 0) {
                    throw new Error('报告不存在');
                }
                const report = check.recordset[0];
                const isCreator = report.CreatedBy === req.user.username;
                const isDraft = ['Saved', 'Rejected'].includes(report.Status);
                const isUserAdmin = isAdmin(req.user);

                // Permission Check
                if (!isCreator && !isUserAdmin) {
                    throw new Error('无权删除该报告');
                }

                // Status Check (Admin can bypass)
                if (!isDraft && !isUserAdmin) {
                    throw new Error('只能删除草稿或驳回状态的报告');
                }

                // 2. Delete Details first
                await new sql.Request(transaction)
                    .input('ReportID', sql.Int, id)
                    .query('DELETE FROM IncomingInspectionDetails WHERE ReportID = @ReportID');

                const deleteResult = await new sql.Request(transaction)
                    .input('ID', sql.Int, id)
                    .query('DELETE FROM IncomingInspectionReports WHERE ID = @ID');
                
                if (deleteResult.rowsAffected[0] === 0) {
                     throw new Error('删除失败：记录可能已被删除');
                }

                await transaction.commit();
                console.log('事务提交成功，准备记录日志...');

                // 记录删除操作日志
                try {
                    console.log('开始调用 logger.logDataOperation...');
                    await logger.logDataOperation(
                        req.user.id || 0,
                        (isUserAdmin && (!isDraft || !isCreator)) ? '管理员强制删除来料检验报告' : '删除来料检验报告',
                        'IncomingInspectionReport',
                        id,
                        'DELETE',
                        req,
                        { reportNo: report.ReportNo, status: report.Status, createdBy: report.CreatedBy }
                    );
                    console.log('logger.logDataOperation 调用完成');
                } catch (logErr) {
                    console.error('记录删除日志时发生错误:', logErr);
                }

                return { success: true };
            } catch (err) {
                console.error('事务执行出错:', err);
                try {
                    await transaction.rollback();
                } catch (rollbackErr) {
                    console.error('回滚事务失败:', rollbackErr);
                }
                throw err;
            }
        });

        if (!result) {
            throw new Error('数据库操作失败，请查看服务器日志');
        }

        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除接口最终失败:', error);
        
        let statusCode = 500;
        if (error.message.includes('报告不存在')) statusCode = 404;
        else if (error.message.includes('无权删除') || error.message.includes('只能删除')) statusCode = 403;
        else if (error.message.includes('记录可能已被删除')) statusCode = 410; // Gone

        res.status(statusCode).json({ success: false, message: error.message || '删除失败' });
    }
});

// 批量生成报告
router.post('/batch-generate', authenticateToken, async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: '请选择至少一条记录' });
    }

    let successCount = 0;
    let failCount = 0;

    try {
        await executeQuery(async (pool) => {
            // Pre-fetch all inspection items to avoid repeated queries
            const allInspectionItemsResult = await pool.request().query('SELECT * FROM InspectionItems WHERE Status = 1 ORDER BY SortOrder ASC');
            const allInspectionItems = allInspectionItemsResult.recordset;

            // Process each item
            for (const item of items) {
                const transaction = new sql.Transaction(pool);
                try {
                    await transaction.begin();

                    // 1. Prepare Data
                    // Determine category strictly
                    const category = item.Category || inferCategory(item.ProductName);
                    
                    // Generate Report No using new rule
                    // Note: Since we commit per item, this should pick up the sequence correctly
                    const reportNo = await generateReportNumber(pool, category);

                    // Filter relevant inspection items - STRICT match only
                    const relevantItems = allInspectionItems.filter(i => i.MaterialCategory === category);

                    // Determine Sample Size
                    // Logic: If PackageCount is available, use it (simplified AQL logic or default 5)
                    // Here we default to 5 for batch generation as user can't interactively input package count for each
                    // But if ERP gives PackageCount, we can use it.
                    let sampleSize = 5;
                    if (item.PackageCount > 0) {
                        // Very simplified logic: 
                        // 1-15: 3, 16-50: 5, 51-150: 8, ...
                        const n = item.PackageCount;
                        if (n <= 15) sampleSize = 3;
                        else if (n <= 50) sampleSize = 5;
                        else if (n <= 150) sampleSize = 8;
                        else sampleSize = 13; // Max for now
                    }

                    // Generate Details
                    const details = relevantItems.map(inspItem => {
                        const sampleValues = generateMockValues(inspItem, sampleSize);
                        const isAllOK = sampleValues.every(v => {
                             // 如果值等于 "OK" 或 等于 "合格"，直接通过
                             if (v === 'OK' || v === '合格') return true;

                             // 如果值等于标准（对于持粘性等文本匹配场景）
                             const criteria = inspItem.AcceptanceCriteria || inspItem.InspectionStandard || '';
                             if (criteria && v === criteria) return true;

                             // 特殊处理持粘性
                             if ((inspItem.ItemName || '').includes('持粘性') || (inspItem.ItemName || '').includes('持粘力')) {
                                 const vNumMatch = String(v).match(/(\d+)/);
                                 const cNumMatch = String(criteria).match(/(\d+)/);
                                 if (vNumMatch && cNumMatch) {
                                     const vNum = parseFloat(vNumMatch[1]);
                                     const cNum = parseFloat(cNumMatch[1]);
                                     if (vNum >= cNum) return true;
                                 }
                             }

                             // 尝试解析为数字
                             return !isNaN(parseFloat(v));
                        });
                        return {
                            ItemID: inspItem.ID,
                            ItemName: inspItem.ItemName,
                            InspectionContent: inspItem.Description,
                            SingleItemJudgment: isAllOK ? '合格' : '不合格',
                            ResultJudgment: isAllOK ? '合格' : '不合格',
                            ItemRemark: '',
                            SampleValues: JSON.stringify(sampleValues),
                            Unit: inspItem.Unit || '',
                            InspectionBasis: inspItem.InspectionBasis || '', // Added
                            SubMethod: '',
                            InspectionStandard: inspItem.InspectionStandard,
                            AcceptanceCriteria: inspItem.AcceptanceCriteria
                        };
                    });

                    // Determine overall result
                    const reportResult = details.every(d => d.SingleItemJudgment === '合格') ? '合格' : '不合格';

                    // 2. Insert Master
                    const masterRequest = new sql.Request(transaction);
                    const masterResult = await masterRequest
                        .input('ReportNo', sql.NVarChar, reportNo)
                        .input('Supplier', sql.NVarChar, item.Supplier)
                        .input('ProductName', sql.NVarChar, item.ProductName)
                        .input('Specification', sql.NVarChar, item.Specification)
                        .input('Quantity', sql.Decimal(18, 2), item.Quantity)
                        .input('PackageCount', sql.Int, item.PackageCount || 0)
                        .input('ArrivalDate', sql.Date, item.InboundDate || new Date())
                        .input('SamplingQuantity', sql.Int, sampleSize)
                        .input('InspectionBasis', sql.NVarChar, 'GB/T 2828.1')
                        .input('PONumber', sql.NVarChar, item.PONumber)
                        .input('Type', sql.NVarChar, '正常检验')
                        .input('TestImages', sql.NVarChar, '')
                        .input('ReportResult', sql.NVarChar, reportResult)
                        .input('ReportRemark', sql.NVarChar, '')
                        .input('Inspector', sql.NVarChar, req.user.username)
                        .input('InspectionDate', sql.Date, new Date())
                        .input('Auditor', sql.NVarChar, '') // Not audited yet
                        .input('AuditDate', sql.Date, null) // Not audited yet
                        .input('Status', sql.NVarChar, 'Saved') // Draft
                        .input('CreatedBy', sql.NVarChar, req.user.username)
                        .query(`
                            INSERT INTO IncomingInspectionReports (
                                ReportNo, Supplier, ProductName, Specification, Quantity, PackageCount, ArrivalDate, 
                                SamplingQuantity, InspectionBasis, PONumber, Type, TestImages, 
                                ReportResult, ReportRemark, Inspector, InspectionDate, Auditor, AuditDate, 
                                Status, CreatedBy, CreatedAt, UpdatedAt
                            ) VALUES (
                                @ReportNo, @Supplier, @ProductName, @Specification, @Quantity, @PackageCount, @ArrivalDate,
                                @SamplingQuantity, @InspectionBasis, @PONumber, @Type, @TestImages,
                                @ReportResult, @ReportRemark, @Inspector, @InspectionDate, @Auditor, @AuditDate,
                                @Status, @CreatedBy, GETDATE(), GETDATE()
                            );
                            SELECT SCOPE_IDENTITY() AS ID;
                        `);
                    
                    const reportId = masterResult.recordset[0].ID;

                    // 3. Insert Details
                    for (const detail of details) {
                        const detailRequest = new sql.Request(transaction);
                        await detailRequest
                            .input('ReportID', sql.Int, reportId)
                            .input('ItemID', sql.Int, detail.ItemID)
                            .input('ItemName', sql.NVarChar, detail.ItemName)
                            .input('InspectionContent', sql.NVarChar, detail.InspectionContent)
                            .input('SingleItemJudgment', sql.NVarChar, detail.SingleItemJudgment)
                            .input('ResultJudgment', sql.NVarChar, detail.ResultJudgment)
                            .input('ItemRemark', sql.NVarChar, detail.ItemRemark)
                            .input('SampleValues', sql.NVarChar, detail.SampleValues)
                            .input('Unit', sql.NVarChar, detail.Unit)
                            .input('InspectionBasis', sql.NVarChar, detail.InspectionBasis) // Added
                            .input('SubMethod', sql.NVarChar, detail.SubMethod)
                            .input('InspectionStandard', sql.NVarChar, detail.InspectionStandard)
                            .input('AcceptanceCriteria', sql.NVarChar, detail.AcceptanceCriteria)
                            .query(`
                                INSERT INTO IncomingInspectionDetails (
                                    ReportID, ItemID, ItemName, InspectionContent, SingleItemJudgment,
                                    ResultJudgment, ItemRemark, SampleValues, Unit, InspectionBasis, SubMethod,
                                    InspectionStandard, AcceptanceCriteria
                                ) VALUES (
                                    @ReportID, @ItemID, @ItemName, @InspectionContent, @SingleItemJudgment,
                                    @ResultJudgment, @ItemRemark, @SampleValues, @Unit, @InspectionBasis, @SubMethod,
                                    @InspectionStandard, @AcceptanceCriteria
                                )
                            `);
                    }

                    await transaction.commit();
                    successCount++;
                } catch (err) {
                    await transaction.rollback();
                    console.error('Single item processing failed:', err);
                    failCount++;
                }
            }
        });

        res.json({ success: true, message: `批量生成完成: 成功 ${successCount} 条, 失败 ${failCount} 条` });

    } catch (error) {
        console.error('批量生成失败:', error);
        res.status(500).json({ success: false, message: '批量生成失败' });
    }
});

// 撤回提交
router.post('/:id/withdraw', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await executeQuery(async (pool) => {
            const check = await pool.request()
                .input('ID', sql.Int, id)
                .query('SELECT Status, CreatedBy FROM IncomingInspectionReports WHERE ID = @ID');
            
            if (check.recordset.length === 0) {
                throw new Error('报告不存在');
            }
            const report = check.recordset[0];
            if (report.Status !== 'Submitted') {
                throw new Error('当前状态不可撤回');
            }
            if (report.CreatedBy !== req.user.username) {
                throw new Error('只能撤回自己创建的报告');
            }

            await pool.request()
                .input('ID', sql.Int, id)
                .query("UPDATE IncomingInspectionReports SET Status = 'Saved' WHERE ID = @ID");
        });
        res.json({ success: true, message: '撤回成功' });
    } catch (error) {
        console.error('撤回失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量删除报告
router.post('/batch-delete', authenticateToken, async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: '请选择至少一条记录' });
    }

    try {
        await executeQuery(async (pool) => {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // 1. Check permissions and status for all items
                // We fetch all items to be deleted
                // Since we can't pass array directly to IN clause easily in mssql without table type or dynamic SQL,
                // we will use dynamic SQL or just loop. Since batch size is usually small (pagesize 20-50), loop or dynamic SQL is fine.
                // Let's use dynamic SQL with parameters.
                
                // Construct parameters
                const request = new sql.Request(transaction);
                const params = [];
                ids.forEach((id, index) => {
                    request.input(`id${index}`, sql.Int, id);
                    params.push(`@id${index}`);
                });
                
                const query = `SELECT ID, Status, CreatedBy, ReportNo FROM IncomingInspectionReports WHERE ID IN (${params.join(',')})`;
                const result = await request.query(query);
                
                const reports = result.recordset;
                const validIds = [];
                const skippedReports = [];

                for (const report of reports) {
                    const isCreator = report.CreatedBy === req.user.username;
                    const isDraft = ['Saved', 'Rejected'].includes(report.Status);
                    const isUserAdmin = isAdmin(req.user);

                    // Permission logic: Same as single delete
                    const canDelete = isUserAdmin || (isCreator && isDraft);

                    if (canDelete) {
                        validIds.push(report.ID);
                    } else {
                        skippedReports.push(report.ReportNo);
                    }
                }

                if (validIds.length === 0) {
                    throw new Error('所选记录均无删除权限或状态不可删除');
                }

                // 2. Delete valid items
                // Delete details
                const deleteParams = [];
                const deleteRequest = new sql.Request(transaction);
                validIds.forEach((id, index) => {
                    deleteRequest.input(`delId${index}`, sql.Int, id);
                    deleteParams.push(`@delId${index}`);
                });
                const idList = deleteParams.join(',');

                await deleteRequest.query(`DELETE FROM IncomingInspectionDetails WHERE ReportID IN (${idList})`);
                await deleteRequest.query(`DELETE FROM IncomingInspectionReports WHERE ID IN (${idList})`);

                await transaction.commit();

                // Log operation (Simplified log for batch)
                try {
                     await logger.logDataOperation(
                        req.user.id || 0,
                        '批量删除来料检验报告',
                        'IncomingInspectionReport',
                        0, // 0 indicates batch or N/A
                        'BATCH_DELETE',
                        req,
                        { count: validIds.length, ids: validIds, skipped: skippedReports }
                    );
                } catch (e) {}

                let msg = `成功删除 ${validIds.length} 条记录`;
                if (skippedReports.length > 0) {
                    msg += `，跳过 ${skippedReports.length} 条（无权限或状态限制）`;
                }
                res.json({ success: true, message: msg });

            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        });
    } catch (error) {
        console.error('批量删除失败:', error);
        res.status(500).json({ success: false, message: error.message || '批量删除失败' });
    }
});

module.exports = router;
