<template>
  <div class="supplier-performance">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>供应商绩效管理</h2>
      <p class="page-description">供应商交付及时率、质量合格率、服务评价等绩效指标管理</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon delivery">
                <el-icon><Van /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ overallStats.avgDeliveryRate }}%</div>
                <div class="stats-label">平均交付及时率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon quality">
                <el-icon><Medal /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ overallStats.avgQualityRate }}%</div>
                <div class="stats-label">平均质量合格率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon service">
                <el-icon><Star /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ overallStats.avgServiceScore }}</div>
                <div class="stats-label">平均服务评分</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon cost">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ overallStats.avgCostScore }}</div>
                <div class="stats-label">平均成本控制</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
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
          <el-select v-model="searchForm.performanceLevel" placeholder="绩效等级" clearable>
            <el-option label="优秀" value="excellent" />
            <el-option label="良好" value="good" />
            <el-option label="一般" value="average" />
            <el-option label="较差" value="poor" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-date-picker
            v-model="searchForm.evaluationPeriod"
            type="monthrange"
            range-separator="至"
            start-placeholder="开始月份"
            end-placeholder="结束月份"
            format="YYYY-MM"
            value-format="YYYY-MM"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.supplierType" placeholder="供应商类型" clearable>
            <el-option label="原材料" value="material" />
            <el-option label="设备" value="equipment" />
            <el-option label="服务" value="service" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增绩效
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
        <el-table-column prop="evaluationPeriod" label="评估周期" width="120" />
        <el-table-column prop="deliveryRate" label="交付及时率" width="120">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="row.deliveryRate"
                :color="getProgressColor(row.deliveryRate)"
                :stroke-width="8"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="qualityRate" label="质量合格率" width="120">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="row.qualityRate"
                :color="getProgressColor(row.qualityRate)"
                :stroke-width="8"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="serviceScore" label="服务评分" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.serviceScore"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="costScore" label="成本控制" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.costScore"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="overallScore" label="综合评分" width="100">
          <template #default="{ row }">
            <span :class="getScoreClass(row.overallScore)">{{ row.overallScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="performanceLevel" label="绩效等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPerformanceLevelTagType(row.performanceLevel)">
              {{ getPerformanceLevelLabel(row.performanceLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="improvementSuggestions" label="改进建议" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleViewTrend(row)">
              趋势图
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
      width="900px"
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
            <el-form-item label="评估周期" prop="evaluationPeriod">
              <el-date-picker
                v-model="formData.evaluationPeriod"
                type="month"
                placeholder="请选择评估周期"
                format="YYYY-MM"
                value-format="YYYY-MM"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 绩效指标 -->
        <el-divider content-position="left">绩效指标</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="交付及时率" prop="deliveryRate">
              <el-input-number v-model="formData.deliveryRate" :min="0" :max="100" style="width: 100%">
                <template #append>%</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质量合格率" prop="qualityRate">
              <el-input-number v-model="formData.qualityRate" :min="0" :max="100" style="width: 100%">
                <template #append>%</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="服务评分" prop="serviceScore">
              <el-rate v-model="formData.serviceScore" show-text />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成本控制" prop="costScore">
              <el-rate v-model="formData.costScore" show-text />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="综合评分" prop="overallScore">
              <el-input-number v-model="computedOverallScore" disabled style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="绩效等级" prop="performanceLevel">
              <el-select v-model="formData.performanceLevel" placeholder="请选择绩效等级">
                <el-option label="优秀" value="excellent" />
                <el-option label="良好" value="good" />
                <el-option label="一般" value="average" />
                <el-option label="较差" value="poor" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="改进建议">
          <el-input
            v-model="formData.improvementSuggestions"
            type="textarea"
            :rows="3"
            placeholder="请输入改进建议"
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
import { Search, Plus, Van, Medal, Star, Money } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()

// 整体统计数据
const overallStats = reactive({
  avgDeliveryRate: 92.5,
  avgQualityRate: 95.8,
  avgServiceScore: 4.2,
  avgCostScore: 3.8
})

// 搜索表单
const searchForm = reactive({
  supplierName: '',
  performanceLevel: '',
  evaluationPeriod: [],
  supplierType: ''
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
    evaluationPeriod: '2024-07',
    deliveryRate: 95,
    qualityRate: 98,
    serviceScore: 4.5,
    costScore: 4.0,
    overallScore: 92,
    performanceLevel: 'excellent',
    improvementSuggestions: '继续保持优秀表现，可考虑扩大合作范围'
  },
  {
    id: 2,
    supplierId: 2,
    supplierName: '汉高胶粘剂技术有限公司',
    evaluationPeriod: '2024-07',
    deliveryRate: 88,
    qualityRate: 96,
    serviceScore: 4.0,
    costScore: 3.5,
    overallScore: 85,
    performanceLevel: 'good',
    improvementSuggestions: '需要提升交付及时率，优化物流管理'
  },
  {
    id: 3,
    supplierId: 3,
    supplierName: '海德堡印刷机械有限公司',
    evaluationPeriod: '2024-07',
    deliveryRate: 92,
    qualityRate: 94,
    serviceScore: 4.2,
    costScore: 3.8,
    overallScore: 88,
    performanceLevel: 'good',
    improvementSuggestions: '服务响应速度有待提升，技术支持需加强'
  }
])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 3
})

// 表单数据
const formData = reactive({
  supplierId: '',
  evaluationPeriod: '',
  deliveryRate: 0,
  qualityRate: 0,
  serviceScore: 3,
  costScore: 3,
  overallScore: 0,
  performanceLevel: '',
  improvementSuggestions: '',
  remark: ''
})

// 计算综合评分
const computedOverallScore = computed(() => {
  const deliveryWeight = 0.3
  const qualityWeight = 0.4
  const serviceWeight = 0.15
  const costWeight = 0.15
  
  const score = (
    (formData.deliveryRate || 0) * deliveryWeight +
    (formData.qualityRate || 0) * qualityWeight +
    (formData.serviceScore || 0) * 20 * serviceWeight +
    (formData.costScore || 0) * 20 * costWeight
  )
  
  formData.overallScore = Math.round(score)
  return formData.overallScore
})

// 表单验证规则
const formRules = {
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  evaluationPeriod: [
    { required: true, message: '请选择评估周期', trigger: 'change' }
  ],
  deliveryRate: [
    { required: true, message: '请输入交付及时率', trigger: 'blur' }
  ],
  qualityRate: [
    { required: true, message: '请输入质量合格率', trigger: 'blur' }
  ],
  performanceLevel: [
    { required: true, message: '请选择绩效等级', trigger: 'change' }
  ]
}

/**
 * 工具函数
 */
// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage >= 95) return '#67c23a'
  if (percentage >= 85) return '#e6a23c'
  if (percentage >= 70) return '#409eff'
  return '#f56c6c'
}

// 获取绩效等级标签样式
const getPerformanceLevelTagType = (level) => {
  const levelMap = {
    excellent: 'success',
    good: 'warning',
    average: 'info',
    poor: 'danger'
  }
  return levelMap[level] || ''
}

// 获取绩效等级标签文本
const getPerformanceLevelLabel = (level) => {
  const levelMap = {
    excellent: '优秀',
    good: '良好',
    average: '一般',
    poor: '较差'
  }
  return levelMap[level] || level
}

// 获取分数样式类
const getScoreClass = (score) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 70) return 'score-average'
  return 'score-poor'
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
    performanceLevel: '',
    evaluationPeriod: [],
    supplierType: ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增绩效评估'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑绩效评估'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看趋势图
const handleViewTrend = (row) => {
  ElMessage.info('趋势图功能开发中...')
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
    evaluationPeriod: '',
    deliveryRate: 0,
    qualityRate: 0,
    serviceScore: 3,
    costScore: 3,
    overallScore: 0,
    performanceLevel: '',
    improvementSuggestions: '',
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
.supplier-performance {
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
  overflow: hidden;
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

.stats-icon.delivery {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.quality {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon.service {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-icon.cost {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
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

.progress-cell {
  padding: 5px 0;
}

.score-excellent {
  color: #67c23a;
  font-weight: bold;
  font-size: 16px;
}

.score-good {
  color: #e6a23c;
  font-weight: bold;
  font-size: 16px;
}

.score-average {
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
}

.score-poor {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
}
</style>