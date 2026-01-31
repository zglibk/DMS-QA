<template>
  <el-dialog
    v-model="visible"
    title="登录过期"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
    class="login-expired-dialog"
  >
    <div class="dialog-content">
      <div class="icon-wrapper">
        <el-icon class="warning-icon" :size="60">
          <WarningFilled />
        </el-icon>
      </div>
      <div class="message">
        <p class="title">您的登录状态已过期</p>
        <p class="desc">为了保障您的账户安全，请重新登录</p>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" size="large" @click="handleReLogin" class="relogin-btn">
          <el-icon><UserFilled /></el-icon>
          重新登录
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { WarningFilled, UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const visible = ref(false)

/**
 * 显示对话框
 */
const show = () => {
  visible.value = true
}

/**
 * 隐藏对话框
 */
const hide = () => {
  visible.value = false
}

/**
 * 处理重新登录
 */
const handleReLogin = () => {
  // 清除token和用户数据
  localStorage.removeItem('token')
  const userStore = useUserStore()
  userStore.clearUser()
  
  visible.value = false
  window.location.href = '/login'
}

// 暴露方法供外部调用
defineExpose({
  show,
  hide
})
</script>

<style scoped>
.login-expired-dialog :deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
}

.login-expired-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.login-expired-dialog :deep(.el-dialog__body) {
  padding: 30px 20px;
}

.login-expired-dialog :deep(.el-dialog__footer) {
  padding: 10px 20px 20px;
  border-top: 1px solid #ebeef5;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.icon-wrapper {
  margin-bottom: 20px;
}

.warning-icon {
  color: #e6a23c;
}

.message .title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 10px 0;
}

.message .desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}

.relogin-btn {
  width: 160px;
  font-size: 16px;
}

.relogin-btn .el-icon {
  margin-right: 6px;
}
</style>
