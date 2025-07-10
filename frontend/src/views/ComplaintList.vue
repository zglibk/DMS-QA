<template>
  <div class="complaint-list-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <el-icon><Document /></el-icon>
        <h1>投诉记录管理</h1>
      </div>
      <div class="page-actions">
        <el-button type="primary" @click="router.push('/add')">
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
                class="search-button"
              >
                <el-icon><Search /></el-icon>
                查询
              </el-button>
              <el-button
                size="large"
                @click="resetSearch"
                class="reset-button"
              >
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
              <el-button
                type="info"
                size="large"
                @click="toggleAdvancedSearch"
                class="advanced-toggle-button"
                :class="{
                  'is-active': showAdvancedSearch,
                  'has-conditions': hasAdvancedConditions
                }"
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

        <!-- 高级查询区域 -->
        <el-collapse-transition>
          <div v-show="showAdvancedSearch">
            <el-card class="advanced-search-card" shadow="never">
              <template #header>
                <div class="advanced-search-header">
                  <el-icon class="advanced-search-icon"><Search /></el-icon>
                  <span class="advanced-search-title">高级查询</span>
                </div>
              </template>

              <el-form :model="advancedForm" label-width="80px" class="advanced-search-form">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="车间">
                      <el-select
                        v-model="advancedForm.workshop"
                        placeholder="选择车间"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.workshops"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="部门">
                      <el-select
                        v-model="advancedForm.department"
                        placeholder="选择部门"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.departments"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="人员">
                      <el-select
                        v-model="advancedForm.person"
                        placeholder="选择人员"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.persons"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="投诉类别">
                      <el-select
                        v-model="advancedForm.complaintCategory"
                        placeholder="选择投诉类别"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.complaintCategories"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="客诉类型">
                      <el-select
                        v-model="advancedForm.customerComplaintType"
                        placeholder="选择客诉类型"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.customerComplaintTypes"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="不良类别">
                      <el-select
                        v-model="advancedForm.defectiveCategory"
                        placeholder="选择不良类别"
                        clearable
                        size="default"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in options.defectiveCategories"
                          :key="item.Name"
                          :label="item.Name"
                          :value="item.Name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item>
                      <div class="advanced-search-buttons">
                        <el-button
                          type="primary"
                          size="large"
                          @click="handleAdvancedSearch"
                          class="search-button"
                        >
                          <el-icon><Search /></el-icon>
                          查询
                        </el-button>
                        <el-button
                          size="large"
                          @click="resetAdvancedSearch"
                          class="reset-button"
                        >
                          <el-icon><Refresh /></el-icon>
                          重置
                        </el-button>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
            </el-card>
          </div>
        </el-collapse-transition>
      </div>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        style="width: 100%"
        stripe
        :loading="tableLoading"
        empty-text="暂无投诉记录"
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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" text @click="viewDetail(scope.row)">
              <el-icon><View /></el-icon>
              详情
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
import { ElMessage } from 'element-plus'
import { Plus, View, Document, Search, Refresh } from '@element-plus/icons-vue'

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

// 获取下拉选项数据
const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token')

    const response = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data) {
      options.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取下拉选项失败: ' + (error.response?.data?.message || error.message))
  }
}

// 获取投诉列表数据
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
      tableData.value = response.data.data
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

// 查看详情
const viewDetail = (row) => {
  // 这里可以跳转到详情页面或打开详情对话框
  router.push(`/?id=${row.ID}`)
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
.complaint-list-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-title .el-icon {
  font-size: 28px;
  color: #409eff;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  padding: 10px 0;
}

.search-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-button,
.reset-button,
.advanced-toggle-button {
  height: 40px !important;
  padding: 0 20px !important;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.3s ease;
}

/* Element Plus large size 按钮样式覆盖 */
.el-button--large.search-button,
.el-button--large.reset-button,
.el-button--large.advanced-toggle-button {
  height: 40px !important;
  padding: 0 20px !important;
  font-size: 14px !important;
}

.search-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.reset-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  align-items: center;
  margin-top: 10px;
}

.advanced-search-buttons .search-button,
.advanced-search-buttons .reset-button {
  min-width: 100px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .search-button,
  .reset-button,
  .advanced-toggle-button {
    width: 100%;
    height: 36px !important;
  }

  .advanced-search-form .el-row {
    margin: 0 !important;
  }

  .advanced-search-form .el-col {
    margin-bottom: 15px;
  }

  .advanced-search-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }

  .advanced-search-buttons .search-button,
  .advanced-search-buttons .reset-button {
    min-width: 120px;
    flex: 1;
  }
}

/* 动画效果 */
.el-collapse-transition-enter-active,
.el-collapse-transition-leave-active {
  transition: all 0.3s ease;
}

.el-collapse-transition-enter-from,
.el-collapse-transition-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 选择框样式优化 */
.advanced-search-form .el-select {
  transition: all 0.3s ease;
}

.advanced-search-form .el-select:hover {
  transform: translateY(-1px);
}

.advanced-search-form .el-select .el-input__wrapper {
  border-radius: 6px;
  transition: all 0.3s ease;
}

.advanced-search-form .el-select .el-input__wrapper:hover {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.table-card {
  background: white;
  border-radius: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .complaint-list-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .search-form .el-row {
    flex-direction: column;
  }

  .search-form .el-col {
    width: 100% !important;
    margin-bottom: 10px;
  }
}
</style>