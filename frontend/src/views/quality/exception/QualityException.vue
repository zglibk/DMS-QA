<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>品质异常联络单</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon class="el-icon--left"><Plus /></el-icon>新增异常联络单
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="单号/产品/物料/描述" clearable @keyup.enter="handleSearch" :prefix-icon="Search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 160px">
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

      <!-- 表格 -->
      <el-table v-loading="loading" :data="tableData" style="width: 100%" border stripe header-cell-class-name="table-header-center">
        <el-table-column type="index" label="序号" width="60" fixed align="center" header-align="center" />
        <el-table-column prop="ExceptionNumber" label="异常联络单号" width="140" fixed align="center" header-align="center" />
        <el-table-column prop="ReportDate" label="填报日期" width="120" align="center" header-align="center">
          <template #default="scope">{{ formatDate(scope.row.ReportDate) }}</template>
        </el-table-column>
        <el-table-column prop="ProductName" label="产品名称" min-width="150" show-overflow-tooltip header-align="center" />
        <el-table-column prop="MaterialCode" label="物料编码" width="120" align="center" header-align="center" />
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
        <el-table-column label="操作" width="180" fixed="right" align="center" header-align="center">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleEdit(scope.row)">
              <el-icon class="el-icon--left"><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(scope.row)">
              <el-icon class="el-icon--left"><Delete /></el-icon>删除
            </el-button>
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
            <el-col :span="8">
              <el-form-item label="异常编号">
                <el-input v-model="form.ExceptionNumber" placeholder="自动生成" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="填报日期" prop="ReportDate">
                <el-date-picker v-model="form.ReportDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="填报人" prop="Reporter">
                <el-input v-model="form.Reporter" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :span="8">
              <el-form-item label="工单号" prop="WorkOrderNum">
                <el-input 
                  v-model="form.WorkOrderNum" 
                  @change="handleWorkOrderChange" 
                  placeholder="输入工单号回车或失焦查询"
                  clearable
                  :prefix-icon="Search"
                >
                   <template #suffix>
                    <el-icon v-if="workOrderLoading" class="is-loading"><Loading /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="产品名称" prop="ProductName">
                 <el-autocomplete
                    v-model="form.ProductName"
                    :fetch-suggestions="querySearchProduct"
                    placeholder="请输入产品名称"
                    @select="handleSelectProduct"
                    style="width: 100%"
                    :prefix-icon="Search"
                  />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="10">
            <el-col :span="8">
              <el-form-item label="物料编码" prop="MaterialCode">
                <el-input v-model="form.MaterialCode" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="型号/规格" prop="ModelSpec">
                <el-input v-model="form.ModelSpec" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户编码" prop="CustomerCode">
                <el-input v-model="form.CustomerCode" @input="val => form.CustomerCode = val.toUpperCase()" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :span="8">
               <el-form-item label="发现阶段" prop="DiscoveryStage">
                <el-select v-model="form.DiscoveryStage" placeholder="请选择" style="width: 100%">
                  <el-option label="来料 (Incoming)" value="Incoming" />
                  <el-option label="制程 (Process)" value="Process" />
                  <el-option label="成品 (Finished)" value="Finished" />
                  <el-option label="出货 (Shipment)" value="Shipment" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="生产数量" prop="ProductionQuantity">
                <el-input-number v-model="form.ProductionQuantity" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="异常数量" prop="ExceptionQuantity">
                <el-input-number v-model="form.ExceptionQuantity" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :span="8">
              <el-form-item label="责任部门" prop="ResponsibleDepartment">
                 <el-select v-model="form.ResponsibleDepartment" placeholder="请选择" filterable style="width: 100%">
                  <el-option v-for="dept in departmentOptions" :key="dept.ID" :label="dept.Name" :value="dept.Name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
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
            <el-col :span="8">
              <el-form-item label="处理方式" prop="HandlingMethod">
                <el-select v-model="form.HandlingMethod" placeholder="请选择" style="width: 100%">
                  <el-option label="返工 (Rework)" value="Rework" />
                  <el-option label="返修 (Repair)" value="Repair" />
                  <el-option label="报废 (Scrap)" value="Scrap" />
                  <el-option label="特采 (Concession)" value="Concession" />
                  <el-option label="挑选 (Selection)" value="Selection" />
                  <el-option label="退货 (Return)" value="Return" />
                  <el-option label="降级 (Downgrade)" value="Downgrade" />
                  <el-option label="其他 (Other)" value="Other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="完成期限" prop="CompletionDeadline">
                <el-date-picker v-model="form.CompletionDeadline" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
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
            <el-col :span="8">
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
            <el-col :span="8">
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
            <el-col :span="8">
              <el-form-item label="验证结果" prop="VerificationResult">
                 <el-select v-model="form.VerificationResult" placeholder="请选择" style="width: 100%">
                  <el-option label="合格 (Pass)" value="Pass" />
                  <el-option label="不合格 (Fail)" value="Fail" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="10">
            <el-col :span="8">
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
import { Plus, Search, Refresh, Edit, Delete, Check, Close, Loading, Setting } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
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

const queryParams = reactive({
  page: 1,
  pageSize: 5,
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})

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
    'Shipment': '出货'
  }
  return map[stage] || stage
}

// Fetch Departments
const getDepartments = async () => {
  try {
    const res = await apiService.get('/departments/list?pageSize=100')
    if (res.data.success) {
      // API returns { data: [...], pagination: ... }
      departmentOptions.value = res.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch departments', error)
  }
}

// 处理工单号变更（回车或失焦）
const handleWorkOrderChange = async (val) => {
    if (!val) {
        workOrderProductList.value = []
        return
    }
    
    const pNum = val.toUpperCase().trim()
    form.WorkOrderNum = pNum // 确保大写
    workOrderLoading.value = true
    
    console.log(`开始查询工单: ${pNum}`)
    
    try {
        const res = await apiService.get(`/erp/production/work-order/${encodeURIComponent(pNum)}`)
        console.log('工单查询原始响应:', res)
        
        if (res.data.code === 0) {
            // 处理多层嵌套数据结构：后端返回 data -> ERP返回 data -> 实际工单对象 data
            // 兼容性处理：检查 res.data.data 是否包含 data 字段
            let woData = res.data.data
            if (woData && woData.data) {
                woData = woData.data
            }
            
            console.log('解析后的工单数据:', woData)
            
            if (woData) {
                // 1. 自动回填客户编码
                if (woData.CustomerID) {
                    form.CustomerCode = woData.CustomerID
                } else if (woData.Customer) {
                     // 兼容性处理：如果没有 CustomerID，尝试使用 Customer 并给出警告
                     console.warn('工单数据中未找到 CustomerID，尝试使用 Customer')
                     form.CustomerCode = woData.Customer
                }
                
                // 2. 处理产品信息
                // 检查 PNumProductInfoList 是否存在
                const productList = woData.PNumProductInfoList || []
                
                if (Array.isArray(productList) && productList.length > 0) {
                    console.log(`找到 ${productList.length} 个关联产品`)
                    
                    const products = productList.map(p => ({
                        value: p.Product,
                        ProductName: p.Product,
                        MaterialCode: p.CProductID, // 使用客户料号作为物料编码
                        ModelSpec: p.Scale || '',
                        CustomerCode: woData.CustomerID || woData.Customer || '',
                        ProductionQuantity: p.PCount || 0
                    }))
                    
                    workOrderProductList.value = products
                    
                    // 如果只有一个产品，直接回填所有信息
                    if (products.length === 1) {
                        const product = products[0]
                        form.ProductName = product.ProductName
                        form.MaterialCode = product.MaterialCode
                        form.ModelSpec = product.ModelSpec
                        form.ProductionQuantity = product.ProductionQuantity
                        ElMessage.success('已自动回填工单关联产品信息')
                    } else {
                        // 如果有多个产品，清空当前产品相关信息，提示用户选择
                        form.ProductName = ''
                        form.MaterialCode = ''
                        form.ModelSpec = ''
                        form.ProductionQuantity = 0
                        ElMessage.info(`该工单包含 ${products.length} 个产品，请在产品名称中选择`)
                    }
                } else {
                    console.warn('工单数据中未找到 PNumProductInfoList 或为空')
                    workOrderProductList.value = []
                    ElMessage.warning('该工单未找到关联产品信息')
                }
            } else {
                console.warn('工单数据为空')
                workOrderProductList.value = []
                ElMessage.warning('未查到该工单信息')
            }
        } else {
            console.error('API返回错误码:', res.data.code, res.data.message)
            ElMessage.error(res.data.message || '查询工单失败')
        }
    } catch (error) {
        console.error('查询工单异常:', error)
        workOrderProductList.value = []
        ElMessage.error('查询工单服务异常')
    } finally {
        workOrderLoading.value = false
    }
}

// Fetch Person List
const loadPersonList = async () => {
  try {
    const res = await apiService.get('/person/list?pageSize=1000&includeInactive=false')
    if (res.data.success) {
      personList.value = res.data.data
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

// Product Autocomplete
const querySearchProduct = (queryString, cb) => {
    // 1. 如果是通过工单号带出的产品列表，直接使用缓存
    if (workOrderProductList.value.length > 0) {
        if (queryString) {
             const lowerQuery = queryString.toLowerCase()
             const filtered = workOrderProductList.value.filter(item => 
                item.ProductName.toLowerCase().includes(lowerQuery) || 
                item.MaterialCode.toLowerCase().includes(lowerQuery)
             )
             cb(filtered)
        } else {
             cb(workOrderProductList.value)
        }
        return
    }

    // 2. 如果没有关键字，不显示
    if (!queryString) {
        cb([])
        return
    }
    
    // 3. 本地搜索预加载的产品列表
    const lowerQuery = queryString.toLowerCase()
    const results = allProductList.value.filter(item => {
        const productName = item.ProductName || ''
        const productCode = item.MaterialCode || ''
        return productName.toLowerCase().includes(lowerQuery) || productCode.toLowerCase().includes(lowerQuery)
    })
    
    // 限制返回数量，避免卡顿
    cb(results.slice(0, 50))
}

// Load All Products (Pre-loading)
const loadAllProducts = async () => {
    try {
        // 使用近一年的日期作为范围
        const endDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
        const startDateObj = new Date()
        startDateObj.setFullYear(startDateObj.getFullYear() - 1)
        const startDate = startDateObj.toISOString().replace('T', ' ').slice(0, 19)

        const res = await apiService.get('/erp/stock/product-in-sum', { 
            params: { StartDate: startDate, EndDate: endDate } 
        })
        
        let items = []
        if (res.data.code === 0 && res.data.data) {
            items = Array.isArray(res.data.data) ? res.data.data : (res.data.data.data || [])
        }
        
        if (items.length > 0) {
            const uniqueMap = new Map()
            
            items.forEach(item => {
                const productName = item.Product || ''
                // 仅缓存有名称的产品
                if (productName) {
                    if (!uniqueMap.has(productName)) {
                        uniqueMap.set(productName, {
                            value: productName,
                            ProductName: productName,
                            MaterialCode: item.ProductID || '', 
                            ModelSpec: item.Scale || '',
                            CustomerCode: item.Customer || '',
                            source: 'ProductIn'
                        })
                    }
                }
            })
            
            allProductList.value = Array.from(uniqueMap.values())
            console.log(`预加载产品数据完成，共 ${allProductList.value.length} 条`)
        }
    } catch (error) {
        console.error('预加载产品列表失败:', error)
    }
}

const handleSelectProduct = (item) => {
    form.ProductName = item.ProductName
    form.MaterialCode = item.MaterialCode
    form.ModelSpec = item.ModelSpec || ''
    // 回填生产数量
    if (item.ProductionQuantity) {
        form.ProductionQuantity = item.ProductionQuantity
    }
    // 可选：如果用户未填写客户，则自动带入
    if (!form.CustomerCode && item.CustomerCode) {
        form.CustomerCode = item.CustomerCode
    }
}


const getList = async () => {
  loading.value = true
  try {
    const res = await apiService.get('/quality-exceptions', { params: queryParams })
    if (res.data.success) {
      tableData.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.page = 1
  getList()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = ''
  queryParams.startDate = ''
  queryParams.endDate = ''
  dateRange.value = []
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增异常联络单'
  dialogVisible.value = true
  // Reset form
  Object.keys(form).forEach(key => {
      if(key === 'Status') form[key] = 'Open'
      else if (key === 'ReportDate') form[key] = new Date().toISOString().split('T')[0]
      else if (key === 'Reporter') form[key] = userStore.user.RealName || userStore.user.realName || userStore.user.Username || userStore.user.username || ''
      else if (key === 'ProductionQuantity' || key === 'ExceptionQuantity') form[key] = 0
      else if (key === 'Images') form[key] = []
      else form[key] = ''
  })
  form.ID = null
  workOrderProductList.value = [] // 清空工单产品缓存
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑异常联络单'
  dialogVisible.value = true
  workOrderProductList.value = [] // 清空工单产品缓存
  Object.assign(form, row)
  // Fix JSON parsing if needed for images
  if (typeof form.Images === 'string') {
      try {
          form.Images = JSON.parse(form.Images)
      } catch (e) {
          form.Images = []
      }
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该记录吗?', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await apiService.delete(`/quality-exceptions/${row.ID}`)
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
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

  /* .measure-input-container {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
}
.measure-selector {
  flex-shrink: 0;
} */
.measure-panel-content {
  display: flex;
  justify-content: center;
}
</style>