<template>
  <div class="inspection-reports">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>出厂检验报告</h2>
      <p class="page-description">管理供应商产品出厂检验报告，确保产品质量符合标准</p>
    </div>

    <!-- 检验统计 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ reportStats.total }}</div>
                <div class="stats-label">总报告数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon qualified">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ reportStats.qualified }}</div>
                <div class="stats-label">合格</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon unqualified">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ reportStats.unqualified }}</div>
                <div class="stats-label">不合格</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon rate">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ reportStats.qualificationRate }}%</div>
                <div class="stats-label">合格率</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索操作区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="报告编号">
          <el-input
            v-model="searchForm.reportNumber"
            placeholder="请输入报告编号"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select
            v-model="searchForm.supplierId"
            placeholder="请选择供应商"
            clearable
            style="width: 200px"
          >
            <el-option 
              v-for="supplier in supplierList" 
              :key="supplier.id" 
              :label="supplier.name" 
              :value="supplier.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input
            v-model="searchForm.productName"
            placeholder="请输入产品名称"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="检验结果">
          <el-select
            v-model="searchForm.inspectionResult"
            placeholder="请选择检验结果"
            clearable
            style="width: 120px"
          >
            <el-option label="合格" value="qualified" />
            <el-option label="不合格" value="unqualified" />
            <el-option label="待检" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item label="检验日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增报告
          </el-button>
          <el-button type="warning" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="reportNumber" label="报告编号" width="140" />
        <el-table-column prop="supplierName" label="供应商" min-width="180" />
        <el-table-column prop="productName" label="产品名称" min-width="150" />
        <el-table-column prop="productModel" label="产品型号" width="120" />
        <el-table-column prop="batchNumber" label="批次号" width="120" />
        <el-table-column prop="inspectionDate" label="检验日期" width="120" />
        <el-table-column prop="inspector" label="检验员" width="100" />
        <el-table-column prop="inspectionResult" label="检验结果" width="100">
          <template #default="{ row }">
            <el-tag :type="getResultTagType(row.inspectionResult)">
              {{ getResultLabel(row.inspectionResult) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qualityScore" label="质量得分" width="100">
          <template #default="{ row }">
            <span v-if="row.qualityScore" :class="getScoreClass(row.qualityScore)">
              {{ row.qualityScore }}分
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="defectRate" label="缺陷率" width="100">
          <template #default="{ row }">
            <span v-if="row.defectRate !== null" :class="getDefectRateClass(row.defectRate)">
              {{ row.defectRate }}%
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="info" size="small" @click="handleDownload(row)">下载</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="报告编号" prop="reportNumber">
              <el-input v-model="formData.reportNumber" placeholder="系统自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="请选择供应商" style="width: 100%">
                <el-option 
                  v-for="supplier in supplierList" 
                  :key="supplier.id" 
                  :label="supplier.name" 
                  :value="supplier.id" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品名称" prop="productName">
              <el-input v-model="formData.productName" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品型号" prop="productModel">
              <el-input v-model="formData.productModel" placeholder="请输入产品型号" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="批次号" prop="batchNumber">
              <el-input v-model="formData.batchNumber" placeholder="请输入批次号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产日期" prop="productionDate">
              <el-date-picker
                v-model="formData.productionDate"
                type="date"
                placeholder="请选择生产日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="检验日期" prop="inspectionDate">
              <el-date-picker
                v-model="formData.inspectionDate"
                type="date"
                placeholder="请选择检验日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验员" prop="inspector">
              <el-select v-model="formData.inspector" placeholder="请选择检验员" style="width: 100%">
                <el-option label="张检验员" value="张检验员" />
                <el-option label="李检验员" value="李检验员" />
                <el-option label="王检验员" value="王检验员" />
                <el-option label="赵检验员" value="赵检验员" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="检验数量" prop="inspectionQuantity">
              <el-input-number
                v-model="formData.inspectionQuantity"
                :min="1"
                placeholder="请输入检验数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合格数量" prop="qualifiedQuantity">
              <el-input-number
                v-model="formData.qualifiedQuantity"
                :min="0"
                :max="formData.inspectionQuantity"
                placeholder="请输入合格数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="不合格数量" prop="unqualifiedQuantity">
              <el-input-number
                v-model="formData.unqualifiedQuantity"
                :min="0"
                :max="formData.inspectionQuantity"
                placeholder="请输入不合格数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="质量得分" prop="qualityScore">
              <el-input-number
                v-model="formData.qualityScore"
                :min="0"
                :max="100"
                placeholder="请输入质量得分"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验结果" prop="inspectionResult">
              <el-radio-group v-model="formData.inspectionResult">
                <el-radio label="qualified">合格</el-radio>
                <el-radio label="unqualified">不合格</el-radio>
                <el-radio label="pending">待检</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="检验标准" prop="inspectionStandard">
          <el-input v-model="formData.inspectionStandard" placeholder="请输入检验标准" />
        </el-form-item>
        
        <el-form-item label="检验项目">
          <el-input
            v-model="formData.inspectionItems"
            type="textarea"
            :rows="3"
            placeholder="请输入检验项目详情"
          />
        </el-form-item>
        
        <el-form-item label="不合格描述" v-if="formData.inspectionResult === 'unqualified'">
          <el-input
            v-model="formData.defectDescription"
            type="textarea"
            :rows="3"
            placeholder="请详细描述不合格项目"
          />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
        
        <el-form-item label="检验报告">
          <el-upload
            ref="uploadRef"
            :file-list="fileList"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.doc,.docx,.jpg,.png"
            multiple
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 PDF、Word、图片格式，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="检验报告详情"
      width="800px"
      @close="handleViewDialogClose"
    >
      <div class="report-detail" v-if="viewData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报告编号">{{ viewData.reportNumber }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ viewData.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ viewData.productName }}</el-descriptions-item>
          <el-descriptions-item label="产品型号">{{ viewData.productModel }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ viewData.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ viewData.productionDate }}</el-descriptions-item>
          <el-descriptions-item label="检验日期">{{ viewData.inspectionDate }}</el-descriptions-item>
          <el-descriptions-item label="检验员">{{ viewData.inspector }}</el-descriptions-item>
          <el-descriptions-item label="检验数量">{{ viewData.inspectionQuantity }}</el-descriptions-item>
          <el-descriptions-item label="合格数量">{{ viewData.qualifiedQuantity }}</el-descriptions-item>
          <el-descriptions-item label="不合格数量">{{ viewData.unqualifiedQuantity }}</el-descriptions-item>
          <el-descriptions-item label="缺陷率">{{ viewData.defectRate }}%</el-descriptions-item>
          <el-descriptions-item label="质量得分">
            <span :class="getScoreClass(viewData.qualityScore)">{{ viewData.qualityScore }}分</span>
          </el-descriptions-item>
          <el-descriptions-item label="检验结果">
            <el-tag :type="getResultTagType(viewData.inspectionResult)">
              {{ getResultLabel(viewData.inspectionResult) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检验标准" :span="2">{{ viewData.inspectionStandard }}</el-descriptions-item>
          <el-descriptions-item label="检验项目" :span="2">{{ viewData.inspectionItems }}</el-descriptions-item>
          <el-descriptions-item label="不合格描述" :span="2" v-if="viewData.defectDescription">
            {{ viewData.defectDescription }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2" v-if="viewData.remark">
            {{ viewData.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleViewDialogClose">关闭</el-button>
          <el-button type="primary" @click="handleDownload(viewData)">下载报告</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Upload, Document, CircleCheck, CircleCloseFilled, TrendCharts } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()
const uploadRef = ref()
const fileList = ref([])
const viewData = ref(null)

// 检验统计数据
const reportStats = reactive({
  total: 156,
  qualified: 142,
  unqualified: 14,
  qualificationRate: 91.0
})

// 搜索表单
const searchForm = reactive({
  reportNumber: '',
  supplierId: '',
  productName: '',
  inspectionResult: '',
  dateRange: []
})

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 供应商列表
const supplierList = ref([
  { id: 1, name: '艾利丹尼森材料有限公司' },
  { id: 2, name: '汉高胶粘剂技术有限公司' },
  { id: 3, name: '海德堡印刷机械有限公司' },
  { id: 4, name: '博斯特模切设备有限公司' },
  { id: 5, name: '3M中国有限公司' }
])

// 表格数据
const tableData = ref([
  {
    id: 1,
    reportNumber: 'IR2024001',
    supplierId: 1,
    supplierName: '艾利丹尼森材料有限公司',
    productName: '不干胶标签材料',
    productModel: 'S2045',
    batchNumber: 'B20240115001',
    productionDate: '2024-01-10',
    inspectionDate: '2024-01-15',
    inspector: '张检验员',
    inspectionQuantity: 1000,
    qualifiedQuantity: 985,
    unqualifiedQuantity: 15,
    defectRate: 1.5,
    qualityScore: 92,
    inspectionResult: 'qualified',
    inspectionStandard: 'GB/T 7707-2008',
    inspectionItems: '外观检查、尺寸测量、粘性测试、耐候性测试',
    defectDescription: '',
    remark: '整体质量良好'
  },
  {
    id: 2,
    reportNumber: 'IR2024002',
    supplierId: 2,
    supplierName: '汉高胶粘剂技术有限公司',
    productName: '热熔胶',
    productModel: 'HM3580',
    batchNumber: 'B20240118001',
    productionDate: '2024-01-15',
    inspectionDate: '2024-01-18',
    inspector: '李检验员',
    inspectionQuantity: 500,
    qualifiedQuantity: 500,
    unqualifiedQuantity: 0,
    defectRate: 0,
    qualityScore: 98,
    inspectionResult: 'qualified',
    inspectionStandard: 'GB/T 2793-1995',
    inspectionItems: '粘度测试、固化时间、耐温性能、粘接强度',
    defectDescription: '',
    remark: '优质产品'
  },
  {
    id: 3,
    reportNumber: 'IR2024003',
    supplierId: 3,
    supplierName: '海德堡印刷机械有限公司',
    productName: '印刷机配件',
    productModel: 'HD-P2000',
    batchNumber: 'B20240120001',
    productionDate: '2024-01-18',
    inspectionDate: '2024-01-20',
    inspector: '王检验员',
    inspectionQuantity: 50,
    qualifiedQuantity: 45,
    unqualifiedQuantity: 5,
    defectRate: 10.0,
    qualityScore: 75,
    inspectionResult: 'unqualified',
    inspectionStandard: 'ISO 9001:2015',
    inspectionItems: '尺寸精度、表面质量、材料硬度、装配精度',
    defectDescription: '部分配件尺寸超差，表面有轻微划痕',
    remark: '需要供应商改进生产工艺'
  },
  {
    id: 4,
    reportNumber: 'IR2024004',
    supplierId: 5,
    supplierName: '3M中国有限公司',
    productName: '双面胶带',
    productModel: '3M-VHB',
    batchNumber: 'B20240122001',
    productionDate: '2024-01-20',
    inspectionDate: '2024-01-22',
    inspector: '赵检验员',
    inspectionQuantity: 2000,
    qualifiedQuantity: 1980,
    unqualifiedQuantity: 20,
    defectRate: 1.0,
    qualityScore: 95,
    inspectionResult: 'qualified',
    inspectionStandard: 'ASTM D3330',
    inspectionItems: '粘接强度、耐温性、厚度均匀性、剥离强度',
    defectDescription: '',
    remark: '符合技术要求'
  }
])

// 表单数据
const formData = reactive({
  reportNumber: '',
  supplierId: '',
  productName: '',
  productModel: '',
  batchNumber: '',
  productionDate: '',
  inspectionDate: '',
  inspector: '',
  inspectionQuantity: null,
  qualifiedQuantity: null,
  unqualifiedQuantity: null,
  qualityScore: null,
  inspectionResult: 'qualified',
  inspectionStandard: '',
  inspectionItems: '',
  defectDescription: '',
  remark: ''
})

// 表单验证规则
const formRules = {
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  productName: [
    { required: true, message: '请输入产品名称', trigger: 'blur' }
  ],
  productModel: [
    { required: true, message: '请输入产品型号', trigger: 'blur' }
  ],
  batchNumber: [
    { required: true, message: '请输入批次号', trigger: 'blur' }
  ],
  inspectionDate: [
    { required: true, message: '请选择检验日期', trigger: 'change' }
  ],
  inspector: [
    { required: true, message: '请选择检验员', trigger: 'change' }
  ],
  inspectionQuantity: [
    { required: true, message: '请输入检验数量', trigger: 'blur' }
  ],
  qualifiedQuantity: [
    { required: true, message: '请输入合格数量', trigger: 'blur' }
  ],
  unqualifiedQuantity: [
    { required: true, message: '请输入不合格数量', trigger: 'blur' }
  ],
  inspectionStandard: [
    { required: true, message: '请输入检验标准', trigger: 'blur' }
  ]
}

/**
 * 计算属性
 */
// 计算缺陷率
const defectRate = computed(() => {
  if (formData.inspectionQuantity && formData.unqualifiedQuantity !== null) {
    return ((formData.unqualifiedQuantity / formData.inspectionQuantity) * 100).toFixed(1)
  }
  return 0
})

/**
 * 工具函数
 */
// 获取检验结果标签样式
const getResultTagType = (result) => {
  const resultMap = {
    qualified: 'success',
    unqualified: 'danger',
    pending: 'warning'
  }
  return resultMap[result] || ''
}

// 获取检验结果标签文本
const getResultLabel = (result) => {
  const resultMap = {
    qualified: '合格',
    unqualified: '不合格',
    pending: '待检'
  }
  return resultMap[result] || result
}

// 获取得分样式
const getScoreClass = (score) => {
  if (score >= 95) {
    return 'score-excellent'
  } else if (score >= 85) {
    return 'score-good'
  } else if (score >= 75) {
    return 'score-average'
  } else {
    return 'score-poor'
  }
}

// 获取缺陷率样式
const getDefectRateClass = (rate) => {
  if (rate === 0) {
    return 'rate-excellent'
  } else if (rate <= 2) {
    return 'rate-good'
  } else if (rate <= 5) {
    return 'rate-average'
  } else {
    return 'rate-poor'
  }
}

/**
 * 事件处理函数
 */
// 搜索
const handleSearch = () => {
  console.log('搜索条件:', searchForm)
  // TODO: 实现搜索逻辑
}

// 重置搜索
const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    if (key === 'dateRange') {
      searchForm[key] = []
    } else {
      searchForm[key] = ''
    }
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增检验报告'
  isEdit.value = false
  resetForm()
  // 生成报告编号
  formData.reportNumber = 'IR' + new Date().getFullYear() + String(Date.now()).slice(-6)
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑检验报告'
  isEdit.value = true
  Object.keys(formData).forEach(key => {
    if (row[key] !== undefined) {
      formData[key] = row[key]
    }
  })
  dialogVisible.value = true
}

// 查看详情
const handleView = (row) => {
  viewData.value = { ...row }
  viewDialogVisible.value = true
}

// 下载报告
const handleDownload = (row) => {
  // TODO: 实现下载逻辑
  ElMessage.success(`正在下载报告：${row.reportNumber}`)
}

// 导出
const handleExport = () => {
  // TODO: 实现导出逻辑
  ElMessage.success('正在导出检验报告数据')
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除检验报告"${row.reportNumber}"吗？此操作不可恢复！`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }
  ).then(() => {
    // TODO: 实现删除逻辑
    const index = tableData.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      tableData.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  })
}

// 文件上传变化
const handleFileChange = (file, fileList) => {
  console.log('文件变化:', file, fileList)
}

// 文件移除
const handleFileRemove = (file, fileList) => {
  console.log('文件移除:', file, fileList)
}

// 分页大小改变
const handleSizeChange = (val) => {
  pageSize.value = val
  // TODO: 重新加载数据
}

// 当前页改变
const handleCurrentChange = (val) => {
  currentPage.value = val
  // TODO: 重新加载数据
}

// 对话框关闭
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
  fileList.value = []
}

// 查看对话框关闭
const handleViewDialogClose = () => {
  viewDialogVisible.value = false
  viewData.value = null
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // 计算缺陷率
      const calculatedDefectRate = ((formData.unqualifiedQuantity / formData.inspectionQuantity) * 100).toFixed(1)
      
      // TODO: 实现提交逻辑
      console.log('提交数据:', {
        ...formData,
        defectRate: calculatedDefectRate,
        files: fileList.value
      })
      
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      handleDialogClose()
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'inspectionResult') {
      formData[key] = 'qualified'
    } else if (['inspectionQuantity', 'qualifiedQuantity', 'unqualifiedQuantity', 'qualityScore'].includes(key)) {
      formData[key] = null
    } else {
      formData[key] = ''
    }
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  // 初始化数据
  total.value = tableData.value.length
})
</script>

<style scoped>
.inspection-reports {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stats-icon.total {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.stats-icon.qualified {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stats-icon.unqualified {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.stats-icon.rate {
  background: linear-gradient(135deg, #e6a23c, #f0a020);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.search-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

.report-detail {
  margin-bottom: 20px;
}

.text-muted {
  color: #c0c4cc;
}

.score-excellent {
  color: #67c23a;
  font-weight: bold;
}

.score-good {
  color: #409eff;
  font-weight: bold;
}

.score-average {
  color: #e6a23c;
  font-weight: bold;
}

.score-poor {
  color: #f56c6c;
  font-weight: bold;
}

.rate-excellent {
  color: #67c23a;
  font-weight: bold;
}

.rate-good {
  color: #409eff;
  font-weight: bold;
}

.rate-average {
  color: #e6a23c;
  font-weight: bold;
}

.rate-poor {
  color: #f56c6c;
  font-weight: bold;
}
</style>