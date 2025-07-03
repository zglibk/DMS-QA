<template>
  <div class="form-container">
    <!-- 顶部导航栏 -->
    <el-header class="home-header">
      <div class="header-left">
        <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="logo" class="logo" @error="handleLogoError" />
        <span class="logo-text">{{ siteConfig?.siteName || '质量数据管理系统' }}</span>
      </div>
      <div class="header-center">
        <div class="nav-menu-wrap">
          <el-menu mode="horizontal" :default-active="activeMenu" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
            <el-menu-item index="home">首页</el-menu-item>
            <el-menu-item index="complaint">投诉管理</el-menu-item>
            <el-menu-item index="stats">统计分析</el-menu-item>
          </el-menu>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" size="small" class="admin-btn" @click="goAdmin">登录后台</el-button>
        <el-avatar :size="32" :src="user.Avatar" class="avatar-icon" @click="goProfile">
          <template v-if="!user.Avatar">
            <el-icon><User /></el-icon>
          </template>
        </el-avatar>
        <span class="username" @click="goProfile">{{ username }}</span>
        <el-dropdown>
          <span class="el-dropdown-link">
            <el-icon><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goProfile">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <div class="form-content">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" style="max-width: 1100px; margin: 30px auto;">
        <el-card shadow="always" class="form-card">
          <template #header>
            <div class="form-card-header">基本信息</div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="投诉日期" prop="Date">
                <el-date-picker v-model="form.Date" type="date" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户编号" prop="Customer">
                <el-input v-model="form.Customer" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="工单号" prop="OrderNo">
                <el-input v-model="form.OrderNo" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="产品名称" prop="ProductName">
                <el-input v-model="form.ProductName" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="规格型号">
                <el-input v-model="form.Specification" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="发生车间" prop="Workshop">
                <el-select v-model="form.Workshop" filterable placeholder="请选择发生车间">
                  <el-option v-for="item in options.workshops" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="生产数量" prop="ProductionQty">
                <el-input-number v-model="form.ProductionQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="不良数量">
                <el-input-number v-model="form.DefectiveQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="不良率(%)">
                <el-input-number v-model="form.DefectiveRate" :min="0" :max="100" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <el-card shadow="always" class="form-card">
          <template #header>
            <div class="form-card-header">投诉信息</div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="投诉类别" prop="ComplaintCategory">
                <el-select 
                  v-model="form.ComplaintCategory" 
                  filterable 
                  placeholder="请选择投诉类别"
                  @change="handleComplaintCategoryChange"
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
                <el-select v-model="form.DefectiveItem" filterable placeholder="请选择不良项">
                  <el-option v-for="item in options.defectiveItems" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="不良描述" prop="DefectiveDescription">
                <el-input v-model="form.DefectiveDescription" type="textarea" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="附件文件">
                <el-input v-model="form.AttachmentFile" readonly style="width: 80%" />
                <el-button @click="selectFile">选择文件</el-button>
                <img v-if="isImage(form.AttachmentFile)" :src="form.AttachmentFile" alt="图片预览" style="max-width: 100px; max-height: 100px; margin-left: 10px; cursor: pointer;" @click="handlePreviewImg(form.AttachmentFile)" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="不良原因">
                <el-input v-model="form.DefectiveReason" type="textarea" />
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
                <el-input v-model="form.Disposition" type="textarea" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="退货">
                <el-switch v-model="form.ReturnGoods" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否补印">
                <el-switch v-model="form.IsReprint" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="补印数量">
                <el-input-number v-model="form.ReprintQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 材料与费用 -->
        <el-card shadow="always" class="form-card">
          <template #header>
            <div class="form-card-header">材料与费用</div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="纸张">
                <el-input v-model="form.Paper" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="纸张规格">
                <el-input v-model="form.PaperSpecification" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="纸张数量">
                <el-input-number v-model="form.PaperQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="纸张单价">
                <el-input-number v-model="form.PaperUnitPrice" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料A">
                <el-input v-model="form.MaterialA" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料A规格">
                <el-input v-model="form.MaterialASpec" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料A数量">
                <el-input-number v-model="form.MaterialAQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料A单价">
                <el-input-number v-model="form.MaterialAUnitPrice" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料B">
                <el-input v-model="form.MaterialB" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料B规格">
                <el-input v-model="form.MaterialBSpec" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料B数量">
                <el-input-number v-model="form.MaterialBQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料B单价">
                <el-input-number v-model="form.MaterialBUnitPrice" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料C">
                <el-input v-model="form.MaterialC" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料C规格">
                <el-input v-model="form.MaterialCSpec" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料C数量">
                <el-input-number v-model="form.MaterialCQty" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="材料C单价">
                <el-input-number v-model="form.MaterialCUnitPrice" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工时费">
                <el-input-number v-model="form.LaborCost" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="费用统计">
                <el-input-number v-model="form.TotalCost" :min="0" :step="0.01" style="width: 100%" />
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
                <el-select v-model="form.MainDept" filterable placeholder="请选择主责部门">
                  <el-option v-for="item in options.departments" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="主责人" prop="MainPerson">
                <el-select v-model="form.MainPerson" filterable placeholder="请选择主责人">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="主责考核金额">
                <el-input-number v-model="form.MainPersonAssessment" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="次责人">
                <el-select v-model="form.SecondPerson" filterable placeholder="请选择次责人">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="次责考核金额">
                <el-input-number v-model="form.SecondPersonAssessment" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="责任主管">
                <el-select v-model="form.Manager" filterable placeholder="请选择责任主管">
                  <el-option v-for="item in options.persons" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="主管考核金额">
                <el-input-number v-model="form.ManagerAssessment" :min="0" :step="0.01" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="考核说明">
                <el-input v-model="form.AssessmentDescription" type="textarea" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <div style="text-align:center;margin-top:30px;">
          <el-button type="primary" @click="submitForm" style="width: 220px; font-size: 18px; height: 48px;">提交</el-button>
        </div>
        <div style="text-align:center;margin-top:16px;">
          <el-button @click="resetForm" style="width: 220px; font-size: 18px; height: 48px;">重置</el-button>
        </div>
      </el-form>
    </div>

    <!-- 底部版权栏 -->
    <el-footer class="home-footer">
      © 2024 质量数据管理系统 版权所有
    </el-footer>

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
import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ArrowDown, User, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'
import { useSiteConfig } from '../composables/useSiteConfig'

// 网站配置
const { siteConfig, loadSiteConfig } = useSiteConfig()

// 图片加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png' // 回退到默认图片
}

const formRef = ref()
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
  Disposition: [ { required: true, message: '请输入处置措施', trigger: 'blur' } ],
  MainDept: [ { required: true, message: '请选择主责部门', trigger: 'change' } ],
  MainPerson: [ { required: true, message: '请选择主责人', trigger: 'change' } ]
}
const router = useRouter()
const options = reactive({
  workshops: [],
  departments: [],
  persons: [],
  complaintCategories: [],
  customerComplaintTypes: [],
  defectiveCategories: [],
  defectiveItems: []
})
const username = ref('admin')
const activeMenu = ref('complaint')
const handleMenuSelect = (index) => {
  activeMenu.value = index
  if (index === 'home') router.push('/')
  if (index === 'complaint') router.push('/add')
  // 可扩展其他菜单
}
const goProfile = () => {
  router.push('/profile')
}
const logout = () => {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
const goAdmin = () => {
  window.open('http://localhost:3001/admin', '_blank')
}

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    });
    Object.assign(options, res.data);
  } catch (error) {
    console.error('获取下拉选项失败:', error);
  }
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
      options.defectiveItems = res.data;
    } catch (error) {
      console.error('获取不良项失败:', error);
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
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/complaint', submissionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          ElMessage.success(res.data.message || '投诉登记成功');
          router.push('/');
        } else {
          ElMessage.error(res.data.message || '投诉登记失败');
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '投诉登记失败');
      }
    }
  });
}

const resetForm = () => {
  formRef.value.resetFields();
  options.defectiveItems = [];
}

onMounted(() => {
  loadSiteConfig()
  fetchOptions()
  userStore.fetchProfile()
})

// 附件选择与图片预览
const selectFile = async () => {
  // 仅支持本地路径选择，需配合Electron或本地API，web端可用input type=file
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
</script>

<style scoped>
.form-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}
.form-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1.25rem;
  background-color: #f0f2f5;
}
.form-card {
  margin-bottom: 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 0.125rem 0.75rem 0 rgba(22,119,255,0.08);
  padding: 2rem 1.5rem 1rem 1.5rem;
  background: #fff;
}
.form-card-header {
  font-weight: bold;
  font-size: 1.1rem;
}
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
@media (max-width: 600px) {
  .form-content { padding: 0.5rem; }
  .form-card { padding: 1rem 0.5rem 0.5rem 0.5rem; }
  .img-preview-large { max-width: 98vw; max-height: 70vh; }
}
</style> 