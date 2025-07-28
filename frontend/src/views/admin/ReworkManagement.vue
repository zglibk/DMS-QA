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
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog" :icon="Plus">
          新增返工记录
        </el-button>
        <el-button @click="exportData" :icon="Download" :loading="exportLoading">
          导出数据
        </el-button>
        <el-button @click="refreshData" :icon="Refresh">
          刷新
        </el-button>
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
            style="width: 18rem; min-width: 18rem"
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
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        height="600"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="ID" label="ID" width="80" sortable />
        <el-table-column prop="ReworkDate" label="返工日期" width="120" sortable>
          <template #default="{ row }">
            {{ formatDate(row.ReworkDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="CustomerCode" label="客户编号" width="120" />
        <el-table-column prop="OrderNo" label="工单号" width="140" />
        <el-table-column prop="ProductName" label="产品名称" width="150" show-overflow-tooltip />
        <el-table-column prop="TotalQty" label="总数量" width="100" align="right" />
        <el-table-column prop="DefectiveQty" label="不良数" width="100" align="right" />
        <el-table-column prop="DefectiveRate" label="不良率" width="100" align="right">
          <template #default="{ row }">
            <span :class="getDefectiveRateClass(row.DefectiveRate)">
              {{ row.DefectiveRate ? row.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="DefectiveReason" label="不良原因" width="130" show-overflow-tooltip />
        <el-table-column prop="ResponsiblePerson" label="责任人" width="90" />
        <el-table-column prop="ReworkPersonnel" label="返工人员" width="100" />
        <el-table-column prop="ReworkHours" label="返工工时" width="100" align="right">
          <template #default="{ row }">
            {{ row.ReworkHours ? row.ReworkHours + 'h' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="TotalCost" label="总成本" width="120" align="right">
          <template #default="{ row }">
            <span class="cost-amount">
              {{ row.TotalCost ? '¥' + row.TotalCost.toFixed(2) : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="ReworkStatus" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.ReworkStatus)">
              {{ row.ReworkStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewDetail(row)"
              :icon="View"
            >
              查看
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="editRecord(row)"
              :icon="Edit"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteRecord(row)"
              :icon="Delete"
            >
              删除
            </el-button>
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
      height="90vh"
      :close-on-click-modal="false"
      :append-to-body="true"
      :lock-scroll="false"
      @close="resetForm"
      class="rework-dialog rework-dialog-global"
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
                      :label="person.Name"
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
                <el-form-item label="返工人员" prop="reworkPersonnel">
                  <el-input 
                    v-model="formData.reworkPersonnel" 
                    placeholder="请输入返工人员"
                    :prefix-icon="Avatar"
                  />
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
                    controls-position="right"
                  >
                    <template #suffix>小时</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
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
              <el-col :span="8">
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
              <el-col :span="8">
                <el-form-item label="人工成本">
                  <el-input-number
                    v-model="formData.laborCost"
                    :min="0"
                    :precision="2"
                    placeholder="人工成本"
                    style="width: 100%"
                    @change="calculateTotalCost"
                    controls-position="right"
                  >
                    <template #prefix>¥</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="8">
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
                  <el-upload
                    ref="uploadRef"
                    :action="uploadUrl"
                    :file-list="fileList"
                    :on-success="handleUploadSuccess"
                    :on-remove="handleUploadRemove"
                    :before-upload="beforeUpload"
                    multiple
                    :limit="5"
                    drag
                    class="upload-demo"
                  >
                    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                    <div class="el-upload__text">
                      将文件拖到此处，或<em>点击上传</em>
                    </div>
                    <template #tip>
                      <div class="el-upload__tip">
                        支持 jpg/png/pdf/doc/xls 格式，单个文件不超过 10MB，最多 5 个文件
                      </div>
                    </template>
                  </el-upload>
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
  </div>
</template>

<script setup name="ReworkManagement">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Refresh, Search, RefreshLeft, View, Edit, Delete,
  Tools, Upload, Document, Calendar, User, DocumentCopy, Box, SetUp,
  OfficeBuilding, DataAnalysis, Warning, UserFilled, Avatar, Money,
  Medal, Files, UploadFilled, Close, Check, InfoFilled, Setting
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
  reworkPersonnel: '',
  reworkHours: null,
  reworkMethod: '',
  reworkStatus: '进行中',
  materialCost: null,
  laborCost: null,
  otherCost: null,
  qualityLevel: '',
  finalResult: '',
  remarks: ''
})

// 下拉选项数据
const options = reactive({
  workshops: [],
  departments: [],
  persons: [],
  defectiveCategories: [],
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
  reworkPersonnel: [{ required: true, message: '请输入返工人员', trigger: 'blur' }]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑返工记录' : '新增返工记录'
})

const uploadUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}/api/rework`
})

// 生命周期
onMounted(() => {
  loadData()
  loadOptions()
  initQualityLevels()
})

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
    const response = await axios.get('/api/rework/options')
    if (response.data.success) {
      Object.assign(options, response.data.data)
    } else {
      console.error('加载选项数据失败:', response.data.message)
      ElMessage.error(response.data.message || '加载选项数据失败')
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

const refreshData = () => {
  loadData()
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

const showAddDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const editRecord = (row) => {
  isEdit.value = true
  currentRecord.value = row
  
  // 填充表单数据
  Object.keys(formData).forEach(key => {
    if (row[key] !== undefined) {
      formData[key] = row[key]
    }
  })
  
  dialogVisible.value = true
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
    
    const url = isEdit.value ? `/api/rework/${currentRecord.value.ID}` : '/api/rework'
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await axios[method](url, {
      ...formData,
      createdBy: 'admin', // 实际应用中应该从用户信息获取
      updatedBy: 'admin'
    })
    
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
    reworkPersonnel: '',
    reworkHours: null,
    reworkMethod: '',
    reworkStatus: '进行中',
    materialCost: null,
    laborCost: null,
    otherCost: null,
    qualityLevel: '',
    finalResult: '',
    remarks: ''
  })
  
  fileList.value = []
  currentRecord.value = null
}

const calculateDefectiveRate = () => {
  if (formData.totalQty && formData.defectiveQty !== null) {
    formData.goodQty = formData.totalQty - formData.defectiveQty
  }
}

const calculateTotalCost = () => {
  // 自动计算总成本在后端处理
}

const exportData = async () => {
  try {
    exportLoading.value = true
    // 导出功能实现
    ElMessage.info('导出功能开发中')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 文件上传相关方法
const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf', 
                      'application/msword', 'application/vnd.ms-excel'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isValidType) {
    ElMessage.error('只能上传jpg/png/pdf/doc/xls格式的文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }
  return true
}

const handleUploadSuccess = (response, file) => {
  ElMessage.success('文件上传成功')
}

const handleUploadRemove = (file) => {
  // 处理文件移除
}

// 工具方法
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
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
  padding: 1.25rem;
}

@media (max-width: 48rem) {
  .rework-management {
    padding: 0.75rem;
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
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 0;
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
  margin-bottom: 20px;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
}

.search-card :deep(.el-card__body) {
  padding: 1.25rem;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.2rem;
  align-items: end;
  padding: 0.5rem;
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
  min-height: 37.5rem;
  overflow-x: auto;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
}

.table-card :deep(.el-card__body) {
  padding: 1.25rem;
}

@media (max-width: 48rem) {
  .table-card {
    min-height: 25rem;
  }
  
  :deep(.el-table) {
    font-size: 0.75rem;
  }
  
  :deep(.el-table .el-table__cell) {
    padding: 0.375rem 0.25rem;
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

/* 表单卡片样式 */
.form-container {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.form-section {
  margin-bottom: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e4e7ed;
}

.form-section :deep(.el-card__header) {
   background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
   border-bottom: 1px solid #e4e7ed;
   border-left: 4px solid #409eff;
   padding: 1rem 1.25rem;
 }

.form-section :deep(.el-card__body) {
  padding: 1.5rem 1.25rem;
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
  padding: 1.5rem;
  background: #fafafa;
}

.rework-dialog :deep(.el-dialog__footer) {
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
}

/* 强制设置对话框高度 - 修复定位和底部空白问题 */
.rework-dialog::v-deep(.el-dialog) {
  height: 90vh !important;
  max-height: 90vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 5vh auto !important;
  top: 0 !important;
}

.rework-dialog::v-deep(.el-dialog__wrapper) {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding-top: 5vh !important;
}

.rework-dialog::v-deep(.el-dialog__body) {
  flex: 1 !important;
  max-height: calc(90vh - 100px) !important;
  overflow-y: auto !important;
  padding: 1.5rem !important;
  background: #fafafa !important;
  margin-bottom: 0 !important;
}

.rework-dialog::v-deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  margin-top: auto !important;
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

/* 响应式设计 */
@media (max-width: 48rem) {
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
</style>

<!-- 全局样式作为备用方案 -->
<style>
/* 全局强制对话框高度样式 - 修复定位和底部空白 */
.el-dialog.rework-dialog-global {
  height: 90vh !important;
  max-height: 90vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 5vh auto !important;
  top: 0 !important;
}

.rework-dialog-global .el-dialog__wrapper {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding-top: 5vh !important;
}

.el-dialog.rework-dialog-global .el-dialog__body {
  flex: 1 !important;
  max-height: calc(90vh - 100px) !important;
  overflow-y: auto !important;
  margin-bottom: 0 !important;
}

.el-dialog.rework-dialog-global .el-dialog__footer {
  flex-shrink: 0 !important;
  margin-top: auto !important;
}
</style>