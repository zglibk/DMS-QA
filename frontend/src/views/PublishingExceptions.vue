<template>
  <div class="common-layout">
    <AppHeader />
    <el-container>
      <el-aside width="200px">
        <!-- 左侧边栏占位 -->
        <el-card class="sidebar-placeholder" shadow="never">
          <div class="placeholder-content">
            <el-icon><Filter /></el-icon>
            <span>筛选区域</span>
          </div>
        </el-card>
      </el-aside>
      
      <el-main>
        <!-- 筛选卡片 -->
        <el-card class="filter-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>筛选条件</span>
            </div>
          </template>
          
          <el-form :model="filters" class="filter-form">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="登记日期">
                  <el-date-picker
                    v-model="filters.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%;"
                    class="date-range-picker"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="3">
                <el-form-item label="客户代码">
                  <el-input 
                    v-model="filters.customerCode" 
                    placeholder="请输入" 
                    clearable 
                    @input="handleCustomerCodeInput"
                    style="text-transform: uppercase;"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="工单号">
                  <el-input 
                    v-model="filterWorkOrderSuffix" 
                    placeholder="输入工单" 
                    clearable 
                    @input="handleFilterWorkOrderInput"
                    class="filter-work-order-suffix"
                    style="text-transform: uppercase;"
                    title="只能输入数字和小数点"
                  >
                    <template #prepend>
                      <span style="color: #c0c4cc; font-weight: normal;">GD</span>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="7">
                <el-form-item label="产品名称">
                  <el-select 
                    v-model="filters.productName" 
                    placeholder="请选择或输入产品名称" 
                    clearable 
                    filterable 
                    allow-create 
                    default-first-option
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option 
                      v-for="productName in productNameList" 
                      :key="productName" 
                      :label="productName" 
                      :value="productName" 
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="责任单位">
                  <el-select 
                    v-model="filters.responsibleUnit" 
                    placeholder="请选择" 
                    clearable 
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option 
                      v-for="dept in departmentList" 
                      :key="dept.ID" 
                      :label="dept.Name" 
                      :value="dept.Name" 
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <!-- 错误类型筛选：支持按错误类型筛选出版异常记录 -->
              <el-col :span="4">
                <el-form-item label="错误类型">
                  <el-select 
                    v-model="filters.errorType" 
                    placeholder="请选择" 
                    clearable 
                    filterable 
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option label="排版变形" value="排版变形" />
                    <el-option label="分色偏差" value="分色偏差" />
                    <el-option label="套印偏差" value="套印偏差" />
                    <el-option label="排版错误" value="排版错误" />
                    <el-option label="出血位偏差" value="出血位偏差" />
                    <el-option label="内容错误" value="内容错误" />
                    <el-option label="图文残缺" value="图文残缺" />
                    <el-option label="多出版" value="多出版" />
                    <el-option label="漏出版" value="漏出版" />
                    <el-option label="其它" value="其它" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="2">
                <el-form-item label=" ">
                  <el-button type="warning" plain @click="resetFilters" style="width: 100%; margin-bottom: 8px;">
                    <el-icon><Refresh /></el-icon>
                    重置
                  </el-button>
                </el-form-item>
              </el-col>
              <el-col :span="2">
                <el-form-item label=" ">
                  <el-button type="primary" @click="handleSearch" style="width: 100%; margin-bottom: 8px;">
                    <el-icon><Search /></el-icon>
                    搜索
                  </el-button>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <!-- 占位列 -->
              </el-col>
              <el-col :span="6">
                <!-- 占位列 -->
              </el-col>
            </el-row>
          </el-form>
        </el-card>
        <!-- 标签页 -->
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 记录清单标签页 -->
          <el-tab-pane label="记录清单" name="records">
            <div class="records-content">
              <!-- 操作工具栏 -->
              <div class="toolbar">
                <el-button type="primary" @click="handleAdd">
                  <el-icon><Plus /></el-icon>
                  新增记录
                </el-button>
                <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0">
                  <el-icon><Delete /></el-icon>
                  批量删除
                </el-button>
                <el-button @click="handleExport">
                  <el-icon><Download /></el-icon>
                  导出数据
                </el-button>
              </div>
              
              <!-- 数据表格 -->
              <el-table
                ref="tableRef"
                :data="tableData"
                v-loading="loading"
                @selection-change="handleSelectionChange"
                stripe
                border
                style="font-family: 'Arial', 'Helvetica', sans-serif;"
                :header-cell-style="{ backgroundColor: '#f5f7fa', color: '#606266' }"
              >
                <el-table-column type="selection" width="55" align="center" header-align="center" />
                <el-table-column prop="publishing_date" label="出版日期" width="110" align="center" header-align="center">
                  <template #default="{ row }">
                    {{ formatDate(row.publishing_date) }}
                  </template>
                </el-table-column>
                <el-table-column prop="customer_code" label="客户代码" width="86" max-width="90" align="center" header-align="center" />
                <el-table-column prop="work_order_number" label="工单号" width="120" max-width="130" align="center" header-align="center" show-overflow-tooltip />
                <el-table-column prop="product_name" label="产品名称" width="200" show-overflow-tooltip header-align="center" />
                <el-table-column prop="plate_type" label="版类型" width="80" align="center" header-align="center" />
                <el-table-column prop="publishing_sheets" label="张数" width="60" align="center" header-align="center" />
                <el-table-column prop="exception_description" label="异常描述" width="200" show-overflow-tooltip header-align="center" />
                <!-- 错误类型列：显示异常的分类类型 -->
                <el-table-column prop="error_type" label="错误类型" width="100" align="center" header-align="center" />
                <el-table-column prop="responsible_unit" label="责任单位" width="120" align="center" header-align="center" />
                <el-table-column prop="responsible_person" label="责任人" width="70" align="center" header-align="center" />
                <el-table-column prop="area_cm2" label="数量cm²" width="80" align="center" header-align="center" />
                <el-table-column prop="amount" label="金额" width="80" align="center" header-align="center" />
                
                <el-table-column label="操作" min-width="210" fixed="right" header-align="center">
                  <template #default="{ row }">
                    <div class="action-buttons">
                      <el-button type="primary" size="small" @click="handleView(row)">
                        <el-icon><View /></el-icon>
                        查看
                      </el-button>
                      <el-button type="warning" size="small" @click="handleEdit(row)">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-button>
                      <el-button type="danger" size="small" @click="handleDelete(row)">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页 -->
              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="pagination.current"
                  v-model:page-size="pagination.pageSize"
                  :page-sizes="[5, 10, 20, 50, 100]"
                  :total="pagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 数据统计标签页 -->
          <el-tab-pane label="数据统计" name="statistics">
            <div class="statistics-content">
              <!-- 统计卡片 -->
              <el-row :gutter="20" class="stats-cards">
                <el-col :span="12">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.monthly_new || 0 }}</div>
                      <div class="stat-label">本月新增</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">¥{{ formatNumber(statistics.cost_loss || 0) }}</div>
                      <div class="stat-label">成本损失</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
              
              <!-- 图表区域 -->
              <el-row :gutter="20" class="charts-row">
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <span>按责任单位统计</span>
                    </template>
                    <div ref="unitChartRef" class="chart-container"></div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <span>按月份统计</span>
                    </template>
                    <div ref="monthlyChartRef" class="chart-container"></div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-main>
      
      <el-aside width="200px">
        <!-- 快捷操作卡片 -->
        <el-card class="quick-actions-card" shadow="hover">
          <template #header>
            <span>快捷操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button type="primary" @click="handleAdd" style="width: 100%; margin: 0 0 10px 0;">
              <el-icon><Plus /></el-icon>
              新增记录
            </el-button>
            <el-button @click="handleExport" style="width: 100%; margin: 0 0 10px 0">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button @click="refreshData" style="width: 100%;margin: 0 0 10px 0">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </el-card>
        
        <!-- 统计信息卡片 -->
        <el-card class="info-card" shadow="hover" style="margin-top: 20px;">
          <template #header>
            <span>统计信息</span>
          </template>
          
          <div class="info-items">
            <div class="info-item">
              <span class="info-label">本月新增:</span>
              <span class="info-value stat-number">{{ statistics.monthly_new || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">成本损失:</span>
              <span class="info-value stat-number">{{ formatAmount(statistics.cost_loss || 0) }}</span>
            </div>
          </div>
        </el-card>
      </el-aside>
    </el-container>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="登记日期" prop="registration_date">
              <el-date-picker
                v-model="formData.registration_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出版日期">
              <el-date-picker
                v-model="formData.publishing_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户代码" prop="customer_code">
              <el-input 
                v-model="formData.customer_code" 
                placeholder="请输入客户代码" 
                @input="handleFormCustomerCodeInput"
                style="text-transform: uppercase;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="工单号" prop="work_order_number">
              <el-input 
                v-model="workOrderSuffix" 
                placeholder="请输入工单" 
                @input="handleFormWorkOrderInput"
                style="text-transform: uppercase;"
                title="只能输入数字和小数点"
              >
                <template #prepend>
                  <span style="color: #909399; font-weight: normal;">GD</span>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="产品名称" prop="product_name">
              <el-input v-model="formData.product_name" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="版类型">
              <el-select v-model="formData.plate_type" placeholder="请选择版类型" style="width: 100%">
                <el-option label="PS版" value="PS版" />
                <el-option label="CTP" value="CTP" />
                <el-option label="柔版" value="柔版" />
                <el-option label="刀模" value="刀模" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="出版张数">
              <el-input-number v-model="formData.publishing_sheets" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="责任单位" prop="responsible_unit">
              <el-select v-model="formData.responsible_unit" placeholder="请选择责任单位" style="width: 100%">
                <el-option 
                  v-for="dept in departmentList" 
                  :key="dept.ID" 
                  :label="dept.Name" 
                  :value="dept.Name" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="责任人" prop="responsible_person">
              <el-input v-model="formData.responsible_person" placeholder="请输入责任人" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="件数">
              <el-input-number v-model="formData.piece_count" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长(cm)">
              <el-input-number v-model="formData.length_cm" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽(cm)">
              <el-input-number v-model="formData.width_cm" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="数量cm²">
              <el-input-number v-model="formData.area_cm2" :min="0" :precision="2" style="width: 100%" readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价">
              <el-input-number v-model="formData.unit_price" :min="0" :precision="4" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="金额">
              <el-input-number v-model="formData.amount" :min="0" :precision="2" style="width: 100%" readonly disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 错误类型选择器：用于分类管理出版异常的错误类型，支持搜索和清空 -->
        <el-form-item label="错误类型" prop="error_type">
          <el-select 
            v-model="formData.error_type" 
            placeholder="请选择错误类型" 
            style="width: 100%"
            filterable
            clearable
          >
            <el-option label="排版变形" value="排版变形" />
            <el-option label="分色偏差" value="分色偏差" />
            <el-option label="套印偏差" value="套印偏差" />
            <el-option label="排版错误" value="排版错误" />
            <el-option label="出血位偏差" value="出血位偏差" />
            <el-option label="内容错误" value="内容错误" />
            <el-option label="图文残缺" value="图文残缺" />
            <el-option label="多出版" value="多出版" />
            <el-option label="漏出版" value="漏出版" />
            <el-option label="其它" value="其它" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="异常描述" prop="exception_description">
          <el-input
            v-model="formData.exception_description"
            type="textarea"
            :rows="3"
            placeholder="请详细描述异常情况"
          />
        </el-form-item>
        
        <el-form-item>
          <template #label>
            <el-text class="mx-1" >选择上传</el-text>
          </template>
          <FileUpload
            ref="uploadRef"
            :multiple="true"
            :max-count="5"
            accept="image/*"
            tip="支持拖拽上传（最多5张）"
            upload-mode="custom"
            :custom-request="handleCustomUpload"
            :before-upload="beforeUpload"
            :deferred-upload="true"
            v-model:fileList="fileList"
            @change="handleFileChange"
            @remove="handleFileRemove"
            @preview="handleFilePreview"
          />
        </el-form-item>
        

      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新增/编辑对话框中的图片预览对话框 -->
    <el-dialog
      v-model="dialogImagePreviewVisible"
      title="图片预览"
      :show-close="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      width="90%"
      style="max-width: 1200px;"
      class="image-preview-dialog"
      @close="closeDialogImagePreview"
    >
      <ImagePreview
        v-if="currentDialogPreviewImage"
        :file-path="currentDialogPreviewImage"
        :width="'100%'"
        :height="'70vh'"
      />
    </el-dialog>
    
    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="查看详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ viewData.id }}</el-descriptions-item>
        <el-descriptions-item label="登记日期">{{ formatDate(viewData.registration_date) }}</el-descriptions-item>
        <el-descriptions-item label="工单号">{{ viewData.work_order_number }}</el-descriptions-item>
        <el-descriptions-item label="客户代码">{{ viewData.customer_code }}</el-descriptions-item>
        <el-descriptions-item label="产品名称" :span="2">{{ viewData.product_name }}</el-descriptions-item>
        <el-descriptions-item label="异常描述" span="2">{{ viewData.exception_description }}</el-descriptions-item>
        <!-- 错误类型显示：展示异常的分类类型 -->
        <el-descriptions-item label="错误类型">{{ viewData.error_type }}</el-descriptions-item>
      <el-descriptions-item label="出版日期">{{ formatDate(viewData.publishing_date) }}</el-descriptions-item>
        <el-descriptions-item label="版类型">{{ viewData.plate_type }}</el-descriptions-item>
        <el-descriptions-item label="出版张数">{{ viewData.publishing_sheets }}</el-descriptions-item>
        <el-descriptions-item label="责任单位">{{ viewData.responsible_unit }}</el-descriptions-item>
        <el-descriptions-item label="责任人">{{ viewData.responsible_person }}</el-descriptions-item>
        <el-descriptions-item label="长(cm)">{{ viewData.length_cm }}</el-descriptions-item>
        <el-descriptions-item label="宽(cm)">{{ viewData.width_cm }}</el-descriptions-item>
        <el-descriptions-item label="件数">{{ viewData.piece_count }}</el-descriptions-item>
        <el-descriptions-item label="数量cm²">{{ viewData.area_cm2 }}</el-descriptions-item>
        <el-descriptions-item label="单价">{{ viewData.unit_price }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ viewData.amount }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ viewData.created_by }}</el-descriptions-item>
        <el-descriptions-item label="创建日期">{{ formatDateTime(viewData.created_date) }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 图片显示 -->
      <div v-if="getImageList(viewData.image_path).length > 0" class="image-preview">
        <el-divider>异常图片</el-divider>
        <div class="image-gallery">
          <el-image
            v-for="(imageInfo, index) in getImageList(viewData.image_path)"
            :key="index"
            :src="imageInfo.url"
            :preview-src-list="getImageList(viewData.image_path).map(img => img.url)"
            :initial-index="index"
            fit="cover"
            style="width: 100px; height: 100px; margin-right: 8px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;"
          >
            <template #error>
              <div class="image-slot">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        
        <!-- 注释掉自定义图片预览对话框，现在使用el-image的内置预览功能 -->
        <!--
        <el-dialog
          v-model="imagePreviewVisible"
          title="图片预览"
          :show-close="true"
          :close-on-click-modal="true"
          :close-on-press-escape="true"
          width="90%"
          style="max-width: 1200px;"
          class="image-preview-dialog"
          @close="closeImagePreview"
        >
          <ImagePreview
            v-if="currentPreviewImage"
            :file-path="currentPreviewImage"
            :width="'100%'"
            :height="'70vh'"
            :module="'publishing-exception'"
          />
        </el-dialog>
        -->
      </div>
    </el-dialog>
    
    <AppFooter />
  </div>
</template>

<script setup>
/**
 * 出版异常管理页面
 * 
 * 功能说明：
 * 1. 出版异常记录的增删改查
 * 2. 数据筛选和搜索
 * 3. 数据统计和图表展示
 * 4. 图片上传和预览
 * 5. 数据导出功能
 */

import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Delete, Download, View, Edit, Refresh, Filter, Picture
} from '@element-plus/icons-vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import FileUpload from '@/components/FileUpload.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'

// 用户信息
const userStore = useUserStore()
const currentUser = computed(() => userStore.user?.Username || '系统')

// 页面状态
const activeTab = ref('records')
const loading = ref(false)
const submitLoading = ref(false)

// 筛选条件
const filters = reactive({
  customerCode: '',
  workOrderNumber: 'GD',
  productName: '',
  responsibleUnit: '',
  errorType: '',  // 错误类型筛选条件，用于按错误类型筛选出版异常记录
  dateRange: []
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])
const tableRef = ref()

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 5,  // 设置默认为5条/页
  total: 0
})

// 统计数据
const statistics = ref({
  summary: {},
  byUnit: [],
  byMonth: []
})

// 图表引用
const unitChartRef = ref()
const monthlyChartRef = ref()
let unitChart = null
let monthlyChart = null

// 对话框状态
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const currentEditId = ref(null)

// 表单数据
const formData = reactive({
  registration_date: '',
  publishing_date: '',
  customer_code: '',
  work_order_number: '',
  product_name: '',
  plate_type: '',
  publishing_sheets: null,
  exception_description: '',
  error_type: '',  // 错误类型字段，用于分类管理异常
  responsible_unit: '设计部',
  responsible_person: '',
  length_cm: null,
  width_cm: null,
  piece_count: null,
  area_cm2: null,
  unit_price: null,
  amount: null,
  image_path: ''  // 最终保存到数据库的图片路径
})

// 临时文件路径存储（对话框中上传成功但未提交的文件）
const tempUploadedFiles = ref([])
// 编辑时的原始文件列表
const originalFiles = ref([])
// 被删除的文件列表
const removedFiles = ref([])

// 工单号后缀（用于界面显示）
const workOrderSuffix = ref('')

// 筛选区工单号后缀
const filterWorkOrderSuffix = ref('')

// 查看数据
const viewData = ref({})

// 图片预览相关
const imagePreviewVisible = ref(false)
const currentPreviewImage = ref('')

// 新增/编辑对话框中的图片预览相关
const dialogImagePreviewVisible = ref(false)
const currentDialogPreviewImage = ref('')

// 表单验证规则
const formRules = {
  registration_date: [{ required: true, message: '请选择登记日期', trigger: 'change' }],
  customer_code: [{ required: true, message: '请输入客户代码', trigger: 'blur' }],
  work_order_number: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  product_name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  responsible_unit: [{ required: true, message: '请选择责任单位', trigger: 'change' }],
  responsible_person: [{ required: true, message: '请输入责任人', trigger: 'blur' }],
  exception_description: [{ required: true, message: '请输入异常描述', trigger: 'blur' }]
}

// 文件上传 - 出版异常专用配置
const uploadRef = ref()
const fileList = ref([])
const publishingExceptionUploadAction = computed(() => `${apiService.baseURL}/publishing-exceptions/upload-image`)
const publishingExceptionUploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token || localStorage.getItem('token')}`,
  'Content-Type': 'multipart/form-data'
}))

// 表单引用
const formRef = ref()

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑出版异常' : '新增出版异常')



// 部门列表
const departmentList = ref([])

// 产品名称列表
const productNameList = ref([])

/**
 * 获取部门列表数据
 */
const fetchDepartments = async () => {
  try {
    const response = await apiService.get('/departments')
    // 获取部门列表数据用于下拉选择器
    if (response.data.success) {
      departmentList.value = response.data.data
    } else {
      ElMessage.error('获取部门列表失败')
    }
  } catch (error) {
    ElMessage.error('获取部门列表失败')
  }
}

/**
 * 获取产品名称列表数据
 */
const fetchProductNames = async () => {
  try {
    // 确保apiService已初始化
    await apiService.initialize()
    const response = await apiService.get('/publishing-exceptions/product-names')
    if (response.data.success) {
      productNameList.value = response.data.data
    } else {
      ElMessage.error('获取产品名称列表失败')
    }
  } catch (error) {
    console.error('获取产品名称列表失败:', error)
    ElMessage.error('获取产品名称列表失败')
  }
}

/**
 * 获取出版异常列表数据
 */
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...filters
    }
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    const response = await apiService.get('/publishing-exceptions', { params })
    
    if (response.data.success) {
      tableData.value = response.data.data
      pagination.total = response.data.pagination.total
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取统计数据
 */
const fetchStatistics = async () => {
  try {
    const params = {}
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    if (filters.responsibleUnit) {
      params.responsibleUnit = filters.responsibleUnit
    }
    
    const response = await apiService.get('/publishing-exceptions/statistics/summary', { params })
    
    if (response.data.success) {
      statistics.value = response.data.data
      
      // 更新图表
      nextTick(() => {
        updateCharts()
      })
    }
  } catch (error) {
    ElMessage.error('获取统计数据失败')
  }
}

/**
 * 更新图表
 */
const updateCharts = () => {
  // 责任单位统计图表
  if (unitChartRef.value && statistics.value.byUnit) {
    if (!unitChart) {
      unitChart = echarts.init(unitChartRef.value)
    }
    
    const unitOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: [{
        name: '异常数量',
        type: 'pie',
        radius: '50%',
        data: statistics.value.byUnit.map(item => ({
          name: item.responsible_unit,
          value: item.count
        }))
      }]
    }
    
    unitChart.setOption(unitOption)
  }
  
  // 月份统计图表
  if (monthlyChartRef.value && statistics.value.byMonth) {
    if (!monthlyChart) {
      monthlyChart = echarts.init(monthlyChartRef.value)
    }
    
    const monthlyOption = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: statistics.value.byMonth.map(item => item.month)
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        name: '异常数量',
        type: 'bar',
        data: statistics.value.byMonth.map(item => item.count)
      }]
    }
    
    monthlyChart.setOption(monthlyOption)
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.current = 1
  fetchData()
  if (activeTab.value === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 重置筛选条件
 */
const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    if (Array.isArray(filters[key])) {
      filters[key] = []
    } else {
      filters[key] = ''
    }
  })
  // 重置筛选区工单号后缀
  filterWorkOrderSuffix.value = ''
  handleSearch()
}

/**
 * 处理客户代码输入，自动转换为大写
 */
const handleCustomerCodeInput = (value) => {
  filters.customerCode = value.toUpperCase()
}

/**
 * 处理表单中客户代码输入，自动转换为大写
 */
const handleFormCustomerCodeInput = (value) => {
  formData.customer_code = value.toUpperCase()
}

/**
 * 处理筛选区工单号输入，只允许输入数字和小数点，限制小数位数不超过2位
 */
const handleFilterWorkOrderInput = (value) => {
  // 只允许数字和小数点
  let filteredValue = value.replace(/[^0-9.]/g, '')
  
  // 确保只有一个小数点
  const dotCount = (filteredValue.match(/\./g) || []).length
  if (dotCount > 1) {
    const firstDotIndex = filteredValue.indexOf('.')
    filteredValue = filteredValue.substring(0, firstDotIndex + 1) + filteredValue.substring(firstDotIndex + 1).replace(/\./g, '')
  }
  
  // 限制小数位数不超过2位
  const dotIndex = filteredValue.indexOf('.')
  if (dotIndex !== -1 && filteredValue.length > dotIndex + 3) {
    filteredValue = filteredValue.substring(0, dotIndex + 3)
  }
  
  filterWorkOrderSuffix.value = filteredValue
  // 组合前缀"GD"和后缀生成完整工单号
  filters.workOrderNumber = filteredValue ? 'GD' + filteredValue : ''
}

/**
 * 处理工单号输入，自动转换为大写（保留原方法以防其他地方使用）
 */
const handleWorkOrderInput = (value) => {
  filters.workOrderNumber = value.toUpperCase()
}

/**
 * 处理表单中工单号输入，只允许输入数字和小数点，限制小数位数不超过2位
 */
const handleFormWorkOrderInput = (value) => {
  // 只允许数字和小数点
  let filteredValue = value.replace(/[^0-9.]/g, '')
  
  // 确保只有一个小数点
  const dotCount = (filteredValue.match(/\./g) || []).length
  if (dotCount > 1) {
    const firstDotIndex = filteredValue.indexOf('.')
    filteredValue = filteredValue.substring(0, firstDotIndex + 1) + filteredValue.substring(firstDotIndex + 1).replace(/\./g, '')
  }
  
  // 限制小数位数不超过2位
  const dotIndex = filteredValue.indexOf('.')
  if (dotIndex !== -1 && filteredValue.length > dotIndex + 3) {
    filteredValue = filteredValue.substring(0, dotIndex + 3)
  }
  
  workOrderSuffix.value = filteredValue
  // 组合前缀"GD"和后缀生成完整工单号
  formData.work_order_number = 'GD' + filteredValue
}

/**
 * 标签页切换
 */
const handleTabClick = (tab) => {
  if (tab.props.name === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 新增记录
 */
const handleAdd = () => {
  isEdit.value = false
  currentEditId.value = null
  resetFormData()
  
  // 清空所有文件相关列表
  fileList.value = []
  tempUploadedFiles.value = []
  originalFiles.value = []
  removedFiles.value = []
  
  dialogVisible.value = true
}

/**
 * 编辑记录
 */
const handleEdit = (row) => {
  isEdit.value = true
  currentEditId.value = row.id
  
  // 填充表单数据
  Object.keys(formData).forEach(key => {
    formData[key] = row[key]
  })
  
  // 处理工单号：提取后缀部分
  if (row.work_order_number && row.work_order_number.startsWith('GD')) {
    workOrderSuffix.value = row.work_order_number.substring(2)
  } else {
    workOrderSuffix.value = row.work_order_number || ''
  }
  
  // 处理文件列表 - 支持新的JSON格式和旧的字符串格式
  if (row.image_path) {
    try {
      // 尝试解析JSON格式（新格式）
      const imageData = JSON.parse(row.image_path)
      if (Array.isArray(imageData)) {
        // 新格式：JSON数组
        fileList.value = imageData.map(item => ({
          name: item.originalName || item.filename,
          url: getImageUrl(item.filename, false), // 强制重新生成URL，确保环境适配
          path: item.relativePath || `uploads\\site-images\\publishing-exception\\${item.filename}`,
          filename: item.filename,
          originalName: item.originalName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          uploadTime: item.uploadTime,
          fileType: item.fileType,
          category: item.category,
          id: item.id
        }))
        tempUploadedFiles.value = [] // 编辑模式下不应将已存在文件放入临时上传列表
        originalFiles.value = [...imageData] // 保存原始文件列表
      } else {
        // 可能是单个对象格式
        const fileInfo = {
          name: imageData.originalName || imageData.filename,
          url: getImageUrl(imageData.filename, false), // 强制重新生成URL，确保环境适配
          path: imageData.relativePath || `uploads\\site-images\\publishing-exception\\${imageData.filename}`,
          filename: imageData.filename,
          originalName: imageData.originalName,
          fileSize: imageData.fileSize,
          mimeType: imageData.mimeType,
          uploadTime: imageData.uploadTime,
          fileType: imageData.fileType,
          category: imageData.category,
          id: imageData.id
        }
        fileList.value = [fileInfo]
        tempUploadedFiles.value = [] // 编辑模式下不应将已存在文件放入临时上传列表
        originalFiles.value = [imageData] // 保存原始文件列表
      }
    } catch (e) {
      // 解析失败，按旧格式处理（字符串格式）
      const fileInfo = {
        name: row.image_path,
        url: getImageUrl(row.image_path, false), // 已存在的图片不添加时间戳
        path: `uploads\\site-images\\publishing-exception\\${row.image_path}`,
        filename: row.image_path
      }
      fileList.value = [fileInfo]
      tempUploadedFiles.value = [] // 编辑模式下不应将已存在文件放入临时上传列表
      originalFiles.value = [fileInfo] // 保存原始文件列表
    }
  } else {
    fileList.value = []
    tempUploadedFiles.value = []
    originalFiles.value = [] // 清空原始文件列表
  }
  
  // 清空删除文件列表
  removedFiles.value = []
  
  // 调试信息：检查编辑模式下的文件列表
  // 编辑模式下的文件列表已初始化
  
  dialogVisible.value = true
}

/**
 * 查看记录
 */
/**
 * 查看详情
 * 确保查看详情时不受编辑状态影响，清理可能的缓存数据
 */
const handleView = (row) => {
  // 清理编辑状态的缓存数据，避免影响查看详情
  fileList.value = []
  tempUploadedFiles.value = []
  originalFiles.value = []
  removedFiles.value = []
  
  // 设置查看数据
  viewData.value = { ...row }
  viewDialogVisible.value = true
}

/**
 * 删除记录
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await apiService.delete(`/publishing-exceptions/${row.id}`, {
      data: { deleted_by: currentUser.value }
    })
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchData()
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
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量删除
    const deletePromises = selectedRows.value.map(row => 
      apiService.delete(`/publishing-exceptions/${row.id}`, {
        data: { deleted_by: currentUser.value }
      })
    )
    
    await Promise.all(deletePromises)
    
    ElMessage.success('批量删除成功')
    fetchData()
    selectedRows.value = []
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出数据
 */
/**
 * 导出数据功能 - 调用后端Excel导出接口
 */
const handleExport = async () => {
  try {
    // 导出前确认对话框
    await ElMessageBox.confirm(
      '确定要导出当前数据吗？',
      '导出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.info('正在生成Excel文件，请稍候...')
    
    // 调用后端导出接口
    const response = await fetch('/api/publishing-exceptions/export', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`导出失败: ${response.status}`)
    }
    
    // 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `出版异常数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1])
      }
    }
    
    // 获取文件数据
    const blob = await response.blob()
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('Excel文件导出成功')
    
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
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
  pagination.current = 1
  fetchData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.current = page
  fetchData()
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    // 获取新上传的文件信息，过滤掉服务器路径的图片
    let uploadedFileInfo = []
    if (tempUploadedFiles.value && tempUploadedFiles.value.length > 0) {
      // 过滤掉来自服务器的图片（路径包含uploads/或以http开头）
      uploadedFileInfo = tempUploadedFiles.value.filter(file => {
        const isServerPath = file.path && (
          file.path.includes('uploads/') || 
          file.path.includes('uploads\\') ||
          (file.url && file.url.startsWith('http'))
        )
        if (isServerPath) {
          // 过滤服务器路径图片
          return false
        }
        return true
      })
      // 过滤后的新上传文件
    }
    
    // 处理图片路径信息 - 合并原有文件和新增文件
    let finalFileList = []
    
    if (isEdit.value) {
      // 编辑模式：合并原有文件（排除被删除的）和新增文件
      // 1. 添加未被删除的原有文件
      const remainingOriginalFiles = originalFiles.value.filter(originalFile => 
        !removedFiles.value.some(removedFile => removedFile.filename === originalFile.filename)
      )
      finalFileList = [...remainingOriginalFiles]
      
      // 2. 添加新上传的文件
      if (uploadedFileInfo.length > 0) {
        finalFileList = [...finalFileList, ...uploadedFileInfo]
      }
      
      // 编辑模式文件统计
    } else {
      // 新增模式：只有新上传的文件
      finalFileList = uploadedFileInfo
      // 新增模式文件统计
    }
    
    // 保存最终的文件列表
    if (finalFileList.length > 0) {
      formData.image_path = JSON.stringify(finalFileList)
      // 保存文件信息到image_path
    } else {
      formData.image_path = ''
      // 无文件，清空image_path
    }
    
    const submitData = {
      ...formData,
      created_by: isEdit.value ? undefined : currentUser.value,
      updated_by: isEdit.value ? currentUser.value : undefined,
      // 在编辑模式下传递被删除的文件信息给后端
      removedFiles: isEdit.value ? removedFiles.value : []
    }
    
    let response
    if (isEdit.value) {
      response = await apiService.put(`/publishing-exceptions/${currentEditId.value}`, submitData)
    } else {
      response = await apiService.post('/publishing-exceptions', submitData)
    }
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
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
 * 关闭对话框
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetFormData()
  fileList.value = []
  // 清空所有文件相关列表
  tempUploadedFiles.value = []
  originalFiles.value = []
  removedFiles.value = []
  formRef.value?.clearValidate()
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'work_order_number') {
      formData[key] = 'GD' // 保持工单号默认值
    } else if (key === 'responsible_unit') {
      formData[key] = '设计部' // 保持责任单位默认值
    } else if (typeof formData[key] === 'number') {
      formData[key] = null
    } else {
      formData[key] = ''
    }
  })
  
  // 重置工单号后缀
  workOrderSuffix.value = ''
  
  // 清空临时文件列表
  tempUploadedFiles.value = []
  
  // 设置默认登记日期为今天
  formData.registration_date = new Date().toISOString().split('T')[0]
  // 设置默认责任单位为设计部
  formData.responsible_unit = '设计部'
}

/**
 * 刷新数据
 */
const refreshData = () => {
  fetchData()
  if (activeTab.value === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 自定义上传处理
 */
const handleCustomUpload = (file) => {
  return new Promise((resolve, reject) => {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    
    // 使用fetch进行上传
    fetch(publishingExceptionUploadAction.value, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token || localStorage.getItem('token')}`
      },
      body: uploadFormData
    })
    .then(response => {
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回的不是JSON格式')
      }
      
      return response.json()
    })
    .then(data => {
      if (data.success) {
        // 使用新的fileInfo对象格式，如果不存在则使用旧格式兼容
        let fileInfo
        
        if (data.fileInfo) {
          // 新格式：使用完整的文件信息对象
          fileInfo = {
            id: data.fileInfo.id,
            name: file.name,
            originalName: data.fileInfo.originalName,
            filename: data.fileInfo.filename,
            relativePath: data.fileInfo.relativePath,
            accessUrl: data.fileInfo.accessUrl,
            fullUrl: data.fileInfo.fullUrl,
            fileSize: data.fileInfo.fileSize,
            mimeType: data.fileInfo.mimeType,
            uploadTime: data.fileInfo.uploadTime,
            fileType: data.fileInfo.fileType,
            category: data.fileInfo.category,
            // 兼容旧的字段名
            url: data.fileInfo.accessUrl,
            path: data.fileInfo.relativePath,
            size: data.fileInfo.fileSize
          }
        } else {
          // 旧格式兼容
          fileInfo = {
            name: file.name,
            url: getImageUrl(data.data?.filename || data.filename, true), // 新上传的文件使用防缓存机制
            path: data.data?.path || `uploads/site-images/publishing-exception/${data.data?.filename || data.filename}`,
            filename: data.data?.filename || data.filename,
            originalname: data.data?.originalname || data.originalName,
            size: data.data?.size || data.size
          }
        }
        
        // 保存到临时文件列表
        tempUploadedFiles.value.push(fileInfo)
        
        // 文件上传成功，保存到临时列表
        
        // 返回文件信息给组件
        resolve(fileInfo)
      } else {
        reject(data.message || '图片上传失败')
      }
    })
    .catch(error => {
      console.error('上传失败:', error)
      reject(error.message || '图片上传失败')
    })
  })
}

/**
 * 文件列表变化处理
 */
const handleFileChange = (files) => {
  // 文件列表变化处理
  
  // 只有当传入的文件数组长度大于当前文件列表长度时才更新
  // 这样可以避免删除操作后重新添加文件
  if (files.length > fileList.value.length) {
    fileList.value = [...files]
    // 更新文件列表
  } else {
    // 跳过文件列表更新，避免删除后重新添加
  }
  
  // 文件列表变化时不直接修改formData.image_path
  // 只在用户点击创建或更新时才将临时文件路径保存到formData.image_path
}

/**
 * 文件删除处理
 */
/**
 * 处理文件删除
 * @param {Array} deletedFiles - 被删除的文件列表
 */
const handleFileRemove = (deletedFiles) => {
  // 处理文件删除
  
  deletedFiles.forEach((deletedFile) => {
    // 处理删除文件
    
    // 获取删除文件的关键信息
    const deletedFileName = deletedFile.name || deletedFile.originalName
    const deletedFileFilename = deletedFile.filename
    const deletedFileUrl = deletedFile.url
    
    // 创建文件匹配函数
    const isFileMatch = (file) => {
      const fileName = file.name || file.originalName
      const fileFilename = file.filename
      const fileUrl = file.url
      
      // 优先使用filename匹配，其次使用name，最后使用url
      if (fileFilename && deletedFileFilename) {
        return fileFilename === deletedFileFilename
      }
      if (fileName && deletedFileName) {
        return fileName === deletedFileName
      }
      if (fileUrl && deletedFileUrl) {
        return fileUrl === deletedFileUrl
      }
      return false
    }
    
    // 从 fileList 中移除
    const fileListIndex = fileList.value.findIndex(isFileMatch)
    if (fileListIndex > -1) {
      fileList.value.splice(fileListIndex, 1)
      // 从fileList中删除文件
    }
    
    // 从临时文件列表中移除
    const tempIndex = tempUploadedFiles.value.findIndex(isFileMatch)
    if (tempIndex > -1) {
      tempUploadedFiles.value.splice(tempIndex, 1)
      // 从临时文件列表中删除文件
    }
    
    // 如果是原始文件，添加到删除列表中
    const originalIndex = originalFiles.value.findIndex(isFileMatch)
    if (originalIndex > -1) {
      const removedFile = originalFiles.value[originalIndex]
      removedFiles.value.push(removedFile)
      originalFiles.value.splice(originalIndex, 1)
      // 从原始文件列表中删除文件，添加到删除列表
    }
  })
  
  // 删除完成
}

/**
 * 上传前检查
 */
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

/**
 * 获取图片URL（兼容旧格式）
 * 生成包含端口号8080的完整图片访问URL
 * @param {string} imagePath - 图片路径
 * @param {boolean} preventCache - 是否添加时间戳防止缓存，默认false
 */
/**
 * 根据当前环境动态生成图片URL
 * @param {string} imagePath - 图片路径
 * @param {boolean} preventCache - 是否防止缓存
 * @returns {string} 完整的图片URL
 */
const getImageUrl = (imagePath, preventCache = false) => {
  if (!imagePath) return ''
  
  // 动态获取API基础URL，支持开发环境和生产环境
  const envApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  
  // 构建图片URL
  let url
  if (envApiBase.includes('localhost') || envApiBase.includes('127.0.0.1')) {
    // 开发环境：使用后端服务的文件路由
    url = `${envApiBase}/files/site-images/publishing-exception/${imagePath}`
  } else {
    // 生产环境：使用文件服务器端口8080
    const baseUrl = envApiBase.replace(':3001', ':8080').replace('/api', '')
    url = `${baseUrl}/files/site-images/publishing-exception/${imagePath}`
  }
  
  // 只在需要防止缓存时添加时间戳参数
  if (preventCache) {
    const timestamp = Date.now()
    url += `?t=${timestamp}`
  }
  
  return url
}

/**
 * 解析图片路径，支持新的JSON格式和旧的字符串格式
 */
const getImageList = (imagePath) => {
  if (!imagePath) return []
  
  try {
    // 尝试解析JSON格式（新格式）
    const imageArray = JSON.parse(imagePath)
    if (Array.isArray(imageArray)) {
      return imageArray.map(imageInfo => ({
        ...imageInfo,
        url: getImageUrl(imageInfo.filename, false) // 强制重新生成URL，确保环境适配
      }))
    }
  } catch (e) {
    // 如果解析失败，说明是旧格式（字符串）
    // 使用旧格式图片路径
  }
  
  // 旧格式兼容：直接是文件名字符串
  if (typeof imagePath === 'string' && imagePath.trim()) {
    return [{
      filename: imagePath,
      originalName: imagePath,
      url: getImageUrl(imagePath, false), // 查看详情时不添加时间戳
      path: `uploads/site-images/publishing-exception/${imagePath}`
    }]
  }
  
  return []
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '未知大小'
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化数字
 */
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

/**
 * 格式化日期为 yyyy-mm-dd 格式
 * 处理时区偏移问题
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    // 创建Date对象
    const date = new Date(dateString)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    
    // 获取本地日期（避免时区偏移）
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('日期格式化错误:', error)
    return ''
  }
}

/**
 * 格式化日期时间为 yyyy-mm-dd hh:mm:ss 格式
 * 处理时区偏移问题，显示当前时区的日期时间
 */
const formatDateTime = (dateString) => {
  if (!dateString) return ''
  
  try {
    // 创建Date对象
    const date = new Date(dateString)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    
    // 获取本地日期时间（避免时区偏移）
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('日期时间格式化错误:', error)
    return ''
  }
}

// 自动计算功能
/**
 * 监听长度和宽度变化，自动计算数量cm²
 */
watch(
  () => [formData.length_cm, formData.width_cm],
  ([length, width]) => {
    if (length && width && length > 0 && width > 0) {
      formData.area_cm2 = Number((length * width).toFixed(2))
    } else {
      formData.area_cm2 = null
    }
  },
  { immediate: true }
)

/**
 * 监听数量和单价变化，自动计算金额
 */
watch(
  () => [formData.area_cm2, formData.unit_price],
  ([area, price]) => {
    if (area && price && area > 0 && price > 0) {
      formData.amount = Number((area * price).toFixed(2))
    } else {
      formData.amount = null
    }
  },
  { immediate: true }
)

/**
 * 格式化金额显示
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额字符串
 */
const formatAmount = (amount) => {
  if (!amount || amount === 0) return '¥0.0'
  return '¥' + Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
}

/**
 * 打开图片预览弹窗
 * @param {string|Object} imagePathOrInfo - 图片路径字符串或图片信息对象
 */
const openImagePreview = (imagePathOrInfo) => {
  let imagePath = imagePathOrInfo
  
  // 如果传入的是对象（图片信息），优先使用filename而不是完整URL
  // ImagePreview组件需要的是原始文件名，它会自己生成正确的URL
  if (typeof imagePathOrInfo === 'object' && imagePathOrInfo !== null) {
    imagePath = imagePathOrInfo.filename || imagePathOrInfo.path || imagePathOrInfo.url
  }
  
  currentPreviewImage.value = imagePath
  imagePreviewVisible.value = true
}

/**
 * 关闭图片预览弹窗
 */
const closeImagePreview = () => {
  imagePreviewVisible.value = false
  currentPreviewImage.value = ''
}

/**
 * 打开新增/编辑对话框中的图片预览
 * @param {Object} imageInfo - 图片信息对象
 */
const openImagePreviewInDialog = (imageInfo) => {
  // 优先使用完整URL，然后是访问URL，最后是通过文件名生成URL
  const imageUrl = getImageUrl(imageInfo.filename, false) // 强制重新生成URL，确保环境适配
  currentDialogPreviewImage.value = imageUrl
  dialogImagePreviewVisible.value = true
}

/**
 * 关闭新增/编辑对话框中的图片预览
 */
const closeDialogImagePreview = () => {
  dialogImagePreviewVisible.value = false
  currentDialogPreviewImage.value = ''
}

/**
 * 处理FileUpload组件的文件预览事件
 * @param {Object} fileInfo - 文件信息对象
 * @param {string} url - 文件URL（可能是本地预览URL）
 */
const handleFilePreview = (fileInfo, url) => {
  // 处理文件预览
  
  let imageUrl = url
  
  // 如果没有传入URL，强制使用getImageUrl重新生成
  if (!imageUrl && fileInfo.filename) {
    imageUrl = getImageUrl(fileInfo.filename, false) // 强制重新生成URL，确保环境适配
  }
  
  // 最终图片URL
  
  if (imageUrl) {
    currentDialogPreviewImage.value = imageUrl
    dialogImagePreviewVisible.value = true
    // 设置对话框可见性
  } else {
    // 警告：未找到有效的图片URL
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchDepartments()
  fetchProductNames() // 获取产品名称列表
  fetchData()
  fetchStatistics() // 页面加载时获取统计数据
})
</script>

<style scoped>
.common-layout {
  min-height: 100vh;
  background: #f5f7fa;
  padding-top: 90px; /* 为导航栏留出空间 */
}

.el-main {
  margin-top: 0 !important;
  padding-top: 0;
}

/* el-tabs 美化样式 */
.el-tabs {
  background: #fff;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid #dcdfe6;
}

/* 标签页头部样式 */
.el-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
  border-radius: 0;
  padding: 0 20px;
}

/* 标签页导航样式 */
.el-tabs :deep(.el-tabs__nav-wrap) {
  padding: 10px 0;
}

.el-tabs :deep(.el-tabs__nav) {
  border: none;
}

/* 标签页项目样式 */
.el-tabs :deep(.el-tabs__item) {
  height: 45px;
  line-height: 45px;
  padding: 0 25px;
  margin-right: 8px;
  border: none;
  border-radius: 0;
  font-weight: 500;
  font-size: 14px;
  color: #666;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.el-tabs :deep(.el-tabs__item):hover {
  color: #409EFF;
  background: transparent;
}

/* 激活状态的标签页 */
.el-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  background: transparent;
}

/* 移除默认的活动指示器 */
.el-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

/* 标签页内容区域 */
.el-tabs :deep(.el-tabs__content) {
  background: #fff;
  border-radius: 0;
  min-height: 400px;
  position: relative;
}

.el-tabs :deep(.el-tab-pane) {
  padding: 25px;
  animation: fadeInUp 0.5s ease-out;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 标签页切换动画 */
.el-tabs :deep(.el-tabs__item) {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-tabs :deep(.el-tabs__item) {
    padding: 0 15px;
    margin-right: 5px;
    font-size: 13px;
  }
  
  .el-tabs :deep(.el-tabs__header) {
    padding: 0 10px;
  }
  
  .el-tabs :deep(.el-tab-pane) {
    padding: 15px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .el-tabs {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
  
  .el-tabs :deep(.el-tabs__header) {
    background: rgba(45, 55, 72, 0.95);
  }
  
  .el-tabs :deep(.el-tabs__content) {
    background: #2d3748;
    color: #e2e8f0;
  }
}

.sidebar-placeholder {
  margin-bottom: 20px;
  border: 1px dashed #dcdfe6;
  background-color: #fafafa;
}

.sidebar-placeholder :deep(.el-card__body) {
  padding: 20px;
  text-align: center;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;
}

.placeholder-content .el-icon {
  font-size: 24px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-card :deep(.el-card__body) {
  padding: 16px;
}

.filter-form {
  width: 100%;
  margin: 0 auto;
}

.filter-form .el-form-item {
  margin-bottom: 16px;
}

/* 日期选择器样式优化 */
.date-range-picker {
  width: 100%;
}

.date-range-picker :deep(.el-input__wrapper) {
  min-width: 220px;
  width: 100%;
}

.date-range-picker :deep(.el-range-input) {
  font-size: 12px;
  width: auto;
  min-width: 80px;
  flex: 1;
}

.date-range-picker :deep(.el-range-separator) {
  padding: 0 4px;
  font-size: 12px;
  white-space: nowrap;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.statistics-content {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
}

.stat-item {
  padding: 20px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.charts-row {
  margin-top: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 300px;
}

.quick-actions-card {
  margin-bottom: 20px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}

.info-card {
  margin-top: 20px;
}

.info-items {
  padding: 10px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-size: 14px;
}

.info-value {
  color: #409EFF;
  font-weight: 400;
}

.stat-number {
  font-family: Arial, sans-serif;
  color: rgb(196, 86, 86);
  font-size: 1em;
}

.image-preview {
  margin-top: 20px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 操作列按钮样式 */
.el-table .el-table__body .el-button {
  padding-left: 8px;
  padding-right: 8px;
  margin-right: 5px;
}

/* 操作列按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  min-width: auto;
  padding: 5px 8px;
}



/* 工单号前缀样式 - 移除背景色 */
.el-input-group__prepend {
  background-color: transparent !important;
  border: none !important;
  padding: 0 8px;
}

/* 设置筛选区工单号后缀输入框的左右padding */
.filter-work-order-suffix .el-input__wrapper .el-input__inner {
  padding-left: 2px !important;
  padding-right: 2px !important;
}

.filter-work-order-suffix .el-input__inner {
  padding-left: 2px !important;
  padding-right: 2px !important;
}

.filter-work-order-suffix input {
  padding-left: 2px !important;
  padding-right: 2px !important;
}

/* 工单号输入框提示文字warning色样式 */
.filter-work-order-suffix[title],
.el-input[title*="只能输入数字和小数点"] {
  position: relative;
}

.filter-work-order-suffix[title]:hover::after,
.el-input[title*="只能输入数字和小数点"]:hover::after {
  content: attr(title);
  position: absolute;
  top: -35px;
  left: 0;
  background-color: #f56c6c;
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.filter-work-order-suffix[title]:hover::before,
.el-input[title*="只能输入数字和小数点"]:hover::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 10px;
  border: 5px solid transparent;
  border-top-color: #f56c6c;
  z-index: 1000;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-aside {
    width: 100% !important;
    margin-bottom: 20px;
  }
  
  .el-container {
    flex-direction: column;
  }
  
  .stats-cards .el-col {
    margin-bottom: 20px;
  }
}
</style>