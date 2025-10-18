<template>
  <div class="qr-scan-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><Camera /></el-icon>
        二维码工单信息扫描
      </h1>
      <p class="page-description">扫描二维码获取物料信息，支持批量扫描和数据导出</p>
    </div>

    <!-- 设备检测提示 -->
    <el-alert
      v-if="!hasCamera"
      title="扫描装置检测"
      type="warning"
      :closable="false"
      show-icon
      class="device-alert"
    >
      <template #default>
        <div class="alert-content">
          <p><strong>未检测到扫描装置</strong></p>
          <div class="solution-list">
            <p><strong>PC端解决方案：</strong></p>
            <ul>
              <li>连接USB扫描装置</li>
              <li>安装扫描装置驱动程序</li>
              <li>检查设备管理器中设备状态</li>
              <li>确保扫描装置未被其他应用占用</li>
            </ul>
            <p><strong>移动端建议：</strong></p>
            <ul>
              <li>使用手机或平板设备访问此页面</li>
              <li>确保浏览器已获得扫描装置权限</li>
            </ul>
          </div>
          <el-button 
            type="primary" 
            @click="recheckCamera"
            :loading="checkingCamera"
            style="margin-top: 10px;"
          >
            重新检测扫描装置
          </el-button>
        </div>
      </template>
    </el-alert>

    <!-- 扫描区域 -->
    <div class="scan-section">
      <el-card class="scan-card">
        <template #header>
          <div class="card-header">
            <span>扫描区域</span>
            <div class="header-actions">
              <el-tag v-if="hasCamera" type="success" size="small">
                <el-icon><VideoCamera /></el-icon>
                扫描装置就绪
              </el-tag>
              <el-tag v-else type="danger" size="small">
                <el-icon><Warning /></el-icon>
                无扫描装置
              </el-tag>
            </div>
          </div>
        </template>
        
        <QrCodeScanner 
          ref="scannerRef"
          @scan-success="handleScanSuccess"
          @scan-error="handleScanError"
          @camera-ready="handleCameraReady"
          @camera-error="handleCameraError"
        />
      </el-card>
    </div>

    <!-- 扫描结果展示 -->
    <div class="results-section" v-if="scanResults.length > 0">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>扫描结果 ({{ scanResults.length }})</span>
            <div class="header-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="exportResults"
                :disabled="scanResults.length === 0"
              >
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="clearResults"
                :disabled="scanResults.length === 0"
              >
                <el-icon><Delete /></el-icon>
                清空结果
              </el-button>
            </div>
          </div>
        </template>

        <el-table :data="scanResults" stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="materialCode" label="物料编码" width="120" />
          <el-table-column prop="materialName" label="物料名称" min-width="150" />
          <el-table-column prop="batchNumber" label="批次号" width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column prop="scanTime" label="扫描时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.scanTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row, $index }">
              <el-button 
                type="danger" 
                size="small" 
                @click="removeResult($index)"
                link
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 使用说明 -->
    <div class="help-section">
      <el-card>
        <template #header>
          <span>使用说明</span>
        </template>
        <div class="help-content">
          <h4>支持的二维码格式：</h4>
          <ul>
            <li><strong>JSON格式：</strong>{"materialCode":"01050300529","materialName":"能效标贴（i10013T升级）","batchNumber":"B20240101","quantity":100,"unit":"pcs"}</li>
            <li><strong>分隔符格式：</strong>01050300529|能效标贴（i10013T升级）|B20240101|100|pcs</li>
            <li><strong>键值对格式：</strong>code=01050300529&name=能效标贴（i10013T升级）&batch=B20240101&qty=100&unit=pcs</li>
          </ul>
          <h4>操作步骤：</h4>
          <ol>
            <li>确保扫描装置正常连接</li>
            <li>点击"开始扫描"按钮</li>
            <li>扫描框对准二维码</li>
            <li>扫描成功后数据会自动添加到结果列表</li>
            <li>可以导出扫描结果或清空列表</li>
          </ol>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Camera, VideoCamera, Warning, Download, Delete } from '@element-plus/icons-vue'
import QrCodeScanner from '@/components/QrCodeScanner.vue'

export default {
  name: 'QrScanPage',
  components: {
    QrCodeScanner,
    Camera,
    VideoCamera,
    Warning,
    Download,
    Delete
  },
  setup() {
    const scannerRef = ref(null)
    const scanResults = ref([])
    const hasCamera = ref(false)
    const checkingCamera = ref(false)

    /**
     * 检测扫描设备
     * 检查系统是否有可用的扫描设备
     */
    const checkCameraDevice = async () => {
      checkingCamera.value = true
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          hasCamera.value = false
          ElMessage.warning('当前浏览器不支持扫描功能')
          return
        }

        // 请求权限并检测设备
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(track => track.stop())
          
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          
          hasCamera.value = videoDevices.length > 0
          
          if (hasCamera.value) {
            ElMessage.success(`检测到 ${videoDevices.length} 个扫描装置`)
          } else {
            ElMessageBox.alert(
              '<div style="text-align: center;"><h3 style="color: #E6A23C; font-size: 18px; margin-bottom: 15px;">⚠️ 未检测到扫描装置</h3></div><br>请检查以下几点：<br><br>1. 确保扫描设备已正确连接<br>2. 检查扫描装置驱动是否正常<br>3. 确认其他应用程序未占用扫描设备<br>4. 尝试重新插拔扫描设备<br>5. 重启浏览器或电脑',
              '扫描装置检测失败',
              {
                confirmButtonText: '确定',
                type: 'warning',
                dangerouslyUseHTMLString: true
              }
            )
          }
        } catch (error) {
          hasCamera.value = false
          if (error.name === 'NotAllowedError') {
            ElMessage.error('扫描权限被拒绝，请允许访问扫描装置')
          } else if (error.name === 'NotFoundError') {
            ElMessageBox.alert(
              '<div style="text-align: center;"><h3 style="color: #E6A23C; font-size: 18px; margin-bottom: 15px;">⚠️ 未检测到扫描设备</h3></div><br>请检查以下几点：<br><br>1. 确保扫描装置已正确连接<br>2. 检查设备驱动是否正常<br>3. 确认其他应用程序未占用扫描设备<br>4. 尝试重新插拔扫描设备<br>5. 重启浏览器或电脑',
              '扫描装置检测失败',
              {
                confirmButtonText: '确定',
                type: 'warning',
                dangerouslyUseHTMLString: true
              }
            )
          } else {
            ElMessage.error('检测扫描装置失败：' + error.message)
          }
        }
      } catch (error) {
        hasCamera.value = false
        ElMessage.error('检测扫描装置失败：' + error.message)
      } finally {
        checkingCamera.value = false
      }
    }

    /**
     * 处理扫描成功
     * @param {Object} result - 扫描结果数据
     */
    const handleScanSuccess = (result) => {
      // 检查是否已存在相同的扫描结果
      const exists = scanResults.value.some(item => 
        item.materialCode === result.materialCode && 
        item.batchNumber === result.batchNumber
      )

      if (exists) {
        ElMessage.warning('该物料已扫描过，请勿重复扫描')
        return
      }

      // 添加扫描时间
      result.scanTime = new Date()
      
      // 添加到结果列表
      scanResults.value.unshift(result)
      
      ElMessage.success(`扫描成功：${result.materialName}`)
    }

    /**
     * 处理扫描错误
     * @param {Error} error - 错误信息
     */
    const handleScanError = (error) => {
      console.error('扫描错误:', error)
      ElMessage.error('扫描失败：' + error.message)
    }

    /**
     * 处理摄像头就绪
     */
    const handleCameraReady = () => {
      hasCamera.value = true
    }

    /**
     * 处理摄像头错误
     * @param {Error} error - 错误信息
     */
    const handleCameraError = (error) => {
      hasCamera.value = false
      console.error('扫描装置错误:', error)
    }

    /**
     * 导出扫描结果
     * 将扫描结果导出为CSV文件
     */
    const exportResults = () => {
      if (scanResults.value.length === 0) {
        ElMessage.warning('没有可导出的数据')
        return
      }

      try {
        // 构建CSV内容
        const headers = ['序号', '物料编码', '物料名称', '批次号', '数量', '单位', '扫描时间']
        const csvContent = [
          headers.join(','),
          ...scanResults.value.map((item, index) => [
            index + 1,
            item.materialCode,
            `"${item.materialName}"`,
            item.batchNumber,
            item.quantity,
            item.unit,
            formatTime(item.scanTime)
          ].join(','))
        ].join('\n')

        // 创建下载链接
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        
        link.setAttribute('href', url)
        link.setAttribute('download', `扫描结果_${new Date().toISOString().slice(0, 10)}.csv`)
        link.style.visibility = 'hidden'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        ElMessage.success('导出成功')
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败：' + error.message)
      }
    }

    /**
     * 清空扫描结果
     */
    const clearResults = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清空所有扫描结果吗？此操作不可恢复。',
          '确认清空',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        scanResults.value = []
        ElMessage.success('已清空扫描结果')
      } catch {
        // 用户取消操作
      }
    }

    /**
     * 删除单个扫描结果
     * @param {number} index - 要删除的结果索引
     */
    const removeResult = (index) => {
      scanResults.value.splice(index, 1)
      ElMessage.success('已删除该条记录')
    }

    /**
     * 重新检测摄像头（仅用于按钮点击）
     * 只在用户主动点击时进行检测，避免与组件内部检测冲突
     */
    const recheckCamera = async () => {
      checkingCamera.value = true
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          hasCamera.value = false
          ElMessage.warning('当前浏览器不支持摄像头功能')
          return
        }

        // 请求权限并检测设备
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(track => track.stop())
          
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          
          hasCamera.value = videoDevices.length > 0
          
          if (hasCamera.value) {
            ElMessage.success(`检测到 ${videoDevices.length} 个扫描设备`)
          } else {
            ElMessageBox.alert(
              '<div style="text-align: center;"><h3 style="color: #E6A23C; font-size: 18px; margin-bottom: 15px;">⚠️ 未检测到扫描设备</h3></div><br>请检查以下几点：<br><br>1. 确保扫描装置已正确连接<br>2. 检查设备驱动是否正常<br>3. 确认其他应用程序未占用扫描设备<br>4. 尝试重新插拔扫描装置<br>5. 重启浏览器或电脑',
              '扫描装置检测失败',
              {
                confirmButtonText: '确定',
                type: 'warning',
                dangerouslyUseHTMLString: true
              }
            )
          }
        } catch (error) {
          hasCamera.value = false
          if (error.name === 'NotAllowedError') {
            ElMessage.error('权限被拒绝，请允许访问扫描设备')
          } else if (error.name === 'NotFoundError') {
            ElMessageBox.alert(
              '<div style="text-align: center;"><h3 style="color: #E6A23C; font-size: 18px; margin-bottom: 15px;">⚠️ 未检测到扫描设备</h3></div><br>请检查以下几点：<br><br>1. 确保扫描设备已正确连接<br>2. 检查驱动是否正常<br>3. 确认其他应用程序未占用扫描设备<br>4. 尝试重新插拔扫描装置<br>5. 重启浏览器或电脑',
              '扫描设备检测失败',
              {
                confirmButtonText: '确定',
                type: 'warning',
                dangerouslyUseHTMLString: true
              }
            )
          } else {
            ElMessage.error('检测扫描装置失败：' + error.message)
          }
        }
      } catch (error) {
        hasCamera.value = false
        ElMessage.error('检测扫描装置失败：' + error.message)
      } finally {
        checkingCamera.value = false
      }
    }

    /**
     * 格式化时间
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的时间字符串
     */
    const formatTime = (date) => {
      if (!date) return ''
      return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    // 组件挂载时不再自动检测摄像头，由QrCodeScanner组件内部处理
    onMounted(() => {
      // checkCameraDevice() // 注释掉自动检测，避免与QrCodeScanner组件重复
    })

    return {
      scannerRef,
      scanResults,
      hasCamera,
      checkingCamera,
      checkCameraDevice,
      recheckCamera,
      handleScanSuccess,
      handleScanError,
      handleCameraReady,
      handleCameraError,
      exportResults,
      clearResults,
      removeResult,
      formatTime
    }
  }
}
</script>

<style scoped>
.qr-scan-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
  text-align: center;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.device-alert {
  margin-bottom: 20px;
}

.alert-content {
  line-height: 1.6;
}

.solution-list ul {
  margin: 8px 0;
  padding-left: 20px;
}

.solution-list li {
  margin: 4px 0;
}

.scan-section {
  margin-bottom: 20px;
}

.scan-card {
  min-height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.results-section {
  margin-bottom: 20px;
}

.help-section {
  margin-bottom: 20px;
}

.help-content h4 {
  margin: 16px 0 8px 0;
  color: #303133;
}

.help-content ul,
.help-content ol {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 4px 0;
  line-height: 1.5;
}

.help-content strong {
  color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .qr-scan-page {
    padding: 10px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>