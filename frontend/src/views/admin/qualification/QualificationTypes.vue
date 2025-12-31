<template>
  <div class="qualification-types-page">
    <div class="page-header">
      <div class="header-left">
        <h2>资质类型配置</h2>
        <p class="desc">配置系统中的专业能力资质类型</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增资质类型</el-button>
      </div>
    </div>

    <!-- 资质类型列表 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" stripe border row-key="id">
        <el-table-column prop="categoryName" label="类别" width="100" />
        <el-table-column prop="typeCode" label="代码" width="120" />
        <el-table-column prop="typeName" label="资质名称" width="140" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="requiresTest" label="需考核" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.requiresTest ? 'success' : 'info'" size="small">
              {{ row.requiresTest ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="testType" label="考核类型" width="100" />
        <el-table-column prop="validityPeriod" label="有效期(月)" width="95" align="center">
          <template #default="{ row }">
            {{ row.validityPeriod === 0 ? '长期' : row.validityPeriod }}
          </template>
        </el-table-column>
        <el-table-column prop="certLevels" label="认证等级" width="140" show-overflow-tooltip />
        <el-table-column prop="isActive" label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑资质类型' : '新增资质类型'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类别代码" prop="categoryCode">
              <el-select v-model="form.categoryCode" placeholder="选择类别" @change="handleCategoryChange" style="width: 100%;">
                <el-option label="PRODUCTION - 生产技能" value="PRODUCTION" />
                <el-option label="QC - 质量检验" value="QC" />
                <el-option label="QM - 质量管理" value="QM" />
                <el-option label="SPECIAL - 专项能力" value="SPECIAL" />
                <el-option label="LAB - 实验检测" value="LAB" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类别名称">
              <el-input v-model="form.categoryName" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="资质代码" prop="typeCode">
              <el-input v-model="form.typeCode" placeholder="如: PRINTER, FQC" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资质名称" prop="typeName">
              <el-input v-model="form.typeName" placeholder="如: 印刷工, 全检员" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="资质描述" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="需要考核">
              <el-switch v-model="form.requiresTest" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="考核类型">
              <el-select v-model="form.testType" placeholder="选择" style="width: 100%;" :disabled="!form.requiresTest">
                <el-option label="笔试" value="WRITTEN" />
                <el-option label="实操" value="PRACTICAL" />
                <el-option label="FM100" value="FM100" />
                <el-option label="在线" value="ONLINE" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="有效期(月)">
              <el-input-number v-model="form.validityPeriod" :min="0" :max="120" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="认证等级">
              <el-input v-model="form.certLevels" placeholder="多个等级用逗号分隔，如: 初级,中级,高级" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'

const tableData = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive({
  id: null, categoryCode: '', categoryName: '', typeCode: '', typeName: '',
  description: '', requiresTest: true, testType: 'PRACTICAL',
  validityPeriod: 12, certLevels: '', sortOrder: 0, isActive: true
})

const rules = {
  categoryCode: [{ required: true, message: '请选择类别', trigger: 'change' }],
  typeCode: [{ required: true, message: '请输入资质代码', trigger: 'blur' }],
  typeName: [{ required: true, message: '请输入资质名称', trigger: 'blur' }]
}

const categoryMap = {
  PRODUCTION: '生产技能', QC: '质量检验', QM: '质量管理', SPECIAL: '专项能力', LAB: '实验检测'
}

onMounted(() => fetchData())

const fetchData = async () => {
  try {
    loading.value = true
    const res = await apiService.get('/qualification/types')
    if (res.data.success) tableData.value = res.data.data || []
  } catch (e) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleCategoryChange = (val) => {
  form.categoryName = categoryMap[val] || ''
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null, categoryCode: '', categoryName: '', typeCode: '', typeName: '',
    description: '', requiresTest: true, testType: 'PRACTICAL',
    validityPeriod: 12, certLevels: '初级,中级,高级', sortOrder: 0, isActive: true
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    await apiService.post('/qualification/types', form)
    ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    if (e !== false) ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该资质类型吗？删除后相关认证记录也会受影响。', '提示', { type: 'warning' })
    // 软删除 - 设置为不启用
    await apiService.post('/qualification/types', { ...row, isActive: false })
    ElMessage.success('已禁用')
    fetchData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}
</script>

<style scoped>
.qualification-types-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 6px; font-size: 20px; color: #303133; }
.page-header .desc { margin: 0; font-size: 13px; color: #909399; }
</style>
