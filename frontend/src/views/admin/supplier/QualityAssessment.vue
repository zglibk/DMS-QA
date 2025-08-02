<template>
  <div class="quality-assessment">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>供应商质量评估</h2>
      <p class="page-description">供应商质量体系评估、产品质量检测记录管理</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="5">
          <el-input
            v-model="searchForm.supplierName"
            placeholder="请输入供应商名称"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.assessmentType" placeholder="评估类型" clearable>
            <el-option label="质量体系评估" value="system" />
            <el-option label="产品质量检测" value="product" />
            <el-option label="现场审核" value="audit" />
            <el-option label="年度评估" value="annual" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.qualityGrade" placeholder="质量等级" clearable>
            <el-option label="优秀" value="excellent" />
            <el-option label="良好" value="good" />
            <el-option label="合格" value="qualified" />
            <el-option label="不合格" value="unqualified" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-date-picker
            v-model="searchForm.assessmentDate"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增评估
          </el-button>
        </el-col>
      </el-row>
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
        <el-table-column prop="supplierName" label="供应商名称" width="180" />
        <el-table-column prop="assessmentType" label="评估类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getAssessmentTypeTagType(row.assessmentType)">
              {{ getAssessmentTypeLabel(row.assessmentType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assessmentDate" label="评估日期" width="120" />
        <el-table-column prop="assessor" label="评估人" width="100" />
        <el-table-column prop="totalScore" label="总分" width="80">
          <template #default="{ row }">
            <span :class="getScoreClass(row.totalScore)">{{ row.totalScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="qualityGrade" label="质量等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getQualityGradeTagType(row.qualityGrade)">
              {{ getQualityGradeLabel(row.qualityGrade) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="keyIssues" label="主要问题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="improvementPlan" label="改进计划" min-width="200" show-overflow-tooltip />
        <el-table-column prop="nextAssessmentDate" label="下次评估" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button type="warning" size="small" @click="handleViewReport(row)">
              报告
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
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
      width="1000px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="请选择供应商" filterable>
                <el-option
                  v-for="supplier in supplierOptions"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="评估类型" prop="assessmentType">
              <el-select v-model="formData.assessmentType" placeholder="请选择评估类型">
                <el-option label="质量体系评估" value="system" />
                <el-option label="产品质量检测" value="product" />
                <el-option label="现场审核" value="audit" />
                <el-option label="年度评估" value="annual" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="评估日期" prop="assessmentDate">
              <el-date-picker
                v-model="formData.assessmentDate"
                type="date"
                placeholder="请选择评估日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="评估人" prop="assessor">
              <el-input v-model="formData.assessor" placeholder="请输入评估人" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 评估指标 -->
        <el-divider content-position="left">评估指标</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="质量管理体系" prop="qualitySystemScore">
              <el-input-number v-model="formData.qualitySystemScore" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="产品质量" prop="productQualityScore">
              <el-input-number v-model="formData.productQualityScore" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="交付能力" prop="deliveryScore">
              <el-input-number v-model="formData.deliveryScore" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="服务水平" prop="serviceScore">
              <el-input-number v-model="formData.serviceScore" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="成本控制" prop="costScore">
              <el-input-number v-model="formData.costScore" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总分" prop="totalScore">
              <el-input-number v-model="computedTotalScore" disabled style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="质量等级" prop="qualityGrade">
              <el-select v-model="formData.qualityGrade" placeholder="请选择质量等级">
                <el-option label="优秀" value="excellent" />
                <el-option label="良好" value="good" />
                <el-option label="合格" value="qualified" />
                <el-option label="不合格" value="unqualified" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="下次评估日期" prop="nextAssessmentDate">
              <el-date-picker
                v-model="formData.nextAssessmentDate"
                type="date"
                placeholder="请选择下次评估日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="主要问题">
          <el-input
            v-model="formData.keyIssues"
            type="textarea"
            :rows="3"
            placeholder="请输入发现的主要问题"
          />
        </el-form-item>
        <el-form-item label="改进计划">
          <el-input
            v-model="formData.improvementPlan"
            type="textarea"
            :rows="3"
            placeholder="请输入改进计划和措施"
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
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  supplierName: '',
  assessmentType: '',
  qualityGrade: '',
  assessmentDate: []
})

// 供应商选项
const supplierOptions = ref([
  { id: 1, name: '艾利丹尼森材料有限公司' },
  { id: 2, name: '汉高胶粘剂技术有限公司' },
  { id: 3, name: '海德堡印刷机械有限公司' },
  { id: 4, name: '博斯特模切设备有限公司' }
])

// 表格数据
const tableData = ref([
  {
    id: 1,
    supplierId: 1,
    supplierName: '艾利丹尼森材料有限公司',
    assessmentType: 'annual',
    assessmentDate: '2024-07-15',
    assessor: '张质检',
    qualitySystemScore: 92,
    productQualityScore: 88,
    deliveryScore: 95,
    serviceScore: 90,
    costScore: 85,
    totalScore: 90,
    qualityGrade: 'excellent',
    keyIssues: '包装标识偶有不清晰',
    improvementPlan: '加强包装质量控制，完善标识规范',
    nextAssessmentDate: '2025-07-15'
  },
  {
    id: 2,
    supplierId: 2,
    supplierName: '汉高胶粘剂技术有限公司',
    assessmentType: 'product',
    assessmentDate: '2024-07-20',
    assessor: '李工程师',
    qualitySystemScore: 85,
    productQualityScore: 92,
    deliveryScore: 88,
    serviceScore: 87,
    costScore: 90,
    totalScore: 88,
    qualityGrade: 'good',
    keyIssues: '交期偶有延误',
    improvementPlan: '优化生产计划，提升交付准时率',
    nextAssessmentDate: '2024-10-20'
  }
])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 2
})

// 表单数据
const formData = reactive({
  supplierId: '',
  assessmentType: '',
  assessmentDate: '',
  assessor: '',
  qualitySystemScore: 0,
  productQualityScore: 0,
  deliveryScore: 0,
  serviceScore: 0,
  costScore: 0,
  totalScore: 0,
  qualityGrade: '',
  keyIssues: '',
  improvementPlan: '',
  nextAssessmentDate: '',
  remark: ''
})

// 计算总分
const computedTotalScore = computed(() => {
  const scores = [
    formData.qualitySystemScore,
    formData.productQualityScore,
    formData.deliveryScore,
    formData.serviceScore,
    formData.costScore
  ]
  const total = scores.reduce((sum, score) => sum + (score || 0), 0) / 5
  formData.totalScore = Math.round(total)
  return formData.totalScore
})

// 表单验证规则
const formRules = {
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  assessmentType: [
    { required: true, message: '请选择评估类型', trigger: 'change' }
  ],
  assessmentDate: [
    { required: true, message: '请选择评估日期', trigger: 'change' }
  ],
  assessor: [
    { required: true, message: '请输入评估人', trigger: 'blur' }
  ],
  qualityGrade: [
    { required: true, message: '请选择质量等级', trigger: 'change' }
  ]
}

/**
 * 工具函数
 */
// 获取评估类型标签样式
const getAssessmentTypeTagType = (type) => {
  const typeMap = {
    system: 'success',
    product: 'warning',
    audit: 'info',
    annual: 'danger'
  }
  return typeMap[type] || ''
}

// 获取评估类型标签文本
const getAssessmentTypeLabel = (type) => {
  const typeMap = {
    system: '质量体系评估',
    product: '产品质量检测',
    audit: '现场审核',
    annual: '年度评估'
  }
  return typeMap[type] || type
}

// 获取质量等级标签样式
const getQualityGradeTagType = (grade) => {
  const gradeMap = {
    excellent: 'success',
    good: 'warning',
    qualified: 'info',
    unqualified: 'danger'
  }
  return gradeMap[grade] || ''
}

// 获取质量等级标签文本
const getQualityGradeLabel = (grade) => {
  const gradeMap = {
    excellent: '优秀',
    good: '良好',
    qualified: '合格',
    unqualified: '不合格'
  }
  return gradeMap[grade] || grade
}

// 获取分数样式类
const getScoreClass = (score) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 70) return 'score-qualified'
  return 'score-unqualified'
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
const resetSearch = () => {
  Object.assign(searchForm, {
    supplierName: '',
    assessmentType: '',
    qualityGrade: '',
    assessmentDate: []
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增质量评估'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑质量评估'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看详情
const handleViewDetail = (row) => {
  ElMessage.info('查看详情功能开发中...')
}

// 查看报告
const handleViewReport = (row) => {
  ElMessage.info('查看报告功能开发中...')
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  handleSearch()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  handleSearch()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // TODO: 实现保存逻辑
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      handleDialogClose()
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    supplierId: '',
    assessmentType: '',
    assessmentDate: '',
    assessor: '',
    qualitySystemScore: 0,
    productQualityScore: 0,
    deliveryScore: 0,
    serviceScore: 0,
    costScore: 0,
    totalScore: 0,
    qualityGrade: '',
    keyIssues: '',
    improvementPlan: '',
    nextAssessmentDate: '',
    remark: ''
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
.quality-assessment {
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

.score-excellent {
  color: #67c23a;
  font-weight: bold;
}

.score-good {
  color: #e6a23c;
  font-weight: bold;
}

.score-qualified {
  color: #409eff;
  font-weight: bold;
}

.score-unqualified {
  color: #f56c6c;
  font-weight: bold;
}
</style>