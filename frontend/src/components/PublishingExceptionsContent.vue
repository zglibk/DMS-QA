<template>
  <div class="publishing-exceptions-content">
    <!-- 顶部统计卡片 -->
    <div class="top-stats">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
          <div class="stat-card stat-card-blue">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(statistics.totalRecords) }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
          <div class="stat-card stat-card-red">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatAmount(statistics.totalAmount) }}</div>
              <div class="stat-label">总损失金额</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
          <div class="stat-card stat-card-orange">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatAmount(statistics.currentMonthAmount) }}</div>
              <div class="stat-label">本月损失</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
          <div class="stat-card stat-card-green">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(statistics.monthly_new) }}</div>
              <div class="stat-label">本月新增</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

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
                    <el-option label="出标方向" value="出标方向" />
                    <el-option label="出血位偏差" value="出血位偏差" />
                    <el-option label="内容错误" value="内容错误" />
                    <el-option label="图文残缺" value="图文残缺" />
                    <el-option label="字体错误" value="字体错误" />
                    <el-option label="图文效果" value="图文效果" />
                    <el-option label="多出版" value="多出版" />
                    <el-option label="漏出版" value="漏出版" />
                    <el-option label="制版错误" value="制版错误" />
                    <el-option label="不匹配刀模" value="不匹配刀模" />
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
              <el-button type="primary" @click="handleAdd" :disabled="!canAdd">
                <el-icon><Plus /></el-icon>
                新增记录
              </el-button>
              <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0 || !canDelete">
                <el-icon><Delete /></el-icon>
                批量删除
              </el-button>
              <el-button @click="handleExport" :disabled="!canExport">
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
              @row-dblclick="handleRowDoubleClick"
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
              <el-table-column prop="area_cm2" label="数量cm²" width="90" align="center" header-align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <span style="white-space: nowrap;">{{ row.area_cm2 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="amount" label="金额" width="80" align="center" header-align="center">
                <template #default="{ row }">
                  {{ formatAmount(row.amount) }}
                </template>
              </el-table-column>
              
              <el-table-column label="操作" min-width="210" fixed="right" header-align="center">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <el-button type="primary" size="small" @click="handleView(row)">
                      <el-icon><View /></el-icon>
                      查看
                    </el-button>
                    <el-button type="primary" size="small" @click="handleEdit(row)" :disabled="!canEdit">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button>
                    <el-button type="danger" size="small" @click="handleDelete(row)" :disabled="!canDelete">
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
            
            <!-- 图表区域 -->
            <el-row :gutter="20" class="charts-row">
              <el-col :span="12">
                <el-card class="chart-card">
                  <template #header>
                    <span>按错误类型统计</span>
                  </template>
                  <div ref="errorTypeChartRef" class="chart-container"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card class="chart-card">
                  <template #header>
                    <span>年度成本损失趋势</span>
                  </template>
                  <div ref="costTrendChartRef" class="chart-container"></div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>

    <!-- 导出选项对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="出版异常记录 - 导出确认"
      width="480px"
      :close-on-click-modal="false"
      class="export-dialog"
    >
      <div class="export-options">         
        <el-form label-width="0px" class="export-form">
          <div class="export-option-item">
            <div class="option-header">
              <el-icon class="option-icon"><Picture /></el-icon>
              <span class="option-label">导出内容</span>
            </div>
            <div class="option-content">
              <el-checkbox v-model="includeImages" class="custom-checkbox">
                <span class="checkbox-label">包含图片</span>
              </el-checkbox>
              <div class="export-tip">
                <el-icon class="tip-icon"><InfoFilled /></el-icon>
                <span class="tip-text">
                  勾选后同步导出图片嵌入到 Excel 中，文件体积会变大
                </span>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="export-dialog-footer">
          <el-button @click="exportDialogVisible = false" type="danger" >
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="confirmExport" class="confirm-btn">
            <el-icon><Download /></el-icon>
            确认导出
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑记录' : '新增记录'"
      width="900px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="left"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="登记日期" prop="registration_date">
              <el-date-picker
                v-model="formData.registration_date"
                type="date"
                placeholder="选择登记日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出版日期" prop="publishing_date">
              <el-date-picker
                v-model="formData.publishing_date"
                type="date"
                placeholder="选择出版日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户代码" prop="customer_code">
              <el-input v-model="formData.customer_code" placeholder="请输入客户代码" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="工单号" prop="work_order_number">
              <el-input v-model="formData.work_order_number" placeholder="请输入工单号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="产品名称" prop="product_name">
              <el-input v-model="formData.product_name" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="版类型" prop="plate_type">
              <el-select v-model="formData.plate_type" placeholder="请选择版类型" style="width: 100%">
                <el-option label="胶印版" value="胶印版" />
                <el-option label="柔印版" value="柔印版" />
                <el-option label="凹印版" value="凹印版" />
                <el-option label="丝印版" value="丝印版" />
                <el-option label="数码版" value="数码版" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="出版张数" prop="publishing_sheets">
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
        
        <el-row :gutter="20">
          <el-col :span="8">
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
                <el-option label="出标方向" value="出标方向" />
                <el-option label="出血位偏差" value="出血位偏差" />
                <el-option label="内容错误" value="内容错误" />
                <el-option label="图文残缺" value="图文残缺" />
                <el-option label="字体错误" value="字体错误" />
                <el-option label="图文效果" value="图文效果" />
                <el-option label="多出版" value="多出版" />
                <el-option label="漏出版" value="漏出版" />
                <el-option label="制版错误" value="制版错误" />
                <el-option label="不匹配刀模" value="不匹配刀模" />
                <el-option label="其它" value="其它" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="问题描述" prop="exception_description">
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
            :max-count="4"
            accept="image/*"
            tip="支持拖拽上传（最多4张）"
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
          <el-button @click="handleDialogClose" type="danger">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            <el-icon><Check v-if="isEdit" /><DocumentAdd v-else /></el-icon>
            {{ isEdit ? '保存' : '提交' }}
          </el-button>
        </span>
      </template>
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
        <el-descriptions-item label="金额">{{ formatAmount(viewData.amount) }}</el-descriptions-item>
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
      </div>
    </el-dialog>
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

import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Delete, Download, View, Edit, Refresh, Filter, Picture, Check, DocumentAdd, Close, InfoFilled, Money
} from '@element-plus/icons-vue'
import AppFooter from '@/components/common/AppFooter.vue'
import FileUpload from '@/components/FileUpload.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'

// 用户信息
const userStore = useUserStore()
const currentUser = computed(() => userStore.user?.Username || '系统')

// 权限检查
// 权限状态管理
const permissions = reactive({
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canExport: false
})

// 检查权限的异步方法
const checkPermissions = async () => {
  try {
    // 检查是否有管理员角色
    const hasAdminRole = userStore.hasRole && (userStore.hasRole('admin') || userStore.hasRole('系统管理员') || userStore.hasRole('质量经理'))
    
    if (hasAdminRole) {
      // 管理员拥有所有权限
      permissions.canAdd = true
      permissions.canEdit = true
      permissions.canDelete = true
      permissions.canExport = true
    } else {
      // 使用异步权限检查（支持用户级权限优先级）
      const [addPerm, editPerm, deletePerm, exportPerm] = await Promise.all([
        userStore.hasActionPermissionAsync('quality:publishing:add'),
        userStore.hasActionPermissionAsync('quality:publishing:edit'),
        userStore.hasActionPermissionAsync('quality:publishing:delete'),
        userStore.hasActionPermissionAsync('quality:publishing:export')
      ])
      
      permissions.canAdd = addPerm
      permissions.canEdit = editPerm
      permissions.canDelete = deletePerm
      permissions.canExport = exportPerm
    }
  } catch (error) {
    console.error('权限检查失败:', error)
    // 权限检查失败时，回退到角色权限
    const hasAdminRole = userStore.hasRole && (userStore.hasRole('admin') || userStore.hasRole('系统管理员') || userStore.hasRole('质量经理'))
    permissions.canAdd = hasAdminRole
    permissions.canEdit = hasAdminRole
    permissions.canDelete = hasAdminRole
    permissions.canExport = hasAdminRole
  }
}

// 兼容性computed属性（保持向后兼容）
const canAdd = computed(() => permissions.canAdd)

const canEdit = computed(() => permissions.canEdit)
const canDelete = computed(() => permissions.canDelete)
const canExport = computed(() => permissions.canExport)

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
  byMonth: [],
  byErrorType: [],  // 按错误类型统计
  costTrend: []     // 成本损失趋势
})

// 计算当前月份标题（yy-m格式）
const getCurrentMonthLabel = () => {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // 获取年份后两位
  const month = now.getMonth() + 1 // 获取月份（1-12）
  return `${year}年${month}月新增`
}

// 当前月份标题
const monthlyNewLabel = ref(getCurrentMonthLabel())

// 图表引用
const errorTypeChartRef = ref()
const costTrendChartRef = ref()
let errorTypeChart = null
let costTrendChart = null

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
  plate_type: [{ required: true, message: '请选择版类型', trigger: 'change' }],
  error_type: [{ required: true, message: '请选择错误类型', trigger: 'change' }],
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
    
    // 传递所有筛选条件，确保统计数据与筛选结果一致
    if (filters.customerCode) {
      params.customerCode = filters.customerCode
    }
    
    if (filters.workOrderNumber && filters.workOrderNumber !== 'GD') {
      params.workOrderNumber = filters.workOrderNumber
    }
    
    if (filters.productName) {
      params.productName = filters.productName
    }
    
    if (filters.responsibleUnit) {
      params.responsibleUnit = filters.responsibleUnit
    }
    
    if (filters.errorType) {
      params.errorType = filters.errorType
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

  
  // 按错误类型统计图表
  if (errorTypeChartRef.value && statistics.value.byErrorType) {
  
    
    try {
      if (!errorTypeChart) {
        errorTypeChart = echarts.init(errorTypeChartRef.value, null, {
          width: 'auto',
          height: 'auto'
        })

      }
      
      const errorTypeOption = {
        title: {
          // text: '错误类型分布',
          // subtext: '南丁格尔玫瑰图',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          },
          subtextStyle: {
            fontSize: 12,
            color: '#999'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c}件 ({d}%)'
        },
        legend: {
           orient: 'vertical',
           left: 'left',
           top: 'middle',
           data: statistics.value.byErrorType.map(item => item.error_type || '未分类')
         },
        toolbox: {
          show: true,
          feature: {
            mark: { show: true },
            dataView: { 
              show: true, 
              readOnly: false,
              title: '数据视图',
              lang: ['数据视图', '关闭', '刷新'],
              backgroundColor: '#fff',
              textareaColor: '#fff',
              textareaBorderColor: '#333',
              textColor: '#000',
              optionToContent: function(opt) {
                const series = opt.series[0];
                const data = series.data;
                let table = '<div style="padding: 20px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">';
                table += '<h3 style="text-align: center; color: #409EFF; margin-bottom: 20px; font-size: 16px;">📊 错误类型统计数据</h3>';
                table += '<table style="width: 100%; border-collapse: collapse; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">';
                table += '<thead><tr style="background: linear-gradient(135deg, #409EFF, #66b3ff); color: white;">';
                table += '<th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">序号</th>';
                table += '<th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">错误类型</th>';
                table += '<th style="padding: 8px 12px; text-align: center; font-weight: 600; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">数量(张)</th>';
                table += '<th style="padding: 8px 12px; text-align: center; font-weight: 600; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">占比</th>';
                table += '</tr></thead><tbody>';
                
                const total = data.reduce((sum, item) => sum + item.value, 0);
                data.forEach((item, index) => {
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  const rowBg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                  table += `<tr style="background-color: ${rowBg}; transition: background-color 0.3s;" onmouseover="this.style.backgroundColor='#e3f2fd'" onmouseout="this.style.backgroundColor='${rowBg}'">`;
                  table += `<td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-weight: 500; color: #666; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">${index + 1}</td>`;
                  table += `<td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-weight: 500; color: #333; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">${item.name}</td>`;
                  table += `<td style="padding: 6px 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 600; color: #409EFF; font-size: 11px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">${item.value}</td>`;
                  table += `<td style="padding: 6px 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 500; color: #666; font-size: 11px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">${percentage}%</td>`;
                  table += '</tr>';
                });
                
                table += '</tbody></table>';
                table += `<div style="margin-top: 15px; text-align: center; color: #666; font-size: 12px; font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;">总计: <strong style="color: #409EFF;">${total}</strong> 张</div>`;
                table += '</div>';
                return table;
              }
            },
            restore: { show: true },
            saveAsImage: { show: true }
          }
        },
        series: [{
          name: '异常数量',
          type: 'pie',
          radius: [20, 110],
          center: ['50%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
             show: true,
             formatter: '{c} 张'
           },
          emphasis: {
            label: {
              show: true
            }
          },
          data: statistics.value.byErrorType.map(item => ({
            name: item.error_type || '未分类',
            value: item.count
          }))
        }]
      }
      
      errorTypeChart.setOption(errorTypeOption)
      // 强制调用resize确保图表适应容器
      setTimeout(() => {
        errorTypeChart.resize()
      }, 100)
      
    } catch (error) {
      console.error('错误类型图表初始化失败:', error)
    }
  }
  
  // 年度成本损失趋势图表
  if (costTrendChartRef.value && statistics.value.costTrend && statistics.value.costTrend.length > 0) {
    
    
    try {
      if (!costTrendChart) {
        costTrendChart = echarts.init(costTrendChartRef.value, null, {
          width: 'auto',
          height: 'auto'
        })

      }
      
      const costTrendOption = {
        title: {
          show: false
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            return params[0].name + '<br/>' + 
                   params[0].seriesName + ': ¥' + 
                   (params[0].value || 0).toLocaleString()
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: statistics.value.costTrend.map(item => item.month || item.period)
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: function(value) {
              return '¥' + (value / 1000).toFixed(0) + 'K'
            }
          }
        },
        series: [{
          name: '成本损失',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 14,
          lineStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{
                offset: 0, color: '#ff6b6b'
              }, {
                offset: 0.5, color: '#ff8a80'
              }, {
                offset: 1, color: '#ffab91'
              }]
            },
            width: 4,
            shadowColor: 'rgba(255, 107, 107, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 3
          },
          itemStyle: {
            color: '#ff6b6b',
            borderColor: '#fff',
            borderWidth: 3,
            shadowColor: 'rgba(255, 107, 107, 0.5)',
            shadowBlur: 8,
            shadowOffsetY: 2
          },
          emphasis: {
            itemStyle: {
              color: '#ff5252',
              borderColor: '#fff',
              borderWidth: 4,
              shadowColor: 'rgba(255, 82, 82, 0.8)',
              shadowBlur: 15,
              shadowOffsetY: 5
            },
            lineStyle: {
              width: 5,
              shadowBlur: 15
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(255, 107, 107, 0.4)'
              }, {
                offset: 0.5, color: 'rgba(255, 138, 128, 0.2)'
              }, {
                offset: 1, color: 'rgba(255, 171, 145, 0.05)'
              }]
            }
          },
          data: statistics.value.costTrend.map(item => item.cost_loss || 0)
        }]
      }
      
      costTrendChart.setOption(costTrendOption)
      // 强制调用resize确保图表适应容器
      setTimeout(() => {
        costTrendChart.resize()
      }, 100)
      
    } catch (error) {
      console.error('成本趋势图表初始化失败:', error)
    }
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.current = 1
  fetchData()
  // 每次搜索都更新统计数据，确保左侧统计卡片实时更新
  fetchStatistics()
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
 * 标签页切换
 */
const handleTabClick = (tab) => {
  if (tab.props.name === 'statistics') {
    // 使用nextTick确保DOM已渲染完成
    nextTick(() => {
      fetchStatistics()
    })
  }
}

/**
 * 编辑记录
 */
const handleEdit = (row) => {
  // 权限检查
  if (!canEdit.value) {
    ElMessage.warning('您没有编辑出版异常记录的权限')
    return
  }
  
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


/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  // 权限检查
  if (!canDelete.value) {
    ElMessage.warning('您没有删除出版异常记录的权限')
    return
  }
  
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
    // 数据变更后更新统计信息
    fetchStatistics()
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
 * 新增记录
 */
const handleAdd = () => {
  // 权限检查
  if (!canAdd.value) {
    ElMessage.warning('您没有新增出版异常记录的权限')
    return
  }
  
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
 * 双击记录显示详情对话框
 * @param {Object} row - 表格行数据
 */
const handleRowDoubleClick = (row) => {
  handleView(row)
}

/**
 * 删除记录
 */
const handleDelete = async (row) => {
  // 权限检查
  if (!canDelete.value) {
    ElMessage.warning('您没有删除出版异常记录的权限')
    return
  }
  
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
      // 数据变更后更新统计信息
      fetchStatistics()
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
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    // 表单验证，如果验证失败会抛出异常
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
          return false
        }
        return true
      })
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
    } else {
      // 新增模式：只有新上传的文件
      finalFileList = uploadedFileInfo
    }
    
    // 保存最终的文件列表
    if (finalFileList.length > 0) {
      formData.image_path = JSON.stringify(finalFileList)
    } else {
      formData.image_path = ''
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
      // 数据变更后更新统计信息
      fetchStatistics()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    
    // Element Plus表单验证失败时，会直接抛出包含字段验证错误的对象
    if (error && typeof error === 'object') {
      // 检查是否是表单验证错误（直接包含字段名的对象）
      const errorKeys = Object.keys(error)
      if (errorKeys.length > 0) {
        // 检查第一个键对应的值是否是数组（验证错误的特征）
        const firstKey = errorKeys[0]
        const firstValue = error[firstKey]
        
        if (Array.isArray(firstValue) && firstValue.length > 0) {
          // 这是表单验证错误，提取第一个错误字段的提示信息
          const firstErrorMessage = firstValue[0]?.message || '字段验证失败'
          ElMessage.error(`${firstErrorMessage}`)
          return // 直接返回，不继续执行后续逻辑
        }
      }
      
      // 检查是否有message属性（其他类型的错误）
      if (error.message) {
        ElMessage.error('请检查并完善必填项信息')
        return
      }
    }
    
    // 如果不是表单验证错误，则可能是网络错误或其他错误
    ElMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
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
 * 文件删除处理
 */
const handleFileRemove = (deletedFiles) => {
  deletedFiles.forEach((deletedFile) => {
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
    }
    
    // 从临时文件列表中移除
    const tempIndex = tempUploadedFiles.value.findIndex(isFileMatch)
    if (tempIndex > -1) {
      tempUploadedFiles.value.splice(tempIndex, 1)
    }
    
    // 如果是原始文件，添加到删除列表中
    const originalIndex = originalFiles.value.findIndex(isFileMatch)
    if (originalIndex > -1) {
      const removedFile = originalFiles.value[originalIndex]
      removedFiles.value.push(removedFile)
      originalFiles.value.splice(originalIndex, 1)
    }
  })
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
 * 刷新数据
 */
const refreshData = () => {
  fetchData()
  // 每次刷新都更新统计数据，确保左侧统计卡片实时更新
  fetchStatistics()
}

// 导出选项状态
const exportDialogVisible = ref(false)
const includeImages = ref(true)

/**
 * 导出数据功能 - 显示导出选项对话框
 */
const handleExport = () => {
  // 权限检查
  if (!canExport.value) {
    ElMessage.warning('您没有导出出版异常数据的权限')
    return
  }
  
  exportDialogVisible.value = true
}

/**
 * 确认导出数据
 */
const confirmExport = async () => {
  try {
    // 检查是否有选中的记录
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要导出的记录')
      return
    }
    
    exportDialogVisible.value = false
    ElMessage.info('正在生成Excel文件，请稍候...')
    
    // 获取选中记录的ID列表
    const selectedIds = selectedRows.value.map(row => row.id)
    
    // 构建导出参数
    const exportParams = new URLSearchParams({
      includeImages: includeImages.value.toString(),
      recordIds: selectedIds.join(',')
    })
    
    // 调用后端导出接口
    const response = await fetch(`/api/publishing-exceptions/export?${exportParams}`, {
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
    const now = new Date()
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
    let filename = `出版失误登记表_${timestamp}.xlsx`
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
 * 处理对话框键盘事件
 * 当用户在对话框中按下Enter键时，自动提交表单
 */
const handleDialogKeydown = (event) => {
  // 检查是否按下了Enter键
  if (event.key === 'Enter') {
    // 防止在textarea中按Enter键时触发提交
    if (event.target.tagName.toLowerCase() === 'textarea') {
      return
    }
    
    // 阻止默认行为
    event.preventDefault()
    
    // 如果当前没有在提交中，则执行提交
    if (!submitLoading.value) {
      handleSubmit()
    }
  }
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
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 构建图片URL
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：使用Vite代理
    url = `/files/site-images/publishing-exception/${imagePath}`
  } else {
    // 生产环境：使用Nginx文件服务器端口8080
    url = `${protocol}//${hostname}:8080/files/site-images/publishing-exception/${imagePath}`
  }
  
  // 只在需要防止缓存时添加时间戳参数
  if (preventCache) {
    const timestamp = Date.now()
    url += `?t=${timestamp}`
  }
  
  return url
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
 * 监听版类型变化，自动设置单价
 * 切换版类型时先清空原有单价，然后为固定单价版类型填入默认值
 * CTP: 7元/件，PS版: 10元/件，柔版: 0.15元/平方米，刀模: 0.7元/米
 */
watch(
  () => formData.plate_type,
  (plateType) => {
    // 切换版类型时先清空原有单价
    formData.unit_price = null
    
    // 为有固定单价的版类型填入默认值
    if (plateType === 'CTP') {
      formData.unit_price = 7
    } else if (plateType === 'PS版') {
      formData.unit_price = 10
    } else if (plateType === '柔版') {
      formData.unit_price = 0.15
    } else if (plateType === '刀模') {
      formData.unit_price = 0.7
    } else if (plateType === '文件') {
      formData.unit_price = 20
    }
  },
  { immediate: true }
)

/**
 * 监听相关字段变化，根据版类型自动计算金额
 * 不同版类型使用不同的计算公式：
 * - CTP: 单价 × 件数（7元/件）
 * - PS版: 单价 × 件数（0.75元/件）
 * - 柔版: 面积(平方米) × 单价 × 件数
 * - 刀模: 周长 × 件数，周长 = (长×2)+(宽×2)
 */
watch(
  () => [formData.plate_type, formData.area_cm2, formData.unit_price, formData.piece_count, formData.length_cm, formData.width_cm],
  ([plateType, area, price, pieces, length, width]) => {
    if (!plateType || !pieces || pieces <= 0) {
      formData.amount = null
      return
    }

    let amount = 0

    switch (plateType) {
      case 'CTP':
      case 'PS版':
      case '文件':
        // CTP、PS版和文件：单价 × 件数
        if (price && price > 0) {
          amount = price * pieces
        }
        break
        
      case '柔版':
        // 柔版：面积(平方厘米) × 单价 × 件数
        if (area && price && area > 0 && price > 0) {
          amount = area * price * pieces
        }
        break
        
      case '刀模':
        // 刀模：周长(米) × 件数 × 单价，周长 = (长×2)+(宽×2)，换算成米
        if (length && width && price && length > 0 && width > 0 && price > 0) {
          const perimeter = (length * 2) + (width * 2) // 计算周长(厘米)
          const perimeterM = perimeter / 100 // 换算成米
          amount = perimeterM * pieces * price
        }
        break
        
      default:
        formData.amount = null
        return
    }

    formData.amount = amount > 0 ? Number(amount.toFixed(2)) : null
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

// 监听activeTab变化，确保图表正确初始化
watch(activeTab, (newTab) => {
  if (newTab === 'statistics') {
    nextTick(() => {
      fetchStatistics()
    })
  }
})

/**
 * 窗口大小变化处理函数
 * 确保图表能够自适应容器大小变化
 */
const handleResize = () => {
  // 延迟执行，确保容器尺寸已更新
  setTimeout(() => {
    if (errorTypeChart) {
      errorTypeChart.resize()
    }
    if (costTrendChart) {
      costTrendChart.resize()
    }
  }, 100)
}

// 组件挂载时获取数据
onMounted(async () => {
  fetchDepartments()
  fetchProductNames() // 获取产品名称列表
  fetchData()
  fetchStatistics() // 页面加载时获取统计数据
  
  // 检查权限
  await checkPermissions()
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})

// 监听用户变化，重新检查权限
watch(() => userStore.user, async (newUser) => {
  if (newUser) {
    await checkPermissions()
  }
}, { deep: true })

// 组件卸载时清理监听器
onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  if (errorTypeChart) {
    errorTypeChart.dispose()
    errorTypeChart = null
  }
  if (costTrendChart) {
    costTrendChart.dispose()
    costTrendChart = null
  }
})
</script>

<style scoped>
.publishing-exceptions-content {
  padding: 20px;
  background-color: #f5f5f5;
  height: auto;
  overflow: visible;
}

/* 顶部统计卡片样式 */
.top-stats {
  margin-bottom: 0;
}

.top-stats .el-col {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-card-blue {
  border-left: 4px solid #409EFF;
}

.stat-card-red {
  border-left: 4px solid #F56C6C;
}

.stat-card-orange {
  border-left: 4px solid #E6A23C;
}

.stat-card-green {
  border-left: 4px solid #67C23A;
}

.stat-icon {
  font-size: 32px;
  margin-right: 15px;
  opacity: 0.8;
}

.stat-card-blue .stat-icon {
  color: #409EFF;
}

.stat-card-red .stat-icon {
  color: #F56C6C;
}

.stat-card-orange .stat-icon {
  color: #E6A23C;
}

.stat-card-green .stat-icon {
  color: #67C23A;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 筛选卡片样式 */
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

/* 记录清单内容区域样式 */
.records-content {
  margin-top: 20px;
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

.chart-card {
  height: 400px;
}

.chart-container {
  width: 100%;
  height: 300px;
  min-height: 300px;
  position: relative;
}

/* 图表响应式布局 */
.charts-row {
  margin-bottom: 20px;
}

.charts-row .el-col {
  margin-bottom: 20px;
}

/* 响应式图表容器 */
@media (max-width: 1200px) {
  .chart-container {
    height: 280px;
    min-height: 280px;
  }
}

@media (max-width: 768px) {
  .charts-row .el-col {
    margin-bottom: 30px;
  }
  
  .chart-container {
    height: 250px;
    min-height: 250px;
  }
  
  .chart-card {
    height: 350px;
  }
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

/* 导出选项对话框样式 */
.export-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.export-options {
  padding: 0;
}

.export-icon {
  font-size: 24px;
  color: #409EFF;
  margin-right: 12px;
}

.export-form {
  padding: 20px 0;
}

.export-option-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.export-option-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.option-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.option-icon {
  font-size: 18px;
  color: #409EFF;
  margin-right: 8px;
}

.option-label {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.option-content {
  padding-left: 26px;
}

.custom-checkbox {
  margin-bottom: 12px;
}

.checkbox-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.export-tip {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  margin-top: 8px;
}

.tip-icon {
  font-size: 16px;
  color: #e6a23c;
  margin-right: 8px;
  margin-top: 1px;
  flex-shrink: 0;
}

.tip-text {
  font-size: 13px;
  color: #856404;
  line-height: 1.4;
}

.export-dialog-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  margin: 20px 0 0 0;
  box-sizing: border-box;
}

.confirm-btn {
  min-width: 120px;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 500;
  background: #409EFF;
  border: 1px solid #409EFF;
  transition: all 0.3s ease;
}

.confirm-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.confirm-btn:active {
  transform: translateY(0);
}

/* 覆盖Element Plus默认样式 */
:deep(.export-dialog .el-dialog__header) {
  background: #409EFF;
  color: white;
  padding: 20px;
  margin: 0;
}

:deep(.export-dialog .el-dialog__title) {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

:deep(.export-dialog .el-dialog__headerbtn) {
  position: absolute;
  top: -35px;
  right: -35px;
  width: 30px;
  height: 30px;
  background: #595B5E;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

:deep(.export-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

:deep(.export-dialog .el-dialog__headerbtn .el-dialog__close:hover) {
  color: white;
  transform: scale(1.1);
}

:deep(.export-dialog .el-dialog__headerbtn:hover) {
  background: #6c6f73;
  transform: scale(1.05);
}

:deep(.export-dialog .el-dialog__body) {
  padding: 0;
}

:deep(.export-dialog .el-dialog__footer) {
  padding: 0;
}

:deep(.export-dialog .el-divider) {
  margin: 16px 0;
}

:deep(.export-dialog .el-checkbox__label) {
  font-size: 14px;
  color: #606266;
}

:deep(.export-dialog .el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409EFF;
  border-color: #409EFF;
}

:deep(.export-dialog .el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #409EFF;
  font-weight: 500;
}

</style>