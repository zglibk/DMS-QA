<template>
  <div class="inspection-dashboard">
    <!-- Header / Global Search -->
    <div class="dashboard-header">
      <div class="header-left">
        <div class="welcome-line">
            <span class="welcome-text">欢迎回来 ~ </span>
            <span class="username-text">{{ userStore.getUserDisplayName() }}</span>
        </div>
        <div class="time-line">
            <el-icon class="time-icon"><Clock /></el-icon>
            <span class="time-text">今天是 {{ currentTime }}</span>
            <el-tag size="small" type="success" effect="plain" class="week-tag">{{ currentWeek }}</el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-input 
            v-model="searchKeyword" 
            placeholder="搜索单号、供应商、物料..." 
            prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
            style="width: 300px"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch" style="margin-left: 10px">搜索</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- Main Workspace (70%) -->
      <el-col :span="17">
        <!-- Stats Cards -->
        <el-row :gutter="30" class="stats-row">
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card pending" @click="currentTab = 'todo'">
                    <div class="stat-card-body">
                        <div class="stat-left">
                            <el-icon class="stat-icon-new"><Timer /></el-icon>
                            <div class="stat-label">待处理任务</div>
                        </div>
                        <div class="stat-right">
                            <div class="stat-value">{{ stats.pendingAudit || 0 }}</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card draft" @click="currentTab = 'draft'">
                    <div class="stat-card-body">
                        <div class="stat-left">
                            <el-icon class="stat-icon-new"><EditPen /></el-icon>
                            <div class="stat-label">我的草稿</div>
                        </div>
                        <div class="stat-right">
                            <div class="stat-value">{{ stats.myDrafts || 0 }}</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card today">
                    <div class="stat-card-body">
                        <div class="stat-left">
                            <el-icon class="stat-icon-new"><Calendar /></el-icon>
                            <div class="stat-label">今日新增</div>
                        </div>
                        <div class="stat-right">
                            <div class="stat-value">{{ stats.todayCount || 0 }}</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card ng" @click="currentTab = 'ng'">
                    <div class="stat-card-body">
                        <div class="stat-left">
                            <el-icon class="stat-icon-new"><CircleCloseFilled /></el-icon>
                            <div class="stat-label">异常报告</div>
                        </div>
                        <div class="stat-right">
                            <div class="stat-value">{{ stats.ngCount || 0 }}</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- Task List -->
        <el-card class="task-card" shadow="never">
            <el-tabs v-model="currentTab">
                <el-tab-pane label="待办事项" name="todo">
                    <template #label>
                        <span>待办事项</span>
                        <el-badge :value="stats.pendingAudit" class="tab-badge" v-if="stats.pendingAudit > 0" />
                    </template>
                </el-tab-pane>
                <el-tab-pane label="我的提交" name="submitted" />
                <el-tab-pane label="我的草稿" name="draft" />
                <el-tab-pane label="最近异常" name="ng" />
            </el-tabs>

            <!-- Toolbar for Batch Actions -->
            <div class="table-toolbar" v-if="currentTab === 'todo' && selectedRows.length > 0">
                <span class="selected-tip">已选择 {{ selectedRows.length }} 项</span>
                <el-button type="success" size="small" @click="handleBatchAudit('pass')">批量通过</el-button>
                <el-button type="danger" size="small" @click="handleBatchAudit('reject')">批量驳回</el-button>
            </div>

            <el-table 
                v-loading="loading" 
                :data="tableData" 
                style="width: 100%" 
                @selection-change="handleSelectionChange"
                :row-class-name="tableRowClassName"
                @row-dblclick="handleRowDblClick"
            >
                <el-table-column type="selection" width="55" v-if="currentTab === 'todo'" />
                <el-table-column label="类型" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.ReportType === 'Incoming' ? '' : 'warning'" size="small" effect="light">
                            {{ row.ReportType === 'Incoming' ? '来料检验' : '性能实验' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="ReportNo" label="单号" width="180" show-overflow-tooltip />
                <el-table-column label="供应商/客户" show-overflow-tooltip>
                    <template #default="{ row }">
                        {{ row.TargetName || '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="SampleName" label="样品名称" show-overflow-tooltip />
                <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                        <span class="status-dot" :class="getStatusClass(row.Status)"></span>
                        {{ getStatusText(row.Status) }}
                    </template>
                </el-table-column>
                <el-table-column label="提交时间" width="160">
                    <template #default="{ row }">
                        {{ formatDate(row.CreatedAt) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="150" fixed="right">
                    <template #default="{ row }">
                        <el-button link type="primary" size="small" @click="handleView(row)">
                            {{ currentTab === 'todo' && row.Status === 'Submitted' ? '审核' : '查看' }}
                        </el-button>
                        <el-button link type="primary" size="small" v-if="row.Status === 'Draft' || row.Status === 'Rejected'" @click="handleEdit(row)">
                            编辑
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-container">
                <el-pagination
                    v-model:current-page="queryParams.page"
                    v-model:page-size="queryParams.pageSize"
                    :total="total"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="fetchTasks"
                    @current-change="fetchTasks"
                />
            </div>
        </el-card>
      </el-col>

      <!-- Sidebar (30%) -->
      <el-col :span="7">
        <!-- Quick Actions -->
        <el-card class="sidebar-card" shadow="hover">
            <template #header>
                <div class="card-header">
                    <span>快捷入口</span>
                </div>
            </template>
            <div class="quick-actions">
                <el-button type="primary" plain icon="Plus" class="action-btn" @click="$router.push('/admin/inspection/incoming/create')">
                    来料检验
                </el-button>
                <el-button type="warning" plain icon="Plus" class="action-btn" @click="$router.push('/admin/inspection/performance?action=create')">
                    性能实验
                </el-button>
                <el-button type="info" plain icon="Search" class="action-btn" @click="$router.push('/admin/inspection/incoming')">
                    查询记录
                </el-button>
            </div>
        </el-card>

        <!-- Notices / Tips -->
        <el-card class="sidebar-card" shadow="hover" style="margin-top: 15px">
            <template #header>
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center">
                    <span>系统公告</span>
                    <el-button link type="primary" size="small" @click="router.push('/admin/system/notices')">更多</el-button>
                </div>
            </template>
            <div class="notice-list">
                <div class="notice-item">
                    <el-tag size="small" type="danger">通知</el-tag>
                    <span class="notice-text">请尽快完成本月审核任务</span>
                </div>
                <div class="notice-item">
                    <el-tag size="small" type="success">更新</el-tag>
                    <span class="notice-text">检验系统 v2.1 上线</span>
                </div>
            </div>
        </el-card>
        
        <!-- Quality Trend (Placeholder) -->
        <el-card class="sidebar-card" shadow="hover" style="margin-top: 15px">
            <template #header>
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center">
                    <span>{{ chartView === 'ring' ? '今日概况' : '待办分布' }}</span>
                    <el-radio-group v-model="chartView" size="small">
                        <el-radio-button label="ring">
                            <el-icon><DataLine /></el-icon> 概况
                        </el-radio-button>
                        <el-radio-button label="list">
                            <el-icon><PieChart /></el-icon> 分布
                        </el-radio-button>
                    </el-radio-group>
                </div>
            </template>
             
             <!-- Ring Chart View -->
             <div class="chart-placeholder" v-if="chartView === 'ring'">
                 <div style="text-align: center; width: 100%; display: flex; justify-content: center;">
                     <el-progress type="dashboard" :percentage="80" status="success" :stroke-width="12">
                         <template #default="{ percentage }">
                             <span class="percentage-value">{{ stats.todayCount }}</span>
                             <span class="percentage-label">今日完成</span>
                         </template>
                     </el-progress>
                 </div>
             </div>

             <!-- Distribution List View -->
             <div class="distribution-list" v-else>
                 <div class="dist-item">
                     <div class="dist-info">
                         <span>来料检验</span>
                         <span>{{ stats.incomingPending || 0 }}</span>
                     </div>
                     <el-progress 
                        :percentage="stats.pendingAudit ? Math.round((stats.incomingPending || 0) / stats.pendingAudit * 100) : 0" 
                        :show-text="false"
                        status="primary"
                     />
                 </div>
                 <div class="dist-item" style="margin-top: 15px">
                     <div class="dist-info">
                         <span>性能实验</span>
                         <span>{{ stats.perfPending || 0 }}</span>
                     </div>
                     <el-progress 
                        :percentage="stats.pendingAudit ? Math.round((stats.perfPending || 0) / stats.pendingAudit * 100) : 0" 
                        :show-text="false"
                        color="#e6a23c"
                     />
                 </div>
             </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Audit Dialog -->
    <el-dialog v-model="auditDialogVisible" :title="auditTarget ? '审核' : '批量审核'" width="400px">
        <el-form>
            <el-form-item label="审核结果">
                <el-radio-group v-model="auditForm.action">
                    <el-radio label="pass">通过</el-radio>
                    <el-radio label="reject">驳回</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
                <el-input type="textarea" v-model="auditForm.comment" placeholder="请输入意见..." />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="auditDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmBatchAudit" :loading="auditing">确定</el-button>
        </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailDialogVisible" title="报告详情" width="70%" top="5vh">
        <div v-loading="detailLoading" style="min-height: 200px;">
            <!-- Incoming Layout -->
            <div v-if="detailType === 'Incoming' && detailData.ID">
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
                         <el-tag size="small">{{ getStatusText(detailData.Status) }}</el-tag>
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
                    <el-table-column prop="SingleItemJudgment" label="判" width="80" align="center">
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
            
            <!-- Performance Layout -->
            <div v-else-if="detailType === 'Performance' && detailData.ID">
                 <el-descriptions title="基本信息" border :column="3">
                    <el-descriptions-item label="报告编号">{{ detailData.ReportNo }}</el-descriptions-item>
                    <el-descriptions-item label="样品名称">{{ detailData.SampleName }}</el-descriptions-item>
                    <el-descriptions-item label="型号">{{ detailData.Model || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="批号">{{ detailData.BatchNo || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="供应商/客户">{{ detailData.Supplier }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                         <el-tag size="small">{{ getStatusText(detailData.Status) }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="申请人">{{ detailData.Applicant }}</el-descriptions-item>
                    <el-descriptions-item label="申请日期">{{ formatDate(detailData.ApplicationDate) }}</el-descriptions-item>
                 </el-descriptions>

                 <div class="section-header" style="margin: 20px 0 10px; font-weight: bold; border-left: 3px solid #409EFF; padding-left: 10px;">实验项目</div>
                 <el-table :data="detailData.items || []" border size="small">
                    <el-table-column prop="TestItem" label="测试项目" width="150" show-overflow-tooltip />
                    <el-table-column prop="Method" label="测试方法" width="120" show-overflow-tooltip />
                    <el-table-column prop="Requirements" label="测试要求" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="Result" label="测试结果" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="Conclusion" label="结论" width="80" align="center">
                         <template #default="{ row }">
                             <el-tag size="small" :type="row.Conclusion === '合格' ? 'success' : 'danger'" v-if="row.Conclusion">{{ row.Conclusion }}</el-tag>
                         </template>
                    </el-table-column>
                 </el-table>
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
import { ref, onMounted, reactive, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import api from '@/api'
import { getDashboardSummary, getDashboardTasks, batchAudit } from '@/api/inspectionDashboard'
import { getIncomingReportDetail } from '@/api/inspection'
import { getReport as getPerformanceReport } from '@/api/performance'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Timer, EditPen, Calendar, Warning, CircleCloseFilled, DataLine, PieChart, Clock, Bell } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const stats = ref({})
const tableData = ref([])
const notices = ref([])
const total = ref(0)
const loading = ref(false)
const searchKeyword = ref('')
const currentTab = ref('todo')
const selectedRows = ref([])
const chartView = ref('ring')
const currentTime = ref('')
const currentWeek = ref('')
let timer = null

const queryParams = reactive({
    page: 1,
    pageSize: 10,
    type: 'todo',
    keyword: ''
})

const auditDialogVisible = ref(false)
const auditing = ref(false)
const auditTarget = ref(null)
const auditForm = reactive({
    action: 'pass',
    comment: ''
})

// Detail Dialog Logic
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref({})
const detailType = ref('')

// Notice Logic
const noticeDialogVisible = ref(false)
const currentNotice = ref({})

const fetchNotices = async () => {
    try {
        const res = await api.get('/api/notice', {
            params: {
                limit: 5,
                page: 1,
                // 只显示有效的系统公告，或者显示所有类型的公告
                // type: 'system' 
            }
        })
        if (res.data.success) {
            notices.value = res.data.data
        }
    } catch (e) {
        console.error('获取公告失败', e)
    }
}

const viewNotice = async (notice) => {
    try {
        // 获取详情（包含内容）
        const res = await api.get(`/api/notice/${notice.ID}`)
        if (res.data.success) {
            currentNotice.value = res.data.data
            noticeDialogVisible.value = true
            
            // 如果未读，标记为已读（API getNoticeById 可能会自动标记，但也可以手动调一下确保）
             if (!notice.IsRead) {
                notice.IsRead = 1 // 更新本地状态
            }
        }
    } catch (e) {
        ElMessage.error('获取公告详情失败')
    }
}

const getNoticeTypeTag = (type) => {
    const map = {
        'system': 'danger',
        'important': 'warning',
        'general': 'info',
        'announcement': 'primary',
        'update': 'success'
    }
    return map[type] || 'info'
}

const getNoticeTypeLabel = (type) => {
    const map = {
        'system': '系统',
        'important': '重要',
        'general': '通知',
        'announcement': '公告',
        'update': '更新'
    }
    return map[type] || '通知'
}

const fetchStats = async () => {
    try {
        const res = await getDashboardSummary()
        stats.value = res.data
    } catch (e) { console.error(e) }
}

const fetchTasks = async () => {
    loading.value = true
    queryParams.type = currentTab.value
    queryParams.keyword = searchKeyword.value
    try {
        const res = await getDashboardTasks(queryParams)
        tableData.value = res.data
        total.value = res.total
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

watch(currentTab, () => {
    handleTabChange()
})

const handleTabChange = () => {
    queryParams.page = 1
    fetchTasks()
}

const handleSearch = () => {
    queryParams.page = 1
    fetchTasks()
}

const handleSelectionChange = (val) => {
    selectedRows.value = val
}

const handleView = (row) => {
    // If in Todo tab and status is Submitted, this is an Audit action
    if (currentTab.value === 'todo' && row.Status === 'Submitted') {
        handleSingleAudit(row)
        return
    }

    if (row.ReportType === 'Incoming') {
        router.push(`/admin/inspection/incoming/edit/${row.ID}?mode=view`)
    } else {
        // Performance report doesn't have dedicated view page separate from index?
        // Actually Performance Index opens a Drawer/Dialog.
        // We can navigate to Index and pass ID? Or create a detail route.
        // Currently Performance Report Detail is a component in Index.
        // I should update Performance Index to handle query param 'openId'.
        router.push({ path: '/admin/inspection/performance', query: { openId: row.ID } })
    }
}

const handleEdit = (row) => {
    if (row.ReportType === 'Incoming') {
        router.push(`/admin/inspection/incoming/edit/${row.ID}`)
    } else {
        router.push({ path: '/admin/inspection/performance', query: { openId: row.ID } })
    }
}

const handleBatchAudit = (action) => {
    auditTarget.value = null
    auditForm.action = action
    auditForm.comment = ''
    auditDialogVisible.value = true
}

const handleRowDblClick = async (row) => {
    detailType.value = row.ReportType
    detailLoading.value = true
    detailDialogVisible.value = true
    detailData.value = {} // Reset

    try {
        if (row.ReportType === 'Incoming') {
            const res = await getIncomingReportDetail(row.ID)
            detailData.value = res.data
        } else {
            const res = await getPerformanceReport(row.ID)
            detailData.value = res.data
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('获取详情失败')
    } finally {
        detailLoading.value = false
    }
}

const handleSingleAudit = (row) => {
    auditTarget.value = row
    auditForm.action = 'pass'
    auditForm.comment = ''
    auditDialogVisible.value = true
}

const confirmBatchAudit = async () => {
    let items = []
    if (auditTarget.value) {
        items = [{ id: auditTarget.value.ID, type: auditTarget.value.ReportType }]
    } else if (selectedRows.value.length) {
        items = selectedRows.value.map(r => ({ id: r.ID, type: r.ReportType }))
    }

    if (!items.length) return

    auditing.value = true
    try {
        await batchAudit({
            items,
            action: auditForm.action,
            comment: auditForm.comment
        })
        ElMessage.success('处理成功')
        auditDialogVisible.value = false
        auditTarget.value = null
        fetchTasks()
        fetchStats()
    } catch (e) {
        ElMessage.error('处理失败')
    } finally {
        auditing.value = false
    }
}



const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
}

const getStatusText = (status) => {
    const map = {
        'Draft': '草稿',
        'Submitted': '待审核',
        'Audited': '已审核',
        'Rejected': '已驳回',
        'Saved': '已保存'
    }
    return map[status] || status
}

const getStatusClass = (status) => {
    if (status === 'Submitted') return 'dot-orange'
    if (status === 'Audited') return 'dot-green'
    if (status === 'Rejected' || status === 'NG') return 'dot-red'
    return 'dot-gray'
}

const tableRowClassName = ({ row }) => {
    // Highlight overdue tasks?
    return ''
}

const updateTime = () => {
    const now = new Date()
    // Custom format YYYY-MM-DD HH:mm:ss
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const time = now.toLocaleTimeString('zh-CN', { hour12: false })
    currentTime.value = `${y}-${m}-${d} ${time}`
    
    const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentWeek.value = weeks[now.getDay()]
}

onMounted(() => {
    fetchStats()
    fetchTasks()
    fetchNotices()
    updateTime()
    timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})
</script>

<style scoped>
.inspection-dashboard {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: calc(100vh - 140px); /* Further reduced to ensure no scrollbar */
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.header-left h2 {
    margin: 0;
    font-size: 24px;
    color: #303133;
}

.welcome-line {
    font-size: 14px;
    margin-bottom: 8px;
}
.welcome-text { color: #67c23a; }
.username-text { color: #409eff; font-weight: bold; margin-left: 5px; }

.time-line {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #606266;
}
.time-icon { color: #409eff; margin-right: 5px; }
.week-tag { margin-left: 10px; }

.greeting {
    color: #909399;
    font-size: 14px;
    margin-top: 5px;
    display: block;
}

.stats-row {
    margin-bottom: 20px;
}

.stat-card {
    cursor: pointer;
    transition: transform 0.2s;
    position: relative;
    overflow: hidden;
    border: none;
}

.stat-card:hover {
    transform: translateY(-3px);
}

.stat-card.pending { background: #e6a23c; }
.stat-card.draft { background: #909399; }
.stat-card.today { background: #409eff; }
.stat-card.ng { background: #f56c6c; }

.stat-card-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
}

.stat-right {
    display: flex;
    align-items: center;
    padding-right: 20px;
}

.stat-icon-new {
    font-size: 24px;
    color: #fff;
}

.stat-card.pending .stat-icon-new { color: #fff; }
.stat-card.draft .stat-icon-new { color: #fff; }
.stat-card.today .stat-icon-new { color: #fff; }
.stat-card.ng .stat-icon-new { color: #fff; }

.stat-value {
    font-size: 36px;
    font-weight: bold;
    color: #fff;
    font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif;
    line-height: 1;
}

.stat-label {
    font-size: 14px;
    color: #fff;
    opacity: 0.9;
}

.task-card {
    /* Adaptive height */
}

.table-toolbar {
    padding: 10px 0;
    background: #fdf6ec;
    border: 1px solid #faecd8;
    border-radius: 4px;
    margin-bottom: 15px;
    padding-left: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.selected-tip {
    font-size: 13px;
    color: #e6a23c;
    margin-right: 10px;
}

.sidebar-card {
    background: #fff;
    margin-bottom: 20px;
}

.card-header {
    font-weight: bold;
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.action-btn {
    margin-left: 0 !important;
    justify-content: flex-start;
}

.notice-item {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    gap: 8px;
}

.notice-text {
    font-size: 13px;
    color: #606266;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 5px;
}

.dot-orange { background-color: #e6a23c; }
.dot-green { background-color: #67c23a; }
.dot-red { background-color: #f56c6c; }
.dot-gray { background-color: #909399; }

.empty-text {
    text-align: center;
    color: #909399;
    padding: 20px 0;
    font-size: 13px;
}

.new-dot {
    width: 6px;
    height: 6px;
    background-color: #f56c6c;
    border-radius: 50%;
    margin-left: 5px;
}

.dist-item {
    padding: 5px 0;
}

.dist-info {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #606266;
    margin-bottom: 5px;
}

.dist-info span:last-child {
    font-weight: bold;
    color: #303133;
    font-family: 'Segoe UI', 'Roboto', 'Arial', 'Helvetica Neue', sans-serif;
}

.pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

.percentage-value {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #303133;
}

.percentage-label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
}
</style>