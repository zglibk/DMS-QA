<template>
  <div :class="['login-container-flex', showConfig ? 'config-open' : '']">
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
      </el-popover>
    </div>
    <div :class="['login-center-wrap', showConfig ? 'config-open' : '']">
      <div class="login-box">
        <div class="logo-container">
          <img src="/logo.png" alt="Vue Logo" class="logo" />
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
        <!-- 展开/折叠连接配置按钮 -->
        <div class="config-toggle-btn" @click="toggleConfig">
          <div class="config-toggle-text">
            <span v-for="(c, i) in configBtnTextArr" :key="i">{{c}}</span>
          </div>
          <el-icon v-if="!showConfig"><ArrowRightBold /></el-icon>
          <el-icon v-else><ArrowLeftBold /></el-icon>
        </div>
      </div>
      <!-- 连接配置抽屉 -->
      <transition name="slide-config">
        <div v-if="showConfig" class="config-drawer">
          <div class="config-box">
            <div class="config-title">连接配置</div>
            <el-form :model="dbConfig" :rules="dbRules" ref="dbFormRef" label-width="5.5rem" style="margin-top:1.5rem" @keydown.enter.prevent="saveConfig">
              <el-form-item label="选择配置">
                <div class="config-select-row">
                  <el-select v-model="selectedConfigId" placeholder="请选择配置" style="width:100%" @change="onConfigSelect">
                    <el-option v-for="item in configList" :key="item.ID" :label="getConfigDisplayName(item)" :value="item.ID" />
                  </el-select>
                  <el-button class="btn-refresh" circle @click="() => fetchConfigList(true)" :title="'刷新配置列表'" :loading="isRefreshing">
                    <el-icon v-if="!isRefreshing"><RefreshRight /></el-icon>
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item label="IP地址" prop="Host">
                <el-input v-model="dbConfig.Host" placeholder="数据库IP地址" />
              </el-form-item>
              <el-form-item label="数据库名" prop="DatabaseName">
                <el-input v-model="dbConfig.DatabaseName" placeholder="数据库名" />
              </el-form-item>
              <el-form-item label="用户名" prop="DbUser">
                <el-input v-model="dbConfig.DbUser" placeholder="数据库用户名" />
              </el-form-item>
              <el-form-item label="密码" prop="DbPassword">
                <el-input v-model="dbConfig.DbPassword" type="password" placeholder="数据库密码" show-password />
              </el-form-item>
              <el-form-item label="配置名称">
                <el-input v-model="dbConfig.ConfigName" placeholder="自定义配置名" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="dbConfig.Remark" placeholder="备注" />
              </el-form-item>
              <el-form-item>
                <div class="config-btn-row-col">
                  <el-button class="btn-confirm" type="primary" @click="saveConfig" :loading="isSubmitting" :disabled="isSubmitting">
                    {{ isSubmitting ? '保存中...' : '确认' }}
                  </el-button>
                  <div class="config-btn-row">
                    <el-button @click="testDb" type="info">连接测试</el-button>
                    <el-button @click="resetConfig">重置</el-button>
                    <el-button type="success" @click="setCurrentConfig" :disabled="!selectedConfigId">设为当前</el-button>
                    <el-button type="warning" @click="rollbackConfig">回滚</el-button>
                  </div>
                </div>
              </el-form-item>
            </el-form>
            <el-table :data="configList" border size="small" style="margin-top:1.5rem;width:100%" height="180">
              <el-table-column label="配置名" width="120">
                <template #default="scope">
                  {{ getCleanConfigName(scope.row.ConfigName, scope.row.ID) }}
                </template>
              </el-table-column>
              <el-table-column prop="Host" label="IP" width="110" />
              <el-table-column prop="DatabaseName" label="库名" width="110" />
              <el-table-column prop="DbUser" label="用户" width="90" />
              <el-table-column prop="IsCurrent" label="当前" width="60">
                <template #default="scope">
                  <el-tag v-if="scope.row.IsCurrent" type="success">当前</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="IsValid" label="有效" width="60">
                <template #default="scope">
                  <el-tag :type="scope.row.IsValid ? 'success' : 'danger'">{{scope.row.IsValid ? '是' : '否'}}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { User, Lock, ArrowRightBold, ArrowLeftBold, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'

const formRef = ref()
const dbFormRef = ref()
const form = ref({ username: 'admin', password: '', rememberMe: false })
const router = useRouter()
const userStore = useUserStore()

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

const dbConfig = ref({ Host: '', DatabaseName: '', DbUser: '', DbPassword: '' })
const dbRules = reactive({
  Host: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP地址格式不正确', trigger: 'blur' }
  ],
  DatabaseName: [
    { required: true, message: '请输入数据库名', trigger: 'blur' }
  ],
  DbUser: [
    { required: true, message: '请输入数据库用户名', trigger: 'blur' }
  ],
  DbPassword: [
    { required: true, message: '请输入数据库密码', trigger: 'blur' }
  ]
})

const configList = ref([])
const selectedConfigId = ref(null)
const showConfig = ref(false)
const configBtnTextArr = ['连', '接', '配', '置']
const toggleConfig = async () => {
  showConfig.value = !showConfig.value
  // 展开配置时加载配置列表
  if (showConfig.value) {
    await fetchConfigList()
  }
}

// 添加提交状态控制
const isSubmitting = ref(false)

// 添加刷新按钮加载状态
const isRefreshing = ref(false)

// 添加请求防抖
let fetchConfigListTimer = null;
const fetchConfigList = async (showLoading = false) => {
  // 清除之前的定时器
  if (fetchConfigListTimer) {
    clearTimeout(fetchConfigListTimer);
  }

  // 设置防抖延迟
  return new Promise((resolve) => {
    fetchConfigListTimer = setTimeout(async () => {
      const startTime = Date.now(); // 记录开始时间

      if (showLoading) {
        isRefreshing.value = true;
      }

      try {
        const response = await axios.get('/api/config/db-list')
        if (response.data && response.data.success) {
          configList.value = response.data.data
          // 找到当前配置并设置为选中
          const currentConfig = configList.value.find(item => item.IsCurrent === 1 || item.IsCurrent === true)
          if (currentConfig) {
            selectedConfigId.value = currentConfig.ID
            // 加载当前配置到表单
            dbConfig.value = {
              Host: currentConfig.Host,
              DatabaseName: currentConfig.DatabaseName,
              DbUser: currentConfig.DbUser,
              DbPassword: currentConfig.DbPassword,
              ConfigName: getCleanConfigNameForInput(currentConfig.ConfigName),
              Remark: getCleanRemark(currentConfig.Remark)
            }
            console.log('已加载当前配置:', currentConfig)
          } else {
            console.log('未找到当前配置，配置列表:', configList.value)
          }
        }

        // 计算请求耗时，确保最少显示500ms的加载动画
        const endTime = Date.now();
        const duration = endTime - startTime;
        const minDuration = 500; // 最少显示500ms

        if (showLoading) {
          if (duration < minDuration) {
            // 如果请求太快，延迟一下再隐藏加载状态
            setTimeout(() => {
              isRefreshing.value = false;
            }, minDuration - duration);
          } else {
            isRefreshing.value = false;
          }
        }

        resolve();
      } catch (e) {
        ElMessage.error('获取配置列表失败')
        console.error('获取配置列表失败:', e)

        if (showLoading) {
          // 错误时也要确保加载状态被重置
          setTimeout(() => {
            isRefreshing.value = false;
          }, 500);
        }

        resolve();
      }
    }, showLoading ? 0 : 300); // 如果显示加载动画，不使用防抖延迟
  });
}

const onConfigSelect = (id) => {
  const selectedConfig = configList.value.find(item => item.ID === id)
  if (selectedConfig) {
    dbConfig.value = {
      Host: selectedConfig.Host,
      DatabaseName: selectedConfig.DatabaseName,
      DbUser: selectedConfig.DbUser,
      DbPassword: selectedConfig.DbPassword,
      ConfigName: getCleanConfigNameForInput(selectedConfig.ConfigName),
      Remark: getCleanRemark(selectedConfig.Remark)
    }
  }
}

const setCurrentConfig = async () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择一个配置')
    return
  }
  try {
    const response = await axios.post('/api/config/set-current', {
      configId: selectedConfigId.value
    })
    if (response.data && response.data.success) {
      ElMessage.success('当前配置已更新')
      await fetchConfigList() // 重新加载配置列表
    }
  } catch (e) {
    ElMessage.error('设置当前配置失败')
    console.error('设置当前配置失败:', e)
  }
}

const rollbackConfig = async () => {
  // 重新加载当前配置
  await fetchConfigList()
  ElMessage.info('已回滚到当前配置')
}

const fetchDbConfig = async () => {
  await fetchConfigList()
}

// 获取配置显示名称
const getConfigDisplayName = (item) => {
  let name = item.ConfigName || '未命名'

  // 检查是否为乱码（包含特殊字符）
  if (/[^\u4e00-\u9fa5\w\s\-_()（）]/.test(name)) {
    name = `配置${item.ID}`
  }

  const currentText = (item.IsCurrent === 1 || item.IsCurrent === true) ? '（当前）' : ''
  const validText = item.IsValid ? '' : '（无效）'

  return `${name}${currentText}${validText}`
}

// 获取清理后的配置名称（用于表格显示）
const getCleanConfigName = (configName, id) => {
  if (!configName) return '未命名'

  // 检查是否为乱码（包含特殊字符）
  if (/[^\u4e00-\u9fa5\w\s\-_()（）]/.test(configName)) {
    return `配置${id}`
  }

  return configName
}

// 获取清理后的配置名称（用于输入框显示）
const getCleanConfigNameForInput = (configName) => {
  if (!configName) return ''

  // 检查是否为乱码（包含特殊字符），如果是乱码则返回空字符串让用户重新输入
  if (/[^\u4e00-\u9fa5\w\s\-_()（）]/.test(configName)) {
    return ''
  }

  return configName
}

// 获取清理后的备注（用于输入框显示）
const getCleanRemark = (remark) => {
  if (!remark) return ''

  // 检查是否为乱码（包含特殊字符），如果是乱码则返回空字符串让用户重新输入
  if (/[^\u4e00-\u9fa5\w\s\-_()（）.,，。！!？?]/.test(remark)) {
    return ''
  }

  return remark
}
const testDb = async () => {
  await dbFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await axios.post('/api/config/test-db', dbConfig.value)
      ElMessage.success('连接成功')
    } catch (e) {
      let msg = '连接失败';
      if (e.response && e.response.data && e.response.data.error) {
        msg += '：' + e.response.data.error
      }
      ElMessage.error(msg)
    }
  })
}
const saveConfig = async () => {
  if (isSubmitting.value) return // 防止重复提交

  await dbFormRef.value.validate(async (valid) => {
    if (!valid) return

    isSubmitting.value = true // 开始提交
    try {
      await axios.post('/api/config/db', dbConfig.value)
      ElMessage.success('数据库配置已保存')
    } catch (e) {
      let msg = '保存失败';
      if (e.response && e.response.data && e.response.data.message) {
        msg += '：' + e.response.data.message
      }
      ElMessage.error(msg)
    } finally {
      isSubmitting.value = false // 结束提交
    }
  })
}
const resetConfig = () => {
  dbConfig.value = { Host: '', DatabaseName: '', DbUser: '', DbPassword: '' }
}

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
onMounted(() => {
  fetchConfigList() // 只需要调用一次
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
/* 展开配置时整体居中 */
.login-container-flex.config-open {
  min-height: 100vh;
  justify-content: center;
}
.login-center-wrap.config-open {
  align-items: center;
  justify-content: center;
  min-height: 0;
  height: auto;
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
.config-toggle-btn {
  position: absolute;
  right: -2.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(22, 119, 255, 0.3);
  width: 2.4rem;
  height: 8.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.config-toggle-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.config-toggle-btn::after {
  content: '';
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0.3rem;
  height: 0.3rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  box-shadow:
    0 1.2rem 0 rgba(255, 255, 255, 0.4),
    0 2.4rem 0 rgba(255, 255, 255, 0.3),
    0 3.6rem 0 rgba(255, 255, 255, 0.2),
    0 4.8rem 0 rgba(255, 255, 255, 0.1);
}
.config-toggle-btn:hover {
  background: linear-gradient(135deg, #4096ff 0%, #1677ff 100%);
  box-shadow: 0 12px 40px rgba(22, 119, 255, 0.4);
  transform: translateY(-50%) scale(1.08) rotateY(5deg);
  border-color: rgba(255, 255, 255, 0.4);
}

.config-toggle-btn:hover::before {
  opacity: 1;
}

.config-toggle-btn:hover::after {
  animation: pulse 1.5s infinite;
}

.config-toggle-btn:active {
  transform: translateY(-50%) scale(1.02);
  transition: all 0.1s ease-out;
  box-shadow: 0 4px 20px rgba(22, 119, 255, 0.5);
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.config-toggle-text {
  writing-mode: vertical-rl;
  font-size: 1rem;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.15rem;
  margin-bottom: 0.5rem;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.config-toggle-btn:hover .config-toggle-text {
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
}
.config-drawer {
  background: #fff;
  border-radius: 0.3rem;
  box-shadow: 0 0 1.2rem #d0d6e1;
  width: 26rem;
  min-height: 32rem;
  margin-left: 2.5rem;
  padding: 2.5rem 1.5rem 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  top: 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
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