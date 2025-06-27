<template>
  <div class="profile-main">
    <!-- 左侧信息卡：展示用户头像和只读信息 -->
    <el-card class="profile-side">
      <div class="avatar-wrap">
        <!-- 用户头像，若无则显示默认User图标 -->
        <el-avatar :size="100" :src="user.Avatar">
          <template v-if="!user.Avatar">
            <el-icon><User /></el-icon>
          </template>
        </el-avatar>
      </div>
      <!-- 用户只读信息列表 -->
      <el-descriptions column="1" border>
        <el-descriptions-item label="用户名">
          <el-icon><User /></el-icon> {{ user.Username }}
        </el-descriptions-item>
        <el-descriptions-item label="昵称">
          {{ user.RealName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="手机号">
          {{ user.Phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ user.Email || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="部门">
          {{ user.Department || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="角色">
          {{ user.Role || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ user.CreatedAt ? formatDate(user.CreatedAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 右侧tab内容：基本资料和修改密码 -->
    <el-card class="profile-content">
      <el-tabs v-model="activeTab">
        <!-- 基本资料Tab -->
        <el-tab-pane label="基本资料" name="base">
          <el-form :model="form" label-width="80px" style="max-width:400px;">
            <el-form-item label="用户名">
              <el-input v-model="user.Username" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="form.RealName" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.Phone" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.Email" />
            </el-form-item>
            <el-form-item label="部门">
              <el-input v-model="form.Department" />
            </el-form-item>
            <el-form-item label="角色">
              <el-input v-model="user.Role" disabled />
            </el-form-item>
            <el-form-item label="创建时间">
              <el-input :value="formatDate(user.CreatedAt)" disabled />
            </el-form-item>
            <!-- 头像可编辑，支持上传、裁剪和本地预览 -->
            <el-form-item label="头像">
              <div class="avatar-center-row">
                <el-avatar :size="60" :src="form.Avatar || user.Avatar" style="cursor:pointer;" @click="triggerFileInput">
                  <template v-if="!form.Avatar && !user.Avatar">
                    <el-icon><User /></el-icon>
                  </template>
                </el-avatar>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="openCropper" />
              <!-- 裁剪弹窗 -->
              <el-dialog v-model="cropperVisible" title="裁剪头像" width="420px">
                <div style="height:320px;width:100%;overflow:auto;">
                  <Cropper
                    ref="cropper"
                    :src="cropperImg"
                    :stencil-props="{ aspectRatio: 1 }"
                    :autoZoom="true"
                    :resizeImage="true"
                    style="height:300px;width:100%;background:#222;"
                  />
                </div>
                <template #footer>
                  <el-button @click="cropperVisible=false">取消</el-button>
                  <el-button type="primary" @click="doCrop">确定</el-button>
                </template>
              </el-dialog>
            </el-form-item>
            <el-form-item>
              <div class="avatar-btn-row">
                <el-button size="small" class="avatar-btn" @click="triggerFileInput">上传头像</el-button>
                <el-button type="primary" class="profile-save-btn" @click="saveProfile">确定</el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <!-- 修改密码Tab -->
        <el-tab-pane label="修改密码" name="pwd">
          <el-form
            :model="pwdForm"
            :rules="pwdRules"
            ref="pwdFormRef"
            label-width="80px"
            style="max-width:400px;"
            @submit.prevent="changePwd"
          >
            <el-form-item label="原密码" prop="oldPwd">
              <el-input v-model="pwdForm.oldPwd" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPwd">
              <el-input v-model="pwdForm.newPwd" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPwd">
              <el-input v-model="pwdForm.confirmPwd" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" native-type="submit">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'

const router = useRouter()
const fileInput = ref(null)
const cropperVisible = ref(false)
const cropperImg = ref('')
const cropper = ref(null)
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
// form对象用于存储可编辑字段
const form = reactive({
  RealName: '',
  Email: '',
  Phone: '',
  Department: '',
  Avatar: ''
})
// 当前激活的Tab
const activeTab = ref('base')

// 获取当前用户信息，填充user和form
const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    Object.assign(user.value, res.data.data)
    form.RealName = user.value.RealName
    form.Email = user.value.Email
    form.Phone = user.value.Phone
    form.Department = user.value.Department
    form.Avatar = user.value.Avatar
  }
}
// 保存资料，只提交可编辑字段
const saveProfile = async () => {
  if (form.Avatar && form.Avatar.length > 2000000) {
    ElMessage.error('头像图片过大，无法保存')
    return
  }
  const token = localStorage.getItem('token')
  const res = await axios.post('/api/auth/profile', form, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    ElMessage.success('保存成功')
    if (res.data.data) {
      userStore.setUser(res.data.data)
      form.RealName = res.data.data.RealName
      form.Email = res.data.data.Email
      form.Phone = res.data.data.Phone
      form.Department = res.data.data.Department
      form.Avatar = res.data.data.Avatar
    }
  } else {
    ElMessage.error(res.data.message || '保存失败')
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
const pwdRules = {
  oldPwd: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPwd: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (rule, value) => value === pwdForm.newPwd, message: '两次输入不一致', trigger: 'blur' }
  ]
}
// 修改密码方法，成功后强制退出并清除记住密码
const changePwd = () => {
  pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('/api/auth/change-password', pwdForm, {
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
      ElMessage.error('密码修改失败')
    }
  })
}

// 头像上传裁剪相关
const triggerFileInput = () => {
  fileInput.value && fileInput.value.click()
}
const openCropper = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    cropperImg.value = ev.target.result
    cropperVisible.value = true
  }
  reader.readAsDataURL(file)
}
const doCrop = async () => {
  // 获取裁剪后的base64
  const result = cropper.value.getResult()
  if (!result || !result.canvas) {
    ElMessage.error('请先选择图片区域')
    return
  }
  const canvas = result.canvas
  let base64 = canvas.toDataURL('image/png')
  if (base64.length > 2000000) {
    ElMessage.error('头像图片过大，请选择更小的图片')
    return
  }
  form.Avatar = base64
  cropperVisible.value = false
  await saveProfile() // 裁剪后自动保存，防止刷新丢失
}

// 页面加载时获取用户信息
onMounted(userStore.fetchProfile)
</script>

<style scoped>
/* 页面主布局：左右分栏 */
.profile-main {
  display: flex;
  gap: 32px;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 0;
}
/* 左侧信息卡样式 */
.profile-side {
  width: 350px;
  min-width: 300px;
  text-align: center;
}
.avatar-wrap {
  margin: 32px 0 24px 0;
  display: flex;
  justify-content: center;
}
/* 右侧内容区样式 */
.profile-content {
  flex: 1;
  min-width: 350px;
}
.avatar-center-row {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 18px;
}
.avatar-btn-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 0;
  margin-bottom: 0;
  justify-content: center;
}
.avatar-btn {
  min-width: 100px;
  height: 36px;
  vertical-align: middle;
  color: #409EFF !important;
  background: #fff !important;
  border: 1px solid #409EFF !important;
}
.profile-save-btn {
  min-width: 100px;
  height: 36px;
  vertical-align: middle;
}
.el-form-item:last-child {
  margin-top: -16px;
  display: flex;
  align-items: center;
}
</style> 