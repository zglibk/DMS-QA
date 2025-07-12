<template>
  <div class="complaint-form-dialog">
    <!-- 固定标题栏 -->
    <div class="dialog-header">
      <h2 class="dialog-title">新增投诉</h2>
    </div>

    <!-- 表单内容区域 -->
    <div class="dialog-content">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" class="centered-form">
      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">基本信息</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="投诉日期" prop="Date">
              <el-date-picker v-model="form.Date" type="date" style="width: 160px" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="客户编号" prop="Customer">
              <el-input v-model="form.Customer" style="width: 140px" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="工单号" prop="OrderNo">
              <el-input v-model="form.OrderNo" style="width: 140px" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="ProductName">
              <el-input v-model="form.ProductName" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="规格型号">
              <el-input v-model="form.Specification" style="width: 180px" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="发生车间" prop="Workshop">
              <el-select v-model="form.Workshop" filterable placeholder="请选择发生车间" style="width: 160px">
                <el-option v-for="item in options.workshops" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="生产数量" prop="ProductionQty">
              <el-input-number v-model="form.ProductionQty" :min="0" style="width: 120px" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="不良数量">
              <el-input-number v-model="form.DefectiveQty" :min="0" style="width: 120px" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="不良率(%)">
              <el-input-number v-model="form.DefectiveRate" :min="0" :max="100" :step="0.01" style="width: 120px" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">投诉类型</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="投诉类别" prop="ComplaintCategory">
              <el-select
                v-model="form.ComplaintCategory"
                filterable
                placeholder="请选择投诉类别"
                @change="handleComplaintCategoryChange"
                style="width: 160px"
              >
                <el-option v-for="item in options.complaintCategories" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客诉类型">
              <el-select
                v-model="form.CustomerComplaintType"
                filterable
                placeholder="请选择客诉类型"
                :disabled="form.ComplaintCategory !== '客诉'"
                style="width: 160px"
              >
                <el-option v-for="item in options.customerComplaintTypes" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">不良信息</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="不良类别" prop="DefectiveCategory">
              <el-select
                v-model="form.DefectiveCategory"
                filterable
                placeholder="请选择不良类别"
                @change="handleCategoryChange"
                value-key="ID"
                style="width: 160px"
              >
                <el-option
                  v-for="item in options.defectiveCategories"
                  :key="item.ID"
                  :label="item.Name"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="不良项" prop="DefectiveItem">
              <el-select v-model="form.DefectiveItem" filterable placeholder="请选择不良项" style="width: 160px">
                <el-option v-for="item in options.defectiveItems" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="不良描述" prop="DefectiveDescription">
              <el-input v-model="form.DefectiveDescription" type="textarea" style="width: 600px" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="附件文件">
              <el-input v-model="form.AttachmentFile" readonly style="width: 400px" />
              <el-button @click="selectFile" style="margin-left: 10px">选择文件</el-button>
              <img v-if="isImage(form.AttachmentFile)" :src="form.AttachmentFile" alt="图片预览" style="max-width: 100px; max-height: 100px; margin-left: 10px; cursor: pointer;" @click="handlePreviewImg(form.AttachmentFile)" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="不良原因">
              <el-input v-model="form.DefectiveReason" type="textarea" style="width: 600px" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">处置与补充</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="处置措施" prop="Disposition">
              <el-input v-model="form.Disposition" type="textarea" style="width: 600px" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="退货">
              <el-switch v-model="form.ReturnGoods" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="是否补印">
              <el-switch v-model="form.IsReprint" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补印数量">
              <el-input-number v-model="form.ReprintQty" :min="0" style="width: 120px" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 材料和成本 -->
      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">材料和成本</div>
        </template>

        <el-tabs v-model="activeMaterialTab" type="border-card" class="material-tabs">
          <!-- 纸张标签页 -->
          <el-tab-pane label="纸张" name="paper">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="纸张名称">
                  <el-select
                    v-model="form.Paper"
                    filterable
                    allow-create
                    placeholder="请选择或输入纸张名称"
                    style="width: 100%"
                    @change="handleMaterialChange('Paper', $event)"
                    :loading="materialLoading"
                  >
                    <el-option
                      v-for="material in materialNames"
                      :key="material"
                      :label="material"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="纸张规格">
                  <el-input v-model="form.PaperSpecification" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="纸张数量">
                  <el-input-number v-model="form.PaperQty" :min="0" style="width: 200px" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="纸张单价">
                  <el-input-number
                    v-model="form.PaperUnitPrice"
                    :min="0"
                    :step="0.01"
                    style="width: 200px"
                    placeholder="自动获取或手动输入"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 材料A标签页 -->
          <el-tab-pane label="材料A" name="materialA">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="材料A名称">
                  <el-select
                    v-model="form.MaterialA"
                    filterable
                    allow-create
                    placeholder="请选择或输入材料A名称"
                    style="width: 100%"
                    @change="handleMaterialChange('MaterialA', $event)"
                    :loading="materialLoading"
                  >
                    <el-option
                      v-for="material in materialNames"
                      :key="material"
                      :label="material"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="材料A规格">
                  <el-input v-model="form.MaterialASpec" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料A数量">
                  <el-input-number v-model="form.MaterialAQty" :min="0" style="width: 200px" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料A单价">
                  <el-input-number
                    v-model="form.MaterialAUnitPrice"
                    :min="0"
                    :step="0.01"
                    style="width: 200px"
                    placeholder="自动获取或手动输入"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 材料B标签页 -->
          <el-tab-pane label="材料B" name="materialB">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="材料B名称">
                  <el-select
                    v-model="form.MaterialB"
                    filterable
                    allow-create
                    placeholder="请选择或输入材料B名称"
                    style="width: 100%"
                    @change="handleMaterialChange('MaterialB', $event)"
                    :loading="materialLoading"
                  >
                    <el-option
                      v-for="material in materialNames"
                      :key="material"
                      :label="material"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="材料B规格">
                  <el-input v-model="form.MaterialBSpec" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料B数量">
                  <el-input-number v-model="form.MaterialBQty" :min="0" style="width: 200px" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料B单价">
                  <el-input-number
                    v-model="form.MaterialBUnitPrice"
                    :min="0"
                    :step="0.01"
                    style="width: 200px"
                    placeholder="自动获取或手动输入"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 材料C标签页 -->
          <el-tab-pane label="材料C" name="materialC">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="材料C名称">
                  <el-select
                    v-model="form.MaterialC"
                    filterable
                    allow-create
                    placeholder="请选择或输入材料C名称"
                    style="width: 100%"
                    @change="handleMaterialChange('MaterialC', $event)"
                    :loading="materialLoading"
                  >
                    <el-option
                      v-for="material in materialNames"
                      :key="material"
                      :label="material"
                      :value="material"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="材料C规格">
                  <el-input v-model="form.MaterialCSpec" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料C数量">
                  <el-input-number v-model="form.MaterialCQty" :min="0" style="width: 200px" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料C单价">
                  <el-input-number
                    v-model="form.MaterialCUnitPrice"
                    :min="0"
                    :step="0.01"
                    style="width: 200px"
                    placeholder="自动获取或手动输入"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- 质量成本损失 -->
      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">质量成本损失</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="人工成本">
              <el-input-number v-model="form.LaborCost" :min="0" :step="0.01" style="width: 240px" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总成本">
              <el-input-number v-model="form.TotalCost" :min="0" :step="0.01" style="width: 240px" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 责任与考核 -->
      <el-card shadow="always" class="form-card">
        <template #header>
          <div class="form-card-header">责任与考核</div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="主责部门" prop="MainDept">
              <el-select v-model="form.MainDept" filterable placeholder="请选择主责部门" style="width: 160px">
                <el-option v-for="item in options.departments" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主责人" prop="MainPerson">
              <el-select v-model="form.MainPerson" filterable placeholder="请选择主责人" style="width: 140px">
                <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主责考核金额">
              <el-input-number v-model="form.MainPersonAssessment" :min="0" :step="0.01" style="width: 120px" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="次责人">
              <el-select v-model="form.SecondPerson" filterable placeholder="请选择次责人" style="width: 140px">
                <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="次责考核金额">
              <el-input-number v-model="form.SecondPersonAssessment" :min="0" :step="0.01" style="width: 120px" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="责任主管">
              <el-select v-model="form.Manager" filterable placeholder="请选择责任主管" style="width: 140px">
                <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主管考核金额">
              <el-input-number v-model="form.ManagerAssessment" :min="0" :step="0.01" style="width: 120px" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="考核说明">
              <el-input v-model="form.AssessmentDescription" type="textarea" style="width: 600px" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 底部按钮 -->
      <div class="form-actions">
        <el-button @click="$emit('cancel')">
          <el-icon style="margin-right: 6px;"><Close /></el-icon>
          取消
        </el-button>
        <el-button @click="resetForm">
          <el-icon style="margin-right: 6px;"><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" @click="submitForm" :loading="loading">
          <el-icon style="margin-right: 6px;"><Check /></el-icon>
          提交
        </el-button>
      </div>
    </el-form>
    </div> <!-- 关闭 dialog-content -->

    <!-- 图片预览遮罩和弹窗 -->
    <div v-if="showPreview" class="img-preview-mask" @click.self="showPreview = false">
      <div class="img-preview-box">
        <el-icon class="img-preview-close" @click="showPreview = false"><CircleClose /></el-icon>
        <img :src="previewImgUrl" class="img-preview-large" @click.stop @dblclick="showPreview = false" />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 投诉记录表单对话框组件
 *
 * 功能说明：
 * 1. 投诉记录的新增和编辑表单
 * 2. 材料选择时自动获取单价
 * 3. 表单验证和数据提交
 * 4. 文件上传和附件管理
 */

import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'
import { CircleClose, Close, RefreshLeft, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 定义事件
const emit = defineEmits(['success', 'cancel'])

const formRef = ref()
const activeMaterialTab = ref('paper') // 默认显示纸张标签页
const form = ref({
  Date: '',
  Customer: '',
  OrderNo: '',
  ProductName: '',
  Specification: '',
  Workshop: '',
  ProductionQty: 0,
  DefectiveQty: 0,
  DefectiveRate: 0,
  ComplaintCategory: '',
  CustomerComplaintType: '',
  DefectiveCategory: null,
  DefectiveItem: '',
  DefectiveDescription: '',
  AttachmentFile: '',
  DefectiveReason: '',
  Disposition: '',
  ReturnGoods: false,
  IsReprint: false,
  ReprintQty: 0,
  Paper: '',
  PaperSpecification: '',
  PaperQty: 0,
  PaperUnitPrice: 0,
  MaterialA: '',
  MaterialASpec: '',
  MaterialAQty: 0,
  MaterialAUnitPrice: 0,
  MaterialB: '',
  MaterialBSpec: '',
  MaterialBQty: 0,
  MaterialBUnitPrice: 0,
  MaterialC: '',
  MaterialCSpec: '',
  MaterialCQty: 0,
  MaterialCUnitPrice: 0,
  LaborCost: 0,
  TotalCost: 0,
  MainDept: '',
  MainPerson: '',
  MainPersonAssessment: 0,
  SecondPerson: '',
  SecondPersonAssessment: 0,
  Manager: '',
  ManagerAssessment: 0,
  AssessmentDescription: ''
})

const rules = {
  Date: [ { required: true, message: '请选择日期', trigger: 'blur' } ],
  Customer: [ { required: true, message: '请输入客户', trigger: 'blur' } ],
  OrderNo: [ { required: true, message: '请输入工单号', trigger: 'blur' } ],
  ProductName: [ { required: true, message: '请输入产品名称', trigger: 'blur' } ],
  Workshop: [ { required: true, message: '请选择车间', trigger: 'change' } ],
  ProductionQty: [ { required: true, message: '请输入生产数', trigger: 'blur' } ],
  ComplaintCategory: [ { required: true, message: '请选择投诉类别', trigger: 'change' } ],
  DefectiveCategory: [ { required: true, message: '请选择不良类别', trigger: 'change' } ],
  DefectiveDescription: [ { required: true, message: '请输入不良描述', trigger: 'blur' } ],
  DefectiveItem: [ { required: true, message: '请选择不良项', trigger: 'change' } ],
  Disposition: [ { required: true, message: '请输入处置措施', trigger: 'blur' } ]
}

const options = reactive({
  workshops: [],
  departments: [],
  persons: [],
  complaintCategories: [],
  customerComplaintTypes: [],
  defectiveCategories: [],
  defectiveItems: []
})

/**
 * 材料相关的响应式数据
 */
// 材料名称列表（用于下拉选择）
const materialNames = ref([])
// 材料数据加载状态
const materialLoading = ref(false)
// 单价获取缓存（避免重复请求）
const priceCache = reactive({})

const loading = ref(false)

/**
 * 获取表单下拉选项数据
 */
const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 转换数据格式：从 [{Name: "xxx"}] 转换为 ["xxx"]
    const data = res.data;
    options.workshops = data.workshops?.map(item => item.Name) || [];
    options.departments = data.departments?.map(item => item.Name) || [];
    options.persons = data.persons?.map(item => item.Name) || [];
    options.complaintCategories = data.complaintCategories?.map(item => item.Name) || [];
    options.customerComplaintTypes = data.customerComplaintTypes?.map(item => item.Name) || [];
    // 不良类别需要保持对象格式，因为需要ID来获取不良项
    options.defectiveCategories = data.defectiveCategories || [];
    options.defectiveItems = []; // 初始为空，根据不良类别动态加载

  } catch (error) {
    ElMessage.error('获取下拉选项失败: ' + (error.response?.data?.message || error.message));
  }
}

/**
 * 获取材料名称列表
 *
 * 功能：从材料价格表获取所有可用的材料名称
 * 用途：为材料选择下拉框提供数据源
 */
const fetchMaterialNames = async () => {
  try {
    materialLoading.value = true;
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/admin/material-prices/material-names', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.success) {
      materialNames.value = res.data.data || [];
    }
  } catch (error) {
    // 不显示错误消息，因为这不是关键功能
  } finally {
    materialLoading.value = false;
  }
}

/**
 * 处理材料选择变更事件
 *
 * 功能：当用户选择材料时，自动获取并填入对应的单价
 *
 * @param {string} materialType - 材料类型（Paper, MaterialA, MaterialB, MaterialC）
 * @param {string} materialName - 选择的材料名称
 */
const handleMaterialChange = async (materialType, materialName) => {
  if (!materialName) {
    return;
  }

  // 检查缓存
  const cacheKey = materialName;
  if (priceCache[cacheKey]) {
    setMaterialPrice(materialType, priceCache[cacheKey]);
    // 如果是纸张，触发人工成本计算
    if (materialType === 'Paper') {
      calculateLaborCost();
    }
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/admin/material-prices/get-price', {
      params: { materialName },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.success) {
      const priceData = res.data.data;

      // 如果返回的是数组（多个供应商），取第一个
      const price = Array.isArray(priceData) ? priceData[0] : priceData;

      if (price && price.unitPrice !== null && price.unitPrice !== undefined) {
        // 检查价格是否为0
        if (price.unitPrice === 0) {
          // 价格为0时的提示
          ElMessage.warning(`材料"${materialName}"的单价为0，请联系管理员新增或更新价格信息`);
          // 清空价格字段
          clearMaterialPrice(materialType);
        } else {
          // 缓存价格信息
          priceCache[cacheKey] = price;

          // 设置单价
          setMaterialPrice(materialType, price);

          // 如果是纸张，触发人工成本计算
          if (materialType === 'Paper') {
            calculateLaborCost();
          }

          // 显示成功消息
          ElMessage.success(`已自动填入${materialName}的单价：￥${price.unitPrice}`);
        }
      } else {
        // 价格为null或undefined时的提示
        ElMessage.warning(`未找到材料"${materialName}"的价格信息，请联系管理员新增价格数据`);
        // 清空价格字段
        clearMaterialPrice(materialType);
      }
    } else {
      ElMessage.warning(`未找到材料"${materialName}"的价格信息，请联系管理员新增价格数据`);
      // 清空价格字段
      clearMaterialPrice(materialType);
    }
  } catch (error) {
    ElMessage.warning(`获取材料"${materialName}"价格失败，请联系管理员新增价格数据`);
    // 清空价格字段
    clearMaterialPrice(materialType);
  }
}

/**
 * 设置材料单价
 *
 * @param {string} materialType - 材料类型
 * @param {object} priceInfo - 价格信息对象
 */
const setMaterialPrice = (materialType, priceInfo) => {
  const priceFieldMap = {
    'Paper': 'PaperUnitPrice',
    'MaterialA': 'MaterialAUnitPrice',
    'MaterialB': 'MaterialBUnitPrice',
    'MaterialC': 'MaterialCUnitPrice'
  };

  const priceField = priceFieldMap[materialType];
  if (priceField && priceInfo.unitPrice !== null) {
    form.value[priceField] = priceInfo.unitPrice;
    // 单价变化后，触发总成本计算
    calculateTotalCost();
  }
}

/**
 * 清空材料单价
 *
 * @param {string} materialType - 材料类型
 */
const clearMaterialPrice = (materialType) => {
  const priceFieldMap = {
    'Paper': 'PaperUnitPrice',
    'MaterialA': 'MaterialAUnitPrice',
    'MaterialB': 'MaterialBUnitPrice',
    'MaterialC': 'MaterialCUnitPrice'
  };

  const priceField = priceFieldMap[materialType];
  if (priceField) {
    form.value[priceField] = 0;
    // 单价变化后，触发总成本计算
    calculateTotalCost();
  }
}

/**
 * 计算人工成本
 * 根据纸张数量和车间类型自动计算人工成本
 *
 * 计算规则：
 * - 柔印机：70元/千米
 * - 轮转机：45元/千米
 * - 其他机台：35元/千米
 *
 * 分段计算：
 * - ≤1000米：基础单价 × 1
 * - ≤2000米：基础单价 × 2
 * - ≤3000米：基础单价 × 3
 * - >3000米：向上取整(长度/1000) × 基础单价
 */
const calculateLaborCost = () => {
  const paperQty = form.value.PaperQty; // 纸张数量（长度）
  const workshop = form.value.Workshop; // 发生车间

  // 如果纸张数量或车间为空，清空人工成本
  if (!paperQty || !workshop) {
    form.value.LaborCost = 0;
    calculateTotalCost(); // 触发总成本重新计算
    return;
  }

  // 确保纸张数量是数字
  const length = Number(paperQty);
  if (isNaN(length) || length <= 0) {
    form.value.LaborCost = 0;
    calculateTotalCost(); // 触发总成本重新计算
    return;
  }

  // 根据车间类型确定基础单价（元/千米）
  let basePrice = 35; // 默认其他机台
  if (workshop.includes('柔印机')) {
    basePrice = 70;
  } else if (workshop.includes('轮转机')) {
    basePrice = 45;
  }

  // 根据长度分段计算
  let laborCost = 0;
  if (length <= 1000) {
    laborCost = basePrice;
  } else if (length <= 2000) {
    laborCost = basePrice * 2;
  } else if (length <= 3000) {
    laborCost = basePrice * 3;
  } else {
    // 超过3000米，按千米向上取整计算
    const segments = Math.ceil(length / 1000);
    laborCost = basePrice * segments;
  }

  // 设置计算结果
  form.value.LaborCost = laborCost;

  // 人工成本变化后，触发总成本计算
  calculateTotalCost();
}

/**
 * 计算总成本
 * 根据各材料成本和人工成本自动计算总成本
 *
 * 计算公式：
 * 纸张成本 = (纸张规格/1000) × 纸张数量 × 纸张单价
 * 材料A成本 = (材料A规格/1000) × 材料A数量 × 材料A单价
 * 材料B成本 = (材料B规格/1000) × 材料B数量 × 材料B单价
 * 材料C成本 = (材料C规格/1000) × 材料C数量 × 材料C单价
 * 总成本 = 纸张成本 + 材料A成本 + 材料B成本 + 材料C成本 + 人工费用
 */
const calculateTotalCost = () => {
  // 获取表单数据
  const formData = form.value;

  // 计算纸张成本：(纸张规格/1000) × 纸张数量 × 纸张单价
  const paperCost = calculateMaterialCost(
    formData.PaperSpecification,
    formData.PaperQty,
    formData.PaperUnitPrice
  );

  // 计算材料A成本：(材料A规格/1000) × 材料A数量 × 材料A单价
  const materialACost = calculateMaterialCost(
    formData.MaterialASpec,
    formData.MaterialAQty,
    formData.MaterialAUnitPrice
  );

  // 计算材料B成本：(材料B规格/1000) × 材料B数量 × 材料B单价
  const materialBCost = calculateMaterialCost(
    formData.MaterialBSpec,
    formData.MaterialBQty,
    formData.MaterialBUnitPrice
  );

  // 计算材料C成本：(材料C规格/1000) × 材料C数量 × 材料C单价
  const materialCCost = calculateMaterialCost(
    formData.MaterialCSpec,
    formData.MaterialCQty,
    formData.MaterialCUnitPrice
  );

  // 获取人工费用
  const laborCost = Number(formData.LaborCost) || 0;

  // 计算总成本
  const totalCost = paperCost + materialACost + materialBCost + materialCCost + laborCost;

  // 四舍五入到2位小数，如果为0则保持0
  form.value.TotalCost = totalCost === 0 ? 0 : Math.round(totalCost * 100) / 100;

  // 总成本变化后，触发主责人考核计算
  calculateMainPersonAssessment();
}

/**
 * 计算主责人考核金额
 * 根据总成本自动计算主责人考核金额
 *
 * 计算规则：
 * 1. 如果总成本 > 0，则主责人考核金额 = 总成本 × 50%
 * 2. 如果主责人考核金额不足20元，则计为20元
 */
const calculateMainPersonAssessment = () => {
  const totalCost = Number(form.value.TotalCost) || 0;

  // 如果总成本为0或负数，主责人考核金额为0
  if (totalCost <= 0) {
    form.value.MainPersonAssessment = 0;
    return;
  }

  // 计算主责人考核金额：总成本 × 50%
  let assessmentAmount = totalCost * 0.5;

  // 如果考核金额不足20元，则计为20元
  if (assessmentAmount < 20) {
    assessmentAmount = 20;
  }

  // 四舍五入到2位小数
  form.value.MainPersonAssessment = Math.round(assessmentAmount * 100) / 100;
}

/**
 * 计算单个材料的成本
 *
 * @param {number} spec - 材料规格
 * @param {number} qty - 材料数量
 * @param {number} unitPrice - 材料单价
 * @returns {number} 材料成本
 */
const calculateMaterialCost = (spec, qty, unitPrice) => {
  // 转换为数字，如果无效则返回0
  const specification = Number(spec) || 0;
  const quantity = Number(qty) || 0;
  const price = Number(unitPrice) || 0;

  // 如果任何一个值为0或无效，返回0
  if (specification === 0 || quantity === 0 || price === 0) {
    return 0;
  }

  // 计算成本：(规格/1000) × 数量 × 单价
  const cost = (specification / 1000) * quantity * price;

  // 返回结果，如果计算出错则返回0
  return isNaN(cost) ? 0 : cost;
}

const handleCategoryChange = async (selectedCategory) => {
  form.value.DefectiveItem = '';
  options.defectiveItems = [];
  if (selectedCategory && selectedCategory.ID) {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/complaint/defective-items/${selectedCategory.ID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 后端直接返回字符串数组，无需转换
      options.defectiveItems = res.data || [];
    } catch (error) {
      ElMessage.error('获取不良项失败: ' + (error.response?.data?.message || error.message));
    }
  }
}

const handleComplaintCategoryChange = (val) => {
  if (val !== '客诉') {
    form.value.CustomerComplaintType = '';
  }
}

const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      const submissionData = { ...form.value };
      if (submissionData.DefectiveCategory && submissionData.DefectiveCategory.Name) {
        submissionData.DefectiveCategory = submissionData.DefectiveCategory.Name;
      }
      try {
        loading.value = true
        const token = localStorage.getItem('token');

        const res = await axios.post('/api/complaint', submissionData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && res.data.success) {
          ElMessage.success(res.data.message || '投诉登记成功');
          emit('success');
        } else {
          ElMessage.error(res.data.message || '投诉登记失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '投诉登记失败');
      } finally {
        loading.value = false
      }
    }
  });
}

const resetForm = () => {
  formRef.value.resetFields();
  options.defectiveItems = [];
}

// 附件选择与图片预览
const selectFile = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = e => {
    const file = e.target.files[0]
    if (file) {
      form.value.AttachmentFile = URL.createObjectURL(file)
    }
  }
  input.click()
}

const isImage = (path) => {
  if (!path) return false;

  // 支持blob URL
  if (path.startsWith('blob:')) return true;

  // 支持HTTP URL（新的网络路径格式）
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
  }

  // 支持本地文件路径
  return path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
}

const showPreview = ref(false)
const previewImgUrl = ref('')

function handlePreviewImg(url) {
  previewImgUrl.value = url
  showPreview.value = true
}

// 不良率自动计算
watch([
  () => form.value.ProductionQty,
  () => form.value.DefectiveQty
], ([prod, defect]) => {
  if (prod && prod !== 0) {
    form.value.DefectiveRate = Number(((defect || 0) / prod * 100).toFixed(2));
  } else {
    form.value.DefectiveRate = 0;
  }
})

// 人工成本自动计算
watch([
  () => form.value.PaperQty,
  () => form.value.Workshop
], () => {
  calculateLaborCost();
})

// 总成本自动计算
watch([
  () => form.value.PaperSpecification,
  () => form.value.PaperQty,
  () => form.value.PaperUnitPrice,
  () => form.value.MaterialASpec,
  () => form.value.MaterialAQty,
  () => form.value.MaterialAUnitPrice,
  () => form.value.MaterialBSpec,
  () => form.value.MaterialBQty,
  () => form.value.MaterialBUnitPrice,
  () => form.value.MaterialCSpec,
  () => form.value.MaterialCQty,
  () => form.value.MaterialCUnitPrice,
  () => form.value.LaborCost
], () => {
  calculateTotalCost();
})

// 主责人考核自动计算
watch(() => form.value.TotalCost, () => {
  calculateMainPersonAssessment();
})

/**
 * 组件挂载时的初始化操作
 */
onMounted(async () => {
  // 并行加载表单选项和材料名称
  await Promise.all([
    fetchOptions(),
    fetchMaterialNames()
  ]);

  // 初始化计算
  calculateLaborCost();
  calculateTotalCost();
  calculateMainPersonAssessment();
})
</script>

<style scoped>
.complaint-form-dialog {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* 固定标题栏样式 */
.dialog-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  padding: 12px 30px;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-title::before {
  content: '📝';
  font-size: 18px;
}

/* 内容区域样式 */
.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f8f9fa;
  margin-top: 50px; /* 为固定标题栏留出空间 */
  padding-bottom: 100px; /* 为底部按钮留出空间 */
}

.centered-form {
  max-width: 100%;
  margin: 0 auto;
  background: transparent;
}

.form-card {
  margin-bottom: 20px;
  border-radius: 12px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 2rem 1.5rem 1rem 1.5rem;
  background: #fff;
  border: 1px solid rgba(64, 158, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.form-card:hover {
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.form-card-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.form-card-header::before {
  content: '';
  position: absolute;
  left: -1.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: #409eff;
  border-radius: 2px;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
  border-top: 1px solid #ebeef5;
  margin-top: 20px;
  background: #fff;
  border-radius: 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.form-actions .el-button {
  min-width: 120px;
  height: 40px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.form-actions .el-button--primary {
  background: #409eff;
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.form-actions .el-button--primary:hover {
  background: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.form-actions .el-button:not(.el-button--primary) {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  color: #606266;
}

.form-actions .el-button:not(.el-button--primary):hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
  transform: translateY(-1px);
}

/* 图片预览样式 */
.img-preview-mask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-preview-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-preview-close {
  position: absolute;
  top: -1.1rem;
  right: -1.1rem;
  font-size: 2rem;
  color: #fff;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 10001;
  transition: background 0.2s;
}

.img-preview-close:hover {
  background: rgba(0,0,0,0.8);
}

.img-preview-large {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 1rem #0003;
  background: #fff;
}

/* 表单控件美化 */
.complaint-form-dialog :deep(.el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.complaint-form-dialog :deep(.el-input__wrapper):hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.complaint-form-dialog :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.complaint-form-dialog :deep(.el-select) {
  width: 100%;
}

.complaint-form-dialog :deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

.complaint-form-dialog :deep(.el-textarea__inner) {
  border-radius: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.complaint-form-dialog :deep(.el-textarea__inner):hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.complaint-form-dialog :deep(.el-textarea__inner):focus {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.complaint-form-dialog :deep(.el-input-number) {
  width: 100%;
}

.complaint-form-dialog :deep(.el-input-number .el-input__wrapper) {
  border-radius: 6px;
}

.complaint-form-dialog :deep(.el-date-editor) {
  width: 100%;
}

.complaint-form-dialog :deep(.el-date-editor .el-input__wrapper) {
  border-radius: 6px;
}

/* 开关控件美化 */
.complaint-form-dialog :deep(.el-switch) {
  --el-switch-on-color: #409eff;
  --el-switch-off-color: #dcdfe6;
}

/* 表单标签美化 */
.complaint-form-dialog :deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

/* 必填项标记美化 */
.complaint-form-dialog :deep(.el-form-item.is-required .el-form-item__label::before) {
  color: #f56c6c;
  font-weight: bold;
}

/* 材料标签页样式 */
.material-tabs {
  margin-top: 10px;
}

.material-tabs :deep(.el-tabs__header) {
  margin-bottom: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 8px;
}

.material-tabs :deep(.el-tabs__nav-wrap) {
  background: transparent;
}

.material-tabs :deep(.el-tabs__item) {
  border-radius: 6px;
  margin-right: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

.material-tabs :deep(.el-tabs__item:hover) {
  background: #ecf5ff;
  color: #409eff;
}

.material-tabs :deep(.el-tabs__item.is-active) {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.material-tabs :deep(.el-tabs__content) {
  padding: 20px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.material-tabs :deep(.el-tab-pane) {
  min-height: 120px;
}
</style>
