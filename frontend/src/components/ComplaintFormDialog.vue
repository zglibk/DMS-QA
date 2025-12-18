<template>
  <el-dialog
    v-model="dialogVisible"
    :title="props.editData ? '编辑投诉' : '新增投诉'"
    width="50%"
    :close-on-click-modal="false"
    destroy-on-close
    class="complaint-dialog"
    append-to-body
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" class="compact-form" label-position="right" size="default">
      
      <!-- 基本信息 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon-wrapper"><el-icon><InfoFilled /></el-icon></span>
          <span>基本信息</span>
        </div>
        <div class="section-body">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="投诉日期" prop="Date">
                <el-date-picker v-model="form.Date" type="date" style="width: 100%" placeholder="选择日期"/>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="客户编号" prop="Customer">
                <el-input v-model="form.Customer" placeholder="输入客户编号"/>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="工单号" prop="OrderNo">
                <el-input v-model="form.OrderNo" placeholder="输入工单号"/>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="发生车间" prop="Workshop">
                <el-select v-model="form.Workshop" filterable placeholder="选择车间" style="width: 100%">
                  <el-option v-for="item in options.workshops" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="生产数量" prop="ProductionQty">
                <el-input-number v-model="form.ProductionQty" :min="0" style="width: 100%" controls-position="right"/>
              </el-form-item>
            </el-col>
            <el-col :span="9">
              <el-form-item label="产品名称" prop="ProductName">
                <el-input v-model="form.ProductName" placeholder="输入产品名称"/>
              </el-form-item>
            </el-col>
            <el-col :span="9">
              <el-form-item label="规格型号">
                <el-input v-model="form.Specification" placeholder="输入规格型号"/>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 不良详情 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon-wrapper warning"><el-icon><WarningFilled /></el-icon></span>
          <span>不良详情</span>
        </div>
        <div class="section-body">
          <el-row :gutter="20">
            <!-- 左侧表单区域 -->
            <el-col :span="16">
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="投诉类别" prop="ComplaintCategory">
                    <el-select
                      v-model="form.ComplaintCategory"
                      filterable
                      placeholder="选择类别"
                      @change="handleComplaintCategoryChange"
                      style="width: 100%"
                    >
                      <el-option v-for="item in options.complaintCategories" :key="item" :label="item" :value="item" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="客诉类型">
                    <el-select
                      v-model="form.CustomerComplaintType"
                      filterable
                      placeholder="选择类型"
                      :disabled="form.ComplaintCategory !== '客诉'"
                      style="width: 100%"
                    >
                      <el-option v-for="item in options.customerComplaintTypes" :key="item" :label="item" :value="item" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="不良类别" prop="DefectiveCategory">
                    <el-select
                      v-model="form.DefectiveCategory"
                      filterable
                      placeholder="选择类别"
                      @change="handleCategoryChange"
                      value-key="ID"
                      style="width: 100%"
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
                <el-col :span="12">
                  <el-form-item label="不良项" prop="DefectiveItem">
                    <el-select v-model="form.DefectiveItem" filterable placeholder="选择不良项" style="width: 100%">
                      <el-option v-for="item in options.defectiveItems" :key="item" :label="item" :value="item" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item label="不良数量">
                    <el-input-number v-model="form.DefectiveQty" :min="0" style="width: 100%" controls-position="right"/>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="不良率(%)">
                    <el-input-number v-model="form.DefectiveRate" :min="0" :max="100" :step="0.01" style="width: 100%" controls-position="right"/>
                  </el-form-item>
                </el-col>

                <el-col :span="24">
                  <el-form-item label="不良描述" prop="DefectiveDescription">
                    <el-input v-model="form.DefectiveDescription" placeholder="简要描述不良情况"/>
                  </el-form-item>
                </el-col>
                
                <el-col :span="24">
                  <el-form-item label="不良原因">
                    <el-input v-model="form.DefectiveReason" type="textarea" :rows="3" placeholder="详细分析不良原因"/>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-col>
            
            <!-- 右侧图片上传区域 -->
            <el-col :span="8">
              <el-form-item label-width="0" class="upload-preview-container">
                <div class="attachment-upload-area">
                  <!-- 如果有图片则显示预览 -->
                  <div v-if="selectedFileInfo" class="preview-box">
                    <div v-if="selectedFileInfo.isImage" class="image-preview-wrapper" @mouseenter="showMask = true" @mouseleave="showMask = false">
                      <el-image 
                        ref="previewImage"
                        :src="selectedFileInfo.previewUrl" 
                        :preview-src-list="[selectedFileInfo.previewUrl]"
                        fit="contain"
                        class="preview-img"
                        :preview-teleported="true"
                        style="width: 100%; height: 100%;"
                      />
                      <div class="preview-mask" v-show="showMask">
                        <span class="preview-action-btn" @click="handlePreviewClick">
                          <el-icon><ZoomIn /></el-icon>
                        </span>
                        <span class="preview-action-btn" @click.stop="handleDeleteFile">
                          <el-icon><Delete /></el-icon>
                        </span>
                      </div>
                    </div>
                    <div v-else class="file-preview">
                      <el-icon class="file-icon"><Document /></el-icon>
                      <span class="file-name" :title="selectedFileInfo.generatedFileName || selectedFileInfo.fileName">
                        {{ selectedFileInfo.generatedFileName || selectedFileInfo.fileName }}
                      </span>
                    </div>
                    
                    <div class="preview-actions">
                      <span class="file-size" v-if="selectedFileInfo.fileSize">
                        {{ formatFileSize(selectedFileInfo.fileSize) }}
                      </span>
                      <el-button v-if="!selectedFileInfo.isImage" type="danger" link size="small" @click="resetFormFile">
                        移除
                      </el-button>
                    </div>
                  </div>
                  
                  <!-- 没有图片时显示上传按钮 -->
                  <div v-else class="upload-placeholder" @click="selectFile">
                    <el-icon class="upload-icon"><Plus /></el-icon>
                    <div class="upload-text">点击上传图片</div>
                    <div class="upload-tip">支持 jpg/png 格式</div>
                  </div>
                  
                  <!-- 隐藏的文件输入框 -->
                  <el-input v-model="form.AttachmentFile" v-show="false" />
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 处置与补充 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon-wrapper success"><el-icon><Tools /></el-icon></span>
          <span>处置与补充</span>
        </div>
        <div class="section-body">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="处置措施" prop="Disposition">
                <el-input v-model="form.Disposition" type="textarea" :rows="1" placeholder="输入处置措施"/>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="是否退货" label-width="80px">
                <el-switch v-model="form.ReturnGoods" active-text="是" inactive-text="否" inline-prompt/>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="是否补印" label-width="80px">
                <el-switch v-model="form.IsReprint" active-text="是" inactive-text="否" inline-prompt/>
              </el-form-item>
            </el-col>
            <el-col :span="4" v-if="form.IsReprint">
              <el-form-item label="补印数量" label-width="80px">
                <el-input-number v-model="form.ReprintQty" :min="0" controls-position="right" style="width: 100%" size="small"/>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 材料和成本 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon-wrapper primary"><el-icon><Money /></el-icon></span>
          <span>材料和成本</span>
        </div>
        <div class="section-body no-padding">
          <el-tabs v-model="activeMaterialTab" type="border-card" class="compact-tabs">
            <!-- 纸张标签页 -->
            <el-tab-pane label="纸张" name="paper">
              <div class="tab-content">
                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="纸张名称">
                      <el-select
                        v-model="form.Paper"
                        filterable
                        allow-create
                        placeholder="选择或输入"
                        style="width: 100%"
                        @change="handleMaterialChange('Paper', $event)"
                        :loading="materialLoading"
                      >
                        <el-option v-for="material in materialNames" :key="material" :label="material" :value="material"/>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="纸张规格">
                      <el-input v-model="form.PaperSpecification" placeholder="输入规格"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="纸张数量">
                      <el-input-number v-model="form.PaperQty" :min="0" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="纸张单价">
                      <el-input-number v-model="form.PaperUnitPrice" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>

            <!-- 材料A标签页 -->
            <el-tab-pane label="材料A" name="materialA">
              <div class="tab-content">
                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="材料A名称">
                      <el-select
                        v-model="form.MaterialA"
                        filterable
                        allow-create
                        placeholder="选择或输入"
                        style="width: 100%"
                        @change="handleMaterialChange('MaterialA', $event)"
                        :loading="materialLoading"
                      >
                        <el-option v-for="material in materialNames" :key="material" :label="material" :value="material"/>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料A规格">
                      <el-input v-model="form.MaterialASpec" placeholder="输入规格"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料A数量">
                      <el-input-number v-model="form.MaterialAQty" :min="0" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料A单价">
                      <el-input-number v-model="form.MaterialAUnitPrice" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>

            <!-- 材料B标签页 -->
            <el-tab-pane label="材料B" name="materialB">
              <div class="tab-content">
                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="材料B名称">
                      <el-select
                        v-model="form.MaterialB"
                        filterable
                        allow-create
                        placeholder="选择或输入"
                        style="width: 100%"
                        @change="handleMaterialChange('MaterialB', $event)"
                        :loading="materialLoading"
                      >
                        <el-option v-for="material in materialNames" :key="material" :label="material" :value="material"/>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料B规格">
                      <el-input v-model="form.MaterialBSpec" placeholder="输入规格"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料B数量">
                      <el-input-number v-model="form.MaterialBQty" :min="0" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料B单价">
                      <el-input-number v-model="form.MaterialBUnitPrice" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>

            <!-- 材料C标签页 -->
            <el-tab-pane label="材料C" name="materialC">
              <div class="tab-content">
                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="材料C名称">
                      <el-select
                        v-model="form.MaterialC"
                        filterable
                        allow-create
                        placeholder="选择或输入"
                        style="width: 100%"
                        @change="handleMaterialChange('MaterialC', $event)"
                        :loading="materialLoading"
                      >
                        <el-option v-for="material in materialNames" :key="material" :label="material" :value="material"/>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料C规格">
                      <el-input v-model="form.MaterialCSpec" placeholder="输入规格"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料C数量">
                      <el-input-number v-model="form.MaterialCQty" :min="0" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="材料C单价">
                      <el-input-number v-model="form.MaterialCUnitPrice" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>
          </el-tabs>
          
          <div class="cost-summary">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="人工成本">
                  <el-input-number v-model="form.LaborCost" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="总成本" class="total-cost-item">
                  <el-input-number v-model="form.TotalCost" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </div>

      <!-- 责任与考核 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon-wrapper danger"><el-icon><UserFilled /></el-icon></span>
          <span>责任与考核</span>
        </div>
        <div class="section-body">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="主责部门" prop="MainDept">
                <el-select v-model="form.MainDept" filterable placeholder="选择部门" style="width: 100%">
                  <el-option v-for="item in options.departments" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="主责人" prop="MainPerson">
                <el-select v-model="form.MainPerson" filterable placeholder="选择人员" style="width: 100%">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="主责考核">
                <el-input-number v-model="form.MainPersonAssessment" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="次责人">
                <el-select v-model="form.SecondPerson" filterable placeholder="选择人员" style="width: 100%">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="次责考核">
                <el-input-number v-model="form.SecondPersonAssessment" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="责任主管">
                <el-select v-model="form.Manager" filterable placeholder="选择人员" style="width: 100%">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="主管考核">
                <el-input-number v-model="form.ManagerAssessment" :min="0" :step="0.01" style="width: 100%" controls-position="right"/>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="考核说明">
                <el-input v-model="form.AssessmentDescription" placeholder="输入考核说明"/>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel" size="large">取消</el-button>
        <el-button @click="resetForm" size="large">重置</el-button>
        <el-button type="primary" @click="submitForm" :loading="loading" size="large">
          <el-icon style="margin-right: 6px;"><Check /></el-icon>
          提交保存
        </el-button>
      </div>
    </template>

    <!-- 图片预览遮罩和弹窗 -->
    <div v-if="showPreview" class="img-preview-mask" @click.self="showPreview = false">
      <div class="img-preview-box">
        <el-icon class="img-preview-close" @click="showPreview = false"><CircleClose /></el-icon>
        <img :src="previewImgUrl" class="img-preview-large" @click.stop @dblclick="showPreview = false" />
      </div>
    </div>
  </el-dialog>
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

import { ref, reactive, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import axios from 'axios'
import { CircleClose, Close, RefreshLeft, Check, Document, Plus, InfoFilled, WarningFilled, Tools, Money, UserFilled, ZoomIn, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ImagePreview from './ImagePreview.vue'
import imagePreviewService from '@/services/imagePreviewService.js'

// 定义props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editData: {
    type: Object,
    default: null
  }
})

// 定义事件
const emit = defineEmits(['success', 'cancel', 'update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

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
    const res = await axios.get('/complaint/options', {
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
    const res = await axios.get('/admin/material-prices/material-names', {
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
    const res = await axios.get('/admin/material-prices/get-price', {
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
      const res = await axios.get(`/complaint/defective-items/${selectedCategory.ID}`, {
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

        // 如果有未上传的文件，先上传文件
        if (selectedFileInfo.value && !selectedFileInfo.value.uploaded && selectedFileInfo.value.file) {
          try {
            const uploadResult = await uploadFileToServer(
              selectedFileInfo.value.file,
              selectedFileInfo.value.generatedFileName
            )

            if (uploadResult.success) {
              // 更新表单数据中的附件路径为服务器返回的路径
              submissionData.AttachmentFile = uploadResult.relativePath
            } else {
              throw new Error('文件上传失败')
            }
          } catch (uploadError) {
            ElMessage.error('文件上传失败，请重试')
            loading.value = false
            return
          }
        }

        const token = localStorage.getItem('token');

        let res
        if (props.editData && props.editData.ID) {
          // 编辑模式：使用PUT请求更新
          res = await axios.put(`/complaint/${props.editData.ID}`, submissionData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // 新增模式：使用POST请求创建
          res = await axios.post('/complaint', submissionData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }

        if (res.data && res.data.success) {
          ElMessage.success(res.data.message || (props.editData ? '投诉记录更新成功' : '投诉登记成功'));
          emit('success');
        } else {
          ElMessage.error(res.data.message || (props.editData ? '投诉记录更新失败' : '投诉登记失败'));
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || (props.editData ? '投诉记录更新失败' : '投诉登记失败'));
      } finally {
        loading.value = false
      }
    }
  });
}

const resetForm = () => {
  // 重置表单字段
  formRef.value.resetFields();
  options.defectiveItems = [];

  // 清空文件相关状态
  if (selectedFileInfo.value?.previewUrl && selectedFileInfo.value.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
  }

  // 重置文件相关变量
  selectedFileInfo.value = null
  form.value.AttachmentFile = ''

  // 重置文件上传状态
  fileUploading.value = false
}

/**
 * 移除当前选择的文件
 */
const resetFormFile = () => {
  // 清理选中文件的预览URL
  if (selectedFileInfo.value?.previewUrl && selectedFileInfo.value.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
  }
  
  // 重置文件相关变量
  selectedFileInfo.value = null
  form.value.AttachmentFile = ''
}

const handleDeleteFile = () => {
  resetFormFile();
}

/**
 * 处理取消操作
 */
const handleCancel = () => {
  // 清理资源
  cleanupResources()

  // 发送取消事件
  emit('cancel')
  
  // 关闭弹窗
  dialogVisible.value = false
}

// 附件选择与图片预览相关变量
const selectedFileInfo = ref(null)
const fileUploading = ref(false)

// 判断是否为图片文件
const isImageFile = (fileName) => {
  if (!fileName) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return imageExtensions.includes(extension)
}

// 获取API基础URL - 使用相对路径配合vite代理
const getApiBaseUrl = () => {
  // 直接返回空字符串，使用相对路径配合vite.config.js中的代理配置
  return ''
}

// 判断文件路径类型并生成正确的预览URL
const getFilePreviewUrl = (filePath, recordId = null) => {
  console.log('========================================')
  console.log('[getFilePreviewUrl] 开始处理')
  console.log('[getFilePreviewUrl] 输入路径:', filePath)
  console.log('[getFilePreviewUrl] 记录ID:', recordId)
  
  if (!filePath || filePath === '' || filePath === null || filePath === undefined) {
    console.log('[getFilePreviewUrl] 路径为空，返回null')
    return null
  }

  try {
    // 确保filePath是字符串
    const pathStr = String(filePath).trim()
    if (!pathStr) {
      console.log('[getFilePreviewUrl] 路径转换为字符串后为空')
      return null
    }

    // 如果是blob URL，直接返回
    if (pathStr.startsWith('blob:')) {
      console.log('[getFilePreviewUrl] 检测到blob URL，直接返回')
      return pathStr
    }

    // 如果是HTTP URL，直接返回
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      console.log('[getFilePreviewUrl] 检测到HTTP URL，直接返回')
      return pathStr
    }

    // 判断路径特征
    const hasFilePrefix = pathStr.includes('file_') && /file_\d+_/.test(pathStr)
    const isUploadsPath = pathStr.startsWith('uploads/') || pathStr.startsWith('./uploads/') || pathStr.startsWith('/uploads/')
    const isYearlyPath = /^\d{4}年/.test(pathStr) || pathStr.includes('年异常汇总') || pathStr.includes('不良图片')

    console.log('[getFilePreviewUrl] 路径特征分析:', {
      hasFilePrefix,
      isUploadsPath,
      isYearlyPath,
      pathStr: pathStr.substring(0, 50) + '...'
    })

    // 如果是服务器文件路径，生成静态文件URL
    if (hasFilePrefix || isUploadsPath || isYearlyPath) {
      const backendUrl = getApiBaseUrl()
      const pathParts = pathStr.split(/[\/\\]/).filter(part => part.trim() !== '')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const finalUrl = `${backendUrl}/files/attachments/${encodedPath}`
      console.log('[getFilePreviewUrl] 生成静态文件URL:', finalUrl)
      return finalUrl
    }
    
    // 如果有recordId，通过API获取
    if (recordId) {
      const apiUrl = `/api/complaint/file/${recordId}`
      console.log('[getFilePreviewUrl] 使用API URL:', apiUrl)
      return apiUrl
    }

    console.log('[getFilePreviewUrl] 无法处理的路径，返回null')
    return null
  } catch (error) {
    console.error('[getFilePreviewUrl] 处理错误:', error)
    return null
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生成文件名的函数
const generateFileName = async (originalFileName) => {
  // 检查必填字段
  const customer = form.value.Customer?.trim()
  const orderNo = form.value.OrderNo?.trim()
  const productName = form.value.ProductName?.trim()
  const defectiveCategory = form.value.DefectiveCategory?.Name?.trim()

  if (!customer || !orderNo || !productName || !defectiveCategory) {
    const missingFields = []
    if (!customer) missingFields.push('客户编号')
    if (!orderNo) missingFields.push('工单号')
    if (!productName) missingFields.push('品名')
    if (!defectiveCategory) missingFields.push('不良类别')

    throw new Error(`请先填写以下必填字段：${missingFields.join('、')}`)
  }

  try {
    // 获取流水号
    const recordDate = form.value.Date || new Date().toISOString().split('T')[0]
    const token = localStorage.getItem('token')

    const response = await axios.get('/complaint/sequence-number', {
      params: {
        date: recordDate,
        editId: props.editData?.ID // 编辑模式时传递当前记录ID
      },
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.data.success) {
      throw new Error(response.data.message || '获取流水号失败')
    }

    const sequenceNumber = String(response.data.sequenceNumber).padStart(2, '0')

    // 生成日期格式 yymmdd
    const date = new Date(recordDate)
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const dateStr = `${yy}${mm}${dd}`

    // 获取文件扩展名
    const ext = originalFileName.substring(originalFileName.lastIndexOf('.'))

    // 生成文件名：客户编号 +空格+工单号+空格+品名+短划线+不良类别+空格 +yymmdd+流水号
    const generatedName = `${customer} ${orderNo} ${productName}-${defectiveCategory} ${dateStr}${sequenceNumber}${ext}`

    return generatedName
  } catch (error) {
    console.error('生成文件名失败:', error)
    throw error
  }
}

// 附件选择（延迟上传模式：选择时不上传，保存时才上传）
const selectFile = async () => {
  // 点击选择图片时立即检查必填项
  const requiredFields = [
    { field: 'Date', name: '投诉日期' },
    { field: 'Customer', name: '客户编号' },
    { field: 'OrderNo', name: '工单号' },
    { field: 'ProductName', name: '产品名称' },
    { field: 'DefectiveCategory', name: '不良类别' }
  ]

  const missingFields = []
  for (const { field, name } of requiredFields) {
    const value = form.value[field]
    let isEmpty = false

    console.log(`检查字段 ${name} (${field}):`, {
      value: value,
      type: typeof value,
      isDate: value instanceof Date,
      isValidDate: value instanceof Date ? !isNaN(value.getTime()) : 'N/A'
    })

    if (!value) {
      isEmpty = true
    } else if (typeof value === 'string' && !value.trim()) {
      isEmpty = true
    } else if (value instanceof Date && isNaN(value.getTime())) {
      isEmpty = true
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      // 处理对象类型（如不良类别）
      isEmpty = !value.Name || !value.Name.trim()
    }
    if (isEmpty) {
      missingFields.push(name)
    }
  }

  if (missingFields.length > 0) {
    ElMessage.warning(`请先填写以下必填项：${missingFields.join('、')}`)
    return
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*' // 只接受图片文件

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        fileUploading.value = true

        // 检查是否为图片文件
        if (!isImageFile(file.name)) {
          ElMessage.error('请选择图片文件')
          return
        }

        // 生成文件名和相对路径
        const generatedFileName = await generateFileName(file.name)
        const relativePath = await generateRelativePath(generatedFileName)

        // 创建blob URL用于预览
        const previewUrl = URL.createObjectURL(file)

        // 清理旧的文件信息
        if (selectedFileInfo.value?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
        }

        // 保存文件信息到临时变量（不上传）
        selectedFileInfo.value = {
          fileName: file.name, // 原始文件名
          generatedFileName: generatedFileName, // 生成的文件名
          fileSize: file.size,
          fileType: file.type,
          isImage: isImageFile(generatedFileName),
          previewUrl: previewUrl, // blob URL用于预览
          relativePath: relativePath, // 生成的相对路径
          file: file, // 原始文件对象
          uploaded: false // 标记为未上传
        }

        // 设置表单字段为生成的相对路径
        form.value.AttachmentFile = relativePath

        ElMessage.success('文件已选择，将在保存时上传')

      } catch (error) {
        console.error('文件处理失败:', error)
        ElMessage.error(error.message || '文件处理失败')
      } finally {
        fileUploading.value = false
      }
    }
  }

  input.click()
}

// 生成相对路径（用于数据库存储）
const generateRelativePath = async (generatedFileName) => {
  const currentYear = new Date().getFullYear()
  const customer = form.value.Customer?.trim()

  // 检查客户编号是否为空
  if (!customer) {
    throw new Error('请先填写客户编号')
  }

  // 生成Windows格式的相对路径
  const relativePath = `${currentYear}年异常汇总\\不良图片&资料\\${customer}\\${generatedFileName}`

  return relativePath
}

// 上传文件到服务器（在保存时调用）
const uploadFileToServer = async (file, generatedFileName) => {
  try {
    // 创建FormData
    const formData = new FormData()

    // 创建一个新的File对象，使用生成的文件名
    const renamedFile = new File([file], generatedFileName, { type: file.type })
    formData.append('file', renamedFile)

    // 添加自定义路径参数
    const currentYear = new Date().getFullYear()
    const customer = form.value.Customer?.trim()
    const customPath = `${currentYear}年异常汇总\\不良图片&资料\\${customer}`
    formData.append('customPath', customPath)

    // 获取token
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未找到认证令牌，请重新登录')
    }

    // 上传文件
    const response = await axios.post('/upload/complaint-attachment', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data && response.data.success) {
      // 标记文件为已上传
      if (selectedFileInfo.value) {
        selectedFileInfo.value.uploaded = true
        selectedFileInfo.value.serverPath = response.data.serverPath
      }

      return {
        success: true,
        relativePath: response.data.relativePath,
        serverPath: response.data.serverPath,
        filename: response.data.filename
      }
    } else {
      throw new Error(response.data?.message || '文件上传失败')
    }
  } catch (error) {
    throw error
  }
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

const showMask = ref(false)
const previewImage = ref()

const handlePreviewClick = () => {
  if (previewImage.value) {
    // 触发 el-image 的预览功能
    const imgEl = previewImage.value.$el.querySelector('img')
    if (imgEl) {
      imgEl.click()
    }
  }
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

// 处理编辑数据的初始化
const initializeEditData = () => {
  if (props.editData) {
    // 复制编辑数据到表单
    Object.keys(form.value).forEach(key => {
      if (props.editData[key] !== undefined) {
        form.value[key] = props.editData[key]
      }
    })

    // 处理现有附件文件
    if (props.editData.AttachmentFile) {
      const filePath = props.editData.AttachmentFile
      const fileName = filePath.split(/[\/\\]/).pop() || filePath

      console.log('========================================')
      console.log('[initializeEditData] 处理附件文件')
      console.log('[initializeEditData] filePath:', filePath)
      console.log('[initializeEditData] fileName:', fileName)
      console.log('[initializeEditData] recordId:', props.editData?.ID)

      // 判断文件类型并创建文件信息
      const isImage = isImageFile(fileName)
      console.log('[initializeEditData] isImage:', isImage)
      
      // 获取预览URL
      let previewUrl = null
      if (isImage) {
        previewUrl = getFilePreviewUrl(filePath, props.editData?.ID)
        console.log('[initializeEditData] 获取到的previewUrl:', previewUrl)
      }

      selectedFileInfo.value = {
        fileName: fileName,
        fileSize: 0, // 现有文件大小未知
        fileType: isImage ? 'image/*' : 'application/octet-stream',
        isImage: isImage,
        previewUrl: previewUrl,
        relativePath: filePath,
        serverPath: null,
        filename: fileName,
        file: null,
        uploaded: true,
        isExisting: true // 标记为现有文件
      }
      
      console.log('[initializeEditData] selectedFileInfo:', JSON.stringify(selectedFileInfo.value, null, 2))
      
      // 如果是图片且previewUrl为null，尝试通过imagePreviewService异步获取
      if (isImage && !previewUrl && props.editData?.ID) {
        console.log('[initializeEditData] previewUrl为空，尝试通过imagePreviewService获取')
        imagePreviewService.getImageUrlByRecordId(props.editData.ID)
          .then(url => {
            console.log('[initializeEditData] imagePreviewService返回URL:', url)
            if (selectedFileInfo.value && selectedFileInfo.value.isExisting) {
              selectedFileInfo.value.previewUrl = url
            }
          })
          .catch(error => {
            console.error('[initializeEditData] imagePreviewService获取失败:', error)
          })
      }
    }
  }
}

// 监听编辑数据变化
watch(() => props.editData, () => {
  initializeEditData()
}, { immediate: true, deep: true })

/**
 * 清理组件资源
 */
const cleanupResources = () => {
  // 清理图片预览缓存
  if (props.editData?.ID) {
    const cacheKey = `record_${props.editData.ID}`
    imagePreviewService.clearCache(cacheKey)
  }

  // 清理选中文件的预览URL
  if (selectedFileInfo.value?.previewUrl && selectedFileInfo.value.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
  }

  // 重置文件相关状态
  selectedFileInfo.value = null
}

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

  // 初始化编辑数据
  initializeEditData();
})

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  cleanupResources()
})
</script>

<style scoped>
.compact-form {
  max-width: 100%;
  margin: 0 auto;
}

.compact-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

/* 表单分节样式 */
.form-section {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
}

.section-title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #ecf5ff;
  color: #409eff;
  margin-right: 8px;
}

.icon-wrapper.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.icon-wrapper.success {
  background: #f0f9eb;
  color: #67c23a;
}

.icon-wrapper.primary {
  background: #ecf5ff;
  color: #409eff;
}

.icon-wrapper.danger {
  background: #fef0f0;
  color: #f56c6c;
}

.section-body {
  padding: 12px;
}

/* 附件文件样式现代版 */
.attachment-field-modern {
  width: 100%;
}

.attachment-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-btn {
  flex-shrink: 0;
}

.file-path-input {
  flex-grow: 1;
}

.attachment-preview-modern {
  margin-top: 10px;
}

.preview-card {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f8f9fa;
  gap: 12px;
}

.preview-image-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  border: 1px solid #ebeef5;
}

.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-image-wrapper:hover .preview-overlay {
  opacity: 1;
}

.preview-file-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 24px;
  flex-shrink: 0;
  border: 1px solid #d9ecff;
}

.file-info {
  flex-grow: 1;
  overflow: hidden;
}

/* 附件上传区域样式 */
.upload-preview-container {
  margin-bottom: 0 !important;
}

.attachment-upload-area {
  width: 100%;
  height: 220px; /* 固定高度与左侧表单区域对齐 */
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  box-sizing: border-box;
  background-color: #fcfcfc;
  transition: border-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.attachment-upload-area:hover {
  border-color: #409eff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 100%;
  height: 100%;
  color: #909399;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-tip {
  font-size: 12px;
  color: #c0c4cc;
}

/* 预览框样式 */
.preview-box {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.image-preview-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #fff;
  font-size: 20px;
  cursor: default;
  z-index: 1;
  transition: opacity 0.3s;
}

.preview-action-btn {
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.preview-action-btn:hover {
  transform: scale(1.2);
}

.file-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.file-icon {
  font-size: 48px;
  color: #909399;
  margin-bottom: 10px;
}

.preview-actions {
  height: 36px;
  background-color: #fff;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.file-name {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.file-size {
  font-size: 12px;
  color: #909399;
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
.complaint-dialog :deep(.el-input__wrapper) {
  border-radius: 4px;
}

.complaint-dialog :deep(.el-select) {
  width: 100%;
}

.complaint-dialog :deep(.el-input-number) {
  width: 100%;
}

/* 紧凑型标签页样式 */
.compact-tabs {
  margin-top: 8px;
  border: none !important;
  box-shadow: none !important;
}

.compact-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  border-radius: 6px 6px 0 0;
}

.compact-tabs :deep(.el-tabs__content) {
  padding: 12px 0;
}

.compact-tabs :deep(.el-tabs__item) {
  height: 36px;
  line-height: 36px;
  font-size: 13px;
}

.compact-tabs :deep(.el-tab-pane) {
  min-height: auto;
}

.cost-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
}

.no-padding {
  padding: 0 !important;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

<style>
/* 全局弹窗样式调整 - 不使用scoped以确保覆盖Element Plus默认样式 */
.complaint-dialog {
  display: flex;
  flex-direction: column;
  margin: 5vh auto !important; /* 上下留出空间，同时居中 */
  max-height: 85vh; /* 严格限制最大高度为视口高度的85%，确保不超出 */
  overflow: hidden; /* 防止溢出 */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.complaint-dialog .el-dialog__header {
  margin-right: 0;
  border-bottom: 1px solid #ebeef5;
  padding: 15px 20px;
  flex-shrink: 0; /* 标题栏不收缩 */
}

.complaint-dialog .el-dialog__body {
  padding: 10px 20px;
  flex: 1; /* 占据剩余空间 */
  overflow-y: auto; /* 内容过多时显示滚动条 */
  min-height: 0; /* 配合flex布局实现内部滚动 */
}

.complaint-dialog .el-dialog__footer {
  border-top: 1px solid #ebeef5;
  padding: 15px 20px;
  flex-shrink: 0; /* 底部按钮不收缩 */
  background: #fff;
}
</style>
