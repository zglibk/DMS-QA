<template>
  <el-dialog
    v-model="innerVisible"
    :title="title"
    :width="resolvedWidth"
    :align-center="isMobile"
    :close-on-click-modal="closeOnClickModal"
    class="performance-create-report-dialog"
  >
    <el-form :model="formData" :label-width="labelWidth">
      <el-form-item label="报告编号">
        <el-input v-model="formData.ReportNo" placeholder="自动生成" disabled />
      </el-form-item>
      <el-form-item label="测试日期">
        <el-date-picker v-model="formData.TestDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="样品名称">
        <el-input v-model="formData.SampleName" placeholder="请输入样品名称" />
      </el-form-item>
      <el-form-item label="客户编号">
        <el-input v-model="formData.CustomerCode" placeholder="请输入客户编号" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="loading">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '新建性能实验报告'
  },
  formData: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  desktopWidth: {
    type: String,
    default: '500px'
  },
  mobileWidth: {
    type: String,
    default: 'calc(100vw - 32px)'
  },
  mobileBreakpoint: {
    type: Number,
    default: 992
  },
  labelWidth: {
    type: String,
    default: '100px'
  },
  closeOnClickModal: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= props.mobileBreakpoint : false)

const innerVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const resolvedWidth = computed(() => (isMobile.value ? props.mobileWidth : props.desktopWidth))

const handleResize = () => {
  isMobile.value = window.innerWidth <= props.mobileBreakpoint
}

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
@media screen and (max-width: 992px) {
  .performance-create-report-dialog .el-dialog {
    margin: 16px auto !important;
    max-height: none !important;
    display: block !important;
  }

  .performance-create-report-dialog .el-dialog__body {
    padding: 12px 12px 4px !important;
    overflow: visible !important;
  }

  .performance-create-report-dialog .el-form-item {
    margin-bottom: 14px !important;
  }
}
</style>
