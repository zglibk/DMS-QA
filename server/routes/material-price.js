const express = require('express');
const router = express.Router();
const sql = require('mssql');
const XLSX = require('xlsx');
const { executeQuery } = require('../db');



/**
 * 获取材料单价接口
 *
 * 功能：根据材料名称和供应商获取当前有效的材料单价
 * 用途：投诉记录新增/编辑时自动填入材料单价
 *
 * 请求方式：GET /api/admin/material-prices/get-price
 *
 * 查询参数：
 * - materialName: 材料名称（必填）
 * - supplier: 供应商名称（可选，如果不提供则返回所有供应商的价格）
 *
 * 响应格式：
 * {
 *   success: true,
 *   data: {
 *     unitPrice: 12.50,
 *     supplier: "供应商A",
 *     materialName: "材料名称",
 *     effectiveDate: "2025-01-01",
 *     version: 1
 *   }
 * }
 *
 * 或者返回多个供应商的价格：
 * {
 *   success: true,
 *   data: [
 *     { unitPrice: 12.50, supplier: "供应商A", ... },
 *     { unitPrice: 13.00, supplier: "供应商B", ... }
 *   ]
 * }
 */
router.get('/get-price', async (req, res) => {
  try {
    const { materialName, supplier } = req.query;

    // 验证必填参数
    if (!materialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称不能为空'
      });
    }

    // 使用executeQuery执行查询
    const result = await executeQuery(async (pool) => {
      const request = pool.request();

      // 构建查询条件
      let whereConditions = ['IsActive = 1', 'MaterialName = @materialName'];
      request.input('materialName', sql.NVarChar, materialName);

      // 如果指定了供应商，添加供应商条件
      if (supplier) {
        whereConditions.push('Supplier = @supplier');
        request.input('supplier', sql.NVarChar, supplier);
      }

      // 查询当前有效的材料价格
      const query = `
        SELECT TOP 10
          ID,
          MaterialName,
          Supplier,
          UnitPrice,
          Remarks,
          EffectiveDate,
          Version,
          CreatedBy,
          CreatedDate
        FROM MaterialPrice
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY EffectiveDate DESC, Version DESC
      `;

      return await request.query(query);
    });

    if (result.recordset.length === 0) {
      return res.json({
        success: false,
        message: supplier
          ? `未找到材料"${materialName}"在供应商"${supplier}"的价格信息`
          : `未找到材料"${materialName}"的价格信息`
      });
    }

    // 如果指定了供应商，返回单个价格信息
    if (supplier) {
      const priceInfo = result.recordset[0];
      return res.json({
        success: true,
        data: {
          unitPrice: priceInfo.UnitPrice,
          supplier: priceInfo.Supplier,
          materialName: priceInfo.MaterialName,
          effectiveDate: priceInfo.EffectiveDate,
          version: priceInfo.Version,
          remarks: priceInfo.Remarks
        }
      });
    }

    // 如果没有指定供应商，返回所有供应商的价格信息
    const priceList = result.recordset.map(item => ({
      unitPrice: item.UnitPrice,
      supplier: item.Supplier,
      materialName: item.MaterialName,
      effectiveDate: item.EffectiveDate,
      version: item.Version,
      remarks: item.Remarks
    }));

    res.json({
      success: true,
      data: priceList
    });

  } catch (error) {
    console.error('获取材料单价失败:', error);
    res.status(500).json({
      success: false,
      message: '获取材料单价失败: ' + error.message
    });
  }
});

/**
 * 获取材料名称列表接口
 *
 * 功能：获取所有有效的材料名称，用于前端下拉选择
 * 用途：投诉记录新增/编辑时的材料选择下拉框
 *
 * 请求方式：GET /api/admin/material-prices/material-names
 *
 * 响应格式：
 * {
 *   success: true,
 *   data: ["材料A", "材料B", "材料C"]
 * }
 */
router.get('/material-names', async (req, res) => {
  try {
    // 使用executeQuery执行查询
    const result = await executeQuery(async (pool) => {
      const request = pool.request();

      // 查询所有有效的材料名称（去重）
      const query = `
        SELECT DISTINCT MaterialName
        FROM MaterialPrice
        WHERE IsActive = 1
          AND MaterialName IS NOT NULL
          AND MaterialName != ''
        ORDER BY MaterialName ASC
      `;

      return await request.query(query);
    });

    // 提取材料名称列表
    const materialNames = result.recordset.map(item => item.MaterialName);

    res.json({
      success: true,
      data: materialNames
    });

  } catch (error) {
    console.error('获取材料名称列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取材料名称列表失败: ' + error.message
    });
  }
});

/**
 * 获取供应商列表接口
 *
 * 功能：获取指定材料的所有供应商，或所有供应商列表
 * 用途：投诉记录新增/编辑时的供应商选择
 *
 * 请求方式：GET /api/admin/material-prices/suppliers
 *
 * 查询参数：
 * - materialName: 材料名称（可选，如果提供则返回该材料的供应商）
 *
 * 响应格式：
 * {
 *   success: true,
 *   data: ["供应商A", "供应商B", "供应商C"]
 * }
 */
router.get('/suppliers', async (req, res) => {
  try {
    const { materialName } = req.query;

    // 使用executeQuery执行查询
    const result = await executeQuery(async (pool) => {
      const request = pool.request();

      // 构建查询条件
      let whereConditions = ['IsActive = 1', 'Supplier IS NOT NULL', "Supplier != ''"];

      if (materialName) {
        whereConditions.push('MaterialName = @materialName');
        request.input('materialName', sql.NVarChar, materialName);
      }

      // 查询供应商列表（去重）
      const query = `
        SELECT DISTINCT Supplier
        FROM MaterialPrice
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY Supplier ASC
      `;

      return await request.query(query);
    });

    // 提取供应商列表
    const suppliers = result.recordset.map(item => item.Supplier);

    res.json({
      success: true,
      data: suppliers
    });

  } catch (error) {
    console.error('获取供应商列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取供应商列表失败: ' + error.message
    });
  }
});

// 获取材料价格列表（分页、搜索、排序）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      materialName = '',
      supplier = '',
      minPrice = '',
      maxPrice = '',
      sortField = 'ID',
      sortOrder = 'DESC'
    } = req.query;

    // 构建查询条件
    let whereConditions = ['IsActive = 1'];

    // 验证排序字段
    const allowedSortFields = ['ID', 'MaterialName', 'UnitPrice', 'Supplier'];
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'ID';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 计算偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // 使用executeQuery执行查询
    const result = await executeQuery(async (pool) => {
      // 构建查询条件和参数
      const request = pool.request();

      if (materialName) {
        whereConditions.push('MaterialName LIKE @materialName');
        request.input('materialName', sql.NVarChar, `%${materialName}%`);
      }

      if (supplier) {
        whereConditions.push('Supplier LIKE @supplier');
        request.input('supplier', sql.NVarChar, `%${supplier}%`);
      }

      if (minPrice && minPrice !== 'null' && !isNaN(parseFloat(minPrice))) {
        whereConditions.push('UnitPrice >= @minPrice');
        request.input('minPrice', sql.Decimal(10, 2), parseFloat(minPrice));
      }

      if (maxPrice && maxPrice !== 'null' && !isNaN(parseFloat(maxPrice))) {
        whereConditions.push('UnitPrice <= @maxPrice');
        request.input('maxPrice', sql.Decimal(10, 2), parseFloat(maxPrice));
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 查询总数
      const countQuery = `SELECT COUNT(*) as total FROM MaterialPrice ${whereClause}`;
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0].total;

      // 查询数据
      request.input('offset', sql.Int, offset);
      request.input('pageSize', sql.Int, parseInt(pageSize));

      // SQL Server 2008R2兼容的分页查询
      const dataQuery = `
        SELECT ID, MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, Version, IsActive FROM (
          SELECT
            ROW_NUMBER() OVER (ORDER BY ${validSortField} ${validSortOrder}) as RowNum,
            ID, MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, Version, IsActive
          FROM MaterialPrice
          ${whereClause}
        ) AS PagedResults
        WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
      `;

      const dataResult = await request.query(dataQuery);

      return {
        records: dataResult.recordset,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    });

    // 检查查询结果
    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败，请稍后重试'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取材料价格列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
});

// Excel批量导入
router.post('/import', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }

    // 真正的数据库导入逻辑
    const result = await executeQuery(async (pool) => {
      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();

        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < data.length; i++) {
          const item = data[i];

          try {
            // 验证数据
            if (!item.MaterialName) {
              errors.push(`第${i + 1}行：材料名称为必填项`);
              skipped++;
              continue;
            }

            // 单价可以为空，但如果有值必须是有效数字
            if (item.UnitPrice !== null && item.UnitPrice !== undefined && item.UnitPrice !== '') {
              if (isNaN(parseFloat(item.UnitPrice)) || parseFloat(item.UnitPrice) < 0) {
                errors.push(`第${i + 1}行：单价必须为有效的非负数`);
                skipped++;
                continue;
              }
            }

            // 检查是否已存在相同的材料和供应商
            const checkRequest = new sql.Request(transaction);
            checkRequest.input('materialName', sql.NVarChar, item.MaterialName);
            checkRequest.input('supplier', sql.NVarChar, item.Supplier || '');

            const checkQuery = `
              SELECT COUNT(*) as count
              FROM MaterialPrice
              WHERE MaterialName = @materialName AND ISNULL(Supplier, '') = @supplier AND IsActive = 1
            `;
            const checkResult = await checkRequest.query(checkQuery);

            if (checkResult.recordset[0].count > 0) {
              // 更新现有记录
              const updateRequest = new sql.Request(transaction);
              updateRequest.input('MaterialName', sql.NVarChar, item.MaterialName);
              updateRequest.input('Supplier', sql.NVarChar, item.Supplier || '');
              updateRequest.input('UnitPrice', sql.Decimal(10, 2),
                item.UnitPrice !== null && item.UnitPrice !== undefined && item.UnitPrice !== ''
                  ? parseFloat(item.UnitPrice)
                  : null
              );
              updateRequest.input('Remarks', sql.NVarChar, item.Remarks || '批量导入更新');

              const updateQuery = `
                UPDATE MaterialPrice
                SET UnitPrice = @UnitPrice,
                    Remarks = @Remarks,
                    UpdatedDate = GETDATE()
                WHERE MaterialName = @MaterialName
                  AND ISNULL(Supplier, '') = @Supplier
                  AND IsActive = 1
              `;
              await updateRequest.query(updateQuery);
            } else {
              // 插入新记录
              const insertRequest = new sql.Request(transaction);
              insertRequest.input('MaterialName', sql.NVarChar, item.MaterialName);
              insertRequest.input('Supplier', sql.NVarChar, item.Supplier || null);
              insertRequest.input('UnitPrice', sql.Decimal(10, 2),
                item.UnitPrice !== null && item.UnitPrice !== undefined && item.UnitPrice !== ''
                  ? parseFloat(item.UnitPrice)
                  : null
              );
              insertRequest.input('Remarks', sql.NVarChar, item.Remarks || '批量导入新增');

              const insertQuery = `
                INSERT INTO MaterialPrice (
                  MaterialName, Supplier, UnitPrice, Remarks,
                  EffectiveDate, CreatedDate, UpdatedDate, Version, IsActive
                ) VALUES (
                  @MaterialName, @Supplier, @UnitPrice, @Remarks,
                  GETDATE(), GETDATE(), GETDATE(), 1, 1
                )
              `;
              await insertRequest.query(insertQuery);
            }

            imported++;

          } catch (itemError) {
            console.error(`处理第${i + 1}行数据失败:`, itemError);
            errors.push(`第${i + 1}行：${itemError.message}`);
            skipped++;
          }
        }

        await transaction.commit();

        return {
          imported,
          skipped,
          errors: errors.slice(0, 10) // 只返回前10个错误
        };

      } catch (transactionError) {
        await transaction.rollback();
        console.error('事务回滚:', transactionError);
        throw transactionError;
      }
    });

    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (!result) {
      console.error('导入失败: executeQuery 返回 null，可能是数据库连接问题');
      return res.json({
        success: true,
        message: `导入完成，成功0条，跳过${data.length}条（数据库连接失败）`,
        data: {
          imported: 0,
          skipped: data.length,
          errors: ['数据库连接失败，所有数据都被跳过']
        }
      });
    }

    res.json({
      success: true,
      message: `导入完成，成功${result.imported}条，跳过${result.skipped}条`,
      data: result
    });

  } catch (error) {
    console.error('批量导入失败:', error);
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// 新增材料价格
router.post('/', async (req, res) => {
  try {
    const { MaterialName, UnitPrice, Supplier, Remarks } = req.body;

    // 验证必填字段
    if (!MaterialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称为必填项'
      });
    }

    const result = await executeQuery(async (pool) => {
      // 检查是否已存在相同的材料和供应商
      const checkRequest = pool.request();
      checkRequest.input('MaterialName', sql.NVarChar, MaterialName);
      checkRequest.input('Supplier', sql.NVarChar, Supplier || '');

      const checkQuery = `
        SELECT COUNT(*) as count
        FROM MaterialPrice
        WHERE MaterialName = @MaterialName AND ISNULL(Supplier, '') = @Supplier AND IsActive = 1
      `;
      const checkResult = await checkRequest.query(checkQuery);

      if (checkResult.recordset[0].count > 0) {
        // 更新现有记录
        const updateRequest = pool.request();
        updateRequest.input('MaterialName', sql.NVarChar, MaterialName);
        updateRequest.input('Supplier', sql.NVarChar, Supplier || '');
        updateRequest.input('UnitPrice', sql.Decimal(10, 2), UnitPrice ? parseFloat(UnitPrice) : null);
        updateRequest.input('Remarks', sql.NVarChar, Remarks || null);

        const updateQuery = `
          UPDATE MaterialPrice
          SET UnitPrice = @UnitPrice,
              Remarks = @Remarks,
              UpdatedDate = GETDATE()
          WHERE MaterialName = @MaterialName
            AND ISNULL(Supplier, '') = @Supplier
            AND IsActive = 1
        `;
        await updateRequest.query(updateQuery);
      } else {
        // 插入新记录
        const insertRequest = pool.request();
        insertRequest.input('MaterialName', sql.NVarChar, MaterialName);
        insertRequest.input('Supplier', sql.NVarChar, Supplier || null);
        insertRequest.input('UnitPrice', sql.Decimal(10, 2), UnitPrice ? parseFloat(UnitPrice) : null);
        insertRequest.input('Remarks', sql.NVarChar, Remarks || null);

        const insertQuery = `
          INSERT INTO MaterialPrice (
            MaterialName, Supplier, UnitPrice, Remarks,
            EffectiveDate, CreatedDate, UpdatedDate, Version, IsActive
          ) VALUES (
            @MaterialName, @Supplier, @UnitPrice, @Remarks,
            GETDATE(), GETDATE(), GETDATE(), 1, 1
          )
        `;
        await insertRequest.query(insertQuery);
      }

      return { success: true };
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }

    res.json({
      success: true,
      message: '操作成功'
    });

  } catch (error) {
    console.error('新增材料价格失败:', error);
    res.status(500).json({
      success: false,
      message: '操作失败: ' + error.message
    });
  }
});

// 更新材料价格
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { MaterialName, UnitPrice, Supplier, Remarks } = req.body;

    // 验证必填字段
    if (!MaterialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称为必填项'
      });
    }

    const result = await executeQuery(async (pool) => {
      // 获取原记录信息
      const getRequest = pool.request();
      getRequest.input('id', sql.Int, parseInt(id));
      const getResult = await getRequest.query('SELECT * FROM MaterialPrice WHERE ID = @id AND IsActive = 1');

      if (getResult.recordset.length === 0) {
        throw new Error('记录不存在或已失效');
      }

      // 直接更新记录
      const updateRequest = pool.request();
      updateRequest.input('id', sql.Int, parseInt(id));
      updateRequest.input('MaterialName', sql.NVarChar, MaterialName);
      updateRequest.input('UnitPrice', sql.Decimal(10, 2), UnitPrice ? parseFloat(UnitPrice) : null);
      updateRequest.input('Supplier', sql.NVarChar, Supplier || null);
      updateRequest.input('Remarks', sql.NVarChar, Remarks || null);

      const updateQuery = `
        UPDATE MaterialPrice
        SET MaterialName = @MaterialName,
            UnitPrice = @UnitPrice,
            Supplier = @Supplier,
            Remarks = @Remarks,
            UpdatedDate = GETDATE()
        WHERE ID = @id AND IsActive = 1
      `;
      await updateRequest.query(updateQuery);

      return { success: true };
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }

    res.json({
      success: true,
      message: '更新成功'
    });

  } catch (error) {
    console.error('更新材料价格失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败: ' + error.message
    });
  }
});

// 删除材料价格
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(async (pool) => {
      // 检查记录是否存在
      const checkRequest = pool.request();
      checkRequest.input('id', sql.Int, parseInt(id));
      const checkResult = await checkRequest.query('SELECT COUNT(*) as count FROM MaterialPrice WHERE ID = @id');

      if (checkResult.recordset[0].count === 0) {
        throw new Error('记录不存在');
      }

      // 删除记录
      const deleteRequest = pool.request();
      deleteRequest.input('id', sql.Int, parseInt(id));
      await deleteRequest.query('DELETE FROM MaterialPrice WHERE ID = @id');

      return { success: true };
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('删除材料价格失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败: ' + error.message
    });
  }
});

// 获取价格历史记录
router.get('/history', async (req, res) => {
  try {
    const { materialName, supplier } = req.query;

    if (!materialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称为必填参数'
      });
    }

    const result = await executeQuery(async (pool) => {
      // 直接使用SQL查询获取历史记录
      const request = pool.request();
      request.input('MaterialName', sql.NVarChar, materialName);

      let whereClause = 'WHERE MaterialName = @MaterialName';
      if (supplier) {
        request.input('Supplier', sql.NVarChar, supplier);
        whereClause += ' AND ISNULL(Supplier, \'\') = ISNULL(@Supplier, \'\')';
      }

      const query = `
        SELECT
          ID,
          MaterialName,
          Supplier,
          UnitPrice,
          Remarks,
          EffectiveDate,
          CreatedDate,
          UpdatedDate,
          Version,
          IsActive
        FROM MaterialPrice
        ${whereClause}
        ORDER BY EffectiveDate DESC, Version DESC
      `;


      return await request.query(query);
    });

    // 检查查询结果
    if (!result) {
      console.error('历史数据查询失败: executeQuery 返回 null，可能是数据库连接问题');
      return res.json({
        success: true,
        data: [] // 返回空数组而不是错误
      });
    }


    res.json({
      success: true,
      data: result.recordset || []
    });

  } catch (error) {
    console.error('获取价格历史失败:', error);
    console.error('错误详情:', error.message);
    res.status(500).json({
      success: false,
      message: '获取历史数据失败: ' + error.message
    });
  }
});

// 获取筛选选项（材料名称和供应商列表）
router.get('/filter-options', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      const request = pool.request();

      // 获取所有不重复的材料名称
      const materialNamesQuery = `
        SELECT DISTINCT MaterialName
        FROM MaterialPrice
        WHERE MaterialName IS NOT NULL AND MaterialName != ''
        ORDER BY MaterialName ASC
      `;

      // 获取所有不重复的供应商
      const suppliersQuery = `
        SELECT DISTINCT Supplier
        FROM MaterialPrice
        WHERE Supplier IS NOT NULL AND Supplier != ''
        ORDER BY Supplier ASC
      `;

      const materialNamesResult = await request.query(materialNamesQuery);
      const suppliersResult = await request.query(suppliersQuery);

      return {
        materialNames: materialNamesResult.recordset.map(row => row.MaterialName),
        suppliers: suppliersResult.recordset.map(row => row.Supplier)
      };
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取筛选选项失败: ' + error.message
    });
  }
});

// 导出材料价格数据
router.get('/export', async (req, res) => {
  try {
    const { materialName, supplier, isActive, minPrice, maxPrice } = req.query;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();

      // 构建WHERE条件
      let whereConditions = [];
      let paramIndex = 1;

      // 有效状态筛选
      if (isActive !== undefined && isActive !== '') {
        whereConditions.push(`IsActive = @param${paramIndex}`);
        request.input(`param${paramIndex}`, isActive === '1');
        paramIndex++;
      }

      // 材料名称筛选
      if (materialName) {
        whereConditions.push(`MaterialName LIKE @param${paramIndex}`);
        request.input(`param${paramIndex}`, `%${materialName}%`);
        paramIndex++;
      }

      // 供应商筛选
      if (supplier) {
        whereConditions.push(`Supplier LIKE @param${paramIndex}`);
        request.input(`param${paramIndex}`, `%${supplier}%`);
        paramIndex++;
      }

      // 价格范围筛选
      if (minPrice !== undefined && minPrice !== '') {
        whereConditions.push(`UnitPrice >= @param${paramIndex}`);
        request.input(`param${paramIndex}`, parseFloat(minPrice));
        paramIndex++;
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        whereConditions.push(`UnitPrice <= @param${paramIndex}`);
        request.input(`param${paramIndex}`, parseFloat(maxPrice));
        paramIndex++;
      }

      // 构建完整查询
      let query = `
        SELECT
          ID,
          MaterialName,
          UnitPrice,
          Supplier,
          Remarks,
          EffectiveDate,
          CreatedDate,
          UpdatedDate,
          Version,
          IsActive
        FROM MaterialPrice
      `;

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ` ORDER BY MaterialName ASC, CreatedDate DESC`;

      const result = await request.query(query);
      return result.recordset;
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('导出材料价格数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败: ' + error.message
    });
  }
});

module.exports = router;
