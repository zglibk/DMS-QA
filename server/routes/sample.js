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
const fs = require('fs');
const path = require('path');
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
      certificateNo,
      customerNo,
      workOrderNo, 
      productNo,
      productName,
      sampleStatus,
      judgment,
      createDateStart, 
      createDateEnd 
    } = req.query;

    let whereConditions = [];
    let parameters = {};

    // 构建查询条件
    if (certificateNo) {
      whereConditions.push('CertificateNo LIKE @certificateNo');
      parameters.certificateNo = `%${certificateNo}%`;
    }
    if (customerNo) {
      whereConditions.push('CustomerNo LIKE @customerNo');
      parameters.customerNo = `%${customerNo}%`;
    }
    if (workOrderNo) {
      whereConditions.push('WorkOrderNo LIKE @workOrderNo');
      parameters.workOrderNo = `%${workOrderNo}%`;
    }
    if (productNo) {
      whereConditions.push('ProductNo LIKE @productNo');
      parameters.productNo = `%${productNo}%`;
    }
    if (productName) {
      whereConditions.push('ProductName LIKE @productName');
      parameters.productName = `%${productName}%`;
    }

    if (sampleStatus) {
      whereConditions.push('SampleStatus = @sampleStatus');
      parameters.sampleStatus = sampleStatus;
    }
    if (judgment) {
      whereConditions.push('Judgment = @judgment');
      parameters.judgment = judgment;
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
    // 默认按样板编号（CertificateNo）降序排列，使用字符串降序可正确处理SP2601001格式
    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT 
        ID, CertificateNo, CustomerNo, WorkOrderNo, ProductNo, ProductName, 
        ProductSpec, ProductDrawing, ColorCardImage, ColorCardQuantity, CreateDate, Creator, 
        Follower, Receiver, ReturnQuantity, Signer, SignDate, ReceiveDate, Judgment,
        SampleStatus, ExpiryDate, DistributionDepartment, DistributionQuantity, Remark
      FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY CertificateNo DESC) as RowNum
        FROM SampleApproval 
        ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= @offset + @pageSize
      ORDER BY CertificateNo DESC
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
    console.log('收到样板创建请求:', req.body);    
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

    console.log('解构后的字段:', {
      customerNo, workOrderNo, productNo, productName, productSpec,
      createDate, creator, follower, sampleStatus
    });

    // 验证必填字段
    if (!customerNo || !workOrderNo || !productName || !productSpec) {
      console.log('必填字段验证失败 - 基本信息');
      return res.status(400).json({
        code: 400,
        message: '客户编号、工单号、品名和产品规格为必填字段'
      });
    }

    if (!colorCardQuantity || !createDate) {
      console.log('必填字段验证失败 - 制作信息');
      return res.status(400).json({
        code: 400,
        message: '色卡数量和制作日期为必填字段'
      });
    }

    console.log('字段验证通过，开始生成样版编号...');

    // 自动生成样版编号
    const certificateNo = await generateCertificateNo();
    // 样版编号生成成功

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

    // 处理ProductNo字段：如果为空则设置为空字符串以满足数据库NOT NULL约束
    const processedProductNo = productNo || '';
    // 处理Creator和Follower字段：如果为空则设置为空字符串以满足数据库NOT NULL约束
    const processedCreator = creator || '';
    const processedFollower = follower || '';

    // 处理distributionDepartment字段：转换为JSON字符串并限制长度
    let processedDistributionDepartment = '';
    if (distributionDepartment) {
      if (Array.isArray(distributionDepartment)) {
        const jsonStr = JSON.stringify(distributionDepartment);
        processedDistributionDepartment = jsonStr.length > 500 ? jsonStr.substring(0, 497) + '...' : jsonStr;
        if (jsonStr.length > 500) {
          console.warn('分发部门数据过长，已截断:', jsonStr.length, '->', processedDistributionDepartment.length);
        }
      } else {
        processedDistributionDepartment = String(distributionDepartment).substring(0, 500);
      }
    }

    // 处理ProductDrawing字段：限制长度
    let processedProductDrawing = '';
    if (productDrawing) {
      if (Array.isArray(productDrawing)) {
        const joinedStr = productDrawing.join(',');
        processedProductDrawing = joinedStr.length > 500 ? joinedStr.substring(0, 497) + '...' : joinedStr;
        if (joinedStr.length > 500) {
          console.warn('产品图纸路径过长，已截断:', joinedStr.length, '->', processedProductDrawing.length);
        }
      } else {
        processedProductDrawing = String(productDrawing).substring(0, 500);
      }
    }

    // 处理ColorCardImage字段：限制长度
    let processedColorCardImage = '';
    if (colorCardImage) {
      if (Array.isArray(colorCardImage)) {
        const joinedStr = colorCardImage.join(',');
        processedColorCardImage = joinedStr.length > 500 ? joinedStr.substring(0, 497) + '...' : joinedStr;
        if (joinedStr.length > 500) {
          console.warn('色卡图像路径过长，已截断:', joinedStr.length, '->', processedColorCardImage.length);
        }
      } else {
        processedColorCardImage = String(colorCardImage).substring(0, 500);
      }
    }

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('certificateNo', sql.NVarChar, certificateNo);
      request.input('customerNo', sql.NVarChar, customerNo);
      request.input('workOrderNo', sql.NVarChar, workOrderNo);
      request.input('productNo', sql.NVarChar, processedProductNo);
      request.input('productName', sql.NVarChar, productName);
      request.input('productSpec', sql.NVarChar, productSpec);
      request.input('productDrawing', sql.NVarChar, processedProductDrawing);
      request.input('colorCardImage', sql.NVarChar, processedColorCardImage);
      request.input('colorCardQuantity', sql.Int, colorCardQuantity);
      request.input('createDate', sql.Date, createDate);
      request.input('creator', sql.NVarChar, processedCreator);
      request.input('follower', sql.NVarChar, processedFollower);
      request.input('receiver', sql.NVarChar, receiver);
      request.input('returnQuantity', sql.Int, returnQuantity);
      request.input('signer', sql.NVarChar, signer);
      request.input('signDate', sql.Date, signDate || null);
      request.input('receiveDate', sql.Date, receiveDate || null);
      request.input('judgment', sql.NVarChar, judgment);
      request.input('distributionDepartment', sql.NVarChar, processedDistributionDepartment);
      request.input('distributionQuantity', sql.Int, distributionQuantity);
      request.input('sampleStatus', sql.NVarChar, sampleStatus);
      request.input('expiryDate', sql.Date, expiryDate || null);
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
    console.error('=== 样板创建失败详细信息 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('请求数据:', {
      certificateNo,
      customerNo,
      workOrderNo,
      productNo,
      productName,
      productSpec,
      colorCardQuantity,
      createDate,
      distributionDepartment: typeof distributionDepartment,
      distributionDepartmentValue: distributionDepartment
    });
    console.error('================================');
    
    res.status(500).json({
      code: 500,
      message: '创建样板承认书失败',
      error: error.message,
      errorType: error.constructor.name,
      details: error.stack
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

    // 添加详细的字段长度调试日志
    console.log('=== 样品更新字段长度检查 ===');
    console.log('certificateNo:', certificateNo, '长度:', certificateNo ? certificateNo.length : 0);
    console.log('customerNo:', customerNo, '长度:', customerNo ? customerNo.length : 0);
    console.log('workOrderNo:', workOrderNo, '长度:', workOrderNo ? workOrderNo.length : 0);
    console.log('productNo:', productNo, '长度:', productNo ? productNo.length : 0);
    console.log('productName:', productName, '长度:', productName ? productName.length : 0);
    console.log('productSpec:', productSpec, '长度:', productSpec ? productSpec.length : 0);
    console.log('productDrawing:', productDrawing, '长度:', productDrawing ? productDrawing.length : 0);
    console.log('colorCardImage:', colorCardImage, '长度:', colorCardImage ? colorCardImage.length : 0);
    console.log('creator:', creator, '长度:', creator ? creator.length : 0);
    console.log('follower:', follower, '长度:', follower ? follower.length : 0);
    console.log('receiver:', receiver, '长度:', receiver ? receiver.length : 0);
    console.log('signer:', signer, '长度:', signer ? signer.length : 0);
    console.log('judgment:', judgment, '长度:', judgment ? judgment.length : 0);
    console.log('distributionDepartment:', distributionDepartment, '类型:', typeof distributionDepartment);
    
    // 处理 distributionDepartment 字段，避免多次 JSON.stringify
    let distributionDepartmentStr;
    if (typeof distributionDepartment === 'string') {
      // 如果已经是字符串，直接使用
      distributionDepartmentStr = distributionDepartment;
    } else {
      // 如果是数组或对象，进行 JSON.stringify
      distributionDepartmentStr = JSON.stringify(distributionDepartment);
    }
    
    console.log('distributionDepartment JSON:', distributionDepartmentStr, '长度:', distributionDepartmentStr.length);
    console.log('sampleStatus:', sampleStatus, '长度:', sampleStatus ? sampleStatus.length : 0);
    console.log('remark:', remark, '长度:', remark ? remark.length : 0);
    console.log('=== 字段长度检查结束 ===');

    // 获取原有的图片路径信息，用于对比删除
    const getOriginalQuery = `
      SELECT ProductDrawing, ColorCardImage 
      FROM SampleApproval 
      WHERE ID = @id
    `;
    
    const originalResult = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, id);
      return await request.query(getOriginalQuery);
    });

    if (!originalResult || originalResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '样板承认书记录不存在'
      });
    }

    const originalData = originalResult.recordset[0];
    
    // 处理图片物理删除
    await handleImageDeletion(originalData.ProductDrawing, productDrawing, 'product-drawing');
    await handleImageDeletion(originalData.ColorCardImage, colorCardImage, 'color-card');

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
      request.input('distributionDepartment', sql.NVarChar, distributionDepartmentStr);
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

/**
 * 处理图片物理删除
 * @param {string} originalPaths - 原有的图片路径字符串（分号分隔）
 * @param {string} newPaths - 新的图片路径字符串（分号分隔）
 * @param {string} imageType - 图片类型（用于日志标识）
 */
async function handleImageDeletion(originalPaths, newPaths, imageType) {
  try {
    // 解析原有路径和新路径
    const originalPathList = originalPaths ? 
      originalPaths.split(';').filter(path => path.trim()) : [];
    const newPathList = newPaths ? 
      newPaths.split(';').filter(path => path.trim()) : [];
    
    // 找出被删除的图片路径
    const deletedPaths = originalPathList.filter(originalPath => 
      !newPathList.includes(originalPath)
    );
    
    if (deletedPaths.length === 0) {
      console.log(`[${imageType}] 没有需要删除的图片`);
      return;
    }
    
    console.log(`[${imageType}] 开始删除 ${deletedPaths.length} 个图片文件:`, deletedPaths);
    
    // 删除物理文件
    for (const deletedPath of deletedPaths) {
      try {
        // 构建完整的文件路径
        let filePath;
        
        // 处理不同的路径格式
        if (deletedPath.startsWith('/files/')) {
          // /files/ 开头的路径需要转换为 uploads/ 路径
          // /files/site-images/产品图纸/xxx.jpg -> uploads/site-images/产品图纸/xxx.jpg
          const relativePath = deletedPath.replace('/files/', 'uploads/');
          filePath = path.join(__dirname, '..', relativePath);
        } else if (deletedPath.startsWith('uploads/')) {
          // 相对路径格式：uploads/site-images/filename.jpg
          filePath = path.join(__dirname, '..', deletedPath);
        } else if (deletedPath.includes('uploads')) {
          // 包含uploads的路径：/uploads/site-images/filename.jpg
          const uploadsIndex = deletedPath.indexOf('uploads');
          const relativePath = deletedPath.substring(uploadsIndex);
          filePath = path.join(__dirname, '..', relativePath);
        } else {
          // 纯文件名格式：filename.jpg，默认存储在 uploads/site-images 目录
          filePath = path.join(__dirname, '../uploads/site-images', deletedPath);
        }
        
        // 检查文件是否存在并删除
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[${imageType}] 成功删除文件:`, filePath);
        } else {
          console.log(`[${imageType}] 文件不存在，跳过删除:`, filePath);
        }
      } catch (deleteError) {
        console.error(`[${imageType}] 删除文件失败:`, deletedPath, deleteError.message);
        // 继续处理其他文件，不中断整个删除流程
      }
    }
  } catch (error) {
    console.error(`[${imageType}] 处理图片删除失败:`, error.message);
    // 不抛出错误，避免影响主要的更新流程
  }
}

module.exports = router;