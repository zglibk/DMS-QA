<template>
  <div class="supplier-complaints-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Warning /></el-icon>
        供应商投诉
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
          <el-form-item class="search-btn">
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button @click="handleReset" :icon="Refresh">重置</el-button>
          </el-form-item>
        </el-form>
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
      <div class="table-header">
        <div class="action-buttons">
          <el-button type="primary" @click="handleAdd" :icon="Plus">新增投诉</el-button>
          <el-button type="success" @click="handleExport" :icon="Download">导出数据</el-button>
          <el-button type="danger" @click="handleBatchDelete" :icon="Delete" :disabled="selectedRows.length === 0">批量删除</el-button>
        </div>
      </div>
      <el-table 
          :key="tableKey"
          :data="tableData" 
          v-loading="loading" 
          stripe 
          border
          style="width: 100%"
          :header-cell-style="{ textAlign: 'center', whiteSpace: 'nowrap' }"
          :cell-style="getCellStyle"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="ComplaintNo" label="投诉编号" width="140" fixed="left">
            <template #default="{ row }">
              <el-link type="primary" @click="handleView(row)">{{ row.ComplaintNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="ComplaintDate" label="投诉日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.ComplaintDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="SupplierName" label="供应商名称" width="180" show-overflow-tooltip />
          <el-table-column prop="MaterialName" label="材料名称" width="150" show-overflow-tooltip />
          <el-table-column prop="ComplaintType" label="投诉类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getComplaintTypeColor(row.ComplaintType)">{{ row.ComplaintType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="UrgencyLevel" label="紧急程度" width="100">
            <template #default="{ row }">
              <el-tag :type="getUrgencyColor(row.UrgencyLevel)">{{ getUrgencyText(row.UrgencyLevel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="Quantity" label="数量" width="100" align="right">
            <template #default="{ row }">
              {{ formatNumber(row.Quantity) }}
            </template>
          </el-table-column>
          <el-table-column prop="TotalAmount" label="涉及金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount-text">¥{{ formatNumber(row.TotalAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ProcessStatus" label="处理状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusColor(row.ProcessStatus)">{{ getStatusText(row.ProcessStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="InitiatedBy" label="发起人" width="100" />
          <el-table-column prop="Description" label="问题描述" width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="handleView(row)" :icon="View">查看</el-button>
                <el-button type="warning" size="small" @click="handleEdit(row)" :icon="Edit">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)" :icon="Delete">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[5, 10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="50%"
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
          <el-col :span="8">
            <el-form-item label="投诉编号" prop="complaintNo">
              <el-input v-model="formData.complaintNo" :disabled="true" placeholder="系统自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="投诉日期" prop="ComplaintDate">
              <el-date-picker 
                v-model="formData.ComplaintDate" 
                type="date" 
                placeholder="选择投诉日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="紧急程度" prop="UrgencyLevel">
              <el-select v-model="formData.UrgencyLevel" placeholder="请选择紧急程度" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="10">
            <el-form-item label="供应商名称" prop="SupplierName">
              <el-select
                v-model="formData.SupplierName"
                placeholder="请选择或输入供应商名称"
                filterable
                allow-create
                default-first-option
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
          <el-col :span="14">
            <el-form-item label="材料名称" prop="MaterialName">
              <el-input v-model="formData.MaterialName" placeholder="请输入材料名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="15">
          <el-col :span="8">
            <el-form-item label="来料日期">
              <el-date-picker 
                v-model="formData.IncomingDate" 
                type="date" 
                placeholder="选择来料日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="批量数量">
              <el-input-number 
                v-model="formData.BatchQuantity" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="抽检数量">
              <el-input-number 
                v-model="formData.SampleQuantity" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="IQC判定">
              <el-select v-model="formData.IQCResult" placeholder="请选择IQC判定" style="width: 100%">
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
                <el-option label="特采" value="特采" />
                <el-option label="让步接收" value="让步接收" />
                <el-option label="待定" value="待定" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="采购单号">
              <el-input 
                v-model="formData.PurchaseOrderNo" 
                placeholder="请输入采购单号，多个用逗号分隔" 
                type="textarea"
                :rows="2"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="使用工单">
              <el-input 
                v-model="formData.WorkOrderNo" 
                placeholder="请输入使用工单，多个用逗号分隔" 
                type="textarea"
                :rows="2"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="附图">
              <el-input v-model="formData.AttachedImages" placeholder="请输入附图说明或路径" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="检验日期">
              <el-date-picker 
                v-model="formData.InspectionDate" 
                type="date" 
                placeholder="选择检验日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
 
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="发起人" prop="InitiatedBy">
            <el-select 
              v-model="formData.InitiatedBy" 
              placeholder="请选择发起人" 
              filterable
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="person in personList"
                :key="person.value"
                :label="person.label"
                :value="person.value"
              />
            </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="处理状态" prop="ProcessStatus">
              <el-select v-model="formData.ProcessStatus" placeholder="请选择处理状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已关闭" value="closed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="问题数量" prop="Quantity">
              <el-input-number 
                v-model="formData.Quantity" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                @change="calculateTotalAmount"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价" prop="UnitPrice">
              <el-input-number 
                v-model="formData.UnitPrice" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                @change="calculateTotalAmount"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总金额" prop="TotalAmount">
              <el-input-number 
                v-model="formData.TotalAmount" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="问题描述" prop="Description">
          <el-input 
            v-model="formData.Description" 
            type="textarea" 
            :rows="4" 
            placeholder="请详细描述投诉问题"
          />
        </el-form-item>
        
        <el-form-item label="期望解决方案">
          <el-input 
            v-model="formData.ExpectedSolution" 
            type="textarea" 
            :rows="3" 
            placeholder="请描述期望的解决方案"
          />
        </el-form-item>
        

        
        <!-- 处理结果相关字段 -->
        <div v-if="formData.ProcessStatus !== 'pending'" class="process-section">
          <el-divider content-position="left">处理结果</el-divider>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="处理结果">
                <el-select v-model="formData.ProcessResult" placeholder="请选择处理结果" style="width: 100%">
                  <el-option label="供应商整改" value="supplier_improvement" />
                  <el-option label="退货处理" value="return_goods" />
                  <el-option label="换货处理" value="exchange_goods" />
                  <el-option label="返工处理" value="rework" />
                  <el-option label="索赔处理" value="claim" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="索赔金额">
                <el-input-number 
                  v-model="formData.ClaimAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="实际损失">
                <el-input-number 
                  v-model="formData.ActualLoss" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="赔偿金额">
                <el-input-number 
                  v-model="formData.CompensationAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="返工成本">
                <el-input-number 
                  v-model="formData.ReworkCost" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="更换成本">
                <el-input-number 
                  v-model="formData.ReplacementCost" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="退货数量">
                <el-input-number 
                  v-model="formData.ReturnQuantity" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="退货金额">
                <el-input-number 
                  v-model="formData.ReturnAmount" 
                  :min="0" 
                  :precision="2" 
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="解决方案描述">
            <el-input 
              v-model="formData.SolutionDescription" 
              type="textarea" 
              :rows="3" 
              placeholder="请描述具体的解决方案"
            />
          </el-form-item>
          
          <el-form-item label="验证结果">
            <el-input 
              v-model="formData.VerificationResult" 
              type="textarea" 
              :rows="3" 
              placeholder="请描述验证结果"
            />
          </el-form-item>
          
          <el-form-item label="后续行动">
            <el-input 
              v-model="formData.FollowUpActions" 
              type="textarea" 
              :rows="2" 
              placeholder="请描述后续需要采取的行动"
            />
          </el-form-item>
          
          <el-form-item label="预防措施">
            <el-input 
              v-model="formData.PreventiveMeasures" 
              type="textarea" 
              :rows="2" 
              placeholder="请描述预防类似问题的措施"
            />
          </el-form-item>
          
          <el-form-item label="供应商回复">
            <el-input 
              v-model="formData.SupplierResponse" 
              type="textarea" 
              :rows="3" 
              placeholder="供应商的回复内容"
            />
          </el-form-item>
        </div>
        
        <el-form-item label="内部备注">
          <el-input 
            v-model="formData.InternalNotes" 
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
      width="43%"
      :close-on-click-modal="false"
    >
      <div class="complaint-detail" v-if="viewData">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="投诉编号">{{ viewData.ComplaintNo }}</el-descriptions-item>
          <el-descriptions-item label="投诉日期">{{ formatDate(viewData.ComplaintDate) }}</el-descriptions-item>
          <el-descriptions-item label="供应商名称">{{ viewData.SupplierName }}</el-descriptions-item>
          <el-descriptions-item label="材料名称">{{ viewData.MaterialName }}</el-descriptions-item>
          <el-descriptions-item label="材料编号">{{ viewData.MaterialCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="采购单号">{{ viewData.PurchaseOrderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来料日期">{{ formatDate(viewData.IncomingDate) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批量数量">{{ formatNumber(viewData.BatchQuantity) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="检验日期">{{ formatDate(viewData.InspectionDate) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="使用工单">{{ viewData.WorkOrderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="抽检数量">{{ formatNumber(viewData.SampleQuantity) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="附图">{{ viewData.AttachedImages || '-' }}</el-descriptions-item>
          <el-descriptions-item label="IQC判定">
            <el-tag v-if="viewData.IQCResult" :type="getIQCResultColor(viewData.IQCResult)">{{ viewData.IQCResult }}</el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="投诉类型">
            <el-tag :type="getComplaintTypeColor(viewData.ComplaintType)">{{ viewData.ComplaintType }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-tag :type="getUrgencyColor(viewData.UrgencyLevel)">{{ getUrgencyText(viewData.UrgencyLevel) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="问题数量">{{ formatNumber(viewData.Quantity) }}</el-descriptions-item>
          <el-descriptions-item label="单价">¥{{ formatNumber(viewData.UnitPrice) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ formatNumber(viewData.TotalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="getStatusColor(viewData.ProcessStatus)">{{ getStatusText(viewData.ProcessStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起人">{{ viewData.InitiatedBy }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(viewData.CreatedAt) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="left">问题描述</el-divider>
        <p class="description-text">{{ viewData.Description }}</p>
        
        <el-divider content-position="left" v-if="viewData.ExpectedSolution">期望解决方案</el-divider>
        <p class="description-text" v-if="viewData.ExpectedSolution">{{ viewData.ExpectedSolution }}</p>
        
        <div v-if="viewData.ProcessStatus !== 'pending'">
          <el-divider content-position="left">处理结果</el-divider>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="处理结果">{{ viewData.ProcessResult }}</el-descriptions-item>
            <el-descriptions-item label="索赔金额">¥{{ formatNumber(viewData.ClaimAmount) }}</el-descriptions-item>
            <el-descriptions-item label="实际损失">¥{{ formatNumber(viewData.ActualLoss) }}</el-descriptions-item>
            <el-descriptions-item label="赔偿金额">¥{{ formatNumber(viewData.CompensationAmount) }}</el-descriptions-item>
            <el-descriptions-item label="返工成本">¥{{ formatNumber(viewData.ReworkCost) }}</el-descriptions-item>
            <el-descriptions-item label="更换成本">¥{{ formatNumber(viewData.ReplacementCost) }}</el-descriptions-item>
            <el-descriptions-item label="退货数量">{{ formatNumber(viewData.ReturnQuantity) }}</el-descriptions-item>
            <el-descriptions-item label="退货金额">¥{{ formatNumber(viewData.ReturnAmount) }}</el-descriptions-item>
          </el-descriptions>
          
          <el-divider content-position="left" v-if="viewData.SolutionDescription">解决方案描述</el-divider>
          <p class="description-text" v-if="viewData.SolutionDescription">{{ viewData.SolutionDescription }}</p>
          
          <el-divider content-position="left" v-if="viewData.VerificationResult">验证结果</el-divider>
          <p class="description-text" v-if="viewData.VerificationResult">{{ viewData.VerificationResult }}</p>
          
          <el-divider content-position="left" v-if="viewData.FollowUpActions">后续行动</el-divider>
          <p class="description-text" v-if="viewData.FollowUpActions">{{ viewData.FollowUpActions }}</p>
          
          <el-divider content-position="left" v-if="viewData.PreventiveMeasures">预防措施</el-divider>
          <p class="description-text" v-if="viewData.PreventiveMeasures">{{ viewData.PreventiveMeasures }}</p>
          
          <el-divider content-position="left" v-if="viewData.SupplierResponse">供应商回复</el-divider>
          <p class="description-text" v-if="viewData.SupplierResponse">{{ viewData.SupplierResponse }}</p>
        </div>
        
        <el-divider content-position="left" v-if="viewData.InternalNotes">内部备注</el-divider>
        <p class="description-text" v-if="viewData.InternalNotes">{{ viewData.InternalNotes }}</p>
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
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Plus, Download, DataAnalysis,
  View, Edit, Delete, Warning, Clock, Loading,
  CircleCheck, Histogram
} from '@element-plus/icons-vue'
import api from '@/services/api'

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const tableKey = ref(0)
const selectedRows = ref([])
const showStatistics = ref(true)
const statistics = ref({})
const supplierList = ref([])
const personList = ref([]) // 人员列表

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
  pageSize: 5,
  total: 0
})

// 对话框控制
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const viewData = ref(null)

// 表单数据
const formData = reactive({
  ID: null,
  ComplaintNo: '',
  ComplaintDate: '',
  SupplierName: '',
  MaterialName: '',
  MaterialCode: '', // 材料编号
  PurchaseOrderNo: '', // 采购单号
  IncomingDate: '', // 来料日期
  BatchQuantity: 0, // 批量数量
  InspectionDate: '', // 检验日期
  WorkOrderNo: '', // 使用工单
  SampleQuantity: 0, // 抽检数量
  AttachedImages: '', // 附图
  IQCResult: '', // IQC判定
  ComplaintType: '',
  Description: '',
  Quantity: 0,
  UnitPrice: 0,
  TotalAmount: 0,
  UrgencyLevel: 'medium',
  ExpectedSolution: '',
  InitiatedBy: '',
  ProcessStatus: 'pending',
  ProcessResult: '',
  SolutionDescription: '',
  VerificationResult: '',
  ClaimAmount: 0,
  ActualLoss: 0,
  CompensationAmount: 0,
  ReworkCost: 0,
  ReplacementCost: 0,
  ReturnQuantity: 0,
  ReturnAmount: 0,
  FollowUpActions: '',
  PreventiveMeasures: '',
  SupplierResponse: '',
  InternalNotes: ''
})

// 表单引用
const formRef = ref(null)

// 表单验证规则
const formRules = {
  ComplaintDate: [{ required: true, message: '请选择投诉日期', trigger: 'change' }],
  SupplierName: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  MaterialName: [{ required: true, message: '请输入材料名称', trigger: 'blur' }],
  ComplaintType: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
  Description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
  Quantity: [{ required: true, message: '请输入问题数量', trigger: 'blur' }],
  UnitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  UrgencyLevel: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  InitiatedBy: [{ required: true, message: '请选择发起人', trigger: 'change' }],
  ProcessStatus: [{ required: true, message: '请选择处理状态', trigger: 'change' }]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑投诉' : '新增投诉'
})

// 生命周期
onMounted(() => {
  loadData()
  loadSuppliers()
  loadPersonList() // 加载人员列表
  loadStatistics()
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
      size: pagination.pageSize,
      ...searchForm
    }
    
    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response = await api.get('/supplier-complaints', { params })
    
    // 添加调试日志
    console.log('API响应:', response.data)
    console.log('数据列表:', response.data.data?.list)
    
    if (response.data.success) {
      // 强制触发响应式更新
      tableData.value = []
      tableKey.value++
      await nextTick()
      tableData.value = response.data.data.list || []
      pagination.total = response.data.data.total
      console.log('设置tableData:', tableData.value)
      console.log('tableData长度:', tableData.value.length)
      console.log('tableKey:', tableKey.value)
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
    const response = await api.get('/supplier-complaints/suppliers')
    if (response.data.success) {
      // 将字符串数组转换为对象数组，供el-select使用
      supplierList.value = response.data.data.map(supplier => ({
        value: supplier,
        label: supplier
      }))
    }
  } catch (error) {
    console.error('加载供应商列表失败:', error)
    ElMessage.error('加载供应商列表失败')
  }
}

/**
 * 加载人员列表
 */
const loadPersonList = async () => {
  try {
    const response = await api.get('/person/list', {
      params: {
        page: 1,
        pageSize: 1000, // 获取所有人员
        includeInactive: false // 只获取在职人员
      }
    })
    if (response.data.success) {
      // 格式化人员数据为 "姓名（部门）" 格式
      personList.value = response.data.data.map(person => ({
        value: person.Name,
        label: `${person.Name}（${person.DepartmentName}）`,
        name: person.Name,
        department: person.DepartmentName
      }))
    }
  } catch (error) {
    console.error('加载人员列表失败:', error)
    ElMessage.error('加载人员列表失败')
  }
}

/**
 * 加载统计数据
 */
const loadStatistics = async () => {
  try {
    const response = await api.get('/supplier-complaints/statistics/overview')
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
const handleAdd = async () => {
  try {
    isEdit.value = false
    resetFormData()
    
    // 预生成投诉编号
    const response = await api.get('/supplier-complaints/generate-complaint-no')
    if (response.data.success) {
      formData.complaintNo = response.data.data.complaintNo
    } else {
      ElMessage.error(response.data.message || '生成投诉编号失败')
      return
    }
    
    dialogVisible.value = true
  } catch (error) {
    console.error('生成投诉编号失败:', error)
    ElMessage.error('生成投诉编号失败')
  }
}

/**
 * 编辑投诉
 */
const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(formData, row)
  // 确保投诉编号正确设置
  formData.complaintNo = row.ComplaintNo
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
      `确定要删除投诉编号为 "${row.ComplaintNo}" 的记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/supplier-complaints/${row.ID}`)
    
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
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？此操作不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    const ids = selectedRows.value.map(row => row.ID)
    const response = await api.delete('/supplier-complaints/batch', {
      data: { ids }
    })

    if (response.data.success) {
      ElMessage.success(`成功删除 ${selectedRows.value.length} 条记录`)
      selectedRows.value = []
      loadData()
      loadStatistics() // 重新加载统计数据
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('删除失败')
    }
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
  formData.TotalAmount = (formData.Quantity || 0) * (formData.UnitPrice || 0)
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    const url = isEdit.value 
      ? `/supplier-complaints/${formData.ID}`
      : '/supplier-complaints'
    
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await api[method](url, formData)
    
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
  const currentComplaintNo = formData.ComplaintNo // 保存当前的投诉编号
  Object.assign(formData, {
    ID: null,
    ComplaintNo: isEdit.value ? '' : currentComplaintNo, // 新增时保留预生成的编号，编辑时清空
    ComplaintDate: new Date().toISOString().split('T')[0],
    SupplierName: '',
    MaterialName: '',
    MaterialCode: '', // 材料编号
    PurchaseOrderNo: '', // 采购单号
    IncomingDate: '', // 来料日期
    BatchQuantity: 0, // 批量数量
    InspectionDate: '', // 检验日期
    WorkOrderNo: '', // 使用工单
    SampleQuantity: 0, // 抽检数量
    AttachedImages: '', // 附图
    IQCResult: '', // IQC判定
    ComplaintType: '',
    Description: '',
    Quantity: 0,
    UnitPrice: 0,
    TotalAmount: 0,
    UrgencyLevel: 'medium',
    ExpectedSolution: '',
    ResponsiblePerson: '',
    ProcessStatus: 'pending',
    ProcessResult: '',
    SolutionDescription: '',
    VerificationResult: '',
    ClaimAmount: 0,
    ActualLoss: 0,
    CompensationAmount: 0,
    ReworkCost: 0,
    ReplacementCost: 0,
    ReturnQuantity: 0,
    ReturnAmount: 0,
    FollowUpActions: '',
    PreventiveMeasures: '',
    SupplierResponse: '',
    InternalNotes: ''
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

/**
 * 获取IQC判定结果颜色
 */
const getIQCResultColor = (result) => {
  const colorMap = {
    '合格': 'success',
    '不合格': 'danger',
    '特采': 'warning',
    '让步接收': 'info',
    '待定': 'warning'
  }
  return colorMap[result] || 'info'
}

/**
 * 获取表格单元格样式
 */
const getCellStyle = ({ row, column, rowIndex, columnIndex }) => {
  const baseStyle = {
    textAlign: 'center',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
  
  // 供应商名称列（第4列，索引3）左对齐
  if (columnIndex === 3) {
    return { ...baseStyle, textAlign: 'left' }
  }
  
  // 材料名称列（第5列，索引4）左对齐
  if (columnIndex === 4) {
    return { ...baseStyle, textAlign: 'left' }
  }
  
  // 问题描述列（第11列，索引10）左对齐
  if (columnIndex === 10) {
    return { ...baseStyle, textAlign: 'left' }
  }
  
  // 数量列（第8列，索引7）右对齐
  if (columnIndex === 7) {
    return { ...baseStyle, textAlign: 'right' }
  }
  
  // 涉及金额列（第9列，索引8）右对齐
  if (columnIndex === 8) {
    return { ...baseStyle, textAlign: 'right' }
  }
  
  return baseStyle
}
</script>

<style scoped>
.supplier-complaints-container {
  padding: 8px;
  background-color: #f5f5f5;
  height: auto; /* 改为自动高度，  */
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 10px;
  padding: 20px 8px;
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

.supplier-complaints-container .search-section {
  margin-bottom: 10px !important;
}

.search-card {
  border-radius: 8px;
}

.search-btn {
  margin: 0px !important;
}

.table-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.table-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.statistics-section {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  height: auto;
  min-height: 80px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px 10px;
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

/* 表格区域样式 - 参考岗位管理页面的处理方式 */
.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 表格内容区域 - 参考岗位管理页面的处理方式 */
.table-content {
  /* 移除flex属性，让内容自然适应高度 */
}

/* 表格头部操作区域 */
.table-header {
  padding: 20px;
  border-bottom: 1px solid #EBEEF5;
}

.table-header .action-buttons {
  display: flex;
  gap: 12px;
}

/* 分页样式 - 参考物料价格页面 */
.pagination-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #EBEEF5;
}

.complaint-form {
  max-height: 65vh;
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
  max-height: 75vh;
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

/* 表格样式优化已通过Element Plus内置属性实现 */

/* 操作列按钮样式 - 禁止换行 */
.supplier-complaints-container .el-table .action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: nowrap;
  white-space: nowrap;
  min-width: 200px;
  width: 100%;
}

.supplier-complaints-container .el-table .action-buttons .el-button {
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 12px;
  padding: 4px 6px;
}

/* 确保操作列单元格不换行 */
.supplier-complaints-container .el-table td:last-child {
  white-space: nowrap !important;
  overflow: visible !important;
}

/* 防止对话框导致页面元素被挤压的样式 - 参考物料价格页面 */
/* 编辑对话框样式 - 修复居中问题 */
:deep(.el-dialog) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  max-height: 90vh !important;
  overflow-y: auto !important;
}

/* 确保删除确认对话框不影响页面布局 */
:deep(.delete-confirm-dialog.el-message-box) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 2001 !important;
  margin: 0 !important;
}

/* 防止删除确认对话框导致页面滚动条变化 */
:deep(.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow: visible !important;
}

/* 通用消息框样式 */
:deep(.el-message-box) {
  position: fixed !important;
  margin: 0 !important;
}

/* 消息框遮罩层样式 */
:deep(.el-overlay) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2000 !important;
}

.supplier-complaints-container .el-table td:last-child .cell {
  white-space: nowrap !important;
  overflow: visible !important;
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