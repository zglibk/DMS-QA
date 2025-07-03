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
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="resetSearch">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </div>
          </el-col>
        </el-row>
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
import { ref, onMounted } from 'vue'
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

// 获取投诉列表数据
const fetchData = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      ...searchForm.value
    }

    const response = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: localStorage.getItem('token') }
    })

    if (response.data.success) {
      tableData.value = response.data.data
      total.value = response.data.total
    } else {
      ElMessage.error('获取数据失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('获取投诉列表失败:', error)
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
  gap: 10px;
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