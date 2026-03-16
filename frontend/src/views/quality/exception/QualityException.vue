<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>品质异常联络单</span>
          <el-button type="primary" @click="handleAdd" v-permission="['quality:exception:add']">
            <el-icon class="el-icon--left"><Plus /></el-icon>新增异常联络单
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-container" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <el-form :inline="true" :model="queryParams" class="demo-form-inline">
          <el-form-item label="关键词">
            <el-input 
              v-model="queryParams.keyword" 
              placeholder="单号/产品/物料/描述" 
              clearable 
              @keyup.enter="handleSearch"
              @clear="handleSearch"
              @change="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="状态">
            <el-select 
              v-model="queryParams.status" 
              placeholder="状态" 
              clearable 
              style="width: 160px"
              @change="handleSearch"
              @clear="handleSearch"
            >
              <el-option label="进行中 (Open)" value="Open" />
              <el-option label="已关闭 (Closed)" value="Closed" />
            </el-select>
          </el-form-item>
          <el-form-item label="填报日期">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleDateChange"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon class="el-icon--left"><Search /></el-icon>查询
            </el-button>
            <el-button @click="resetQuery">
              <el-icon class="el-icon--left"><Refresh /></el-icon>重置
            </el-button>
          </el-form-item>
        </el-form>
        
        <div>
          <el-button type="success" @click="handleBatchGenerateNotice" :disabled="selectedRows.length !== 1" :title="selectedRows.length > 1 ? '生成考核通知只能单选' : ''" v-permission="['quality:exception:generate-notice']">
            <el-icon class="el-icon--left"><Document /></el-icon>生成考核通知
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0" v-permission="['quality:exception:delete']">
            <el-icon class="el-icon--left"><Delete /></el-icon>批量删除
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table 
        ref="tableRef"
        v-loading="loading" 
        :data="tableData" 
        style="width: 100%" 
        border 
        stripe 
        header-cell-class-name="table-header-center"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" fixed />
        <el-table-column type="index" label="序号" width="60" fixed align="center" header-align="center" />
        <el-table-column prop="ExceptionNumber" label="异常联络单号" width="140" fixed align="center" header-align="center" />
        <el-table-column prop="ReportDate" label="填报日期" width="120" align="center" header-align="center">
          <template #default="scope">{{ formatDate(scope.row.ReportDate) }}</template>
        </el-table-column>
        <el-table-column prop="ProductName" label="产品名称" min-width="180" show-overflow-tooltip header-align="center" />
        <el-table-column prop="MaterialCode" label="物料编码" min-width="150" show-overflow-tooltip align="center" header-align="center" />
        <el-table-column prop="CustomerCode" label="客户" width="100" align="center" header-align="center" />
        <el-table-column prop="DiscoveryStage" label="发现阶段" width="100" align="center" header-align="center">
          <template #default="scope">
            <el-tag>{{ getDiscoveryStageLabel(scope.row.DiscoveryStage) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ExceptionQuantity" label="异常数量" width="100" align="center" header-align="center" />
        <el-table-column prop="ResponsibleDepartment" label="责任部门" width="120" align="center" header-align="center" />
        <el-table-column prop="Status" label="状态" width="100" align="center" header-align="center">
          <template #default="scope">
            <el-tag :type="scope.row.Status === 'Closed' ? 'success' : 'warning'">{{ scope.row.Status === 'Closed' ? '已关闭' : '进行中' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="100" fixed="right" align="center" header-align="center">
          <template #default="scope">
            <div style="display: flex; justify-content: center; gap: 8px;">
              <el-button link type="primary" size="small" style="padding: 0; margin: 0; font-size: 13px;" @click="handleEdit(scope.row)" v-permission="['quality:exception:edit']">
                <el-icon style="margin-right: 2px"><Edit /></el-icon>编辑
              </el-button>
              <el-button link type="danger" size="small" style="padding: 0; margin: 0; font-size: 13px;" @click="handleDelete(scope.row)" v-permission="['quality:exception:delete']">
                <el-icon style="margin-right: 2px"><Delete /></el-icon>删除
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" :image-size="100" />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, ->, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="40%" 
      align-center 
      destroy-on-close 
      :close-on-click-modal="false" 
      :close-on-press-escape="false" 
      class="custom-dialog"
    >
      <div class="dialog-content">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="异常编号">
                <el-input v-model="form.ExceptionNumber" placeholder="自动生成" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="填报日期" prop="ReportDate">
                <el-date-picker v-model="form.ReportDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="填报人" prop="Reporter">
                <el-input v-model="form.Reporter" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="工单号" prop="WorkOrderNum">
                <el-input 
                  v-model="form.WorkOrderNum" 
                  @change="handleWorkOrderChange" 
                  placeholder="输入工单号回车或失焦查询"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                  <template #suffix>
                    <el-icon v-if="workOrderLoading" class="is-loading"><Loading /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="16">
              <el-form-item label="产品名称" prop="ProductName">
                 <el-autocomplete
                    v-model="form.ProductName"
                    :fetch-suggestions="querySearchProduct"
                    placeholder="请输入产品名称"
                    @select="handleSelectProduct"
                    style="width: 100%"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-autocomplete>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="物料编码" prop="MaterialCode">
                <el-input v-model="form.MaterialCode" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="型号/规格" prop="ModelSpec">
                <el-input v-model="form.ModelSpec" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="客户编码" prop="CustomerCode">
                <el-input v-model="form.CustomerCode" @input="val => form.CustomerCode = val.toUpperCase()" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
               <el-form-item label="发现阶段" prop="DiscoveryStage">
                <el-select v-model="form.DiscoveryStage" placeholder="请选择" style="width: 100%">
                  <el-option label="来料 (Incoming)" value="Incoming" />
                  <el-option label="制程 (Process)" value="Process" />
                  <el-option label="成品 (Finished)" value="Finished" />
                  <el-option label="出货 (Shipment)" value="Shipment" />
                  <el-option label="客户端 (Client)" value="Client" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="生产数量" prop="ProductionQuantity">
                <el-input-number v-model="form.ProductionQuantity" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="异常数量" prop="ExceptionQuantity">
                <el-input-number v-model="form.ExceptionQuantity" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="责任部门" prop="ResponsibleDepartment">
                 <el-select v-model="form.ResponsibleDepartment" placeholder="请选择" filterable style="width: 100%">
                  <el-option v-for="dept in departmentOptions" :key="dept.ID" :label="dept.Name" :value="dept.Name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="责任人" prop="ResponsiblePerson">
                <el-select v-model="form.ResponsiblePerson" placeholder="请选择责任人" filterable style="width: 100%">
                  <el-option
                    v-for="person in personList"
                    :key="person.ID"
                    :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                    :value="person.Name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="异常描述" prop="Description">
            <el-input v-model="form.Description" type="textarea" :rows="3" />
          </el-form-item>

          <el-form-item label="初步原因分析" prop="PreliminaryCause">
            <el-input v-model="form.PreliminaryCause" type="textarea" :rows="3" />
          </el-form-item>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="处理方式" prop="HandlingMethod">
                <el-select v-model="form.HandlingMethod" placeholder="请选择" style="width: 100%">
                  <el-option label="返工 (Rework)" value="Rework" />
                  <el-option label="返修 (Repair)" value="Repair" />
                  <el-option label="报废 (Scrap)" value="Scrap" />
                  <el-option label="特采 (Concession)" value="Concession" />
                  <el-option label="挑选 (Selection)" value="Selection" />
                  <el-option label="退货 (Return)" value="Return" />
                  <el-option label="降级 (Downgrade)" value="Downgrade" />
                  <el-option label="重拼版 (Re-layout)" value="ReLayout" />
                  <el-option label="重制版 (Re-plate)" value="RePlate" />
                  <el-option label="修版 (Plate Repair)" value="PlateRepair" />
                  <el-option label="更新文件 (Update File)" value="UpdateFile" />
                  <el-option label="其他 (Other)" value="Other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="完成期限" prop="CompletionDeadline">
                <el-date-picker v-model="form.CompletionDeadline" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="状态" prop="Status">
                 <el-select v-model="form.Status" placeholder="请选择" style="width: 100%">
                  <el-option label="进行中 (Open)" value="Open" />
                  <el-option label="已关闭 (Closed)" value="Closed" />
                 </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item prop="TemporaryCountermeasure">
             <template #label>
               <div style="line-height: 1.5; text-align: right;">
                 <span>临时对策</span><br/>
                 <el-button link type="primary" @click="measureDialogVisible = true" style="padding: 0; height: auto; font-size: 12px;">+选择对策</el-button>
               </div>
             </template>
             <el-input 
              v-model="form.TemporaryCountermeasure" 
              type="textarea" 
              :rows="3" 
              placeholder="请输入临时对策"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="永久对策" prop="PermanentCountermeasure">
            <el-input v-model="form.PermanentCountermeasure" type="textarea" :rows="2" />
          </el-form-item>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="对策执行人" prop="Executor">
                <el-select v-model="form.Executor" placeholder="请选择" filterable style="width: 100%">
                  <el-option
                    v-for="person in personList"
                    :key="person.ID"
                    :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                    :value="person.Name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="验证人" prop="Verifier">
                <el-select v-model="form.Verifier" placeholder="请选择" filterable style="width: 100%">
                  <el-option
                    v-for="person in personList"
                    :key="person.ID"
                    :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                    :value="person.Name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="验证结果" prop="VerificationResult">
                 <el-select v-model="form.VerificationResult" placeholder="请选择" style="width: 100%">
                  <el-option label="合格 (Pass)" value="Pass" />
                  <el-option label="不合格 (Fail)" value="Fail" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="关闭日期" prop="CloseDate">
                 <el-date-picker v-model="form.CloseDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
              </el-form-item>
            </el-col>
          </el-row>
           <el-form-item label="备注" prop="Remarks">
            <el-input v-model="form.Remarks" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">
            <el-icon class="el-icon--left"><Close /></el-icon>取消
          </el-button>
          <el-button type="primary" @click="handleSubmit">
            <el-icon class="el-icon--left"><Check /></el-icon>确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 对策选择弹窗 -->
    <el-dialog
      v-model="measureDialogVisible"
      title="选择对策"
      width="600px"
      append-to-body
      align-center
      destroy-on-close
    >
      <div class="measure-panel-content">
        <el-cascader-panel
          v-model="tempSelectedMeasures"
          :options="measureOptions"
          :props="{ multiple: true, emitPath: false }"
          style="width: 100%"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="measureDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMeasureSelection" :disabled="tempSelectedMeasures.length === 0">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>


  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete, Check, Close, Loading, Setting, Document } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增异常联络单')
const formRef = ref(null)
const departmentOptions = ref([])
const personList = ref([])
const dateRange = ref([])
const workOrderProductList = ref([]) // 存储工单关联的产品列表
const allProductList = ref([]) // 存储所有产品列表（预加载）
const workOrderLoading = ref(false)
const tableRef = ref(null)
const selectedRows = ref([]) // 存储选中的行
let isSelectionHandling = false // 防止循环触发

const form = reactive({
  ID: null,
  ExceptionNumber: '',
  ReportDate: new Date().toISOString().split('T')[0],
  Reporter: '',
  ProductName: '',
  MaterialCode: '',
  ModelSpec: '',
  CustomerCode: '',
  WorkOrderNum: '',
  ProductionQuantity: 0,
  ExceptionQuantity: 0,
  DiscoveryStage: '',
  Description: '',
  Images: [],
  PreliminaryCause: '',
  ResponsibleDepartment: '',
  ResponsiblePerson: '',
  HandlingMethod: '',
  TemporaryCountermeasure: '',
  PermanentCountermeasure: '',
  CompletionDeadline: '',
  Executor: '',
  Verifier: '',
  VerificationResult: '',
  CloseDate: '',
  Remarks: '',
  Status: 'Open'
})

const rules = {
  ReportDate: [{ required: true, message: '请选择填报日期', trigger: 'change' }],
  ProductName: [{ required: true, message: '请输入产品名称', trigger: 'change' }],
  DiscoveryStage: [{ required: true, message: '请选择发现阶段', trigger: 'change' }],
  Description: [{ required: true, message: '请输入异常描述', trigger: 'blur' }],
  ResponsibleDepartment: [{ required: true, message: '请选择责任部门', trigger: 'change' }]
}

const handleDateChange = (val) => {
  if (val) {
    queryParams.startDate = val[0]
    queryParams.endDate = val[1]
  } else {
    queryParams.startDate = ''
    queryParams.endDate = ''
  }
  handleSearch()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

const getDiscoveryStageLabel = (stage) => {
  const map = {
    'Incoming': '来料',
    'Process': '制程',
    'Finished': '成品',
    'Shipment': '出货',
    'Client': '客户端'
  }
  return map[stage] || stage
}

// 处理表格选择变化
const handleSelectionChange = (val) => {
  if (isSelectionHandling) return
  selectedRows.value = val
}

const handleGenerateNotice = async (row) => {
  try {
    const res = await apiService.get('/quality-assessment-notices/check-existence', {
      params: { sourceType: 'Exception', sourceId: row.ID }
    })
    
    // API返回结构: { success: true, data: { exists: true, id: 123 } }
    if (res.data.success && res.data.data && res.data.data.exists) {
      // 已存在考核单，弹出选择
      ElMessageBox.confirm(
        '该异常联络单已关联考核通知单，请选择操作：',
        '考核通知单已存在',
        {
          confirmButtonText: '查看',
          cancelButtonText: '编辑',
          distinguishCancelAndClose: true,
          type: 'info',
          center: true,
          showClose: true
        }
      ).then(() => {
        // 选择查看 (mode=view)
        const routeData = router.resolve({
          path: `/admin/quality/assessment-notices/edit/${res.data.data.id}`,
          query: { mode: 'view' }
        })
        window.open(routeData.href, '_blank')
      }).catch((action) => {
        if (action === 'cancel') {
          // 选择编辑 (mode=edit)
          const routeData = router.resolve({
            path: `/admin/quality/assessment-notices/edit/${res.data.data.id}`,
            query: { mode: 'edit' }
          })
          window.open(routeData.href, '_blank')
        }
      })
    } else {
      const routeData = router.resolve({
        path: '/admin/quality/assessment-notices/create',
        query: { sourceType: 'Exception', sourceId: row.ID }
      })
      window.open(routeData.href, '_blank')
    }
  } catch (error) {
    ElMessage.error('检查考核通知失败，请稍后重试')
    console.error('Check existence failed:', error)
  }
}

// 对策库相关状态
const measureOptions = ref([])
const tempSelectedMeasures = ref([])
const measureDialogVisible = ref(false)



// 加载对策库
const loadMeasures = async () => {
  try {
    const res = await apiService.get('/quality-measures')
    if (res.data.success) {
      const grouped = res.data.data
      // 转换为级联选择器格式
      measureOptions.value = Object.keys(grouped).map(category => ({
        value: category,
        label: category,
        children: grouped[category].map(item => ({
          value: item.Content,
          label: item.Content
        }))
      }))
    }
  } catch (error) {
    console.error('加载对策库失败:', error)
  }
}

// 处理对策选择确认
const confirmMeasureSelection = () => {
  const val = tempSelectedMeasures.value
  if (!val || val.length === 0) return
  
  // 获取最新选择的一项（由于是多选，且emitPath=false，val是选中值的数组）
  // 这里逻辑改为：将所有选中的项，追加到文本框中，如果文本框已有该内容则不重复添加
  
  const currentText = form.TemporaryCountermeasure || ''
  const newItems = []
  
  val.forEach(item => {
    // 简单查重：检查是否包含该文本
    if (!currentText.includes(item)) {
      newItems.push(item)
    }
  })
  
  if (newItems.length > 0) {
    // 修改分隔符逻辑：多个对策之间用顿号连接，不强制换行
    let prefix = ''
    if (currentText) {
      // 如果已有内容，且不以顿号或换行符结尾，则添加顿号
      if (!currentText.endsWith('、') && !currentText.endsWith('\n')) {
        prefix = '、'
      }
    }
    form.TemporaryCountermeasure = currentText + prefix + newItems.join('、')
    ElMessage.success(`已添加 ${newItems.length} 条对策`)
  } else {
    // 如果没有新增内容（都在文本框里有了），但也应该关闭面板
    if (val.length > 0 && newItems.length === 0) {
        ElMessage.info('选中的对策已存在')
    }
  }
  
  // 清空选择，方便下次选择
  tempSelectedMeasures.value = []
  measureDialogVisible.value = false
}

const handleBatchGenerateNotice = () => {
  if (selectedRows.value?.length !== 1) {
    ElMessage.warning('生成考核通知时只能选择一条记录')
    return
  }
  handleGenerateNotice(selectedRows.value[0])
}

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return
  
  ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 条记录吗？相关的考核通知也将一并删除！`, '高危操作', {
    type: 'warning',
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      // 获取所有选中行的ID
      const ids = selectedRows.value.map(row => row.ID)
      // 需要后端支持批量删除接口，如果不支持，则循环删除
      // 这里假设我们通过循环删除，或者您可以修改后端接口
      let successCount = 0
      for (const id of ids) {
        await apiService.delete(`/quality-exceptions/${id}`)
        successCount++
      }
      ElMessage.success(`成功删除 ${successCount} 条记录`)
      tableRef.value.clearSelection()
      getList()
    } catch (error) {
      ElMessage.error('批量删除过程中出现错误')
      getList() // 刷新列表以显示最新状态
    }
  }).catch(() => {})
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该记录吗？相关的考核通知也将一并删除！', '高危操作', {
    type: 'warning',
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await apiService.delete(`/quality-exceptions/${row.ID}`)
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (form.ID) {
          await apiService.put(`/quality-exceptions/${form.ID}`, form)
          ElMessage.success('更新成功')
        } else {
          await apiService.post('/quality-exceptions', form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        getList()
      } catch (error) {
        ElMessage.error('提交失败')
      }
    }
  })
}

const getList = async () => {
  loading.value = true
  try {
    const res = await apiService.get('/quality-exceptions', { params: queryParams })
    if (res.data.success) {
      tableData.value = res.data.data.list
      total.value = res.data.data.total || 0
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  queryParams.page = 1
  getList()
}

// 重置查询
const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = ''
  queryParams.startDate = ''
  queryParams.endDate = ''
  dateRange.value = []
  queryParams.page = 1
  getList()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增异常联络单'
  // 重置表单
  Object.assign(form, {
    ID: null,
    ExceptionNumber: '',
    ReportDate: new Date().toISOString().split('T')[0],
    Reporter: userStore.user?.RealName || userStore.user?.Username || '',
    ProductName: '',
    MaterialCode: '',
    ModelSpec: '',
    CustomerCode: '',
    WorkOrderNum: '',
    ProductionQuantity: 0,
    ExceptionQuantity: 0,
    DiscoveryStage: '',
    Description: '',
    Images: [],
    PreliminaryCause: '',
    ResponsibleDepartment: '',
    ResponsiblePerson: '',
    HandlingMethod: '',
    TemporaryCountermeasure: '',
    PermanentCountermeasure: '',
    CompletionDeadline: '',
    Executor: '',
    Verifier: '',
    VerificationResult: '',
    CloseDate: '',
    Remarks: '',
    Status: 'Open'
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑异常联络单'
  Object.assign(form, {
    ...row,
    ReportDate: row.ReportDate ? row.ReportDate.split('T')[0] : '',
    CompletionDeadline: row.CompletionDeadline ? row.CompletionDeadline.split('T')[0] : '',
    CloseDate: row.CloseDate ? row.CloseDate.split('T')[0] : ''
  })
  dialogVisible.value = true
}

// 获取部门列表
const getDepartments = async () => {
  try {
    const res = await apiService.get('/departments/tree')
    if (res.data.success) {
      // 扁平化部门树
      const flattenDepts = (depts, result = []) => {
        depts.forEach(dept => {
          result.push({ ID: dept.ID, Name: dept.Name })
          if (dept.children && dept.children.length > 0) {
            flattenDepts(dept.children, result)
          }
        })
        return result
      }
      departmentOptions.value = flattenDepts(res.data.data)
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

// 加载人员列表
const loadPersonList = async () => {
  try {
    const res = await apiService.get('/person/list', { params: { pageSize: 9999, includeInactive: false } })
    if (res.data.success) {
      personList.value = res.data.data
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

// 预加载所有产品列表
const loadAllProducts = async () => {
  try {
    const res = await apiService.get('/products', { params: { pageSize: 9999 } })
    if (res.data.success) {
      allProductList.value = res.data.data.list || res.data.data || []
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
  }
}

// 产品名称搜索建议
const querySearchProduct = (queryString, cb) => {
  // 优先从工单关联产品中搜索，其次从全部产品中搜索
  const sourceList = workOrderProductList.value.length > 0 ? workOrderProductList.value : allProductList.value
  
  const results = queryString
    ? sourceList.filter(item => {
        const name = item.ProductName || item.Name || ''
        return name.toLowerCase().includes(queryString.toLowerCase())
      }).map(item => ({
        value: item.ProductName || item.Name || '',
        materialCode: item.MaterialCode || item.Code || '',
        modelSpec: item.ModelSpec || item.Spec || '',
        customerCode: item.CustomerCode || ''
      }))
    : sourceList.slice(0, 20).map(item => ({
        value: item.ProductName || item.Name || '',
        materialCode: item.MaterialCode || item.Code || '',
        modelSpec: item.ModelSpec || item.Spec || '',
        customerCode: item.CustomerCode || ''
      }))
  
  cb(results)
}

// 选择产品后自动填充相关字段
const handleSelectProduct = (item) => {
  form.ProductName = item.value
  form.MaterialCode = item.materialCode || ''
  form.ModelSpec = item.modelSpec || ''
  form.CustomerCode = item.customerCode || ''
}

// 工单号变化处理
const handleWorkOrderChange = async (val) => {
  if (!val || !val.trim()) {
    workOrderProductList.value = []
    return
  }
  
  workOrderLoading.value = true
  try {
    // 根据工单号查询关联的产品信息
    const res = await apiService.get('/work-orders/products', { params: { workOrderNum: val.trim() } })
    if (res.data.success && res.data.data) {
      workOrderProductList.value = res.data.data
      // 如果只有一个产品，自动填充
      if (res.data.data.length === 1) {
        const product = res.data.data[0]
        form.ProductName = product.ProductName || ''
        form.MaterialCode = product.MaterialCode || ''
        form.ModelSpec = product.ModelSpec || ''
        form.CustomerCode = product.CustomerCode || ''
      }
    }
  } catch (error) {
    console.error('查询工单产品失败:', error)
  } finally {
    workOrderLoading.value = false
  }
}

onMounted(() => {
  getList()
  getDepartments()
  loadPersonList()
  loadAllProducts() // 预加载产品数据
  loadMeasures() // 加载对策库
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

:deep(.table-header-center) {
  background-color: #f5f7fa !important;
  font-weight: normal;
  color: #606266;
}

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 15px;
}

.measure-panel-content {
  display: flex;
  justify-content: center;
}

.notice-dialog :deep(.el-dialog__body) {
  padding: 0;
  background-color: #e8e4de;
}

.notice-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  padding-bottom: 10px;
}

/* 手机端自适应 */
@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-container > .el-form {
    margin-bottom: 10px;
  }
  
  .search-container > div {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }

  .demo-form-inline .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
    width: 100%;
    display: flex;
  }
  
  .demo-form-inline .el-form-item__content {
    flex: 1;
  }
  
  .demo-form-inline .el-select, 
  .demo-form-inline .el-input,
  .demo-form-inline .el-date-editor {
    width: 100% !important;
  }

  .custom-dialog {
    width: 95% !important;
  }
}
</style>