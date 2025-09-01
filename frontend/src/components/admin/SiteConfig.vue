<template>
  <div class="site-config">
    <el-card>
      <template #header>
        <div class="config-header">
          <div class="config-title">
            <el-icon><Picture /></el-icon>
            <span>网站LOGO配置</span>
          </div>
          <div class="config-description">
            配置网站LOGO、图标和基本信息，支持动态更换
          </div>
        </div>
      </template>

      <div class="config-content" v-loading="isLoading">
        <el-form :model="config" label-width="120px" class="config-form">
          <!-- 基本信息配置 -->
          <div class="config-section">
            <h4>基本信息</h4>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="网站名称">
                  <el-input v-model="config.siteName" placeholder="请输入网站名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="公司名称">
                  <el-input v-model="config.companyName" placeholder="请输入公司名称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="页面头部标题">
                  <el-input v-model="config.headerTitle" placeholder="请输入页面头部标题" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="登录页标题">
                  <el-input v-model="config.loginTitle" placeholder="请输入登录页面标题" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="版权信息">
              <el-input v-model="config.footerCopyright" placeholder="请输入页脚版权信息" />
            </el-form-item>
          </div>

          <!-- LOGO配置 -->
          <div class="config-section">
            <h4>LOGO配置</h4>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="网站LOGO">
                  <div class="logo-upload-section">
                    <div class="logo-preview">
                      <img :src="config.logoBase64Img" alt="LOGO预览" class="logo-img" :key="'logo-' + imageRefreshKey" @error="handleImageError" />
                    </div>
                    <div class="logo-controls">
                      <el-input v-model="config.logoBase64Img" placeholder="LOGO图片BASE64数据" class="logo-input">
                        <template #append>
                          <el-upload
                            :show-file-list="false"
                            :before-upload="beforeLogoUpload"
                            :http-request="uploadLogo"
                            accept="image/*"
                          >
                            <el-button type="primary" :loading="logoUploading">
                              <el-icon><Upload /></el-icon>
                              上传
                            </el-button>
                          </el-upload>
                        </template>
                      </el-input>
                      <div class="logo-tips">
                        <el-text size="small" type="info">
                          建议尺寸：120x40px，支持PNG、JPG格式，文件大小不超过2MB
                        </el-text>
                      </div>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="网站图标">
                  <div class="favicon-upload-section">
                    <div class="favicon-preview">
                      <img :src="config.faviconBase64Img" alt="图标预览" class="favicon-img" :key="'favicon-' + imageRefreshKey" @error="handleImageError" />
                    </div>
                    <div class="favicon-controls">
                      <el-input v-model="config.faviconBase64Img" placeholder="网站图标BASE64数据" class="favicon-input">
                        <template #append>
                          <el-upload
                            :show-file-list="false"
                            :before-upload="beforeFaviconUpload"
                            :http-request="uploadFavicon"
                            accept="image/*"
                          >
                            <el-button type="primary" :loading="faviconUploading">
                              <el-icon><Upload /></el-icon>
                              上传
                            </el-button>
                          </el-upload>
                        </template>
                      </el-input>
                      <div class="favicon-tips">
                        <el-text size="small" type="info">
                          建议尺寸：32x32px或16x16px，支持PNG、ICO格式，文件大小不超过1MB
                        </el-text>
                      </div>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 预览效果 -->
          <div class="config-section">
            <h4>预览效果</h4>
            <div class="preview-section">
              <div class="preview-header">
                <div class="preview-logo-area">
                  <img :src="config.logoBase64Img" alt="LOGO" class="preview-logo" :key="'preview-logo-' + imageRefreshKey" @error="handleImageError" />
                  <span class="preview-title">{{ config.headerTitle }}</span>
                </div>
                <div class="preview-company">{{ config.companyName }}</div>
              </div>
              <div class="preview-footer">
                {{ config.footerCopyright }}
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="config-actions">
            <el-button type="primary" @click="saveConfig" :loading="isSubmitting">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
            <el-button @click="resetConfig">
              <el-icon><RefreshLeft /></el-icon>
              重置为默认
            </el-button>
            <el-button @click="loadConfig(true)">
              <el-icon><Refresh /></el-icon>
              刷新配置
            </el-button>
          </div>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Upload, Check, RefreshLeft, Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const isLoading = ref(false)
const isSubmitting = ref(false)
const logoUploading = ref(false)
const faviconUploading = ref(false)
const imageRefreshKey = ref(0) // 用于强制刷新图片

// 配置数据
const config = reactive({
  siteName: '质量数据管理系统',
  companyName: 'DMS质量管理系统',
  logoBase64Img: '',
  faviconBase64Img: '',
  headerTitle: '质量数据系统',
  loginTitle: 'DMS-QA 质量管理系统',
  footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
})

// 加载配置
const loadConfig = async (showMessage = false) => {
  isLoading.value = true
  try {
    const response = await axios.get('/config/site-config')
    if (response.data.success) {
      const data = response.data.data
      Object.assign(config, data)
      
      if (showMessage) {
        ElMessage.success('配置刷新成功')
      }
    }
  } catch (error) {
    if (showMessage) {
      ElMessage.error('加载配置失败')
    }
  } finally {
    isLoading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  isSubmitting.value = true
  try {
    const response = await axios.put('/config/site-config', config)

    if (response.data.success) {
      ElMessage.success('网站配置保存成功')

      // 更新页面标题和图标
      updatePageMeta()

      // 强制刷新图片组件
      imageRefreshKey.value++

      // 通知其他组件更新
      window.dispatchEvent(new CustomEvent('siteConfigUpdated', {
        detail: config
      }))
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    isSubmitting.value = false
  }
}

// 重置配置
const resetConfig = () => {
  Object.assign(config, {
    siteName: '质量数据管理系统',
    companyName: 'DMS质量管理系统',
    logoBase64Img: '',
    faviconBase64Img: '',
    headerTitle: '质量数据系统',
    loginTitle: 'DMS-QA 质量管理系统',
    footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
  })
  ElMessage.success('配置已重置为默认值')
}

// 更新页面元信息
const updatePageMeta = () => {
  // 更新页面标题
  document.title = config.siteName
  
  // 更新favicon
  let favicon = document.querySelector('link[rel="icon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    document.head.appendChild(favicon)
  }
  favicon.href = config.faviconBase64Img
}

// 图片上传前验证
const beforeLogoUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const beforeFaviconUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt1M = file.size / 1024 / 1024 < 1

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt1M) {
    ElMessage.error('图片大小不能超过 1MB!')
    return false
  }
  return true
}

// 上传LOGO
const uploadLogo = async (options) => {
  logoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', options.file)
    formData.append('type', 'logo')

    const response = await axios.post('/upload/site-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      // 直接使用返回的BASE64数据URL
      config.logoBase64Img = response.data.data.url

      // 强制刷新图片组件
      imageRefreshKey.value++

      ElMessage.success('LOGO上传成功')

      // 强制更新预览
      await nextTick()
    } else {
      ElMessage.error(response.data.message || 'LOGO上传失败')
    }
  } catch (error) {
    ElMessage.error('LOGO上传失败')
  } finally {
    logoUploading.value = false
  }
}

// 上传网站图标
const uploadFavicon = async (options) => {
  faviconUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', options.file)
    formData.append('type', 'favicon')

    const response = await axios.post('/upload/site-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      // 直接使用返回的BASE64数据URL
      config.faviconBase64Img = response.data.data.url

      // 强制刷新图片组件
      imageRefreshKey.value++

      ElMessage.success('网站图标上传成功')

      // 强制更新预览
      await nextTick()
    } else {
      ElMessage.error(response.data.message || '网站图标上传失败')
    }
  } catch (error) {
    ElMessage.error('网站图标上传失败')
  } finally {
    faviconUploading.value = false
  }
}

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none' // 隐藏加载失败的图片
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.site-config {
  max-width: 1000px;
}

.config-header {
  margin: 0;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.config-description {
  color: #606266;
  font-size: 14px;
}

.config-content {
  padding: 20px 0;
}

.config-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.config-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.logo-upload-section,
.favicon-upload-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.logo-preview,
.favicon-preview {
  flex-shrink: 0;
  width: 120px;
  height: 80px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.favicon-preview {
  width: 64px;
  height: 64px;
}

.logo-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.favicon-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-controls,
.favicon-controls {
  flex: 1;
}

.logo-input,
.favicon-input {
  margin-bottom: 8px;
}

.logo-tips,
.favicon-tips {
  margin-top: 4px;
}

.preview-section {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.preview-logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-logo {
  height: 32px;
  object-fit: contain;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.preview-company {
  color: #606266;
  font-size: 14px;
}

.preview-footer {
  padding: 12px 20px;
  text-align: center;
  color: #909399;
  font-size: 12px;
  background: #f8f9fa;
}

.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
