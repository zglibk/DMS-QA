<template>
  <div class="app-container">
    <!-- Page Header with Actions -->
    <div class="page-header-card">
      <div class="header-left">
        <el-icon :size="24" color="#409EFF" style="margin-right: 10px;"><Document /></el-icon>
        <span style="font-size: 20px; font-weight: 600; color: #303133;">来料检验报告</span>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleCreate" v-if="hasPermission('quality:incoming:add')">新增报告</el-button>
        <el-button type="success" :icon="Lightning" @click="handleBatchGenerate" v-if="hasPermission('quality:incoming:add')">批量生成</el-button>
        <el-button :icon="Printer" @click="handleBatchPrint" :disabled="listSelection.length === 0">批量打印</el-button>
        <el-button type="danger" :icon="Delete" @click="handleBatchDelete" :disabled="listSelection.length === 0" v-if="hasPermission('quality:incoming:delete')">批量删除</el-button>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-container">
      <!-- 模糊搜索 -->
      <el-input v-model="listQuery.keyword" placeholder="品名/供应商 模糊搜索" style="width: 200px;" class="filter-item" clearable @keyup.enter="handleFilter">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      
      <!-- 供应商下拉 -->
      <el-select v-model="listQuery.supplier" placeholder="供应商" style="width: 160px;" class="filter-item" clearable filterable>
        <el-option v-for="item in filterOptions.suppliers" :key="item" :label="item" :value="item" />
      </el-select>
      
      <!-- 创建人下拉 -->
      <el-select v-model="listQuery.createdBy" placeholder="创建人" style="width: 120px;" class="filter-item" clearable filterable>
        <el-option v-for="item in filterOptions.creators" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      
      <!-- 状态下拉 -->
      <el-select v-model="listQuery.status" placeholder="状态" style="width: 100px;" class="filter-item" clearable>
        <el-option label="草稿" value="Saved" />
        <el-option label="待审核" value="Submitted" />
        <el-option label="已通过" value="Approved" />
        <el-option label="已驳回" value="Rejected" />
      </el-select>
      
      <!-- 判定结果下拉 -->
      <el-select v-model="listQuery.result" placeholder="判定结果" style="width: 110px;" class="filter-item" clearable>
        <el-option label="合格" value="合格" />
        <el-option label="不合格" value="不合格" />
      </el-select>
      
      <!-- 日期范围 -->
      <el-date-picker v-model="listQuery.startDate" type="date" placeholder="开始日期" style="width: 140px;" class="filter-item" value-format="YYYY-MM-DD" />
      <el-date-picker v-model="listQuery.endDate" type="date" placeholder="结束日期" style="width: 140px;" class="filter-item" value-format="YYYY-MM-DD" />
      
      <el-button class="filter-item" type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
      <el-button class="filter-item" :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <!-- Table -->
    <el-table 
      v-loading="listLoading" 
      :data="list" 
      border 
      fit 
      highlight-current-row 
      stripe
      style="width: 100%;"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold', textAlign: 'center' }"
      @row-dblclick="handleRowDblClick"
      @selection-change="handleListSelectionChange"
    >
      <el-table-column type="selection" width="45" align="center" fixed="left" />
      <el-table-column label="序号" type="index" width="55" align="center" />
      <el-table-column label="报告编号" prop="ReportNo" width="130" align="center" show-overflow-tooltip />
      <el-table-column label="供应商" prop="Supplier" min-width="140" align="left" header-align="center" show-overflow-tooltip />
      <el-table-column label="品名" prop="ProductName" min-width="140" align="left" header-align="center" show-overflow-tooltip />
      <el-table-column label="检验日期" prop="InspectionDate" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.InspectionDate) }}</template>
      </el-table-column>
      <el-table-column label="创建人" prop="CreatorName" width="80" align="center" />
      <el-table-column label="判定结果" prop="ReportResult" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.ReportResult === '合格' ? 'success' : 'danger'" size="small">{{ row.ReportResult }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" prop="Status" width="90" align="center">
        <template #default="{ row }">
            <el-tag v-if="row.Status === 'Saved'" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.Status === 'Submitted'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.Status === 'Approved' || row.Status === 'Audited'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.Status === 'Rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else size="small">{{ row.Status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button link type="primary" size="small" @click="handleUpdate(row)" :disabled="!canEdit(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="submit" :disabled="!canSubmit(row)">
                    <el-icon color="#67c23a"><Promotion /></el-icon> 提交审核
                  </el-dropdown-item>
                  <el-dropdown-item command="withdraw" :disabled="!canRevoke(row)">
                    <el-icon color="#e6a23c"><RefreshLeft /></el-icon> 撤回
                  </el-dropdown-item>
                  <el-dropdown-item command="audit" :disabled="!canAudit(row)">
                    <el-icon color="#67c23a"><Stamp /></el-icon> 审核
                  </el-dropdown-item>
                  <el-dropdown-item command="print" divided>
                    <el-icon color="#909399"><Printer /></el-icon> 打印
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" :disabled="!canDelete(row)">
                    <el-icon color="#f56c6c"><Delete /></el-icon> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div style="margin-top: 20px; display: flex; justify-content: center;">
      <el-pagination
        v-show="total > 0"
        :total="total"
        v-model:current-page="listQuery.page"
        v-model:page-size="listQuery.pageSize"
        :page-sizes="[5, 10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList"
        @current-change="getList"
      />
    </div>

    <!-- Batch Generate Dialog -->
    <el-dialog
      title="批量生成来料检验报告"
      v-model="batchDialogVisible"
      width="80%"
      class="inspection-dialog"
      :close-on-click-modal="false"
    >
      <div class="filter-container" style="display: flex; align-items: center;">
        <el-date-picker v-model="batchQuery.startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px; margin-right: 10px;" />
        <el-date-picker v-model="batchQuery.endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px; margin-right: 10px;" />
        <el-button type="primary" :icon="Search" @click="fetchBatchList">查询ERP入库单</el-button>
        <el-button :icon="Refresh" @click="resetBatchQuery">重置</el-button>
        
        <el-select 
            v-model="batchFilterCategory" 
            placeholder="筛选分类" 
            clearable 
            style="width: 150px; margin-left: 20px;"
            :disabled="batchCategories.length === 0"
        >
            <el-option 
                v-for="cat in batchCategories" 
                :key="cat" 
                :label="cat" 
                :value="cat" 
            />
        </el-select>

        <div style="flex: 1; text-align: right;">
            <el-button type="success" :icon="Download" @click="exportBatchList" :disabled="batchList.length === 0">导出Excel</el-button>
        </div>
      </div>

      <el-table
        v-loading="batchListLoading"
        :data="filteredBatchList"
        border
        fit
        highlight-current-row
        style="width: 100%; margin-top: 10px;"
        :header-cell-style="{ textAlign: 'center' }"
        :cell-style="{ textAlign: 'center' }"
        @selection-change="handleBatchSelectionChange"
        height="400"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="入库日期" prop="InboundDate" width="120" align="center" />
        <el-table-column label="单号" prop="BatchNo" width="150" align="center" show-overflow-tooltip />
        <el-table-column label="供应商" prop="Supplier" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column label="物料编码" prop="MaterialCode" width="120" align="center" show-overflow-tooltip />
        <el-table-column label="品名" prop="ProductName" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column label="规格" prop="Specification" width="120" align="center" show-overflow-tooltip />
        <el-table-column label="数量" prop="Quantity" width="100" align="center" />
        <el-table-column label="单位" prop="Unit" width="80" align="center" />
        <el-table-column label="卷/箱数" prop="PackageCount" width="100" align="center">
            <template #default="{ row }">
                 {{ row.PackageCount || '-' }}
            </template>
        </el-table-column>
        <el-table-column label="分类" prop="Category" width="130" align="center">
             <template #default="{ row }">
                 <el-select 
                    v-model="row.Category" 
                    size="small" 
                    filterable 
                    allow-create 
                    default-first-option
                    placeholder="请选择或输入"
                 >
                    <el-option label="纸张" value="纸张" />
                    <el-option label="膜类" value="膜类" />
                    <el-option label="化学辅料" value="化学辅料" />
                    <el-option label="其他" value="其他" />
                 </el-select>
             </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #909399; font-size: 13px;">已选择 {{ batchSelection.length }} 条记录</span>
          <div>
            <el-button @click="batchDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="batchGenerating" @click="executeBatchGenerate" :disabled="batchSelection.length === 0">
              立即生成
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- Audit Dialog -->
    <el-dialog v-model="auditDialogVisible" title="审核报告" width="400px">
        <el-form>
            <el-form-item label="审核结果">
                <el-radio-group v-model="auditForm.action">
                    <el-radio label="pass">通过</el-radio>
                    <el-radio label="reject">驳回</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
                <el-input type="textarea" v-model="auditForm.comment" placeholder="请输入意见..." :rows="3" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="auditDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmAudit" :loading="auditLoading">确定</el-button>
        </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailDialogVisible" title="报告详情" width="70%" top="5vh" append-to-body>
        <div v-loading="detailLoading" style="min-height: 200px;">
            <div v-if="detailData.ID">
                <el-descriptions title="基本信息" border :column="3">
                    <el-descriptions-item label="报告编号">{{ detailData.ReportNo }}</el-descriptions-item>
                    <el-descriptions-item label="供应商">{{ detailData.Supplier }}</el-descriptions-item>
                    <el-descriptions-item label="品名">{{ detailData.ProductName }}</el-descriptions-item>
                    <el-descriptions-item label="规格">{{ detailData.Specification }}</el-descriptions-item>
                    <el-descriptions-item label="数量">{{ detailData.Quantity }} {{ detailData.Unit }}</el-descriptions-item>
                    <el-descriptions-item label="来料日期">{{ formatDate(detailData.ArrivalDate) }}</el-descriptions-item>
                    <el-descriptions-item label="检验人">{{ detailData.Inspector }}</el-descriptions-item>
                    <el-descriptions-item label="检验日期">{{ formatDate(detailData.InspectionDate) }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                         <el-tag size="small">{{ detailData.Status }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="结果判定" :span="3">
                        <el-tag :type="detailData.ReportResult === '合格' ? 'success' : 'danger'">{{ detailData.ReportResult }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="备注" :span="3">{{ detailData.ReportRemark || '-' }}</el-descriptions-item>
                </el-descriptions>
                
                <div class="section-header" style="margin: 20px 0 10px; font-weight: bold; border-left: 3px solid #409EFF; padding-left: 10px;">检验项目</div>
                <el-table :data="detailData.details || []" border size="small">
                    <el-table-column prop="ItemName" label="检验项目" width="150" show-overflow-tooltip />
                    <el-table-column prop="InspectionStandard" label="标准" width="120" show-overflow-tooltip />
                    <el-table-column prop="AcceptanceCriteria" label="要求" width="120" show-overflow-tooltip />
                    <el-table-column label="实测值" min-width="120">
                         <template #default="{ row }">
                             {{ row.ResultJudgment || '-' }}
                         </template>
                    </el-table-column>
                    <el-table-column prop="SingleItemJudgment" label="判定" width="80" align="center">
                         <template #default="{ row }">
                             <span :style="{ color: row.SingleItemJudgment === '合格' ? '#67c23a' : '#f56c6c' }">{{ row.SingleItemJudgment }}</span>
                         </template>
                    </el-table-column>
                </el-table>
                
                <div v-if="detailData.TestImages" style="margin-top: 20px;">
                    <div class="section-header" style="margin-bottom: 10px; font-weight: bold; border-left: 3px solid #409EFF; padding-left: 10px;">测试图片</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <el-image 
                            v-for="(url, index) in detailData.TestImages.split(',')" 
                            :key="index"
                            :src="url" 
                            :preview-src-list="detailData.TestImages.split(',')"
                            style="width: 100px; height: 100px; border-radius: 4px; border: 1px solid #eee;" 
                            fit="cover"
                        />
                    </div>
                </div>
            </div>
            <div v-else-if="!detailLoading" style="text-align: center; color: #909399; padding: 40px;">
                暂无详情数据
            </div>
        </div>
        <template #footer>
            <el-button @click="detailDialogVisible = false">关闭</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getIncomingReports, updateIncomingReport, deleteIncomingReport, getIncomingReportDetail, searchMaterials, batchGenerateInspectionReports, withdrawIncomingReport, batchDeleteIncomingReports, submitIncomingReport, approveIncomingReport, rejectIncomingReport, getIncomingFilterOptions } from '@/api/inspection'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { Search, Plus, Lightning, Edit, Check, Stamp, Printer, Delete, Refresh, Download, RefreshLeft, Promotion, View, Document, ArrowDown } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const router = useRouter()
const userStore = useUserStore()
const list = ref([])
const total = ref(0)
const listLoading = ref(true)
const listSelection = ref([]) // Main list selection
const listQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  supplier: '',
  reportNo: '',
  startDate: '',
  endDate: '',
  status: '',
  result: '',
  createdBy: ''
})

// 筛选选项
const filterOptions = ref({
  suppliers: [],
  creators: [],
  productNames: []
})

// 获取筛选选项
const fetchFilterOptions = async () => {
  try {
    const res = await getIncomingFilterOptions()
    if (res.success) {
      filterOptions.value = res.data
    }
  } catch (e) {
    console.error('获取筛选选项失败:', e)
  }
}

// 重置筛选条件
const handleReset = () => {
  listQuery.keyword = ''
  listQuery.supplier = ''
  listQuery.reportNo = ''
  listQuery.startDate = ''
  listQuery.endDate = ''
  listQuery.status = ''
  listQuery.result = ''
  listQuery.createdBy = ''
  listQuery.page = 1
  getList()
}

const handleListSelectionChange = (val) => {
    listSelection.value = val
}

const handleBatchDelete = () => {
    if (listSelection.value.length === 0) return
    
    // Filter deletable rows
    const deletableRows = listSelection.value.filter(row => {
        // Same logic as single delete button
        const isCreatorOrDraft = isCreator(row) && ['Saved', 'Rejected'].includes(row.Status)
        return userStore.isAdmin || isCreatorOrDraft
    })
    
    if (deletableRows.length === 0) {
        ElMessage.warning('选中的记录均无删除权限或状态不可删除（只能删除草稿/驳回状态且是自己创建的报告）')
        return
    }
    
    const skippedCount = listSelection.value.length - deletableRows.length
    let confirmMsg = `确定要删除选中的 ${deletableRows.length} 条记录吗？`
    if (skippedCount > 0) {
        confirmMsg += ` (已自动跳过 ${skippedCount} 条无权限或不可删除的记录)`
    }
    
    ElMessageBox.confirm(confirmMsg, '批量删除确认', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
    }).then(async () => {
        try {
            const ids = deletableRows.map(r => r.ID)
            const res = await batchDeleteIncomingReports(ids)
            if (res.success) {
                ElMessage.success(res.message)
                getList()
                // listSelection.value = [] // Table clears selection automatically usually
            } else {
                ElMessage.error(res.message)
            }
        } catch (e) {
            console.error(e)
            ElMessage.error('批量删除失败')
        }
    })
}

const handlePrint = (row) => {
    const routeData = router.resolve({
        name: 'IncomingReportPrintPreview',
        params: { id: row.ID }
    })
    window.open(routeData.href, '_blank')
}

// 下拉菜单命令处理
const handleCommand = (command, row) => {
    switch (command) {
        case 'submit':
            handleSubmit(row)
            break
        case 'withdraw':
            handleWithdraw(row)
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

// 批量打印
const handleBatchPrint = () => {
    if (listSelection.value.length === 0) {
        ElMessage.warning('请先选择要打印的报告')
        return
    }
    
    // 依次打开打印预览
    listSelection.value.forEach((row, index) => {
        setTimeout(() => {
            handlePrint(row)
        }, index * 500) // 每隔500ms打开一个，避免浏览器拦截
    })
}

// Audit Logic
const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const currentAuditRow = ref(null)
const auditForm = reactive({
    action: 'pass',
    comment: ''
})

// Detail Logic
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

const handleView = (row) => {
    handleRowDblClick(row)
}

const handleRowDblClick = (row) => {
    detailLoading.value = true
    detailDialogVisible.value = true
    detailData.value = {}
    
    getIncomingReportDetail(row.ID).then(res => {
        detailData.value = res.data
    }).catch(() => {
        ElMessage.error('加载详情失败')
    }).finally(() => {
        detailLoading.value = false
    })
}

onMounted(() => {
  getList()
  fetchFilterOptions()
})

const getList = async () => {
  listLoading.value = true
  try {
    const response = await getIncomingReports(listQuery)
    list.value = response.data
    total.value = response.total
  } finally {
    listLoading.value = false
  }
}

const handleFilter = () => {
  listQuery.page = 1
  getList()
}

const formatDate = (date) => {
    if(!date) return ''
    return dayjs(date).format('YYYY-MM-DD')
}

const handleCreate = () => {
    router.push('/admin/inspection/incoming/create')
}

const handleUpdate = (row) => {
    router.push(`/admin/inspection/incoming/edit/${row.ID}`)
}

const handleDelete = (row) => {
    const isCreatorOrDraft = isCreator(row) && ['Saved', 'Rejected'].includes(row.Status);
    
    if (userStore.isAdmin && !isCreatorOrDraft) {
        ElMessageBox.confirm(
            '您正在以管理员身份执行强制物理删除，此操作不可恢复并将被记录日志。确认继续？', 
            '危险操作警告', 
            { 
                type: 'error', 
                confirmButtonText: '强制删除', 
                cancelButtonText: '取消',
                confirmButtonClass: 'el-button--danger' 
            }
        ).then(() => {
            doDelete(row)
        })
    } else {
        ElMessageBox.confirm('确认删除？', '警告', { type: 'warning' }).then(() => {
            doDelete(row)
        })
    }
}

const doDelete = (row) => {
    deleteIncomingReport(row.ID).then(() => {
        ElMessage.success('删除成功')
        getList()
    })
}

// Permission
const hasPermission = (perm) => {
    if (userStore.hasPermission) return userStore.hasPermission(perm)
    return true
}

const isCreator = (row) => {
    // 安全访问 userStore.userInfo，避免未登录或数据未就绪时报错
    if (!userStore.userInfo || !userStore.userInfo.id) {
        // 如果没有用户信息，尝试使用 username 匹配
        if (userStore.user && userStore.user.username) {
            const creator = (row.CreatedBy || '').toLowerCase()
            const currentUser = (userStore.user.username || '').toLowerCase()
            return creator === currentUser
        }
        return false
    }
    return row.CreatorID === userStore.userInfo.id
}

// 统一的权限判断方法
const canEdit = (row) => {
    if (!row) return false
    const allowedStatus = ['Saved', 'Rejected']
    return allowedStatus.includes(row.Status) && isCreator(row)
}

const canSubmit = (row) => {
    if (!row) return false
    const allowedStatus = ['Saved', 'Rejected']
    return allowedStatus.includes(row.Status) && isCreator(row)
}

const canRevoke = (row) => {
    if (!row) return false
    return row.Status === 'Submitted' && isCreator(row)
}

const canAudit = (row) => {
    if (!row) return false
    if (row.Status !== 'Submitted') return false
    if (isCreator(row)) return false // 不能审核自己的
    // admin 或 部门主管可以审核
    return userStore.isAdmin || isDeptLeader(row)
}

const canDelete = (row) => {
    if (!row) return false
    if (userStore.isAdmin) return true // admin可以删除任何
    const allowedStatus = ['Saved', 'Rejected']
    return allowedStatus.includes(row.Status) && isCreator(row)
}

const handleSubmit = (row) => {
    ElMessageBox.confirm('确认提交该报告进行审核吗？提交后将发送待办事项给审核人。', '提交审核', { type: 'warning' }).then(() => {
        submitIncomingReport(row.ID).then(res => {
            ElMessage.success(res.message || '提交成功')
            getList()
        }).catch(err => {
            ElMessage.error(err.response?.data?.message || '提交失败')
        })
    })
}

// isCreator is already defined above at line 430, removing duplicate definition here.
// But we need to make sure the implementation is correct.
// The previous implementation was:
// const isCreator = (row) => {
//    return row.CreatorID === userStore.userInfo.id
// }
// The duplicate one was:
// const isCreator = (row) => {
//     const creator = (row.CreatedBy || '').toLowerCase()
//     const currentUser = (userStore.user?.username || '').toLowerCase()
//     return creator === currentUser
// }
// Let's stick to the ID based one if possible, or consistent username based one.
// Given row usually has CreatorID from backend join.
// Let's remove this duplicate block entirely.

const isDeptLeader = (row) => {
    const user = userStore.user
    if (!user) return false
    
    // 1. 基于岗位层级的判断 (Direct Reporting Line)
    // 如果当前用户的岗位是创建人岗位的上级岗位
    if (user.positionId && row.CreatorParentPositionID && 
        Number(user.positionId) === Number(row.CreatorParentPositionID)) {
        return true
    }

    // 2. 基于部门和岗位级别的判断
    // 如果在同一部门，且当前用户岗位级别为"管理"(5)
    if (user.departmentId && row.CreatorDepartmentID && 
        Number(user.departmentId) === Number(row.CreatorDepartmentID)) {
         if (user.positionLevel === 5) { // 5: 管理岗
             return true
         }
    }
    
    // 3. 兼容旧逻辑：基于名称匹配 (Name Matching)
    // Check if user and creator are in the same department
    if (!user.departmentId || !row.CreatorDepartmentID) return false
    if (Number(user.departmentId) !== Number(row.CreatorDepartmentID)) return false
    
    // Check if user is a leader (Position or Role contains 'Manager', 'Supervisor', 'Director' etc.)
    const posName = (user.positionName || '').toLowerCase()
    const roleNames = (user.roles || []).map(r => (r.Name || r.name || '').toLowerCase())
    
    const leaderKeywords = ['主管', '经理', '部长', '总监', 'supervisor', 'manager', 'director']
    
    const isLeaderPosition = leaderKeywords.some(k => posName.includes(k))
    const isLeaderRole = roleNames.some(r => leaderKeywords.some(k => r.includes(k)))
    
    return isLeaderPosition || isLeaderRole
}

const handleAudit = (row) => {
     if (isCreator(row)) {
         ElMessage.warning('不能审核自己创建的报告')
         return
     }
     currentAuditRow.value = row
     auditForm.action = 'pass'
     auditForm.comment = ''
     auditDialogVisible.value = true
}

const confirmAudit = () => {
    if (!currentAuditRow.value) return
    
    auditLoading.value = true
    const row = currentAuditRow.value
    
    const apiCall = auditForm.action === 'pass' 
        ? approveIncomingReport(row.ID, auditForm.comment)
        : rejectIncomingReport(row.ID, auditForm.comment)
    
    apiCall.then(res => {
        ElMessage.success(res.message || '审核完成')
        auditDialogVisible.value = false
        getList()
    }).catch(err => {
        ElMessage.error(err.response?.data?.message || '审核失败')
    }).finally(() => {
        auditLoading.value = false
    })
}

const handleWithdraw = (row) => {
    ElMessageBox.confirm('确认撤回该提交吗？撤回后状态将变为草稿。', '提示', { type: 'warning' }).then(() => {
        withdrawIncomingReport(row.ID).then(() => {
            ElMessage.success('撤回成功')
            getList()
        })
    })
}

// --- Batch Generation Logic ---
const batchDialogVisible = ref(false)
const batchListLoading = ref(false)
const batchGenerating = ref(false)
const batchList = ref([])
const batchSelection = ref([])
const batchCategories = ref([]) // Stores unique categories
const batchFilterCategory = ref('') // Stores selected category for filtering

const batchQuery = reactive({
    startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
})

const filteredBatchList = computed(() => {
    if (!batchFilterCategory.value) {
        return batchList.value
    }
    return batchList.value.filter(item => item.Category === batchFilterCategory.value)
})

const handleBatchGenerate = () => {
    batchDialogVisible.value = true
    // Optionally fetch immediately
    // fetchBatchList()
}

const inferCategory = (name) => {
    if (!name) return '其他';
    name = name.toLowerCase();
    if (name.includes('纸')) return '纸张';
    if (name.includes('膜') || name.includes('bopp') || name.includes('pet')) return '膜类';
    if (name.includes('墨') || name.includes('胶') || name.includes('液') || name.includes('剂')) return '化学辅料';
    return '其他';
}

const fetchBatchList = async () => {
    batchListLoading.value = true
    try {
        const res = await searchMaterials({
            startDate: batchQuery.startDate,
            endDate: batchQuery.endDate
        })
        if (res.code === 0) {
            // Backend now handles Category mapping using MType or inference
            batchList.value = res.data
            
            // Extract unique categories
            const uniqueCategories = new Set(batchList.value.map(item => item.Category).filter(Boolean))
            batchCategories.value = Array.from(uniqueCategories)
            batchFilterCategory.value = '' // Reset filter on new search
        } else {
            ElMessage.error(res.message || '查询失败')
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('查询失败')
    } finally {
        batchListLoading.value = false
    }
}

const resetBatchQuery = () => {
    batchQuery.startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    batchQuery.endDate = dayjs().format('YYYY-MM-DD')
    // Optionally clear list or re-fetch
    batchList.value = []
    batchCategories.value = []
    batchFilterCategory.value = ''
}

const handleBatchSelectionChange = (val) => {
    batchSelection.value = val
}

const executeBatchGenerate = () => {
    if (batchSelection.value.length === 0) return
    
    ElMessageBox.confirm(`确定要为选中的 ${batchSelection.value.length} 条入库记录生成检验报告吗？`, '提示', {
        type: 'warning'
    }).then(async () => {
        batchGenerating.value = true
        try {
            const res = await batchGenerateInspectionReports(batchSelection.value)
            if (res.success) {
                ElMessage.success(res.message)
                batchDialogVisible.value = false
                getList() // Refresh main list
            } else {
                ElMessage.error(res.message || '生成失败')
            }
        } catch (e) {
            console.error(e)
            ElMessage.error('生成失败')
        } finally {
            batchGenerating.value = false
        }
    })
}

const exportBatchList = async () => {
    if (batchList.value.length === 0) {
        ElMessage.warning('暂无数据可导出')
        return
    }
    
    // 弹出确认对话框
    try {
        await ElMessageBox.confirm(
            `共查询到 ${batchList.value.length} 条记录，确定要导出为Excel吗？`, 
            '导出确认', 
            {
                confirmButtonText: '确定导出',
                cancelButtonText: '取消',
                type: 'info',
                icon: Download
            }
        )
    } catch {
        return // 用户取消
    }

    try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('ERP入库单查询结果')

        // 定义列
        worksheet.columns = [
            { header: '入库日期', key: 'InboundDate', width: 15 },
            { header: '单号', key: 'BatchNo', width: 20 },
            { header: '供应商', key: 'Supplier', width: 30 },
            { header: '物料编码', key: 'MaterialCode', width: 15 },
            { header: '品名', key: 'ProductName', width: 30 },
            { header: '规格', key: 'Specification', width: 20 },
            { header: '数量', key: 'Quantity', width: 10 },
            { header: '单位', key: 'Unit', width: 8 },
            { header: '卷/箱数', key: 'PackageCount', width: 10 },
            { header: '分类', key: 'Category', width: 10 },
        ]

        // 样式设置
        const titleColor = 'F0F0F0' // RGB(240,240,240)
        const stripeColor = 'FAFAFA' // 浅色，用于隔行变色

        // 全局样式: 字体 Tahoma, 大小 9
        const baseStyle = {
            font: { name: 'Tahoma', size: 9 },
            alignment: { vertical: 'middle', horizontal: 'center' }
        }

        // 应用标题行样式
        const headerRow = worksheet.getRow(1)
        headerRow.height = 18 // Modified to 18
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Tahoma', size: 9, bold: true }
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + titleColor }
            }
            cell.alignment = baseStyle.alignment
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        })

        // 添加数据并应用样式
        batchList.value.forEach((item, index) => {
            const row = worksheet.addRow({
                InboundDate: item.InboundDate,
                BatchNo: item.BatchNo,
                Supplier: item.Supplier,
                MaterialCode: item.MaterialCode,
                ProductName: item.ProductName,
                Specification: item.Specification,
                Quantity: item.Quantity,
                Unit: item.Unit,
                PackageCount: item.PackageCount,
                Category: item.Category
            })

            row.height = 18 // Modified to 18
            
            // 隔行变色
            const isStripe = index % 2 === 0
            
            row.eachCell((cell) => {
                cell.font = baseStyle.font
                
                // 设置对齐方式：特定列靠左，其他居中
                const leftAlignKeys = ['Supplier', 'MaterialCode', 'ProductName']
                if (cell._column && leftAlignKeys.includes(cell._column.key)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' }
                } else {
                    cell.alignment = baseStyle.alignment
                }

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                
                if (isStripe) {
                     cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF' + stripeColor }
                    }
                }
            })
        })
        
        // 导出
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const fileName = `ERP 物料入库信息_${dayjs().format('YYMMDDHHmmss')}.xlsx`
        saveAs(blob, fileName)
        
        ElMessage.success('导出成功')
    } catch (e) {
        console.error('导出失败', e)
        ElMessage.error('导出失败')
    }
}

</script>

<style>
/* Global styles for this component's dialog */
.inspection-dialog {
    border-radius: 8px;
    margin-top: 5vh !important;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.inspection-dialog .el-dialog__body {
    padding: 30px 60px !important;
    overflow-y: auto;
    flex: 1;
}

.inspection-dialog .el-dialog__footer {
    text-align: center;
    padding: 20px;
    border-top: 1px solid #f0f0f0;
}

/* Print Styles */
@media print {
  /* Hide everything in body */
  body > * {
    display: none !important;
  }
  
  /* Show only the print wrapper (which is teleported to body) */
  body > .print-wrapper {
    display: block !important;
  }
}
</style>

<style scoped>
/* 页面标题栏 */
.page-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 筛选区域 */
.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
}

.filter-item {
  margin-right: 0;
}

/* 表格样式 */
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

/* Dialog Styles */
.section-title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 15px;
    padding-left: 10px;
    border-left: 4px solid #409EFF;
}

.section-content {
    padding: 0 10px;
}
</style>
