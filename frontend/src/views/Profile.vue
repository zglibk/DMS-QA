<template>
  <div class="profile-main">
    <!-- 装订线效果 -->
    <div class="binding-line">
      <div class="binding-hole"></div>
    </div>
    <!-- 左侧信息卡：展示用户头像和只读信息 -->
    <el-card class="profile-side" shadow="hover">
      <!-- 用户信息头部 -->
      <div class="user-info-header">
        <div class="avatar-wrap">
          <!-- 用户头像，若无则显示默认User图标 -->
          <el-avatar :size="120" :src="user.Avatar" class="user-avatar">
            <template v-if="!user.Avatar">
              <el-icon size="48"><User /></el-icon>
            </template>
          </el-avatar>
          <!-- 在线状态指示器 -->
          <div class="online-status"></div>
        </div>
        <div class="user-basic-info">
          <h3 class="user-name">{{ user.RealName || user.Username }}</h3>
          <p class="user-role">{{ user.roles?.map(r => r.name).join(', ') || '普通用户' }}</p>
        </div>
      </div>
      
      <!-- 用户详细信息 -->
      <div class="user-details">
        <div class="detail-section">
          <h4 class="section-title">
            <el-icon><User /></el-icon>
            基本信息
          </h4>
          <div class="detail-items">
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><User /></el-icon>
                用户名
              </span>
              <span class="detail-value">{{ user.Username || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><Avatar /></el-icon>
                真实姓名
              </span>
              <span class="detail-value">{{ user.RealName || '-' }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4 class="section-title">
            <el-icon><Message /></el-icon>
            联系方式
          </h4>
          <div class="detail-items">
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><Phone /></el-icon>
                手机号
              </span>
              <span class="detail-value">{{ user.Phone || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><Message /></el-icon>
                邮箱
              </span>
              <span class="detail-value">{{ user.Email || '-' }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4 class="section-title">
            <el-icon><OfficeBuilding /></el-icon>
            组织信息
          </h4>
          <div class="detail-items">
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><OfficeBuilding /></el-icon>
                部门
              </span>
              <span class="detail-value">{{ user.DepartmentName || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <el-icon><Calendar /></el-icon>
                创建时间
              </span>
              <span class="detail-value">{{ user.CreatedAt ? formatDate(user.CreatedAt) : '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 右侧tab内容：基本资料和修改密码 -->
    <el-card class="profile-content">
      <el-tabs v-model="activeTab">
        <!-- 基本资料Tab -->
        <el-tab-pane label="基本资料" name="base">
          <div class="form-area">
            <!-- 头像预览区域 -->
            <div class="avatar-preview-section">
              <div class="avatar-preview-wrap">
                <el-avatar :size="120" :src="form.Avatar || user.Avatar">
                  <template v-if="!form.Avatar && !user.Avatar">
                    <el-icon><User /></el-icon>
                  </template>
                </el-avatar>
              </div>
              <div class="avatar-preview-title">预览</div>
            </div>
            
            <el-form :model="form" label-width="80px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名">
                  <el-input v-model="user.Username" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="真实姓名">
                  <el-input v-model="form.RealName" :disabled="!isEditing" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="手机号">
                  <el-input v-model="form.Phone" :disabled="!isEditing" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱">
                  <el-input v-model="form.Email" :disabled="!isEditing" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="部门">
                  <el-select v-model="form.DepartmentID" placeholder="请选择部门" style="width: 100%" :disabled="!isEditing">
                    <el-option 
                      v-for="dept in departmentList" 
                      :key="dept.ID" 
                      :label="dept.Name" 
                      :value="dept.ID" 
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色">
                  <el-input :value="user.roles?.map(r => r.name).join(', ') || '普通用户'" disabled />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="性别">
                  <el-select v-model="form.Gender" placeholder="请选择性别" style="width: 100%" :disabled="!isEditing">
                    <el-option label="男" value="男" />
                    <el-option label="女" value="女" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="生日">
                  <el-date-picker v-model="form.Birthday" type="date" placeholder="请选择生日" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" :disabled="!isEditing" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="创建时间">
              <el-input :value="formatDate(user.CreatedAt)" disabled />
            </el-form-item>
            
            <el-form-item label="地址">
              <el-input v-model="form.Address" type="textarea" :rows="2" placeholder="请输入地址" :disabled="!isEditing" />
            </el-form-item>
            
            <el-form-item label="备注">
              <el-input v-model="form.Remark" type="textarea" :rows="2" placeholder="请输入备注" :disabled="!isEditing" />
            </el-form-item>
            </el-form>
          </div>
          
          <!-- 按钮区域 -->
          <div class="form-submit-section">
            <el-button v-if="!isEditing" @click="startEdit" type="primary" class="profile-edit-btn">
              <el-icon style="margin-right: 8px;"><Document /></el-icon>
              编辑
            </el-button>
            <template v-else>
              <el-button @click="triggerFileInput" type="danger" plain>
                <el-icon style="margin-right: 8px;"><Camera /></el-icon>
                更换头像
              </el-button>
              <el-button @click="cancelEdit" plain>
                取消
              </el-button>
              <el-button type="primary" class="profile-save-btn" @click="saveProfile" :loading="saveLoading" :disabled="saveLoading">
                <el-icon style="margin-right: 5px;"><Document /></el-icon>
                保存
              </el-button>
            </template>
          </div>
          
          <!-- 头像上传组件 - 点击时显示 -->
          <div v-if="showAvatarUpload" class="avatar-upload-overlay">
            <VueAvatarUpload
              :avatar="form.Avatar || user.Avatar"
              :width="400"
              :height="400"
              :selectSize="300"
              :showPreview="true"
              :previewSize="120"
              :lang="'zh-CN'"
              :format="'png'"
              :onCustomRequest="handleAvatarUpload"
              @close="showAvatarUpload = false"
            />
          </div>
          
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileSelect" />
        </el-tab-pane>
        <!-- 修改密码Tab -->
        <el-tab-pane label="修改密码" name="pwd">
          <div class="password-change-section">
            <div class="password-form-header">
              <el-icon class="password-icon"><Lock /></el-icon>
              <h3>修改登录密码</h3>
              <p>为了您的账户安全，请定期更换密码</p>
            </div>
            
            <el-form
              :model="pwdForm"
              :rules="pwdRules"
              ref="pwdFormRef"
              label-width="100px"
              class="password-form"
              @submit.prevent="changePwd"
            >
              <el-form-item label="当前密码" prop="oldPwd">
                <el-input 
                  v-model="pwdForm.oldPwd" 
                  type="password" 
                  show-password 
                  placeholder="请输入当前密码"
                  size="large"
                  :prefix-icon="Key"
                />
              </el-form-item>
              
              <el-form-item label="新密码" prop="newPwd">
                <el-input 
                  v-model="pwdForm.newPwd" 
                  type="password" 
                  show-password 
                  placeholder="请输入新密码"
                  size="large"
                  :prefix-icon="Lock"
                />
              </el-form-item>
              
              <el-form-item label="确认新密码" prop="confirmPwd">
                <el-input 
                  v-model="pwdForm.confirmPwd" 
                  type="password" 
                  show-password 
                  placeholder="请再次输入新密码"
                  size="large"
                  :prefix-icon="Lock"
                />
              </el-form-item>
              
              <div class="password-tips">
                <el-alert
                  title="密码安全提示"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <ul class="tips-list">
                      <li>密码长度至少6位字符</li>
                      <li>建议包含字母、数字和特殊字符</li>
                      <li>不要使用过于简单的密码</li>
                    </ul>
                  </template>
                </el-alert>
              </div>
              
              <el-form-item class="password-submit-item">
                <div class="password-buttons">
                  <el-button  @click="resetPasswordForm" type="danger" plain>重置</el-button>
                  <el-button type="primary" native-type="submit" :loading="passwordLoading">
                    <el-icon style="margin-right: 5px;"><Document /></el-icon>
                    确认修改
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { User, Check, Camera, Document, Lock, Key, Avatar, Message, Phone, OfficeBuilding, Calendar } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import VueCropper from 'vue-cropperjs'
import 'cropperjs/dist/cropper.css'
import VueAvatarUpload from 'vue-avatar-upload'
import 'vue-avatar-upload/lib/style.css'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'

const router = useRouter()
const fileInput = ref(null)
const showAvatarUpload = ref(false)
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
// 部门列表数据
const departmentList = ref([])
// form对象用于存储可编辑字段
const form = reactive({
  RealName: '',
  Email: '',
  Phone: '',
  DepartmentID: '', // 部门ID
  Avatar: '',
  Gender: '',
  Birthday: '',
  Address: '',
  Remark: ''
})
// 当前激活的Tab
const activeTab = ref('base')
// 编辑模式状态
const isEditing = ref(false)
// 保存按钮加载状态
const saveLoading = ref(false)

// 获取当前用户信息，填充user和form
const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    Object.assign(user.value, res.data.data)
    form.RealName = res.data.data.RealName || ''
    form.Email = res.data.data.Email || ''
    form.Phone = res.data.data.Phone || ''
    form.DepartmentID = res.data.data.DepartmentID || ''
    form.Avatar = res.data.data.Avatar || ''
    form.Gender = res.data.data.Gender || ''
    form.Birthday = res.data.data.Birthday || ''
    form.Address = res.data.data.Address || ''
    form.Remark = res.data.data.Remark || ''
  }
}
// 开始编辑模式
const startEdit = () => {
  isEditing.value = true
}

// 取消编辑模式
const cancelEdit = () => {
  isEditing.value = false
  // 重新获取用户信息，恢复原始数据
  fetchProfile()
}

// 保存资料，只提交可编辑字段
const saveProfile = async () => {
  if (form.Avatar && form.Avatar.length > 2000000) {
    ElMessage.error('头像图片过大，无法保存')
    return
  }
  
  saveLoading.value = true
  
  try {
    const token = localStorage.getItem('token')
    // 只发送后端需要的字段
    const profileData = {
      RealName: form.RealName,
      Email: form.Email,
      Phone: form.Phone,
      DepartmentID: form.DepartmentID,
      Avatar: form.Avatar,
      Gender: form.Gender,
      Birthday: form.Birthday,
      Address: form.Address,
      Remark: form.Remark
    }
    const res = await axios.post('/auth/profile', profileData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      ElMessage.success('保存成功')
      if (res.data.data) {
        // 重新从后端获取完整的用户信息，确保状态管理器数据完整
        await userStore.fetchProfile(true)
        
        // 更新表单数据
        form.RealName = res.data.data.RealName
        form.Email = res.data.data.Email
        form.Phone = res.data.data.Phone
        form.Department = res.data.data.DepartmentName
        form.DepartmentID = res.data.data.DepartmentID
        form.Avatar = res.data.data.Avatar
        form.Gender = res.data.data.Gender
        form.Birthday = res.data.data.Birthday
        form.Address = res.data.data.Address
        form.Remark = res.data.data.Remark
      }
      // 保存成功后退出编辑模式
      isEditing.value = false
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}
// 格式化时间显示
const formatDate = (val) => {
  if (!val) return ''
  return new Date(val).toLocaleString()
}

// 修改密码相关数据和校验规则
const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })
const pwdFormRef = ref()
const passwordLoading = ref(false)
const pwdRules = {
  oldPwd: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位字符', trigger: 'blur' }
  ],
  confirmPwd: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (rule, value) => value === pwdForm.newPwd, message: '两次密码输入不一致', trigger: 'blur' }
  ]
}
/**
 * 重置密码表单
 */
const resetPasswordForm = () => {
  pwdForm.oldPwd = ''
  pwdForm.newPwd = ''
  pwdForm.confirmPwd = ''
  pwdFormRef.value?.clearValidate()
}

/**
 * 修改密码方法，成功后强制退出并清除记住密码
 */
const changePwd = () => {
  pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    passwordLoading.value = true
    const token = localStorage.getItem('token')
    
    try {
      const res = await axios.post('/auth/change-password', pwdForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success) {
        ElMessage.success('密码修改成功，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('login-info') // 清除记住密码
        router.replace('/login')
      } else {
        ElMessage.error(res.data.message || '密码修改失败')
      }
    } catch (e) {
      ElMessage.error('密码修改失败，请检查网络连接')
    } finally {
      passwordLoading.value = false
    }
  })
}

// 头像上传相关
/**
 * 触发头像上传组件显示
 */
function triggerFileInput() {
  showAvatarUpload.value = true
}

/**
 * 压缩图片到指定大小
 * @param {File} file - 原始图片文件
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {number} quality - 压缩质量（0-1）
 * @returns {Promise<string>} - 压缩后的base64字符串
 */
const compressImage = (file, maxSize = 2 * 1024 * 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // 计算压缩后的尺寸
      let { width, height } = img
      const maxDimension = 800 // 最大尺寸
      
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height)
      
      // 转换为base64，如果还是太大则降低质量
      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      
      // 检查压缩后大小，如果还是太大则进一步压缩
      const compressedSize = Math.round((compressedDataUrl.length - 'data:image/jpeg;base64,'.length) * 3/4)
      
      if (compressedSize > maxSize && quality > 0.1) {
        // 递归压缩，降低质量
        compressImage(file, maxSize, quality - 0.1).then(resolve).catch(reject)
      } else {
        resolve(compressedDataUrl)
      }
    }
    
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 处理头像上传（自定义上传逻辑）
 * @param {File} file - 上传的文件
 * @param {Function} close - 关闭上传组件的函数
 */
const handleAvatarUpload = async (file, close) => {
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  try {
    let avatarData
    
    // 如果文件大小超过2MB，进行压缩
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.info('图片较大，正在自动压缩...')
      avatarData = await compressImage(file)
      ElMessage.success('图片压缩完成')
    } else {
      // 文件大小合适，直接读取
      avatarData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    
    form.Avatar = avatarData
    ElMessage.success('头像已更新，请点击保存按钮保存更改')
    // 关闭上传组件
    showAvatarUpload.value = false
    close && close()
  } catch (error) {
    console.error('头像处理失败:', error)
    ElMessage.error('头像处理失败，请重试')
  }
}

// 保留原有的文件选择处理（用于兼容）
const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  try {
    let avatarData
    
    // 如果文件大小超过2MB，进行压缩
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.info('图片较大，正在自动压缩...')
      avatarData = await compressImage(file)
      ElMessage.success('图片压缩完成')
    } else {
      // 文件大小合适，直接读取
      avatarData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    
    form.Avatar = avatarData
    ElMessage.success('头像已更新，请点击保存按钮保存更改')
    showAvatarUpload.value = false
  } catch (error) {
    console.error('头像处理失败:', error)
    ElMessage.error('头像处理失败，请重试')
  }
}

// 头像上传相关函数

/**
 * 获取部门列表数据
 */
const fetchDepartments = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/departments', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      departmentList.value = res.data.data || []
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
    ElMessage.error('获取部门列表失败')
  }
}

// 页面加载时获取用户信息和部门列表
onMounted(() => {
  fetchProfile()
  fetchDepartments()
})
</script>

<style scoped>
/* 页面主布局：左右分栏 */
.profile-main {
  display: flex;
  gap: 32px;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 0;
  position: relative;
}

/* 装订线效果 */
.binding-line {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 80%;
  background: linear-gradient(to bottom, 
    transparent 0%, 
    #e0e6ed 10%, 
    #d1d9e0 50%, 
    #e0e6ed 90%, 
    transparent 100%);
  border-radius: 20px;
  z-index: 1000;
  box-shadow: 
    inset 0 0 10px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

/* 装订孔效果 */
.binding-line::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 20%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.2);
}

.binding-line::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 添加第三个装订孔 */
.binding-line {
  position: relative;
}

.binding-line .binding-hole {
  position: absolute;
  left: 50%;
  top: 80%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.2);
}
/* 左侧信息卡样式 */
.profile-side {
  width: 380px;
  min-width: 320px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid #e9ecef;
  border-radius: 16px;
  overflow: hidden;
}

/* 用户信息头部样式 */
.user-info-header {
  text-align: center;
  padding: 20px 20px 18px;
  background: linear-gradient(135deg, #409eff 0%, #36a3f7 100%);
  color: white;
  position: relative;
}

.avatar-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.user-avatar {
  border: 4px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.online-status {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: #67c23a;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-basic-info {
  margin-top: 15px;
}

.user-name {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-role {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}

/* 用户详细信息样式 */
.user-details {
  padding: 20px 25px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e4e7ed;
}

.section-title .el-icon {
  color: #409eff;
  font-size: 16px;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

.detail-item:hover {
  background: rgba(64, 158, 255, 0.02);
  border-bottom-color: #f0f2f5;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  min-width: 70px;
}

.detail-label .el-icon {
  color: #909399;
  font-size: 14px;
}

.detail-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
  max-width: 200px;
}

/* 右侧内容区样式 */
.profile-content {
  flex: 1;
  min-width: 350px;
  max-width: 35vw;
}
/* 表单区域样式 */
.form-area {
  max-width: 600px;
  margin: 0 auto;
}

/* 表单项间距样式 */
.form-area .el-form-item {
  margin-bottom: 24px;
}

.form-area .el-row {
  margin-bottom: 8px;
}

.form-area .el-row .el-col {
  padding: 0 8px;
}

.form-area .el-row:first-child .el-col {
  padding-left: 0;
}

.form-area .el-row:last-child .el-col {
  padding-right: 0;
}

/* 头像预览区域样式 */
.avatar-preview-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.avatar-preview-wrap {
  margin-bottom: 10px;
}

.avatar-preview-title {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 表单提交区域样式 */
.form-submit-section {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

/* 头像上传覆盖层样式 */
.avatar-upload-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.profile-save-btn {
  min-width: 200px;
  height: 36px;
}

/* 编辑按钮样式 */
.profile-edit-btn {
  min-width: 200px;
  height: 36px;
}
.el-form-item:last-child {
  margin-top: -16px;
  display: flex;
  align-items: center;
}

/* vue-avatar-upload 组件按钮字体大小覆盖 */
:deep(.vue-avatar-upload .btn-group .btn) {
  font-size: 12px !important;
}

:deep(.vue-avatar-upload .operate-btn) {
  font-size: 12px !important;
}

:deep(.vue-avatar-upload .change-btn) {
  font-size: 12px !important;
}

:deep(.vue-avatar-upload .rotate-btn) {
  font-size: 12px !important;
}

/* 密码修改页面样式 */
.password-change-section {
  max-width: 600px;
  margin: 0 auto;
  padding: 25px;
}

.password-form-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #409EFF;
  border-radius: 12px;
  color: white;
}

.password-form-header .password-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.9;
}

.password-form-header h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
}

.password-form-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

.password-form {
  background: #ffffff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.password-form .el-form-item {
  margin-bottom: 25px;
}

.password-form .el-form-item__label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.password-form .el-input {
  border-radius: 8px;
}

.password-form .el-input__wrapper {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.password-form .el-input__wrapper:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.password-form .el-input.is-focus .el-input__wrapper {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.password-tips {
  margin: 25px 0;
}

.password-tips .el-alert {
  border-radius: 8px;
  border: none;
  background-color: #f4f9ff;
}

.password-tips .tips-list {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.password-tips .tips-list li {
  margin-bottom: 5px;
  font-size: 13px;
  line-height: 1.5;
}

.password-submit-item {
  margin-bottom: 0 !important;
  margin-top: 30px;
}

.password-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.password-buttons .el-button {
  min-width: 120px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.password-buttons .el-button:not(.el-button--primary) {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #6c757d;
}

.password-buttons .el-button:not(.el-button--primary):hover {
  background-color: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}

.password-buttons .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #36a3f7 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.password-buttons .el-button--primary:hover {
  background: linear-gradient(135deg, #36a3f7 0%, #2b8ce6 100%);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .profile-main {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  
  .profile-side {
    width: 100%;
    max-width: 500px;
  }
  
  .profile-content {
    width: 100%;
    max-width: 800px;
  }
}

@media (max-width: 768px) {
  .profile-main {
    padding: 20px 10px;
  }
  
  .profile-side {
    min-width: auto;
    width: 100%;
  }
  
  .user-info-header {
    padding: 15px 15px 12px;
  }
  
  .user-avatar {
    width: 100px !important;
    height: 100px !important;
  }
  
  .user-name {
    font-size: 18px;
  }
  
  .user-details {
    padding: 15px 20px;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 0;
  }
  
  .detail-label {
    min-width: auto;
  }
  
  .detail-value {
    text-align: left;
    max-width: 100%;
    font-size: 12px;
  }
  
  .section-title {
    font-size: 13px;
  }
  
  .password-change-section {
    max-width: 100%;
    padding: 15px;
  }
  
  .password-form {
    padding: 20px;
  }
  
  .password-form-header {
    padding: 15px;
  }
  
  .password-form-header .password-icon {
    font-size: 36px;
  }
  
  .password-form-header h3 {
    font-size: 20px;
  }
  
  .password-buttons {
    flex-direction: column;
  }
  
  .password-buttons .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .profile-main {
    gap: 15px;
    padding: 15px 5px;
  }
  
  .user-info-header {
    padding: 12px 10px 10px;
  }
  
  .user-avatar {
    width: 80px !important;
    height: 80px !important;
  }
  
  .user-name {
    font-size: 16px;
  }
  
  .user-role {
    font-size: 12px;
    padding: 3px 8px;
  }
  
  .user-details {
    padding: 12px 15px;
  }
  
  .detail-item {
    padding: 8px 0;
  }
  
  .section-title {
    font-size: 12px;
  }
  
  .detail-label,
  .detail-value {
    font-size: 11px;
  }
}
</style>