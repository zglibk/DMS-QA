const express = require('express');
const router = express.Router();
const sql = require('mssql');
const XLSX = require('xlsx');
const { executeQuery } = require('../db');



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

      console.log('🔍 查询参数:', { materialName, supplier, minPrice, maxPrice, page, pageSize });

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

      console.log('🔧 WHERE条件:', whereConditions);
      console.log('🔧 WHERE子句:', whereClause);

      // 查询总数
      const countQuery = `SELECT COUNT(*) as total FROM MaterialPrice ${whereClause}`;
      console.log('📊 Count查询:', countQuery);
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

// 新增材料价格
router.post('/', async (req, res) => {
  try {
    const { MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate } = req.body;

    // 验证必填字段
    if (!MaterialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称为必填项'
      });
    }

    await executeQuery(async (pool) => {
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
            MaterialName, Supplier, UnitPrice, Unit, Remarks,
            EffectiveDate, CreatedDate, UpdatedDate, Version, IsActive
          ) VALUES (
            @MaterialName, @Supplier, @UnitPrice, NULL, @Remarks,
            GETDATE(), GETDATE(), GETDATE(), 1, 1
          )
        `;
        await insertRequest.query(insertQuery);
      }
    });

    res.json({
      success: true,
      message: '操作成功'
    });

  } catch (error) {
    console.error('新增材料价格失败:', error);
    res.status(500).json({
      success: false,
      message: '新增失败',
      error: error.message
    });
  }
});

// 更新材料价格（实际是新增一个版本）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { MaterialName, UnitPrice, Remarks, EffectiveDate } = req.body;

    // 验证必填字段
    if (!MaterialName) {
      return res.status(400).json({
        success: false,
        message: '材料名称为必填项'
      });
    }

    await executeQuery(async (pool) => {
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
      updateRequest.input('UnitPrice', sql.Decimal(10, 2), UnitPrice ? parseFloat(UnitPrice) : null);
      updateRequest.input('Remarks', sql.NVarChar, Remarks || null);

      const updateQuery = `
        UPDATE MaterialPrice
        SET UnitPrice = @UnitPrice,
            Remarks = @Remarks,
            UpdatedDate = GETDATE()
        WHERE ID = @id AND IsActive = 1
      `;
      await updateRequest.query(updateQuery);
    });

    res.json({
      success: true,
      message: '更新成功'
    });

  } catch (error) {
    console.error('更新材料价格失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: error.message
    });
  }
});

// 删除材料价格
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await executeQuery(async (pool) => {
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
    });

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('删除材料价格失败:', error);
    if (error.message === '记录不存在') {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '删除失败',
        error: error.message
      });
    }
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

    // 直接返回调试信息
    res.json({
      success: true,
      message: `调试信息：收到${data.length}条数据`,
      debug: {
        dataCount: data.length,
        firstItem: data[0],
        lastItem: data[data.length - 1]
      }
    });

  } catch (error) {
    console.error('批量导入失败:', error);
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// Excel导出
router.get('/export', async (req, res) => {

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        try {
          console.log(`处理第${i + 1}行数据:`, item);

          // 验证数据
          if (!item.MaterialName) {
            console.log(`第${i + 1}行：材料名称为空，跳过`);
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

          // 检查是否已存在
          const checkRequest = new sql.Request(transaction);
          checkRequest.input('materialName', sql.NVarChar, item.MaterialName);
          checkRequest.input('supplier', sql.NVarChar, item.Supplier || '');

          const checkQuery = `
            SELECT COUNT(*) as count
            FROM MaterialPrice
            WHERE MaterialName = @materialName AND ISNULL(Supplier, '') = @supplier
          `;
          const checkResult = await checkRequest.query(checkQuery);

          if (checkResult.recordset[0].count > 0) {
            // 直接更新现有记录
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
                MaterialName, Supplier, UnitPrice, Unit, Remarks,
                EffectiveDate, CreatedDate, UpdatedDate, Version, IsActive
              ) VALUES (
                @MaterialName, @Supplier, @UnitPrice, NULL, @Remarks,
                GETDATE(), GETDATE(), GETDATE(), 1, 1
              )
            `;
            await insertRequest.query(insertQuery);
          }

          imported++;

        } catch (itemError) {
          console.error(`处理第${i + 1}行数据失败:`, itemError);
          console.error(`错误详情:`, itemError.message);
          console.error(`错误堆栈:`, itemError.stack);
          errors.push(`第${i + 1}行：${itemError.message}`);
          skipped++;
        }
      }

      await transaction.commit();
      console.log(`事务提交成功，导入结果: 成功${imported}条，跳过${skipped}条`);

      return {
        imported,
        skipped,
        errors: errors.slice(0, 10) // 只返回前10个错误
      };

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
    });

    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (!result) {
      console.error('导入失败: executeQuery 返回 null，可能是数据库连接问题');
      console.error('这通常意味着数据库连接失败，所有数据都被跳过了');

      // 返回一个模拟的结果，显示所有数据都被跳过
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
      message: '导入失败',
      error: error.message
    });
  }
});

// Excel导出
router.get('/export', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      // 获取所有当前有效数据
      const query = `
        SELECT
          MaterialName as '材料名称',
          UnitPrice as '单价',
          Supplier as '供应商',
          Remarks as '备注',
          EffectiveDate as '生效日期',
          Version as '版本',
          UpdatedBy as '更新人',
          UpdatedDate as '更新时间'
        FROM MaterialPrice
        WHERE IsActive = 1
        ORDER BY MaterialName, Supplier
      `;

      return await pool.request().query(query);
    });

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result.recordset);

    // 设置列宽
    const colWidths = [
      { wch: 25 }, // 材料名称
      { wch: 12 }, // 单价
      { wch: 18 }, // 供应商
      { wch: 30 }, // 备注
      { wch: 18 }, // 生效日期
      { wch: 8 },  // 版本
      { wch: 12 }, // 更新人
      { wch: 18 }  // 更新时间
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, '材料价格');

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const filename = `材料价格数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    res.send(excelBuffer);

  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
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
      request.input('Supplier', sql.NVarChar, supplier || null);

      let whereClause = 'WHERE MaterialName = @MaterialName';
      if (supplier) {
        whereClause += ' AND Supplier = @Supplier';
      }

      const query = `
        SELECT
          ID,
          MaterialName,
          Supplier,
          UnitPrice,
          Unit,
          Remarks,
          EffectiveDate,
          CreatedDate,
          UpdatedDate,
          Version,
          IsActive
        FROM MaterialPrice
        ${whereClause}
        ORDER BY Version DESC, CreatedDate DESC
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
    res.status(500).json({
      success: false,
      message: '获取历史数据失败',
      error: error.message
    });
  }
});

module.exports = router;
