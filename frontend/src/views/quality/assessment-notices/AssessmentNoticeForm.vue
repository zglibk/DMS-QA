<template>
  <div class="assessment-notice-form-container">
    <div class="notice-wrapper">
      <QualityAssessmentNotice 
        v-model="noticeData"
        :initial-data="noticeData"
        :readonly="isViewMode"
        :loading="saving"
        ref="noticeRef"
        @close="handleClose"
        @save="handleSave"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiService from '@/services/apiService'
import QualityAssessmentNotice from '@/components/quality/QualityAssessmentNotice.vue'

const route = useRoute()
const router = useRouter()
const saving = ref(false)
const noticeRef = ref(null)

const getDiscoveryStageLabel = (stage) => {
  const map = {
    'Incoming': '来料',
    'Process': '制程',
    'Finished': '成品',
    'Shipment': '出货',
    'Client': '客户端'
  }
  return map[stage] || stage
}

const isEdit = ref(false)
const recordId = ref(null)

const noticeData = ref({
  docNo: '',
  basicInfo: {
    personName: '',
    post: '',
    supervisor: '',
    department: '',
    workOrder: '',
    submitter: '',
    occurrenceDate: '',
    location: '',
    submitDate: ''
  },
  description: {
    fault: '',
    analysis: ''
  },
  assessmentDetails: [
    { type: '', level: '', frequency: '1', lossAmount: null, shouldAssessAmount: null, actualAssessAmount: null }
  ],
  totalAmount: null,
  amountInWords: '',
  qualityDeptOpinion: [],
  qualityDeptPerfAmount: null,
  approval: {
    issuingDept: '',
    issuer: '',
    issueDate: '',
    receiver: '',
    receiveDate: '',
    gmApproval: '',
    gmApprovalDate: ''
  }
})

// 加载现有数据
const loadData = async (id, onlyGetDocNo = false) => {
  try {
    const res = await apiService.get(`/quality-assessment-notices/${id}`)
    if (res.data.success) {
      const data = res.data.data
      
      if (onlyGetDocNo) {
        return data.AssessmentNo
      }

      let details = []
      try {
        if (data.AssessmentDetails) {
          details = JSON.parse(data.AssessmentDetails)
        }
      } catch (e) {
        console.error(e)
      }
      
      noticeData.value = {
        docNo: data.AssessmentNo || '',
        basicInfo: {
          personName: data.PersonName || '',
          post: data.Post || '',
          supervisor: data.Supervisor || '',
          department: data.Department || '',
          workOrder: data.WorkOrder || '',
          submitter: data.Submitter || '',
          occurrenceDate: data.OccurrenceDate ? data.OccurrenceDate.split('T')[0] : '',
          location: getDiscoveryStageLabel(data.Location) || '',
          submitDate: data.SubmitDate ? data.SubmitDate.split('T')[0] : ''
        },
        description: {
          fault: data.FaultDesc || '',
          analysis: data.AnalysisDesc || ''
        },
        assessmentDetails: details.length > 0 ? details : [
          { type: '', level: '', frequency: '1', lossAmount: null, shouldAssessAmount: null, actualAssessAmount: null }
        ],
        totalAmount: data.TotalAmount,
        amountInWords: data.AmountInWords || '',
        qualityDeptOpinion: data.QualityDeptOpinion ? JSON.parse(data.QualityDeptOpinion) : [],
        qualityDeptPerfAmount: data.QualityDeptPerfAmount || null,
        approval: {
          issuingDept: data.IssuingDept || '',
          issuer: data.Issuer || '',
          issueDate: data.IssueDate ? data.IssueDate.split('T')[0] : '',
          receiver: data.Receiver || '',
          receiveDate: data.ReceiveDate ? data.ReceiveDate.split('T')[0] : '',
          gmApproval: data.GMApproval || '',
          gmApprovalDate: data.GMApprovalDate ? data.GMApprovalDate.split('T')[0] : ''
        }
      }
    }
  } catch (error) {
    ElMessage.error('加载考核通知单失败')
  }
}

// 从异常联络单加载数据
const loadFromException = async (exceptionId) => {
  try {
    const res = await apiService.get(`/quality-exceptions/${exceptionId}`)
    if (res.data.success) {
      const row = res.data.data
      
      noticeData.value = {
        docNo: '',
        basicInfo: {
          personName: row.ResponsiblePerson || '',
          post: '',
          supervisor: '',
          department: row.ResponsibleDepartment || '',
          workOrder: row.WorkOrderNum || '',
          submitter: row.Reporter || '',
          occurrenceDate: row.ReportDate ? row.ReportDate.split('T')[0] : '',
          location: getDiscoveryStageLabel(row.DiscoveryStage) || '',
          submitDate: row.ReportDate ? row.ReportDate.split('T')[0] : ''
        },
        description: {
          fault: row.Description || '',
          analysis: row.PreliminaryCause || ''
        },
        assessmentDetails: [
          { type: row.Description ? row.Description.substring(0, 20) : '', level: '', frequency: '1', lossAmount: null, shouldAssessAmount: null, actualAssessAmount: null }
        ],
        totalAmount: null,
        amountInWords: '',
        qualityDeptOpinion: [],
        qualityDeptPerfAmount: null,
        approval: {
          issuingDept: '',
          issuer: '',
          issueDate: '',
          receiver: '',
          receiveDate: '',
          gmApproval: '',
          gmApprovalDate: ''
        }
      }
    }
  } catch (error) {
    ElMessage.error('加载异常联络单数据失败')
  }
}

const handleSave = async () => {
  // 1. 数据校验
  if (!noticeData.value.basicInfo.personName) {
    ElMessage.warning('请填写被考核人姓名')
    return
  }
  if (!noticeData.value.basicInfo.department) {
    ElMessage.warning('请填写所在部门')
    return
  }
  if (!noticeData.value.basicInfo.occurrenceDate) {
    ElMessage.warning('请选择发生时间')
    return
  }
  if (!noticeData.value.description.fault) {
    ElMessage.warning('请填写过失/异常描述')
    return
  }
  
  // 校验考核详情
  let hasValidDetail = false
  for (let i = 0; i < noticeData.value.assessmentDetails.length; i++) {
    const item = noticeData.value.assessmentDetails[i]
    if (item.type && item.type.trim() !== '') {
      hasValidDetail = true
      // 如果填写了事故类型，则必须填写等级、频次和金额
      if (!item.level) {
        ElMessage.warning(`第 ${i + 1} 行考核详情未选择“事故等级”`)
        return
      }
      if (!item.frequency) {
        ElMessage.warning(`第 ${i + 1} 行考核详情未选择“当月发生频次”`)
        return
      }
      // 应考核和实考核可以是0，但不能是null/undefined
      if (item.shouldAssessAmount === null || item.shouldAssessAmount === undefined) {
        ElMessage.warning(`第 ${i + 1} 行考核详情“应考核”金额计算有误，请检查`)
        return
      }
      if (item.actualAssessAmount === null || item.actualAssessAmount === undefined) {
        ElMessage.warning(`第 ${i + 1} 行考核详情请填写“实考核”金额`)
        return
      }
    }
  }
  
  if (!hasValidDetail) {
     ElMessage.warning('请至少填写一项有效的考核详情（事故类型）')
     return
  }

  // 校验处理结果
  const opinionArray = JSON.parse(JSON.stringify(noticeData.value.qualityDeptOpinion || []))
  if (!opinionArray || opinionArray.length === 0) {
    ElMessage.warning('请至少选择一项品质部门处理意见')
    return
  }

  saving.value = true
  try {
    // 计算考核总额：如果处理结果勾选了"绩效考核"，则使用绩效考核金额；否则为0
    let finalTotalAmount = 0
    // 将 Proxy(Array) 转换为普通数组进行判断
    const opinionArray = JSON.parse(JSON.stringify(noticeData.value.qualityDeptOpinion || []))
    if (Array.isArray(opinionArray) && opinionArray.includes('绩效考核')) {
      finalTotalAmount = noticeData.value.qualityDeptPerfAmount || 0
    }

    const payload = {
      SourceType: route.query.sourceType || null,
      SourceID: route.query.sourceId ? parseInt(route.query.sourceId) : null,
      AssessmentNo: noticeData.value.docNo,
      PersonName: noticeData.value.basicInfo.personName,
      Post: noticeData.value.basicInfo.post,
      Supervisor: noticeData.value.basicInfo.supervisor,
      Department: noticeData.value.basicInfo.department,
      WorkOrder: noticeData.value.basicInfo.workOrder,
      Submitter: noticeData.value.basicInfo.submitter,
      OccurrenceDate: noticeData.value.basicInfo.occurrenceDate || null,
      Location: noticeData.value.basicInfo.location,
      SubmitDate: noticeData.value.basicInfo.submitDate || null,
      FaultDesc: noticeData.value.description.fault,
      AnalysisDesc: noticeData.value.description.analysis,
      AssessmentDetails: noticeData.value.assessmentDetails,
      TotalAmount: finalTotalAmount,
      AmountInWords: noticeData.value.amountInWords,
      IssuingDept: noticeData.value.approval.issuingDept,
      Issuer: noticeData.value.approval.issuer,
      IssueDate: noticeData.value.approval.issueDate || null,
      Receiver: noticeData.value.approval.receiver,
      ReceiveDate: noticeData.value.approval.receiveDate || null,
      GMApproval: noticeData.value.approval.gmApproval,
      GMApprovalDate: noticeData.value.approval.gmApprovalDate || null,
      QualityDeptOpinion: opinionArray, // 使用转换后的数组
      QualityDeptPerfAmount: noticeData.value.qualityDeptPerfAmount || null
    }

    if (isEdit.value) {
      await apiService.put(`/quality-assessment-notices/${recordId.value}`, payload)
      ElMessage.success('更新成功')
      
      // 更新成功后，如果是从列表页进入的，可以选择关闭
      // 这里为了统一体验，也使用模态框确认
      handlePostSave(recordId.value, true)
    } else {
      const res = await apiService.post('/quality-assessment-notices', payload)
      ElMessage.success('创建成功')
      if (res.data.id) {
        recordId.value = res.data.id
        isEdit.value = true
        handlePostSave(res.data.id, false)
      }
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handlePostSave = (id, isUpdate) => {
  ElMessageBox.confirm(
    '操作成功！是否立即查看考核通知列表？',
    '提示',
    {
      confirmButtonText: '立即查看',
      cancelButtonText: '关闭页面',
      type: 'success',
      distinguishCancelAndClose: true,
      center: true
    }
  ).then(() => {
    // 立即查看 -> 跳转到列表页
    // 如果是在新标签页打开的，直接跳转当前标签页
    router.push('/admin/quality/assessment-notices')
  }).catch((action) => {
    // 关闭页面 (点击取消或关闭按钮)
    if (action === 'cancel' || action === 'close') {
      window.close()
    }
  })
}

const handlePrint = () => {
  if (noticeRef.value) {
    noticeRef.value.handlePrint()
  }
}

const handleClose = () => {
  window.close()
}

const isViewMode = ref(false)

onMounted(async () => {
  if (route.query.mode === 'view') {
    isViewMode.value = true
  }

  if (route.params.id) {
    isEdit.value = true
    recordId.value = route.params.id
    
    // 如果是重新生成模式
    if (route.query.reload === 'true' && route.query.sourceType === 'Exception' && route.query.sourceId) {
      // 1. 先获取原单号
      const originalDocNo = await loadData(route.params.id, true)
      // 2. 从联络单重新加载数据
      await loadFromException(route.query.sourceId)
      // 3. 恢复原单号
      if (originalDocNo) {
        noticeData.value.docNo = originalDocNo
      }
      ElMessage.success('已根据联络单重置内容，请确认后保存')
    } else {
      loadData(route.params.id)
    }
  } else if (route.query.sourceType === 'Exception' && route.query.sourceId) {
    loadFromException(route.query.sourceId)
  }
})
</script>

<style scoped>
.assessment-notice-form-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.notice-wrapper {
  display: flex;
  justify-content: center;
}
</style>
