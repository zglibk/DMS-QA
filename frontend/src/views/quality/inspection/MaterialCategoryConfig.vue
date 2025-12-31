<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 20px;">物料分类映射配置</span>
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="card">
                <el-icon><Grid /></el-icon> 卡片视图
              </el-radio-button>
              <el-radio-button label="table">
                <el-icon><Menu /></el-icon> 表格视图
              </el-radio-button>
              <el-radio-button label="tabs">
                <el-icon><Files /></el-icon> 标签页视图
              </el-radio-button>
            </el-radio-group>
          </div>
          <el-button type="primary" :icon="Plus" @click="handleAddCategory">新增报告分类</el-button>
        </div>
      </template>

      <div v-loading="loading">
        <el-empty v-if="list.length === 0" description="暂无配置" />
        
        <!-- Card View -->
        <el-row v-if="viewMode === 'card'" :gutter="20">
          <el-col 
            v-for="(subCategories, category) in groupedMappings" 
            :key="category" 
            :xs="24" :sm="24" :md="12" :lg="12" :xl="8"
            style="margin-bottom: 20px;"
          >
            <el-card shadow="hover">
              <template #header>
                <div class="category-header">
                  <span style="font-weight: bold; font-size: 16px;">{{ category }}</span>
                  <div>
                    <el-button type="primary" link :icon="Edit" @click="handleEditCategory(category)">重命名</el-button>
                  </div>
                </div>
              </template>
              <CategoryTags 
                :category="category" 
                :items="subCategories" 
                @delete="handleDeleteMapping" 
                @add="handleInputConfirm" 
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- Table View -->
        <el-table v-if="viewMode === 'table'" :data="tableData" border style="width: 100%">
            <el-table-column prop="category" label="报告分类" width="180">
                <template #default="{ row }">
                    <span style="font-weight: bold;">{{ row.category }}</span>
                    <el-button type="primary" link :icon="Edit" size="small" @click="handleEditCategory(row.category)" style="margin-left: 10px;"></el-button>
                </template>
            </el-table-column>
            <el-table-column label="ERP物料类型映射">
                <template #default="{ row }">
                    <CategoryTags 
                        :category="row.category" 
                        :items="row.items" 
                        @delete="handleDeleteMapping" 
                        @add="handleInputConfirm" 
                    />
                </template>
            </el-table-column>
        </el-table>

        <!-- Tabs View -->
        <el-tabs v-if="viewMode === 'tabs'" type="border-card">
            <el-tab-pane v-for="(subCategories, category) in groupedMappings" :key="category" :label="category">
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                    <span style="font-weight: bold; font-size: 16px;">{{ category }} 分类下的ERP物料类型：</span>
                    <el-button type="primary" link :icon="Edit" @click="handleEditCategory(category)">重命名当前分类</el-button>
                </div>
                <CategoryTags 
                    :category="category" 
                    :items="subCategories" 
                    @delete="handleDeleteMapping" 
                    @add="handleInputConfirm" 
                />
            </el-tab-pane>
        </el-tabs>

      </div>
    </el-card>

    <!-- Dialog for New/Edit Category -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
        <el-form :model="form" label-width="120px">
            <el-form-item label="分类名称">
                <el-input v-model="form.categoryName" placeholder="请输入报告端分类名称" />
            </el-form-item>
            <el-form-item label="初始物料类型" v-if="dialogMode === 'create'">
                <el-input v-model="form.initialSub" placeholder="请输入一个ERP物料类型" />
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitDialog">确定</el-button>
            </span>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, h } from 'vue'
import { getCategoryMappings, addCategoryMapping, deleteCategoryMapping, updateCategoryMapping } from '@/api/categoryConfig'
import { ElMessage, ElMessageBox, ElTag, ElInput, ElButton } from 'element-plus'
import { Plus, Edit, Delete, Grid, Menu, Files } from '@element-plus/icons-vue'
import CategoryTags from './components/CategoryTags.vue'

const loading = ref(false)
const list = ref([])
const viewMode = ref('card') // card, table, tabs

const groupedMappings = computed(() => {
    const groups = {}
    list.value.forEach(item => {
        if (!groups[item.ReportCategory]) {
            groups[item.ReportCategory] = []
        }
        groups[item.ReportCategory].push(item)
    })
    return groups
})

const tableData = computed(() => {
    return Object.keys(groupedMappings.value).map(cat => ({
        category: cat,
        items: groupedMappings.value[cat]
    }))
})

const getList = async () => {
    loading.value = true
    try {
        const res = await getCategoryMappings()
        list.value = res.data
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    getList()
})

const handleInputConfirm = async (category, val) => {
    if (val) {
        try {
            await addCategoryMapping({
                ReportCategory: category,
                ERPSubCategory: val
            })
            ElMessage.success('添加成功')
            await getList()
        } catch (e) {
            console.error(e)
        }
    }
}

const handleDeleteMapping = (item) => {
    ElMessageBox.confirm(`确定删除 "${item.ERPSubCategory}" 吗？`, '提示', { type: 'warning' })
        .then(async () => {
            await deleteCategoryMapping(item.ID)
            ElMessage.success('删除成功')
            getList()
        })
}

// Category Dialog Logic
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogMode = ref('create') // create, edit
const form = reactive({
    categoryName: '',
    initialSub: '',
    oldCategoryName: ''
})

const handleAddCategory = () => {
    dialogMode.value = 'create'
    dialogTitle.value = '新增报告分类'
    form.categoryName = ''
    form.initialSub = ''
    dialogVisible.value = true
}

const handleEditCategory = (category) => {
    dialogMode.value = 'edit'
    dialogTitle.value = '重命名分类'
    form.categoryName = category
    form.oldCategoryName = category
    dialogVisible.value = true
}

const submitDialog = async () => {
    if (!form.categoryName) return ElMessage.warning('请输入分类名称')
    
    if (dialogMode.value === 'create') {
        if (!form.initialSub) return ElMessage.warning('请输入初始物料类型')
        try {
            await addCategoryMapping({
                ReportCategory: form.categoryName,
                ERPSubCategory: form.initialSub
            })
            ElMessage.success('创建成功')
            dialogVisible.value = false
            getList()
        } catch (e) { console.error(e) }
    } else {
        const itemsToUpdate = list.value.filter(i => i.ReportCategory === form.oldCategoryName)
        try {
            for (const item of itemsToUpdate) {
                await updateCategoryMapping(item.ID, {
                    ReportCategory: form.categoryName,
                    ERPSubCategory: item.ERPSubCategory
                })
            }
            ElMessage.success('更新成功')
            dialogVisible.value = false
            getList()
        } catch (e) { console.error(e) }
    }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.input-new-tag {
  width: 120px;
  margin-right: 10px;
  vertical-align: bottom;
}
.button-new-tag {
  margin-right: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
