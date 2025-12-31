<template>
  <div class="app-container">
    <div class="page-header">
      <el-page-header @back="goBack" :content="isEdit ? '编辑报告' : '新增报告'" />
    </div>

    <el-card class="box-card" shadow="never">
      <!-- Material Search Section (Only in Create Mode) -->
      <div v-if="!isEdit" class="section-container">
        <div class="section-title" style="cursor: pointer;" @click="showMaterialSearch = !showMaterialSearch">
            材料入库引用 (点击折叠/展开)
            <el-icon style="float: right"><Search /></el-icon>
        </div>
        <el-collapse-transition>
            <div v-show="showMaterialSearch" class="section-content" style="background: #fdfdfd; padding: 15px; border: 1px dashed #dcdfe6; margin-bottom: 20px;">
                <el-form :inline="true" :model="materialSearch" size="small">
                    <el-form-item label="关键字">
                        <el-input v-model="materialSearch.keyword" placeholder="品名/料号/批号/单号" style="width: 200px;" @keyup.enter="handleMaterialSearch" />
                    </el-form-item>
                    <el-form-item label="供应商">
                        <el-input v-model="materialSearch.supplier" placeholder="供应商名称" style="width: 150px;" @keyup.enter="handleMaterialSearch" />
                    </el-form-item>
                    <el-form-item label="入库日期">
                         <el-date-picker v-model="materialSearch.startDate" type="date" placeholder="开始" value-format="YYYY-MM-DD" style="width: 130px;" />
                         -
                         <el-date-picker v-model="materialSearch.endDate" type="date" placeholder="结束" value-format="YYYY-MM-DD" style="width: 130px;" />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" :icon="Search" @click="handleMaterialSearch">查询</el-button>
                    </el-form-item>
                </el-form>

                <el-table 
                    :data="materialList" 
                    v-loading="materialLoading" 
                    border 
                    size="small" 
                    height="200"
                    highlight-current-row
                    @row-click="handleMaterialSelect"
                    style="width: 100%; cursor: pointer;"
                    :header-cell-style="{ background: '#f5f7fa', color: '#606266', textAlign: 'center' }"
                >
                    <el-table-column width="50" align="center">
                         <template #default="{ row }">
                             <el-checkbox :model-value="selectedMaterial === row" @change="handleMaterialSelect(row)" />
                         </template>
                    </el-table-column>
                    <el-table-column prop="InboundDate" label="入库日期" width="110" align="center" />
                    <el-table-column prop="MaterialCode" label="料号" min-width="150" show-overflow-tooltip align="center" />
                    <el-table-column prop="ProductName" label="品名" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="Specification" label="规格" min-width="120" show-overflow-tooltip align="center" />
                    <el-table-column prop="BatchNo" label="批号" min-width="150" show-overflow-tooltip align="center" />
                    <el-table-column prop="Supplier" label="供应商" min-width="200" show-overflow-tooltip />
                    <el-table-column prop="Quantity" label="数量" width="90" align="center" />
                    <el-table-column prop="Unit" label="单位" width="70" align="center" />
                    <el-table-column prop="PONumber" label="采购单号" min-width="130" show-overflow-tooltip align="center" />
                </el-table>

                <!-- Material Pagination -->
                <el-pagination
                    v-show="materialTotal > 0"
                    :total="materialTotal"
                    v-model:current-page="materialSearch.page"
                    v-model:page-size="materialSearch.pageSize"
                    :page-sizes="[5, 10, 20]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleMaterialSearch"
                    @current-change="handleMaterialSearch"
                    style="margin-top: 10px; text-align: center;"
                />

                <div style="margin-top: 5px; color: #909399; font-size: 12px;">* 点击表格行即可自动填入下方表单</div>
            </div>
        </el-collapse-transition>
      </div>

      <el-form ref="dataForm" :rules="rules" :model="temp" label-position="right" label-width="100px" :disabled="isReadOnly">
        
        <!-- Section 1: Basic Info -->
        <div class="section-container">
          <div class="section-title">
            基本信息
            <span v-if="selectedMaterial && !temp.PackageCount" style="color: red; font-size: 14px; margin-left: 10px; font-weight: normal;">
              (已填充材料信息，请输入实际【卷数/箱数】以计算抽样数)
            </span>
          </div>
          <div class="section-content">
            <el-row :gutter="40">
              <el-col :span="8">
                <el-form-item label="报告编号" prop="ReportNo">
                  <el-input v-model="temp.ReportNo" placeholder="自动生成或输入" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="供应商" prop="Supplier">
                  <el-input v-model="temp.Supplier" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="品名" prop="ProductName">
                  <el-input v-model="temp.ProductName" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="40">
              <el-col :span="8">
                <el-form-item label="规格尺寸" prop="Specification">
                  <el-input v-model="temp.Specification" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="来料数量" prop="Quantity">
                  <el-input v-model="temp.Quantity" style="width: 100%">
                    <template #append>{{ temp.Unit || '单位' }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="卷数/箱数" prop="PackageCount">
                  <el-input-number 
                    v-model="temp.PackageCount" 
                    :min="0" 
                    style="width: 100%" 
                    controls-position="right"
                    placeholder="用于计算抽样数"
                    @change="(val) => temp.SamplingQuantity = calculateSampleSize(val)"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="来料日期" prop="ArrivalDate">
                  <el-date-picker v-model="temp.ArrivalDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="40">
              <el-col :span="8">
                <el-form-item label="抽样数" prop="SamplingQuantity">
                  <el-input-number v-model="temp.SamplingQuantity" :min="1" style="width: 100%" controls-position="right" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="采购单号" prop="PONumber">
                  <el-input v-model="temp.PONumber" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                 <el-form-item label="类型" prop="Type">
                  <el-select v-model="temp.Type" placeholder="请选择" style="width: 100%" @change="handleTypeChange">
                      <el-option label="纸张" value="纸张" />
                      <el-option label="膜类" value="膜类" />
                      <el-option label="化学辅料" value="化学辅料" />
                      <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
             <el-row :gutter="40">
              <el-col :span="24">
                <el-form-item label="检验依据" prop="InspectionBasis">
                  <el-input v-model="temp.InspectionBasis" placeholder="请输入检验依据" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          <div style="font-size: 12px; color: #909399; margin-top: 10px; padding-left: 10px;">
            * 抽样逻辑：依据 GB/T 2828.1-2012 标准，一般检验水平II，正常检验一次抽样方案，AQL=4.0。优先按【卷数/箱数】计算，若无则按【来料数量】计算。
          </div>
        </div>

        <!-- Section 2: Photos -->
        <div class="section-container">
           <div class="section-title">测试图片</div>
           <div class="section-content">
              <el-upload
                  action="#"
                  list-type="picture-card"
                  :auto-upload="false"
                  :on-change="handleImageChange"
                  :on-remove="handleImageRemove"
                  :file-list="fileList"
                  multiple
                  :disabled="isReadOnly"
              >
                  <el-icon><Plus /></el-icon>
              </el-upload>
              <el-dialog v-model="previewVisible">
                  <img style="width: 100%" :src="previewImage" alt="Preview" />
              </el-dialog>
           </div>
        </div>

        <!-- Section 3: Details -->
        <div class="section-container">
          <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
              <span>检验项目明细</span>
              <div v-if="!isReadOnly">
                <el-button v-if="selectedMaterial" type="warning" plain size="small" :icon="Refresh" @click="handleRegenerateData">重新生成数据</el-button>
                <el-button type="primary" size="small" :icon="Plus" @click="handleAddDetail">添加检验项目</el-button>
              </div>
          </div>
          <div class="section-content">
             <el-table :data="temp.details" border style="width: 100%" :header-cell-style="{ textAlign: 'center', background: '#f5f7fa' }" :cell-style="{ textAlign: 'center' }">
                <el-table-column label="检验项目" width="160">
                    <template #default="{ row, $index }">
                        <el-select v-model="row.ItemID" placeholder="选择项目" @change="(val) => handleItemChange(val, row)" style="width: 100%" :disabled="isReadOnly">
                            <el-option v-for="item in inspectionItems" :key="item.ID" :label="item.ItemName" :value="item.ID" />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="检验内容" min-width="150">
                    <template #default="{ row }">
                        <el-input v-model="row.InspectionContent" type="textarea" :rows="2" :disabled="isReadOnly" />
                    </template>
                </el-table-column>
                <el-table-column label="检验依据" width="120">
                    <template #default="{ row }">
                        {{ row.InspectionBasis }}
                    </template>
                </el-table-column>
                <el-table-column label="合格标准" width="120">
                    <template #default="{ row }">
                        {{ row.AcceptanceCriteria }}
                    </template>
                </el-table-column>
                <el-table-column label="样本数据" width="120">
                    <template #default="{ row }">
                        <el-button 
                            v-if="isSpecialType(row.DataType)" 
                            type="info" 
                            plain
                            size="small" 
                            @click="openSampleDialog(row)"
                        >
                            {{ isReadOnly ? '查看数据' : '录入数据' }}
                            <span v-if="row.SampleValues && row.SampleValues.length">({{row.SampleValues.length}})</span>
                        </el-button>
                        <span v-else-if="row.SampleValues && row.SampleValues.length > 0">
                            {{ Array.isArray(row.SampleValues) ? row.SampleValues.join(', ') : row.SampleValues }}
                        </span>
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="单项判定" width="120">
                    <template #default="{ row }">
                         <el-select v-model="row.SingleItemJudgment" :disabled="isReadOnly">
                            <el-option label="合格" value="合格" />
                            <el-option label="不合格" value="不合格" />
                         </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="备注" min-width="150">
                    <template #default="{ row }">
                        <el-input v-model="row.ItemRemark" :disabled="isReadOnly" />
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="100" v-if="!isReadOnly">
                    <template #default="{ $index }">
                        <el-button type="danger" size="small" :icon="Delete" @click="temp.details.splice($index, 1)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- Section 4: Conclusion -->
        <div class="section-container">
          <div class="section-title">结论与审核</div>
          <div class="section-content">
            <el-row :gutter="40">
               <el-col :span="24">
                  <el-form-item label="整体备注" prop="ReportRemark">
                      <el-input type="textarea" v-model="temp.ReportRemark" :rows="3" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="40">
               <el-col :span="8">
                   <el-form-item label="结果判定" prop="ReportResult">
                       <el-select v-model="temp.ReportResult" style="width: 100%">
                          <el-option label="合格" value="合格" />
                          <el-option label="不合格" value="不合格" />
                          <el-option label="特采" value="特采" />
                       </el-select>
                   </el-form-item>
               </el-col>
               <el-col :span="8">
                   <el-form-item label="状态" prop="Status">
                       <el-select v-model="temp.Status" style="width: 100%">
                          <el-option label="草稿" value="Saved" />
                          <el-option label="已提交" value="Submitted" />
                       </el-select>
                   </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="40">
               <el-col :span="6">
                   <el-form-item label="检验人" prop="Inspector">
                       <el-input v-model="temp.Inspector" />
                   </el-form-item>
               </el-col>
               <el-col :span="6">
                   <el-form-item label="检验日期" prop="InspectionDate">
                       <el-date-picker v-model="temp.InspectionDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                   </el-form-item>
               </el-col>
               <el-col :span="6">
                   <el-form-item label="审核人" prop="Auditor">
                       <el-input v-model="temp.Auditor" disabled placeholder="审核时自动生成" />
                   </el-form-item>
               </el-col>
               <el-col :span="6">
                   <el-form-item label="审核日期" prop="AuditDate">
                       <el-date-picker v-model="temp.AuditDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" disabled />
                   </el-form-item>
               </el-col>
            </el-row>
          </div>
        </div>

      </el-form>

      <div class="footer-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" @click="isEdit ? updateData() : createData()">确认保存</el-button>
      </div>
    </el-card>

    <!-- Sample Input Dialog -->
    <el-dialog :title="`录入样本数据${currentDetail ? ' - ' + currentDetail.ItemName : ''}`" v-model="sampleDialogVisible" width="600px" append-to-body>
        <div v-if="currentDetail">
            <!-- Unit Selection -->
            <div style="margin-bottom: 15px;" v-if="['Force', 'Dimension'].includes(currentDetail.DataType)">
                <span style="margin-right: 10px;">单位/模式:</span>
                <el-select v-model="currentDetail.Unit" size="small" @change="handleUnitChange">
                    <template v-if="currentDetail.DataType === 'Force'">
                        <el-option label="N (牛顿)" value="N" />
                        <el-option label="kgf (千克力)" value="kgf" />
                        <el-option label="gf (克力)" value="gf" />
                    </template>
                    <template v-else-if="currentDetail.DataType === 'Dimension'">
                        <el-option label="mm (毫米)" value="mm" />
                        <el-option label="cm (厘米)" value="cm" />
                    </template>
                </el-select>
                
                <span v-if="currentDetail.DataType === 'Dimension'" style="margin-left: 20px;">
                    <el-radio-group v-model="currentDetail.SubMethod" size="small" @change="resetSamples" :disabled="isReadOnly">
                        <el-radio label="LW">长x宽</el-radio>
                        <el-radio label="Diameter">直径</el-radio>
                    </el-radio-group>
                </span>
            </div>

            <!-- Inputs Table -->
            <el-table :data="currentDetail.SampleValues" border style="width: 100%" size="small">
                <el-table-column type="index" label="序号" width="60" align="center" />
                
                <el-table-column label="样本数据" align="center">
                    <template #default="{ row, $index }">
                        <!-- Dimension L x W -->
                        <div v-if="currentDetail.DataType === 'Dimension' && currentDetail.SubMethod === 'LW'" style="display: flex; justify-content: center; align-items: center;">
                            <el-input-number v-model="currentDetail.SampleValues[$index].l" :placeholder="'长'" style="width: 120px; margin-right: 10px;" size="small" controls-position="right" :disabled="isReadOnly" />
                            <span style="margin-right: 10px;">x</span>
                            <el-input-number v-model="currentDetail.SampleValues[$index].w" :placeholder="'宽'" style="width: 120px;" size="small" controls-position="right" :disabled="isReadOnly" />
                        </div>
                        
                        <!-- Dimension Diameter -->
                        <div v-else-if="currentDetail.DataType === 'Dimension' && currentDetail.SubMethod === 'Diameter'">
                            <el-input-number v-model="currentDetail.SampleValues[$index].d" :placeholder="'直径'" style="width: 200px;" size="small" controls-position="right" :disabled="isReadOnly" />
                        </div>

                        <!-- Initial Adhesion (Ball No) -->
                        <div v-else-if="currentDetail.DataType === 'InitialAdhesion'">
                            <el-input-number v-model="currentDetail.SampleValues[$index]" :min="1" :max="30" placeholder="钢球号" style="width: 200px;" size="small" controls-position="right" :disabled="isReadOnly" />
                            <span style="margin-left: 10px;">#</span>
                        </div>

                        <!-- Others (Force, HoldingPower) -->
                        <div v-else>
                             <el-input-number v-model="currentDetail.SampleValues[$index]" style="width: 200px;" size="small" controls-position="right" :disabled="isReadOnly" />
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="80" align="center" v-if="!isReadOnly">
                    <template #default="{ $index }">
                        <el-button type="text" :icon="Delete" @click="removeSample($index)" style="color: #f56c6c;"></el-button>
                    </template>
                </el-table-column>
            </el-table>
            
            <el-button type="dashed" size="small" style="width: 100%; margin-top: 10px;" @click="addSample" :disabled="currentDetail.SampleValues.length >= 5" v-if="!isReadOnly">
                + 添加样本 ({{ currentDetail.SampleValues.length }}/5)
            </el-button>
        </div>
        <template #footer>
            <el-button @click="sampleDialogVisible = false">{{ isReadOnly ? '关闭' : '取消' }}</el-button>
            <el-button type="primary" @click="confirmSamples" v-if="!isReadOnly">确定并计算</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createIncomingReport, updateIncomingReport, getIncomingReportDetail, getInspectionItems, searchMaterials, generateInspectionData, generateReportNo } from '@/api/inspection'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { Plus, Delete, Search, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isEdit = computed(() => !!route.params.id)
const inspectionItems = ref([])
const dataForm = ref(null)

// Material Search Logic
const materialSearch = reactive({
    page: 1,
    pageSize: 5,
    keyword: '',
    supplier: '',
    startDate: '',
    endDate: ''
})
const materialList = ref([])
const materialTotal = ref(0)
const materialLoading = ref(false)
const showMaterialSearch = ref(true)
const selectedMaterial = ref(null)

const isReadOnly = computed(() => {
    // Check query param
    if (route.query.mode === 'view') return true
    
    // Check status (if editing existing report)
    if (isEdit.value && temp.Status) {
        return !['Saved', 'Draft', 'Rejected'].includes(temp.Status)
    }
    
    return false
})

const handleMaterialSearch = async () => {
    materialLoading.value = true
    try {
        const res = await searchMaterials(materialSearch)
        
        if (res.code === 0) {
            const allData = res.data
            materialTotal.value = allData.length
            
            // Client-side pagination since backend returns full list (filtered by date)
            const start = (materialSearch.page - 1) * materialSearch.pageSize
            const end = start + materialSearch.pageSize
            materialList.value = allData.slice(start, end)
        } else {
            ElMessage.warning(res.message || '未查询到数据')
            materialList.value = []
            materialTotal.value = 0
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('查询失败')
    } finally {
        materialLoading.value = false
    }
}

/**
 * 根据 GB/T 2828.1-2012 标准计算抽检数量
 * 正常检验一次抽样方案，检验水平II，AQL=4.0
 * @param {number} lotSize - 批量（来料数量）
 * @returns {number} 抽检数量
 */
const calculateSampleSize = (lotSize) => {
  if (!lotSize || lotSize <= 1) return 1
  
  // GB/T 2828.1 抽样表（检验水平II，一次抽样）
  if (lotSize >= 2 && lotSize <= 8) return 2
  if (lotSize >= 9 && lotSize <= 15) return 3
  if (lotSize >= 16 && lotSize <= 25) return 5
  if (lotSize >= 26 && lotSize <= 50) return 8
  if (lotSize >= 51 && lotSize <= 90) return 13
  if (lotSize >= 91 && lotSize <= 150) return 20
  if (lotSize >= 151 && lotSize <= 280) return 32
  if (lotSize >= 281 && lotSize <= 500) return 50
  if (lotSize >= 501 && lotSize <= 1200) return 80
  if (lotSize >= 1201 && lotSize <= 3200) return 125
  if (lotSize >= 3201 && lotSize <= 10000) return 200
  if (lotSize >= 10001 && lotSize <= 35000) return 315
  if (lotSize >= 35001 && lotSize <= 150000) return 500
  if (lotSize >= 150001 && lotSize <= 500000) return 800
  if (lotSize >= 500001) return 1250
  
  return 1
}

const handleTypeChange = async (val) => {
    if (temp.details && temp.details.length > 0) {
        try {
            await ElMessageBox.confirm(
                '切换类型将重置当前的检验项目，是否继续？',
                '提示',
                { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
            )
        } catch {
            return
        }
    }
    
    // Regenerate data
    generateData(temp.SamplingQuantity)
    fetchNewReportNo(temp.Type)
}

const fetchNewReportNo = async (category) => {
    if (!category || isEdit.value) return // Don't change ReportNo in edit mode automatically
    try {
        const res = await generateReportNo(category)
        if (res.success) {
            temp.ReportNo = res.reportNo
        }
    } catch (e) {
        console.error(e)
    }
}

const handleMaterialSelect = (row) => {
    selectedMaterial.value = row
    temp.Supplier = row.Supplier
    temp.ProductName = row.ProductName
    temp.Specification = row.Specification
    temp.Quantity = row.Quantity
    temp.Unit = row.Unit
    temp.ArrivalDate = row.InboundDate
    temp.PONumber = row.PONumber
    // temp.ReportNo = row.BatchNo // Deprecated: Use new rule
    
    // Set Type based on Category
    temp.Type = row.Category || '其他' 
    if (!temp.Type || temp.Type === '其他') {
        temp.Type = inferCategory(row.ProductName)
    }

    fetchNewReportNo(temp.Type)

    // ERP data is usually in Meters (Quantity), but we need Rolls/Boxes (PackageCount) for sampling.
    // ERP doesn't provide PackageCount, so we reset it and ask user to input.
    temp.PackageCount = undefined 
    temp.SamplingQuantity = undefined
    
    generateData(5)
}

const inferCategory = (name) => {
    if (!name) return '其他';
    name = name.toLowerCase();
    if (name.includes('纸')) return '纸张';
    if (name.includes('膜') || name.includes('bopp') || name.includes('pet')) return '膜类';
    if (name.includes('墨') || name.includes('胶') || name.includes('液') || name.includes('剂')) return '化学辅料';
    return '其他';
}

const generateData = async (sampleSize) => {
    // If we have a selected material, we might prefer its Category, but user might have manually changed Type.
    // So use temp.Type as priority for generation category.
    const category = temp.Type || (selectedMaterial.value ? selectedMaterial.value.Category : '其他')
    
    try {
        const res = await generateInspectionData({
            category: category,
            sampleSize: sampleSize || temp.SamplingQuantity || 5
        })
        if (res.success) {
            temp.details = res.data
            ElMessage.success('已根据物料类型自动生成检验项目')
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('生成数据失败')
    }
}

const handleRegenerateData = () => {
    if (!temp.SamplingQuantity) {
        ElMessage.warning('请先确认抽样数')
        return
    }
    
    ElMessageBox.confirm(
        '重新生成将覆盖当前的检验项目和数据，是否继续？',
        '提示',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
        generateData(temp.SamplingQuantity)
    }).catch(() => {})
}

const temp = reactive({
  ID: undefined,
  ReportNo: '',
  Supplier: '',
  ProductName: '',
  Specification: '',
  Quantity: 0,
  ArrivalDate: dayjs().format('YYYY-MM-DD'),
  SamplingQuantity: 1,
  InspectionBasis: '',
  PONumber: '',
  Type: '',
  TestImages: '',
  ReportResult: '合格',
  ReportRemark: '',
  Inspector: userStore.user?.username || '',
  InspectionDate: dayjs().format('YYYY-MM-DD'),
  Auditor: '',
  AuditDate: '',
  Status: 'Saved',
  details: []
})

const fileList = ref([])
const previewVisible = ref(false)
const previewImage = ref('')

const rules = {
  Supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  ProductName: [{ required: true, message: '请输入品名', trigger: 'blur' }]
}

// Sample Logic
const sampleDialogVisible = ref(false)
const currentDetail = ref(null)

onMounted(async () => {
    // 1. Fetch Inspection Items
    try {
        const res = await getInspectionItems()
        inspectionItems.value = res.data
    } catch (e) {
        console.error(e)
    }

    // 2. If Edit Mode, Fetch Detail
    if (isEdit.value) {
        const id = route.params.id
        try {
            const res = await getIncomingReportDetail(id)
            Object.assign(temp, res.data)
            
            // Handle Images
            if (temp.TestImages) {
                const images = temp.TestImages.split(',')
                fileList.value = images.map((url, index) => ({
                    name: `Image ${index+1}`,
                    url: url
                }))
            }
        } catch (e) {
            console.error(e)
            ElMessage.error('加载报告详情失败')
        }
    } else {
        // Create Mode: Auto-fetch recent materials
        if (!materialSearch.startDate) {
            materialSearch.startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
            materialSearch.endDate = dayjs().format('YYYY-MM-DD')
        }
        handleMaterialSearch()
    }
})

const goBack = () => {
    router.back()
}

// Image Handling
const handleImageChange = (file, fileListRef) => {
    fileList.value = fileListRef
}
const handleImageRemove = (file, fileListRef) => {
    fileList.value = fileListRef
}

// Detail Logic
const handleAddDetail = () => {
    temp.details.push({
        ItemID: null,
        ItemName: '',
        InspectionContent: '',
        SingleItemJudgment: '合格',
        ResultJudgment: '',
        ItemRemark: '',
        DataType: 'Normal',
        InspectionStandard: '',
        AcceptanceCriteria: '',
        SampleValues: [],
        Unit: '',
        SubMethod: ''
    })
}

const handleItemChange = (val, row) => {
    const item = inspectionItems.value.find(i => i.ID === val)
    if (item) {
        row.ItemName = item.ItemName
        row.DataType = item.DataType
        row.InspectionContent = item.Description 
        row.InspectionStandard = item.InspectionStandard
        row.AcceptanceCriteria = item.AcceptanceCriteria
        row.SampleValues = [] 
        
        if (item.DataType === 'Dimension') {
            row.SubMethod = 'LW'
            row.Unit = 'mm'
        } else if (item.DataType === 'Force') {
            row.Unit = 'N'
        } else if (item.DataType === 'InitialAdhesion') {
            row.Unit = '#'
        } else if (item.DataType === 'HoldingPower') {
            row.Unit = 'h'
        }
    }
}

const isSpecialType = (type) => {
    return ['Dimension', 'InitialAdhesion', 'HoldingPower', 'Force'].includes(type)
}

const openSampleDialog = (row) => {
    currentDetail.value = row
    
    // Check if we need to regenerate samples
    // 1. If empty
    let shouldRegenerate = !row.SampleValues || row.SampleValues.length === 0;
    
    // 2. If contains invalid data format (e.g., strings from backend when we need numbers)
    if (!shouldRegenerate && !isReadOnly.value) {
        if (row.DataType === 'HoldingPower' || (row.ItemName && row.ItemName.includes('持粘性'))) {
             // Backend might return "≥ 24h", but we need numbers for input
             if (row.SampleValues.some(v => typeof v === 'string' && isNaN(Number(v)))) {
                 console.log('Detected invalid string samples for HoldingPower, regenerating...')
                 shouldRegenerate = true;
             }
        } else if (row.DataType === 'InitialAdhesion' || (row.ItemName && row.ItemName.includes('初粘性'))) {
             // Backend might return "8#", but we need numbers
             if (row.SampleValues.some(v => typeof v === 'string')) {
                 console.log('Detected string samples for InitialAdhesion, regenerating...')
                 shouldRegenerate = true;
             }
        }
    }

    // Auto-generate samples if needed
    if (shouldRegenerate && !isReadOnly.value) {
        console.log('Attempting to generate samples...')
        const newSamples = []
        
        if (row.DataType === 'InitialAdhesion' || (row.ItemName && row.ItemName.includes('初粘性'))) {
            // Parse min value from criteria (e.g., "≥ 8#")
            let minVal = 8
            if (row.AcceptanceCriteria) {
                const match = row.AcceptanceCriteria.match(/(\d+)\s*#/)
                if (match) {
                    minVal = parseInt(match[1])
                    if (isNaN(minVal)) minVal = 8
                }
            }
            
            // Generate 5 random integers between minVal and 12
            for (let i = 0; i < 5; i++) {
                // Ensure we don't exceed 12, and if minVal > 12 (unlikely for ball number), just use minVal
                const maxVal = Math.max(12, minVal)
                const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal
                newSamples.push(val)
            }
        } else if (row.DataType === 'HoldingPower' || (row.ItemName && row.ItemName.includes('持粘性'))) {
            // Parse min value from criteria (e.g., "≥ 24h")
            let minVal = 24
            if (row.AcceptanceCriteria) {
                const match = row.AcceptanceCriteria.match(/(\d+(\.\d+)?)/)
                if (match) {
                    minVal = parseFloat(match[1])
                    if (isNaN(minVal)) minVal = 24
                }
            }
            
            // Generate 5 random numbers >= minVal (e.g., minVal to minVal + 5)
            for (let i = 0; i < 5; i++) {
                const val = Number((minVal + Math.random() * 5).toFixed(1))
                newSamples.push(val)
            }
        }
        
        if (newSamples.length > 0) {
            // Use splice to ensure reactivity if it's an array
            if (Array.isArray(row.SampleValues)) {
                row.SampleValues.splice(0, row.SampleValues.length, ...newSamples)
            } else {
                row.SampleValues = newSamples
            }
        }
    }
    
    // Ensure SampleValues is initialized if it was null
    if (!row.SampleValues) {
         row.SampleValues = [] 
    }
    sampleDialogVisible.value = true
}

const addSample = () => {
    if (currentDetail.value.SampleValues.length >= 5) return
    
    if (currentDetail.value.DataType === 'Dimension' && currentDetail.value.SubMethod === 'LW') {
        currentDetail.value.SampleValues.push({ l: 0, w: 0 })
    } else if (currentDetail.value.DataType === 'Dimension' && currentDetail.value.SubMethod === 'Diameter') {
        currentDetail.value.SampleValues.push({ d: 0 })
    } else {
        currentDetail.value.SampleValues.push(0)
    }
}

const removeSample = (index) => {
    currentDetail.value.SampleValues.splice(index, 1)
}

const resetSamples = () => {
    currentDetail.value.SampleValues = []
}

const handleUnitChange = (val) => {
    if (currentDetail.value.DataType === 'Force' && currentDetail.value.SampleValues.length > 0) {
        ElMessage.info('切换单位后请重新确认数值')
    }
}

const confirmSamples = () => {
    const row = currentDetail.value
    const samples = row.SampleValues
    
    if (samples.length === 0) {
        row.ResultJudgment = ''
        sampleDialogVisible.value = false
        return
    }

    let resultStr = ''
    
    if (row.DataType === 'Dimension') {
        if (row.SubMethod === 'LW') {
            const sumL = samples.reduce((acc, cur) => acc + (cur.l || 0), 0)
            const sumW = samples.reduce((acc, cur) => acc + (cur.w || 0), 0)
            const avgL = (sumL / samples.length).toFixed(2)
            const avgW = (sumW / samples.length).toFixed(2)
            resultStr = `${avgL}x${avgW}${row.Unit}`
        } else {
            const sum = samples.reduce((acc, cur) => acc + (cur.d || 0), 0)
            const avg = (sum / samples.length).toFixed(2)
            resultStr = `Ø${avg}${row.Unit}`
        }
    } else if (row.DataType === 'InitialAdhesion') {
        const min = Math.min(...samples)
        resultStr = `${min}${row.Unit}`
    } else if (row.DataType === 'HoldingPower') {
        const min = Math.min(...samples)
        resultStr = `${min}${row.Unit}`
    } else if (row.DataType === 'Force') {
        const sum = samples.reduce((acc, cur) => acc + Number(cur), 0)
        const avg = (sum / samples.length).toFixed(2)
        resultStr = `${avg}${row.Unit}`
    }
    
    row.ResultJudgment = resultStr
    sampleDialogVisible.value = false
}

const createData = () => {
    dataForm.value.validate(async (valid) => {
        if (valid) {
             const formData = new FormData()
            formData.append('data', JSON.stringify(temp))
            fileList.value.forEach(file => {
                if (file.raw) {
                    formData.append('files', file.raw)
                }
            })
            
            try {
                await createIncomingReport(formData)
                ElMessage.success('创建成功')
                goBack()
            } catch (e) {
                console.error(e)
            }
        }
    })
}

const updateData = () => {
    dataForm.value.validate(async (valid) => {
        if (valid) {
             const formData = new FormData()
            formData.append('data', JSON.stringify(temp))
            fileList.value.forEach(file => {
                if (file.raw) {
                    formData.append('files', file.raw)
                }
            })
            
            try {
                await updateIncomingReport(temp.ID, formData)
                ElMessage.success('更新成功')
                goBack()
            } catch (e) {
                console.error(e)
            }
        }
    })
}
</script>

<style scoped>
.page-header {
    margin-bottom: 20px;
    background: #fff;
    padding: 15px;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.box-card {
    margin-bottom: 20px;
}

.section-container {
    margin-bottom: 30px;
}

.section-title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 15px;
    padding-left: 10px;
    border-left: 4px solid #409EFF;
}

.section-content {
    padding: 0 10px;
}

.footer-actions {
    margin-top: 30px;
    text-align: center;
}
</style>
