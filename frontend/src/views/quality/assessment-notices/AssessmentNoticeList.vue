<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>考核通知管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon class="el-icon--left"><Plus /></el-icon>新建考核通知
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="单号/人员/工单" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table 
        v-loading="loading" 
        :data="tableData" 
        style="width: 100%" 
        border 
        stripe 
        header-cell-class-name="table-header-center"
        :row-style="{ height: '50px' }"
      >
        <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
        <el-table-column prop="AssessmentNo" label="考核单号" width="160" align="center" header-align="center">
          <template #default="scope">
            <span style="font-family: 'Consolas', 'Monaco', monospace; font-weight: 600; color: #409EFF; letter-spacing: 0.5px">{{ scope.row.AssessmentNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="PersonName" label="责任人" width="100" align="center" header-align="center">
           <template #default="scope">
             <el-tag size="small" effect="plain">{{ scope.row.PersonName }}</el-tag>
           </template>
        </el-table-column>
        <el-table-column prop="Department" label="部门" width="100" align="center" header-align="center" />
        <el-table-column prop="WorkOrder" label="工单号" min-width="120" align="center" header-align="center">
          <template #default="scope">
             <span v-if="scope.row.WorkOrder" style="font-family: 'Consolas', 'Monaco', monospace; color: #606266">{{ scope.row.WorkOrder }}</span>
             <span v-else style="color:#999">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="FaultDesc" label="考核内容" min-width="200" show-overflow-tooltip header-align="center">
          <template #default="scope">
            <span style="color: #606266">{{ scope.row.FaultDesc }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="OccurrenceDate" label="发生日期" width="120" align="center" header-align="center">
          <template #default="scope">
            <span style="font-family: 'Consolas', 'Monaco', monospace; color: #909399">{{ formatDate(scope.row.OccurrenceDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" min-width="150" show-overflow-tooltip header-align="center">
          <template #default="scope">
            <div v-if="scope.row.QualityDeptOpinion">
               {{ formatOpinion(scope.row) }}
            </div>
            <span v-else style="color:#999">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="TotalAmount" label="考核总额" width="100" align="center" header-align="center">
          <template #default="scope">
            <span v-if="scope.row.TotalAmount > 0" style="font-family: 'Consolas', 'Monaco', monospace; color: #F56C6C; font-weight: bold; font-size: 14px">¥{{ scope.row.TotalAmount }}</span>
            <span v-else style="font-family: 'Consolas', 'Monaco', monospace; color: #C0C4CC">0</span>
          </template>
        </el-table-column>
        <el-table-column prop="Issuer" label="发出人" width="100" align="center" header-align="center" />
        <el-table-column label="操作" width="180" fixed="right" align="center" header-align="center">
          <template #default="scope">
            <div style="display: flex; justify-content: center; gap: 8px;">
              <el-button link type="primary" size="small" @click="handleView(scope.row)" v-permission="['quality:assessment-notices:view']">
                <el-icon><View /></el-icon>
              </el-button>
              <el-button link type="success" size="small" @click="handleEdit(scope.row)" v-permission="['quality:assessment-notices:edit']">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(scope.row)" v-permission="['quality:assessment-notices:delete']">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View, Edit, Delete } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: ''
})

const getList = async () => {
  loading.value = true
  try {
    const res = await apiService.get('/quality-assessment-notices', { params: queryParams })
    if (res.data.success) {
      tableData.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.page = 1
  getList()
}

const resetQuery = () => {
  queryParams.keyword = ''
  handleSearch()
}

const handleAdd = () => {
  const routeData = router.resolve({ path: '/admin/quality/assessment-notices/create' })
  window.open(routeData.href, '_blank')
}

const handleView = (row) => {
  const routeData = router.resolve({ 
    path: `/admin/quality/assessment-notices/edit/${row.ID}`,
    query: { mode: 'view' }
  })
  window.open(routeData.href, '_blank')
}

const handleEdit = (row) => {
  const routeData = router.resolve({ 
    path: `/admin/quality/assessment-notices/edit/${row.ID}`,
    query: { mode: 'edit' }
  })
  window.open(routeData.href, '_blank')
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该考核通知单吗?', '提示', { type: 'warning' }).then(async () => {
    try {
      await apiService.delete(`/quality-assessment-notices/${row.ID}`)
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const formatOpinion = (row) => {
  if (!row.QualityDeptOpinion) return ''
  try {
    const opinions = JSON.parse(row.QualityDeptOpinion)
    if (!Array.isArray(opinions)) return row.QualityDeptOpinion
    
    return opinions.join('、')
  } catch (e) {
    return row.QualityDeptOpinion
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.table-header-center) {
  background-color: #f5f7fa !important;
  font-weight: normal;
  color: #606266;
}

/* 手机端自适应 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .card-header .el-button {
    width: 100%;
  }

  .el-form--inline .el-form-item {
    display: flex;
    margin-right: 0;
    margin-bottom: 10px;
    width: 100%;
  }
  
  .el-form--inline .el-form-item__content {
    flex: 1;
    display: flex;
  }
  
  .el-form--inline .el-input {
    width: 100%;
  }
  
  .el-form--inline .el-form-item:last-child {
    display: flex;
    justify-content: space-between;
  }
  
  .el-form--inline .el-form-item:last-child button {
    flex: 1;
  }
  
  .el-form--inline .el-form-item:last-child button + button {
    margin-left: 10px;
  }
}
</style>
