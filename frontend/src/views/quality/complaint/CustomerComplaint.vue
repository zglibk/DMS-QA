<template>
  <div class="customer-complaint-container">
    <!-- 搜索筛选区域 -->
    <el-card class="search-card" shadow="never">
      <template #header>
        <div class="search-header">
          <el-icon class="search-icon"><Search /></el-icon>
          <span class="search-title">搜索筛选</span>
        </div>
      </template>
      
      <el-form :model="searchForm" class="search-form" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="4">
            <el-form-item label="客户编号">
              <el-input 
                v-model="searchForm.customerCode" 
                placeholder="请输入客户编号" 
                clearable
                prefix-icon="User"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="工单号">
              <el-input 
                v-model="searchForm.workOrderNo" 
                placeholder="请输入工单号" 
                clearable
                prefix-icon="Document"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="处理状态">
              <el-select 
                v-model="searchForm.status" 
                placeholder="请选择状态" 
                clearable
                style="width: 100%"
              >
                <el-option label="待处理" value="pending">
                  <el-icon style="margin-right: 8px; color: #f56c6c;"><Clock /></el-icon>
                  待处理
                </el-option>
                <el-option label="处理中" value="processing">
                  <el-icon style="margin-right: 8px; color: #e6a23c;"><Loading /></el-icon>
                  处理中
                </el-option>
                <el-option label="已完成" value="completed">
                  <el-icon style="margin-right: 8px; color: #67c23a;"><Check /></el-icon>
                  已完成
                </el-option>
                <el-option label="已关闭" value="closed">
                  <el-icon style="margin-right: 8px; color: #909399;"><Close /></el-icon>
                  已关闭
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品名称">
              <el-input 
                v-model="searchForm.productName" 
                placeholder="请输入品名" 
                clearable
                prefix-icon="Box"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item class="search-buttons">
              <el-button type="primary" @click="handleSearch" size="default">
                <el-icon style="margin-right: 6px;"><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleReset" size="default">
                <el-icon style="margin-right: 6px;"><Refresh /></el-icon>
                重置
              </el-button>
              <el-button type="info" plain size="default" @click="toggleAdvancedSearch">
                <el-icon style="margin-right: 6px;"><Setting /></el-icon>
                {{ showAdvanced ? '收起' : '高级' }}
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 高级搜索区域 -->
        <el-collapse-transition>
          <div v-show="showAdvanced" class="advanced-search-area">
            <el-divider content-position="left">
              <el-icon style="margin-right: 6px; color: #409eff;"><Setting /></el-icon>
              <span style="color: #409eff; font-weight: 500;">高级搜索条件</span>
            </el-divider>
            
            <el-row :gutter="20">
              <el-col :span="4">
                <el-form-item label="规格">
                  <el-input 
                    v-model="searchForm.specification" 
                    placeholder="请输入规格" 
                    clearable
                    prefix-icon="Document"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="投诉方式">
                  <el-select 
                    v-model="searchForm.complaintMethod" 
                    placeholder="请选择投诉方式" 
                    clearable
                    style="width: 100%"
                  >
                    <el-option label="微信" value="wechat" />
                    <el-option label="QQ" value="qq" />
                    <el-option label="电话" value="phone" />
                    <el-option label="邮件" value="email" />
                    <el-option label="现场" value="onsite" />
                    <el-option label="书面" value="written" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="责任部门">
                  <el-input 
                    v-model="searchForm.responsibleDepartment" 
                    placeholder="请输入责任部门" 
                    clearable
                    prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="责任人">
                  <el-input 
                    v-model="searchForm.responsiblePerson" 
                    placeholder="请输入责任人" 
                    clearable
                    prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="反馈人">
                  <el-input 
                    v-model="searchForm.feedbackPerson" 
                    placeholder="请输入反馈人" 
                    clearable
                    prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="处理人">
                  <el-input 
                    v-model="searchForm.processor" 
                    placeholder="请输入处理人" 
                    clearable
                    prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="4">
                <el-form-item label="创建人">
                  <el-input 
                    v-model="searchForm.createdBy" 
                    placeholder="请输入创建人" 
                    clearable
                    prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="不良数">
                  <div style="display: flex; align-items: center; width: 100%;">
                    <el-input-number 
                      v-model="searchForm.defectQuantityRange[0]" 
                      placeholder="最小值" 
                      :min="0" 
                      style="width: 48%; flex-shrink: 0;"
                    />
                    <span style="margin: 0 2%; color: #909399; flex-shrink: 0;">-</span>
                    <el-input-number 
                      v-model="searchForm.defectQuantityRange[1]" 
                      placeholder="最大值" 
                      :min="0" 
                      style="width: 48%; flex-shrink: 0;"
                    />
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="处理时限">
                  <el-date-picker
                    v-model="searchForm.processingDeadlineRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
             <el-col :span="6">
                <el-form-item label="回复日期">
                  <el-date-picker
                    v-model="searchForm.replyDateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="反馈日期">
                  <el-date-picker
                    v-model="searchForm.feedbackDateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="验证日期">
                  <el-date-picker
                    v-model="searchForm.verificationDateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
                <el-col :span="6">
                <el-form-item label="不良比例">
                  <div style="display: flex; align-items: center; width: 100%;">
                    <el-input-number 
                      v-model="searchForm.defectRateRange[0]" 
                      placeholder="最小值(%)" 
                      :min="0" 
                      :max="100"
                      :precision="2"
                      style="width: 48%; flex-shrink: 0;"
                    />
                    <span style="margin: 0 2%; color: #909399; flex-shrink: 0;">-</span>
                    <el-input-number 
                      v-model="searchForm.defectRateRange[1]" 
                      placeholder="最大值(%)" 
                      :min="0" 
                      :max="100"
                      :precision="2"
                      style="width: 48%; flex-shrink: 0;"
                    />
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-collapse-transition>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <!-- 表格操作按钮行 -->
      <div class="table-header">
        <div class="table-actions">
          <el-button type="primary" @click="handleAdd">
            <el-icon style="margin-right: 6px;"><Plus /></el-icon>
            新增
          </el-button>
          <el-button 
            type="danger" 
            @click="handleBatchDelete" 
            :disabled="selectedRows.length === 0"
          >
            <el-icon style="margin-right: 6px;"><Delete /></el-icon>
            批量删除 ({{ selectedRows.length }})
          </el-button>
        </div>
      </div>
      
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="date" label="日期" width="120" sortable />
        <el-table-column prop="customerCode" label="客户编号" width="120" />
        <el-table-column prop="workOrderNo" label="工单号" width="120" />
        <el-table-column prop="productName" label="品名" width="200" show-overflow-tooltip />
        <el-table-column prop="specification" label="规格" width="120" show-overflow-tooltip />
        <el-table-column prop="orderQuantity" label="订单数" width="100" />
        <el-table-column prop="problemDescription" label="问题描述" width="200" show-overflow-tooltip />
        <el-table-column prop="defectQuantity" label="不良数" width="100" />
        <el-table-column prop="defectRate" label="不良比例" width="100">
          <template #default="{ row }">
            {{ row.defectRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="complaintMethod" label="投诉方式" width="120">
          <template #default="{ row }">
            {{ getComplaintMethodText(row.complaintMethod) }}
          </template>
        </el-table-column>
        <el-table-column prop="complaintType" label="投诉类型" width="120">
          <template #default="{ row }">
            {{ getComplaintTypeText(row.complaintType) }}
          </template>
        </el-table-column>
        <el-table-column prop="processingDeadline" label="处理时限" width="120" />
        <el-table-column prop="status" label="处理状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsibleDepartment" label="责任部门" width="120">
          <template #default="{ row }">
            {{ getDepartmentText(row.responsibleDepartment) }}
          </template>
        </el-table-column>
        <el-table-column prop="responsiblePerson" label="责任人" width="100">
          <template #default="{ row }">
            {{ getPersonText(row.responsiblePerson) }}
          </template>
        </el-table-column>
        <el-table-column prop="replyDate" label="回复日期" width="120" />
        <el-table-column prop="feedbackPerson" label="反馈人" width="100" />
        <el-table-column prop="feedbackDate" label="反馈日期" width="120" />
        <el-table-column prop="processor" label="处理人" width="100" />
        <el-table-column prop="verificationDate" label="验证日期" width="120" />
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建日期" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页和统计信息 -->
      <div class="pagination-container">
        <div class="table-count">
          <span>共 {{ pagination.total }} 条记录</span>
        </div>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="50%"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="complaint-form"
      >
        <!-- 基本信息区域 - 三列布局 -->
        <div class="form-section">
          <h4 class="section-title">基本信息</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="日期" prop="date">
                <el-date-picker
                  v-model="formData.date"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户编号" prop="customerCode">
                <el-input 
                  v-model="formData.customerCode" 
                  placeholder="请输入客户编号" 
                  @input="handleCustomerCodeInput"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="工单号" prop="workOrderNo">
                <el-input 
                  v-model="formData.workOrderNo" 
                  placeholder="请输入工单号" 
                  @input="handleWorkOrderNoInput"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="品名" prop="productName">
                <el-input v-model="formData.productName" placeholder="请输入品名" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="规格" prop="specification">
                <el-input v-model="formData.specification" placeholder="请输入规格" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="订单数" prop="orderQuantity">
                <el-input-number
                  v-model="formData.orderQuantity"
                  :min="0"
                  placeholder="请输入订单数"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 问题信息区域 - 三列布局 -->
        <div class="form-section">
          <h4 class="section-title">问题信息</h4>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="问题描述" prop="problemDescription">
                <el-input
                  v-model="formData.problemDescription"
                  type="textarea"
                  :rows="3"
                  placeholder="请详细描述问题"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="问题图片">
                <el-upload
                  ref="uploadRef"
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :file-list="formData.problemImages"
                  :on-success="handleImageSuccess"
                  :on-remove="handleImageRemove"
                  :before-upload="beforeImageUpload"
                  list-type="picture-card"
                  accept="image/*"
                >
                  <template #file="{ file }">
                    <div class="upload-file-item">
                      <el-image
                        :src="getImageUrl(file)"
                        :preview-src-list="formData.problemImages.map(img => getImageUrl(img))"
                        :initial-index="formData.problemImages.findIndex(img => img.uid === file.uid || getImageUrl(img) === getImageUrl(file))"
                        fit="cover"
                        style="width: 100%; height: 100%;"
                        :lazy="true"
                      >
                        <template #error>
                          <div class="image-error">
                            <el-icon><Picture /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                      <div class="upload-file-overlay">
                        <div class="upload-file-preview">
                          <el-icon class="upload-file-preview-icon"><ZoomIn /></el-icon>
                        </div>
                        <div class="upload-file-actions">
                          <el-icon class="upload-file-action" @click.stop="handleImageRemove(file)"><Delete /></el-icon>
                        </div>
                      </div>
                    </div>
                  </template>
                  <el-icon><Plus /></el-icon>
                </el-upload>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="不良数" prop="defectQuantity">
                <el-input-number
                  v-model="formData.defectQuantity"
                  :min="0"
                  placeholder="请输入不良数"
                  style="width: 100%"
                  @change="calculateDefectRate"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="不良比例">
                <el-input
                  :value="formData.defectRate + '%'"
                  disabled
                  placeholder="自动计算"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="投诉方式" prop="complaintMethod">
                <el-select v-model="formData.complaintMethod" placeholder="请选择投诉方式" style="width: 100%">
                  <el-option label="微信" value="wechat" />
                  <el-option label="QQ" value="qq" />
                  <el-option label="电话" value="phone" />
                  <el-option label="邮件" value="email" />
                  <el-option label="现场" value="onsite" />
                  <el-option label="书面" value="written" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="处理时限" prop="processingDeadline">
                <el-date-picker
                  v-model="formData.processingDeadline"
                  type="date"
                  placeholder="选择处理时限"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="要求报告回复">
                <el-radio-group v-model="formData.requireReport">
                  <el-radio :label="true">是</el-radio>
                  <el-radio :label="false">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="投诉类型" prop="complaintType">
                <el-select v-model="formData.complaintType" placeholder="请选择投诉类型" style="width: 100%">
                  <el-option 
                    v-for="option in complaintTypeOptions" 
                    :key="option.Name" 
                    :label="option.Name" 
                    :value="option.Name" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 处理信息区域 - 三列布局 -->
        <div class="form-section">
          <div class="section-header">
            <h4 class="section-title">处理信息</h4>
            <div class="section-actions">
              <el-upload
                ref="reportUploadRef"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :file-list="formData.reportAttachments"
                :on-success="handleReportSuccess"
                :on-remove="handleReportRemove"
                :before-upload="beforeReportUpload"
                :show-file-list="false"
                style="display: inline-block;"
              >
                <el-button type="primary" size="small">
                  <el-icon><Upload /></el-icon>
                  上传附件
                </el-button>
              </el-upload>
            </div>
          </div>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="原因分析">
                <el-input
                  v-model="formData.causeAnalysis"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入原因分析"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="纠正预防措施">
                <el-input
                  v-model="formData.correctiveActions"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入纠正预防措施"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="处置措施和结果">
                <el-input
                  v-model="formData.disposalMeasures"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入处置措施和结果"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="责任部门" prop="responsibleDepartment">
                <el-select 
                  v-model="formData.responsibleDepartment" 
                  placeholder="请选择责任部门" 
                  style="width: 100%"
                  @change="handleDepartmentChange"
                  clearable
                >
                  <el-option 
                    v-for="dept in departmentOptions" 
                    :key="dept.ID" 
                    :label="dept.Name" 
                    :value="dept.ID" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="责任人" prop="responsiblePerson">
                <el-select 
                  v-model="formData.responsiblePerson" 
                  placeholder="请选择责任人" 
                  style="width: 100%"
                  clearable
                  :disabled="!formData.responsibleDepartment"
                >
                  <el-option 
                    v-for="person in personOptions" 
                    :key="person.ID" 
                    :label="person.Name" 
                    :value="person.ID" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 质量成本区域 - 三列布局 -->
        <div class="form-section">
          <h4 class="section-title">质量成本</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>质量罚款</span>
                  <el-tooltip
                    content="因产品质量问题导致的罚款金额，包括客户罚款、监管部门罚款等"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </template>
                <el-input-number
                  v-model="formData.qualityPenalty"
                  :min="0"
                  :precision="2"
                  placeholder="请输入质量罚款金额"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>返工成本</span>
                  <el-tooltip
                    content="因质量问题需要重新加工、修复产品所产生的人工、材料、设备等成本"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </template>
                <el-input-number
                  v-model="formData.reworkCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入返工成本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>客户赔偿</span>
                  <el-tooltip
                    content="因质量问题给客户造成损失而最终支付的'赔偿'金额，包括直接损失和间接损失(不含罚款)"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.customerCompensation"
                  :min="0"
                  :precision="2"
                  placeholder="请输入客户赔偿金额"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>质量损失成本</span>
                  <el-tooltip
                    content="因质量问题导致的直接经济损失，如废品损失、降级/折价损失、停工损失等"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.qualityLossCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入质量损失成本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>检验成本</span>
                  <el-tooltip
                    content="为确保重工/返工质量而进行的检验、测试、审核等产生的成本"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.inspectionCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入检验成本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>运输成本</span>
                  <el-tooltip
                    content="因质量问题产生的额外运输费用，如退货运费、重新发货运费等"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.transportationCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入运输成本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>预防成本</span>
                  <el-tooltip
                    content="为预防质量问题发生而投入的成本，如质量培训、工艺改进、设备维护等"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.preventionCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入预防成本"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <template #label>
                  <span>总质量成本</span>
                  <el-tooltip
                    content="所有质量相关成本的总和，可选择自动计算或手动输入"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input-number
                   v-model="formData.totalQualityCost"
                  :min="0"
                  :precision="2"
                  placeholder="自动计算或手动输入"
                  style="width: 100%"
                  :disabled="autoCalculateTotal"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <el-checkbox v-model="autoCalculateTotal" style="margin-top: 8px;">
                  自动计算总成本
                </el-checkbox>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item>
                <template #label>
                  <span>成本备注</span>
                  <el-tooltip
                    content="对质量成本的详细说明，包括成本构成、计算依据、特殊情况说明等"
                    placement="top"
                  >
                    <el-icon style="margin-left: 4px; color: #E6A23C; cursor: help;">
                       <QuestionFilled />
                     </el-icon>
                   </el-tooltip>
                 </template>
                 <el-input
                   v-model="formData.costRemarks"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入质量成本相关备注信息"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 反馈验证区域 - 三列布局 -->
        <div class="form-section">
          <h4 class="section-title">反馈验证</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="回复日期">
                <el-date-picker
                  v-model="formData.replyDate"
                  type="date"
                  placeholder="选择回复日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="反馈人">
                <el-cascader
                  v-model="formData.feedbackPerson"
                  :options="feedbackCascaderOptions"
                  placeholder="请选择部门和人员"
                  :props="{ expandTrigger: 'hover' }"
                  style="width: 100%"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="反馈日期">
                <el-date-picker
                  v-model="formData.feedbackDate"
                  type="date"
                  placeholder="选择反馈日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="处理人">
                <el-cascader
                  v-model="formData.processor"
                  :options="processorCascaderOptions"
                  placeholder="请选择部门和人员"
                  :props="{ expandTrigger: 'hover' }"
                  style="width: 100%"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="验证日期">
                <el-date-picker
                  v-model="formData.verificationDate"
                  type="date"
                  placeholder="选择验证日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="处理状态" prop="status">
                <el-select v-model="formData.status" placeholder="请选择处理状态" style="width: 100%">
                  <el-option label="待处理" value="pending" />
                  <el-option label="处理中" value="processing" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="改善验证">
                <el-input
                  v-model="formData.improvementVerification"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入改善验证内容"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 显示已上传的附件列表 -->
          <el-row :gutter="20" v-if="formData.reportAttachments && formData.reportAttachments.length > 0">
            <el-col :span="24">
              <el-form-item label="已上传附件">
                <div class="attachment-list">
                  <div 
                    v-for="(file, index) in formData.reportAttachments" 
                    :key="index" 
                    class="attachment-item"
                  >
                    <el-icon class="attachment-icon"><Document /></el-icon>
                    <span class="attachment-name">{{ file.name }}</span>
                    <el-button 
                      type="danger" 
                      size="small" 
                      text 
                      @click="handleReportRemove(file)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button 
            @click="handleDialogClose" 
            size="large" 
            style="width: 120px; margin-right: 16px;"
          >
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button 
            type="primary" 
            @click="handleSubmit" 
            :loading="submitLoading"
            size="large" 
            style="width: 120px;"
          >
            <el-icon><Check /></el-icon>
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      title="投诉记录详情"
      v-model="viewDialogVisible"
      width="50%"
    >
      <div class="detail-content" v-if="viewData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日期">{{ viewData.date }}</el-descriptions-item>
          <el-descriptions-item label="客户编号">{{ viewData.customerCode }}</el-descriptions-item>
          <el-descriptions-item label="工单号">{{ viewData.workOrderNo }}</el-descriptions-item>
          <el-descriptions-item label="品名">{{ viewData.productName }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ viewData.specification }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ viewData.orderQuantity }}</el-descriptions-item>
          <el-descriptions-item label="不良数">{{ viewData.defectQuantity }}</el-descriptions-item>
          <el-descriptions-item label="不良比例">{{ viewData.defectRate }}%</el-descriptions-item>
          <el-descriptions-item label="投诉方式">{{ getComplaintMethodText(viewData.complaintMethod) }}</el-descriptions-item>
          <el-descriptions-item label="投诉类型">{{ getComplaintTypeText(viewData.complaintType) }}</el-descriptions-item>
          <el-descriptions-item label="处理时限">{{ viewData.processingDeadline }}</el-descriptions-item>
          <el-descriptions-item label="要求报告回复">{{ viewData.requireReport ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="责任部门">{{ getDepartmentText(viewData.responsibleDepartment) }}</el-descriptions-item>
                <el-descriptions-item label="责任人">{{ getPersonText(viewData.responsiblePerson) }}</el-descriptions-item>
          <el-descriptions-item label="回复日期">{{ viewData.replyDate }}</el-descriptions-item>
          <el-descriptions-item label="反馈人">{{ viewData.feedbackPerson }}</el-descriptions-item>
          <el-descriptions-item label="反馈日期">{{ viewData.feedbackDate }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ viewData.processor }}</el-descriptions-item>
          <el-descriptions-item label="验证日期">{{ viewData.verificationDate }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="getStatusType(viewData.status)">{{ getStatusText(viewData.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ viewData.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="创建日期">{{ viewData.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新人">{{ viewData.updatedBy }}</el-descriptions-item>
          <el-descriptions-item label="更新日期">{{ viewData.updatedAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section" v-if="viewData.problemDescription">
          <h4>问题描述</h4>
          <p>{{ viewData.problemDescription }}</p>
        </div>

        <div class="detail-section" v-if="getValidImages(viewData.problemImages).length > 0">
          <h4>问题图片</h4>
          <div class="image-gallery">
            <div 
              v-for="(image, index) in getValidImages(viewData.problemImages)"
              :key="index"
              class="detail-image-item"
            >
              <el-image
                :src="getImageUrl(image)"
                :preview-src-list="getValidImages(viewData.problemImages).map(img => getImageUrl(img))"
                :initial-index="index"
                fit="cover"
                style="width: 100%; height: 100%;"
              />
              <div class="detail-image-overlay">
                <div class="detail-image-preview">
                  <el-icon class="detail-image-preview-icon"><ZoomIn /></el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="viewData.causeAnalysis">
          <h4>原因分析</h4>
          <p>{{ viewData.causeAnalysis }}</p>
        </div>

        <div class="detail-section" v-if="viewData.correctiveActions">
          <h4>纠正预防措施</h4>
          <p>{{ viewData.correctiveActions }}</p>
        </div>

        <div class="detail-section" v-if="viewData.disposalMeasures">
          <h4>处置措施和结果</h4>
          <p>{{ viewData.disposalMeasures }}</p>
        </div>

        <div class="detail-section" v-if="viewData.improvementVerification">
          <h4>改善验证</h4>
          <p>{{ viewData.improvementVerification }}</p>
        </div>

        <!-- 质量成本信息 -->
        <div class="detail-section" v-if="hasQualityCostData(viewData)">
          <h4>质量成本</h4>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="质量罚款">
              ¥{{ viewData.qualityPenalty?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="返工成本">
              ¥{{ viewData.reworkCost?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户赔偿">
              ¥{{ viewData.customerCompensation?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="质量损失成本">
              ¥{{ viewData.qualityLossCost?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="检验成本">
              ¥{{ viewData.inspectionCost?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="运输成本">
              ¥{{ viewData.transportationCost?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="预防成本">
              ¥{{ viewData.preventionCost?.toFixed(2) || '0.00' }}
            </el-descriptions-item>
            <el-descriptions-item label="总质量成本">
              <el-tag type="danger" size="large">
                ¥{{ viewData.totalQualityCost?.toFixed(2) || '0.00' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <div v-if="viewData.costRemarks" style="margin-top: 12px;">
            <strong>成本备注：</strong>
            <p style="margin-top: 8px; color: #606266;">{{ viewData.costRemarks }}</p>
          </div>
        </div>

        <div class="detail-section" v-if="viewData.reportAttachments && viewData.reportAttachments.length > 0">
          <h4>报告附件</h4>
          <div class="attachment-list">
            <el-link
              v-for="(file, index) in viewData.reportAttachments"
              :key="index"
              :href="file.url"
              target="_blank"
              type="primary"
              style="display: block; margin-bottom: 5px;"
            >
              {{ file.name }}
            </el-link>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Upload, Delete, Download, Close, Check, User, Document, Box, Clock, Loading, Setting, Picture, ZoomIn, QuestionFilled } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'
import axios from 'axios'

/**
 * 客户投诉记录管理组件
 * 功能：客户投诉记录的增删改查、图片上传、附件管理等
 */

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const showAdvanced = ref(false)
const complaintTypeOptions = ref([]) // 投诉类型选项
const departmentOptions = ref([]) // 部门选项
const personOptions = ref([]) // 人员选项
const feedbackCascaderOptions = ref([]) // 反馈人级联选择器选项
const processorCascaderOptions = ref([]) // 处理人级联选择器选项

const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const viewData = ref(null)
const removedFiles = ref([]) // 跟踪被删除的图片文件

// 搜索表单
const searchForm = reactive({
  customerCode: '',
  workOrderNo: '',
  productName: '',
  status: '',
  dateRange: [],
  // 高级搜索字段
  specification: '',
  complaintMethod: '',
  responsibleDepartment: '',
  responsiblePerson: '',
  feedbackPerson: '',
  processor: '',
  defectQuantityRange: [],
  defectRateRange: [],
  processingDeadlineRange: [],
  replyDateRange: [],
  feedbackDateRange: [],
  verificationDateRange: [],
  createdBy: ''
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: null,
  date: '',
  customerCode: '',
  workOrderNo: '',
  productName: '',
  specification: '',
  orderQuantity: 0,
  problemDescription: '',
  problemImages: [],
  defectQuantity: 0,
  defectRate: 0,
  complaintMethod: '',
  processingDeadline: '',
  requireReport: false,
  complaintType: '', // 投诉类型字段
  causeAnalysis: '',
  correctiveActions: '',
  disposalMeasures: '',
  responsibleDepartment: '',
  responsiblePerson: '',
  replyDate: '',
  reportAttachments: [],
  feedbackPerson: [], // 反馈人级联选择 [部门ID, 人员ID]
  feedbackDate: '',
  processor: [], // 处理人级联选择 [部门ID, 人员ID]
  improvementVerification: '',
  verificationDate: '',
  status: 'pending',
  // 质量成本相关字段
  qualityPenalty: 0, // 质量罚款
  reworkCost: 0, // 返工成本
  customerCompensation: 0, // 客户赔偿
  qualityLossCost: 0, // 质量损失成本
  inspectionCost: 0, // 检验成本
  transportationCost: 0, // 运输成本
  preventionCost: 0, // 预防成本
  totalQualityCost: 0, // 总质量成本
  costRemarks: '' // 成本备注
})

// 自动计算总成本开关
const autoCalculateTotal = ref(true)

// 表单验证规则
const formRules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  customerCode: [{ required: true, message: '请输入客户编号', trigger: 'blur' }],
  workOrderNo: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入品名', trigger: 'blur' }],
  problemDescription: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
  complaintMethod: [{ required: true, message: '请选择投诉方式', trigger: 'change' }],
  complaintType: [{ required: true, message: '请选择投诉类型', trigger: 'change' }]
}

// 引用
const formRef = ref()
const uploadRef = ref()
const reportUploadRef = ref()

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑投诉记录' : '新增投诉记录'
})

const uploadUrl = computed(() => {
  return '/api/customer-complaints/upload-image'
})

const uploadHeaders = computed(() => {
  return {
    'Authorization': `Bearer ${userStore.token}`
  }
})

/**
 * 计算总质量成本
 */
const calculatedTotalCost = computed(() => {
  const {
    qualityPenalty = 0,
    reworkCost = 0,
    customerCompensation = 0,
    qualityLossCost = 0,
    inspectionCost = 0,
    transportationCost = 0,
    preventionCost = 0
  } = formData
  
  return Number(qualityPenalty) + Number(reworkCost) + Number(customerCompensation) + 
         Number(qualityLossCost) + Number(inspectionCost) + Number(transportationCost) + 
         Number(preventionCost)
})

/**
 * 获取状态类型样式
 */
const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    closed: 'info'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const textMap = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    closed: '已关闭'
  }
  return textMap[status] || status
}

/**
 * 获取投诉方式文本
 */
const getComplaintMethodText = (method) => {
  const textMap = {
    wechat: '微信',
    qq: 'QQ',
    phone: '电话',
    email: '邮件',
    onsite: '现场',
    written: '书面',
    other: '其他'
  }
  return textMap[method] || method
}

/**
 * 获取投诉类型文本
 */
const getComplaintTypeText = (type) => {
  // 现在直接返回投诉类型名称，因为我们使用数据库中的Name字段
  return type || ''
}

/**
 * 获取部门文本
 */
const getDepartmentText = (department) => {
  // 如果是数字ID，从部门选项中查找名称
  if (typeof department === 'number' || (typeof department === 'string' && !isNaN(department))) {
    const departmentId = parseInt(department)
    const dept = departmentOptions.value.find(d => d.ID === departmentId)
    return dept ? dept.Name : ''
  }
  
  // 兼容旧的字符串格式
  const textMap = {
    production: '生产部',
    quality: '品质部',
    technical: '设计部',
    procurement: '采购部',
    sales: '业务部'
  }
  return textMap[department] || department
}

/**
 * 获取人员文本
 */
const getPersonText = (person) => {
  // 如果是数字ID，从人员选项中查找名称
  if (typeof person === 'number' || (typeof person === 'string' && !isNaN(person))) {
    const personId = parseInt(person)
    const p = personOptions.value.find(p => p.ID === personId)
    return p ? p.Name : ''
  }
  
  // 兼容旧的字符串格式，直接返回
  return person || ''
}

/**
 * 格式化日期为本地日期格式 (yyyy-mm-dd)
 * @param {string|null} dateString - ISO日期字符串
 * @returns {string} 格式化后的日期字符串或空字符串
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    // 创建Date对象时使用本地时区
    const date = new Date(dateString)
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    // 使用本地时区格式化日期，避免时区偏移
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('日期格式化错误:', error?.message || '未知错误')
    return ''
  }
}

/**
 * 计算不良比例
 */
const calculateDefectRate = () => {
  if (formData.orderQuantity > 0 && formData.defectQuantity >= 0) {
    formData.defectRate = Number(((formData.defectQuantity / formData.orderQuantity) * 100).toFixed(2))
  } else {
    formData.defectRate = 0
  }
}

/**
 * 获取投诉类型选项
 */
const loadComplaintTypes = async () => {
  try {
    const response = await apiService.get('/customer-complaints/complaint-types')
    if (response.data.success) {
      complaintTypeOptions.value = response.data.data || []
    } else {
      console.error('获取投诉类型失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取投诉类型失败:', error?.message || '未知错误')
  }
}

/**
 * 加载数据
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
    delete params.dateRange
    
    // 处理高级搜索的日期范围
    if (searchForm.processingDeadlineRange && searchForm.processingDeadlineRange.length === 2) {
      params.processingDeadlineStart = searchForm.processingDeadlineRange[0]
      params.processingDeadlineEnd = searchForm.processingDeadlineRange[1]
    }
    delete params.processingDeadlineRange
    
    if (searchForm.replyDateRange && searchForm.replyDateRange.length === 2) {
      params.replyDateStart = searchForm.replyDateRange[0]
      params.replyDateEnd = searchForm.replyDateRange[1]
    }
    delete params.replyDateRange
    
    if (searchForm.feedbackDateRange && searchForm.feedbackDateRange.length === 2) {
      params.feedbackDateStart = searchForm.feedbackDateRange[0]
      params.feedbackDateEnd = searchForm.feedbackDateRange[1]
    }
    delete params.feedbackDateRange
    
    if (searchForm.verificationDateRange && searchForm.verificationDateRange.length === 2) {
      params.verificationDateStart = searchForm.verificationDateRange[0]
      params.verificationDateEnd = searchForm.verificationDateRange[1]
    }
    delete params.verificationDateRange
    
    // 处理数值范围
    if (searchForm.defectQuantityRange && searchForm.defectQuantityRange.length === 2) {
      if (searchForm.defectQuantityRange[0] !== null && searchForm.defectQuantityRange[0] !== undefined) {
        params.defectQuantityMin = searchForm.defectQuantityRange[0]
      }
      if (searchForm.defectQuantityRange[1] !== null && searchForm.defectQuantityRange[1] !== undefined) {
        params.defectQuantityMax = searchForm.defectQuantityRange[1]
      }
    }
    delete params.defectQuantityRange
    
    if (searchForm.defectRateRange && searchForm.defectRateRange.length === 2) {
      if (searchForm.defectRateRange[0] !== null && searchForm.defectRateRange[0] !== undefined) {
        params.defectRateMin = searchForm.defectRateRange[0]
      }
      if (searchForm.defectRateRange[1] !== null && searchForm.defectRateRange[1] !== undefined) {
        params.defectRateMax = searchForm.defectRateRange[1]
      }
    }
    delete params.defectRateRange
    
    const response = await apiService.get('/customer-complaints', { params })
    if (response.data.success) {
      // 将后端返回的PascalCase字段转换为前端使用的camelCase字段
      const convertedData = (response.data.data || []).map(item => ({
        id: item.ID,
        date: formatDate(item.Date),
        customerCode: item.CustomerCode,
        workOrderNo: item.WorkOrderNo,
        productName: item.ProductName,
        specification: item.Specification,
        orderQuantity: item.OrderQuantity,
        problemDescription: item.ProblemDescription,
        problemImages: item.ProblemImages || [],
        defectQuantity: item.DefectQuantity,
        defectRate: item.DefectRate,
        complaintMethod: item.ComplaintMethod,
        complaintType: item.ComplaintType,
        processingDeadline: formatDate(item.ProcessingDeadline),
        requireReport: item.RequireReport,
        causeAnalysis: item.CauseAnalysis,
        correctiveActions: item.CorrectiveActions,
        disposalMeasures: item.DisposalMeasures,
        responsibleDepartment: item.ResponsibleDepartment,
        responsiblePerson: item.ResponsiblePerson,
        replyDate: formatDate(item.ReplyDate),
        reportAttachments: item.ReportAttachments || [],
        feedbackPerson: item.FeedbackPerson,
        feedbackDate: formatDate(item.FeedbackDate),
        processor: item.Processor,
        improvementVerification: item.ImprovementVerification,
        verificationDate: formatDate(item.VerificationDate),
        status: item.Status,
        createdAt: formatDate(item.CreatedAt),
        createdBy: item.CreatedBy,
        updatedAt: formatDate(item.UpdatedAt),
        updatedBy: item.UpdatedBy,
        // 质量成本相关字段
        qualityPenalty: item.QualityPenalty || 0,
        reworkCost: item.ReworkCost || 0,
        customerCompensation: item.CustomerCompensation || 0,
        qualityLossCost: item.QualityLossCost || 0,
        inspectionCost: item.InspectionCost || 0,
        transportationCost: item.TransportationCost || 0,
        preventionCost: item.PreventionCost || 0,
        totalQualityCost: item.TotalQualityCost || 0,
        costRemarks: item.CostRemarks || ''
      }))
      tableData.value = convertedData
      pagination.total = response.data.pagination?.total || 0
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error?.message || '未知错误')
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
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
    customerCode: '',
    workOrderNo: '',
    productName: '',
    status: '',
    dateRange: [],
    // 重置高级搜索字段
    specification: '',
    complaintMethod: '',
    responsibleDepartment: '',
    responsiblePerson: '',
    feedbackPerson: '',
    processor: '',
    defectQuantityRange: [],
    defectRateRange: [],
    processingDeadlineRange: [],
    replyDateRange: [],
    feedbackDateRange: [],
    verificationDateRange: [],
    createdBy: ''
  })
  handleSearch()
}

/**
 * 切换高级搜索
 */
const toggleAdvancedSearch = () => {
  showAdvanced.value = !showAdvanced.value
}

/**
 * 新增
 */
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 编辑 - 处理图片数据格式转换
 * 参考出版异常页面的实现逻辑
 */
const handleEdit = async (row) => {
  isEdit.value = true
  
  // 使用新的getImageList函数处理问题图片数据
  const imageList = getImageList(row.problemImages)
  const convertedProblemImages = imageList.map((img, index) => {
    return {
      name: img.originalName || img.filename || `image_${index + 1}`,
      url: img.url, // 已经通过getImageUrl处理过的URL
      uid: img.id || Date.now() + index,
      status: 'success',
      // 保留原始数据用于提交
      ...img
    }
  })
  
  // 转换报告附件数据格式
  const convertedReportAttachments = (row.reportAttachments || []).filter(file => {
    // 过滤掉空对象或无效数据
    if (!file || typeof file !== 'object') return false
    const hasValidKeys = Object.keys(file).length > 0
    const hasValidUrl = file.url || file.accessUrl || file.filename
    return hasValidKeys && hasValidUrl
  }).map((file, index) => {
    return {
      name: file.name || file.originalName || `attachment_${index + 1}`,
      url: file.url || file.accessUrl || (file.filename ? `/files/customer-complaint/${file.filename}` : ''),
      uid: file.id || Date.now() + index,
      status: 'success',
      // 保留原始数据
      ...file
    }
  })
  
  // 处理责任部门字段：如果是字符串代码，转换为对应的部门ID
  let processedResponsibleDepartment = row.responsibleDepartment
  if (typeof row.responsibleDepartment === 'string' && isNaN(row.responsibleDepartment)) {
    // 如果是字符串代码（如"technical"），查找对应的部门ID
    const dept = departmentOptions.value.find(d => {
      const textMap = {
        production: '生产部',
        quality: '品质部', 
        technical: '设计部',
        procurement: '采购部',
        sales: '业务部'
      }
      return d.Name === textMap[row.responsibleDepartment]
    })
    processedResponsibleDepartment = dept ? dept.ID : row.responsibleDepartment
  } else if (typeof row.responsibleDepartment === 'string' && !isNaN(row.responsibleDepartment)) {
    // 如果是字符串格式的数字，转换为数字ID
    processedResponsibleDepartment = parseInt(row.responsibleDepartment)
  }
  
  // 处理责任人字段：确保是数字ID格式
  let processedResponsiblePerson = row.responsiblePerson
  if (typeof row.responsiblePerson === 'string' && !isNaN(row.responsiblePerson)) {
    processedResponsiblePerson = parseInt(row.responsiblePerson)
  }
  
  Object.assign(formData, {
    ...row,
    problemImages: convertedProblemImages,
    reportAttachments: convertedReportAttachments,
    responsibleDepartment: processedResponsibleDepartment,
    responsiblePerson: processedResponsiblePerson
  })
  
  console.log('📝 编辑数据加载（优化后）:')
  console.log('原始责任部门:', row.responsibleDepartment)
  console.log('处理后责任部门:', processedResponsibleDepartment)
  console.log('原始责任人:', row.responsiblePerson)
  console.log('处理后责任人:', processedResponsiblePerson)
  console.log('原始图片数据:', row.problemImages)
  console.log('原始图片数据类型:', typeof row.problemImages)
  console.log('原始图片数据是否为数组:', Array.isArray(row.problemImages))
  if (row.problemImages && typeof row.problemImages === 'object') {
    console.log('原始图片数据键值:', Object.keys(row.problemImages))
    console.log('原始图片数据内容详情:', JSON.stringify(row.problemImages, null, 2))
  }
  console.log('解析后图片列表:', imageList)
  console.log('转换后图片数据:', convertedProblemImages)
  console.log('原始附件数据:', row.reportAttachments)
  console.log('转换后附件数据:', convertedReportAttachments)
  console.log('='.repeat(50))
  
  // 如果有责任部门，先加载对应的人员列表，然后再打开对话框
  if (formData.responsibleDepartment) {
    await loadPersonsByDepartment(formData.responsibleDepartment)
    
    // 确保责任人字段也是数字ID格式
    if (formData.responsiblePerson && typeof formData.responsiblePerson === 'string' && !isNaN(formData.responsiblePerson)) {
      formData.responsiblePerson = parseInt(formData.responsiblePerson)
    }
  }
  
  console.log('📝 编辑对话框打开前的最终数据:')
  console.log('责任部门ID:', formData.responsibleDepartment)
  console.log('责任人ID:', formData.responsiblePerson)
  console.log('部门选项列表:', departmentOptions.value)
  console.log('人员选项列表:', personOptions.value)
  console.log('='.repeat(50))
  
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
 * 删除
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条投诉记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await apiService.delete(`/customer-complaints/${row.id}`)
    if (response.data.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error?.message || '未知错误')
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    // 表单验证 - 使用回调形式获取具体错误信息
    const isValid = await new Promise((resolve) => {
      formRef.value.validate((valid, fields) => {
        if (!valid) {
          // 获取第一个验证失败的字段
          const firstErrorField = Object.keys(fields)[0]
          const firstErrorMessage = fields[firstErrorField][0].message
          ElMessage.error(firstErrorMessage)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
    
    if (!isValid) {
      return
    }
    
    submitLoading.value = true
    
    const submitData = {
      ...formData,
      problemImages: formData.problemImages.map(img => {
        // 保留完整的图片信息，参考出版异常页面的格式
        if (img.filename || img.accessUrl || img.relativePath) {
          return {
            id: img.id,
            originalName: img.originalName || img.name,
            filename: img.filename,
            relativePath: img.relativePath,
            accessUrl: img.accessUrl || img.url,
            fullUrl: img.fullUrl,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
            uploadTime: img.uploadTime,
            fileType: img.fileType,
            category: img.category,
            // 兼容旧的字段名
            name: img.name,
            url: img.accessUrl || img.url,
            path: img.relativePath,
            size: img.fileSize
          }
        } else {
          // 兼容旧格式
          return {
            name: img.name,
            url: img.url
          }
        }
      }),
      reportAttachments: formData.reportAttachments.map(file => {
        // 改进报告附件的数据格式
        if (file.filename || file.accessUrl || file.relativePath) {
          return {
            id: file.id,
            name: file.name,
            originalName: file.originalName || file.name,
            filename: file.filename,
            relativePath: file.relativePath,
            accessUrl: file.accessUrl || file.url,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            uploadTime: file.uploadTime,
            fileType: file.fileType,
            category: file.category,
            // 兼容旧的字段名
            url: file.accessUrl || file.url,
            size: file.fileSize
          }
        } else {
          // 兼容旧格式
          return {
            name: file.name,
            url: file.url
          }
        }
      })
    }
    
    let response
    if (isEdit.value) {
      // 编辑模式：添加被删除的文件信息
      const editData = {
        ...submitData,
        removedFiles: removedFiles.value
      }
      console.log('编辑提交数据:', editData)
      console.log('被删除的文件列表:', removedFiles.value)
      response = await apiService.put(`/customer-complaints/${formData.id}`, editData)
    } else {
      response = await apiService.post('/customer-complaints', submitData)
    }
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    // API请求错误处理
    if (error && error.response) {
      console.error('API请求失败:', error.response.data?.message || error.response.statusText)
      const errorMessage = error.response.data?.message || error.response.statusText || '请求失败'
      ElMessage.error(`提交失败: ${errorMessage}`)
    } else {
      console.error('提交失败:', error?.message || '未知错误')
      ElMessage.error(`提交失败: ${error?.message || '未知错误'}`)
    }
  } finally {
    submitLoading.value = false
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    date: '',
    customerCode: '',
    workOrderNo: '',
    productName: '',
    specification: '',
    orderQuantity: 0,
    problemDescription: '',
    problemImages: [],
    defectQuantity: 0,
    defectRate: 0,
    complaintMethod: '',
    processingDeadline: '',
    requireReport: false,
    causeAnalysis: '',
    correctiveActions: '',
    disposalMeasures: '',
    responsibleDepartment: '',
    responsiblePerson: '',
    replyDate: '',
    reportAttachments: [],
    feedbackPerson: '',
    feedbackDate: '',
    processor: '',
    improvementVerification: '',
    verificationDate: '',
    status: 'pending',
    // 质量成本相关字段
    qualityPenalty: 0,
    reworkCost: 0,
    customerCompensation: 0,
    qualityLossCost: 0,
    inspectionCost: 0,
    transportationCost: 0,
    preventionCost: 0,
    totalQualityCost: 0,
    costRemarks: ''
  })
  
  // 重置自动计算开关
  autoCalculateTotal.value = true
  
  // 清空被删除文件列表
  removedFiles.value = []
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

/**
 * 关闭对话框
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

/**
 * 选择变化
 */


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
 * 解析图片数据，支持新的JSON格式和旧的字符串格式
 * 参考出版异常页面的实现逻辑
 */
/**
 * 验证图片对象是否有效
 * @param {Object} img - 图片对象
 * @returns {boolean} 是否为有效的图片对象
 */
const isValidImageObject = (img) => {
  if (!img || typeof img !== 'object') {
    return false
  }
  
  const keys = Object.keys(img)
  const hasValidKeys = keys.length > 0
  const hasValidUrl = img.accessUrl || img.url || img.filename
  
  // 检查是否为空对象（所有值都为空）
  const isEmptyObject = keys.length === 0 || keys.every(key => {
    const value = img[key]
    return value === null || value === undefined || value === '' || 
           (typeof value === 'string' && value.trim() === '')
  })
  
  return hasValidKeys && hasValidUrl && !isEmptyObject
}

/**
 * 解析图片数据列表，支持多种格式兼容
 * @param {*} imageData - 图片数据（可能是数组、JSON字符串或普通字符串）
 * @returns {Array} 标准化的图片信息数组
 */
const getImageList = (imageData) => {
  console.log('🔍 getImageList 调试信息:')
  console.log('输入数据:', imageData)
  console.log('数据类型:', typeof imageData)
  console.log('是否为数组:', Array.isArray(imageData))
  
  // 数据为空的情况
  if (!imageData || imageData === '' || imageData === '[]' || imageData === 'null') {
    console.log('❌ 数据为空或无效，返回空数组')
    return []
  }
  
  // 如果已经是数组格式，直接处理
  if (Array.isArray(imageData)) {
    const filteredImages = imageData.filter(img => isValidImageObject(img))
    
    const mappedImages = filteredImages.map(imageInfo => ({
      ...imageInfo,
      url: getImageUrl(imageInfo) // 重新生成URL，确保环境适配
    }))
    
    return mappedImages
  }
  
  try {
    // 尝试解析JSON格式（新格式）
    const imageArray = JSON.parse(imageData)
    
    if (Array.isArray(imageArray)) {
        return imageArray.filter(img => isValidImageObject(img)).map(imageInfo => ({
          ...imageInfo,
          url: getImageUrl(imageInfo) // 重新生成URL，确保环境适配
        }))
      }
  } catch (e) {
    // 如果解析失败，说明是旧格式（字符串）
    // 继续处理旧格式
  }
  
  // 旧格式兼容：直接是文件名字符串
  if (typeof imageData === 'string' && imageData.trim()) {
    const result = [{
      filename: imageData,
      originalName: imageData,
      url: getImageUrl({ filename: imageData }),
      path: `customer-complaint/${imageData}`
    }]
    return result
  }
  
  return []
}

/**
 * 获取有效的图片列表 - 过滤空对象和无效数据
 * 保持向后兼容
 */
const getValidImages = (images) => {
  return getImageList(images)
}

/**
 * 获取图片URL - 兼容新旧格式，支持环境自适应
 * 参考出版异常页面的实现逻辑
 */
const getImageUrl = (image, preventCache = false) => {
  if (!image) return ''
  
  // 处理el-upload组件中的文件对象
  if (image.url && !image.accessUrl && !image.filename) {
    // 这是el-upload组件中的文件对象，直接使用url
    return preventCache ? `${image.url}?t=${Date.now()}` : image.url
  }
  
  // 新格式：优先使用accessUrl（已经是完整URL）
  if (image.accessUrl) {
    return preventCache ? `${image.accessUrl}?t=${Date.now()}` : image.accessUrl
  }
  
  // 旧格式：使用url（已经是完整URL）
  if (image.url && (image.url.startsWith('http') || image.url.startsWith('/files/'))) {
    return preventCache ? `${image.url}?t=${Date.now()}` : image.url
  }
  
  // 如果有filename，根据环境构建URL路径
  if (image.filename) {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    let url
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 开发环境：使用Vite代理
      url = `/files/customer-complaint/${image.filename}`
    } else {
      // 生产环境：使用Nginx文件服务器端口8080
      url = `${protocol}//${hostname}:8080/files/customer-complaint/${image.filename}`
    }
    
    // 只在需要防止缓存时添加时间戳参数
    if (preventCache) {
      url += `?t=${Date.now()}`
    }
    
    return url
  }
  
  // 如果都没有，返回空字符串
  return ''
}

/**
 * 图片上传成功 - 处理新的文件信息格式
 * 参考出版异常页面的实现逻辑
 */
const handleImageSuccess = (response, file) => {
  if (response.success) {
    let fileInfo
    
    if (response.fileInfo) {
      // 新格式：使用完整的文件信息对象
      fileInfo = {
        id: response.fileInfo.id,
        name: file.name,
        originalName: response.fileInfo.originalName,
        filename: response.fileInfo.filename,
        relativePath: response.fileInfo.relativePath,
        accessUrl: response.fileInfo.accessUrl,
        fullUrl: response.fileInfo.fullUrl,
        fileSize: response.fileInfo.fileSize,
        mimeType: response.fileInfo.mimeType,
        uploadTime: response.fileInfo.uploadTime,
        fileType: response.fileInfo.fileType,
        category: response.fileInfo.category,
        // 兼容旧的字段名
        url: response.fileInfo.accessUrl,
        path: response.fileInfo.relativePath,
        size: response.fileInfo.fileSize
      }
    } else {
      // 旧格式兼容
      fileInfo = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: file.name,
        originalName: file.name,
        filename: response.data?.filename || file.name,
        relativePath: `customer-complaint/${response.data?.filename || file.name}`,
        accessUrl: response.url || response.data?.url,
        fileSize: file.size,
        mimeType: file.type,
        uploadTime: new Date().toISOString(),
        fileType: 'image',
        category: 'customer_complaint',
        // 兼容旧的字段名
        url: getImageUrl({ filename: response.data?.filename || file.name }, true), // 新上传的文件使用防缓存机制
        path: `customer-complaint/${response.data?.filename || file.name}`,
        size: file.size
      }
    }
    
    formData.problemImages.push(fileInfo)
    console.log('客诉图片上传成功，保存文件信息:', fileInfo)
  } else {
    ElMessage.error('图片上传失败')
  }
}

/**
 * 移除图片 - 支持新的文件信息格式
 */
const handleImageRemove = (file) => {
  // 支持新旧两种格式的文件移除
  const index = formData.problemImages.findIndex(img => {
    // 新格式：通过accessUrl或filename匹配
    if (img.accessUrl && file.url) {
      return img.accessUrl === file.url
    }
    // 兼容旧格式：通过url匹配
    if (img.url && file.url) {
      return img.url === file.url
    }
    // 通过filename匹配
    if (img.filename && file.name) {
      return img.filename === file.name
    }
    return false
  })
  
  if (index > -1) {
    const removedImage = formData.problemImages[index]
    
    // 如果是编辑模式且图片有filename（表示是已上传的文件），则添加到删除列表
    if (isEdit.value && removedImage.filename) {
      removedFiles.value.push({
        filename: removedImage.filename,
        originalName: removedImage.originalName || removedImage.name,
        accessUrl: removedImage.accessUrl || removedImage.url
      })
      console.log('添加到删除列表:', removedImage.filename)
    }
    
    formData.problemImages.splice(index, 1)
    console.log('移除图片:', removedImage)
  }
}

/**
 * 图片上传前检查
 */
const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  return true
}

/**
 * 报告附件上传成功
 */
const handleReportSuccess = (response, file) => {
  if (response.success) {
    formData.reportAttachments.push({
      name: file.name,
      url: response.data.url
    })
  } else {
    ElMessage.error('附件上传失败')
  }
}

/**
 * 移除报告附件
 */
const handleReportRemove = (file) => {
  const index = formData.reportAttachments.findIndex(attachment => attachment.url === file.url)
  if (index > -1) {
    formData.reportAttachments.splice(index, 1)
  }
}

/**
 * 报告附件上传前检查
 */
const beforeReportUpload = (file) => {
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isLt10M) {
    ElMessage.error('附件大小不能超过10MB')
    return false
  }
  return true
}

// 监听订单数和不良数变化，自动计算不良比例
const watchOrderQuantity = () => {
  calculateDefectRate()
}

/**
 * 处理表格选择变化
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

/**
 * 批量删除投诉记录
 */
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条投诉记录吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const ids = selectedRows.value.map(row => row.id)
    
    const response = await apiService.post('/customer-complaints-batch/delete', {
      ids: ids
    })

    if (response.data.success) {
      ElMessage.success(response.data.message)
      selectedRows.value = []
      await loadData()
    } else {
      ElMessage.error(response.data.message || '批量删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error?.message || '未知错误')
      ElMessage.error('批量删除失败，请重试')
    }
  }
}

/**
 * 处理客户编号输入 - 自动转换为大写
 * @param {string} value - 输入的值
 */
const handleCustomerCodeInput = (value) => {
  formData.customerCode = value.toUpperCase()
}

/**
 * 处理工单号输入 - 自动转换为大写
 * @param {string} value - 输入的值
 */
const handleWorkOrderNoInput = (value) => {
  formData.workOrderNo = value.toUpperCase()
}

/**
 * 获取部门列表
 */
const loadDepartments = async () => {
  try {
    const response = await apiService.get('/customer-complaints/departments')
    if (response.data.success) {
      departmentOptions.value = response.data.data
      // 构建级联选择器数据
      await buildCascaderOptions()
    } else {
      console.error('获取部门列表失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

/**
 * 构建级联选择器数据结构
 * 将部门和人员数据转换为Cascader组件所需的树形结构
 */
const buildCascaderOptions = async () => {
  try {
    const cascaderData = []
    
    // 为每个部门构建级联数据
    for (const department of departmentOptions.value) {
      // 获取该部门的人员列表
      const response = await apiService.get(`/customer-complaints/persons/${department.ID}`)
      
      if (response.data.success) {
        const persons = response.data.data
        
        // 构建部门节点
        const departmentNode = {
          value: department.ID,
          label: department.Name,
          children: persons.map(person => ({
            value: person.ID,
            label: person.Name
          }))
        }
        
        cascaderData.push(departmentNode)
      }
    }
    
    // 设置反馈人和处理人的级联选择器数据
    feedbackCascaderOptions.value = cascaderData
    processorCascaderOptions.value = cascaderData
    
  } catch (error) {
    console.error('构建级联选择器数据失败:', error)
  }
}

/**
 * 根据部门获取人员列表
 * @param {number} departmentId - 部门ID
 */
const loadPersonsByDepartment = async (departmentId) => {
  try {
    if (!departmentId) {
      personOptions.value = []
      return
    }
    
    const response = await apiService.get(`/customer-complaints/persons/${departmentId}`)
    if (response.data.success) {
      personOptions.value = response.data.data
    } else {
      console.error('获取人员列表失败:', response.data.message)
      personOptions.value = []
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
    personOptions.value = []
  }
}



/**
 * 处理部门选择变化
 * @param {number} departmentId - 选中的部门ID
 */
const handleDepartmentChange = (departmentId) => {
  // 清空责任人选择
  formData.responsiblePerson = ''
  // 根据选中的部门加载对应的人员列表
  loadPersonsByDepartment(departmentId)
}



/**
 * 获取部门名称
 * @param {number} departmentId - 部门ID
 * @returns {string} 部门名称
 */
const getDepartmentName = (departmentId) => {
  const department = departmentOptions.value.find(dept => dept.ID === departmentId)
  return department ? department.Name : ''
}

/**
 * 获取人员名称
 * @param {number} personId - 人员ID
 * @returns {string} 人员名称
 */
const getPersonName = (personId) => {
  const person = personOptions.value.find(p => p.ID === personId)
  return person ? person.Name : ''
}

/**
 * 判断是否有质量成本数据需要显示
 * @param {Object} data - 投诉数据
 * @returns {boolean} 是否有质量成本数据
 */
const hasQualityCostData = (data) => {
  if (!data) return false
  
  // 始终显示质量成本区域，不管数值是否为0
  return true
}

/**
 * 监听质量成本字段变化，自动计算总成本
 */
watch(
  [() => formData.qualityPenalty, () => formData.reworkCost, () => formData.customerCompensation,
   () => formData.qualityLossCost, () => formData.inspectionCost, () => formData.transportationCost,
   () => formData.preventionCost, () => autoCalculateTotal.value],
  () => {
    if (autoCalculateTotal.value) {
      formData.totalQualityCost = calculatedTotalCost.value
    }
  },
  { immediate: true }
)

// 组件挂载时加载数据
onMounted(() => {
  loadData()
  loadComplaintTypes()
  loadDepartments()
})
</script>

<style scoped>
.customer-complaint-container {
  padding: 20px;
}



.search-card {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.search-icon {
  color: #409eff;
  font-size: 16px;
}

.search-title {
  font-size: 16px;
}

.search-form {
  padding: 8px 0;
}

.search-form .el-form-item {
  margin-bottom: 18px;
}

.search-form .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

.search-buttons {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.search-buttons .el-button {
  margin-left: 12px;
}

.search-buttons .el-button:first-child {
  margin-left: 0;
}

/* 输入框样式优化 */
:deep(.search-form .el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.search-form .el-input__wrapper:hover) {
  border-color: #c0c4cc;
}

:deep(.search-form .el-input__wrapper.is-focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

/* 选择器样式优化 */
:deep(.search-form .el-select .el-input__wrapper) {
  border-radius: 6px;
}

/* 日期选择器样式优化 */
:deep(.search-form .el-date-editor) {
  border-radius: 6px;
}

/* 按钮样式优化 */
.search-buttons .el-button {
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.search-buttons .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
}

.search-buttons .el-button--primary:hover {
  background: linear-gradient(135deg, #337ecc 0%, #5aa3e6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.search-buttons .el-button--info {
  border-color: #d3d4d6;
  color: #606266;
}

.search-buttons .el-button--info:hover {
  border-color: #409eff;
  color: #409eff;
  background-color: #ecf5ff;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-count {
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.pagination-container .table-count {
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.complaint-form {
  max-height: 60vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.section-title {
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  padding-left: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  border-left: 4px solid #409EFF;
  position: relative;
}

.dialog-footer {
  text-align: center;
  padding: 20px 0;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  padding-left: 12px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  border-left: 4px solid #409EFF;
}

.detail-section p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 100px;
  height: 100px;
}

/* 表格样式优化 */
:deep(.el-table) {
  /* 强制禁止表格内容换行 */
  .el-table__cell {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
  }
  
  /* 确保表格行高度固定 */
  .el-table__row {
    height: 36px !important;
    min-height: 36px !important;
    max-height: 36px !important;
  }
  
  /* 禁止所有内容换行 */
  .el-table__cell .cell {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
    line-height: 36px !important;
  }
  
  /* 禁止表格内所有元素换行 */
  .el-table__cell * {
    white-space: nowrap !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
  }
  
  /* 标题行居中 */
  .el-table__header-wrapper .el-table__header .el-table__cell {
    text-align: center;
    white-space: nowrap !important;
  }
  
  /* 按钮禁止换行 */
  .el-button {
    white-space: nowrap !important;
  }
  
  /* 标签组件禁止换行 */
  .el-tag {
    white-space: nowrap !important;
  }
}

/* 高级搜索区域样式 */
.advanced-search-area {
  margin-top: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 8px;
  border: 1px solid #e1e8ff;
  position: relative;
}

.advanced-search-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff 0%, #66b3ff 50%, #409eff 100%);
  border-radius: 8px 8px 0 0;
}

.advanced-search-area .el-divider {
  margin: 0 0 20px 0;
}

.advanced-search-area .el-divider__text {
  background: transparent;
  font-size: 14px;
}

/* 高级搜索表单项样式 */
.advanced-search-area .el-form-item {
  margin-bottom: 16px;
}

.advanced-search-area .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

/* 高级搜索输入框样式 */
.advanced-search-area .el-input__wrapper {
  border-radius: 6px;
  transition: all 0.3s ease;
}

.advanced-search-area .el-input__wrapper:hover {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.advanced-search-area .el-input__wrapper.is-focus {
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

/* 高级搜索选择器样式 */
.advanced-search-area .el-select .el-input__wrapper {
  border-radius: 6px;
}

/* 高级搜索日期选择器样式 */
.advanced-search-area .el-date-editor {
  border-radius: 6px;
}

.advanced-search-area .el-date-editor:hover {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.advanced-search-area .el-date-editor.is-active {
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

/* 高级搜索数字输入框样式 */
.advanced-search-area .el-input-number {
  border-radius: 6px;
}

.advanced-search-area .el-input-number .el-input__wrapper {
  border-radius: 6px;
}

/* 范围输入框组合样式 */
.advanced-search-area .el-form-item .el-form-item__content {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.advanced-search-area .el-form-item .el-input-number {
  flex-shrink: 0;
}

.advanced-search-area .el-form-item .el-input-number + span {
  flex-shrink: 0;
  white-space: nowrap;
}

/* 模块标题栏样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 附件列表样式 */
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.attachment-item:hover {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.attachment-icon {
  color: #409eff;
  margin-right: 8px;
  font-size: 16px;
}

.attachment-name {
  flex: 1;
  color: #606266;
  font-size: 14px;
  margin-right: 8px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .advanced-search-area .el-col {
    margin-bottom: 8px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .advanced-search-area {
    padding: 16px;
  }
  
  .advanced-search-area .el-row {
    margin: 0;
  }
  
  .advanced-search-area .el-col {
    padding: 0 8px;
  }
}

/* 自定义上传文件项样式 */
.upload-file-item {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}

.upload-file-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.upload-file-item:hover .upload-file-overlay {
  opacity: 1;
}

.upload-file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.upload-file-preview-icon {
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.upload-file-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  padding: 4px;
  pointer-events: auto;
}

.upload-file-action {
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s ease;
}

.upload-file-action:hover {
  color: #f56c6c;
}

/* 图片加载失败样式 */
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

/* 详情对话框图片样式 */
.detail-image-item {
  position: relative;
  width: 100px;
  height: 100px;
  margin-right: 10px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  display: inline-block;
}

.detail-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.detail-image-item:hover .detail-image-overlay {
  opacity: 1;
}

.detail-image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-image-preview-icon {
  color: white;
  font-size: 20px;
  cursor: pointer;
}
</style>