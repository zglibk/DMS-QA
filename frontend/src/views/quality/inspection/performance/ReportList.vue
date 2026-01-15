<template>
  <div class="report-list">
    <div class="list-header">
      <el-input v-model="keyword" placeholder="搜索报告号/样品" clearable @input="handleSearch" style="flex: 1">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-tooltip content="新建报告" placement="top">
        <el-button type="primary" :icon="Plus" circle @click="handleCreate" :disabled="!userStore.hasPermission('quality:performance:add')" />
      </el-tooltip>
    </div>
    <div class="list-content" v-loading="loading">
      <el-scrollbar>
        <div v-if="list.length === 0" class="empty-text">暂无数据</div>
        <div 
            v-for="item in list" 
            :key="item.ID" 
            class="list-item" 
            :class="{ active: selectedId === item.ID }"
            @click="selectItem(item.ID)"
            @mouseenter="hoverId = item.ID"
            @mouseleave="hoverId = null"
        >
            <div class="item-row">
                <span class="item-title">{{ item.ReportNo }}</span>
                <el-tag size="small" :type="getStatusType(item.Status)">{{ mapStatus(item.Status) }}</el-tag>
            </div>
            <div class="item-row sub">
                <span class="item-sub-text" :title="item.SampleName">{{ item.SampleName }}</span>
                <span class="item-date" :style="{ opacity: hoverId === item.ID ? 0 : 1 }">{{ formatDate(item.TestDate) }}</span>
                <div v-if="hoverId === item.ID" class="delete-btn-wrapper" @click.stop>
                    <el-button 
                        v-if="(userStore.isAdmin || userStore.user.username === item.CreatedBy) && item.Status === 'Submitted'"
                        type="warning" 
                        link 
                        :icon="RefreshLeft" 
                        size="small" 
                        style="padding: 0; margin-right: 8px;" 
                        @click="handleWithdraw(item)"
                        :disabled="userStore.user.username !== item.CreatedBy"
                        title="撤回提交"
                    >撤回</el-button>
                    <el-button 
                        v-if="userStore.isAdmin || userStore.user.username === item.CreatedBy"
                        type="danger" 
                        link 
                        :icon="Delete" 
                        size="small" 
                        style="padding: 0;" 
                        @click="confirmDelete(item)"
                        title="删除报告"
                        :disabled="!userStore.hasPermission('quality:performance:delete')"
                    >删除</el-button>
                </div>
            </div>
        </div>
      </el-scrollbar>
    </div>
    
    <div class="pagination">
        <el-pagination 
            small 
            layout="prev, next" 
            :total="total" 
            :page-size="pageSize" 
            @current-change="handlePageChange"
        />
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="createVisible" title="新建报告" width="500px">
        <el-form :model="createForm" label-width="100px">
            <el-form-item label="报告编号">
                <el-input v-model="createForm.ReportNo" placeholder="自动生成" disabled />
            </el-form-item>
            <el-form-item label="测试日期">
                <el-date-picker v-model="createForm.TestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="样品名称">
                <el-input v-model="createForm.SampleName" />
            </el-form-item>
            <el-form-item label="客户编号">
                <el-input v-model="createForm.CustomerCode" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="createVisible = false">取消</el-button>
            <el-button type="primary" @click="submitCreate">确定</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getReports, createReport, deleteReport, updateReport } from '@/api/performance'
import { revokePerformanceReport } from '@/api/inspection'
import { Search, Plus, Delete, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const emit = defineEmits(['select'])

const list = ref([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const selectedId = ref(null)
const hoverId = ref(null)

const createVisible = ref(false)
const createForm = reactive({
    ReportNo: '',
    TestDate: dayjs().format('YYYY-MM-DD'),
    SampleName: '',
    CustomerCode: ''
})

const fetchList = async () => {
    loading.value = true
    try {
        const res = await getReports({
            page: page.value,
            pageSize: pageSize.value,
            keyword: keyword.value
        })
        list.value = res.data
        total.value = res.total
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    page.value = 1
    fetchList()
}

const handlePageChange = (val) => {
    page.value = val
    fetchList()
}

const selectItem = (id) => {
    selectedId.value = id
    emit('select', id)
}

const handleCreate = () => {
    createForm.ReportNo = ''
    createForm.TestDate = dayjs().format('YYYY-MM-DD')
    createForm.SampleName = ''
    createForm.CustomerCode = ''
    createVisible.value = true
}

const handleWithdraw = async (item) => {
    try {
        await ElMessageBox.confirm(
            '确定要撤回此报告的提交吗？撤回后报告将变回草稿状态。',
            '撤回提交',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        const res = await revokePerformanceReport(item.ID)
        ElMessage.success(res.message || '已撤回')
        // Refresh list
        fetchList()
        // If this item is currently selected, trigger a refresh on detail view too if possible,
        // but ReportList doesn't control ReportDetail directly. 
        // However, if we refresh list, the user might click it again.
        // Actually, if selectedId matches, we should probably re-select it to refresh detail or emit event.
        if (selectedId.value === item.ID) {
            emit('select', item.ID) // Trigger reload in parent -> detail
        }
    } catch (e) {
        if (e !== 'cancel') {
            console.error(e)
            ElMessage.error(e.response?.data?.message || '撤回失败')
        }
    }
}

const handleDelete = async (item) => {
    // Check if user is admin
    if (userStore.isAdmin) {
        ElMessageBox.confirm(
            '您正在以管理员身份执行强制物理删除，此操作不可恢复并将被记录日志。确认继续？', 
            '危险操作警告', 
            { 
                type: 'error', 
                confirmButtonText: '强制删除', 
                cancelButtonText: '取消',
                confirmButtonClass: 'el-button--danger' 
            }
        ).then(async () => {
            await doDelete(item)
        }).catch(() => {})
    } else {
        // Normal user delete
        ElMessageBox.confirm(
            '确认删除该报告吗？删除后不可恢复。',
            '提示',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(async () => {
            await doDelete(item)
        }).catch(() => {})
    }
}

const doDelete = async (item) => {
    try {
        await deleteReport(item.ID)
        ElMessage.success('删除成功')
        if (selectedId.value === item.ID) {
            selectedId.value = null
            emit('select', null)
        }
        fetchList()
    } catch (e) {
        console.error(e)
    }
}

const confirmDelete = (item) => {
    handleDelete(item)
}

const submitCreate = async () => {
    if (!createForm.SampleName) return ElMessage.warning('请输入样品名称')
    try {
        const res = await createReport(createForm)
        ElMessage.success('创建成功')
        createVisible.value = false
        // Refresh list
        page.value = 1
        await fetchList()
        // Auto select the newly created report
        if (res.ID) {
            selectItem(res.ID)
        }
    } catch (e) {
        console.error(e)
    }
}

const getStatusType = (status) => {
    const map = {
        'Draft': 'info',
        'Submitted': 'warning',
        'Audited': 'success',
        'Rejected': 'danger'
    }
    return map[status] || 'info'
}

const mapStatus = (status) => {
    const map = {
        'Draft': '草稿',
        'Submitted': '已提交',
        'Audited': '已审核',
        'Rejected': '已驳回'
    }
    return map[status] || status
}

const formatDate = (date) => {
    if (!date) return ''
    return dayjs(date).format('MM-DD')
}

onMounted(() => {
    fetchList()
})

defineExpose({ fetchList, handleCreate, selectItem })
</script>

<style scoped>
.report-list {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.list-header {
    padding: 12px 15px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
}
.list-content {
    flex: 1;
    overflow: hidden;
    background: #fff;
}
.list-item {
    padding: 12px 15px;
    border-bottom: 1px solid #f0f2f5;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}
.delete-btn-wrapper {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
}
.list-item:hover {
    background: #f5f7fa;
}
.list-item.active {
    background: #ecf5ff;
    border-right: 3px solid #409eff;
}
.item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.item-row.sub {
    position: relative;
}
.item-title {
    font-weight: normal;
    color: #409EFF;
    font-size: 14px;
}
.item-sub-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 8px;
    color: #606266;
    font-size: 13px;
}
.item-date {
    color: #909399;
    font-size: 12px;
}
.pagination {
    padding: 8px 5px;
    text-align: center;
    border-top: 1px solid #ebeef5;
    background: #fff;
}
.empty-text {
    text-align: center;
    color: #999;
    padding: 20px;
}
</style>
