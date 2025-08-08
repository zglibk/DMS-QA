/*
 * 样品管理模块路由
 * 
 * 功能说明：
 * 1. 样板承认书的增删改查操作
 * 2. 样板状态管理
 * 3. 样板到期日期管理
 * 4. 样板统计数据查询
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * 生成样版编号流水号
 * 规则：检查当前年份、月份的最大编号，顺序编号001、002、003...每月初从001开始
 * 使用最大编号+1的方式避免并发冲突
 */
async function generateCertificateNo() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `SP${year.toString().slice(-2)}${month}`;
    
    // 查询当前年月的最大编号
    const query = `
      SELECT MAX(CertificateNo) as maxNo
      FROM SampleApproval 
      WHERE CertificateNo LIKE @yearMonth + '%'
    `;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('yearMonth', sql.NVarChar, yearMonth);
      return await request.query(query);
    });
    
    let sequence = 1;
    if (result && result.recordset && result.recordset.length > 0 && result.recordset[0].maxNo) {
      const maxNo = result.recordset[0].maxNo;
      // 提取最后3位数字并加1
      const lastSequence = parseInt(maxNo.slice(-3));
      sequence = lastSequence + 1;
    }
    
    // 生成流水号：格式化为3位数字
    const sequenceStr = sequence.toString().padStart(3, '0');
    
    // 返回格式：SP + 年份后两位 + 月份 + 流水号
    return `${yearMonth}${sequenceStr}`;
  } catch (error) {
    console.error('生成样版编号失败:', error);
    throw error;
  }
}

/**
 * 获取下一个样版编号预览
 * GET /api/sample/next-certificate-no
 */
router.get('/next-certificate-no', authenticateToken, async (req, res) => {
  try {
    const nextCertificateNo = await generateCertificateNo();
    res.json({
      code: 200,
      data: {
        certificateNo: nextCertificateNo
      }
    });
  } catch (error) {
    console.error('获取下一个样版编号失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取样版编号失败',
      error: error.message
    });
  }
});

/**
 * 获取样板承认书列表
 * GET /api/sample/list
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      workOrderNo, 
      productNo, 
      sampleStatus,
      createDateStart, 
      createDateEnd 
    } = req.query;

    let whereConditions = [];
    let parameters = {};

    // 构建查询条件
    if (workOrderNo) {
      whereConditions.push('WorkOrderNo LIKE @workOrderNo');
      parameters.workOrderNo = `%${workOrderNo}%`;
    }
    if (productNo) {
      whereConditions.push('ProductNo LIKE @productNo');
      parameters.productNo = `%${productNo}%`;
    }

    if (sampleStatus) {
      whereConditions.push('SampleStatus = @sampleStatus');
      parameters.sampleStatus = sampleStatus;
    }
    if (createDateStart) {
      whereConditions.push('CreateDate >= @createDateStart');
      parameters.createDateStart = createDateStart;
    }
    if (createDateEnd) {
      whereConditions.push('CreateDate <= @createDateEnd');
      parameters.createDateEnd = createDateEnd;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM SampleApproval ${whereClause}`;
    const countResult = await executeQuery(async (pool) => {
      const request = pool.request();
      Object.keys(parameters).forEach(key => {
        request.input(key, sql.NVarChar, parameters[key]);
      });
      return await request.query(countQuery);
    });
    if (!countResult || !countResult.recordset || countResult.recordset.length === 0) {
      return res.status(500).json({
        code: 500,
        message: '获取样板承认书总数失败'
      });
    }
    const total = countResult.recordset[0].total;

    // 查询数据 - 使用ROW_NUMBER()方式兼容SQL Server 2008 R2
    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT 
        ID, CertificateNo, CustomerNo, WorkOrderNo, ProductNo, ProductName, 
        ProductSpec, ProductDrawing, ColorCardImage, ColorCardQuantity, CreateDate, Creator, 
        Follower, Receiver, ReturnQuantity, Signer, SignDate, ReceiveDate, Judgment,
        SampleStatus, ExpiryDate, DistributionDepartment, DistributionQuantity, Remark
      FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY CreateDate DESC) as RowNum
        FROM SampleApproval 
        ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= @offset + @pageSize
      ORDER BY CreateDate DESC
    `;
    
    const dataResult = await executeQuery(async (pool) => {
      const request = pool.request();
      Object.keys(parameters).forEach(key => {
        request.input(key, sql.NVarChar, parameters[key]);
      });
      request.input('offset', sql.Int, offset);
      request.input('pageSize', sql.Int, parseInt(pageSize));
      return await request.query(dataQuery);
    });
    if (!dataResult) {
      return res.status(500).json({
        code: 500,
        message: '获取样板承认书列表失败'
      });
    }

    // 日期格式转换函数：将ISO日期转换为yyyy-MM-dd格式并处理时区偏移
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      // 处理时区偏移，转换为本地时间
      const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return localDate.toISOString().split('T')[0];
    };

    // 转换字段名为驼峰命名以匹配前端
    const convertedList = dataResult.recordset.map(item => ({
      id: item.ID,
      certificateNo: item.CertificateNo,
      customerNo: item.CustomerNo,
      workOrderNo: item.WorkOrderNo,
      productNo: item.ProductNo,
      productName: item.ProductName,
      productSpec: item.ProductSpec,
      productDrawing: item.ProductDrawing,
      colorCardImage: item.ColorCardImage,
      colorCardQuantity: item.ColorCardQuantity,
      createDate: formatDate(item.CreateDate),
      creator: item.Creator,
      follower: item.Follower,
      receiver: item.Receiver,
      returnQuantity: item.ReturnQuantity,
      signer: item.Signer,
      signDate: formatDate(item.SignDate),
      receiveDate: formatDate(item.ReceiveDate),
      judgment: item.Judgment,
      sampleStatus: item.SampleStatus,
      expiryDate: formatDate(item.ExpiryDate),
      distributionDepartment: item.DistributionDepartment,
      distributionQuantity: item.DistributionQuantity,
      remark: item.Remark
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: convertedList,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取样板承认书列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取样板承认书列表失败',
      error: error.message
    });
  }
});

/**
 * 创建样板承认书
 * POST /api/sample/create
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      customerNo,
      workOrderNo,
      productNo,
      productName,
      productSpec,
      productDrawing,
      colorCardImage,
      colorCardQuantity,
      createDate,
      creator,
      follower,
      receiver,
      returnQuantity,
      signer,
      signDate,
      receiveDate,
      judgment,
      distributionDepartment,
      distributionQuantity,
      sampleStatus = '正常使用',
      expiryDate,
      remark
    } = req.body;

    // 自动生成样版编号
    const certificateNo = await generateCertificateNo();

    const query = `
      INSERT INTO SampleApproval (
        CertificateNo, CustomerNo, WorkOrderNo, ProductNo, ProductName, ProductSpec,
        ProductDrawing, ColorCardImage, ColorCardQuantity, CreateDate, Creator, Follower,
        Receiver, ReturnQuantity, Signer, SignDate, ReceiveDate, Judgment,
        DistributionDepartment, DistributionQuantity, SampleStatus, ExpiryDate, Remark
      ) VALUES (
        @certificateNo, @customerNo, @workOrderNo, @productNo, @productName, @productSpec,
        @productDrawing, @colorCardImage, @colorCardQuantity, @createDate, @creator, @follower,
        @receiver, @returnQuantity, @signer, @signDate, @receiveDate, @judgment,
        @distributionDepartment, @distributionQuantity, @sampleStatus, @expiryDate, @remark
      )
    `;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('certificateNo', sql.NVarChar, certificateNo);
      request.input('customerNo', sql.NVarChar, customerNo);
      request.input('workOrderNo', sql.NVarChar, workOrderNo);
      request.input('productNo', sql.NVarChar, productNo);
      request.input('productName', sql.NVarChar, productName);
      request.input('productSpec', sql.NVarChar, productSpec);
      request.input('productDrawing', sql.NVarChar, productDrawing);
      request.input('colorCardImage', sql.NVarChar, colorCardImage);
      request.input('colorCardQuantity', sql.Int, colorCardQuantity);
      request.input('createDate', sql.Date, createDate);
      request.input('creator', sql.NVarChar, creator);
      request.input('follower', sql.NVarChar, follower);
      request.input('receiver', sql.NVarChar, receiver);
      request.input('returnQuantity', sql.Int, returnQuantity);
      request.input('signer', sql.NVarChar, signer);
      request.input('signDate', sql.Date, signDate);
      request.input('receiveDate', sql.Date, receiveDate);
      request.input('judgment', sql.NVarChar, judgment);
      request.input('distributionDepartment', sql.NVarChar, JSON.stringify(distributionDepartment));
      request.input('distributionQuantity', sql.Int, distributionQuantity);
      request.input('sampleStatus', sql.NVarChar, sampleStatus);
      request.input('expiryDate', sql.Date, expiryDate);
      request.input('remark', sql.NVarChar, remark);
      return await request.query(query);
    });
    if (!result) {
      return res.status(500).json({
        code: 500,
        message: '创建样板承认书失败'
      });
    }

    res.json({
      code: 200,
      message: '创建成功'
    });
  } catch (error) {
    console.error('创建样板承认书失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建样板承认书失败',
      error: error.message
    });
  }
});

/**
 * 更新样板承认书
 * PUT /api/sample/update/:id
 */
router.put('/update/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      certificateNo,
      customerNo,
      workOrderNo,
      productNo,
      productName,
      productSpec,
      productDrawing,
      colorCardImage,
      colorCardQuantity,
      createDate,
      creator,
      follower,
      receiver,
      returnQuantity,
      signer,
      signDate,
      receiveDate,
      judgment,
      distributionDepartment,
      distributionQuantity,
      sampleStatus,
      expiryDate,
      remark
    } = req.body;

    const query = `
      UPDATE SampleApproval SET
        CertificateNo = @certificateNo,
        CustomerNo = @customerNo,
        WorkOrderNo = @workOrderNo,
        ProductNo = @productNo,
        ProductName = @productName,
        ProductSpec = @productSpec,
        ProductDrawing = @productDrawing,
        ColorCardImage = @colorCardImage,
        ColorCardQuantity = @colorCardQuantity,
        CreateDate = @createDate,
        Creator = @creator,
        Follower = @follower,
        Receiver = @receiver,
        ReturnQuantity = @returnQuantity,
        Signer = @signer,
        SignDate = @signDate,
        ReceiveDate = @receiveDate,
        Judgment = @judgment,
        DistributionDepartment = @distributionDepartment,
        DistributionQuantity = @distributionQuantity,
        SampleStatus = @sampleStatus,
        ExpiryDate = @expiryDate,
        Remark = @remark
      WHERE ID = @id
    `;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, id);
      request.input('certificateNo', sql.NVarChar, certificateNo);
      request.input('customerNo', sql.NVarChar, customerNo);
      request.input('workOrderNo', sql.NVarChar, workOrderNo);
      request.input('productNo', sql.NVarChar, productNo);
      request.input('productName', sql.NVarChar, productName);
      request.input('productSpec', sql.NVarChar, productSpec);
      request.input('productDrawing', sql.NVarChar, productDrawing);
      request.input('colorCardImage', sql.NVarChar, colorCardImage);
      request.input('colorCardQuantity', sql.Int, colorCardQuantity);
      request.input('createDate', sql.Date, createDate);
      request.input('creator', sql.NVarChar, creator);
      request.input('follower', sql.NVarChar, follower);
      request.input('receiver', sql.NVarChar, receiver);
      request.input('returnQuantity', sql.Int, returnQuantity);
      request.input('signer', sql.NVarChar, signer);
      request.input('signDate', sql.Date, signDate);
      request.input('receiveDate', sql.Date, receiveDate);
      request.input('judgment', sql.NVarChar, judgment);
      request.input('distributionDepartment', sql.NVarChar, JSON.stringify(distributionDepartment));
      request.input('distributionQuantity', sql.Int, distributionQuantity);
      request.input('sampleStatus', sql.NVarChar, sampleStatus);
      request.input('expiryDate', sql.Date, expiryDate);
      request.input('remark', sql.NVarChar, remark);
      return await request.query(query);
    });
    if (!result) {
      return res.status(500).json({
        code: 500,
        message: '更新样板承认书失败'
      });
    }

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新样板承认书失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新样板承认书失败',
      error: error.message
    });
  }
});

/**
 * 删除样板承认书
 * DELETE /api/sample/delete/:id
 */
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM SampleApproval WHERE ID = @id';
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, id);
      return await request.query(query);
    });
    if (!result) {
      return res.status(500).json({
        code: 500,
        message: '删除样板承认书失败'
      });
    }

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除样板承认书失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除样板承认书失败',
      error: error.message
    });
  }
});

/**
 * 批量删除样板承认书
 * DELETE /api/sample/batch-delete
 */
router.delete('/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供要删除的ID列表'
      });
    }

    const placeholders = ids.map((_, index) => `@id${index}`).join(',');
    const query = `DELETE FROM SampleApproval WHERE ID IN (${placeholders})`;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      ids.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });
      return await request.query(query);
    });
    if (!result) {
      return res.status(500).json({
        code: 500,
        message: '批量删除样板承认书失败'
      });
    }

    res.json({
      code: 200,
      message: '批量删除成功'
    });
  } catch (error) {
    console.error('批量删除样板承认书失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量删除样板承认书失败',
      error: error.message
    });
  }
});

/**
 * 获取样板统计数据
 * GET /api/sample/statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // 获取总数统计
    const totalQuery = 'SELECT COUNT(*) as total FROM SampleApproval';
    const totalResult = await executeQuery(async (pool) => {
      return await pool.request().query(totalQuery);
    });
    
    // 获取已回签数量：ReceiveDate字段存在有效日期即视为已回签
    const signedQuery = `
      SELECT COUNT(*) as count 
      FROM SampleApproval 
      WHERE ReceiveDate IS NOT NULL
    `;
    const signedResult = await executeQuery(async (pool) => {
      return await pool.request().query(signedQuery);
    });
    
    // 获取未回签数量：ReceiveDate字段为空且SampleStatus不为"已作废"
    const unsignedQuery = `
      SELECT COUNT(*) as count 
      FROM SampleApproval 
      WHERE ReceiveDate IS NULL 
        AND (SampleStatus != '已作废' OR SampleStatus IS NULL)
    `;
    const unsignedResult = await executeQuery(async (pool) => {
      return await pool.request().query(unsignedQuery);
    });
    
    // 获取已作废数量：SampleStatus字段值为"已作废"
    const cancelledQuery = `
      SELECT COUNT(*) as count 
      FROM SampleApproval 
      WHERE SampleStatus = '已作废'
    `;
    const cancelledResult = await executeQuery(async (pool) => {
      return await pool.request().query(cancelledQuery);
    });
    
    // 获取即将到期的样板数量（30天内）
    const expiringQuery = `
      SELECT COUNT(*) as count 
      FROM SampleApproval 
      WHERE ExpiryDate IS NOT NULL 
        AND ExpiryDate <= DATEADD(day, 30, GETDATE())
        AND ExpiryDate >= GETDATE()
        AND SampleStatus != '已作废'
    `;
    const expiringResult = await executeQuery(async (pool) => {
      return await pool.request().query(expiringQuery);
    });

    // 检查所有查询结果
    if (!totalResult || !signedResult || !unsignedResult || !cancelledResult || !expiringResult) {
      return res.status(500).json({
        code: 500,
        message: '获取样板统计数据失败'
      });
    }

    res.json({
      code: 200,
      message: '获取统计数据成功',
      data: {
        total: totalResult.recordset[0].total,
        signed: signedResult.recordset[0].count,
        unsigned: unsignedResult.recordset[0].count,
        cancelled: cancelledResult.recordset[0].count,
        expiringSoon: expiringResult.recordset[0].count
      }
    });
  } catch (error) {
    console.error('获取样板统计数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取样板统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;