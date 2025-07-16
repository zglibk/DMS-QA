const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getConnection, sql } = require('../db');
const { v4: uuidv4 } = require('uuid');
const fileCopyConfig = require('../config/path-mapping');
const pathMappingConfig = fileCopyConfig; // 为了兼容性，添加别名
const fileCopyService = require('../services/fileCopyService');

const router = express.Router();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只允许Excel文件
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传Excel文件(.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 限制20MB
  }
});

// 获取ComplaintRegister表的字段映射
const getFieldMapping = () => {
  return {
    'Date': { dbField: 'Date', type: 'date', required: true, label: '投诉日期' },
    'Customer': { dbField: 'Customer', type: 'string', required: true, label: '客户编号' },
    'OrderNo': { dbField: 'OrderNo', type: 'string', required: true, label: '工单号' },
    'ProductName': { dbField: 'ProductName', type: 'string', required: true, label: '产品名称' },
    'Specification': { dbField: 'Specification', type: 'string', required: false, label: '规格' },
    'Workshop': { dbField: 'Workshop', type: 'string', required: false, label: '车间' },
    'ProductionQty': { dbField: 'ProductionQty', type: 'number', required: true, label: '生产数量' },
    'DefectiveQty': { dbField: 'DefectiveQty', type: 'number', required: false, label: '不良数量' },
    'DefectiveRate': { dbField: 'DefectiveRate', type: 'decimal', required: false, label: '不良率' },
    'ComplaintCategory': { dbField: 'ComplaintCategory', type: 'string', required: true, label: '投诉类别' },
    'CustomerComplaintType': { dbField: 'CustomerComplaintType', type: 'string', required: false, label: '客诉类型' },
    'DefectiveCategory': { dbField: 'DefectiveCategory', type: 'string', required: true, label: '不良类别' },
    'DefectiveItem': { dbField: 'DefectiveItem', type: 'string', required: true, label: '不良项' },
    'DefectiveDescription': { dbField: 'DefectiveDescription', type: 'string', required: true, label: '不良描述' },
    'AttachmentFile': { dbField: 'AttachmentFile', type: 'string', required: false, label: '附件文件' },
    'DefectiveReason': { dbField: 'DefectiveReason', type: 'string', required: false, label: '不良原因' },
    'Disposition': { dbField: 'Disposition', type: 'string', required: false, label: '处置方式' },
    'ReturnGoods': { dbField: 'ReturnGoods', type: 'boolean', required: false, label: '退货' },
    'IsReprint': { dbField: 'IsReprint', type: 'boolean', required: false, label: '是否重印' },
    'ReprintQty': { dbField: 'ReprintQty', type: 'number', required: false, label: '重印数量' },
    'Paper': { dbField: 'Paper', type: 'string', required: false, label: '纸张' },
    'PaperSpecification': { dbField: 'PaperSpecification', type: 'string', required: false, label: '纸张规格' },
    'PaperQty': { dbField: 'PaperQty', type: 'number', required: false, label: '纸张数量' },
    'PaperUnitPrice': { dbField: 'PaperUnitPrice', type: 'decimal', required: false, label: '纸张单价' },
    'MaterialA': { dbField: 'MaterialA', type: 'string', required: false, label: '材料A' },
    'MaterialASpec': { dbField: 'MaterialASpec', type: 'string', required: false, label: '材料A规格' },
    'MaterialAQty': { dbField: 'MaterialAQty', type: 'number', required: false, label: '材料A数量' },
    'MaterialAUnitPrice': { dbField: 'MaterialAUnitPrice', type: 'decimal', required: false, label: '材料A单价' },
    'MaterialB': { dbField: 'MaterialB', type: 'string', required: false, label: '材料B' },
    'MaterialBSpec': { dbField: 'MaterialBSpec', type: 'string', required: false, label: '材料B规格' },
    'MaterialBQty': { dbField: 'MaterialBQty', type: 'number', required: false, label: '材料B数量' },
    'MaterialBUnitPrice': { dbField: 'MaterialBUnitPrice', type: 'decimal', required: false, label: '材料B单价' },
    'MaterialC': { dbField: 'MaterialC', type: 'string', required: false, label: '材料C' },
    'MaterialCSpec': { dbField: 'MaterialCSpec', type: 'string', required: false, label: '材料C规格' },
    'MaterialCQty': { dbField: 'MaterialCQty', type: 'number', required: false, label: '材料C数量' },
    'MaterialCUnitPrice': { dbField: 'MaterialCUnitPrice', type: 'decimal', required: false, label: '材料C单价' },
    'LaborCost': { dbField: 'LaborCost', type: 'decimal', required: false, label: '人工成本' },
    'TotalCost': { dbField: 'TotalCost', type: 'decimal', required: false, label: '总成本' },
    'MainDept': { dbField: 'MainDept', type: 'string', required: false, label: '主责部门' },
    'MainPerson': { dbField: 'MainPerson', type: 'string', required: false, label: '主责人' },
    'MainPersonAssessment': { dbField: 'MainPersonAssessment', type: 'decimal', required: false, label: '主责人考核' },
    'SecondPerson': { dbField: 'SecondPerson', type: 'string', required: false, label: '次责人' },
    'SecondPersonAssessment': { dbField: 'SecondPersonAssessment', type: 'decimal', required: false, label: '次责人考核' },
    'Manager': { dbField: 'Manager', type: 'string', required: false, label: '管理者' },
    'ManagerAssessment': { dbField: 'ManagerAssessment', type: 'decimal', required: false, label: '管理者考核' },
    'AssessmentDescription': { dbField: 'AssessmentDescription', type: 'string', required: false, label: '考核说明' }
  };
};

// 获取字段映射信息
router.get('/field-mapping', async (req, res) => {
  try {
    const fieldMapping = getFieldMapping();
    res.json({
      success: true,
      data: fieldMapping
    });
  } catch (error) {
    console.error('获取字段映射失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字段映射失败'
    });
  }
});

// 下载Excel导入模板
router.get('/template', async (req, res) => {
  try {
    const fieldMapping = getFieldMapping();

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 准备表头数据
    const headers = [];
    const sampleData = [];
    const requiredInfo = [];

    Object.keys(fieldMapping).forEach(key => {
      const field = fieldMapping[key];
      headers.push(field.label);

      // 添加示例数据
      switch (field.type) {
        case 'date':
          sampleData.push('2024-01-15');
          break;
        case 'number':
          sampleData.push(field.label.includes('数量') ? 1000 : 1);
          break;
        case 'decimal':
          sampleData.push(field.label.includes('率') ? 0.05 : 100.50);
          break;
        case 'boolean':
          sampleData.push('否');
          break;
        default:
          if (field.label === '客户编号') sampleData.push('CUST001');
          else if (field.label === '工单号') sampleData.push('WO202401001');
          else if (field.label === '产品名称') sampleData.push('产品A');
          else if (field.label === '投诉类别') sampleData.push('客户投诉');
          else if (field.label === '不良类别') sampleData.push('印刷类');
          else if (field.label === '不良项') sampleData.push('色差');
          else if (field.label === '不良描述') sampleData.push('产品颜色与样品存在明显差异');
          else sampleData.push('示例数据');
          break;
      }

      // 标记必填字段
      requiredInfo.push(field.required ? '【必填】' : '【选填】');
    });

    // 创建数据表 - 简化版本，专注于内容而非样式
    const wsData = [
      headers,
      sampleData,
      requiredInfo,
      [], // 空行分隔
      ['填写说明：'],
      ['1. 请严格按照表头格式填写数据'],
      ['2. 【必填】字段必须填写，【选填】字段可以为空'],
      ['3. 日期格式：YYYY-MM-DD（如：2024-01-15）'],
      ['4. 数量字段请填写数字'],
      ['5. 删除示例数据行和说明行，从第4行开始填写实际数据']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 设置列宽 - 根据内容调整宽度
    const colWidths = headers.map(header => {
      let width = Math.max(header.length * 1.2, 10); // 基于字符长度
      if (header.includes('描述') || header.includes('说明')) width = 30;
      else if (header.includes('规格') || header.includes('原因')) width = 20;
      else if (header.includes('数量') || header.includes('单价')) width = 12;
      else if (header.includes('日期')) width = 15;
      return { wch: width };
    });
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '质量异常数据导入模板');

    // 创建详细说明工作表
    const instructionData = [
      ['质量异常数据导入详细说明'],
      [''],
      ['一、使用步骤：'],
      ['1. 在"质量异常数据导入模板"工作表中填写数据'],
      ['2. 删除示例数据行（第2行）和必填标识行（第3行）'],
      ['3. 从第4行开始填写实际数据'],
      ['4. 保存文件后在系统中上传导入'],
      [''],
      ['二、必填字段详细说明：'],
      ['• 投诉日期：质量异常发生的具体日期，格式：YYYY-MM-DD'],
      ['• 客户编号：客户的唯一标识编码，如：CUST001'],
      ['• 工单号：生产工单的编号，如：GD25062801'],
      ['• 产品名称：产品的完整名称'],
      ['• 生产数量：本批次的生产总数量（数字）'],
      ['• 投诉类别：投诉问题的分类（客户投诉/内部质量问题）'],
      ['• 不良类别：不良问题的类别（印刷类/裁切类/包装类等）'],
      ['• 不良项：具体的不良项目（如：色差、尺寸偏差等）'],
      ['• 不良描述：详细的问题描述，建议50字以上'],
      [''],
      ['三、数据格式要求：'],
      ['• 日期：YYYY-MM-DD格式，如：2024-01-15'],
      ['• 日期：空单元格将自动设置为1900-01-01'],
      ['• 工单号：空单元格将自动生成临时编号（如：GD25000000）'],
      ['• 附件文件：支持超链接，本地文件路径将转换为blob格式'],
      ['• 数字：直接填写数字，不要包含单位'],
      ['• 小数：使用小数点，如：0.05'],
      ['• 布尔值：是/否 或 true/false'],
      ['• 文本：避免特殊字符，建议使用中文'],
      [''],
      ['四、注意事项：'],
      ['1. 请确保数据的准确性和完整性'],
      ['2. 必填字段不能为空（日期和工单号字段除外）'],
      ['3. 空日期单元格会自动填充为1900-01-01'],
      ['4. 空工单号会生成临时编号，格式：GD+年份后两位+000000'],
      ['5. 附件文件列可使用Excel超链接功能链接本地文件'],
      ['6. 本地文件路径会自动转换为blob:// 格式存储'],
      ['7. 数据格式要符合要求'],
      ['8. 建议先填写少量数据测试导入'],
      ['9. 如有疑问请联系系统管理员']
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructionData);
    instructionSheet['!cols'] = [{ wch: 60 }];

    // 添加说明工作表
    XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="quality_data_import_template.xlsx"; filename*=UTF-8\'\'%E8%B4%A8%E9%87%8F%E5%BC%82%E5%B8%B8%E6%95%B0%E6%8D%AE%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx');

    res.send(buffer);
  } catch (error) {
    console.error('生成模板失败:', error);
    res.status(500).json({
      success: false,
      message: '生成模板失败: ' + error.message
    });
  }
});

// 预览Excel文件内容
router.post('/preview', upload.single('file'), async (req, res) => {
  console.log('=== 收到Excel预览请求 ===');
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;

    // 如果有多个工作表，返回工作表列表让用户选择
    if (sheetNames.length > 1) {
      // 删除临时文件
      fs.unlinkSync(req.file.path);

      return res.json({
        success: true,
        data: {
          hasMultipleSheets: true,
          sheetNames: sheetNames,
          fileName: req.file.originalname
        }
      });
    }

    // 只有一个工作表，直接预览
    const sheetName = sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 获取表头和前几行数据用于预览
    const headers = jsonData[0] || [];
    const previewData = jsonData.slice(1, 6); // 预览前5行数据

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        hasMultipleSheets: false,
        selectedSheet: sheetName,
        headers,
        previewData,
        totalRows: jsonData.length - 1,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('预览Excel文件失败:', error);
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '预览Excel文件失败: ' + error.message
    });
  }
});

// 预览指定工作表内容
router.post('/preview-sheet', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    const { sheetName } = req.body;
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: '请指定要预览的工作表名称'
      });
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);

    if (!workbook.Sheets[sheetName]) {
      // 删除临时文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `工作表 "${sheetName}" 不存在`
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 获取表头和前几行数据用于预览
    const headers = jsonData[0] || [];
    const previewData = jsonData.slice(1, 6); // 预览前5行数据

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        selectedSheet: sheetName,
        headers,
        previewData,
        totalRows: jsonData.length - 1,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('预览工作表失败:', error);
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '预览工作表失败: ' + error.message
    });
  }
});

// 字段长度限制配置
const FIELD_LENGTH_LIMITS = {
  'Customer': 100,
  'OrderNo': 50,
  'ProductName': 100,
  'Specification': 100,
  'Workshop': 50,
  'ComplaintCategory': 50,
  'CustomerComplaintType': 50,
  'DefectiveCategory': 50,
  'DefectiveItem': 100,
  'DefectiveDescription': 500,
  'AttachmentFile': 500,
  'DefectiveReason': 500,
  'Disposition': 500,
  'Paper': 50,
  'PaperSpecification': 100,
  'MaterialA': 50,
  'MaterialASpec': 100,
  'MaterialB': 50
};

// 数据类型转换函数
const convertValue = (value, type, fieldKey = null, worksheet = null, cellAddress = null) => {
  if (value === null || value === undefined || value === '') {
    // 特殊处理：工单号空值生成临时编号
    if (fieldKey === 'OrderNo') {
      return generateTempOrderNo();
    }
    // 特殊处理：布尔值字段空值转换为0
    if (type === 'boolean') {
      return 0;
    }
    return null;
  }

  // 特殊处理：附件文件字段的超链接提取
  if (fieldKey === 'AttachmentFile' && worksheet && cellAddress) {
    const hyperlinkInfo = extractHyperlinkFromCell(worksheet, cellAddress);
    if (hyperlinkInfo) {
      const processedPath = processAttachmentPath(hyperlinkInfo);
      if (processedPath) {
        // 返回blob URL格式的路径
        let result = processedPath.blobUrl;
        // 检查长度限制
        if (FIELD_LENGTH_LIMITS[fieldKey] && result.length > FIELD_LENGTH_LIMITS[fieldKey]) {
          result = result.substring(0, FIELD_LENGTH_LIMITS[fieldKey]);
        }
        return result;
      }
    }
    // 如果没有超链接，返回原始文本值
    let result = String(value).trim();
    // 检查长度限制
    if (FIELD_LENGTH_LIMITS[fieldKey] && result.length > FIELD_LENGTH_LIMITS[fieldKey]) {
      result = result.substring(0, FIELD_LENGTH_LIMITS[fieldKey]);
    }
    return result;
  }

  let result;
  switch (type) {
    case 'date':
      // 处理空值：空日期设置为1900-01-01
      if (!value || value === '' || value === null || value === undefined) {
        return '1900-01-01';
      }

      if (typeof value === 'number' && value > 1 && value < 100000) {
        // 由45566 = 2024-10-01，反推Excel 日期转换公式
        const knownDate = new Date('2024-10-01');
        const knownExcelNumber = 45566;
        const excelEpoch = new Date(knownDate.getTime() - knownExcelNumber * 24 * 60 * 60 * 1000);
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }
      // 尝试智能转换
      const convertedDate = tryConvertToDate(value);
      if (convertedDate) {
        return convertedDate;
      }
      return new Date(value).toISOString().split('T')[0];
    case 'number':
      return parseInt(value) || 0;
    case 'decimal':
      return parseFloat(value) || 0;
    case 'boolean':
      // 处理中文"是"/"否"和其他布尔值格式，返回数值类型以适配数据库bit字段
      if (value === '是' || value === true || value === 1 || value === '1' || value === 'true') {
        return 1; // 返回数值1
      }
      if (value === '否' || value === false || value === 0 || value === '0' || value === 'false') {
        return 0; // 返回数值0
      }
      // 默认情况下返回0
      return 0;
    case 'string':
    default:
      result = String(value).trim();
      // 检查长度限制
      if (FIELD_LENGTH_LIMITS[fieldKey] && result.length > FIELD_LENGTH_LIMITS[fieldKey]) {
        result = result.substring(0, FIELD_LENGTH_LIMITS[fieldKey]);
      }
      return result;
  }
};

// 数据校验和转换
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    const { selectedFields, columnMapping, selectedSheet, applyConversions, strictValidation } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    if (!selectedFields || !columnMapping) {
      return res.status(400).json({
        success: false,
        message: '请配置字段映射'
      });
    }

    // 解析JSON参数
    const fields = JSON.parse(selectedFields);
    const mapping = JSON.parse(columnMapping);

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = selectedSheet || workbook.SheetNames[0];

    if (!workbook.Sheets[sheetName]) {
      return res.status(400).json({
        success: false,
        message: `工作表 "${sheetName}" 不存在`
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: '文件中没有有效的数据行'
      });
    }

    const headers = jsonData[0];
    // 过滤掉完全空的行
    const allDataRows = jsonData.slice(1);
    const dataRows = allDataRows.filter(row => {
      // 检查行是否有任何非空值
      return row && row.some(cell =>
        cell !== null &&
        cell !== undefined &&
        cell !== '' &&
        String(cell).trim() !== ''
      );
    });

    console.log(`Excel总行数: ${allDataRows.length}, 有效数据行数: ${dataRows.length}`);
    const fieldMapping = getFieldMapping();

    // 解析转换配置
    console.log('applyConversions参数:', applyConversions);
    let conversions = [];
    if (applyConversions) {
      try {
        conversions = JSON.parse(applyConversions);
        if (!Array.isArray(conversions)) {
          console.warn('转换配置不是数组，重置为空数组');
          conversions = [];
        }
      } catch (error) {
        console.error('解析转换配置失败:', error);
        conversions = [];
      }
    }
    console.log('解析后的转换配置:', conversions);

    // 数据校验和转换建议
    const validationResults = {
      totalRows: dataRows.length,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      warnings: [],
      conversions: [],
      summary: {
        hasErrors: false,
        hasWarnings: false,
        hasConversions: false,
        canImport: true
      }
    };

    // 创建原始行号映射
    const originalRowNumbers = [];
    let currentOriginalRow = 2; // 从第2行开始（第1行是标题）

    for (let i = 0; i < allDataRows.length; i++) {
      const row = allDataRows[i];
      if (row && row.some(cell =>
        cell !== null &&
        cell !== undefined &&
        cell !== '' &&
        String(cell).trim() !== ''
      )) {
        originalRowNumbers.push(currentOriginalRow);
      }
      currentOriginalRow++;
    }

    // 逐行验证数据
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex];
      const rowNumber = originalRowNumbers[rowIndex]; // 使用原始Excel行号
      let hasError = false;

      // 验证每个选中的字段
      for (const fieldKey of fields) {
        const field = fieldMapping[fieldKey];
        const columnIndex = mapping[fieldKey];
        const cellValue = row[columnIndex];

        // 检查必填字段
        const isStrictMode = strictValidation === 'true';
        let shouldValidateRequired = false;

        if (isStrictMode) {
          // 严格模式：按代码定义的必填字段校验（日期字段和工单号字段的空值会被转换为默认值，所以不报错）
          shouldValidateRequired = field.required && field.type !== 'date' && fieldKey !== 'OrderNo';
        } else {
          // 宽松模式：仅校验数据库必填字段（投诉日期、客户编号）
          // 注意：Date字段的空值会被转换为默认值1900-01-01，所以不需要校验
          // Customer字段是数据库真正的必填字段
          shouldValidateRequired = fieldKey === 'Customer';
        }

        if (shouldValidateRequired && (cellValue === undefined || cellValue === null || cellValue === '')) {
          validationResults.errors.push({
            row: rowNumber,
            column: headers[columnIndex] || `列${columnIndex + 1}`,
            field: field.label,
            value: cellValue,
            message: isStrictMode ? `必填字段不能为空` : `数据库必填字段不能为空`
          });
          hasError = true;
          continue;
        }

        // 跳过空值的非必填字段（但工单号和日期字段的空值需要处理）
        if (!field.required && (cellValue === undefined || cellValue === null || cellValue === '') && field.type !== 'date' && fieldKey !== 'OrderNo') {
          continue;
        }

        // 检查是否有已应用的转换
        const appliedConversion = Array.isArray(conversions) ? conversions.find(c =>
          c.row === rowNumber &&
          c.field === field.label
        ) : null;

        // 如果有已应用的转换，使用转换后的值进行校验
        let valueToValidate = cellValue;
        if (appliedConversion) {
          valueToValidate = appliedConversion.convertedValue;
        }

        // 数据类型验证和转换建议
        // 计算Excel单元格地址（用于超链接提取）
        const cellAddress = XLSX.utils.encode_cell({r: rowIndex + 1, c: columnIndex}); // rowIndex+1因为第0行是标题
        const validationResult = validateAndSuggestConversion(valueToValidate, field, rowNumber, headers[columnIndex] || `列${columnIndex + 1}`, fieldKey, worksheet, cellAddress, appliedConversion);

        if (validationResult.error) {
          validationResults.errors.push(validationResult.error);
          hasError = true;
        }

        if (validationResult.warning) {
          validationResults.warnings.push(validationResult.warning);
        }

        if (validationResult.conversion) {
          validationResults.conversions.push(validationResult.conversion);
        }
      }

      if (!hasError) {
        validationResults.validRows++;
      } else {
        validationResults.invalidRows++;
      }
    }

    // 更新汇总信息
    validationResults.summary.hasErrors = validationResults.errors.length > 0;
    validationResults.summary.hasWarnings = validationResults.warnings.length > 0;
    validationResults.summary.hasConversions = validationResults.conversions.length > 0;
    validationResults.summary.canImport = validationResults.errors.length === 0;

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: validationResults
    });

  } catch (error) {
    console.error('数据校验失败:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '数据校验失败: ' + error.message
    });
  }
});

// 数据验证和转换建议函数
function validateAndSuggestConversion(value, field, rowNumber, columnName, fieldKey = null, worksheet = null, cellAddress = null, appliedConversion = null) {
  const result = {
    error: null,
    warning: null,
    conversion: null
  };

  // 如果已经应用了转换，不再生成新的转换建议
  if (appliedConversion) {
    // 对转换后的值进行基本校验，但不生成新的转换建议
    return result;
  }

  switch (field.type) {
    case 'date':
      if (!isValidDate(value)) {
        // 尝试智能转换
        const convertedDate = tryConvertToDate(value);
        if (convertedDate) {
          // 检查是否是空值转换为默认日期
          const isEmptyValue = !value || value === '' || value === null || value === undefined;
          // 检查是否是Excel日期数字格式
          const isExcelNumber = typeof value === 'number' && value > 1 && value < 100000;

          result.conversion = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            originalValue: value,
            convertedValue: convertedDate,
            type: isEmptyValue ? 'empty_date_default' : (isExcelNumber ? 'excel_date_number' : 'date_format'),
            message: isEmptyValue
              ? `空日期转换为默认日期 "${convertedDate}"`
              : (isExcelNumber
                ? `Excel日期数字 "${value}" 转换为日期格式 "${convertedDate}"`
                : `将 "${value}" 转换为日期格式 "${convertedDate}"`)
          };
        } else {
          result.error = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            value: value,
            message: `日期格式不正确，期望格式：YYYY-MM-DD 或 Excel日期数字`
          };
        }
      }
      break;

    case 'number':
      // 对于空值，如果字段不是必填的，则允许通过
      if (value === null || value === undefined || value === '') {
        if (!field.required) {
          // 非必填字段的空值是允许的
          break;
        }
        // 必填字段的空值会在前面的必填校验中处理，这里不需要额外处理
      } else if (!isValidNumber(value)) {
        const convertedNumber = tryConvertToNumber(value);
        if (convertedNumber !== null) {
          result.conversion = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            originalValue: value,
            convertedValue: convertedNumber,
            type: 'number',
            message: `将 "${value}" 转换为数字 "${convertedNumber}"`
          };
        } else {
          result.error = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            value: value,
            message: `数字格式不正确`
          };
        }
      }
      break;

    case 'decimal':
      // 对于空值，如果字段不是必填的，则允许通过
      if (value === null || value === undefined || value === '') {
        if (!field.required) {
          // 非必填字段的空值是允许的
          break;
        }
        // 必填字段的空值会在前面的必填校验中处理，这里不需要额外处理
      } else if (!isValidDecimal(value)) {
        const convertedDecimal = tryConvertToDecimal(value);
        if (convertedDecimal !== null) {
          result.conversion = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            originalValue: value,
            convertedValue: convertedDecimal,
            type: 'decimal',
            message: `将 "${value}" 转换为小数 "${convertedDecimal}"`
          };
        } else {
          result.error = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            value: value,
            message: `小数格式不正确`
          };
        }
      }
      break;

    case 'boolean':
      if (!isValidBoolean(value)) {
        const convertedBoolean = tryConvertToBoolean(value);
        if (convertedBoolean !== null) {
          // 显示用户友好的文本
          const displayValue = convertedBoolean === 1 ? '是' : '否';
          result.conversion = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            originalValue: value,
            convertedValue: convertedBoolean,
            type: 'boolean',
            message: `将 "${value}" 转换为布尔值 "${displayValue}"`
          };
        } else {
          result.error = {
            row: rowNumber,
            column: columnName,
            field: field.label,
            value: value,
            message: `布尔值格式不正确，期望：是/否、true/false、1/0`
          };
        }
      }
      break;

    default:
      // 字符串类型处理

      // 特殊处理：工单号空值
      if (fieldKey === 'OrderNo' && (!value || value === '' || value === null || value === undefined)) {
        const tempOrderNo = tryConvertToOrderNo(value);
        result.conversion = {
          row: rowNumber,
          column: columnName,
          field: field.label,
          originalValue: value,
          convertedValue: tempOrderNo,
          type: 'empty_order_temp',
          message: `空工单号生成临时编号 "${tempOrderNo}"`
        };
      }
      // 特殊处理：附件文件超链接
      else if (fieldKey === 'AttachmentFile' && worksheet && cellAddress) {
        const hyperlinkInfo = extractHyperlinkFromCell(worksheet, cellAddress);
        if (hyperlinkInfo) {
          const processedPath = processAttachmentPath(hyperlinkInfo);
          if (processedPath && processedPath.isConverted) {
            result.conversion = {
              row: rowNumber,
              column: columnName,
              field: field.label,
              originalValue: value,
              convertedValue: processedPath.blobUrl,
              type: 'hyperlink_to_blob',
              message: `超链接文件 "${processedPath.fileName}" 转换为blob路径 "${processedPath.blobUrl}"`
            };
          }
        }
      }
      // 检查字符串长度
      else if (typeof value === 'string' && value.length > 255) {
        result.warning = {
          row: rowNumber,
          column: columnName,
          field: field.label,
          value: value,
          message: `文本长度超过255字符，可能会被截断`
        };
      }
      break;
  }

  return result;
}

// 辅助验证函数
function isValidDate(value) {
  if (!value) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
}

// 生成临时工单号
function generateTempOrderNo() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // 年份后两位
  return `GD${year}000000`;
}

// 尝试转换工单号
function tryConvertToOrderNo(value) {
  // 处理空值：空工单号生成临时编号
  if (!value || value === '' || value === null || value === undefined) {
    return generateTempOrderNo();
  }

  // 非空值直接返回字符串形式
  return String(value).trim();
}

// 生成blob URL格式的文件路径
function generateBlobUrl() {
  // 生成UUID格式的blob URL
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  return `blob:http://localhost:5173/${uuid}`;
}

// 提取Excel单元格中的超链接
function extractHyperlinkFromCell(worksheet, cellAddress) {
  const cell = worksheet[cellAddress];
  if (!cell) return null;

  // 检查是否有超链接信息
  if (cell.l) {
    let hyperlink = cell.l.Target || cell.l.target || cell.l;

    // 处理中文路径的编码问题
    if (typeof hyperlink === 'string') {
      try {
        // 方法1：如果超链接包含URL编码，尝试解码
        if (hyperlink.includes('%')) {
          hyperlink = decodeURIComponent(hyperlink);
        }

        // 方法2：处理可能的双重编码问题
        if (hyperlink.includes('%')) {
          try {
            hyperlink = decodeURIComponent(hyperlink);
          } catch (e2) {
            console.warn('二次解码失败:', e2.message);
          }
        }

        // 方法2.5：中文编码修复和路径映射转换
        try {
          // 首先尝试修复中文编码问题
          if (hyperlink.includes('å') || hyperlink.includes('æ') || hyperlink.includes('è') ||
              hyperlink.includes('ä¸') || hyperlink.includes('ä»') || hyperlink.includes('ç')) {
            console.log('检测到中文编码问题，尝试修复...');
            try {
              // 方法1：尝试从Latin-1转换为UTF-8
              const buffer = Buffer.from(hyperlink, 'latin1');
              const fixedHyperlink = buffer.toString('utf8');
              if (fixedHyperlink !== hyperlink && !fixedHyperlink.includes('�')) {
                console.log('中文编码修复成功 (Latin-1->UTF-8):', {
                  original: hyperlink,
                  fixed: fixedHyperlink
                });
                hyperlink = fixedHyperlink;
              } else {
                // 方法2：尝试手动字符替换
                let manualFixed = hyperlink
                  .replace(/å¹´/g, '年')
                  .replace(/æä»½/g, '月份')
                  .replace(/ä¸æ/g, '上午')
                  .replace(/ä¸å/g, '下午')
                  .replace(/ä¸/g, '不')
                  .replace(/è¯/g, '良')
                  .replace(/å¾ç/g, '图片')
                  .replace(/è²å·®/g, '色差')
                  .replace(/ç¼ºé·/g, '缺陷')
                  .replace(/æ±æ»/g, '汇总')
                  .replace(/ç»è®¡/g, '统计');

                if (manualFixed !== hyperlink) {
                  console.log('中文编码修复成功 (手动替换):', {
                    original: hyperlink,
                    fixed: manualFixed
                  });
                  hyperlink = manualFixed;
                }
              }
            } catch (encodingError) {
              console.log('中文编码修复失败:', encodingError.message);
            }
          }

          // 然后进行路径映射转换
          const excelTempPath = 'C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel';

          // 移除file:///前缀进行比较
          let cleanHyperlink = hyperlink;
          if (cleanHyperlink.startsWith('file:///')) {
            cleanHyperlink = cleanHyperlink.substring(8);
          }

          // 检查是否匹配Excel临时路径
          if (cleanHyperlink.startsWith(excelTempPath)) {
            // 提取相对路径部分
            let relativePath = cleanHyperlink.substring(excelTempPath.length);
            // 移除开头的反斜杠
            relativePath = relativePath.replace(/^\\+/, '');
            // 统一使用反斜杠
            relativePath = relativePath.replace(/\//g, '\\');

            // 修复HTML实体编码问题
            relativePath = relativePath.replace(/&amp;/g, '&');

            // 构建完整的HTTP URL而不是相对路径
            // 使用环境变量或默认值，避免硬编码IP地址
            const serverIP = process.env.SERVER_IP || process.env.DB_SERVER || 'localhost';
            const fileServerPort = process.env.FILE_SERVER_PORT || '3001';

            // 将路径转换为URL编码格式
            const pathParts = relativePath.split('\\').filter(part => part.trim() !== '');
            const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/');
            const httpUrl = `http://${serverIP}:${fileServerPort}/shared-files/${encodedPath}`;

            console.log('路径映射转换为HTTP URL:', {
              original: hyperlink,
              excelTempPath: excelTempPath,
              relativePath: relativePath,
              httpUrl: httpUrl
            });

            require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - 路径映射转换: ${hyperlink} -> ${httpUrl}\n`);
            // 使用完整的HTTP URL
            hyperlink = httpUrl;
          }
        } catch (e3) {
          console.log('路径处理失败:', e3.message);
        }

        // 方法3：处理file:///协议的路径
        if (hyperlink.startsWith('file:///')) {
          // 移除file:///前缀，然后处理路径
          let filePath = hyperlink.substring(8); // 移除file:///

          // 如果还有编码字符，尝试解码
          if (filePath.includes('%')) {
            try {
              filePath = decodeURIComponent(filePath);
            } catch (e3) {
              console.warn('文件路径解码失败:', e3.message);
            }
          }

          // 修复HTML实体编码问题
          filePath = filePath.replace(/&amp;/g, '&');

          // 检查是否是网络路径，如果是则转换为相对路径格式
          const networkSharePath = '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\';
          if (filePath.startsWith(networkSharePath)) {
            // 提取相对路径部分
            const relativePath = filePath.substring(networkSharePath.length);
            hyperlink = relativePath;
          } else {
            // 保持原有格式但移除file:///前缀
            hyperlink = filePath;
          }
        }

        // 方法4：处理相对路径格式的超链接
        else if (hyperlink.startsWith('../../')) {
          // 分析相对路径，根据实际情况转换
          const relativePath = hyperlink.substring(6); // 移除 ../../

          // 根据提供的信息，实际文件在网络共享位置
          // ../../TJ/AppData/Roaming/Microsoft/Excel/2025年异常汇总
          // 应该转换为相对路径格式：2025年异常汇总\...

          let finalPath;
          if (relativePath.includes('TJ/AppData/Roaming/Microsoft/Excel/')) {
            // 提取Excel路径后的部分
            const excelPathIndex = relativePath.indexOf('TJ/AppData/Roaming/Microsoft/Excel/');
            const afterExcelPath = relativePath.substring(excelPathIndex + 'TJ/AppData/Roaming/Microsoft/Excel/'.length);

            // 转换为相对路径格式，统一使用反斜杠
            finalPath = afterExcelPath.replace(/\//g, '\\');
            // 修复HTML实体编码问题
            finalPath = finalPath.replace(/&amp;/g, '&');
          } else {
            // 如果不匹配预期格式，保持原有逻辑
            finalPath = relativePath.replace(/\//g, '\\');
            finalPath = finalPath.replace(/&amp;/g, '&');
          }

          console.log('相对路径转换:', {
            original: hyperlink,
            relativePath: relativePath,
            finalPath: finalPath
          });
          require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - 相对路径转换: ${hyperlink} -> ${finalPath}\n`);
          // 统一使用相对路径格式
          hyperlink = finalPath;
        }

        const debugInfo = {
          original: cell.l.Target || cell.l.target || cell.l,
          decoded: hyperlink,
          originalType: typeof (cell.l.Target || cell.l.target || cell.l),
          decodedType: typeof hyperlink,
          startsWithFile: hyperlink.startsWith('file:///'),
          length: hyperlink.length
        };
        console.log('超链接解码结果:', debugInfo);
        require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - 超链接解码详情: ${JSON.stringify(debugInfo)}\n`);

        // 尝试更多的解码方法
        if (hyperlink.includes('å') || hyperlink.includes('ä') || hyperlink.includes('è')) {
          console.log('检测到可能的编码问题，尝试其他解码方法...');

          // 方法4：尝试将错误编码的字符串重新编码
          try {
            // 将字符串转换为Buffer，然后重新解码为UTF-8
            const buffer = Buffer.from(hyperlink, 'latin1');
            const utf8Decoded = buffer.toString('utf8');
            console.log('Buffer解码尝试:', utf8Decoded);

            if (utf8Decoded !== hyperlink && !utf8Decoded.includes('�')) {
              hyperlink = utf8Decoded;
              console.log('使用Buffer解码结果');
            }
          } catch (e) {
            console.warn('Buffer解码失败:', e.message);
          }
        }

      } catch (e) {
        console.warn('超链接解码失败，使用原链接:', e.message);
      }
    }

    return {
      text: cell.v || '',
      hyperlink: hyperlink,
      tooltip: cell.l.Tooltip || cell.l.tooltip || ''
    };
  }

  return null;
}

// 标准化路径处理函数 - 统一处理数据库中的两种路径格式
function normalizeAttachmentPath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') {
    return null;
  }

  let normalizedPath = pathValue.trim();

  // 修复HTML实体编码问题（&amp; -> &）
  normalizedPath = normalizedPath.replace(/&amp;/g, '&');

  // 处理格式1：file:///\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...
  if (normalizedPath.startsWith('file:///\\\\tj_server\\工作\\')) {
    // 移除file:///前缀，保留网络路径
    normalizedPath = normalizedPath.substring(8); // 移除'file:///'
    return {
      type: 'network_path',
      originalPath: pathValue,
      networkPath: normalizedPath,
      isAccessible: true,
      displayPath: normalizedPath.replace(/\\\\/g, '\\')
    };
  }

  // 处理格式2：2025年异常汇总\3月份\不良图片\...（相对路径）
  if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
    // 构建完整的网络路径
    const fullNetworkPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${normalizedPath}`;
    return {
      type: 'relative_path',
      originalPath: pathValue,
      networkPath: fullNetworkPath,
      isAccessible: true,
      displayPath: fullNetworkPath
    };
  }

  // 处理其他格式（本地路径等）
  return {
    type: 'other',
    originalPath: pathValue,
    networkPath: normalizedPath,
    isAccessible: false,
    displayPath: normalizedPath
  };
}

// 处理附件文件路径转换（同步版本，用于现有代码）
function processAttachmentPath(hyperlinkInfo) {
  if (!hyperlinkInfo || !hyperlinkInfo.hyperlink) {
    return null;
  }

  let originalPath = hyperlinkInfo.hyperlink;

  // 修复HTML实体编码问题（&amp; -> &）
  originalPath = originalPath.replace(/&amp;/g, '&');

  // 统一路径格式处理
  let processedPath = originalPath;

  // 移除file:///前缀（如果存在）
  if (processedPath.startsWith('file:///')) {
    processedPath = processedPath.substring(8);
  }

  // 统一路径分隔符为反斜杠
  processedPath = processedPath.replace(/\//g, '\\');

  // 检查是否是本地Excel临时路径，需要转换为网络路径
  const excelTempPath = 'C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel';
  const networkSharePath = '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计';

  if (processedPath.startsWith(excelTempPath)) {
    // 提取相对路径部分
    const relativePath = processedPath.substring(excelTempPath.length);
    // 构建网络共享路径，统一格式为相对路径
    const networkRelativePath = relativePath.replace(/^\\+/, '').replace(/\//g, '\\');

    // 检查是否是2025年异常汇总路径，需要特殊处理
    if (networkRelativePath.startsWith('2025年异常汇总\\')) {
      // 构建完整的HTTP URL而不是相对路径
      // 使用环境变量或默认值，避免硬编码IP地址
      const serverIP = process.env.SERVER_IP || process.env.DB_SERVER || 'localhost';
      const fileServerPort = process.env.FILE_SERVER_PORT || '3001';

      // 将路径转换为URL编码格式
      const pathParts = networkRelativePath.split('\\').filter(part => part.trim() !== '');
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/');
      const httpUrl = `http://${serverIP}:${fileServerPort}/shared-files/${encodedPath}`;

      console.log('路径转换为HTTP URL:', {
        original: originalPath,
        processed: processedPath,
        relativePath: relativePath,
        networkRelativePath: networkRelativePath,
        httpUrl: httpUrl
      });

      return {
        originalPath: originalPath,
        blobUrl: httpUrl, // 使用完整的HTTP URL
        fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
        isConverted: true,
        copyMode: false,
        needsCopy: false
      };
    }
  }

  // 如果已经是相对路径格式，直接使用
  if (!processedPath.includes(':\\') && !processedPath.startsWith('\\\\')) {
    return {
      originalPath: originalPath,
      blobUrl: processedPath, // 保持相对路径格式
      fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
      isConverted: false,
      copyMode: false,
      needsCopy: false
    };
  }

  // 检查是否是本地文件路径
  const isLocalPath = processedPath.match(/^[A-Za-z]:\\/) ||
                     processedPath.startsWith('./') ||
                     processedPath.startsWith('../');

  if (isLocalPath) {
    // 标记为需要拷贝的本地文件
    return {
      originalPath: originalPath,
      blobUrl: processedPath, // 保持原路径，等待异步拷贝处理
      fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
      isConverted: false,
      copyMode: false,
      needsCopy: true
    };
  }

  // 如果不是本地路径，直接返回原路径
  return {
    originalPath: originalPath,
    blobUrl: originalPath,
    fileName: hyperlinkInfo.text || originalPath,
    isConverted: false,
    copyMode: false,
    needsCopy: false
  };
}

// 处理附件文件路径转换（异步版本，支持文件拷贝）
async function processAttachmentPathAsync(hyperlinkInfo, useCopyMode = false) {
  if (!hyperlinkInfo || !hyperlinkInfo.hyperlink) {
    return null;
  }

  const originalPath = hyperlinkInfo.hyperlink;

  // 检查是否是本地文件路径
  const isLocalPath = originalPath.startsWith('file:///') ||
                     originalPath.match(/^[A-Za-z]:\\/) ||
                     originalPath.startsWith('./') ||
                     originalPath.startsWith('../');

  if (isLocalPath) {
    // 根据配置选择处理方式
    // 添加调试信息
    console.log('processAttachmentPathAsync - pathMappingConfig:', pathMappingConfig);
    console.log('processAttachmentPathAsync - useCopyMode:', useCopyMode);

    if (useCopyMode && pathMappingConfig && pathMappingConfig.fileCopy && pathMappingConfig.fileCopy.enabled) {
      // 文件拷贝模式
      try {
        const copyResult = await fileCopyService.copyFileToServer(originalPath);

        if (copyResult.success) {
          return {
            originalPath: originalPath,
            blobUrl: copyResult.accessUrl,
            fileName: hyperlinkInfo.text || copyResult.fileName,
            isConverted: true,
            copyMode: true,
            copyResult: copyResult
          };
        } else {
          console.warn('文件拷贝失败，保留原路径:', copyResult.error);
          // 拷贝失败时保留原路径
          return {
            originalPath: originalPath,
            blobUrl: originalPath,
            fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
            isConverted: false,
            copyMode: false,
            copyError: copyResult.error
          };
        }
      } catch (error) {
        console.error('文件拷贝过程出错:', error);
        // 出错时保留原路径
        return {
          originalPath: originalPath,
          blobUrl: originalPath,
          fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
          isConverted: false,
          copyMode: false,
          copyError: error.message
        };
      }
    } else {
      // 不使用拷贝模式时，保留原路径
      return {
        originalPath: originalPath,
        blobUrl: originalPath,
        fileName: hyperlinkInfo.text || extractFileNameFromPath(originalPath),
        isConverted: false,
        copyMode: false
      };
    }
  }

  // 如果不是本地路径，直接返回原路径
  return {
    originalPath: originalPath,
    blobUrl: originalPath,
    fileName: hyperlinkInfo.text || originalPath,
    isConverted: false,
    copyMode: false
  };
}

// 从路径中提取文件名
function extractFileNameFromPath(filePath) {
  if (!filePath) return '';

  // 处理不同格式的路径
  let fileName = filePath;

  // 移除file:///前缀
  if (fileName.startsWith('file:///')) {
    fileName = fileName.substring(8);
  }

  // 处理URL编码的中文文件名
  try {
    if (fileName.includes('%')) {
      fileName = decodeURIComponent(fileName);
    }
  } catch (e) {
    console.warn('文件名解码失败，使用原文件名:', e.message);
  }

  // 提取最后的文件名部分
  const lastSlash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
  if (lastSlash >= 0) {
    fileName = fileName.substring(lastSlash + 1);
  }

  return fileName || '未知文件';
}



function tryConvertToDate(value) {
  // 处理空值：空日期设置为1900-01-01
  if (!value || value === '' || value === null || value === undefined) {
    return '1900-01-01';
  }

  // 检查是否是Excel日期数字格式
  if (typeof value === 'number' && value > 1 && value < 100000) {
    try {
      // 反推Excel epoch：2024-10-01 - 45566天 = 1899-12-31
      const knownDate = new Date('2024-10-01');
      const knownExcelNumber = 45566;
      const excelEpoch = new Date(knownDate.getTime() - knownExcelNumber * 24 * 60 * 60 * 1000);

      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

      if (date instanceof Date && !isNaN(date)) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.log('Excel日期转换失败:', error);
    }
  }

  // 尝试各种日期格式
  const formats = [
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/, // YYYY-MM-DD or YYYY/MM/DD
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, // MM-DD-YYYY or MM/DD/YYYY
    /^(\d{4})(\d{2})(\d{2})$/ // YYYYMMDD
  ];

  for (const format of formats) {
    const match = String(value).match(format);
    if (match) {
      let year, month, day;
      if (format === formats[0]) { // YYYY-MM-DD
        [, year, month, day] = match;
      } else if (format === formats[1]) { // MM-DD-YYYY
        [, month, day, year] = match;
      } else if (format === formats[2]) { // YYYYMMDD
        [, year, month, day] = [match[0], match[1], match[2], match[3]];
        year = match[1];
        month = match[2];
        day = match[3];
      }

      const date = new Date(year, month - 1, day);
      if (date instanceof Date && !isNaN(date)) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  return null;
}

function isValidNumber(value) {
  return !isNaN(value) && isFinite(value);
}

function tryConvertToNumber(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[,\s]/g, ''); // 移除逗号和空格
  const num = Number(cleaned);
  return isNaN(num) ? null : Math.floor(num);
}

function isValidDecimal(value) {
  return !isNaN(value) && isFinite(value);
}

function tryConvertToDecimal(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[,\s]/g, ''); // 移除逗号和空格
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function isValidBoolean(value) {
  // 空值也被认为是有效的布尔值（将转换为0）
  if (value === null || value === undefined || value === '') {
    return true;
  }
  const booleanValues = ['是', '否', 'true', 'false', '1', '0', 1, 0, true, false];
  return booleanValues.includes(value);
}

function tryConvertToBoolean(value) {
  // 处理空值：空值转换为0（否）
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const trueValues = ['是', 'true', '1', 1, true];
  const falseValues = ['否', 'false', '0', 0, false];

  if (trueValues.includes(value)) return 1; // 返回数值1（是）
  if (falseValues.includes(value)) return 0; // 返回数值0（否）
  return null;
}

// 执行导入
router.post('/execute', upload.single('file'), async (req, res) => {
  console.log('=== 收到普通导入请求 ===');
  let connection;
  try {
    const { selectedFields, columnMapping, selectedSheet, applyConversions, sessionId, strictValidation } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    if (!selectedFields || selectedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个要导入的字段'
      });
    }

    // 解析JSON参数
    const fields = JSON.parse(selectedFields);
    const mapping = JSON.parse(columnMapping);
    let conversions = [];
    if (applyConversions) {
      try {
        conversions = JSON.parse(applyConversions);
        if (!Array.isArray(conversions)) {
          conversions = [];
        }
      } catch (error) {
        console.error('解析转换配置失败:', error);
        conversions = [];
      }
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = selectedSheet || workbook.SheetNames[0];

    if (!workbook.Sheets[sheetName]) {
      return res.status(400).json({
        success: false,
        message: `工作表 "${sheetName}" 不存在`
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有数据行'
      });
    }

    const headers = jsonData[0];
    // 过滤掉完全空的行
    const allDataRows = jsonData.slice(1);
    const dataRows = allDataRows.filter(row => {
      // 检查行是否有任何非空值
      return row && row.some(cell =>
        cell !== null &&
        cell !== undefined &&
        cell !== '' &&
        String(cell).trim() !== ''
      );
    });

    console.log(`导入执行 - Excel总行数: ${allDataRows.length}, 有效数据行数: ${dataRows.length}`);
    const fieldMapping = getFieldMapping();

    // 获取数据库连接
    connection = await getConnection();

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const totalRows = dataRows.length;

    // 初始化进度
    if (sessionId) {
      updateProgress(sessionId, 0, totalRows, 'processing', '开始导入数据...');
    }

    // 开始事务
    const transaction = new sql.Transaction(connection);
    await transaction.begin();

    // 创建原始行号映射（与校验时保持一致）
    const originalRowNumbers = [];
    let currentOriginalRow = 2; // 从第2行开始（第1行是标题）

    for (let i = 0; i < allDataRows.length; i++) {
      const row = allDataRows[i];
      if (row && row.some(cell =>
        cell !== null &&
        cell !== undefined &&
        cell !== '' &&
        String(cell).trim() !== ''
      )) {
        originalRowNumbers.push(currentOriginalRow);
      }
      currentOriginalRow++;
    }

    try {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const originalRowNumber = originalRowNumbers[i]; // 使用原始Excel行号
        const rowData = {};

        // 根据字段映射转换数据
        for (const field of fields) {
          const fieldInfo = fieldMapping[field];
          if (!fieldInfo) continue;

          const columnIndex = mapping[field];
          if (columnIndex !== undefined && columnIndex < row.length) {
            let rawValue = row[columnIndex];

            // 应用转换（使用原始行号）
            const conversion = Array.isArray(conversions) ? conversions.find(c =>
              c.row === originalRowNumber &&
              c.field === fieldInfo.label
            ) : null;

            if (conversion) {
              rawValue = conversion.convertedValue;
            }

            // 计算Excel单元格地址（用于超链接提取）
            const cellAddress = XLSX.utils.encode_cell({r: i + 1, c: columnIndex}); // i+1因为第0行是标题

            rowData[fieldInfo.dbField] = convertValue(rawValue, fieldInfo.type, field, worksheet, cellAddress);
          }
        }

        // 验证必填字段
        const missingRequired = [];
        const isStrictMode = strictValidation === 'true';

        for (const field of fields) {
          const fieldInfo = fieldMapping[field];
          if (fieldInfo && !rowData[fieldInfo.dbField]) {
            let shouldValidateRequired = false;

            if (isStrictMode) {
              // 严格模式：按代码定义的必填字段校验（日期字段和工单号字段的空值会被转换为默认值，所以不报错）
              shouldValidateRequired = fieldInfo.required && fieldInfo.type !== 'date' && field !== 'OrderNo';
            } else {
              // 宽松模式：只验证数据库真正的必填字段（Customer）
              // Date字段的空值会被转换为默认值1900-01-01，所以不需要校验
              shouldValidateRequired = field === 'Customer';
            }

            if (shouldValidateRequired) {
              missingRequired.push(fieldInfo.label);
            }
          }
        }

        if (missingRequired.length > 0) {
          const errorMsg = `第${i + 2}行缺少必填字段: ${missingRequired.join(', ')}`;
          errors.push({
            rowNumber: i + 2,
            error: errorMsg,
            missingFields: missingRequired,
            rowData: rowData
          });
          console.log(`跳过第 ${i + 2} 行 - ${errorMsg}`);
          errorCount++;
          continue;
        }

        // 添加详细日志以调试数据截断问题
        console.log(`正在插入第 ${i + 1} 行数据:`, JSON.stringify(rowData, null, 2));

        // 检查每个字段的长度
        Object.keys(rowData).forEach(key => {
          const value = rowData[key];
          if (typeof value === 'string' && FIELD_LENGTH_LIMITS[key]) {
            const limit = FIELD_LENGTH_LIMITS[key];
            if (value.length > limit) {
              console.log(`警告: 字段 ${key} 长度 ${value.length} 超过限制 ${limit}, 值: ${value}`);
            }
          }
        });

        // 构建插入SQL
        const columns = Object.keys(rowData);
        const values = Object.values(rowData);
        const placeholders = columns.map((_, index) => `@param${index}`).join(', ');

        const insertSql = `INSERT INTO ComplaintRegister (${columns.join(', ')}) VALUES (${placeholders})`;

        const request = new sql.Request(transaction);
        values.forEach((value, index) => {
          request.input(`param${index}`, value);
        });

        try {
          await request.query(insertSql);
          console.log(`成功插入第 ${i + 1} 行数据`);
          successCount++;
        } catch (error) {
          const errorMsg = `第${i + 2}行插入失败: ${error.message}`;
          errors.push({
            rowNumber: i + 2,
            error: errorMsg,
            sqlError: error.message,
            rowData: rowData
          });
          console.log(`插入第 ${i + 2} 行数据失败:`, error.message);
          console.log(`失败的数据:`, JSON.stringify(rowData, null, 2));
          errorCount++;
          continue; // 继续处理下一行，而不是抛出错误
        }

        // 更新进度
        if (sessionId && (i + 1) % 10 === 0) { // 每10条记录更新一次进度
          updateProgress(sessionId, i + 1, totalRows, 'processing', `已处理 ${i + 1}/${totalRows} 条记录`);
        }
      }

      // 提交事务
      await transaction.commit();

      // 完成进度更新
      if (sessionId) {
        updateProgress(sessionId, totalRows, totalRows, 'completed', `导入完成！成功 ${successCount} 条${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`);
      }

    } catch (error) {
      // 回滚事务
      await transaction.rollback();

      // 错误进度更新
      if (sessionId) {
        updateProgress(sessionId, 0, totalRows, 'error', `导入失败: ${error.message}`);
      }

      throw error;
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `导入完成！成功导入 ${successCount} 条记录${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`,
      data: {
        successCount,
        errorCount,
        errors: errors.map(err => typeof err === 'string' ? err : err.error), // 兼容字符串和对象格式
        totalRows: dataRows.length, // 总处理行数
        failedRows: errors // 详细的失败行信息（包含行号、错误信息、数据等）
      }
    });

  } catch (error) {
    console.error('导入Excel数据失败:', error);

    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// 进度报告存储
const importProgress = new Map();

// 获取导入进度
router.get('/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const progress = importProgress.get(sessionId) || {
    current: 0,
    total: 0,
    status: 'not_started',
    message: '未开始'
  };

  res.json({
    success: true,
    data: progress
  });
});

// 获取文件拷贝配置
router.get('/file-copy-config', async (req, res) => {
  try {
    const { getDynamicConfig } = require('../db');
    const dbConfig = await getDynamicConfig();

    res.json({
      success: true,
      data: {
        serverIP: dbConfig.server,
        fileStoragePath: dbConfig.FileStoragePath,
        fileServerPort: dbConfig.FileServerPort || 8080,
        fileUrlPrefix: dbConfig.FileUrlPrefix || '/files',
        supportedFileTypes: fileCopyConfig.supportedFileTypes,
        fileCopySettings: fileCopyConfig.fileCopy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取文件拷贝配置失败',
      error: error.message
    });
  }
});

// 测试文件拷贝功能
router.post('/test-file-copy', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: '请提供文件路径'
      });
    }

    // 保持原始文件名（用于测试）
    const originalFileName = require('path').basename(filePath);
    const result = await fileCopyService.copyFileToServer(filePath, originalFileName);

    res.json({
      success: result.success,
      data: result,
      message: result.success ? '文件拷贝成功' : '文件拷贝失败'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '测试文件拷贝失败',
      error: error.message
    });
  }
});

// 执行导入（支持文件拷贝模式）
router.post('/execute-with-copy', upload.single('file'), async (req, res) => {
  let connection;
  try {
    console.log('=== Excel导入开始（文件拷贝模式） ===');
    console.log('请求参数:', {
      selectedFields: req.body.selectedFields ? 'exists' : 'missing',
      columnMapping: req.body.columnMapping ? 'exists' : 'missing',
      enableFileCopy: req.body.enableFileCopy,
      file: req.file ? req.file.originalname : 'no file'
    });

    const { selectedFields, columnMapping, selectedSheet, applyConversions, sessionId, strictValidation, enableFileCopy } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    if (!selectedFields || selectedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个要导入的字段'
      });
    }

    // 解析JSON参数
    const fields = JSON.parse(selectedFields);
    const mapping = JSON.parse(columnMapping);
    const useCopyMode = enableFileCopy === 'true' || enableFileCopy === true;

    console.log('解析后的参数:', {
      fieldsCount: fields.length,
      mappingKeys: Object.keys(mapping),
      useCopyMode: useCopyMode
    });

    let conversions = [];
    if (applyConversions) {
      try {
        conversions = JSON.parse(applyConversions);
        if (!Array.isArray(conversions)) {
          conversions = [];
        }
      } catch (error) {
        console.error('解析转换配置失败:', error);
        conversions = [];
      }
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = selectedSheet || workbook.SheetNames[0];

    if (!workbook.Sheets[sheetName]) {
      return res.status(400).json({
        success: false,
        message: `工作表 "${sheetName}" 不存在`
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有数据行'
      });
    }

    const headers = jsonData[0];
    // 过滤掉完全空的行
    const allDataRows = jsonData.slice(1);
    const dataRows = allDataRows.filter(row => {
      return row && row.some(cell =>
        cell !== null &&
        cell !== undefined &&
        cell !== '' &&
        String(cell).trim() !== ''
      );
    });

    if (dataRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有有效的数据行'
      });
    }

    // 获取数据库连接
    connection = await getConnection();

    const fieldMapping = getFieldMapping();
    const errors = [];
    const totalRows = dataRows.length;
    const fileCopyResults = []; // 记录文件拷贝结果

    // 初始化进度
    if (sessionId) {
      updateProgress(sessionId, 0, totalRows, 'processing', '开始导入数据...');
    }

    // 开始事务
    const transaction = new sql.Transaction(connection);
    await transaction.begin();

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const originalRowNumber = i + 2; // Excel行号（从2开始，因为第1行是标题）

        try {
          const rowData = {};

          // 根据字段映射转换数据
          for (const field of fields) {
            const fieldInfo = fieldMapping[field];
            if (!fieldInfo) continue;

            const columnIndex = mapping[field];
            if (columnIndex !== undefined && columnIndex < row.length) {
              let rawValue = row[columnIndex];

              // 应用转换
              const conversion = Array.isArray(conversions) ? conversions.find(c =>
                c.row === originalRowNumber &&
                c.field === fieldInfo.label
              ) : null;

              if (conversion) {
                rawValue = conversion.convertedValue;
              }

              // 特殊处理附件文件字段（支持文件拷贝）
              if (field === 'AttachmentFile' && useCopyMode) {
                const logMessage = `处理附件文件字段，行 ${i + 1}, 列 ${columnIndex}, 原始值: ${rawValue}`;
                console.log(logMessage);
                require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${logMessage}\n`);

                const cellAddress = XLSX.utils.encode_cell({r: i + 1, c: columnIndex});
                const hyperlinkInfo = extractHyperlinkFromCell(worksheet, cellAddress);

                const hyperlinkLog = `超链接信息: ${JSON.stringify(hyperlinkInfo)}`;
                console.log(hyperlinkLog);
                require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${hyperlinkLog}\n`);

                if (hyperlinkInfo) {
                  const processedPathLog = `开始处理文件拷贝: ${hyperlinkInfo.hyperlink}`;
                  console.log(processedPathLog);
                  require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${processedPathLog}\n`);

                  const processedPath = await processAttachmentPathAsync(hyperlinkInfo, true);

                  const resultLog = `文件拷贝结果: ${JSON.stringify(processedPath)}`;
                  console.log(resultLog);
                  require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${resultLog}\n`);

                  if (processedPath) {
                    rowData[fieldInfo.dbField] = processedPath.blobUrl;

                    // 记录文件拷贝结果
                    if (processedPath.copyMode && processedPath.copyResult) {
                      fileCopyResults.push({
                        row: originalRowNumber,
                        originalPath: processedPath.originalPath,
                        copyResult: processedPath.copyResult
                      });
                    }
                  } else {
                    rowData[fieldInfo.dbField] = rawValue;
                  }
                } else {
                  rowData[fieldInfo.dbField] = rawValue;
                }
              } else {
                // 计算Excel单元格地址（用于其他字段的处理）
                const cellAddress = XLSX.utils.encode_cell({r: i + 1, c: columnIndex});
                rowData[fieldInfo.dbField] = convertValue(rawValue, fieldInfo.type, field, worksheet, cellAddress);
              }
            }
          }

          // 插入数据库
          const columns = Object.keys(rowData);
          const values = Object.values(rowData);
          const placeholders = columns.map((_, index) => `@param${index}`).join(', ');
          const columnNames = columns.join(', ');

          const request = transaction.request();
          values.forEach((value, index) => {
            request.input(`param${index}`, value);
          });

          await request.query(`INSERT INTO ComplaintRegister (${columnNames}) VALUES (${placeholders})`);
          successCount++;

        } catch (error) {
          console.error(`第${originalRowNumber}行数据插入失败:`, error);
          errors.push({
            rowNumber: originalRowNumber,
            error: error.message,
            rowData: row
          });
          errorCount++;
          continue;
        }

        // 更新进度
        if (sessionId && (i + 1) % 10 === 0) {
          updateProgress(sessionId, i + 1, totalRows, 'processing', `已处理 ${i + 1}/${totalRows} 条记录`);
        }
      }

      // 提交事务
      await transaction.commit();

      // 完成进度更新
      if (sessionId) {
        updateProgress(sessionId, totalRows, totalRows, 'completed',
          `导入完成！成功 ${successCount} 条${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}${fileCopyResults.length > 0 ? `，拷贝文件 ${fileCopyResults.length} 个` : ''}`);
      }

    } catch (error) {
      // 回滚事务
      await transaction.rollback();

      // 错误进度更新
      if (sessionId) {
        updateProgress(sessionId, 0, totalRows, 'error', `导入失败: ${error.message}`);
      }

      throw error;
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `导入完成！成功导入 ${totalRows - errors.length} 条记录`,
      data: {
        totalRows: totalRows,
        successCount: totalRows - errors.length,
        errorCount: errors.length,
        errors: errors,
        fileCopyResults: fileCopyResults,
        usedCopyMode: useCopyMode
      }
    });

  } catch (error) {
    console.error('导入Excel数据失败:', error);

    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});


// 更新进度的辅助函数
function updateProgress(sessionId, current, total, status, message) {
  importProgress.set(sessionId, {
    current,
    total,
    status,
    message,
    percentage: total > 0 ? Math.round((current / total) * 100) : 0
  });
}

// 查询最新导入的记录（用于调试）
router.get('/latest-records', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    // 查询最新记录
    const latestResult = await connection.request()
      .query(`SELECT TOP 5 ID, Customer, OrderNo, AttachmentFile,
              CASE WHEN AttachmentFile IS NULL THEN 'NULL'
                   WHEN AttachmentFile = '' THEN 'EMPTY'
                   ELSE 'HAS_VALUE' END as FileStatus
              FROM ComplaintRegister
              ORDER BY ID DESC`);

    // 查询有AttachmentFile值的记录
    const withFilesResult = await connection.request()
      .query(`SELECT TOP 5 ID, Customer, OrderNo, AttachmentFile
              FROM ComplaintRegister
              WHERE AttachmentFile IS NOT NULL AND AttachmentFile != ''
              ORDER BY ID DESC`);

    // 统计信息
    const statsResult = await connection.request()
      .query(`SELECT
                COUNT(*) as TotalRecords,
                COUNT(AttachmentFile) as RecordsWithFiles,
                MAX(ID) as MaxID
              FROM ComplaintRegister`);

    const result = {
      latest: latestResult.recordset,
      withFiles: withFilesResult.recordset,
      stats: statsResult.recordset[0]
    };

    res.json({
      success: true,
      data: result,
      message: '获取记录统计成功'
    });
  } catch (error) {
    console.error('查询最新记录失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// 获取路径映射配置接口
router.get('/path-mapping-config', async (req, res) => {
  let connection;
  try {
    // 临时返回默认配置，避免数据库连接问题
    const serverIP = process.env.FILE_SERVER_IP || 'localhost';
    const fileStoragePath = process.env.FILE_STORAGE_PATH || 'D:\\DMSData\\IMG-VIDEO';
    const fileServerPort = process.env.FILE_SERVER_PORT || 8080;
    const fileUrlPrefix = process.env.FILE_URL_PREFIX || '/files';

    // 返回默认的路径映射配置
    const pathMappings = [
      {
        id: 1,
        name: '默认映射',
        localPattern: 'file:///C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel',
        targetPattern: `\\\\${serverIP}\\工作\\品质部\\生产异常周报考核统计`,
        description: '默认路径映射配置',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        // 为了兼容现有的导入功能，也提供正则表达式格式
        local: /file:\/\/\/C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel(.+)/,
        network: `\\\\${serverIP}\\工作\\品质部\\生产异常周报考核统计`
      }
    ];

    const config = {
      serverIP: serverIP,
      fileStoragePath: fileStoragePath,
      fileServerPort: fileServerPort,
      fileUrlPrefix: fileUrlPrefix,
      supportedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp4', '.avi', '.mov'],
      pathMappings: pathMappings,
      accessMethods: {
        http: {
          enabled: true,
          baseUrl: `http://${serverIP}:${fileServerPort}${fileUrlPrefix}`
        },
        fileCopy: {
          enabled: true,
          targetDirectory: fileStoragePath,
          urlPrefix: fileUrlPrefix,
          maxFileSize: 50 * 1024 * 1024
        }
      }
    };

    res.json({
      success: true,
      data: config,
      message: '获取路径映射配置成功'
    });
  } catch (error) {
    console.error('获取路径映射配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// 保存路径映射配置接口
router.put('/path-mapping-config', async (req, res) => {
  let connection;
  try {
    const { pathMappings, conversionConfig } = req.body;

    if (!pathMappings || !Array.isArray(pathMappings)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的路径映射配置数据'
      });
    }

    connection = await getConnection();

    // 开始事务
    const transaction = connection.transaction();
    await transaction.begin();

    try {
      console.log('保存路径映射配置:', pathMappings);

      // 获取现有的配置ID列表
      const existingResult = await transaction.request()
        .query('SELECT ID FROM PathMappingConfig');
      const existingIds = existingResult.recordset.map(row => row.ID);

      // 处理的ID列表
      const processedIds = [];

      // 插入或更新路径映射配置
      for (let i = 0; i < pathMappings.length; i++) {
        const mapping = pathMappings[i];
        if (mapping.name && mapping.localPattern && mapping.targetPattern) {
          const request = transaction.request();

          if (mapping.id && typeof mapping.id === 'number' && existingIds.includes(mapping.id)) {
            // 更新现有记录
            await request
              .input('ID', mapping.id)
              .input('Name', mapping.name)
              .input('LocalPattern', mapping.localPattern)
              .input('TargetPattern', mapping.targetPattern)
              .input('Description', mapping.description || '')
              .input('IsActive', mapping.isActive !== false ? 1 : 0)
              .query(`UPDATE PathMappingConfig SET
                        Name = @Name,
                        LocalPattern = @LocalPattern,
                        TargetPattern = @TargetPattern,
                        Description = @Description,
                        IsActive = @IsActive,
                        UpdatedAt = GETDATE()
                      WHERE ID = @ID`);
            processedIds.push(mapping.id);
            console.log(`更新映射配置 ID: ${mapping.id}, Name: ${mapping.name}`);
          } else {
            // 插入新记录
            const insertResult = await request
              .input('Name', mapping.name)
              .input('LocalPattern', mapping.localPattern)
              .input('TargetPattern', mapping.targetPattern)
              .input('Description', mapping.description || '')
              .input('IsActive', mapping.isActive !== false ? 1 : 0)
              .query(`INSERT INTO PathMappingConfig (Name, LocalPattern, TargetPattern, Description, IsActive, CreatedAt, UpdatedAt)
                      OUTPUT INSERTED.ID
                      VALUES (@Name, @LocalPattern, @TargetPattern, @Description, @IsActive, GETDATE(), GETDATE())`);
            const newId = insertResult.recordset[0].ID;
            processedIds.push(newId);
            console.log(`插入新映射配置 ID: ${newId}, Name: ${mapping.name}`);
          }
        }
      }

      // 删除未处理的现有记录（即前端删除的记录）
      const toDeleteIds = existingIds.filter(id => !processedIds.includes(id));
      if (toDeleteIds.length > 0) {
        await transaction.request()
          .query(`DELETE FROM PathMappingConfig WHERE ID IN (${toDeleteIds.join(',')})`);
        console.log(`删除映射配置 IDs: ${toDeleteIds.join(', ')}`);
      }

      // 提交事务
      await transaction.commit();

      res.json({
        success: true,
        message: '路径映射配置保存成功',
        data: {
          savedMappings: pathMappings.length,
          conversionConfig,
          savedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('保存路径映射配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

// 路径格式分析和标准化测试接口
router.get('/analyze-paths', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    // 查询所有有附件文件的记录
    const result = await connection.request()
      .query(`SELECT TOP 20 ID, Customer, OrderNo, AttachmentFile
              FROM ComplaintRegister
              WHERE AttachmentFile IS NOT NULL AND AttachmentFile != ''
              ORDER BY ID DESC`);

    // 分析每个路径格式
    const pathAnalysis = result.recordset.map(record => {
      const normalized = normalizeAttachmentPath(record.AttachmentFile);
      return {
        id: record.ID,
        customer: record.Customer,
        orderNo: record.OrderNo,
        originalPath: record.AttachmentFile,
        pathType: normalized?.type || 'unknown',
        normalizedPath: normalized?.networkPath || record.AttachmentFile,
        displayPath: normalized?.displayPath || record.AttachmentFile,
        isAccessible: normalized?.isAccessible || false
      };
    });

    // 统计路径类型
    const pathTypeStats = pathAnalysis.reduce((stats, item) => {
      stats[item.pathType] = (stats[item.pathType] || 0) + 1;
      return stats;
    }, {});

    res.json({
      success: true,
      data: {
        records: pathAnalysis,
        statistics: {
          total: pathAnalysis.length,
          typeDistribution: pathTypeStats
        }
      },
      message: '路径分析完成'
    });
  } catch (error) {
    console.error('路径分析失败:', error);
    res.status(500).json({
      success: false,
      message: '分析失败: ' + error.message
    });
  } finally {
    if (connection) {
      connection.close();
    }
  }
});

module.exports = router;
