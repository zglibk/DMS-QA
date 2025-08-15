<template>
  <div class="quality-targets-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>质量目标管理</h2>
      <p class="page-description">质量目标录入、统计分析、达成情况跟踪管理</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-card shadow="never">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="目标名称">
            <el-input
              v-model="searchForm.targetName"
              placeholder="请输入目标名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="目标分类">
            <el-select
              v-model="searchForm.category"
              placeholder="请选择分类"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="item in categoryOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="考核年度">
            <el-date-picker
              v-model="searchForm.year"
              type="year"
              placeholder="选择年度"
              style="width: 120px"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 120px"
            >
              <el-option label="进行中" value="active" />
              <el-option label="已完成" value="completed" />
              <el-option label="已暂停" value="paused" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <el-row :gutter="10">
        <el-col :span="12">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增目标
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedRows.length">
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </el-col>
        <el-col :span="12" style="text-align: right">
          <el-button type="info" @click="goToAnalysis">
            <el-icon><DataAnalysis /></el-icon>
            统计分析
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="tableData"
        @selection-change="handleSelectionChange"
        stripe
        border
        style="width: 100%; table-layout: auto;"
      >
        <el-table-column type="selection" width="55" align="center" header-align="center" />
        <el-table-column prop="TargetYear" label="目标年度" width="90" align="center" header-align="center" />
        <el-table-column prop="QualityTarget" label="目标名称" min-width="200" show-overflow-tooltip header-align="center" />
        <el-table-column prop="TargetCategory" label="目标分类" min-width="120" align="center" header-align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.TargetCategory)">{{ getCategoryLabel(row.TargetCategory) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="TargetValue" label="目标值" min-width="100" align="center" header-align="center" />
        <el-table-column prop="AssessmentUnit" label="考核单位" min-width="120" show-overflow-tooltip align="center" header-align="center" />
        <el-table-column prop="ResponsiblePerson" label="责任人" min-width="100" align="center" header-align="center" />
        <el-table-column prop="CreatedAt" label="创建时间" min-width="160" align="center" header-align="center">
          <template #default="{ row }">
            {{ formatDate(row.CreatedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="StatisticsFrequency" label="统计频率" min-width="100" align="center" header-align="center" />
        <el-table-column prop="Description" label="描述" min-width="200" show-overflow-tooltip header-align="center" />
        <el-table-column label="操作" min-width="180" fixed="right" align="center" header-align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="handleEdit(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="info" size="small" @click="handleViewStatistics(row)">
                <el-icon><DataAnalysis /></el-icon>
                统计
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
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
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
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
            <el-form-item label="目标名称" prop="targetName">
              <el-input v-model="formData.targetName" placeholder="请输入目标名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标分类" prop="category">
              <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
                <el-option
                  v-for="item in categoryOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="目标值" prop="targetValue">
              <div style="display: flex; gap: 8px;">
                <el-input 
                  ref="targetValueInput"
                  v-model="formData.targetValue" 
                  placeholder="形如：≥95%、100件、≤5%等）" 
                  style="flex: 1" 
                />
                <el-dropdown @command="insertSymbol" trigger="click">
                  <el-button class="symbol-dropdown-btn">
                    <el-icon>
                      <ArrowDown />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item 
                        v-for="symbol in symbolOptions" 
                        :key="symbol.value"
                        :command="symbol.value"
                        class="symbol-dropdown-item"
                      >
                        {{ symbol.value }} - {{ symbol.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="考核年度" prop="year">
              <el-date-picker
                v-model="formData.year"
                type="year"
                placeholder="选择年度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="考核单位" prop="assessmentUnit">
              <el-select v-model="formData.assessmentUnit" placeholder="请选择考核单位" style="width: 100%" filterable>
                <el-option
                  v-for="item in assessmentUnitOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人" prop="responsiblePerson">
              <el-select v-model="formData.responsiblePerson" placeholder="请选择责任人" style="width: 100%" filterable>
                <el-option
                  v-for="item in responsiblePersonOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="进行中" value="active" />
                <el-option label="已完成" value="completed" />
                <el-option label="已暂停" value="paused" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="统计频率" prop="statisticsFrequency">
              <el-select v-model="formData.statisticsFrequency" placeholder="请选择统计频率" style="width: 100%">
                <el-option label="月度" value="monthly" />
                <el-option label="季度" value="quarterly" />
                <el-option label="半年度" value="semi-annual" />
                <el-option label="年度" value="annual" />
              </el-select>
            </el-form-item>
          </el-col>

        </el-row>
        <el-form-item label="目标描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入目标描述"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remarks"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Delete,
  Download,
  DataAnalysis,
  ArrowDown,
  Edit
} from '@element-plus/icons-vue'
import * as qualityTargetsApi from '@/services/qualityTargetsApi'

// 路由实例
const router = useRouter()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)

const selectedRows = ref([])
const targetValueInput = ref()
const tableData = ref([])
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  targetName: '',
  category: '',
  year: null,
  status: ''
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  ID: null,
  targetName: '',
  category: '',
  targetValue: '',
  assessmentUnit: '',
  responsiblePerson: '',
  year: null,
  status: 'active',
  statisticsFrequency: '',

  description: '',
  remarks: ''
})

// 选项数据
const categoryOptions = ref([])
const assessmentUnitOptions = ref([])
const responsiblePersonOptions = ref([])

// 符号选项数据
const symbolOptions = ref([
  { value: '≥', label: '大于等于' },
  { value: '≤', label: '小于等于' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '=', label: '等于' },
  { value: '±', label: '正负' },
  { value: '%', label: '百分号' }
])

// 表单验证规则
const formRules = {
  targetName: [
    { required: true, message: '请输入目标名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择目标分类', trigger: 'change' }
  ],
  targetValue: [
    { required: true, message: '请输入目标值', trigger: 'blur' }
  ],
  assessmentUnit: [
    { required: true, message: '请选择考核单位', trigger: 'change' }
  ],
  responsiblePerson: [
    { required: true, message: '请选择责任人', trigger: 'change' }
  ],
  year: [
    { required: true, message: '请选择考核年度', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  statisticsFrequency: [
    { required: true, message: '请选择统计频率', trigger: 'change' }
  ],

}

// 计算属性
const dialogTitle = computed(() => {
  return formData.ID ? '编辑质量目标' : '新增质量目标'
})

// 方法定义

/**
 * 获取分类标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    'quality': 'primary',
    'efficiency': 'success',
    'cost': 'warning',
    'delivery': 'info',
    'safety': 'danger'
  }
  return typeMap[category] || ''
}

/**
 * 获取分类标签文本
 */
const getCategoryLabel = (category) => {
  const labelMap = {
    'quality': '质量指标',
    'efficiency': '效率指标',
    'cost': '成本指标',
    'delivery': '交付指标',
    'safety': '安全指标'
  }
  return labelMap[category] || category
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const typeMap = {
    'active': 'success',
    'completed': 'info',
    'paused': 'warning'
  }
  return typeMap[status] || ''
}

/**
 * 获取状态标签文本
 */
const getStatusLabel = (status) => {
  const labelMap = {
    'active': '进行中',
    'completed': '已完成',
    'paused': '已暂停'
  }
  return labelMap[status] || status
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期字符串或日期对象
 * @returns {string} 格式化后的日期字符串 (YYYY-M-D HH:mm:ss)
 */
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}



/**
 * 插入符号到目标值输入框
 * @param {string} symbol - 要插入的符号
 */
const insertSymbol = (symbol) => {
  const input = targetValueInput.value
  if (input && input.input) {
    const inputElement = input.input
    const start = inputElement.selectionStart
    const end = inputElement.selectionEnd
    const currentValue = formData.targetValue || ''
    
    // 在光标位置插入符号
    const newValue = currentValue.slice(0, start) + symbol + currentValue.slice(end)
    formData.targetValue = newValue
    
    // 设置光标位置到插入符号之后
    setTimeout(() => {
      const newPosition = start + symbol.length
      inputElement.setSelectionRange(newPosition, newPosition)
      inputElement.focus()
    }, 0)
  } else {
    // 如果无法获取光标位置，直接在末尾添加
    formData.targetValue = (formData.targetValue || '') + symbol
  }
}

/**
 * 加载表格数据
 */
const loadTableData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.currentPage,
      size: pagination.pageSize,
      ...searchForm
    }
    
    // 处理年度参数
    if (params.year) {
      params.year = new Date(params.year).getFullYear()
    }
    
    console.log('API请求参数:', params);
    const response = await qualityTargetsApi.getQualityTargets(params);
    console.log('API响应:', response);
    
    // Axios响应对象的数据在response.data中
        const responseData = response.data;
        console.log('响应数据:', responseData);
        
        // 检查响应格式 - API返回格式为 {success: true, data: {records: [...], total: number}}
        if (responseData && responseData.success && responseData.data) {
          const data = responseData.data;
          console.log('记录:', data.records);
          console.log('总数:', data.total);
          
          tableData.value = data.records || [];
          pagination.total = data.total || 0;
        } else {
          console.error('API响应格式不正确:', responseData);
          tableData.value = [];
          pagination.total = 0;
        }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载选项数据
 */
const loadOptions = async () => {
  try {
    const response = await qualityTargetsApi.getQualityTargetOptions()
    console.log('选项数据API响应:', response)
    
    // 检查响应数据结构
    let optionsData = null
    if (response && response.success && response.data) {
      // 如果response直接包含success和data字段
      optionsData = response.data
    } else if (response && response.data && response.data.success && response.data.data) {
      // 如果response.data包含success和data字段
      optionsData = response.data.data
    }
    
    if (optionsData) {
      console.log('选项数据:', optionsData)
      
      categoryOptions.value = optionsData.categories || []
      assessmentUnitOptions.value = optionsData.units || []
      responsiblePersonOptions.value = optionsData.persons || []
      
      console.log('分类选项:', categoryOptions.value)
      console.log('考核单位选项:', assessmentUnitOptions.value)
      console.log('责任人选项:', responsiblePersonOptions.value)
    } else {
      console.warn('选项数据响应格式不正确:', response)
      categoryOptions.value = []
      assessmentUnitOptions.value = []
      responsiblePersonOptions.value = []
    }
  } catch (error) {
    console.error('加载选项数据失败:', error)
    // 设置默认空数组，避免下拉框显示异常
    categoryOptions.value = []
    assessmentUnitOptions.value = []
    responsiblePersonOptions.value = []
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.currentPage = 1
  loadTableData()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    targetName: '',
    category: '',
    year: null,
    status: ''
  })
  handleSearch()
}

/**
 * 新增处理
 */
const handleAdd = () => {
  resetFormData()
  loadOptions() // 加载选项数据
  dialogVisible.value = true
}

/**
 * 编辑处理
 */
const handleEdit = (row) => {
  // 重置表单数据
  resetFormData()
  // 映射后端字段到前端表单字段
  Object.assign(formData, {
    ID: row.ID,
    targetName: row.QualityTarget || '',
    category: row.TargetCategory || '',
    targetValue: row.TargetValue || '',
    assessmentUnit: row.AssessmentUnit || '',
    responsiblePerson: row.ResponsiblePerson || '',
    year: row.TargetYear ? new Date(row.TargetYear, 0) : null,
    status: row.Status === true ? 'active' : (row.Status === false ? 'inactive' : (row.Status || 'active')),
    statisticsFrequency: row.StatisticsFrequency || '',
    description: row.Description || '',
    remarks: row.Remarks || ''
  })
  console.log('编辑数据映射:', {
    '原始数据': row,
    '映射后表单数据': formData
  })
  loadOptions() // 加载选项数据
  dialogVisible.value = true
}

/**
 * 删除处理
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除目标"${row.targetName}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await qualityTargetsApi.deleteQualityTarget(row.ID)
    ElMessage.success('删除成功')
    loadTableData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量删除处理
 */
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.ID)
    await qualityTargetsApi.batchDeleteQualityTargets(ids)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadTableData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出处理
 */
const handleExport = async () => {
  try {
    const params = { ...searchForm }
    if (params.year) {
      params.year = new Date(params.year).getFullYear()
    }
    
    await qualityTargetsApi.exportQualityTargets(params)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 跳转到统计分析页面
 */
const goToAnalysis = () => {
  router.push('/admin/quality/targets/1/statistics')
}

/**
 * 查看统计处理
 */
const handleViewStatistics = (row) => {
  // 跳转到具体目标的统计页面
  router.push(`/admin/quality/targets/${row.ID}/statistics`)
}

/**
 * 表格选择变化处理
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 监听分页变化
watch(
  () => [pagination.currentPage, pagination.pageSize],
  ([newPage, newSize], [oldPage, oldSize]) => {
    // 如果页面大小改变，重置到第一页
    if (newSize !== oldSize) {
      pagination.currentPage = 1
    }
    loadTableData()
  }
)

/**
 * 对话框关闭处理
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  formRef.value?.resetFields()
  resetFormData()
}

/**
 * 提交处理
 */
const handleSubmit = async () => {
  try {
    console.log('开始表单验证，当前表单数据:', formData)
    
    // 手动检查必填字段
    const requiredFields = {
      targetName: '目标名称',
      category: '目标分类', 
      targetValue: '目标值',
      assessmentUnit: '考核单位',
      responsiblePerson: '责任人',
      year: '考核年度',
      status: '状态',
      statisticsFrequency: '统计频率'
    }
    
    const emptyFields = []
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field] || formData[field] === '') {
        emptyFields.push(label)
      }
    }
    
    if (emptyFields.length > 0) {
      console.error('发现空字段:', emptyFields)
      ElMessage.error(`请填写必填字段: ${emptyFields.join(', ')}`)
      return
    }
    
    // 验证目标值格式
    const targetValuePattern = /^[≥≤><]?\s*\d+(\.\d+)?\s*%?$/
    if (!targetValuePattern.test(formData.targetValue.trim())) {
      console.error('目标值格式不正确:', formData.targetValue)
      ElMessage.error('目标值格式不正确，请输入有效格式（如：95%、≥95%、<90、100等）')
      return
    }
    
    await formRef.value.validate()
    console.log('表单验证通过')
    
    submitLoading.value = true
    const submitData = { ...formData }
    
    // 处理年度数据
    if (submitData.year) {
      submitData.year = new Date(submitData.year).getFullYear()
    }
    
    // 转换字段名以匹配后端API期望的格式
    const apiData = {
      targetYear: submitData.year,
      targetCategory: submitData.category,
      assessmentUnit: submitData.assessmentUnit,
      qualityTarget: submitData.targetName,
      calculationFormula: submitData.calculationFormula || '',
      targetValue: submitData.targetValue,
      measures: submitData.measures || '',
      responsiblePerson: submitData.responsiblePerson,
      statisticsFrequency: submitData.statisticsFrequency,
      description: submitData.description || ''
    }
    
    console.log('准备提交的数据:', apiData)
    
    if (submitData.ID) {
      await qualityTargetsApi.updateQualityTarget(submitData.ID, apiData)
      ElMessage.success('更新成功')
    } else {
      await qualityTargetsApi.createQualityTarget(apiData)
      ElMessage.success('创建成功')
    }
    
    handleDialogClose()
    loadTableData()
  } catch (error) {
    console.error('提交失败:', error)
    if (error && typeof error === 'object') {
      console.error('验证错误详情:', error)
    }
    ElMessage.error('提交失败: ' + (error.message || error))
  } finally {
    submitLoading.value = false
  }
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.assign(formData, {
    ID: null,
    targetName: '',
    category: '',
    targetValue: '',
    assessmentUnit: '',
    responsiblePerson: '',
    year: null,
    status: 'active',
    statisticsFrequency: '',
    weight: 100,
    description: '',
    remarks: ''
  })
}

// 生命周期
onMounted(() => {
  loadTableData()
  loadOptions()
})
</script>

<style scoped>
.quality-targets-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.action-section {
  margin-bottom: 20px;
}

.table-section {
  background: #fff;
  border-radius: 4px;
  width: 100%;
  overflow-x: auto;
}

:deep(.el-table) {
  width: 100% !important;
  min-width: 100%;
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table) {
  font-size: 14px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 600;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:deep(.el-table td) {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:deep(.el-pagination) {
  justify-content: flex-end;
}

/* 符号下拉按钮样式 */
.symbol-dropdown-btn {
  height: 32px !important;
  border: 1px solid #dcdfe6 !important;
  background: #ffffff !important;
  color: #606266 !important;
  transition: all 0.3s ease !important;
}

.symbol-dropdown-btn:hover {
  border-color: #409eff !important;
  color: #409eff !important;
}

.symbol-dropdown-btn:focus {
  border-color: #409eff !important;
  outline: none !important;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
  font-size: 12px;
}

</style>