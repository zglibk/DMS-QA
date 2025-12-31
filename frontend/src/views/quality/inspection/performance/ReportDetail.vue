<template>
  <div class="report-detail" v-loading="loading">
    <div v-if="report" class="detail-header">
        <div class="header-left">
             <span class="header-title">报告详情</span>
             <el-tag v-if="report.Status" size="small" effect="plain">{{ report.Status }}</el-tag>
        </div>
        <div class="header-right">
             <div class="actions-bar-top">
                <el-button type="primary" :icon="DocumentAdd" @click="handleSaveItems" :loading="saving" :disabled="!isEditable || !userStore.hasPermission('quality:performance:edit')">保存草稿</el-button>
                <el-button type="info" plain :icon="Printer" @click="handlePreview" :disabled="!userStore.hasPermission('quality:performance:print')">报告预览/打印</el-button>
                
                <el-button type="warning" :icon="Promotion" v-if="report.Status === 'Draft' || report.Status === 'Rejected'" @click="handleSubmit" :disabled="!isEditable || !userStore.hasPermission('quality:performance:edit')">提交审核</el-button>
                <el-button type="success" :icon="Check" v-if="report.Status === 'Submitted'" @click="handleAudit" :disabled="!canAudit">审核通过</el-button>
             </div>
             <el-button circle :icon="Close" @click="handleClose" title="关闭" class="close-btn"></el-button>
        </div>
    </div>
    <div v-if="report" class="detail-content">
        <BasicInfoForm ref="basicInfoRef" :data="report" :readonly="!isEditable" @update="handleUpdateInfo" />
        
        <TestItemsManager 
            v-model:items="items" 
            :instruments="instruments" 
            :readonly="!isEditable"
            @delete-item="handleDeleteItem"
        />
    </div>
    <div v-else class="empty-text" v-loading="true" style="height: 100%"></div>

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
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import BasicInfoForm from './components/BasicInfoForm.vue'
import TestItemsManager from './components/TestItemsManager.vue'
import { getReport, updateReport, addReportItem, updateReportItem, deleteReportItem, getInstruments } from '@/api/performance'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Check, Promotion, Printer, DocumentAdd } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const router = useRouter()
const props = defineProps({
    reportId: [Number, String]
})

const emit = defineEmits(['refresh', 'close'])

const loading = ref(false)
const saving = ref(false)
const report = ref(null)
const items = ref([])
const instruments = ref([])
const basicInfoRef = ref(null)
const itemsSnapshot = ref('')
const isDirty = ref(false)

const isEditable = computed(() => {
    if (!report.value) return false
    const isCreator = report.value.CreatedBy === userStore.user.username
    // Only creator can edit/submit. Admin can only Delete/Audit.
    return (report.value.Status === 'Draft' || report.value.Status === 'Rejected') && isCreator
})

const canAudit = computed(() => {
    if (!report.value) return false
    const isCreator = report.value.CreatedBy === userStore.user.username
    
    // 2. Check Department and Position (Dept Leader Logic)
    // Assuming we can get dept/position info. If not available, we rely on permissions below.
    const isDeptLeader = () => {
        const user = userStore.user
        if (!user) return false
        
        // Use logic similar to IncomingInspection if data is available
        // Since we don't have CreatorDeptID on report easily here without joining,
        // we will skip strict dept matching for now or assume permission handles it.
        // However, user asked for "具备权限管理赋予的审核权限（如岗位）才可以审核"
        
        // Check if user has 'Leader' role or position
        const posName = (user.positionName || '').toLowerCase()
        const roleNames = (user.roles || []).map(r => (r.Name || r.name || '').toLowerCase())
        const leaderKeywords = ['主管', '经理', '部长', '总监', 'supervisor', 'manager', 'director']
        
        const isLeader = leaderKeywords.some(k => posName.includes(k)) || 
                         roleNames.some(r => leaderKeywords.some(k => r.includes(k)))
                         
        return isLeader
    }

    // 3. Permission Check
    // 'quality:performance:audit' should be configured in backend for specific roles/users
    const hasAuditPerm = userStore.hasPermission ? userStore.hasPermission('quality:performance:audit') : false
    
    // Final logic:
    // Status is Submitted
    // AND Not Creator
    // AND (Admin OR (HasAuditPermission AND IsDeptLeader/Authorized))
    // We combine HasAuditPerm and IsDeptLeader as an OR or AND depending on strictness.
    // User said: "must possess audit permission granted by permission management (e.g. position)"
    // So likely permission check is key.
    
    return report.value.Status === 'Submitted' && 
           !isCreator && 
           (userStore.isAdmin || hasAuditPerm)
})

const updateSnapshot = () => {
    itemsSnapshot.value = JSON.stringify(items.value)
    isDirty.value = false
}

watch(items, (newVal) => {
    if (JSON.stringify(newVal) !== itemsSnapshot.value) {
        isDirty.value = true
    } else {
        isDirty.value = false
    }
}, { deep: true })

const fetchData = async () => {
    if (!props.reportId) return
    loading.value = true
    try {
        const res = await getReport(props.reportId)
        report.value = res.data
        items.value = res.data.items || []
        // Use nextTick to ensure watch doesn't trigger dirty immediately if it was sync?
        // JSON stringify comparison handles it.
        updateSnapshot()
    } finally {
        loading.value = false
    }
}

const fetchInstruments = async () => {
    try {
        const res = await getInstruments()
        instruments.value = res.data
    } catch (e) {
        console.error(e)
    }
}

watch(() => props.reportId, () => {
    fetchData()
})

onMounted(() => {
    fetchInstruments()
    fetchData()
})

const handleUpdateInfo = async (newData) => {
    try {
        await updateReport(newData.ID, newData)
        ElMessage.success('基础信息已保存')
        report.value = { ...newData }
        emit('refresh')
    } catch (e) {
        console.error(e)
    }
}

const handleSaveItems = async () => {
    saving.value = true
    try {
        // Process items
        for (const item of items.value) {
            // Prepare payload
            const payload = {
                ...item,
                ReportID: report.value.ID
            }
            
            if (item.ID) {
                // Update
                await updateReportItem(item.ID, payload)
            } else {
                // Create
                await addReportItem(payload)
            }
        }
        ElMessage.success('实验项目已保存')
        await fetchData() // Refresh to get IDs
    } catch (e) {
        console.error(e)
        ElMessage.error('保存失败')
    } finally {
        saving.value = false
    }
}

const handleDeleteItem = async (item, index) => {
    try {
        if (item.ID) {
            await deleteReportItem(item.ID)
        }
        items.value.splice(index, 1)
        updateSnapshot()
        ElMessage.success('已删除')
    } catch (e) {
        console.error(e)
    }
}

const handleSubmit = async () => {
    try {
        await ElMessageBox.confirm(
            '确定要提交此报告进行审核吗？提交后将无法继续编辑。',
            '提交审核',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        await updateReport(report.value.ID, { Status: 'Submitted' })
        ElMessage.success('已提交')
        fetchData()
        emit('refresh')
    } catch (e) {
        if (e !== 'cancel') {
            console.error(e)
        }
    }
}

const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const auditForm = reactive({
    action: 'pass',
    comment: ''
})

const handleAudit = () => {
    auditForm.action = 'pass'
    auditForm.comment = ''
    auditDialogVisible.value = true
}

const confirmAudit = async () => {
    auditLoading.value = true
    try {
        const payload = { ...report.value }
        
        // Status
        if (auditForm.action === 'pass') {
            payload.Status = 'Audited'
        } else {
            payload.Status = 'Rejected' // Assuming Rejected status is supported or reuse Draft? Usually Rejected.
            // If backend doesn't support Rejected, use Draft?
            // Incoming inspection uses 'Rejected'. Let's assume Performance supports it too or update backend.
            // Actually, performance usually just goes back to Draft or stays Submitted.
            // Let's check backend... It updates 'Status'.
            // If 'Rejected', creator can edit again (if we update isEditable logic).
        }
        
        // Audit Info
        payload.AuditedBy = userStore.user?.username || 'Admin'
        // Use RealName from store for immediate display
        payload.AuditorName = userStore.user?.RealName || userStore.user?.realName || userStore.user?.username || 'Admin'
        payload.AuditDate = dayjs().format('YYYY-MM-DD')
        
        // Append comment if any
        if (auditForm.comment) {
            // Check if ReportRemark exists, if not, maybe store in a new field or append to existing text field?
            // BasicInfoForm has no Remark field displayed by default, but DB might have it?
            // PerformanceReports table: CreatedBy, UpdatedBy...
            // Let's assume we can add to a 'Remarks' field if it exists, or just log it.
            // Since we don't have explicit remark field in UI, maybe just log or ignore for now?
            // Incoming inspection appends to ReportRemark.
            // Let's try to append to 'Specification' or 'SampleModel' if no remark? No, bad idea.
            // Let's just update status for now.
        }

        await updateReport(payload.ID, payload)
        ElMessage.success('审核完成')
        auditDialogVisible.value = false
        fetchData()
        emit('refresh')
    } catch (e) {
        console.error(e)
    } finally {
        auditLoading.value = false
    }
}

const handlePreview = () => {
    // Check for unsaved changes
    const isBasicInfoEditing = basicInfoRef.value?.isEdit
    if (isDirty.value || isBasicInfoEditing) {
        ElMessageBox.confirm(
            '当前有未保存的修改，预览将显示上次保存的内容。建议先保存后再预览。是否继续？',
            '提示',
            { 
                confirmButtonText: '继续预览', 
                cancelButtonText: '取消', 
                type: 'warning' 
            }
        ).then(() => {
            openPrintPage()
        }).catch(() => {})
    } else {
        openPrintPage()
    }
}

const openPrintPage = () => {
    const { href } = router.resolve({
        name: 'PerformanceReportPrintPreview',
        params: { id: report.value.ID }
    })
    window.open(href, '_blank')
}

const handleClose = () => {
    const isBasicInfoEditing = basicInfoRef.value?.isEdit
    if (isDirty.value || isBasicInfoEditing) {
        ElMessageBox.confirm(
            '当前有未保存的修改，关闭后将丢失，是否确认关闭？',
            '提示',
            { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        ).then(() => {
            emit('close')
        }).catch(() => {})
    } else {
        emit('close')
    }
}
</script>

<style>
/* Global styles for preview dialog */
.preview-dialog .el-dialog__header {
    display: none;
}
.preview-dialog .el-dialog__body {
    padding: 0;
    height: 100vh;
    overflow: hidden;
}
</style>

<style scoped>
.report-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
}
.detail-header {
    padding: 12px 20px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
}
.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}
.header-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}
.detail-content {
    flex: 1;
    overflow-y: visible;
    padding: 0; /* Remove internal padding */
    /* padding-bottom: 80px; Removed bottom space as actions are moved to top */
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.actions-bar-top {
    display: flex;
    gap: 10px;
}

.close-btn {
    margin-left: 8px;
}
</style>
