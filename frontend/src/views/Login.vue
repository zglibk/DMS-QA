<template>
  <div class="login-container-flex">
    <div class="api-base-switch">
      <el-popover placement="bottom" width="320" trigger="click">
        <template #reference>
          <el-button size="small" type="info">API地址设置</el-button>
        </template>
        <div style="display:flex;align-items:center;gap:8px;">
          <el-input v-model="apiBaseInput" placeholder="如 http://192.168.1.57:3001" style="width:220px" />
          <el-button size="small" type="primary" @click="saveApiBase">保存</el-button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#888;">当前：{{ apiBaseCurrent }}</div>
        <div style="margin-top:4px;font-size:11px;color:#666;">默认端口：3001</div>
      </el-popover>
    </div>
    <div class="login-center-wrap">
      <div class="login-box">
        <div class="logo-container">
          <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="Logo" class="logo" @error="handleLogoError" />
        </div>
        <!-- 登录表单 -->
        <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="login">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" size="large">
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item class="remember-me-item">
            <el-checkbox v-model="form.rememberMe">记住密码</el-checkbox>
          </el-form-item>
          <el-form-item>
            <div class="button-container">
              <el-button type="info" @click="reset" class="btn-reset">重置</el-button>
              <el-button type="primary" native-type="submit" class="btn-login">登录</el-button>
            </div>
          </el-form-item>
        </el-form>
        <!-- 登录提示 -->
        <el-alert
          title="测试账号"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          <template #default>
            <div style="font-size: 13px;">
              <div>用户名: admin</div>
              <div>密&nbsp;&nbsp;&nbsp;码: 123456</div>
            </div>
          </template>
        </el-alert>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import { useSiteConfig } from '../composables/useSiteConfig'

const formRef = ref()

const form = ref({ username: 'admin', password: '', rememberMe: false })
const router = useRouter()
const userStore = useUserStore()

// 网站配置
const { siteConfig, loadSiteConfig } = useSiteConfig()

const rules = reactive({
  username: [
    { required: true, message: '请输入登录名', trigger: 'blur' },
    { min: 3, max: 10, message: '登录名长度在 3 到 10 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 15, message: '密码长度在 6 到 15 个字符', trigger: 'blur' },
  ],
})









const login = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (form.value.rememberMe) {
        localStorage.setItem('login-info', JSON.stringify({
          username: form.value.username,
          password: btoa(form.value.password),
          rememberMe: true
        }))
      } else {
        localStorage.removeItem('login-info')
      }
      try {
        const res = await axios.post('/api/auth/login', form.value)
        localStorage.setItem('token', res.data.token)
        await userStore.fetchProfile()
        ElMessage.success('登录成功')
        router.push('/')
      } catch (e) {
        if (e.response && e.response.status === 403) {
          ElMessage.error(e.response.data.message || '该用户已被禁用，请联系管理员')
        } else {
          ElMessage.error('登录失败：用户名或密码错误')
        }
      }
    } else {
      ElMessage.warning('请检查输入是否符合规则')
      return false
    }
  })
}
const reset = () => {
  if (!formRef.value) return
  formRef.value.resetFields()
  localStorage.removeItem('login-info')
}
// 图片加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png' // 回退到默认图片
}

onMounted(() => {
  // 加载网站配置
  loadSiteConfig()

  const loginInfo = localStorage.getItem('login-info')
  if (loginInfo) {
    const { username, password, rememberMe } = JSON.parse(loginInfo)
    if (rememberMe) {
      form.value.username = username
      form.value.password = atob(password)
      form.value.rememberMe = rememberMe
    }
  }
})
watch(() => form.value.rememberMe, (isRemembered) => {
  if (!isRemembered) {
    localStorage.removeItem('login-info')
  }
})

const apiBaseInput = ref(localStorage.getItem('api-base') || import.meta.env.VITE_API_BASE || 'http://localhost:3001')
const apiBaseCurrent = ref(axios.defaults.baseURL)
const saveApiBase = () => {
  if (!apiBaseInput.value) return ElMessage.error('API地址不能为空')
  localStorage.setItem('api-base', apiBaseInput.value)
  if (window.setApiBase) window.setApiBase(apiBaseInput.value)
  apiBaseCurrent.value = apiBaseInput.value
  ElMessage.success('API基础地址已切换为：' + apiBaseInput.value)
}
</script>

<style scoped>
.login-container-flex {
  min-height: 100vh;
  background: #34495e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  transition: min-height 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.login-center-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: auto;
  min-height: 0;
  transition: min-height 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.login-box {
  background-color: white;
  padding: 2.5rem 2.5rem 2.5rem 2.5rem;
  padding-top: 5rem;
  border-radius: 0.3rem;
  box-shadow: 0 0 1.2rem #d0d6e1;
  width: 30rem;
  max-width: 92vw;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0;
  font-size: 1.1rem;
}
.logo-container {
  position: absolute;
  top: -3.125rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 50%;
  width: 6.25rem;
  height: 6.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.25rem 0.75rem 0 rgba(0, 0, 0, 0.15);
  border: 0.25rem solid #f5f5f5;
  z-index: 10;
}
.logo {
  width: 3.125rem;
  height: 3.125rem;
  max-width: 100%;
  max-height: 100%;
}



.config-drawer {
  background: #fff;
  border-radius: 0.3rem;
  box-shadow: 0 0 1.2rem #d0d6e1;
  width: 36rem;
  min-height: 35rem;
  max-height: 95vh;
  margin-left: 2rem;
  padding: 1rem 1.5rem 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  top: 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.config-fixed-section {
  flex-shrink: 0;
  width: 100%;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 1rem;
}

.config-scrollable-section {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding-right: 0.5rem;
  max-height: calc(95vh - 280px);
  min-height: 250px;
}

/* 优化表单间距 */
.config-drawer .el-form-item {
  margin-bottom: 12px;
}

.config-drawer .el-form-item__label {
  font-size: 13px;
  line-height: 1.2;
}

.config-drawer .el-divider {
  margin: 12px 0 8px 0;
}

.config-drawer .el-divider__text {
  font-size: 13px;
}

/* 增加配置对话框中按钮的高度 */
.config-drawer .el-button--small {
  height: 40px; /* 原来约30px，增加1/3约为40px */
  line-height: 38px;
  font-size: 13px;
}

.config-drawer .btn-confirm {
  height: 45px; /* 主要按钮稍微高一些 */
  line-height: 43px;
  font-size: 14px;
}

/* 调整输入框高度与按钮协调 */
.config-drawer .el-input--small .el-input__inner {
  height: 36px;
  line-height: 36px;
}

.config-drawer .el-input-number--small .el-input__inner {
  height: 36px;
  line-height: 36px;
}

.config-drawer .el-select--small .el-input__inner {
  height: 36px;
  line-height: 36px;
}
.config-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #1677ff;
  margin-bottom: 0.5rem;
}
.config-btn-row-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.btn-confirm {
  width: 100%;
  max-width: 18rem;
  margin-bottom: 0.7rem;
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 0.1em;
}
.config-btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 0;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.5rem;
}
.config-btn-row .el-button {
  flex: 1 1 45%;
  min-width: 6.2rem;
  max-width: 48%;
  text-align: center;
  margin: 0;
}
.config-box {
  width: 100%;
  max-width: 22rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.config-box .el-form {
  width: 100%;
}
.config-box .el-table {
  margin-top: 1.2rem;
  border-radius: 0.3rem;
  box-shadow: 0 0 0.5rem #f0f2f5;
}
.config-select-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.config-box .el-form .el-form-item__content {
  width: 90%;
  margin: 0 auto;
  display: block;
}
.config-select-row .el-select {
  width: 70% !important;
  min-width: 0 !important;
  max-width: 70% !important;
  display: block !important;
  flex: none !important;
}
.config-select-row .btn-refresh {
  margin-left: 0.6rem;
  flex: none;
}
.btn-refresh {
  margin-left: 0.2rem;
  background: #f4f6fa;
  color: #1677ff;
  border: none;
  box-shadow: 0 0.1rem 0.3rem #e0e6f0;
  transition: background 0.2s, color 0.2s;
  position: relative;
}
.btn-refresh:hover {
  background: #e6f0ff;
  color: #409EFF;
}

/* 刷新按钮加载状态样式 */
.btn-refresh.is-loading {
  pointer-events: none;
}

.btn-refresh.is-loading .el-icon {
  animation: refresh-spin 1s linear infinite;
}

@keyframes refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Element Plus 默认的 loading 样式优化 */
.btn-refresh .el-loading-spinner {
  margin-top: -8px;
}

.btn-refresh .el-loading-spinner .circular {
  width: 16px;
  height: 16px;
}

.btn-refresh .el-loading-spinner .path {
  stroke: #1677ff;
  stroke-width: 3;
}
.login-box .el-form {
  width: 100%;
  font-size: 1em;
}
.login-box .el-form .el-form-item__content {
  width: 90%;
  margin: 0 auto;
  display: block;
}
.login-box .el-form .el-input,
.login-box .el-form .el-input__wrapper,
.login-box .el-form input {
  width: 100%;
  font-size: 1em;
  min-height: 2.5em;
}
.button-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  gap: 1.2vw;
}
.button-container .btn-login,
.button-container .btn-reset {
  height: 2.8em;
  font-size: 1.1em;
  line-height: 2.8em;
  min-width: 4.5em;
}
.button-container .btn-login {
  flex: 0 0 65%;
  max-width: 65%;
}
.button-container .btn-reset {
  flex: 0 0 25%;
  max-width: 25%;
}
@media (max-width: 900px) {
  .login-container-flex { flex-direction: column; }
  .login-center-wrap { flex-direction: column; align-items: center; }
  .login-box { width: 95vw; min-width: 0; margin-bottom: 0; font-size: 1rem; }
  .logo-container { min-width: 16vw; min-height: 16vw; max-width: 22vw; max-height: 22vw; }
  .logo { max-width: 12vw; max-height: 12vw; }
  .button-container { gap: 2vw; }
  .config-drawer {
    margin-left: 0;
    margin-top: 1.5rem;
    width: 95vw;
    min-width: 0;
    max-height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .login-container-flex.config-open,
  .login-center-wrap.config-open {
    min-height: unset;
    height: unset;
    justify-content: flex-start;
    align-items: flex-start;
  }
  .config-toggle-btn {
    position: static;
    margin: 1.2rem auto 0 auto;
    width: 8.5rem;
    height: 2.5rem;
    flex-direction: row;
    border-radius: 1.25rem;
    background: linear-gradient(90deg, #1677ff 0%, #4096ff 100%);
    box-shadow: 0 4px 20px rgba(22, 119, 255, 0.3);
    justify-content: center;
    align-items: center;
    right: unset;
    left: unset;
    top: unset;
    transform: none;
    z-index: 3;
  }

  .config-toggle-btn::after {
    display: none;
  }
  .config-toggle-text {
    writing-mode: horizontal-tb;
    margin-bottom: 0;
    margin-right: 0.5rem;
    font-size: 0.95rem;
    color: #ffffff;
  }
  .config-btn-row-col { width: 100%; }
  .btn-confirm { width: 100%; max-width: 99vw; }
  .config-btn-row { gap: 0.6rem 0; }
}
@media (max-width: 600px) {
  .config-drawer, .login-box { width: 100vw; min-width: 0; font-size: 0.98rem; }
  .config-box { max-width: 99vw; }
  .logo-container {
    position: static;
    transform: none;
    margin: 0.5rem auto 0.5rem auto;
    width: 22vw;
    height: 22vw;
    min-width: 3.5rem;
    min-height: 3.5rem;
    max-width: 32vw;
    max-height: 32vw;
  }
  .logo {
    width: 12vw;
    height: 12vw;
    min-width: 2rem;
    min-height: 2rem;
    max-width: 18vw;
    max-height: 18vw;
  }
  .login-box {
    padding-top: 2rem;
    margin: 0 auto;
    left: 0;
    right: 0;
    box-sizing: border-box;
  }
  .login-container-flex, .login-center-wrap {
    justify-content: center !important;
    align-items: center !important;
  }
  .button-container { gap: 3vw; }
}
/* 优化的滑动动画 */
@media (max-width: 900px) {
  .slide-config-enter-active {
    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-origin: center bottom;
  }
  .slide-config-leave-active {
    transition: all 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53);
    transform-origin: center bottom;
  }
  .slide-config-enter-from {
    opacity: 0;
    transform: translateY(100px) scale(0.9) rotateX(10deg);
    filter: blur(3px);
  }
  .slide-config-leave-to {
    opacity: 0;
    transform: translateY(60px) scale(0.98);
    filter: blur(1px);
  }
}
@media (min-width: 901px) {
  .slide-config-enter-active {
    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-origin: left center;
  }
  .slide-config-leave-active {
    transition: all 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53);
    transform-origin: left center;
  }
  .slide-config-enter-from {
    opacity: 0;
    transform: translateX(120px) scale(0.9) rotateY(-5deg);
    filter: blur(3px);
  }
  .slide-config-leave-to {
    opacity: 0;
    transform: translateX(80px) scale(0.98);
    filter: blur(1px);
  }
}

/* 配置框内容的渐进动画 */
.slide-config-enter-active .config-title,
.slide-config-enter-active .el-form-item,
.slide-config-enter-active .el-table,
.slide-config-enter-active .config-buttons {
  animation: slideInContent 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.slide-config-enter-active .config-title { animation-delay: 0.1s; }
.slide-config-enter-active .el-form-item:nth-child(1) { animation-delay: 0.15s; }
.slide-config-enter-active .el-form-item:nth-child(2) { animation-delay: 0.2s; }
.slide-config-enter-active .el-form-item:nth-child(3) { animation-delay: 0.25s; }
.slide-config-enter-active .el-form-item:nth-child(4) { animation-delay: 0.3s; }
.slide-config-enter-active .el-form-item:nth-child(5) { animation-delay: 0.35s; }
.slide-config-enter-active .el-form-item:nth-child(6) { animation-delay: 0.4s; }
.slide-config-enter-active .el-table { animation-delay: 0.45s; }
.slide-config-enter-active .config-buttons { animation-delay: 0.5s; }

@keyframes slideInContent {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.api-base-switch {
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 100;
}
</style> 