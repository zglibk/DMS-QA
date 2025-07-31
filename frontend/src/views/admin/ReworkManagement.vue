<template>
  <div class="rework-management">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>
          <el-icon><Tools /></el-icon>
          生产不良返工登记管理
        </h2>
        <p class="page-description">管理生产过程中的不良品返工记录，包括返工原因、责任人、成本统计等信息</p>
      </div>

    </div>

    <!-- 搜索筛选区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="返工日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
            style="width: 9rem; min-width: 9rem"
            popper-class="date-picker-popper"
          />
        </el-form-item>
        <el-form-item label="客户编号">
          <el-input
            v-model="searchForm.customerCode"
            placeholder="请输入客户编号"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 10rem"
          />
        </el-form-item>
        <el-form-item label="工单号">
          <el-input
            v-model="searchForm.orderNo"
            placeholder="请输入工单号"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 10rem"
          />
        </el-form-item>
        <el-form-item label="责任人">
          <el-select
            v-model="searchForm.responsiblePerson"
            placeholder="请选择责任人"
            clearable
            filterable
            @change="handleSearch"
            style="width: 7.5rem"
          >
            <el-option
              v-for="person in options.persons"
              :key="person.Name"
              :label="person.Name"
              :value="person.Name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="返工状态">
          <el-select
            v-model="searchForm.reworkStatus"
            placeholder="请选择状态"
            clearable
            @change="handleSearch"
            style="width: 8rem"
          >
            <el-option
              v-for="status in options.reworkStatuses"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="产品名称、不良原因等"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 12rem"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="Search">
            搜索
          </el-button>
          <el-button @click="resetSearch" :icon="RefreshLeft">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <!-- 批量操作按钮区域 -->
      <div class="table-actions">
        <div class="actions-left">
          <el-button type="primary" @click="showAddDialog" :icon="Plus">
            新增
          </el-button>

          <el-button 
            type="warning" 
            @click="editSelectedRecord" 
            :icon="Edit"
            :disabled="selectedRows.length !== 1"
          >
            编辑
          </el-button>
          <el-button 
            type="danger" 
            @click="deleteSelectedRecords" 
            :icon="Delete"
            :disabled="selectedRows.length === 0"
          >
            删除
          </el-button>
        </div>
        <div class="actions-right">
          <span class="selection-info" v-if="selectedRows.length > 0">
            已选择 {{ selectedRows.length }} 项
          </span>
          <el-button @click="exportData" :icon="Download" :loading="exportLoading">
            导出数据
          </el-button>
          <el-button @click="refreshData" :icon="Refresh">
            刷新
          </el-button>
        </div>
      </div>
      
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        @selection-change="handleSelectionChange"
        @row-dblclick="viewDetail"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="ID" label="ID" width="70" sortable />
        <el-table-column prop="ReworkDate" label="返工日期" width="110" sortable>
          <template #default="{ row }">
            {{ formatDate(row.ReworkDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="CustomerCode" label="客户编号" width="110" show-overflow-tooltip />
        <el-table-column prop="OrderNo" label="工单号" width="130" show-overflow-tooltip />
        <el-table-column prop="ProductName" label="产品名称" min-width="250" show-overflow-tooltip />
        <el-table-column prop="TotalQty" label="总数量" width="90" align="right" />
        <el-table-column prop="DefectiveQty" label="不良数" width="90" align="right" />
        <el-table-column prop="DefectiveRate" label="不良率" width="90" align="right">
          <template #default="{ row }">
            <span :class="getDefectiveRateClass(row.DefectiveRate)">
              {{ row.DefectiveRate ? row.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="DefectiveReason" label="不良原因" width="140" show-overflow-tooltip />
        <el-table-column prop="ResponsiblePerson" label="责任人" width="90" show-overflow-tooltip />
        <el-table-column prop="ReworkCategory" label="返工类别" width="110" show-overflow-tooltip />
        <el-table-column prop="ReworkPersonnel" label="返工人员" width="90" show-overflow-tooltip />
        <el-table-column prop="ReworkHours" label="返工工时" width="90" align="right">
          <template #default="{ row }">
            {{ row.ReworkHours ? row.ReworkHours + 'h' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="TotalCost" label="总成本" width="110" align="right">
          <template #default="{ row }">
            <span class="cost-amount">
              {{ row.TotalCost ? '¥' + row.TotalCost.toFixed(2) : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="ReworkStatus" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.ReworkStatus)" size="small">
              {{ row.ReworkStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              size="small"
              @click="viewDetail(row)"
              :icon="View"
              class="action-btn view-btn"
              title="查看详情"
            />
            <el-button
              text
              size="small"
              @click="editRecord(row)"
              :icon="Edit"
              class="action-btn edit-btn"
              title="编辑"
            />
            <el-button
              text
              size="small"
              @click="deleteRecord(row)"
              :icon="Delete"
              class="action-btn delete-btn"
              title="删除"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
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
      width="60%"
      :close-on-click-modal="false"
      :append-to-body="true"
      :lock-scroll="false"
      @close="() => { resetForm(); cleanupResources(); }"
      @opened="forceDialogStyle"
      class="rework-dialog rework-dialog-global"
      custom-class="force-dialog-height"
    >
      <div class="form-container">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="140px"
          class="rework-form"
        >
          <!-- 基本信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Document /></el-icon>
                <span class="section-title">基本信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="返工日期" prop="reworkDate">
                  <el-date-picker
                    v-model="formData.reworkDate"
                    type="date"
                    placeholder="选择返工日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                    :prefix-icon="Calendar"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="客户编号" prop="customerCode">
                  <el-input 
                    v-model="formData.customerCode" 
                    placeholder="请输入客户编号"
                    :prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="工单号" prop="orderNo">
                  <el-input 
                    v-model="formData.orderNo" 
                    placeholder="请输入工单号"
                    :prefix-icon="DocumentCopy"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="产品名称" prop="productName">
                  <el-input
                    v-model="formData.productName"
                    type="textarea"
                    :rows="4"
                    placeholder="请详细输入产品名称"
                    show-word-limit
                    maxlength="200"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="产品规格">
                  <el-input 
                    v-model="formData.productSpec" 
                    placeholder="请输入产品规格"
                    :prefix-icon="SetUp"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="车间" prop="workshop">
                  <el-select 
                    v-model="formData.workshop" 
                    placeholder="请选择车间" 
                    style="width: 100%"
                    :prefix-icon="OfficeBuilding"
                  >
                    <el-option
                      v-for="workshop in options.workshops"
                      :key="workshop"
                      :label="workshop"
                      :value="workshop"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 数量信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><DataAnalysis /></el-icon>
                <span class="section-title">数量统计</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="总数量" prop="totalQty">
                  <el-input-number
                    v-model="formData.totalQty"
                    :min="1"
                    placeholder="总数量"
                    style="width: 100%"
                    @change="calculateDefectiveRate"
                    controls-position="right"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="不良数量" prop="defectiveQty">
                  <el-input-number
                    v-model="formData.defectiveQty"
                    :min="0"
                    :max="formData.totalQty"
                    placeholder="不良数量"
                    style="width: 100%"
                    @change="calculateDefectiveRate"
                    controls-position="right"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="良品数量">
                  <el-input-number
                    v-model="formData.goodQty"
                    :min="0"
                    placeholder="良品数量"
                    style="width: 100%"
                    disabled
                    controls-position="right"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 不良信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Warning /></el-icon>
                <span class="section-title">不良信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="不良原因" prop="defectiveReason">
                  <el-input
                    v-model="formData.defectiveReason"
                    type="textarea"
                    :rows="4"
                    placeholder="请详细描述不良原因"
                    show-word-limit
                    maxlength="500"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="不良类别" prop="defectiveCategory">
                  <el-select 
                    v-model="formData.defectiveCategory" 
                    placeholder="请选择不良类别" 
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="category in options.defectiveCategories"
                      :key="category"
                      :label="category"
                      :value="category"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 责任信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><UserFilled /></el-icon>
                <span class="section-title">责任信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="责任人" prop="responsiblePerson">
                  <el-select 
                    v-model="formData.responsiblePerson" 
                    placeholder="请选择责任人" 
                    style="width: 100%" 
                    filterable
                  >
                    <el-option
                      v-for="person in options.persons"
                      :key="person.Name"
                      :label="person.IsActive ? person.Name : `${person.Name} (离职)`"
                      :value="person.Name"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="责任部门">
                  <el-select 
                    v-model="formData.responsibleDept" 
                    placeholder="请选择责任部门" 
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="dept in options.departments"
                      :key="dept"
                      :label="dept"
                      :value="dept"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 返工信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Tools /></el-icon>
                <span class="section-title">返工信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="返工类别" prop="reworkCategory">
                  <el-select 
                    v-model="formData.reworkCategory" 
                    placeholder="请选择返工类别" 
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="category in options.reworkCategories"
                      :key="category.ID"
                      :label="category.Name"
                      :value="category.Name"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="返工人员" prop="reworkPersonnel">
                  <el-select 
                    v-model="formData.reworkPersonnel" 
                    placeholder="请选择返工人员" 
                    style="width: 100%"
                    filterable
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                  >
                    <el-option
                      v-for="person in options.persons"
                      :key="person.Name"
                      :label="person.IsActive ? `${person.Name} (${person.Department})` : `${person.Name} (${person.Department}) - 离职`"
                      :value="person.Name"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="返工工时">
                  <el-input-number
                    v-model="formData.reworkHours"
                    :min="0"
                    :precision="2"
                    placeholder="返工工时"
                    style="width: 100%"
                    @change="calculateLaborCost"
                    controls-position="right"
                  >
                    <template #suffix>小时</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="返工状态">
                  <el-select 
                    v-model="formData.reworkStatus" 
                    placeholder="请选择返工状态" 
                    style="width: 100%"
                  >
                    <el-option
                      v-for="status in options.reworkStatuses"
                      :key="status"
                      :label="status"
                      :value="status"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <!-- 预留空间 -->
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="返工方法">
                  <el-input 
                    v-model="formData.reworkMethod" 
                    placeholder="请输入返工方法"
                    type="textarea"
                    :rows="3"
                    show-word-limit
                    maxlength="300"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 成本信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Money /></el-icon>
                <span class="section-title">成本信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="6">
                <el-form-item label="工时单价">
                  <el-input-number
                    v-model="hourlyRate"
                    :min="0"
                    :precision="2"
                    placeholder="工时单价"
                    style="width: 100%"
                    @change="calculateLaborCost"
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                    <template #suffix>/小时</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="材料成本">
                  <el-input-number
                    v-model="formData.materialCost"
                    :min="0"
                    :precision="2"
                    placeholder="材料成本"
                    style="width: 100%"
                    @change="calculateTotalCost"
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="人工成本">
                  <el-input-number
                    v-model="formData.laborCost"
                    :min="0"
                    :precision="2"
                    placeholder="人工成本"
                    style="width: 100%"
                    readonly
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="其他成本">
                  <el-input-number
                    v-model="formData.otherCost"
                    :min="0"
                    :precision="2"
                    placeholder="其他成本"
                    style="width: 100%"
                    @change="calculateTotalCost"
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="24">
              <el-col :span="6">
                <el-form-item label="总成本">
                  <el-input-number
                    v-model="formData.totalCost"
                    :min="0"
                    :precision="2"
                    placeholder="总成本"
                    style="width: 100%"
                    readonly
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="18">
                <!-- 预留空间 -->
              </el-col>
            </el-row>
          </el-card>

          <!-- 质量信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Medal /></el-icon>
                <span class="section-title">质量信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="质量等级">
                  <el-select 
                    v-model="formData.qualityLevel" 
                    placeholder="请选择质量等级" 
                    style="width: 100%"
                  >
                    <el-option
                      v-for="level in qualityLevelDescriptions"
                      :key="level.grade"
                      :label="`${level.grade} - ${level.title}`"
                      :value="level.grade"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最终结果">
                  <el-select 
                    v-model="formData.finalResult" 
                    placeholder="请选择最终结果" 
                    style="width: 100%"
                  >
                    <el-option
                      v-for="result in options.finalResults"
                      :key="result"
                      :label="result"
                      :value="result"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 质量等级说明卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><InfoFilled /></el-icon>
                <span class="section-title">质量等级说明</span>
                <el-button 
                  type="primary" 
                  @click="showQualityLevelDialog = true"
                  style="margin-left: auto;"
                >
                  <el-icon><Setting /></el-icon>
                  管理等级设定
                </el-button>
              </div>
            </template>
            
            <div class="quality-level-description">
              <el-row :gutter="16">
                <el-col :span="6" v-for="level in qualityLevelDescriptions" :key="level.grade">
                  <div class="level-item">
                    <div class="level-grade" :class="`grade-${level.grade ? level.grade.toLowerCase() : ''}`">
                      {{ level.grade }}
                    </div>
                    <div class="level-title">{{ level.title }}</div>
                    <div class="level-desc">{{ level.description }}</div>
                    <div class="level-range">{{ level.range }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-card>

          <!-- 附加信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Files /></el-icon>
                <span class="section-title">附加信息</span>
              </div>
            </template>
            
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="备注">
                  <el-input
                    v-model="formData.remarks"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入备注信息"
                    show-word-limit
                    maxlength="500"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="附件上传">
                  <div class="file-upload-container">
                    <!-- 文件路径显示 -->
                    <div v-if="selectedFileInfo" class="file-info-section">
                      <el-form-item label="附件文件路径">
                        <el-input
                          :value="selectedFileInfo.relativePath"
                          readonly
                          placeholder="暂无文件"
                        >
                          <template #prepend>
                            <el-icon><Document /></el-icon>
                          </template>
                        </el-input>
                      </el-form-item>
                    </div>
                    
                    <!-- 上传组件 -->
                    <el-upload
                      ref="uploadRef"
                      :action="uploadUrl"
                      :file-list="fileList"
                      :on-change="handleFileChange"
                      :on-success="handleUploadSuccess"
                      :on-remove="handleUploadRemove"
                      :before-upload="beforeUpload"
                      :auto-upload="false"
                      :limit="1"
                      drag
                      class="upload-demo"
                    >
                      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                      <div class="el-upload__text">
                        将文件拖到此处，或<em>点击选择文件</em>
                      </div>
                      <template #tip>
                        <div class="el-upload__tip">
                          支持 jpg/png/pdf/doc/docx/xls/xlsx 格式，单个文件不超过 10MB
                        </div>
                      </template>
                    </el-upload>
                    
                    <!-- 上传进度 -->
                    <div v-if="fileUploading" class="upload-progress">
                      <el-progress :percentage="uploadProgress" :show-text="true" />
                      <p class="progress-text">正在上传文件...</p>
                    </div>
                    
                    <!-- 文件预览 -->
                    <div v-if="selectedFileInfo" class="file-preview">
                      <el-form-item label="文件预览">
                        <div class="preview-container">
                          <!-- 图片预览 -->
                          <div v-if="isImageFile(selectedFileInfo.fileName)" class="image-preview-content">
                            <img 
                              :src="selectedFileInfo.previewUrl" 
                              :alt="selectedFileInfo.fileName"
                              class="preview-image"
                              @click="openImagePreview"
                            />
                            <div class="preview-actions">
                              <el-button size="small" @click="openImagePreview">
                                <el-icon><ZoomIn /></el-icon>
                                查看大图
                              </el-button>
                            </div>
                          </div>
                          
                          <!-- PDF预览 -->
                          <div v-else-if="isPdfFile(selectedFileInfo.fileName)" class="pdf-preview-content">
                            <div class="file-icon pdf-icon">
                              <el-icon size="48"><Document /></el-icon>
                            </div>
                            <div class="preview-actions">
                              <el-button size="small" @click="openPdfPreview">
                                <el-icon><View /></el-icon>
                                预览PDF
                              </el-button>
                            </div>
                          </div>
                          
                          <!-- 文档预览 -->
                          <div v-else class="document-preview-content">
                            <div class="file-icon" :class="getFileIconClass(selectedFileInfo.fileName)">
                              <el-icon size="48"><Document /></el-icon>
                            </div>
                            <div class="file-type-label">{{ getFileTypeLabel(selectedFileInfo.fileName) }}</div>
                          </div>
                          
                          <p class="preview-filename">{{ selectedFileInfo.fileName }}</p>
                          <p class="file-size">{{ formatFileSize(selectedFileInfo.file?.size) }}</p>
                        </div>
                      </el-form-item>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" size="large">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading" size="large">
            <el-icon><Check /></el-icon>
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情查看对话框 -->
    <el-dialog
      title="返工记录详情"
      v-model="detailVisible"
      width="70%"
    >
      <div class="detail-content" v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="返工日期">
            {{ formatDate(currentRecord.ReworkDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="客户编号">
            {{ currentRecord.CustomerCode }}
          </el-descriptions-item>
          <el-descriptions-item label="工单号">
            {{ currentRecord.OrderNo }}
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">
            {{ currentRecord.ProductName }}
          </el-descriptions-item>
          <el-descriptions-item label="产品规格">
            {{ currentRecord.ProductSpec || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="车间">
            {{ currentRecord.Workshop || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="总数量">
            {{ currentRecord.TotalQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良数量">
            {{ currentRecord.DefectiveQty }}
          </el-descriptions-item>
          <el-descriptions-item label="良品数量">
            {{ currentRecord.GoodQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良率">
            <span :class="getDefectiveRateClass(currentRecord.DefectiveRate)">
              {{ currentRecord.DefectiveRate ? currentRecord.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="不良原因" :span="2">
            {{ currentRecord.DefectiveReason }}
          </el-descriptions-item>
          <el-descriptions-item label="不良类别">
            {{ currentRecord.DefectiveCategory || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="责任人">
            {{ currentRecord.ResponsiblePerson }}
          </el-descriptions-item>
          <el-descriptions-item label="责任部门">
            {{ currentRecord.ResponsibleDept || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="返工类别">
            {{ currentRecord.ReworkCategory || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="返工人员">
            {{ currentRecord.ReworkPersonnel }}
          </el-descriptions-item>
          <el-descriptions-item label="返工工时">
            {{ currentRecord.ReworkHours ? currentRecord.ReworkHours + 'h' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="返工方法">
            {{ currentRecord.ReworkMethod || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="材料成本">
            {{ currentRecord.MaterialCost ? '¥' + currentRecord.MaterialCost.toFixed(2) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="人工成本">
            {{ currentRecord.LaborCost ? '¥' + currentRecord.LaborCost.toFixed(2) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="其他成本">
            {{ currentRecord.OtherCost ? '¥' + currentRecord.OtherCost.toFixed(2) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="总成本">
            <span class="cost-amount">
              {{ currentRecord.TotalCost ? '¥' + currentRecord.TotalCost.toFixed(2) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="返工状态">
            <el-tag :type="getStatusType(currentRecord.ReworkStatus)">
              {{ currentRecord.ReworkStatus }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="质量等级">
            {{ currentRecord.QualityLevel || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="最终结果">
            {{ currentRecord.FinalResult || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ currentRecord.CreatedBy }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(currentRecord.CreatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新人">
            {{ currentRecord.UpdatedBy || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ currentRecord.UpdatedAt ? formatDateTime(currentRecord.UpdatedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentRecord.Remarks || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="附件文件" :span="2">
            <div v-if="currentRecord.AttachmentFiles">
              <div v-for="(fileName, index) in currentRecord.AttachmentFiles.split(';').filter(name => name.trim())" :key="index" class="attachment-item">
                <el-link 
                  :href="`/uploads/${fileName}`" 
                  target="_blank" 
                  type="primary"
                  :icon="Document"
                >
                  {{ fileName }}
                </el-link>
              </div>
            </div>
            <span v-else class="text-muted">无附件</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 质量等级管理对话框 -->
    <el-dialog
      v-model="showQualityLevelDialog"
      title="质量等级设定管理"
      width="900px"
      height="70vh"
      :close-on-click-modal="false"
    >
      <div class="quality-level-management">
        <div class="management-header">
          <el-button 
            type="primary" 
            @click="addQualityLevel"
            :icon="Plus"
          >
            新增等级
          </el-button>
          <el-button 
            type="warning" 
            @click="resetToDefault"
            :icon="RefreshLeft"
          >
            重置为默认
          </el-button>
        </div>
        
        <el-table :data="qualityLevelSettings" border style="margin-top: 1rem;">
          <el-table-column prop="grade" label="等级" width="100" align="center">
            <template #default="{ row, $index }">
              <el-input 
                v-model="row.grade" 
                size="small" 
                maxlength="10"
                placeholder="等级"
                style="text-align: center;"
              />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="等级名称" width="120">
            <template #default="{ row, $index }">
              <el-input 
                v-model="row.title" 
                size="small" 
                maxlength="50"
                placeholder="等级名称"
              />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述">
            <template #default="{ row, $index }">
              <el-input 
                v-model="row.description" 
                size="small" 
                maxlength="200"
                placeholder="等级描述"
              />
            </template>
          </el-table-column>
          <el-table-column prop="range" label="适用范围" width="150">
            <template #default="{ row, $index }">
              <el-input 
                v-model="row.range" 
                size="small" 
                maxlength="100"
                placeholder="适用范围"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row, $index }">
              <el-button 
                type="primary" 
                size="small" 
                @click="saveQualityLevel(row, $index)"
                :loading="row.saving"
                style="margin-right: 5px;"
              >
                保存
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteQualityLevel($index)"
                :disabled="qualityLevelSettings.length <= 1"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <div class="dialog-footer quality-level-footer">
          <el-button @click="cancelQualityLevelEdit" size="large">取消</el-button>
          <el-button type="primary" @click="saveAllQualityLevels" :loading="savingAllLevels" size="large">
            保存全部
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="imagePreviewVisible"
      title="图片预览"
      width="80%"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      append-to-body
      class="image-preview-dialog"
    >
      <div class="image-preview-wrapper">
        <img 
          :src="previewImageUrl" 
          :alt="selectedFileInfo?.fileName"
          class="preview-full-image"
        />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="imagePreviewVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ReworkManagement">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Refresh, Search, RefreshLeft, View, Edit, Delete,
  Tools, Upload, Document, Calendar, User, DocumentCopy, Box, SetUp,
  OfficeBuilding, DataAnalysis, Warning, UserFilled, Avatar, Money,
  Medal, Files, UploadFilled, Close, Check, InfoFilled, Setting,
  ZoomIn
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const currentRecord = ref(null)
const formRef = ref(null)
const uploadRef = ref(null)
const fileList = ref([])

// 文件上传相关状态
const selectedFileInfo = ref(null)
const fileUploading = ref(false)
const uploadProgress = ref(0)
const showQualityLevelDialog = ref(false)
const savingAllLevels = ref(false)

// 质量等级说明数据
const qualityLevelDescriptions = ref([
  {
    grade: 'A',
    title: '优秀',
    description: '产品质量完全符合标准，无任何缺陷',
    range: '合格率 ≥ 99%'
  },
  {
    grade: 'B',
    title: '良好',
    description: '产品质量基本符合标准，存在轻微缺陷',
    range: '合格率 95-99%'
  },
  {
    grade: 'C',
    title: '一般',
    description: '产品质量勉强符合标准，存在明显缺陷',
    range: '合格率 90-95%'
  },
  {
    grade: 'D',
    title: '不合格',
    description: '产品质量不符合标准，存在严重缺陷',
    range: '合格率 < 90%'
  }
])

// 质量等级设定数据
const qualityLevelSettings = ref([
  {
    id: 1,
    grade: 'A',
    title: '优秀',
    description: '产品质量完全符合标准，无任何缺陷',
    range: '合格率 ≥ 99%',
    saving: false
  },
  {
    id: 2,
    grade: 'B',
    title: '良好',
    description: '产品质量基本符合标准，存在轻微缺陷',
    range: '合格率 95-99%',
    saving: false
  },
  {
    id: 3,
    grade: 'C',
    title: '一般',
    description: '产品质量勉强符合标准，存在明显缺陷',
    range: '合格率 90-95%',
    saving: false
  },
  {
    id: 4,
    grade: 'D',
    title: '不合格',
    description: '产品质量不符合标准，存在严重缺陷',
    range: '合格率 < 90%',
    saving: false
  }
])

// 搜索表单
const searchForm = reactive({
  dateRange: [],
  customerCode: '',
  orderNo: '',
  responsiblePerson: '',
  reworkStatus: '',
  keyword: ''
})

// 分页数据
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 工时单价（默认35元/小时）
const hourlyRate = ref(35)

// 表单数据
const formData = reactive({
  reworkDate: '',
  customerCode: '',
  orderNo: '',
  productName: '',
  productSpec: '',
  workshop: '',
  totalQty: null,
  defectiveQty: null,
  goodQty: null,
  defectiveReason: '',
  defectiveCategory: '',
  responsiblePerson: '',
  responsibleDept: '',
  reworkCategory: '',
  reworkPersonnel: [],
  reworkHours: null,
  reworkMethod: '',
  reworkStatus: '进行中',
  materialCost: null,
  laborCost: null,
  otherCost: null,
  totalCost: null,
  qualityLevel: '',
  finalResult: '',
  remarks: '',
  attachmentPath: ''
})

// 下拉选项数据
const options = reactive({
  workshops: [],
  departments: [],
  persons: [],
  defectiveCategories: [],
  reworkCategories: [],
  reworkStatuses: [],
  qualityLevels: [],
  finalResults: []
})

// 表单验证规则
const formRules = {
  reworkDate: [{ required: true, message: '请选择返工日期', trigger: 'change' }],
  customerCode: [{ required: true, message: '请输入客户编号', trigger: 'blur' }],
  orderNo: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  workshop: [{ required: true, message: '请选择车间', trigger: 'change' }],
  totalQty: [{ required: true, message: '请输入总数量', trigger: 'blur' }],
  defectiveQty: [{ required: true, message: '请输入不良数量', trigger: 'blur' }],
  defectiveReason: [{ required: true, message: '请输入不良原因', trigger: 'blur' }],
  defectiveCategory: [{ required: true, message: '请选择不良类别', trigger: 'change' }],
  responsiblePerson: [{ required: true, message: '请选择责任人', trigger: 'change' }],
  reworkPersonnel: [{ required: true, message: '请选择返工人员', trigger: 'change' }]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑返工记录' : '新增返工记录'
})

const uploadUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}/api/upload/rework-attachment`
})

// 生命周期
onMounted(() => {
  loadData()
  loadOptions()
  initQualityLevels()
})

// 强制设置对话框样式
const forceDialogStyle = () => {
  nextTick(() => {
    const dialog = document.querySelector('.rework-dialog-global')
    if (dialog) {
      dialog.style.height = '80vh'
      dialog.style.maxHeight = '80vh'
      dialog.style.margin = 'auto'
      dialog.style.top = '50%'
      dialog.style.transform = 'translateY(-50%)'
      dialog.style.display = 'flex'
      dialog.style.flexDirection = 'column'
      
      const body = dialog.querySelector('.el-dialog__body')
      if (body) {
        body.style.flex = '1'
        body.style.overflowY = 'auto'
        body.style.padding = '1rem'
        body.style.margin = '0'
        body.style.paddingBottom = '0'
      }
      
      const footer = dialog.querySelector('.el-dialog__footer')
      if (footer) {
        footer.style.flexShrink = '0'
        footer.style.padding = '0.5rem 1.5rem'
        footer.style.margin = '0'
        footer.style.background = '#fff'
        footer.style.borderTop = '1px solid #ebeef5'
      }
      
      // 强制设置form-container样式
      const formContainer = dialog.querySelector('.form-container')
      if (formContainer) {
        formContainer.style.paddingBottom = '0'
        formContainer.style.marginBottom = '0'
        formContainer.style.setProperty('margin-bottom', '0', 'important')
      }
      
      // 强制设置最后一个form-section样式
      const lastFormSection = dialog.querySelector('.form-section:last-child')
      if (lastFormSection) {
        lastFormSection.style.marginBottom = '0'
      }
    }
  })
}

// 方法定义
const loadData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response = await axios.get('/api/rework/list', { params })
    
    if (response.data.success) {
      console.log('=== 前端调试 - 返工列表数据 ===', response.data.data)
      // 检查第一条记录的ReworkCategory字段
      if (response.data.data.length > 0) {
        console.log('=== 前端调试 - 第一条记录的ReworkCategory ===', response.data.data[0].ReworkCategory)
        console.log('=== 前端调试 - 第一条记录的完整数据 ===', response.data.data[0])
      }
      tableData.value = response.data.data
      pagination.total = response.data.pagination.total
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadOptions = async () => {
  try {
    // 加载基础选项数据
    const response = await axios.get('/api/rework/options')
    if (response.data.success) {
      Object.assign(options, response.data.data)
    } else {
      console.error('加载选项数据失败:', response.data.message)
      ElMessage.error(response.data.message || '加载选项数据失败')
    }
    
    // 加载返工类别数据
    const categoriesResponse = await axios.get('/api/rework/rework-categories')
    if (categoriesResponse.data.success) {
      options.reworkCategories = categoriesResponse.data.data
    } else {
      console.error('加载返工类别数据失败:', categoriesResponse.data.message)
    }
  } catch (error) {
    console.error('加载选项数据失败:', error)
    ElMessage.error('加载选项数据失败')
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    dateRange: [],
    customerCode: '',
    orderNo: '',
    responsiblePerson: '',
    reworkStatus: '',
    keyword: ''
  })
  handleSearch()
}

const refreshData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    
    // 重置分页到第一页
    pagination.current = 1
    
    // 创建不显示错误消息的加载函数
    const loadDataSilent = async () => {
      try {
        loading.value = true
        const params = {
          page: pagination.current,
          pageSize: pagination.pageSize,
          ...searchForm
        }
        
        if (searchForm.dateRange && searchForm.dateRange.length === 2) {
          params.startDate = searchForm.dateRange[0]
          params.endDate = searchForm.dateRange[1]
        }
        
        const response = await axios.get('/api/rework/list', { params })
        
        if (response.data.success) {
          tableData.value = response.data.data
          pagination.total = response.data.pagination.total
        } else {
          throw new Error(response.data.message || '获取数据失败')
        }
      } finally {
        loading.value = false
      }
    }
    
    const loadOptionsSilent = async () => {
      // 加载基础选项数据
      const response = await axios.get('/api/rework/options')
      if (response.data.success) {
        Object.assign(options, response.data.data)
      } else {
        throw new Error(response.data.message || '加载选项数据失败')
      }
      
      // 加载返工类别数据
      const categoriesResponse = await axios.get('/api/rework/rework-categories')
      if (categoriesResponse.data.success) {
        options.reworkCategories = categoriesResponse.data.data
      } else {
        console.error('加载返工类别数据失败:', categoriesResponse.data.message)
      }
    }
    
    // 并行加载数据和选项
    await Promise.all([
      loadDataSilent(),
      loadOptionsSilent()
    ])
    
    ElMessage.success('数据刷新完成')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  }
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  loadData()
}

const handleCurrentChange = (page) => {
  pagination.current = page
  loadData()
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 批量操作方法
const editSelectedRecord = () => {
  if (selectedRows.value.length === 1) {
    editRecord(selectedRows.value[0])
  }
}

const deleteSelectedRecords = async () => {
  if (selectedRows.value.length === 0) return
  
  const count = selectedRows.value.length
  const message = count === 1 
    ? `确定要删除选中的返工记录吗？` 
    : `确定要删除选中的 ${count} 条返工记录吗？`
  
  try {
    await ElMessageBox.confirm(message, '确认删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    // 执行批量删除
    const ids = selectedRows.value.map(row => row.ID)
    const response = await axios.delete('/api/rework/batch', {
      data: { ids }
    })
    
    if (response.data.success) {
      ElMessage.success(`成功删除 ${count} 条记录`)
      selectedRows.value = []
      loadData()
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

const showAddDialog = () => {
  isEdit.value = false
  resetForm()
  cleanupResources() // 确保清理文件状态
  dialogVisible.value = true
  forceDialogStyle()
}

const editRecord = async (row) => {
  try {
    isEdit.value = true
    currentRecord.value = row
    
    // 清理之前的文件状态
    cleanupResources()
    
    // 从后端获取完整的记录数据
    const response = await axios.get(`/api/rework/${row.ID}`)
    
    if (response.data.success) {
      const recordData = response.data.data
      console.log('编辑对话框 - 从后端获取的记录数据:', recordData)
      console.log('编辑对话框 - ReworkCategory字段值:', recordData.ReworkCategory)
      
      // 填充表单数据，使用数据库中的完整数据
      Object.keys(formData).forEach(key => {
        // 将数据库字段名映射到表单字段名
        const dbFieldName = key.charAt(0).toUpperCase() + key.slice(1)
        if (recordData[dbFieldName] !== undefined) {
          formData[key] = recordData[dbFieldName]
          console.log(`映射字段 ${key} <- ${dbFieldName}:`, recordData[dbFieldName])
        } else if (recordData[key] !== undefined) {
          formData[key] = recordData[key]
          console.log(`直接映射字段 ${key}:`, recordData[key])
        }
      })
      
      console.log('编辑对话框 - 填充后的表单数据:', formData)
      
      // 特殊处理日期字段，使用formatDate函数避免时区偏移
      if (recordData.ReworkDate) {
        formData.reworkDate = formatDate(recordData.ReworkDate)
      }
      
      // 特殊处理返工人员字段，将字符串转换为数组以支持多选
      if (recordData.ReworkPersonnel) {
        if (typeof recordData.ReworkPersonnel === 'string') {
          // 如果是字符串，按分号或逗号分割为数组
          formData.reworkPersonnel = recordData.ReworkPersonnel.split(/[;,]/).map(name => name.trim()).filter(name => name)
        } else if (Array.isArray(recordData.ReworkPersonnel)) {
          formData.reworkPersonnel = recordData.ReworkPersonnel
        } else {
          formData.reworkPersonnel = []
        }
      } else {
        formData.reworkPersonnel = []
      }
      
      // 如果有附件文件，显示文件信息（但不创建预览）
      if (recordData.AttachmentFiles) {
        // 处理多个文件，用分号分隔
        const fileNames = recordData.AttachmentFiles.split(';').filter(name => name.trim())
        if (fileNames.length > 0) {
          // 目前只显示第一个文件，后续可扩展支持多文件
          const fileName = fileNames[0]
          selectedFileInfo.value = {
            fileName: fileName,
            generatedFileName: fileName,
            previewUrl: null, // 编辑时不创建预览URL
            relativePath: `uploads/${fileName}`,
            file: null,
            uploaded: true // 标记为已上传
          }
          // 将附件路径设置到formData中
          formData.attachmentPath = recordData.AttachmentFiles
        }
      }
      
      dialogVisible.value = true
      forceDialogStyle()
    } else {
      ElMessage.error(response.data.message || '获取记录详情失败')
    }
  } catch (error) {
    console.error('获取记录详情失败:', error)
    ElMessage.error('获取记录详情失败')
  }
}

const viewDetail = (row) => {
  currentRecord.value = row
  detailVisible.value = true
}

const deleteRecord = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工单号为 "${row.OrderNo}" 的返工记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(`/api/rework/${row.ID}`)
    
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

const submitForm = async () => {
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    // 如果有文件需要上传且尚未上传
    if (selectedFileInfo.value && !selectedFileInfo.value.uploaded) {
      try {
        fileUploading.value = true
        await uploadFileToServer(selectedFileInfo.value.file, selectedFileInfo.value.generatedFileName)
        ElMessage.success('文件上传成功')
      } catch (error) {
        ElMessage.error('文件上传失败：' + error.message)
        return // 上传失败时阻止表单提交
      } finally {
        fileUploading.value = false
      }
    }
    
    const url = isEdit.value ? `/api/rework/${currentRecord.value.ID}` : '/api/rework'
    const method = isEdit.value ? 'put' : 'post'
    
    // 准备提交数据，将返工人员数组转换为字符串
    const submitData = {
      ...formData,
      // 将返工人员数组转换为分号分隔的字符串
      reworkPersonnel: Array.isArray(formData.reworkPersonnel) 
        ? formData.reworkPersonnel.join(';') 
        : formData.reworkPersonnel,
      createdBy: 'admin', // 实际应用中应该从用户信息获取
      updatedBy: 'admin'
    }
    
    const response = await axios[method](url, submitData)
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  Object.assign(formData, {
    reworkDate: '',
    customerCode: '',
    orderNo: '',
    productName: '',
    productSpec: '',
    workshop: '',
    totalQty: null,
    defectiveQty: null,
    goodQty: null,
    defectiveReason: '',
    defectiveCategory: '',
    responsiblePerson: '',
    responsibleDept: '',
    reworkCategory: '',
    reworkPersonnel: [],
    reworkHours: null,
    reworkMethod: '',
    reworkStatus: '进行中',
    materialCost: null,
    laborCost: null,
    otherCost: null,
    totalCost: null,
    qualityLevel: '',
    finalResult: '',
    remarks: '',
    attachmentPath: ''
  })
  
  // 清空文件相关状态
  cleanupResources()
  
  fileList.value = []
  currentRecord.value = null
}

const calculateDefectiveRate = () => {
  if (formData.totalQty && formData.defectiveQty !== null) {
    formData.goodQty = formData.totalQty - formData.defectiveQty
  }
}

/**
 * 计算人工成本
 * 根据返工工时和工时单价自动计算人工成本
 * 计算公式：人工成本 = 返工工时 × 工时单价
 */
const calculateLaborCost = () => {
  const hours = formData.reworkHours
  const rate = hourlyRate.value
  
  // 如果工时或单价为空，清空人工成本
  if (!hours || !rate || hours <= 0 || rate <= 0) {
    formData.laborCost = 0
    calculateTotalCost()
    return
  }
  
  // 计算人工成本：工时 × 单价
  const laborCost = Number(hours) * Number(rate)
  formData.laborCost = Math.round(laborCost * 100) / 100 // 保留两位小数
  
  // 触发总成本计算
  calculateTotalCost()
}

/**
 * 计算总成本
 * 根据材料成本、人工成本、其他成本自动计算总成本
 * 计算公式：总成本 = 材料成本 + 人工成本 + 其他成本
 */
const calculateTotalCost = () => {
  const materialCost = Number(formData.materialCost) || 0
  const laborCost = Number(formData.laborCost) || 0
  const otherCost = Number(formData.otherCost) || 0
  
  // 计算总成本
  const totalCost = materialCost + laborCost + otherCost
  formData.totalCost = Math.round(totalCost * 100) / 100 // 保留两位小数
}

const exportData = async () => {
  try {
    exportLoading.value = true
    
    // 获取当前筛选条件下的所有数据
    const params = {
      ...searchForm,
      exportAll: true // 标识导出所有数据
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response = await axios.get('/api/rework/export', { params })
    
    if (response.data.success) {
      const data = response.data.data
      
      // 使用ExcelJS库支持样式
      const ExcelJS = await import('exceljs')
      const { saveAs } = await import('file-saver')
      
      // 准备导出数据
      const exportData = data.map((item, index) => ({
        '序号': index + 1,
        'ID': item.ID,
        '返工日期': formatDate(item.ReworkDate),
        '客户编号': item.CustomerCode || '',
        '工单号': item.OrderNo || '',
        '产品名称': item.ProductName || '',
        '产品规格': item.ProductSpec || '',
        '车间': item.Workshop || '',
        '总数量': item.TotalQty || 0,
        '不良数': item.DefectiveQty || 0,
        '合格数': item.GoodQty || 0,
        '不良率(%)': item.DefectiveRate ? item.DefectiveRate.toFixed(2) : '0.00',
        '不良原因': item.DefectiveReason || '',
        '不良类别': item.DefectiveCategory || '',
        '责任人': item.ResponsiblePerson || '',
        '责任部门': item.ResponsibleDept || '',
        '返工类别': item.ReworkCategory || '',
        '返工人员': item.ReworkPersonnel || '',
        '返工工时(h)': item.ReworkHours || 0,
        '返工方法': item.ReworkMethod || '',
        '返工状态': item.ReworkStatus || '',
        '材料成本(¥)': item.MaterialCost ? item.MaterialCost.toFixed(2) : '0.00',
        '人工成本(¥)': item.LaborCost ? item.LaborCost.toFixed(2) : '0.00',
        '其他成本(¥)': item.OtherCost ? item.OtherCost.toFixed(2) : '0.00',
        '总成本(¥)': item.TotalCost ? item.TotalCost.toFixed(2) : '0.00',
        '质量等级': item.QualityLevel || '',
        '最终结果': item.FinalResult || '',
        '备注': item.Remarks || '',
        '创建时间': formatDateTime(item.CreatedAt),
        '更新时间': formatDateTime(item.UpdatedAt)
      }))
      
      // 创建工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('返工记录')
      
      // 定义列
      const columns = [
        { header: '序号', key: 'index', width: 8 },
        { header: 'ID', key: 'id', width: 10 },
        { header: '返工日期', key: 'reworkDate', width: 15 },
        { header: '客户编号', key: 'customerCode', width: 15 },
        { header: '工单号', key: 'orderNo', width: 18 },
        { header: '产品名称', key: 'productName', width: 30 },
        { header: '产品规格', key: 'productSpec', width: 18 },
        { header: '车间', key: 'workshop', width: 12 },
        { header: '总数量', key: 'totalQty', width: 12 },
        { header: '不良数', key: 'defectiveQty', width: 12 },
        { header: '合格数', key: 'goodQty', width: 12 },
        { header: '不良率(%)', key: 'defectiveRate', width: 15 },
        { header: '不良原因', key: 'defectiveReason', width: 25 },
        { header: '不良类别', key: 'defectiveCategory', width: 15 },
        { header: '责任人', key: 'responsiblePerson', width: 12 },
        { header: '责任部门', key: 'responsibleDept', width: 15 },
        { header: '返工类别', key: 'reworkCategory', width: 15 },
        { header: '返工人员', key: 'reworkPersonnel', width: 12 },
        { header: '返工工时(h)', key: 'reworkHours', width: 15 },
        { header: '返工方法', key: 'reworkMethod', width: 18 },
        { header: '返工状态', key: 'reworkStatus', width: 12 },
        { header: '材料成本(¥)', key: 'materialCost', width: 15 },
        { header: '人工成本(¥)', key: 'laborCost', width: 15 },
        { header: '其他成本(¥)', key: 'otherCost', width: 15 },
        { header: '总成本(¥)', key: 'totalCost', width: 15 },
        { header: '质量等级', key: 'qualityLevel', width: 12 },
        { header: '最终结果', key: 'finalResult', width: 15 },
        { header: '备注', key: 'remarks', width: 25 },
        { header: '创建时间', key: 'createdAt', width: 20 },
        { header: '更新时间', key: 'updatedAt', width: 20 }
      ]
      
      worksheet.columns = columns
      
      // 设置表头样式
       const headerRow = worksheet.getRow(1)
       headerRow.height = 25
       headerRow.eachCell((cell) => {
         cell.font = {
           name: 'Microsoft YaHei',
           size: 10,
           bold: true,
           color: { argb: 'FFFFFFFF' }
         }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E5BBA' }
        }
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF1F4788' } },
          left: { style: 'medium', color: { argb: 'FF1F4788' } },
          bottom: { style: 'medium', color: { argb: 'FF1F4788' } },
          right: { style: 'medium', color: { argb: 'FF1F4788' } }
        }
      })
      
      // 添加数据行
      data.forEach((item, index) => {
        const rowData = {
          index: index + 1,
          id: item.ID,
          reworkDate: formatDate(item.ReworkDate),
          customerCode: item.CustomerCode || '',
          orderNo: item.OrderNo || '',
          productName: item.ProductName || '',
          productSpec: item.ProductSpec || '',
          workshop: item.Workshop || '',
          totalQty: item.TotalQty || 0,
          defectiveQty: item.DefectiveQty || 0,
          goodQty: item.GoodQty || 0,
          defectiveRate: item.DefectiveRate ? item.DefectiveRate.toFixed(2) : '0.00',
          defectiveReason: item.DefectiveReason || '',
          defectiveCategory: item.DefectiveCategory || '',
          responsiblePerson: item.ResponsiblePerson || '',
          responsibleDept: item.ResponsibleDept || '',
          reworkCategory: item.ReworkCategory || '',
          reworkPersonnel: item.ReworkPersonnel || '',
          reworkHours: item.ReworkHours || 0,
          reworkMethod: item.ReworkMethod || '',
          reworkStatus: item.ReworkStatus || '',
          materialCost: item.MaterialCost ? item.MaterialCost.toFixed(2) : '0.00',
          laborCost: item.LaborCost ? item.LaborCost.toFixed(2) : '0.00',
          otherCost: item.OtherCost ? item.OtherCost.toFixed(2) : '0.00',
          totalCost: item.TotalCost ? item.TotalCost.toFixed(2) : '0.00',
          qualityLevel: item.QualityLevel || '',
          finalResult: item.FinalResult || '',
          remarks: item.Remarks || '',
          createdAt: formatDateTime(item.CreatedAt),
          updatedAt: formatDateTime(item.UpdatedAt)
        }
        
        const row = worksheet.addRow(rowData)
        row.height = 25
        
        // 设置数据行样式
        row.eachCell((cell, colNumber) => {
          const isEvenRow = (index + 2) % 2 === 0
          
          // 基础样式
          cell.font = {
            name: 'Microsoft YaHei',
            size: 10
          }
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          }
          
          // 交替行颜色
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF' }
          }
          
          // 特殊列样式
          // 不良率列 (第12列)
          if (colNumber === 12) {
            const rate = parseFloat(rowData.defectiveRate)
            if (rate >= 5) {
              cell.font.color = { argb: 'FFDC3545' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFFFF5F5' }
            } else if (rate >= 2) {
              cell.font.color = { argb: 'FFFD7E14' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFFFF8F0' }
            } else {
              cell.font.color = { argb: 'FF198754' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFF0F8F0' }
            }
          }
          
          // 成本列 (第22-25列)
          if ([22, 23, 24, 25].includes(colNumber)) {
            cell.alignment.horizontal = 'right'
            cell.font.color = { argb: 'FF0D6EFD' }
          }
          
          // 返工状态列 (第21列)
          if (colNumber === 21) {
            const status = rowData.reworkStatus
            if (status === '已完成') {
              cell.font.color = { argb: 'FF198754' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFD1E7DD' }
            } else if (status === '进行中') {
              cell.font.color = { argb: 'FF0DCAF0' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFCFF4FC' }
            } else if (status === '暂停') {
              cell.font.color = { argb: 'FFFFC107' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFFFF3CD' }
            } else if (status === '取消') {
              cell.font.color = { argb: 'FFDC3545' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFF8D7DA' }
            }
          }
          
          // 质量等级列 (第26列)
          if (colNumber === 26) {
            const level = rowData.qualityLevel
            if (level === 'A') {
              cell.font.color = { argb: 'FF198754' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFD1E7DD' }
            } else if (level === 'B') {
              cell.font.color = { argb: 'FFFFC107' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFFFF3CD' }
            } else if (level === 'C') {
              cell.font.color = { argb: 'FFDC3545' }
              cell.font.bold = true
              cell.fill.fgColor = { argb: 'FFF8D7DA' }
            }
          }
          
          // 日期列 (第3列、第29-30列)
          if ([3, 29, 30].includes(colNumber)) {
            cell.font.color = { argb: 'FF6C757D' }
          }
          
          // 序号列 (第1列)
          if (colNumber === 1) {
            cell.font.bold = true
            cell.font.color = { argb: 'FF495057' }
            cell.fill.fgColor = { argb: 'FFE9ECEF' }
          }
        })
      })
      
      // 生成文件名
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
      const fileName = `返工记录导出_${dateStr}_${timeStr}.xlsx`
      
      // 导出文件
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, fileName)
      
      ElMessage.success(`成功导出 ${data.length} 条记录`)
    } else {
      ElMessage.error(response.data.message || '导出失败')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  } finally {
    exportLoading.value = false
  }
}

// 文件上传相关方法
// 生成文件名
const generateFileName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  
  return `rework_${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`
}

// 生成相对路径
const generateRelativePath = (generatedFileName, originalExtension) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  return `rework-images/${year}/${month}/${generatedFileName}${originalExtension}`
}

// 文件选择处理
const handleFileChange = (file) => {
  if (!file) return
  
  const originalExtension = '.' + file.name.split('.').pop().toLowerCase()
  const generatedFileName = generateFileName()
  const relativePath = generateRelativePath(generatedFileName, originalExtension)
  
  // 创建预览URL
  const previewUrl = URL.createObjectURL(file.raw)
  
  selectedFileInfo.value = {
    fileName: file.name,
    generatedFileName: generatedFileName + originalExtension,
    previewUrl: previewUrl,
    relativePath: relativePath,
    file: file.raw,
    uploaded: false
  }
  
  // 更新表单数据中的附件路径
  formData.attachmentPath = relativePath
  
  return false // 阻止自动上传
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf', 
                      'application/msword', 'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isValidType) {
    ElMessage.error('只能上传jpg/png/pdf/doc/docx/xls/xlsx格式的文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }
  
  return false // 阻止自动上传，但允许文件选择
}

// 上传文件到服务器
const uploadFileToServer = async (file, generatedFileName) => {
  const formData = new FormData()
  formData.append('file', file, generatedFileName)
  formData.append('customPath', 'rework-images')
  
  try {
    const response = await axios.post(uploadUrl.value, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })
    
    if (response.data.success) {
      selectedFileInfo.value.uploaded = true
      selectedFileInfo.value.relativePath = response.data.relativePath
      formData.attachmentPath = response.data.relativePath
      return response.data
    } else {
      throw new Error(response.data.message || '上传失败')
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    throw error
  }
}

const handleUploadSuccess = (response, file) => {
  ElMessage.success('文件上传成功')
}

const handleUploadRemove = (file) => {
  // 清理文件信息
  if (selectedFileInfo.value) {
    if (selectedFileInfo.value.previewUrl) {
      URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
    }
    selectedFileInfo.value = null
  }
  
  // 清空表单中的附件路径
  formData.attachmentPath = ''
  
  // 重置上传状态
  fileUploading.value = false
  uploadProgress.value = 0
}

// 清理资源
const cleanupResources = () => {
  if (selectedFileInfo.value && selectedFileInfo.value.previewUrl) {
    URL.revokeObjectURL(selectedFileInfo.value.previewUrl)
  }
  selectedFileInfo.value = null
  fileUploading.value = false
  uploadProgress.value = 0
}

// 文件类型判断方法
const isImageFile = (fileName) => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName)
}

const isPdfFile = (fileName) => {
  return /\.pdf$/i.test(fileName)
}

const isDocFile = (fileName) => {
  return /\.(doc|docx)$/i.test(fileName)
}

const isExcelFile = (fileName) => {
  return /\.(xls|xlsx)$/i.test(fileName)
}

// 获取文件图标类名
const getFileIconClass = (fileName) => {
  if (isDocFile(fileName)) return 'doc-icon'
  if (isExcelFile(fileName)) return 'excel-icon'
  if (isPdfFile(fileName)) return 'pdf-icon'
  return 'default-icon'
}

// 获取文件类型标签
const getFileTypeLabel = (fileName) => {
  if (isDocFile(fileName)) return 'Word文档'
  if (isExcelFile(fileName)) return 'Excel表格'
  if (isPdfFile(fileName)) return 'PDF文档'
  return '文档文件'
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// 图片预览对话框
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const openImagePreview = () => {
  if (selectedFileInfo.value && selectedFileInfo.value.previewUrl) {
    previewImageUrl.value = selectedFileInfo.value.previewUrl
    imagePreviewVisible.value = true
  }
}

// PDF预览
const openPdfPreview = () => {
  if (selectedFileInfo.value && selectedFileInfo.value.previewUrl) {
    // 在新窗口中打开PDF
    window.open(selectedFileInfo.value.previewUrl, '_blank')
  }
}

// 工具方法
const formatDate = (date) => {
  if (!date) return '-'
  
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return date
    
    // 使用本地时区的年月日，避免UTC转换，格式化为yyyy-mm-dd
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return date
  }
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleString('zh-CN')
}

const getStatusType = (status) => {
  const statusMap = {
    '进行中': 'warning',
    '已完成': 'success',
    '已取消': 'danger'
  }
  return statusMap[status] || 'info'
}

const getDefectiveRateClass = (rate) => {
  if (!rate) return ''
  if (rate < 1) return 'rate-low'
  if (rate < 5) return 'rate-medium'
  return 'rate-high'
}

// 质量等级管理方法
// 备份原始数据用于取消操作
const originalQualityLevelSettings = ref([])

const loadQualityLevelSettings = async () => {
  try {
    const response = await axios.get('/api/rework/quality-levels')
    if (response.data.success) {
      qualityLevelSettings.value = response.data.data.map(item => ({
        ...item,
        saving: false
      }))
      // 备份原始数据
      originalQualityLevelSettings.value = JSON.parse(JSON.stringify(qualityLevelSettings.value))
      // 同时更新说明数据
      qualityLevelDescriptions.value = response.data.data
    }
  } catch (error) {
    console.error('加载质量等级设定失败:', error)
    ElMessage.error('加载质量等级设定失败')
  }
}

const saveQualityLevel = async (row, index) => {
  try {
    row.saving = true
    const response = await axios.put(`/api/rework/quality-levels/${row.id}`, {
      title: row.title,
      description: row.description,
      range: row.range
    })
    
    if (response.data.success) {
      ElMessage.success('保存成功')
      // 更新说明数据
      const descIndex = qualityLevelDescriptions.value.findIndex(item => item.grade === row.grade)
      if (descIndex !== -1) {
        qualityLevelDescriptions.value[descIndex] = {
          grade: row.grade,
          title: row.title,
          description: row.description,
          range: row.range
        }
      }
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存质量等级失败:', error)
    ElMessage.error('保存失败')
  } finally {
    row.saving = false
  }
}

const saveAllQualityLevels = async () => {
  try {
    // 验证数据
    const validLevels = qualityLevelSettings.value.filter(item => 
      item.grade && item.grade.trim() && item.title && item.title.trim()
    )
    
    if (validLevels.length === 0) {
      ElMessage.warning('请至少保留一个有效的质量等级（等级和名称不能为空）')
      return
    }
    
    // 检查等级是否重复
    const grades = validLevels.map(item => item.grade.trim().toUpperCase())
    const uniqueGrades = [...new Set(grades)]
    if (grades.length !== uniqueGrades.length) {
      ElMessage.warning('质量等级不能重复')
      return
    }
    
    savingAllLevels.value = true
    const response = await axios.put('/api/rework/quality-levels/batch', {
      levels: validLevels.map(item => ({
        id: item.id,
        grade: item.grade.trim(),
        title: item.title.trim(),
        description: item.description || '',
        range: item.range || ''
      }))
    })
    
    if (response.data.success) {
      ElMessage.success('全部保存成功')
      // 重新加载数据以获取最新的ID
      await loadQualityLevelSettings()
      showQualityLevelDialog.value = false
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('批量保存质量等级失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingAllLevels.value = false
  }
}

// 新增质量等级
const addQualityLevel = () => {
  const newId = Math.max(...qualityLevelSettings.value.map(item => item.id || 0)) + 1
  const newLevel = {
    id: newId,
    grade: '',
    title: '',
    description: '',
    range: '',
    saving: false
  }
  qualityLevelSettings.value.push(newLevel)
}

// 删除质量等级
const deleteQualityLevel = async (index) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个质量等级吗？此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    qualityLevelSettings.value.splice(index, 1)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

// 重置为默认质量等级
const resetToDefault = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为默认质量等级规则吗？当前的修改将会丢失。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    qualityLevelSettings.value = [
      {
        id: 1,
        grade: 'A',
        title: '优秀',
        description: '产品质量完全符合标准，无任何缺陷',
        range: '合格率 ≥ 99%',
        saving: false
      },
      {
        id: 2,
        grade: 'B',
        title: '良好',
        description: '产品质量基本符合标准，存在轻微缺陷',
        range: '合格率 95-99%',
        saving: false
      },
      {
        id: 3,
        grade: 'C',
        title: '一般',
        description: '产品质量勉强符合标准，存在明显缺陷',
        range: '合格率 90-95%',
        saving: false
      },
      {
        id: 4,
        grade: 'D',
        title: '不合格',
        description: '产品质量不符合标准，存在严重缺陷',
        range: '合格率 < 90%',
        saving: false
      }
    ]
    
    ElMessage.success('已重置为默认规则')
  } catch {
    // 用户取消重置
  }
}

// 取消编辑
const cancelQualityLevelEdit = () => {
  // 恢复到原始数据
  qualityLevelSettings.value = JSON.parse(JSON.stringify(originalQualityLevelSettings.value))
  showQualityLevelDialog.value = false
}

// 在组件挂载时加载质量等级设定
const initQualityLevels = () => {
  loadQualityLevelSettings()
}
</script>

<style scoped>
.rework-management {
  padding: 0.5rem 1.25rem;
  height: auto;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

@media (max-width: 48rem) {
  .rework-management {
    padding: 0.75rem;
    height: auto;
    overflow-y: auto;
    box-sizing: border-box;
  }
  
  .page-description {
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .header-left h2 {
    font-size: 1.125rem;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0;
}

.header-left h2 {
  color: #303133;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-description {
  color: #909399;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-actions .el-button {
  border-radius: 0.375rem;
  font-weight: 500;
}

@media (max-width: 48rem) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
}

.search-card :deep(.el-card__body) {
  padding: 1.25rem;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.2rem;
  align-items: end;
  padding: 0.5rem;
}

/* 日期范围控件特殊处理 */
.search-form :deep(.el-form-item:first-child) {
  grid-column: span 2;
  min-width: 20rem;
}

/* 在较小屏幕上调整布局 */
@media (max-width: 90rem) {
  .search-form :deep(.el-form-item:first-child) {
    grid-column: span 1;
    min-width: 9rem;
  }
}

/* 确保关键词和按钮在同一行 */
.search-form :deep(.el-form-item:nth-last-child(2)) {
  grid-column: span 1;
}

.search-form :deep(.el-form-item:last-child) {
  grid-column: span 1;
  justify-self: start;
}

.search-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

.search-form :deep(.el-input__wrapper) {
  border-radius: 0.375rem;
  transition: all 0.3s ease;
}

.search-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff;
}

.search-form :deep(.el-select .el-input__wrapper) {
  border-radius: 0.375rem;
}

.search-form :deep(.el-date-editor) {
  border-radius: 0.375rem;
}

/* 日期选择器弹出层样式 */
:deep(.date-picker-popper) {
  z-index: 9999 !important;
}

:deep(.date-picker-popper .el-picker-panel) {
  min-width: 36rem !important;
}

:deep(.date-picker-popper .el-date-range-picker) {
  width: auto !important;
  min-width: 36rem !important;
}

@media (max-width: 75rem) {
  .search-form {
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  }
}

@media (max-width: 48rem) {
  .search-form {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 0.25rem;
  }
  
  .search-form .el-input,
  .search-form .el-select {
    width: 100% !important;
  }
  
  .search-form .el-date-editor {
    width: 100% !important;
  }
}

.table-card {
  overflow: hidden;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-card :deep(.el-card__body) {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 48rem) {
  .table-card {
  }
  
  :deep(.el-table) {
    font-size: 0.75rem;
  }
  
  :deep(.el-table .el-table__cell) {
    padding: 0.375rem 0.25rem;
  }
  
  /* 移动端产品名称列优化 */
  .product-name-cell {
    font-size: 0.75rem;
    line-height: 1.4;
    max-height: 3.5em;
    -webkit-line-clamp: 2;
  }
  
  /* 移动端操作按钮优化 */
  :deep(.el-table .el-button--small) {
    padding: 4px 8px;
    font-size: 11px;
    margin: 0 1px;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 1rem 0;
  border-top: 1px solid #f0f0f0;
}

.rework-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.dialog-footer {
  text-align: right;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.cost-amount {
  font-weight: bold;
  color: #E6A23C;
}

.rate-low {
  color: #67C23A;
  font-weight: bold;
}

.rate-medium {
  color: #E6A23C;
  font-weight: bold;
}

.rate-high {
  color: #F56C6C;
  font-weight: bold;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-upload__tip) {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

/* 产品名称单元格样式 */
.product-name-cell {
  word-break: break-word;
  line-height: 1.3;
  max-height: 3.9em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: normal;
  padding: 2px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace, 'Microsoft YaHei', sans-serif;
  font-size: 14px;
}

/* 表格行高优化 */
:deep(.el-table .el-table__row) {
  height: auto;
  min-height: 48px;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 6px;
  vertical-align: middle;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace, 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.3;
}

/* 产品名称列特殊处理 */
:deep(.el-table .el-table__cell:has(.product-name-cell)) {
  vertical-align: middle;
  line-height: 1.5;
}

/* 表格斑马纹优化 */
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #fafbfc;
}

/* 表格选中行样式 */
:deep(.el-table__body tr.current-row > td.el-table__cell) {
  background-color: #ecf5ff;
}

/* 表格内容对齐优化 */
:deep(.el-table .el-table__cell .cell) {
  padding: 0 8px;
  word-break: break-word;
}

/* 数值列右对齐 */
:deep(.el-table .el-table__cell[class*="is-right"]) {
  text-align: right;
}

/* 状态标签样式优化 */
:deep(.el-tag) {
  border-radius: 12px;
  font-size: 12px;
  padding: 2px 8px;
}

/* 表格头部样式优化 */
:deep(.el-table .el-table__header-wrapper .el-table__header .el-table__cell) {
  background-color: #f8f9fa;
  color: #606266;
  font-weight: 600;
  border-bottom: 2px solid #e4e7ed;
  text-align: center;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace, 'Microsoft YaHei', sans-serif;
}

/* 表格边框优化 */
:deep(.el-table--border .el-table__cell) {
  border-right: 1px solid #ebeef5;
}

:deep(.el-table--border .el-table__row:hover .el-table__cell) {
  background-color: #f5f7fa;
}

/* 表格整体样式优化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace, 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  height: 100%;
}

/* 表格容器高度优化 */
:deep(.el-table .el-table__body-wrapper) {
  max-height: calc(100vh - 320px);
  overflow-y: auto;
}

:deep(.el-table .el-table__body-wrapper) {
  border-radius: 0 0 8px 8px;
}

/* 操作按钮样式优化 */
:deep(.el-table .el-button--small) {
  padding: 6px 6px;
  font-size: 12px;
  border-radius: 4px;
  margin: 0 2px;
}

/* 表单卡片样式 */
.form-container {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 0.5rem;
  padding-bottom: 0;
  margin-bottom: 0 !important;
}

.form-section {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e4e7ed;
}

/* 最后一个表单卡片不要底部间距 */
.form-section:last-child {
  margin-bottom: 0;
}

.form-section :deep(.el-card__header) {
   background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
   border-bottom: 1px solid #e4e7ed;
   border-left: 4px solid #409eff;
   padding: 0.75rem 1rem;
 }

.form-section :deep(.el-card__body) {
  padding: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #303133;
}

.section-icon {
  font-size: 1.125rem;
  color: #409eff;
}

.section-title {
  font-size: 0.875rem;
  letter-spacing: 0.025em;
}

/* 对话框样式 */
.rework-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  padding: 1.25rem 1.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.rework-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
  font-size: 1.125rem;
}

.rework-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 1.25rem;
}

.rework-dialog :deep(.el-dialog__body) {
  padding: 1.5rem 1.5rem 0 1.5rem;
  background: #fafafa;
}

.rework-dialog :deep(.el-dialog__footer) {
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
}

/* 强制设置对话框高度 - 修复定位和底部空白问题 */
.rework-dialog::v-deep(.el-dialog) {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}

.rework-dialog::v-deep(.el-dialog__wrapper) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}

.rework-dialog::v-deep(.el-dialog__body) {
  flex: 1 !important;
  max-height: calc(80vh - 100px) !important;
  overflow-y: auto !important;
  padding: 1rem 1rem 0 1rem !important;
  background: #fafafa !important;
  margin-bottom: 0 !important;
}

.rework-dialog::v-deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  margin-top: auto !important;
  padding: 0.125rem 1.5rem !important;
  min-height: auto !important;
  background: #fff !important;
}

/* 表单项样式增强 */
.rework-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  line-height: 1.5;
}

.rework-form :deep(.el-input__wrapper) {
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rework-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff, 0 2px 6px rgba(64, 158, 255, 0.2);
}

.rework-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.rework-form :deep(.el-select .el-input__wrapper) {
  border-radius: 0.375rem;
}

.rework-form :deep(.el-textarea__inner) {
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rework-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #409eff, 0 2px 6px rgba(64, 158, 255, 0.2);
}

.rework-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

/* 上传组件样式 */
.upload-demo :deep(.el-upload-dragger) {
  border-radius: 0.5rem;
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  transition: all 0.3s ease;
}

.upload-demo :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f0f8ff;
}

.upload-demo :deep(.el-icon--upload) {
  font-size: 2rem;
  color: #c0c4cc;
  margin-bottom: 1rem;
}

/* 按钮样式增强 */
 .dialog-footer {
   display: flex;
   justify-content: center;
   gap: 1rem;
 }
 
 .dialog-footer .el-button {
   padding: 0.75rem 2rem;
   border-radius: 0.375rem;
   font-weight: 500;
   transition: all 0.3s ease;
   min-width: 120px;
 }
 
 .dialog-footer .el-button--primary {
   background-color: #409eff;
   border-color: #409eff;
   box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
 }
 
 .dialog-footer .el-button--primary:hover {
   background-color: #66b1ff;
   border-color: #66b1ff;
   transform: translateY(-1px);
   box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
 }

/* 文件上传样式 */
.file-upload-container {
  width: 100%;
}

.file-info-section {
  margin-bottom: 1rem;
}

.upload-progress {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.progress-text {
  margin: 0.5rem 0 0 0;
  color: #666;
  font-size: 0.875rem;
  text-align: center;
}

.file-preview {
  margin-top: 1rem;
}

.preview-container {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

/* 图片预览样式 */
.image-preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 0.375rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.preview-image:hover {
  transform: scale(1.05);
}

/* PDF和文档预览样式 */
.pdf-preview-content,
.document-preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 0.5rem;
}

.file-icon.pdf-icon {
  background: #ff4757;
  color: white;
}

.file-icon.doc-icon {
  background: #2e86de;
  color: white;
}

.file-icon.excel-icon {
  background: #10ac84;
  color: white;
}

.file-icon.default-icon {
  background: #747d8c;
  color: white;
}

.file-type-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-filename {
  margin: 0.5rem 0 0 0;
  color: #333;
  font-size: 0.875rem;
  font-weight: 500;
  word-break: break-all;
}

.file-size {
  margin: 0.25rem 0 0 0;
  color: #999;
  font-size: 0.75rem;
}

/* 图片预览对话框样式 */
.image-preview-dialog .el-dialog__body {
  padding: 1rem;
  text-align: center;
}

.image-preview-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.preview-full-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 质量等级说明样式 */
.quality-level-description {
  padding: 1rem 0;
}

.level-item {
  text-align: center;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
  height: 100%;
}

.level-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.level-grade {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  margin: 0 auto 0.75rem;
}

.grade-a {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.grade-b {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.grade-c {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.grade-d {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.level-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin-bottom: 0.5rem;
}

.level-desc {
  font-size: 0.875rem;
  color: #606266;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.level-range {
  font-size: 0.75rem;
  color: #909399;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
}

/* 质量等级管理对话框样式 */
.quality-level-management {
  margin-bottom: 1rem;
}

.quality-level-footer {
  padding: 1.5rem 0;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.quality-level-footer .el-button {
  min-width: 100px;
  padding: 12px 24px;
}

.management-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
  margin-bottom: 1rem;
}

.management-header .el-button {
  font-weight: 500;
  transition: all 0.3s ease;
}

.management-header .el-button:hover {
  transform: translateY(-1px);
}

.quality-level-management .el-table {
  border-radius: 0.5rem;
  overflow: hidden;
}

.quality-level-management .el-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.quality-level-management .el-input {
  --el-input-border-radius: 0.375rem;
}

.quality-level-management .el-input__wrapper {
  transition: all 0.2s ease;
}

.quality-level-management .el-input__wrapper:hover {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.quality-level-management .level-grade {
  width: 2rem;
  height: 2rem;
  font-size: 0.875rem;
  margin: 0;
}

/* 批量操作按钮区域样式 */
.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 1rem;
}

.actions-left {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selection-info {
  color: #606266;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 操作列图标按钮样式 */
.action-btn {
  margin-right: 0.125rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  color: #606266;
}

.action-btn:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.action-btn.view-btn {
  color: #409eff;
}

.action-btn.view-btn:hover {
  background-color: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.action-btn.edit-btn {
  color: #e6a23c;
}

.action-btn.edit-btn:hover {
  background-color: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.action-btn.delete-btn {
  color: #f56c6c;
}

.action-btn.delete-btn:hover {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.action-btn:last-child {
  margin-right: 0;
}

/* 响应式设计 */
@media (max-width: 48rem) {
  .table-actions {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .actions-left {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .actions-right {
    justify-content: center;
  }
  .form-container {
    max-height: 60vh;
    padding-right: 0;
  }
  
  .form-section :deep(.el-card__body) {
    padding: 1rem;
  }
  
  .rework-dialog :deep(.el-dialog__body) {
    padding: 1rem;
  }
  
  .section-header {
    font-size: 0.875rem;
  }
  
  .dialog-footer .el-button {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }
}
/* 强制样式优先级 */
.el-dialog__wrapper .el-dialog.rework-dialog-global {
  margin: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  max-height: 80vh !important;
}

.el-dialog__wrapper .el-dialog.rework-dialog-global .el-dialog__body {
  flex: 1 !important;
  max-height: calc(80vh - 100px) !important;
  overflow-y: auto !important;
  margin-bottom: 0 !important;
  padding: 1rem !important;
  background: #fafafa !important;
}

.el-dialog__wrapper .el-dialog.rework-dialog-global .el-dialog__footer {
  flex-shrink: 0 !important;
  margin-top: auto !important;
  padding: 0.125rem 1.5rem !important;
  min-height: auto !important;
  background: #fff !important;
  border-top: 1px solid #ebeef5 !important;
}

/* 覆盖Element Plus默认样式 */
.el-overlay .el-dialog.rework-dialog-global .el-dialog__body {
  max-height: calc(80vh - 100px) !important;
  padding: 1rem !important;
}

.el-overlay .el-dialog.rework-dialog-global .el-dialog__footer {
  padding: 0.125rem 1.5rem !important;
}

/* 强制对话框高度类 */
.el-dialog.force-dialog-height {
  height: 85vh !important;
  max-height: 85vh !important;
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  display: flex !important;
  flex-direction: column !important;
}

.el-dialog.force-dialog-height .el-dialog__header {
  flex-shrink: 0 !important;
}

.el-dialog.force-dialog-height .el-dialog__body {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 1rem 1rem 0 1rem !important;
  margin: 0 !important;
}

.el-dialog.force-dialog-height .el-dialog__footer {
  flex-shrink: 0 !important;
  padding: 0.5rem 1.5rem !important;
  margin: 0 !important;
  background: #fff !important;
  border-top: 1px solid #ebeef5 !important;
}

/* 附件显示样式 */
.attachment-item {
  margin-bottom: 0.5rem;
}

.attachment-item:last-child {
  margin-bottom: 0;
}

.text-muted {
  color: #909399;
  font-style: italic;
}
</style>

<!-- 全局样式作为备用方案 -->
<style>
/* 全局强制对话框高度样式 - 修复定位和底部空白 */
.el-dialog.rework-dialog-global {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}

.rework-dialog-global .el-dialog__wrapper {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}

.el-dialog.rework-dialog-global .el-dialog__body {
  flex: 1 !important;
  max-height: calc(80vh - 100px) !important;
  overflow-y: auto !important;
  margin-bottom: 0 !important;
  padding: 1rem 1rem 0 1rem !important;
}

.el-dialog.rework-dialog-global .el-dialog__footer {
  flex-shrink: 0 !important;
  margin-top: auto !important;
  padding: 0.125rem 1.5rem !important;
  min-height: auto !important;
  background: #fff !important;
}

/* 全局强制对话框高度样式 */
.el-dialog.force-dialog-height {
  height: 80vh !important;
  max-height: 80vh !important;
  margin: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  display: flex !important;
  flex-direction: column !important;
}

.el-dialog.force-dialog-height .el-dialog__header {
  flex-shrink: 0 !important;
}

.el-dialog.force-dialog-height .el-dialog__body {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 1rem 1rem 0 1rem !important;
  margin: 0 !important;
}

.el-dialog.force-dialog-height .el-dialog__footer {
  flex-shrink: 0 !important;
  padding: 0.5rem 1.5rem !important;
  margin: 0 !important;
  background: #fff !important;
  border-top: 1px solid #ebeef5 !important;
}
</style>