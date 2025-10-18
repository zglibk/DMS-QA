const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * 保存二维码扫描结果到数据库
 * 支持完整的订单信息字段：客户编码、CPO、订单号、工单号、物料编码、物料名称、工厂订单号、订单数
 * POST /api/qr-scan/save
 */
router.post('/save', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { 
      rawData, 
      scanTime, 
      customerCode,
      cpo,
      orderNumber,
      workOrderNumber,
      factoryOrderNumber,
      materialNames,
      materialCodes,
      orderQuantities,
      totalQuantity,
      materialCount,
      materials,
      isValid,
      parseError,
      parsedAt,
      // 入库确认相关字段
      warehouseQuantity,
      warehouseStatus,
      warehouseConfirmedAt,
      warehouseConfirmedBy,
      warehouseRemark
    } = req.body;
    
    const userId = req.user.id;
    
    // 验证必填字段
    if (!rawData) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段：rawData'
      });
    }
    
    // 验证物料数据
    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '物料数据不能为空'
      });
    }
    
    // 开始事务
    await connection.beginTransaction();
    
    // 插入主扫描记录，包含所有新字段和入库确认字段
    const scanResult = await connection.execute(
      `INSERT INTO QrScanRecords (
        UserID, 
        RawData, 
        CustomerCode,
        CPO,
        OrderNumber,
        WorkOrderNumber,
        FactoryOrderNumber,
        MaterialNames, 
        MaterialCodes,
        OrderQuantities, 
        TotalQuantity,
        MaterialCount,
        IsValid,
        ParseError,
        ParsedAt,
        ScanTime,
        WarehouseQuantity,
        WarehouseStatus,
        WarehouseConfirmedAt,
        WarehouseConfirmedBy,
        WarehouseRemark,
        CreatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())`,
      [
        userId,
        rawData,
        customerCode || null,
        cpo || null,
        orderNumber || null,
        workOrderNumber || null,
        factoryOrderNumber || null,
        materialNames || null,
        materialCodes || null,
        orderQuantities || null,
        totalQuantity || 0,
        materialCount || 0,
        isValid || false,
        parseError || null,
        parsedAt || new Date().toISOString(),
        scanTime || new Date().toISOString(),
        warehouseQuantity || null,
        warehouseStatus || 'pending',
        warehouseConfirmedAt || null,
        warehouseConfirmedBy || null,
        warehouseRemark || null
      ]
    );
    
    const scanRecordId = scanResult[0].insertId;
    
    // 插入物料明细记录，包含物料编码和实际数量信息
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      
      if (!material.name || material.quantity === undefined) {
        throw new Error('物料数据格式不正确：缺少name或quantity字段');
      }
      
      // 计算实际数量和差异（如果有入库数量）
      let actualQuantity = null;
      let quantityDifference = null;
      let differenceReason = null;
      
      if (warehouseQuantity !== null && warehouseQuantity !== undefined) {
        // 按比例分配实际数量到各个物料
        const materialRatio = material.quantity / (totalQuantity || 1);
        actualQuantity = Math.round(warehouseQuantity * materialRatio);
        quantityDifference = actualQuantity - material.quantity;
        
        // 如果有差异且提供了差异原因，则使用
        if (quantityDifference !== 0 && warehouseRemark) {
          differenceReason = warehouseRemark;
        }
      }
      
      await connection.execute(
        `INSERT INTO QrScanMaterials (
          ScanRecordID, 
          MaterialName,
          MaterialCode,
          Quantity,
          ActualQuantity,
          QuantityDifference,
          DifferenceReason,
          SortOrder,
          CreatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())`,
        [
          scanRecordId, 
          material.name, 
          material.code || null,
          material.quantity,
          actualQuantity,
          quantityDifference,
          differenceReason,
          i + 1
        ]
      );
    }
    
    // 提交事务
    await connection.commit();
    
    console.log(`二维码扫描数据保存成功 - 用户ID: ${userId}, 记录ID: ${scanRecordId}, 物料数量: ${materials.length}`);
    console.log(`订单信息 - 客户编码: ${customerCode}, CPO: ${cpo}, 订单号: ${orderNumber}, 工单号: ${workOrderNumber}`);
    console.log(`入库确认 - 入库数量: ${warehouseQuantity}, 状态: ${warehouseStatus}, 确认人: ${warehouseConfirmedBy}`);
    
    res.json({
      code: 200,
      message: warehouseQuantity !== null ? '入库确认数据保存成功' : '订单扫描数据保存成功',
      data: {
        scanRecordId: scanRecordId,
        customerCode: customerCode,
        orderNumber: orderNumber,
        materialCount: materials.length,
        totalQuantity: totalQuantity || 0,
        warehouseQuantity: warehouseQuantity,
        warehouseStatus: warehouseStatus || 'pending',
        warehouseConfirmedBy: warehouseConfirmedBy,
        isValid: isValid
      }
    });
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    console.error('保存二维码扫描数据失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '保存扫描数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * 获取扫描历史记录
 * GET /api/qr-scan/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    // 构建查询条件
    let whereClause = 'WHERE r.user_id = ?';
    let queryParams = [userId];
    
    if (startDate) {
      whereClause += ' AND r.scan_time >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND r.scan_time <= ?';
      queryParams.push(endDate);
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询扫描记录总数
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM qr_scan_records r ${whereClause}`,
      queryParams
    );
    
    const total = countResult[0].total;
    
    // 查询扫描记录列表
    const [records] = await connection.execute(
      `SELECT 
        r.id,
        r.raw_data,
        r.material_names,
        r.order_quantities,
        r.total_quantity,
        r.scan_time,
        r.created_at,
        u.username as scanner_name
      FROM qr_scan_records r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.scan_time DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // 为每条记录查询物料明细
    for (let record of records) {
      const [materials] = await connection.execute(
        `SELECT material_name, quantity 
         FROM qr_scan_materials 
         WHERE scan_record_id = ? 
         ORDER BY id`,
        [record.id]
      );
      
      record.materials = materials;
      
      // 构建解析数据对象
      record.parsedData = {
        materialNames: record.material_names,
        orderQuantities: record.order_quantities,
        totalQuantity: record.total_quantity,
        materials: materials.map(m => ({
          name: m.material_name,
          quantity: m.quantity
        }))
      };
    }
    
    res.json({
      code: 200,
      message: '获取扫描历史成功',
      data: {
        records: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取扫描历史失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '获取扫描历史失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * 获取扫描统计数据
 * GET /api/qr-scan/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const userId = req.user.id;
    const { period = 'today' } = req.query; // today, week, month, year
    
    let dateCondition = '';
    let dateParams = [userId];
    
    switch (period) {
      case 'today':
        dateCondition = 'AND DATE(r.scan_time) = CURDATE()';
        break;
      case 'week':
        dateCondition = 'AND r.scan_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateCondition = 'AND r.scan_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case 'year':
        dateCondition = 'AND r.scan_time >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
    }
    
    // 查询扫描统计
    const [statsResult] = await connection.execute(
      `SELECT 
        COUNT(*) as scan_count,
        SUM(r.total_quantity) as total_materials,
        COUNT(DISTINCT DATE(r.scan_time)) as scan_days
      FROM qr_scan_records r
      WHERE r.user_id = ? ${dateCondition}`,
      dateParams
    );
    
    // 查询物料类型统计
    const [materialStats] = await connection.execute(
      `SELECT 
        m.material_name,
        COUNT(*) as scan_count,
        SUM(m.quantity) as total_quantity
      FROM qr_scan_records r
      JOIN qr_scan_materials m ON r.id = m.scan_record_id
      WHERE r.user_id = ? ${dateCondition}
      GROUP BY m.material_name
      ORDER BY total_quantity DESC
      LIMIT 10`,
      dateParams
    );
    
    // 查询每日扫描趋势（最近7天）
    const [dailyTrend] = await connection.execute(
      `SELECT 
        DATE(r.scan_time) as scan_date,
        COUNT(*) as scan_count,
        SUM(r.total_quantity) as total_quantity
      FROM qr_scan_records r
      WHERE r.user_id = ? 
        AND r.scan_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(r.scan_time)
      ORDER BY scan_date DESC`,
      [userId]
    );
    
    const stats = statsResult[0];
    
    res.json({
      code: 200,
      message: '获取统计数据成功',
      data: {
        summary: {
          scanCount: stats.scan_count || 0,
          totalMaterials: stats.total_materials || 0,
          scanDays: stats.scan_days || 0,
          avgMaterialsPerScan: stats.scan_count > 0 ? 
            Math.round((stats.total_materials || 0) / stats.scan_count * 100) / 100 : 0
        },
        materialStats: materialStats,
        dailyTrend: dailyTrend,
        period: period
      }
    });
    
  } catch (error) {
    console.error('获取扫描统计失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '获取扫描统计失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * 删除扫描记录
 * DELETE /api/qr-scan/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 验证记录是否存在且属于当前用户
    const [existingRecord] = await connection.execute(
      'SELECT id FROM qr_scan_records WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existingRecord.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '扫描记录不存在或无权限删除'
      });
    }
    
    // 开始事务
    await connection.beginTransaction();
    
    // 删除物料明细
    await connection.execute(
      'DELETE FROM qr_scan_materials WHERE scan_record_id = ?',
      [id]
    );
    
    // 删除主记录
    await connection.execute(
      'DELETE FROM qr_scan_records WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    // 提交事务
    await connection.commit();
    
    console.log(`扫描记录删除成功 - 用户ID: ${userId}, 记录ID: ${id}`);
    
    res.json({
      code: 200,
      message: '扫描记录删除成功'
    });
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    console.error('删除扫描记录失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '删除扫描记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * 批量删除扫描记录
 * POST /api/qr-scan/batch-delete
 */
router.post('/batch-delete', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { ids } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供要删除的记录ID列表'
      });
    }
    
    // 验证所有记录都属于当前用户
    const placeholders = ids.map(() => '?').join(',');
    const [existingRecords] = await connection.execute(
      `SELECT id FROM qr_scan_records WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );
    
    if (existingRecords.length !== ids.length) {
      return res.status(403).json({
        code: 403,
        message: '部分记录不存在或无权限删除'
      });
    }
    
    // 开始事务
    await connection.beginTransaction();
    
    // 删除物料明细
    await connection.execute(
      `DELETE FROM qr_scan_materials WHERE scan_record_id IN (${placeholders})`,
      ids
    );
    
    // 删除主记录
    await connection.execute(
      `DELETE FROM qr_scan_records WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );
    
    // 提交事务
    await connection.commit();
    
    console.log(`批量删除扫描记录成功 - 用户ID: ${userId}, 删除数量: ${ids.length}`);
    
    res.json({
      code: 200,
      message: `成功删除 ${ids.length} 条扫描记录`
    });
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    
    console.error('批量删除扫描记录失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '批量删除扫描记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * 导出扫描记录
 * GET /api/qr-scan/export
 */
router.get('/export', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const userId = req.user.id;
    const { format = 'json', startDate, endDate } = req.query;
    
    // 构建查询条件
    let whereClause = 'WHERE r.user_id = ?';
    let queryParams = [userId];
    
    if (startDate) {
      whereClause += ' AND r.scan_time >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND r.scan_time <= ?';
      queryParams.push(endDate);
    }
    
    // 查询扫描记录
    const [records] = await connection.execute(
      `SELECT 
        r.id,
        r.raw_data,
        r.material_names,
        r.order_quantities,
        r.total_quantity,
        r.scan_time,
        r.created_at
      FROM qr_scan_records r
      ${whereClause}
      ORDER BY r.scan_time DESC`,
      queryParams
    );
    
    // 为每条记录查询物料明细
    for (let record of records) {
      const [materials] = await connection.execute(
        `SELECT material_name, quantity 
         FROM qr_scan_materials 
         WHERE scan_record_id = ? 
         ORDER BY id`,
        [record.id]
      );
      
      record.materials = materials;
    }
    
    if (format === 'csv') {
      // 生成CSV格式
      let csvContent = '扫描时间,原始数据,物料名称,订单数量,总数量,物料明细\n';
      
      records.forEach(record => {
        const materialsDetail = record.materials
          .map(m => `${m.material_name}:${m.quantity}`)
          .join(';');
        
        csvContent += `"${record.scan_time}","${record.raw_data}","${record.material_names}","${record.order_quantities}","${record.total_quantity}","${materialsDetail}"\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="qr_scan_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent); // 添加BOM以支持中文
      
    } else {
      // 默认JSON格式
      res.json({
        code: 200,
        message: '导出数据成功',
        data: {
          records: records,
          exportTime: new Date().toISOString(),
          totalCount: records.length
        }
      });
    }
    
  } catch (error) {
    console.error('导出扫描数据失败:', error);
    
    res.status(500).json({
      code: 500,
      message: '导出扫描数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

module.exports = router;