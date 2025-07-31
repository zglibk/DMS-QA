<template>
  <div class="complaint-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <el-icon><Document /></el-icon>
        <h1>投诉管理</h1>
      </div>
      <div class="page-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增投诉
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <div class="search-form">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
              v-model="searchForm.customer"
              placeholder="客户编号"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="6">
            <el-input
              v-model="searchForm.orderNo"
              placeholder="工单号"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="6">
            <el-input
              v-model="searchForm.productName"
              placeholder="产品名称"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="6">
            <div class="search-buttons">
              <el-button
                type="primary"
                size="large"
                @click="handleSearch"
              >
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button
                size="large"
                @click="resetSearch"
              >
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
              <el-button
                :class="['advanced-toggle-button', { 'is-active': showAdvancedSearch, 'has-conditions': hasAdvancedConditions }]"
                size="large"
                @click="toggleAdvancedSearch"
              >
                <el-icon><Search /></el-icon>
                高级查询
                <el-badge
                  v-if="hasAdvancedConditions"
                  :value="activeConditionsCount"
                  class="condition-badge"
                />
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 高级查询区域 -->
      <el-card v-show="showAdvancedSearch" class="advanced-search-card" shadow="never">
        <template #header>
          <div class="advanced-search-header">
            <el-icon class="advanced-search-icon"><Search /></el-icon>
            <span class="advanced-search-title">高级查询条件</span>
          </div>
        </template>
        <el-form :model="advancedForm" class="advanced-search-form">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="车间">
                <el-select v-model="advancedForm.workshop" placeholder="请选择车间" clearable>
                  <el-option
                    v-for="item in options.workshops"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="部门">
                <el-select v-model="advancedForm.department" placeholder="请选择部门" clearable>
                  <el-option
                    v-for="item in options.departments"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="责任人">
                <el-select v-model="advancedForm.person" placeholder="请选择责任人" clearable>
                  <el-option
                    v-for="item in options.persons"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="投诉类别">
                <el-select v-model="advancedForm.complaintCategory" placeholder="请选择投诉类别" clearable>
                  <el-option
                    v-for="item in options.complaintCategories"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="客户投诉类型">
                <el-select v-model="advancedForm.customerComplaintType" placeholder="请选择客户投诉类型" clearable>
                  <el-option
                    v-for="item in options.customerComplaintTypes"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="不良类别">
                <el-select v-model="advancedForm.defectiveCategory" placeholder="请选择不良类别" clearable>
                  <el-option
                    v-for="item in options.defectiveCategories"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <div class="advanced-search-buttons">
                <el-button type="primary" @click="handleAdvancedSearch">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button @click="resetAdvancedSearch">
                  <el-icon><Refresh /></el-icon>
                  重置
                </el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="tableLoading"
        stripe
        border
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column label="#" type="index" width="60" :index="(index) => (page - 1) * pageSize + index + 1" />
        <el-table-column prop="Date" label="日期" width="110" sortable>
          <template #default="scope">
            <el-tag type="info" size="small">
              {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="Customer" label="客户编号" width="120" show-overflow-tooltip />
        <el-table-column prop="OrderNo" label="工单号" width="130" show-overflow-tooltip />
        <el-table-column prop="ProductName" label="产品名称" width="140" show-overflow-tooltip />
        <el-table-column prop="Workshop" label="车间" width="100" />
        <el-table-column prop="ComplaintCategory" label="投诉类别" width="120" />
        <el-table-column prop="DefectiveRate" label="不良率" width="80" align="center">
          <template #default="scope">
            <el-tag :type="getDefectiveRateType(scope.row.DefectiveRate)" size="small">
              {{ scope.row.DefectiveRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="MainDept" label="主责部门" width="100" />
        <el-table-column prop="MainPerson" label="主责人" width="100" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" text @click="viewDetail(scope.row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button type="warning" size="small" text @click="editComplaint(scope.row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" text @click="deleteComplaint(scope.row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View, Document, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const tableData = ref([])
const tableLoading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单
const searchForm = ref({
  customer: '',
  orderNo: '',
  productName: ''
})

// 高级查询表单
const advancedForm = ref({
  workshop: '',
  department: '',
  person: '',
  complaintCategory: '',
  customerComplaintType: '',
  defectiveCategory: ''
})

// 高级查询显示状态
const showAdvancedSearch = ref(false)

// 下拉选项数据
const options = ref({
  workshops: [],
  departments: [],
  persons: [],
  complaintCategories: [],
  customerComplaintTypes: [],
  defectiveCategories: []
})

// 计算属性：检测是否有活动的高级查询条件
const hasAdvancedConditions = computed(() => {
  return Object.values(advancedForm.value).some(value => value && value !== '')
})

// 计算属性：活动条件数量
const activeConditionsCount = computed(() => {
  return Object.values(advancedForm.value).filter(value => value && value !== '').length
})

// 日期格式化函数
const formatDateSafe = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toISOString().split('T')[0]
  } catch (error) {
    return dateStr
  }
}

// 获取下拉选项数据
const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (response.data.success) {
      options.value = response.data.data
    }
  } catch (error) {
    console.error('获取选项数据失败:', error)
  }
}

// 获取数据
const fetchData = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      ...searchForm.value,
      ...advancedForm.value
    }

    const token = localStorage.getItem('token')
    const response = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      const processedData = response.data.data.map(item => ({
        ...item,
        Date: formatDateSafe(item.Date)
      }))
      tableData.value = processedData
      total.value = response.data.total
    } else {
      ElMessage.error('获取数据失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('获取数据失败: ' + (error.response?.data?.message || error.message))
  } finally {
    tableLoading.value = false
  }
}

// 搜索
const handleSearch = () => {
  page.value = 1
  fetchData()
}

// 重置搜索
const resetSearch = () => {
  searchForm.value = {
    customer: '',
    orderNo: '',
    productName: ''
  }
  page.value = 1
  fetchData()
}

// 切换高级查询显示
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}

// 高级搜索
const handleAdvancedSearch = () => {
  page.value = 1
  fetchData()
}

// 重置高级查询
const resetAdvancedSearch = () => {
  advancedForm.value = {
    workshop: '',
    department: '',
    person: '',
    complaintCategory: '',
    customerComplaintType: '',
    defectiveCategory: ''
  }
  page.value = 1
  fetchData()
}

// 分页处理
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  page.value = 1
  fetchData()
}

const handleCurrentChange = (newPage) => {
  page.value = newPage
  fetchData()
}

// 新增投诉
const handleAdd = () => {
  router.push('/add')
}

// 查看详情
const viewDetail = (row) => {
  router.push(`/?id=${row.ID}`)
}

// 编辑投诉
const editComplaint = (row) => {
  router.push(`/edit?id=${row.ID}`)
}

// 删除投诉
const deleteComplaint = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除投诉记录 "${row.OrderNo}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const token = localStorage.getItem('token')
    const response = await axios.delete(`/api/complaint/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error('删除失败: ' + response.data.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 获取不良率标签类型
const getDefectiveRateType = (rate) => {
  if (rate <= 1) return 'success'
  if (rate <= 3) return 'warning'
  return 'danger'
}

// 页面加载时获取数据
onMounted(() => {
  fetchOptions()
  fetchData()
})
</script>

<style scoped>
.complaint-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-title .el-icon {
  font-size: 28px;
}

.search-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.search-form {
  padding: 10px 0;
}

.search-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.advanced-toggle-button {
  position: relative;
}

.advanced-toggle-button.is-active {
  background-color: #409eff;
  color: white;
  border-color: #409eff;
}

.advanced-toggle-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(144, 147, 153, 0.3);
}

.advanced-toggle-button.has-conditions {
  background-color: #67c23a;
  border-color: #67c23a;
  color: white;
}

.advanced-toggle-button.has-conditions:hover {
  background-color: #5daf34;
  border-color: #5daf34;
}

.condition-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.advanced-search-card {
  margin-top: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.advanced-search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  font-weight: 600;
}

.advanced-search-icon {
  font-size: 18px;
}

.advanced-search-title {
  font-size: 16px;
}

.advanced-search-form {
  padding: 10px 0;
}

.advanced-search-form .el-form-item {
  margin-bottom: 20px;
}

.advanced-search-form .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

.advanced-search-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.table-card {
  border-radius: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table__header) {
  border-radius: 8px 8px 0 0;
}

:deep(.el-pagination) {
  justify-content: center;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-button--text) {
  padding: 8px 15px;
}

:deep(.el-tag) {
  border-radius: 4px;
}
</style>