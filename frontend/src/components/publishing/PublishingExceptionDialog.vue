<template>
  <el-dialog
    v-model="innerVisible"
    :title="title"
    :width="resolvedWidth"
    :align-center="isMobile"
    :close-on-click-modal="closeOnClickModal"
    :class="dialogClass"
  >
    <slot />
    <template #footer>
      <slot name="footer" />
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
    default: ''
  },
  desktopWidth: {
    type: String,
    default: '900px'
  },
  mobileWidth: {
    type: String,
    default: 'calc(100vw - 32px)'
  },
  mobileBreakpoint: {
    type: Number,
    default: 992
  },
  closeOnClickModal: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'form'
  }
})

const emit = defineEmits(['update:modelValue'])

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= props.mobileBreakpoint : false)

const innerVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const resolvedWidth = computed(() => (isMobile.value ? props.mobileWidth : props.desktopWidth))
const dialogClass = computed(() => ['publishing-exception-dialog', `publishing-exception-dialog--${props.variant}`])

const handleResize = () => {
  isMobile.value = window.innerWidth <= props.mobileBreakpoint
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
.publishing-exception-dialog.publishing-exception-dialog--form.el-dialog {
  margin: 16px auto !important;
  height: auto !important;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
}

.publishing-exception-dialog.publishing-exception-dialog--form.el-dialog .el-dialog__body {
  min-height: 0;
  overflow-y: auto;
}

.publishing-exception-dialog.publishing-exception-dialog--form.el-dialog .el-dialog__header,
.publishing-exception-dialog.publishing-exception-dialog--form.el-dialog .el-dialog__footer {
  flex-shrink: 0;
}

@media screen and (max-width: 992px) {
  .publishing-exception-dialog.el-dialog {
    margin: 16px auto !important;
    height: auto !important;
    max-height: calc(100vh - 32px) !important;
    display: flex;
    flex-direction: column;
  }

  .publishing-exception-dialog.el-dialog .el-dialog__body {
    padding: 12px !important;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .publishing-exception-dialog--form .el-form .el-row,
  .publishing-exception-dialog--compact-form .el-form .el-row {
    row-gap: 6px;
  }

  .publishing-exception-dialog--form .el-form .el-row > .el-col.el-col-xs-24,
  .publishing-exception-dialog--compact-form .el-form .el-row > .el-col.el-col-xs-24 {
    flex: 0 0 33.333333% !important;
    max-width: 33.333333% !important;
  }

  .publishing-exception-dialog--form .el-form .el-form-item,
  .publishing-exception-dialog--compact-form .el-form .el-form-item {
    margin-bottom: 14px !important;
  }

  .publishing-exception-dialog.publishing-exception-dialog--compact-form.el-dialog {
    max-height: none !important;
    display: block !important;
  }

  .publishing-exception-dialog.publishing-exception-dialog--compact-form.el-dialog .el-dialog__body {
    overflow-y: visible !important;
  }

  .publishing-exception-dialog.publishing-exception-dialog--preview.el-dialog .el-dialog__body {
    padding: 8px !important;
  }

  .publishing-exception-dialog.publishing-exception-dialog--simple.el-dialog .el-dialog__body {
    padding: 14px !important;
  }
}
</style>
