<template>
  <div class="supplier-complaints-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Warning /></el-icon>
        供应商投诉管理
      </h2>
      <p class="page-description">管理供应商材料投诉、处理流程、改善验证、索赔等相关业务</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-card shadow="never" class="search-card">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="投诉编号">
            <el-input 
              v-model="searchForm.complaintNo" 
              placeholder="请输入投诉编号" 
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="供应商名称">
            <el-input 
              v-model="searchForm.supplierName" 
              placeholder="请输入供应商名称" 
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="投诉类型">
            <el-select 
              v-model="searchForm.complaintType" 
              placeholder="请选择投诉类型" 
              clearable
              style="width: 150px"
            >
              <el-option label="质量问题" value="质量问题" />
              <el-option label="交货延迟" value="交货延迟" />
              <el-option label="规格不符" value="规格不符" />
              <el-option label="包装破损" value="包装破损" />
              <el-option label="服务问题" value="服务问题" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="处理状态">
            <el-select 
              v-model="searchForm.processStatus" 
              placeholder="请选择处理状态" 
              clearable
              style="width: 150px"
            >
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已关闭" value="closed" />
            </el-select>
          </el-form-item>
          <el-form-item label="投诉日期">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button @click="handleReset" :icon="Refresh">重置</el-button>
          </el-form-item>
        </el-form>
        
        <div class="action-buttons">
          <el-button type="primary" @click="handleAdd" :icon="Plus">新增投诉</el-button>
          <el-button type="success" @click="handleExport" :icon="Download">导出数据</el-button>
          <el-button type="info" @click="handleStatistics" :icon="DataAnalysis">统计分析</el-button>
        </div>
      </el-card>
    </div>

    <!-- 统计卡片 -->
    <div class="statistics-section" v-if="showStatistics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card pending">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ statistics.pendingCount || 0 }}</div>
                <div class="stat-label">待处理</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card processing">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Loading /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ statistics.processingCount || 0 }}</div>
                <div class="stat-label">处理中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card completed">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ statistics.completedCount || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card total">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Histogram /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ statistics.totalComplaints || 0 }}</div>
                <div class="stat-label">总投诉数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <el-table 
          :data="tableData" 
          v-loading="loading" 
          stripe 
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="complaintNo" label="投诉编号" width="140" fixed="left">
            <template #default="{ row }">
              <el-link type="primary" @click="handleView(row)">{{ row.complaintNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="complaintDate" label="投诉日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.complaintDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="supplierName" label="供应商名称" width="180" show-overflow-tooltip />
          <el-table-column prop="materialName" label="材料名称" width="150" show-overflow-tooltip />
          <el-table-column prop="complaintType" label="投诉类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getComplaintTypeColor(row.complaintType)">{{ row.complaintType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="urgencyLevel" label="紧急程度" width="100">
            <template #default="{ row }">
              <el-tag :type="getUrgencyColor(row.urgencyLevel)">{{ getUrgencyText(row.urgencyLevel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" align="right">
            <template #default="{ row }">
              {{ formatNumber(row.quantity) }}
            </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="涉及金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount-text">¥{{ formatNumber(row.totalAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="processStatus" label="处理状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusColor(row.processStatus)">{{ getStatusText(row.processStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="responsiblePerson" label="负责人" width="100" />
          <el-table-column prop="description" label="问题描述" width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleView(row)" :icon="View">查看</el-button>
              <el-button type="warning" size="small" @click="handleEdit(row)" :icon="Edit">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)" :icon="Delete">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="80%"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="120px"
        class="complaint-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投诉编号" prop="complaintNo">
              <el-input v-model="formData.complaintNo" :disabled="isEdit" placeholder="系统自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投诉日期" prop="complaintDate">
              <el-date-picker 
                v-model="formData.complaintDate" 
                type="date" 
                placeholder="选择投诉日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商名称" prop="supplierName">
              <el-select 
                v-model="formData.supplierName" 
                placeholder="请选择供应商" 
                filterable 
                style="width: 100%"
              >
                <el-option 
                  v-for="supplier in supplierList" 
                  :key="supplier.value" 
                  :label="supplier.label" 
                  :value="supplier.value" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料名称" prop="materialName">
              <el-input v-model="formData.materialName" placeholder="请输入材料名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投诉类型" prop="complaintType">
              <el-select v-model="formData.complaintType" placeholder="请选择投诉类型" style="width: 100%">
                <el-option label="质量问题" value="质量问题" />
                <el-option label="交货延迟" value="交货延迟" />
                <el-option label="规格不符" value="规格不符" />
                <el-option label="包装破损" value="包装破损" />
                <el-option label="服务问题" value="服务问题" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急程度" prop="urgencyLevel">
              <el-select v-model="formData.urgencyLevel" placeholder="请选择紧急程度" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="问题数量" prop="quantity">
              <el-input-number 
                v-model="formData.quantity" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                @change="calculateTotalAmount"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价" prop="unitPrice">
              <el-input-number 
                v-model="formData.unitPrice" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                @change="calculateTotalAmount"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总金额" prop="totalAmount">
              <el-input-number 
                v-model="formData.totalAmount" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="问题描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea" 
            :rows="4" 
            placeholder="请详细描述投诉问题"
          />
        </el-form-item>
        
        <el-form-item label="期望解决方案">
          <el-input 
            v-model="formData.expectedSolution" 
            type="textarea" 
            :rows="3" 
            placeholder="请描述期望的解决方案"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人" prop="responsiblePerson">
              <el-input v-model="formData.responsiblePerson" placeholder="请输入负责人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="处理状态" prop="processStatus">
              <el-select v-model="formData.processStatus" placeholder="请选择处理状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已关闭" value="closed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 处理结果相关字段 -->
        <div v-if="formData.processStatus !== 'pending'" class="process-section">
          <el-divider content-position="left">处理结果</el-divider>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="处理结果">
                <el-select v-model="formData.processResult" placeholder="请选择处理结果" style="width: 100%">
                  <el-option label="供应商整改" value="supplier_improvement" />
                  <el-option label="退货处理" value="return_goods" />
                  <el-option label="换货处理" value="exchange_goods" />
                  <el-option label="返工处理" value="rework" />
                  <el-option label="索赔处理" value="claim" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="索赔金额">
                <el-input-number 
                  v-model="formData.claimAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="实际损失">
                <el-input-number 
                  v-model="formData.actualLoss" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="赔偿金额">
                <el-input-number 
                  v-model="formData.compensationAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="返工成本">
                <el-input-number 
                  v-model="formData.reworkCost" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="更换成本">
                <el-input-number 
                  v-model="formData.replacementCost" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="退货数量">
                <el-input-number 
                  v-model="formData.returnQuantity" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="退货金额">
                <el-input-number 
                  v-model="formData.returnAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="解决方案描述">
            <el-input 
              v-model="formData.solutionDescription" 
              type="textarea" 
              :rows="3" 
              placeholder="请描述具体的解决方案"
            />
          </el-form-item>
          
          <el-form-item label="验证结果">
            <el-input 
              v-model="formData.verificationResult" 
              type="textarea" 
              :rows="3" 
              placeholder="请描述验证结果"
            />
          </el-form-item>
          
          <el-form-item label="后续行动">
            <el-input 
              v-model="formData.followUpActions" 
              type="textarea" 
              :rows="2" 
              placeholder="请描述后续需要采取的行动"
            />
          </el-form-item>
          
          <el-form-item label="预防措施">
            <el-input 
              v-model="formData.preventiveMeasures" 
              type="textarea" 
              :rows="2" 
              placeholder="请描述预防类似问题的措施"
            />
          </el-form-item>
          
          <el-form-item label="供应商回复">
            <el-input 
              v-model="formData.supplierResponse" 
              type="textarea" 
              :rows="3" 
              placeholder="供应商的回复内容"
            />
          </el-form-item>
        </div>
        
        <el-form-item label="内部备注">
          <el-input 
            v-model="formData.internalNotes" 
            type="textarea" 
            :rows="2" 
            placeholder="内部备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog 
      v-model="viewDialogVisible" 
      title="投诉详情" 
      width="70%"
      :close-on-click-modal="false"
    >
      <div class="complaint-detail" v-if="viewData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="投诉编号">{{ viewData.complaintNo }}</el-descriptions-item>
          <el-descriptions-item label="投诉日期">{{ formatDate(viewData.complaintDate) }}</el-descriptions-item>
          <el-descriptions-item label="供应商名称">{{ viewData.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="材料名称">{{ viewData.materialName }}</el-descriptions-item>
          <el-descriptions-item label="投诉类型">
            <el-tag :type="getComplaintTypeColor(viewData.complaintType)">{{ viewData.complaintType }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-tag :type="getUrgencyColor(viewData.urgencyLevel)">{{ getUrgencyText(viewData.urgencyLevel) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="问题数量">{{ formatNumber(viewData.quantity) }}</el-descriptions-item>
          <el-descriptions-item label="单价">¥{{ formatNumber(viewData.unitPrice) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ formatNumber(viewData.totalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="getStatusColor(viewData.processStatus)">{{ getStatusText(viewData.processStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="负责人">{{ viewData.responsiblePerson }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(viewData.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="left">问题描述</el-divider>
        <p class="description-text">{{ viewData.description }}</p>
        
        <el-divider content-position="left" v-if="viewData.expectedSolution">期望解决方案</el-divider>
        <p class="description-text" v-if="viewData.expectedSolution">{{ viewData.expectedSolution }}</p>
        
        <div v-if="viewData.processStatus !== 'pending'">
          <el-divider content-position="left">处理结果</el-divider>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="处理结果">{{ viewData.processResult }}</el-descriptions-item>
            <el-descriptions-item label="索赔金额">¥{{ formatNumber(viewData.claimAmount) }}</el-descriptions-item>
            <el-descriptions-item label="实际损失">¥{{ formatNumber(viewData.actualLoss) }}</el-descriptions-item>
            <el-descriptions-item label="赔偿金额">¥{{ formatNumber(viewData.compensationAmount) }}</el-descriptions-item>
            <el-descriptions-item label="返工成本">¥{{ formatNumber(viewData.reworkCost) }}</el-descriptions-item>
            <el-descriptions-item label="更换成本">¥{{ formatNumber(viewData.replacementCost) }}</el-descriptions-item>
            <el-descriptions-item label="退货数量">{{ formatNumber(viewData.returnQuantity) }}</el-descriptions-item>
            <el-descriptions-item label="退货金额">¥{{ formatNumber(viewData.returnAmount) }}</el-descriptions-item>
          </el-descriptions>
          
          <el-divider content-position="left" v-if="viewData.solutionDescription">解决方案描述</el-divider>
          <p class="description-text" v-if="viewData.solutionDescription">{{ viewData.solutionDescription }}</p>
          
          <el-divider content-position="left" v-if="viewData.verificationResult">验证结果</el-divider>
          <p class="description-text" v-if="viewData.verificationResult">{{ viewData.verificationResult }}</p>
          
          <el-divider content-position="left" v-if="viewData.followUpActions">后续行动</el-divider>
          <p class="description-text" v-if="viewData.followUpActions">{{ viewData.followUpActions }}</p>
          
          <el-divider content-position="left" v-if="viewData.preventiveMeasures">预防措施</el-divider>
          <p class="description-text" v-if="viewData.preventiveMeasures">{{ viewData.preventiveMeasures }}</p>
          
          <el-divider content-position="left" v-if="viewData.supplierResponse">供应商回复</el-divider>
          <p class="description-text" v-if="viewData.supplierResponse">{{ viewData.supplierResponse }}</p>
        </div>
        
        <el-divider content-position="left" v-if="viewData.internalNotes">内部备注</el-divider>
        <p class="description-text" v-if="viewData.internalNotes">{{ viewData.internalNotes }}</p>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleEditFromView">编辑</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Plus, Download, DataAnalysis,
  View, Edit, Delete, Warning, Clock, Loading,
  CircleCheck, Histogram
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const showStatistics = ref(false)
const statistics = ref({})
const supplierList = ref([])

// 搜索表单
const searchForm = reactive({
  complaintNo: '',
  supplierName: '',
  complaintType: '',
  processStatus: '',
  dateRange: []
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 对话框控制
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const viewData = ref(null)

// 表单数据
const formData = reactive({
  id: null,
  complaintNo: '',
  complaintDate: '',
  supplierName: '',
  materialName: '',
  complaintType: '',
  description: '',
  quantity: 0,
  unitPrice: 0,
  totalAmount: 0,
  urgencyLevel: 'medium',
  expectedSolution: '',
  responsiblePerson: '',
  processStatus: 'pending',
  processResult: '',
  solutionDescription: '',
  verificationResult: '',
  claimAmount: 0,
  actualLoss: 0,
  compensationAmount: 0,
  reworkCost: 0,
  replacementCost: 0,
  returnQuantity: 0,
  returnAmount: 0,
  followUpActions: '',
  preventiveMeasures: '',
  supplierResponse: '',
  internalNotes: ''
})

// 表单引用
const formRef = ref(null)

// 表单验证规则
const formRules = {
  complaintDate: [{ required: true, message: '请选择投诉日期', trigger: 'change' }],
  supplierName: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  materialName: [{ required: true, message: '请输入材料名称', trigger: 'blur' }],
  complaintType: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入问题数量', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  urgencyLevel: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  responsiblePerson: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
  processStatus: [{ required: true, message: '请选择处理状态', trigger: 'change' }]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑投诉' : '新增投诉'
})

// 生命周期
onMounted(() => {
  loadData()
  loadSuppliers()
})

// 方法定义

/**
 * 加载数据列表
 */
const loadData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    
    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response = await axios.get('/api/supplier-complaints', { params })
    
    if (response.data.success) {
      tableData.value = response.data.data.list
      pagination.total = response.data.data.total
    } else {
      ElMessage.error(response.data.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载供应商列表
 */
const loadSuppliers = async () => {
  try {
    const response = await axios.get('/api/supplier-complaints/suppliers')
    if (response.data.success) {
      supplierList.value = response.data.data
    }
  } catch (error) {
    console.error('加载供应商列表失败:', error)
  }
}

/**
 * 加载统计数据
 */
const loadStatistics = async () => {
  try {
    const response = await axios.get('/api/supplier-complaints/statistics')
    if (response.data.success) {
      statistics.value = response.data.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    complaintNo: '',
    supplierName: '',
    complaintType: '',
    processStatus: '',
    dateRange: []
  })
  handleSearch()
}

/**
 * 新增投诉
 */
const handleAdd = () => {
  isEdit.value = false
  resetFormData()
  dialogVisible.value = true
}

/**
 * 编辑投诉
 */
const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

/**
 * 查看详情
 */
const handleView = (row) => {
  viewData.value = row
  viewDialogVisible.value = true
}

/**
 * 从查看页面编辑
 */
const handleEditFromView = () => {
  viewDialogVisible.value = false
  handleEdit(viewData.value)
}

/**
 * 删除投诉
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除投诉编号为 "${row.complaintNo}" 的记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(`/api/supplier-complaints/${row.id}`)
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 导出数据
 */
const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

/**
 * 统计分析
 */
const handleStatistics = () => {
  showStatistics.value = !showStatistics.value
  if (showStatistics.value) {
    loadStatistics()
  }
}

/**
 * 表格选择变化
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadData()
}

/**
 * 计算总金额
 */
const calculateTotalAmount = () => {
  formData.totalAmount = (formData.quantity || 0) * (formData.unitPrice || 0)
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    const url = isEdit.value 
      ? `/api/supplier-complaints/${formData.id}`
      : '/api/supplier-complaints'
    
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await axios[method](url, formData)
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

/**
 * 对话框关闭处理
 */
const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetFormData()
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.assign(formData, {
    id: null,
    complaintNo: '',
    complaintDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    materialName: '',
    complaintType: '',
    description: '',
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    urgencyLevel: 'medium',
    expectedSolution: '',
    responsiblePerson: '',
    processStatus: 'pending',
    processResult: '',
    solutionDescription: '',
    verificationResult: '',
    claimAmount: 0,
    actualLoss: 0,
    compensationAmount: 0,
    reworkCost: 0,
    replacementCost: 0,
    returnQuantity: 0,
    returnAmount: 0,
    followUpActions: '',
    preventiveMeasures: '',
    supplierResponse: '',
    internalNotes: ''
  })
}

// 工具方法

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 */
const formatDateTime = (datetime) => {
  if (!datetime) return ''
  return new Date(datetime).toLocaleString('zh-CN')
}

/**
 * 格式化数字
 */
const formatNumber = (number) => {
  if (number === null || number === undefined) return '0'
  return Number(number).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 获取投诉类型颜色
 */
const getComplaintTypeColor = (type) => {
  const colorMap = {
    '质量问题': 'danger',
    '交货延迟': 'warning',
    '规格不符': 'danger',
    '包装破损': 'info',
    '服务问题': 'warning',
    '其他': 'info'
  }
  return colorMap[type] || 'info'
}

/**
 * 获取紧急程度颜色
 */
const getUrgencyColor = (level) => {
  const colorMap = {
    'low': 'info',
    'medium': 'warning',
    'high': 'danger'
  }
  return colorMap[level] || 'info'
}

/**
 * 获取紧急程度文本
 */
const getUrgencyText = (level) => {
  const textMap = {
    'low': '低',
    'medium': '中',
    'high': '高'
  }
  return textMap[level] || '未知'
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status) => {
  const colorMap = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'closed': 'info'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const textMap = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'closed': '已关闭'
  }
  return textMap[status] || '未知状态'
}
</script>

<style scoped>
.supplier-complaints-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
}

.search-card {
  border-radius: 8px;
}

.search-form {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.statistics-section {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-card.pending .stat-icon {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.stat-card.pending .stat-number {
  color: #e6a23c;
}

.stat-card.processing .stat-icon {
  background-color: #ecf5ff;
  color: #409eff;
}

.stat-card.processing .stat-number {
  color: #409eff;
}

.stat-card.completed .stat-icon {
  background-color: #f0f9ff;
  color: #67c23a;
}

.stat-card.completed .stat-number {
  color: #67c23a;
}

.stat-card.total .stat-icon {
  background-color: #f4f4f5;
  color: #909399;
}

.stat-card.total .stat-number {
  color: #303133;
}

.table-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
}

.complaint-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.process-section {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  margin-top: 16px;
}

.complaint-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.description-text {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  line-height: 1.6;
  color: #606266;
}

.amount-text {
  font-weight: 600;
  color: #f56c6c;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .supplier-complaints-container {
    padding: 10px;
  }
  
  .search-form {
    flex-direction: column;
  }
  
  .action-buttons {
    flex-wrap: wrap;
  }
  
  .stat-content {
    flex-direction: column;
    text-align: center;
  }
  
  .stat-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>