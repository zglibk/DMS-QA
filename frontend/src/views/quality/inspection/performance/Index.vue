<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <div class="page-header" style="margin-bottom: 20px; display: flex; align-items: center;">
      <el-icon :size="24" color="#409EFF" style="margin-right: 10px;"><Platform /></el-icon>
      <span style="font-size: 20px; font-weight: 600; color: #303133;">性能实验报告</span>
    </div>

    <!-- 统计卡片 + 快捷操作 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card shadow="never" class="stat-card blue-card">
          <div class="stat-content">
            <div class="stat-icon blue-icon">
              <el-icon :size="36"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总报告数</div>
              <div class="stat-value">{{ dashboardStats.total }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card shadow="never" class="stat-card orange-card">
          <div class="stat-content">
            <div class="stat-icon orange-icon">
              <el-icon :size="36"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">待审核</div>
              <div class="stat-value">{{ dashboardStats.pending }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="8" :lg="12" :xl="12">
        <el-card shadow="never" class="stat-card action-card">
          <div class="stat-content action-content">
            <div class="stat-icon green-icon">
              <el-icon :size="36"><DataLine /></el-icon>
            </div>
            <div class="stat-info" style="flex: 1;">
              <div class="stat-label">快捷操作</div>
              <div class="quick-actions">
                <el-button type="primary" :icon="Plus" @click="handleCreate" size="default">新建报告</el-button>
                <el-button :icon="Refresh" @click="fetchTableData" size="default">刷新列表</el-button>
                <el-button type="danger" :icon="Delete" :disabled="selectedRows.length === 0" @click="handleBatchDelete" size="default">批量删除</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索条件 -->
    <div class="filter-container">
      <el-input v-model="listQuery.keyword" placeholder="报告编号/样品名称" style="width: 200px;" class="filter-item" clearable @keyup.enter="handleFilter" />
      <el-select v-model="listQuery.status" placeholder="状态" style="width: 120px;" class="filter-item" clearable>
        <el-option label="草稿" value="Draft" />
        <el-option label="待审核" value="Submitted" />
        <el-option label="已通过" value="Approved" />
        <el-option label="已审核" value="Audited" />
        <el-option label="已驳回" value="Rejected" />
      </el-select>
      <el-date-picker v-model="listQuery.startDate" type="date" placeholder="开始日期" style="width: 150px;" class="filter-item" value-format="YYYY-MM-DD" />
      <el-date-picker v-model="listQuery.endDate" type="date" placeholder="结束日期" style="width: 150px;" class="filter-item" value-format="YYYY-MM-DD" />
      <el-button class="filter-item" type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
      <el-button class="filter-item" :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <!-- 数据列表 -->
    <el-table 
      v-loading="loading" 
      :data="tableData" 
      border 
      fit 
      highlight-current-row 
      stripe
      style="width: 100%;"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="45" align="center" />
      <el-table-column label="序号" type="index" width="55" align="center" />
      <el-table-column label="报告编号" prop="ReportNo" width="170" align="center" show-overflow-tooltip />
      <el-table-column label="样品名称" prop="SampleName" min-width="180" align="left" header-align="center" show-overflow-tooltip />
      <el-table-column label="测试日期" prop="TestDate" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.TestDate) }}</template>
      </el-table-column>
      <el-table-column label="创建人" width="80" align="center">
        <template #default="{ row }">{{ row.CreatorName || row.CreatedBy }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.Status)" size="small">{{ getStatusText(row.Status || 'Draft') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="160" align="center">
        <template #default="{ row }">{{ formatDateTime(row.CreatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="!canEdit(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="submit" :disabled="!canSubmit(row)">
                    <el-icon color="#67c23a"><Promotion /></el-icon> 提交审核
                  </el-dropdown-item>
                  <el-dropdown-item command="revoke" :disabled="!canRevoke(row)">
                    <el-icon color="#e6a23c"><RefreshLeft /></el-icon> 撤回
                  </el-dropdown-item>
                  <el-dropdown-item command="audit" :disabled="!canAudit(row)">
                    <el-icon color="#67c23a"><Check /></el-icon> 审核
                  </el-dropdown-item>
                  <el-dropdown-item command="print" divided>
                    <el-icon color="#909399"><Printer /></el-icon> 打印
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" :disabled="row.Status === 'Submitted'">
                    <el-icon color="#f56c6c"><Delete /></el-icon> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <el-pagination
        v-show="total > 0"
        :total="total"
        v-model:current-page="listQuery.page"
        v-model:page-size="listQuery.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchTableData"
        @current-change="fetchTableData"
      />
    </div>

    <!-- 新建报告对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建性能实验报告" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="报告编号">
          <el-input v-model="createForm.ReportNo" placeholder="自动生成" disabled />
        </el-form-item>
        <el-form-item label="测试日期">
          <el-date-picker v-model="createForm.TestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="样品名称">
          <el-input v-model="createForm.SampleName" placeholder="请输入样品名称" />
        </el-form-item>
        <el-form-item label="客户编号">
          <el-input v-model="createForm.CustomerCode" placeholder="请输入客户编号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate" :loading="createLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialogVisible" title="审核性能实验报告" width="400px">
      <el-form>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.action">
            <el-radio label="pass">通过</el-radio>
            <el-radio label="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input type="textarea" v-model="auditForm.comment" :placeholder="auditForm.action === 'reject' ? '请输入驳回原因（必填）' : '请输入审核意见（选填）'" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading" :disabled="auditForm.action === 'reject' && !auditForm.comment">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Platform, Document, Edit, Plus, DataLine, Timer, View, Delete, Refresh, Check, Promotion, Search, List, ArrowDown, RefreshLeft, Printer } from '@element-plus/icons-vue'
import { getReports, deleteReport, createReport } from '@/api/performance'
import { submitPerformanceReport, approvePerformanceReport, rejectPerformanceReport, revokePerformanceReport } from '@/api/inspection'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

// 列表数据
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedRows = ref([])

// 查询条件
const listQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})

// 统计数据
const dashboardStats = ref({
  total: 0,
  pending: 0
})

// 新建对话框
const createDialogVisible = ref(false)
const createLoading = ref(false)
const createForm = reactive({
  ReportNo: '',
  TestDate: dayjs().format('YYYY-MM-DD'),
  SampleName: '',
  CustomerCode: ''
})

// 审核对话框
const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const auditRow = ref(null)
const auditForm = reactive({
  action: 'pass',
  comment: ''
})

// 获取列表数据
const fetchTableData = async () => {
  loading.value = true
  try {
    const res = await getReports({
      page: listQuery.page,
      pageSize: listQuery.pageSize,
      keyword: listQuery.keyword,
      status: listQuery.status,
      startDate: listQuery.startDate,
      endDate: listQuery.endDate
    })
    tableData.value = res.data || []
    total.value = res.total || 0
    
    // 更新统计
    dashboardStats.value.total = total.value
    dashboardStats.value.pending = tableData.value.filter(r => r.Status === 'Submitted').length
  } catch (e) {
    console.error(e)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleFilter = () => {
  listQuery.page = 1
  fetchTableData()
}

// 重置
const handleReset = () => {
  listQuery.keyword = ''
  listQuery.status = ''
  listQuery.startDate = ''
  listQuery.endDate = ''
  listQuery.page = 1
  fetchTableData()
}

// 选择变化
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 判断是否为创建人
const isCreator = (row) => {
  if (!row || !userStore.user) return false
  const createdBy = (row.CreatedBy || '').toLowerCase()
  const currentUsername = (userStore.user.username || '').toLowerCase()
  const creatorName = (row.CreatorName || '').toLowerCase()
  const currentRealName = (userStore.user.realName || userStore.user.RealName || '').toLowerCase()
  
  return (createdBy && currentUsername && createdBy === currentUsername) ||
         (creatorName && currentRealName && creatorName === currentRealName)
}

// 权限判断方法
const canEdit = (row) => {
  if (!row) return false
  const allowedStatus = ['Draft', 'Saved', 'Rejected', '', null, undefined]
  return allowedStatus.includes(row.Status) && isCreator(row)
}

const canSubmit = (row) => {
  if (!row) return false
  const allowedStatus = ['Draft', 'Saved', 'Rejected', '', null, undefined]
  return allowedStatus.includes(row.Status) && isCreator(row)
}

const canRevoke = (row) => {
  if (!row) return false
  return row.Status === 'Submitted' && isCreator(row)
}

const canAudit = (row) => {
  if (!row) return false
  return row.Status === 'Submitted' && !isCreator(row)
}

// 新建报告
const handleCreate = () => {
  createForm.ReportNo = ''
  createForm.TestDate = dayjs().format('YYYY-MM-DD')
  createForm.SampleName = ''
  createForm.CustomerCode = ''
  createDialogVisible.value = true
}

const confirmCreate = async () => {
  if (!createForm.SampleName) {
    ElMessage.warning('请输入样品名称')
    return
  }
  createLoading.value = true
  try {
    const res = await createReport(createForm)
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    // 创建成功后直接跳转到编辑页面
    if (res.id) {
      router.push({ name: 'PerformanceReportEdit', params: { id: res.id } })
    } else {
      fetchTableData()
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('创建失败')
  } finally {
    createLoading.value = false
  }
}

// 查看详情
const handleView = (row) => {
  router.push({ name: 'PerformanceReportDetail', params: { id: row.ID } })
}

// 编辑
const handleEdit = (row) => {
  router.push({ name: 'PerformanceReportEdit', params: { id: row.ID } })
}

// 提交审核
const handleSubmit = async (row) => {
  try {
    await ElMessageBox.confirm('确定要提交此报告进行审核吗？', '提交审核', { type: 'warning' })
    const res = await submitPerformanceReport(row.ID)
    ElMessage.success(res.message || '已提交审核')
    fetchTableData()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '提交失败')
    }
  }
}

// 撤回
const handleRevoke = async (row) => {
  try {
    await ElMessageBox.confirm('确定要撤回此报告的审核申请吗？', '撤回审核', { type: 'warning' })
    const res = await revokePerformanceReport(row.ID)
    ElMessage.success(res.message || '已撤回')
    fetchTableData()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '撤回失败')
    }
  }
}

// 审核
const handleAudit = (row) => {
  auditRow.value = row
  auditForm.action = 'pass'
  auditForm.comment = ''
  auditDialogVisible.value = true
}

const confirmAudit = async () => {
  if (!auditRow.value) return
  
  auditLoading.value = true
  try {
    const apiCall = auditForm.action === 'pass'
      ? approvePerformanceReport(auditRow.value.ID, auditForm.comment)
      : rejectPerformanceReport(auditRow.value.ID, auditForm.comment)
    
    const res = await apiCall
    ElMessage.success(res.message || '审核完成')
    auditDialogVisible.value = false
    fetchTableData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.response?.data?.message || '审核失败')
  } finally {
    auditLoading.value = false
  }
}

const handlePrint = (row) => {
    const routeData = router.resolve({
        name: 'PerformanceReportPrintPreview',
        params: { id: row.ID }
    })
    window.open(routeData.href, '_blank')
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该报告吗？此操作不可恢复。', '警告', { type: 'warning' })
    .then(async () => {
      try {
        await deleteReport(row.ID)
        ElMessage.success('删除成功')
        fetchTableData()
      } catch (e) {
        console.error(e)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// 下拉菜单命令处理
const handleCommand = (command, row) => {
  switch (command) {
    case 'submit':
      handleSubmit(row)
      break
    case 'revoke':
      handleRevoke(row)
      break
    case 'audit':
      handleAudit(row)
      break
    case 'print':
      handlePrint(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的报告')
    return
  }
  
  const hasSubmitted = selectedRows.value.some(r => r.Status === 'Submitted')
  if (hasSubmitted) {
    ElMessage.warning('待审核状态的报告不能删除')
    return
  }
  
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条报告吗？`, '警告', { type: 'warning' })
    .then(async () => {
      try {
        for (const row of selectedRows.value) {
          await deleteReport(row.ID)
        }
        ElMessage.success('批量删除成功')
        fetchTableData()
      } catch (e) {
        console.error(e)
        ElMessage.error('批量删除失败')
      }
    })
    .catch(() => {})
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 状态相关
const getStatusType = (status) => {
  const map = {
    'Draft': 'info',
    'Saved': 'info',
    'Submitted': 'warning',
    'Audited': 'success',
    'Approved': 'success',
    'Rejected': 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'Draft': '草稿',
    'Saved': '草稿',
    'Submitted': '待审核',
    'Audited': '已审核',
    'Approved': '已审核',
    'Rejected': '已驳回',
    'Generated': '待审核'
  }
  return map[status] || status || '草稿'
}

// 初始化
onMounted(() => {
  fetchTableData()
})
</script>

<style scoped>
.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.filter-item {
  margin-right: 0;
}

/* 统计卡片样式 - 经典纯色填充 */
.stat-card {
  border-radius: 8px;
  height: 100%;
  margin-bottom: 16px;
  border: none;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.blue-icon {
  background: #409EFF;
  color: #fff;
}

.orange-icon {
  background: #E6A23C;
  color: #fff;
}

.green-icon {
  background: #67C23A;
  color: #fff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.blue-card {
  background: linear-gradient(135deg, #ecf5ff 0%, #f5f9ff 100%);
}

.orange-card {
  background: linear-gradient(135deg, #fdf6ec 0%, #fef9f3 100%);
}

.action-card {
  background: linear-gradient(135deg, #f0f9eb 0%, #f6fbf3 100%);
}

.action-content {
  width: 100%;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .stat-icon {
    width: 50px;
    height: 50px;
  }
  .stat-value {
    font-size: 24px;
  }
  .quick-actions {
    flex-direction: column;
    width: 100%;
  }
  .quick-actions .el-button {
    width: 100%;
  }
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 4px;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: bold;
}

:deep(.el-table .el-table__row--striped td.el-table__cell) {
  background-color: #fafafa;
}

/* 操作列按钮样式 */
.action-buttons {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  height: 100%;
}

.action-buttons .el-dropdown {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}
</style>
