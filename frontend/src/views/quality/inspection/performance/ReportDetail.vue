<template>
  <div class="report-detail" v-loading="loading">
    <div v-if="report" class="detail-header">
        <div class="header-left">
             <span class="header-title">报告详情</span>
             <el-tag v-if="report.Status" size="small" effect="plain">{{ report.Status }}</el-tag>
        </div>
        <div class="header-right">
             <div class="actions-bar-top">
                <el-button type="primary" :icon="DocumentAdd" @click="handleSaveItems" :loading="saving" :disabled="!isEditable || !userStore.hasPermission('quality:performance:edit')">{{ report.Status === 'Saved' ? '保存修改' : '保存草稿' }}</el-button>
                <el-button type="info" plain :icon="Printer" @click="handlePreview" :disabled="!userStore.hasPermission('quality:performance:print')">报告预览/打印</el-button>
                
                <el-button type="warning" :icon="Promotion" v-if="report.Status === 'Draft' || report.Status === 'Saved' || report.Status === 'Rejected'" @click="handleSubmit" :disabled="!isEditable || !userStore.hasPermission('quality:performance:edit')">提交审核</el-button>
                <el-button type="success" :icon="Check" v-if="report.Status === 'Submitted'" @click="handleAudit" :disabled="!canAudit">审核通过</el-button>
                <el-button type="warning" plain :icon="RefreshRight" v-if="canRecheck" @click="handleRecheck">复检</el-button>
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
import { getReport, updateReport, addReportItem, updateReportItem, deleteReportItem, getInstruments, createRecheckReport } from '@/api/performance'
import { submitPerformanceReport, approvePerformanceReport, rejectPerformanceReport } from '@/api/inspection'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Check, Promotion, Printer, DocumentAdd, RefreshRight } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { checkPerformanceAuditPermission, checkPerformanceEditPermission } from '@/utils/permission'

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
    // 显式依赖 userStore.user 以确保响应式更新
    const currentUser = userStore.user
    return checkPerformanceEditPermission(report.value)
})

const canAudit = computed(() => {
    // 显式依赖 userStore.user 以确保响应式更新
    const currentUser = userStore.user
    return checkPerformanceAuditPermission(report.value)
})

const canRecheck = computed(() => {
    if (!report.value) return false
    const isCreator = report.value.CreatedBy === userStore.user.username
    return isCreator && report.value.Status === 'Audited'
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
    // 检查是否有实验项目
    if (!items.value || items.value.length === 0) {
        ElMessage.warning('请先添加实验数据')
        return
    }

    try {
        await ElMessageBox.confirm(
            '确定要提交此报告进行审核吗？提交后将发送待办事项给审核人。',
            '提交审核',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        const res = await submitPerformanceReport(report.value.ID)
        ElMessage.success(res.message || '已提交')
        fetchData()
        emit('refresh')
    } catch (e) {
        if (e !== 'cancel') {
            console.error(e)
            ElMessage.error(e.response?.data?.message || '提交失败')
        }
    }
}

const handleRecheck = () => {
    ElMessageBox.confirm(
        '确定要对该报告进行复检吗？这将生成一份新的报告，并保留原有样品信息。',
        '复检确认',
        {
            confirmButtonText: '确定复检',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        try {
            loading.value = true
            const res = await createRecheckReport(report.value.ID)
            ElMessage.success('复检报告创建成功')
            emit('refresh')
            emit('close')
        } catch (e) {
            console.error(e)
            ElMessage.error('创建复检报告失败')
        } finally {
            loading.value = false
        }
    }).catch(() => {})
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
        const apiCall = auditForm.action === 'pass'
            ? approvePerformanceReport(report.value.ID, auditForm.comment)
            : rejectPerformanceReport(report.value.ID, auditForm.comment)
        
        const res = await apiCall
        ElMessage.success(res.message || '审核完成')
        auditDialogVisible.value = false
        fetchData()
        emit('refresh')
    } catch (e) {
        console.error(e)
        ElMessage.error(e.response?.data?.message || '审核失败')
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
    const doClose = () => {
        emit('close')
        // 如果是路由页面，需要手动回退或跳转
        // 判断当前是否是独立的路由页面（而不是弹窗）
        // 可以通过 route.name 判断，或者简单地尝试回退
        // 这里简单处理：如果是在 PerformanceReportDetail 或 PerformanceReportEdit 路由下，则跳转回 Index
        const currentRouteName = router.currentRoute.value.name
        if (currentRouteName === 'PerformanceReportDetail' || currentRouteName === 'PerformanceReportEdit') {
             router.push({ name: 'PerformanceReportIndex' })
        }
    }

    const isBasicInfoEditing = basicInfoRef.value?.isEdit
    if (isDirty.value || isBasicInfoEditing) {
        ElMessageBox.confirm(
            '当前有未保存的修改，关闭后将丢失，是否确认关闭？',
            '提示',
            { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        ).then(() => {
            doClose()
        }).catch(() => {})
    } else {
        doClose()
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
    position: sticky;
    top: 0;
    z-index: 100;
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
