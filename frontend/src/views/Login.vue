<template>
  <div class="login-container-flex">
    <!-- 波涛效果 -->
    <div class="wave-container">
      <svg class="wave-svg wave1" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,80 Q150,0 300,80 Q450,160 600,80 Q750,0 900,80 Q1050,160 1200,80 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.3)"/>
      </svg>
      <svg class="wave-svg wave2" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,100 Q200,20 400,100 Q600,180 800,100 Q1000,20 1200,100 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.2)"/>
      </svg>
      <svg class="wave-svg wave3" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,90 Q300,10 600,90 Q900,170 1200,90 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.15)"/>
      </svg>
    </div>

    <!-- 装饰性浮动圆圈 -->
    <div class="floating-circle-1"></div>
    <div class="floating-circle-2"></div>
    <div class="floating-circle-3"></div>
    <div class="floating-circle-4"></div>
    <div class="floating-circle-5"></div>
    <div class="floating-circle-6"></div>
    <div class="floating-circle-7"></div>
    <div class="floating-circle-8"></div>
    <div class="floating-circle-9"></div>
    <div class="floating-circle-10"></div>
    <div class="floating-circle-11"></div>
    <div class="floating-circle-12"></div>
    <div class="floating-circle-13"></div>
    <div class="floating-circle-14"></div>
    <div class="floating-circle-15"></div>
    <div class="floating-circle-16"></div>
    <div class="floating-circle-17"></div>
    <div class="floating-circle-18"></div>
    <div class="floating-circle-19"></div>
    <div class="floating-circle-20"></div>
    
    <!-- 使用Element Plus响应式布局容器 -->
    <div class="login-center-wrap">
      <el-row class="login-row" :gutter="40" justify="center" align="middle">
        <!-- 左侧插画区域 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="10" :xl="10" class="illustration-col">
          <div class="login-illustration">
            <InteractiveIllustration />
            <div class="illustration-text">
              <h3>DMS质量管理系统</h3>
              <p>现代化的质量数据管理平台</p>
            </div>
          </div>
        </el-col>

        <!-- 右侧登录表单 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="10" :xl="10" class="login-col">
          <div class="login-box">
        <div class="logo-container">
          <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="Logo" class="logo" @error="handleLogoError" />
        </div>
        
        <!-- 登录标题 - 使用Element Plus布局组件 -->
        <el-row :gutter="0" class="login-title-row">
          <el-col :span="24" style="text-align: center;">
            <h2 class="login-title-text">欢迎登录</h2>
          </el-col>
        </el-row>
        
        <!-- 登录表单 -->
        <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
          <div class="form-inputs">
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
              
              <!-- 验证码输入框 -->
              <el-form-item prop="captchaText">
                <div class="captcha-container">
                  <el-input
                    v-model="form.captchaText"
                    placeholder="请输入验证码"
                    class="captcha-input"
                    @keyup.enter="login"
                  >
                    <template #prefix>
                      <el-icon><Key /></el-icon>
                    </template>
                  </el-input>
                  <div class="captcha-image" @click="refreshCaptcha" v-html="captchaSvg"></div>
                </div>
              </el-form-item>
          </div>
          
          <div class="form-actions">
            <el-form-item class="remember-me-item">
              <el-checkbox v-model="form.rememberMe">记住密码</el-checkbox>
            </el-form-item>
            <el-form-item>
              <div class="button-container">
                <el-button type="info" @click="reset" class="btn-reset">重置</el-button>
                <el-button type="primary" @click="login" class="btn-login">登录</el-button>
              </div>
            </el-form-item>
          </div>
        </el-form>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<!--
  登录页面脚本部分

  功能说明：
  1. 用户登录表单处理
  2. 表单验证和提交
  3. API地址动态切换
  4. 网站配置加载
  5. 记住密码功能

  技术特点：
  - Vue 3 Composition API
  - Element Plus表单验证
  - Pinia状态管理
  - 响应式数据绑定
-->
<script setup>
/**
 * 导入依赖模块
 */
// Vue 3核心API
import { ref, reactive, onMounted, watch } from 'vue'
// HTTP请求库
import axios from 'axios'
// 路由管理
import { useRouter } from 'vue-router'
// Element Plus图标
import { User, Lock, Key } from '@element-plus/icons-vue'
// Element Plus消息组件
import { ElMessage } from 'element-plus'
// 用户状态管理
import { useUserStore } from '../store/user'
// 网站配置管理
import { useSiteConfig } from '../composables/useSiteConfig'
// 交互式插画组件
import InteractiveIllustration from '../components/InteractiveIllustration.vue'

/**
 * 响应式数据定义
 */
// 表单引用，用于表单验证
const formRef = ref()

// 登录表单数据
const form = ref({
  username: 'admin',      // 默认用户名（开发环境便利）
  password: '',           // 密码
  captchaText: '',        // 验证码
  captchaId: '',          // 验证码ID
  rememberMe: false       // 记住密码选项
})

// 验证码相关数据
const captchaSvg = ref('')  // 验证码SVG图片

// 路由实例
const router = useRouter()
// 用户状态管理实例
const userStore = useUserStore()

// 网站配置管理
const { siteConfig, loadSiteConfig } = useSiteConfig()

/**
 * 表单验证规则
 *
 * 使用Element Plus的表单验证机制
 * 支持必填验证、长度验证、触发时机等
 */
const rules = reactive({
  username: [
    { required: true, message: '请输入登录名', trigger: 'blur' },
    { min: 3, max: 10, message: '登录名长度在 3 到 10 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 15, message: '密码长度在 6 到 15 个字符', trigger: 'blur' },
  ],
  captchaText: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 4, message: '验证码长度为4位', trigger: 'blur' },
  ],
})









/**
 * 获取验证码
 * 从后端API获取SVG格式的验证码图片
 */
const getCaptcha = async () => {
  try {
    const response = await axios.get('/auth/captcha')
    captchaSvg.value = response.data.captchaSvg
    form.value.captchaId = response.data.captchaId
    form.value.captchaText = '' // 清空验证码输入
  } catch (error) {
    ElMessage.error('获取验证码失败，请重试')
  }
}

/**
 * 刷新验证码
 * 点击验证码图片时重新获取验证码
 */
const refreshCaptcha = () => {
  getCaptcha()
}

/**
 * 用户登录方法
 * 包含表单验证、验证码验证和用户认证
 */
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
        const loginData = {
          username: form.value.username,
          password: form.value.password,
          captchaId: form.value.captchaId,
          captchaText: form.value.captchaText
        }
        const res = await axios.post('/auth/login', loginData)
        // 设置token到store和localStorage
        userStore.setToken(res.data.token)
        // 直接使用登录接口返回的用户信息，包括最后登录时间
        if (res.data.user) {
          userStore.setUser(res.data.user)
        }
        await userStore.fetchProfile()
        ElMessage.success('登录成功')
        router.push('/')
      } catch (e) {
        // 只有在验证码相关错误时才刷新验证码
        const errorMessage = e.response?.data?.message || ''
        const isCaptchaError = errorMessage.includes('验证码') || 
                              errorMessage.includes('captcha') ||
                              errorMessage.includes('过期') ||
                              errorMessage.includes('不存在')
        
        if (isCaptchaError) {
          refreshCaptcha()
        }
        
        if (e.response && e.response.data && e.response.data.message) {
          ElMessage.error(e.response.data.message)
        } else if (e.response && e.response.status === 403) {
          ElMessage.error('该用户已被禁用，请联系管理员')
        } else {
          ElMessage.error('登录失败，请检查用户名和密码')
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
  
  // 初始化验证码
  getCaptcha()

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

// API地址设置功能已移除，现在完全依赖vite配置
</script>

<style scoped>
.login-container-flex {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-container-flex::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  opacity: 0.95;
  z-index: 0;
}

.login-container-flex::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
  animation: float 8s ease-in-out infinite;
  z-index: 1;
}
.login-center-wrap {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.login-row {
  min-height: 80vh;
  width: 100%;
}

.illustration-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 左侧插画区域 */
.login-illustration {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  max-width: 500px;
}

.illustration-text {
  text-align: center;
  margin-top: 2rem;
  color: #ffffff;
}

.illustration-text h3 {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.illustration-text p {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 右侧登录表单 */
.login-box {
  background-color: white;
  padding: 2rem 2.5rem 2.5rem; /* 减小上下内边距 */
  padding-top: 4rem; /* 减小顶部内边距 */
  border-radius: 0.3rem;
  box-shadow: 0 0 1.2rem #d0d6e1;
  width: 100%;
  max-width: 380px; /* 减小原始宽度，使登录框更紧凑 */
  min-height: 500px; /* 减小最小高度 */
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
  margin-left: 10rem;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.logo-container {
  position: absolute;
  top: -3rem;
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

/* 登录标题样式 - 使用Element Plus布局组件 */
.login-title-row {
  margin: 3px 0 3px 0;
}

.login-title-text {
  font-size: 1.5rem;
  font-weight: 600;
  color: #409eff;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

/* 验证码样式 */
.captcha-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.captcha-input {
  flex: 1;
}

.captcha-image {
  width: 120px;
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  transition: all 0.3s;
}

.captcha-image:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.captcha-image svg {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

/* 登录表单布局 */
.login-form {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-top: -8px; /* 减小表单与标题的间距 */
}

.form-inputs {
  flex: 1;
}

.form-actions {
  margin-top: auto;
  padding-top: 2rem;
}

/* 记住密码样式 */
.remember-me-item {
  margin-bottom: 1.5rem !important;
}

/* 按钮容器样式 */
.button-container {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.btn-reset,
.btn-login {
  flex: 1;
  height: 2.5rem;
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
  height: 40px;
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
/* PC端登录框最大宽度设置 */
.login-box {
  max-width: 380px; /* PC端最大宽度限制，与原始宽度保持一致 */
}

/* 大屏幕设备优化 */
@media (min-width: 1200px) {
  .login-center-wrap {
    max-width: 1600px;
    padding: 3rem;
  }
  
  .login-row {
    min-height: 80vh;
  }
  
  .login-illustration {
    max-width: 500px;
  }
  
  .login-box {
    max-width: 420px; /* 大屏幕下稍大一些，但保持紧凑 */
  }
}

/* 平板和小屏幕设备 */
@media (max-width: 992px) {
  .login-center-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  
  .login-row {
    min-height: auto;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  
  .illustration-col {
    display: none; /* 隐藏插画 */
  }
  
  .login-col {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  
  .login-box {
    max-width: 90vw;
    width: 100%;
    font-size: 1rem;
    margin: 0 auto !important; /* 确保水平居中，覆盖大屏幕的margin-left */
    margin-left: 0 !important; /* 强制移除左边距 */
  }
  
  .logo-container {
    width: 5rem;
    height: 5rem;
  }
  
  .logo {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  /* 平板端登录标题样式 */
  .login-title-row {
    margin: 6px 0 10px 0;
  }
  
  .login-title-text {
    font-size: 1.3rem;
  }
  

  
  .button-container {
    gap: 1rem;
  }
}
/* 手机设备 */
@media (max-width: 600px) {
  .login-center-wrap {
    padding: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  
  .login-row {
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  
  .login-col {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  
  .login-box {
    max-width: 95vw;
    width: 100%;
    font-size: 0.95rem;
    padding: 1.5rem 1.5rem 2rem 1.5rem; /* 减小上下内边距 */
    padding-top: 3.5rem; /* 减小顶部内边距 */
    min-height: 400px; /* 减小最小高度 */
    margin: 0 auto !important; /* 确保水平居中，覆盖大屏幕的margin-left */
    margin-left: 0 !important; /* 强制移除左边距 */
  }
  
  .logo-container {
    width: 4rem;
    height: 4rem;
    top: -2rem;
  }
  
  .logo {
    width: 2rem;
    height: 2rem;
  }
  
  /* 手机端登录标题样式 */
  .login-title-row {
    margin: 4px 0 8px 0;
  }
  
  .login-title-text {
    font-size: 1.2rem;
  }
   
  .button-container {
    gap: 0.8rem;
    flex-direction: column;
  }
  
  .btn-reset,
  .btn-login {
    width: 100%;
  }
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
/* 波涛容器 */
.wave-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 120px;
  overflow: hidden;
  z-index: 2;
  pointer-events: none;
}

/* SVG波浪样式 */
.wave-svg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  height: 120px;
}

.wave1 {
  animation: wave-animation 4s linear infinite;
  animation-delay: 0s;
}

.wave2 {
  animation: wave-animation 6s linear infinite reverse;
  animation-delay: -2s;
}

.wave3 {
  animation: wave-animation 8s linear infinite;
  animation-delay: -4s;
}

/* 波涛动画 */
@keyframes wave-animation {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.api-base-switch {
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 100;
}

/* 浮动动画 - 加快速度 */
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

/* 快速浮动动画 */
@keyframes float-fast {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-40px) rotate(360deg) scale(1.2);
  }
}

/* 慢速浮动动画 */
@keyframes float-slow {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-25px) rotate(-180deg) scale(0.8);
  }
}



.login-container-flex .floating-circle-1 {
  position: absolute;
  top: 20%;
  right: 15%;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: float-fast 3s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-2 {
  position: absolute;
  bottom: 25%;
  left: 20%;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  animation: float 4s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-3 {
  position: absolute;
  top: 15%;
  left: 8%;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  animation: float-slow 5s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-4 {
  position: absolute;
  top: 60%;
  right: 8%;
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  animation: float-fast 3.5s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-5 {
  position: absolute;
  top: 35%;
  left: 5%;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: float 2.5s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-6 {
  position: absolute;
  bottom: 15%;
  right: 25%;
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float-slow 6s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-7 {
  position: absolute;
  top: 45%;
  right: 3%;
  width: 35px;
  height: 35px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  animation: float-fast 4.5s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-8 {
  position: absolute;
  bottom: 40%;
  left: 3%;
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 50%;
  animation: float 3.8s ease-in-out infinite reverse;
  z-index: 1;
}

/* 新增的光晕 */
.login-container-flex .floating-circle-9 {
  position: absolute;
  top: 10%;
  left: 25%;
  width: 25px;
  height: 25px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  animation: float-fast 2.8s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-10 {
  position: absolute;
  top: 70%;
  right: 30%;
  width: 55px;
  height: 55px;
  background: rgba(255, 255, 255, 0.11);
  border-radius: 50%;
  animation: float-slow 5.5s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-11 {
  position: absolute;
  top: 25%;
  left: 35%;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  animation: float 2.2s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-12 {
  position: absolute;
  bottom: 35%;
  right: 12%;
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.17);
  border-radius: 50%;
  animation: float-fast 3.2s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-13 {
  position: absolute;
  top: 55%;
  left: 12%;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.19);
  border-radius: 50%;
  animation: float-slow 4.8s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-14 {
  position: absolute;
  top: 8%;
  right: 35%;
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  animation: float 3.6s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-15 {
  position: absolute;
  bottom: 20%;
  left: 8%;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.21);
  border-radius: 50%;
  animation: float-fast 2.9s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-16 {
  position: absolute;
  top: 40%;
  right: 20%;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  animation: float-slow 5.2s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-17 {
  position: absolute;
  bottom: 50%;
  left: 30%;
  width: 22px;
  height: 22px;
  background: rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  animation: float 2.4s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-18 {
  position: absolute;
  top: 30%;
  right: 5%;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  animation: float-fast 3.4s ease-in-out infinite reverse;
  z-index: 1;
}

.login-container-flex .floating-circle-19 {
  position: absolute;
  bottom: 10%;
  right: 40%;
  width: 26px;
  height: 26px;
  background: rgba(255, 255, 255, 0.23);
  border-radius: 50%;
  animation: float-slow 4.6s ease-in-out infinite;
  z-index: 1;
}

.login-container-flex .floating-circle-20 {
  position: absolute;
  top: 65%;
  left: 25%;
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 50%;
  animation: float 4.2s ease-in-out infinite reverse;
  z-index: 1;
}
</style>