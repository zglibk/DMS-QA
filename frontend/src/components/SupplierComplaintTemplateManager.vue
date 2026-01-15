<template>
  <div class="template-manager-container">
    <!-- 左侧：模板列表 -->
    <div class="left-panel" :class="{ 'collapsed': rightPanelVisible && isMobile }">
      <div class="panel-header">
        <h3>投诉书模板</h3>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">上传</span>
          </el-button>
          <el-button size="small" @click="loadTemplates" :loading="loading">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="template-list" v-loading="loading">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="template-item"
          :class="{ 'active': selectedTemplate?.id === tpl.id }"
          @click="handleSelectTemplate(tpl)"
        >
          <div class="item-main">
            <div class="item-icon">
              <el-icon :size="20"><Document /></el-icon>
            </div>
            <div class="item-info">
              <div class="item-name">
                {{ tpl.templateName }}
                <el-tag v-if="tpl.isDefault" type="success" size="small">默认</el-tag>
              </div>
              <div class="item-meta">
                <span>{{ formatTime(tpl.updateTime) }}</span>
                <el-tag v-if="tpl.mapping?.fields?.length" type="success" size="small">{{ tpl.mapping.fields.length }}字段</el-tag>
                <el-tag v-else type="info" size="small">未配置</el-tag>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && templates.length === 0" description="暂无模板" :image-size="60">
          <el-button type="primary" size="small" @click="handleAdd">上传模板</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 右侧：详情与映射配置 -->
    <div class="right-panel" :class="{ 'visible': rightPanelVisible }">
      <div class="mobile-back" v-if="isMobile && rightPanelVisible" @click="rightPanelVisible = false">
        <el-icon><ArrowLeft /></el-icon> 返回
      </div>

      <div v-if="!selectedTemplate" class="empty-state">
        <el-icon :size="48" color="#c0c4cc"><Document /></el-icon>
        <p>请从左侧选择模板</p>
      </div>

      <template v-else>
        <!-- 模板信息头部 -->
        <div class="detail-header">
          <div class="detail-title">
            <h3>{{ selectedTemplate.templateName }}</h3>
            <div class="detail-actions">
              <el-button size="small" @click="handleEdit"><el-icon><Edit /></el-icon> 编辑</el-button>
              <el-button size="small" @click="handleDownload"><el-icon><Download /></el-icon> 下载</el-button>
              <el-button size="small" type="danger" @click="handleDelete"><el-icon><Delete /></el-icon> 删除</el-button>
            </div>
          </div>
          <div class="detail-meta">
            <div class="meta-row">
              <span class="meta-item"><strong>文件名：</strong>{{ selectedTemplate.fileName }}</span>
              <span class="meta-item">
                <strong>状态：</strong>
                <el-switch v-model="selectedTemplate.enabled" size="small" @change="handleStatusChange" />
              </span>
              <span class="meta-item">
                <strong>默认：</strong>
                <el-switch v-model="selectedTemplate.isDefault" size="small" :disabled="!selectedTemplate.enabled" @change="handleSetDefault" />
              </span>
              <span class="meta-item"><strong>映射：</strong>{{ selectedTemplate.mapping?.fields?.length || 0 }} 个字段</span>
            </div>
          </div>
        </div>

        <!-- 映射配置区域：左右布局 -->
        <div class="mapping-section">
          <div class="section-header">
            <h4><el-icon><Connection /></el-icon> 字段映射配置</h4>
            <div class="section-actions">
              <el-button size="small" @click="handleRefreshPreview" :loading="parseLoading">
                <el-icon><Refresh /></el-icon> 刷新
              </el-button>
              <el-button size="small" type="warning" @click="handleTestFill" :disabled="!mappingData.fields.length">
                <el-icon><View /></el-icon> 测试
              </el-button>
              <el-button size="small" type="success" @click="handleSaveMapping" :loading="saveLoading">
                <el-icon><Check /></el-icon> 保存
              </el-button>
            </div>
          </div>

          <div class="mapping-body" v-loading="parseLoading">
            <!-- 左侧：模板预览（占主要空间） -->
            <div class="preview-panel">
              <div class="panel-title">
                <span>模板预览</span>
                <el-tag v-if="bindingMode" type="warning" size="small">点击绑定：{{ currentBindingField?.label }}</el-tag>
                <el-button v-if="bindingMode" size="small" link @click="cancelBinding">取消</el-button>
              </div>
              <div class="preview-wrapper" ref="previewWrapper">
                <div class="preview-content" v-html="previewHtml" @click="handleCellClick" />
                <el-empty v-if="!previewHtml && !parseLoading" description="点击刷新加载" :image-size="40" />
              </div>
            </div>

            <!-- 右侧：字段列表（紧凑型） -->
            <div class="fields-panel">
              <div class="panel-title">
                <span>可用字段</span>
                <el-tag size="small" type="success">{{ mappingData.fields.length }} 已配置</el-tag>
              </div>
              
              <div class="fields-toolbar">
                <el-input v-model="fieldSearchKeyword" placeholder="搜索..." size="small" clearable :prefix-icon="Search" />
                <el-select v-model="fieldCategoryFilter" placeholder="分类" size="small" clearable>
                  <el-option v-for="cat in fieldCategories" :key="cat" :label="cat" :value="cat" />
                </el-select>
              </div>

              <div class="fields-list">
                <div
                  v-for="field in filteredFields"
                  :key="field.name"
                  class="field-item"
                  :class="{ 'is-mapped': isFieldMapped(field.name), 'is-binding': bindingMode && currentBindingField?.name === field.name }"
                  @click="handleFieldClick(field)"
                >
                  <div class="field-main">
                    <span class="field-label">{{ field.label }}</span>
                    <el-tag v-if="getFieldCell(field.name)" size="small" type="success">{{ getFieldCell(field.name) }}</el-tag>
                  </div>
                  <el-button v-if="isFieldMapped(field.name)" type="danger" size="small" link @click.stop="removeFieldBinding(field.name)">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
                <el-empty v-if="filteredFields.length === 0" description="无匹配" :image-size="30" />
              </div>

              <!-- 已配置映射快速查看 -->
              <div class="mappings-summary" v-if="mappingData.fields.length > 0">
                <div class="summary-header">
                  <span>已配置 ({{ mappingData.fields.length }})</span>
                  <el-button type="danger" size="small" link @click="handleClearAllMappings">清空</el-button>
                </div>
                <div class="summary-list">
                  <div v-for="(item, idx) in mappingData.fields" :key="idx" class="summary-item">
                    <span>{{ item.cell }} → {{ item.label || item.fieldName }}</span>
                    <el-button type="danger" size="small" link @click="removeMapping(idx)"><el-icon><Close /></el-icon></el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 上传/编辑对话框 -->
    <el-dialog v-model="formVisible" :title="formMode === 'add' ? '上传模板' : '编辑模板'" width="480px" :close-on-click-modal="false" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="模板文件" :required="formMode === 'add'">
          <el-upload ref="uploadRef" :auto-upload="false" :limit="1" :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleExceed" accept=".xlsx,.xls" :file-list="fileList" drag>
            <el-icon class="el-icon--upload"><Upload /></el-icon>
            <div class="el-upload__text">拖拽或<em>点击上传</em></div>
            <template #tip><div class="el-upload__tip">支持 .xlsx/.xls，最大 10MB</div></template>
          </el-upload>
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">{{ formMode === 'add' ? '上传' : '保存' }}</el-button>
      </template>
    </el-dialog>

    <!-- 测试填充对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试填充" width="800px" append-to-body :close-on-click-modal="false">
      <el-form label-width="100px" size="small">
        <el-row :gutter="20">
          <el-col :span="12" v-for="item in mappingData.fields" :key="item.fieldName">
            <el-form-item :label="getFieldLabel(item.fieldName)">
              <el-input v-model="testData[item.fieldName]" :placeholder="item.fieldName" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeTestFill" :loading="testLoading">执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Document, Edit, Download, Delete, Connection, View, Check, Search, ArrowLeft, Upload, Close } from '@element-plus/icons-vue'
import api from '@/services/api'

const emit = defineEmits(['template-change'])

const loading = ref(false)
const templates = ref([])
const selectedTemplate = ref(null)
const rightPanelVisible = ref(false)
const isMobile = ref(false)

const formVisible = ref(false)
const formMode = ref('add')
const formRef = ref(null)
const submitLoading = ref(false)
const fileList = ref([])
const currentFile = ref(null)

const form = reactive({ id: null, templateName: '', description: '', isDefault: false })
const rules = { templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }] }

const parseLoading = ref(false)
const saveLoading = ref(false)
const previewHtml = ref('')
const previewWrapper = ref(null)
const availableFields = ref([])
const fieldSearchKeyword = ref('')
const fieldCategoryFilter = ref('')
const mappingData = reactive({ fields: [], layout: { sheetIndex: 0 } })

const bindingMode = ref(false)
const currentBindingField = ref(null)

const testDialogVisible = ref(false)
const testLoading = ref(false)
const testData = reactive({})

const fieldCategories = computed(() => Array.from(new Set(availableFields.value.map(f => f.category))))

const filteredFields = computed(() => {
  let result = availableFields.value
  if (fieldCategoryFilter.value) result = result.filter(f => f.category === fieldCategoryFilter.value)
  if (fieldSearchKeyword.value) {
    const kw = fieldSearchKeyword.value.toLowerCase()
    result = result.filter(f => f.label.toLowerCase().includes(kw) || f.name.toLowerCase().includes(kw))
  }
  return result
})

const checkMobile = () => { isMobile.value = window.innerWidth < 768 }

onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile); loadTemplates() })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await api.get('/supplier-complaint-templates')
    if (res.data.code === 0) {
      templates.value = res.data.data || []
      if (selectedTemplate.value) {
        const updated = templates.value.find(t => t.id === selectedTemplate.value.id)
        if (updated) selectedTemplate.value = updated
        else { selectedTemplate.value = null; rightPanelVisible.value = false }
      }
    }
  } catch (e) { console.error(e); ElMessage.error('加载失败') }
  finally { loading.value = false }
}

const formatTime = (t) => t ? new Date(t).toLocaleDateString('zh-CN') : '-'

const handleSelectTemplate = async (tpl) => {
  selectedTemplate.value = tpl
  rightPanelVisible.value = true
  previewHtml.value = ''
  mappingData.fields = tpl.mapping?.fields || []
  mappingData.layout = tpl.mapping?.layout || { sheetIndex: 0 }
  await parseTemplate()
}

const parseTemplate = async () => {
  if (!selectedTemplate.value) return
  parseLoading.value = true
  try {
    const res = await api.post(`/supplier-complaint-templates/${selectedTemplate.value.id}/parse`)
    if (res.data.code === 0) {
      const d = res.data.data
      previewHtml.value = d.previewHtml
      availableFields.value = d.availableFields || []
      if (d.mapping?.fields) { mappingData.fields = d.mapping.fields; mappingData.layout = d.mapping.layout || { sheetIndex: 0 } }
      await nextTick()
      updatePreviewMappings()
    }
  } catch (e) { console.error(e); ElMessage.error('解析失败') }
  finally { parseLoading.value = false }
}

const handleRefreshPreview = () => parseTemplate()

const isFieldMapped = (n) => mappingData.fields.some(f => f.fieldName === n)
const getFieldCell = (n) => { const m = mappingData.fields.find(f => f.fieldName === n); return m ? m.cell : null }
const getFieldLabel = (n) => { const f = availableFields.value.find(x => x.name === n); return f ? f.label : n }

const handleFieldClick = (field) => { if (bindingMode.value && currentBindingField.value?.name === field.name) cancelBinding(); else startBinding(field) }
const startBinding = (field) => { bindingMode.value = true; currentBindingField.value = field; ElMessage.info(`点击预览单元格绑定「${field.label}」`) }
const cancelBinding = () => { bindingMode.value = false; currentBindingField.value = null }

const handleCellClick = (e) => {
  const cell = e.target.closest('[data-cell]')
  if (!cell) return
  const addr = cell.dataset.cell
  if (bindingMode.value && currentBindingField.value) { addMapping(currentBindingField.value, addr); cancelBinding() }
  else { const m = mappingData.fields.find(f => f.cell === addr); if (m) ElMessage.info(`${addr} 已绑定「${getFieldLabel(m.fieldName)}」`) }
}

const addMapping = (field, cell) => {
  const idx = mappingData.fields.findIndex(f => f.fieldName === field.name)
  if (idx !== -1) { mappingData.fields[idx].cell = cell; ElMessage.success(`更新 ${cell} → ${field.label}`) }
  else { mappingData.fields.push({ fieldName: field.name, label: field.label, cell }); ElMessage.success(`绑定 ${cell} → ${field.label}`) }
  updatePreviewMappings()
}

const removeMapping = (idx) => { mappingData.fields.splice(idx, 1); updatePreviewMappings() }
const removeFieldBinding = (n) => { const idx = mappingData.fields.findIndex(f => f.fieldName === n); if (idx !== -1) removeMapping(idx) }
const handleClearAllMappings = async () => { try { await ElMessageBox.confirm('清空全部映射？', '确认', { type: 'warning' }); mappingData.fields = []; updatePreviewMappings() } catch {} }

const updatePreviewMappings = () => {
  nextTick(() => {
    const w = previewWrapper.value; if (!w) return
    w.querySelectorAll('.mapped-cell').forEach(el => el.classList.remove('mapped-cell'))
    mappingData.fields.forEach(item => { const c = w.querySelector(`[data-cell="${item.cell}"]`); if (c) c.classList.add('mapped-cell') })
  })
}

const handleSaveMapping = async () => {
  if (!selectedTemplate.value) return
  saveLoading.value = true
  try {
    const res = await api.post(`/supplier-complaint-templates/${selectedTemplate.value.id}/mapping`, mappingData)
    if (res.data.code === 0) { ElMessage.success('保存成功'); loadTemplates(); emit('template-change') }
    else ElMessage.error(res.data.message || '保存失败')
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
  finally { saveLoading.value = false }
}

const handleTestFill = () => { mappingData.fields.forEach(item => { if (!testData[item.fieldName]) testData[item.fieldName] = `[${getFieldLabel(item.fieldName)}]` }); testDialogVisible.value = true }

const executeTestFill = async () => {
  if (!selectedTemplate.value) return
  testLoading.value = true
  try {
    const res = await api.post(`/supplier-complaint-templates/${selectedTemplate.value.id}/preview`, { testData })
    if (res.data.code === 0) { previewHtml.value = res.data.data.previewHtml; await nextTick(); updatePreviewMappings(); testDialogVisible.value = false; ElMessage.success('填充完成') }
  } catch (e) { console.error(e); ElMessage.error('填充失败') }
  finally { testLoading.value = false }
}

const handleAdd = () => { formMode.value = 'add'; Object.assign(form, { id: null, templateName: '', description: '', isDefault: false }); fileList.value = []; currentFile.value = null; formVisible.value = true }

const handleEdit = () => {
  if (!selectedTemplate.value) return
  formMode.value = 'edit'
  Object.assign(form, { id: selectedTemplate.value.id, templateName: selectedTemplate.value.templateName, description: selectedTemplate.value.description, isDefault: selectedTemplate.value.isDefault })
  fileList.value = []; currentFile.value = null; formVisible.value = true
}

const handleFileChange = (file, fl) => {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls'].includes(ext)) { ElMessage.error('只支持.xlsx/.xls'); fileList.value = []; currentFile.value = null; return }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('文件不超过10MB'); fileList.value = []; currentFile.value = null; return }
  currentFile.value = file.raw; fileList.value = fl
  if (!form.templateName) form.templateName = file.name.replace(/\.(xlsx|xls)$/i, '')
}
const handleFileRemove = () => { currentFile.value = null; fileList.value = [] }
const handleExceed = () => ElMessage.warning('只能上传一个文件')

const handleSubmit = async () => {
  try { await formRef.value.validate() } catch { return }
  if (formMode.value === 'add' && !currentFile.value) { ElMessage.warning('请选择文件'); return }
  submitLoading.value = true
  try {
    const fd = new FormData()
    fd.append('templateName', form.templateName)
    fd.append('description', form.description || '')
    fd.append('isDefault', form.isDefault)
    if (currentFile.value) fd.append('file', currentFile.value)
    const res = formMode.value === 'add' 
      ? await api.post('/supplier-complaint-templates', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      : await api.put(`/supplier-complaint-templates/${form.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code === 0) { ElMessage.success(formMode.value === 'add' ? '上传成功' : '更新成功'); formVisible.value = false; loadTemplates(); emit('template-change') }
    else ElMessage.error(res.data.message || '失败')
  } catch (e) { console.error(e); ElMessage.error('操作失败') }
  finally { submitLoading.value = false }
}

const handleDelete = async () => {
  if (!selectedTemplate.value) return
  try { await ElMessageBox.confirm(`删除「${selectedTemplate.value.templateName}」？`, '确认', { type: 'warning' }) } catch { return }
  try {
    const res = await api.delete(`/supplier-complaint-templates/${selectedTemplate.value.id}`)
    if (res.data.code === 0) { ElMessage.success('删除成功'); selectedTemplate.value = null; rightPanelVisible.value = false; loadTemplates(); emit('template-change') }
  } catch (e) { console.error(e); ElMessage.error('删除失败') }
}

const handleDownload = async () => {
  if (!selectedTemplate.value) return
  try {
    const res = await api.get(`/supplier-complaint-templates/${selectedTemplate.value.id}/download`, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = selectedTemplate.value.fileName
    document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url)
  } catch (e) { console.error(e); ElMessage.error('下载失败') }
}

const handleStatusChange = async () => {
  try {
    const res = await api.put(`/supplier-complaint-templates/${selectedTemplate.value.id}`, { enabled: selectedTemplate.value.enabled })
    if (res.data.code === 0) { ElMessage.success(selectedTemplate.value.enabled ? '已启用' : '已禁用'); loadTemplates() }
  } catch (e) { console.error(e); selectedTemplate.value.enabled = !selectedTemplate.value.enabled }
}

const handleSetDefault = async () => {
  try {
    const res = await api.put(`/supplier-complaint-templates/${selectedTemplate.value.id}`, { isDefault: selectedTemplate.value.isDefault })
    if (res.data.code === 0) { ElMessage.success(selectedTemplate.value.isDefault ? '已设为默认' : '已取消默认'); loadTemplates() }
  } catch (e) { console.error(e); selectedTemplate.value.isDefault = !selectedTemplate.value.isDefault }
}

defineExpose({ loadTemplates })
</script>

<style scoped>
.template-manager-container { display: flex; height: 100%; min-height: 400px; background: #f5f7fa; border-radius: 4px; overflow: hidden; gap: 12px; padding: 12px; }

/* 左侧模板列表 */
.left-panel { width: 300px; min-width: 250px; background: #fff; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
.panel-header { padding: 12px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; }
.panel-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.header-actions { display: flex; gap: 6px; }
.template-list { flex: 1; overflow-y: auto; padding: 6px; }
.template-item { padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-bottom: 6px; border: 1px solid transparent; }
.template-item:hover { background: #f5f7fa; }
.template-item.active { background: #ecf5ff; border-color: #409eff; }
.item-main { display: flex; gap: 10px; }
.item-icon { color: #409eff; flex-shrink: 0; margin-top: 2px; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-weight: 500; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { font-size: 11px; color: #909399; display: flex; align-items: center; gap: 6px; }

/* 右侧面板（中间+右侧字段） */
.right-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.mobile-back { display: none; padding: 10px 12px; border-bottom: 1px solid #ebeef5; cursor: pointer; color: #409eff; font-size: 13px; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; }

/* 详情头部 */
.detail-header { padding: 12px 16px; border-bottom: 1px solid #ebeef5; }
.detail-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.detail-title h3 { margin: 0; font-size: 16px; }
.detail-actions { display: flex; gap: 6px; }
.detail-meta { font-size: 12px; color: #606266; }
.meta-row { display: flex; flex-wrap: wrap; gap: 16px; }
.meta-item { display: flex; align-items: center; gap: 4px; }

/* 映射区域 */
.mapping-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.section-header { padding: 10px 16px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.section-header h4 { margin: 0; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.section-actions { display: flex; gap: 6px; }

/* 映射内容：左右布局 */
.mapping-body { flex: 1; display: flex; overflow: hidden; padding: 12px; gap: 16px; }

/* 预览面板（左侧，占大部分空间） */
.preview-panel { flex: 1; display: flex; flex-direction: column; border: 1px solid #e4e7ed; border-radius: 6px; overflow: hidden; min-width: 0; background: #fff; }
.panel-title { padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #e4e7ed; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.preview-wrapper { flex: 1; overflow: auto; padding: 6px; background: #fff; }

/* 预览表格样式 - 保留原始格式，不覆盖内联样式 */
.preview-content :deep(.template-preview-table) { 
  border-collapse: collapse; 
  table-layout: fixed; 
}
.preview-content :deep(.template-preview-table th), 
.preview-content :deep(.template-preview-table td) { 
  border: 1px solid #d0d0d0; 
  padding: 2px 4px; 
  overflow: hidden; 
  text-overflow: ellipsis;
  box-sizing: border-box;
  /* 不设置 text-align 和 vertical-align，让内联样式生效 */
}
.preview-content :deep(.coord-header) { 
  background: #f0f2f5 !important; 
  color: #606266; 
  font-weight: 600; 
  text-align: center !important; 
  vertical-align: middle !important;
  font-size: 10px;
  position: sticky;
  z-index: 1;
}
.preview-content :deep(.col-header) { 
  top: 0; 
  position: sticky;
}
.preview-content :deep(.row-header) { 
  left: 0; 
  position: sticky;
}
.preview-content :deep(.template-cell) { 
  cursor: pointer; 
  transition: outline 0.15s, box-shadow 0.15s;
  position: relative;
  /* 内联样式会覆盖这里的对齐设置 */
}
.preview-content :deep(.template-cell:hover) { 
  outline: 2px solid #409eff;
  box-shadow: inset 0 0 0 1px #409eff;
  z-index: 2;
}
.preview-content :deep(.mapped-cell) { 
  outline: 2px solid #67c23a !important;
  box-shadow: inset 0 0 0 1px #67c23a !important;
}
.preview-content :deep(.mapped-cell::before) { 
  content: '✓'; 
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 9px; 
  color: #67c23a;
  font-weight: bold;
  background: rgba(255,255,255,0.8);
  border-radius: 2px;
  padding: 0 2px;
  line-height: 1;
}
.preview-content :deep(.filled-cell) { 
  background-color: #fef0f0 !important; 
  color: #f56c6c !important; 
}

/* 字段面板（右侧，固定宽度） */
.fields-panel { width: 320px; min-width: 280px; display: flex; flex-direction: column; border: 1px solid #e4e7ed; border-radius: 6px; overflow: hidden; background: #fff; }
.fields-toolbar { padding: 8px; border-bottom: 1px solid #ebeef5; display: flex; gap: 6px; flex-shrink: 0; }
.fields-toolbar .el-input { flex: 1; }
.fields-toolbar .el-select { width: 80px; }
.fields-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
.field-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; font-size: 12px; }
.field-item:hover { background: #f5f7fa; }
.field-item.is-mapped { background: #f0f9eb; }
.field-item.is-binding { background: #fef0f0; border: 1px solid #f56c6c; }
.field-main { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.field-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 已配置映射摘要 */
.mappings-summary { border-top: 1px solid #ebeef5; flex-shrink: 0; max-height: 150px; display: flex; flex-direction: column; }
.summary-header { padding: 6px 10px; background: #fafafa; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 500; }
.summary-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
.summary-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; font-size: 11px; color: #606266; border-radius: 3px; }
.summary-item:hover { background: #f5f7fa; }

/* 表单 */
:deep(.el-upload-dragger) { width: 100%; padding: 15px; }
:deep(.el-icon--upload) { font-size: 32px; color: #c0c4cc; margin-bottom: 6px; }

/* 移动端 */
@media (max-width: 900px) {
  .mapping-body { flex-direction: column; }
  .fields-panel { width: 100%; min-width: unset; max-height: 200px; }
}

@media (max-width: 768px) {
  .template-manager-container { flex-direction: column; position: relative; }
  .left-panel { width: 100%; min-width: unset; height: 100%; }
  .left-panel.collapsed { display: none; }
  .right-panel { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; display: none; }
  .right-panel.visible { display: flex; }
  .mobile-back { display: flex; align-items: center; gap: 4px; }
  .btn-text { display: none; }
  .detail-title { flex-direction: column; align-items: flex-start; }
  .mapping-body { padding: 8px; }
}
</style>
