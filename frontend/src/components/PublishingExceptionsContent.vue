<template>
  <!-- 主要内容区域 -->
  <div class="common-layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="300px">
        <!-- 统计卡片 -->
        <el-card class="sidebar-stat-card sidebar-stat-card-blue" shadow="hover">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(statistics.totalRecords) }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatAmount(statistics.totalAmount) }}</div>
              <div class="stat-label">总损失金额</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(statistics.currentMonthRecords) }}</div>
              <div class="stat-label">本月记录</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatAmount(statistics.currentMonthAmount) }}</div>
              <div class="stat-label">本月损失</div>
            </div>
          </div>
        </el-card>

        <!-- 筛选卡片 -->
        <el-card class="filter-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span><el-icon><Filter /></el-icon> 筛选条件</span>
            </div>
          </template>
          
          <el-form :model="filters" class="filter-form" label-position="top">
            <!-- 日期范围 -->
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="date-range-picker"
                @change="handleSearch"
              />
            </el-form-item>

            <!-- 客户代码 -->
            <el-form-item label="客户代码">
              <el-input
                v-model="filters.customerCode"
                placeholder="请输入客户代码"
                clearable
                @input="handleCustomerCodeInput"
                @clear="handleSearch"
              />
            </el-form-item>

            <!-- 工单号 -->
            <el-form-item label="工单号">
              <el-input-group>
                <el-input-group-prepend>WO</el-input-group-prepend>
                <el-input
                  v-model="filters.workOrderSuffix"
                  placeholder="请输入工单号后缀"
                  clearable
                  class="filter-work-order-suffix"
                  title="只能输入数字和小数点"
                  @input="handleFilterWorkOrderInput"
                  @clear="handleSearch"
                />
              </el-input-group>
            </el-form-item>

            <!-- 产品名称 -->
            <el-form-item label="产品名称">
              <el-select
                v-model="filters.productName"
                placeholder="请选择产品名称"
                clearable
                filterable
                @change="handleSearch"
                @clear="handleSearch"
              >
                <el-option
                  v-for="product in productNames"
                  :key="product"
                  :label="product"
                  :value="product"
                />
              </el-select>
            </el-form-item>

            <!-- 责任单位 -->
            <el-form-item label="责任单位">
              <el-select
                v-model="filters.responsibleDepartment"
                placeholder="请选择责任单位"
                clearable
                @change="handleSearch"
                @clear="handleSearch"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.name"
                />
              </el-select>
            </el-form-item>

            <!-- 错误类型 -->
            <el-form-item label="错误类型">
              <el-select
                v-model="filters.errorType"
                placeholder="请选择错误类型"
                clearable
                @change="handleSearch"
                @clear="handleSearch"
              >
                <el-option label="文字错误" value="文字错误" />
                <el-option label="图片错误" value="图片错误" />
                <el-option label="版面错误" value="版面错误" />
                <el-option label="色彩错误" value="色彩错误" />
                <el-option label="尺寸错误" value="尺寸错误" />
                <el-option label="材质错误" value="材质错误" />
                <el-option label="工艺错误" value="工艺错误" />
                <el-option label="其他错误" value="其他错误" />
              </el-select>
            </el-form-item>

            <!-- 操作按钮 -->
            <el-form-item>
              <el-button type="primary" @click="handleSearch" style="width: 100%; margin-bottom: 10px;">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="resetFilters" style="width: 100%;">
                <el-icon><RefreshLeft /></el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 快捷操作卡片 -->
        <el-card class="quick-actions-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span><el-icon><Operation /></el-icon> 快捷操作</span>
            </div>
          </template>
          
          <div class="quick-actions">
            <el-button 
              type="primary" 
              @click="handleAdd" 
              style="width: 100%; margin-bottom: 10px;"
              :disabled="!permissions.canCreate"
            >
              <el-icon><Plus /></el-icon>
              新增记录
            </el-button>
            <el-button 
              type="success" 
              @click="handleExport" 
              style="width: 100%; margin-bottom: 10px;"
              :disabled="!permissions.canExport"
            >
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button 
              @click="refreshData" 
              style="width: 100%;"
            >
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </el-card>

        <!-- 信息卡片 -->
        <el-card class="info-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span><el-icon><InfoFilled /></el-icon> 系统信息</span>
            </div>
          </template>
          
          <div class="info-items">
            <div class="info-item">
              <span class="info-label">当前用户:</span>
              <span class="info-value">{{ userStore.user?.username || '未登录' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用户角色:</span>
              <span class="info-value">{{ userStore.user?.role || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最后更新:</span>
              <span class="info-value">{{ formatDateTime(new Date()) }}</span>
            </div>
          </div>
        </el-card>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main>
        <!-- 标签页 -->
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 记录清单标签页 -->
          <el-tab-pane label="记录清单" name="records">
            <div class="records-content">
              <!-- 工具栏 -->
              <div class="toolbar">
                <el-button 
                  type="primary" 
                  @click="handleAdd"
                  :disabled="!permissions.canCreate"
                >
                  <el-icon><Plus /></el-icon>
                  新增
                </el-button>
                <el-button 
                  type="danger" 
                  @click="handleBatchDelete"
                  :disabled="selectedRows.length === 0 || !permissions.canDelete"
                >
                  <el-icon><Delete /></el-icon>
                  批量删除
                </el-button>
                <el-button 
                  type="success" 
                  @click="handleExport"
                  :disabled="!permissions.canExport"
                >
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>

              <!-- 数据表格 -->
              <el-table
                :data="tableData"
                style="width: 100%"
                @selection-change="handleSelectionChange"
                @row-dblclick="handleRowDoubleClick"
                stripe
                border
                height="600"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="registration_date" label="登记日期" width="120" sortable>
                  <template #default="scope">
                    {{ formatDate(scope.row.registration_date) }}
                  </template>
                </el-table-column>
                <el-table-column prop="publication_date" label="出版日期" width="120" sortable>
                  <template #default="scope">
                    {{ formatDate(scope.row.publication_date) }}
                  </template>
                </el-table-column>
                <el-table-column prop="customer_code" label="客户代码" width="120" sortable />
                <el-table-column prop="work_order_number" label="工单号" width="120" sortable />
                <el-table-column prop="product_name" label="产品名称" width="150" sortable show-overflow-tooltip />
                <el-table-column prop="plate_type" label="版类型" width="100" sortable />
                <el-table-column prop="publication_count" label="出版张数" width="100" sortable align="right" />
                <el-table-column prop="responsible_department" label="责任单位" width="120" sortable />
                <el-table-column prop="responsible_person" label="责任人" width="100" sortable />
                <el-table-column prop="piece_count" label="件数" width="80" sortable align="right" />
                <el-table-column prop="length_cm" label="长(cm)" width="80" sortable align="right" />
                <el-table-column prop="width_cm" label="宽(cm)" width="80" sortable align="right" />
                <el-table-column prop="unit_price" label="单价" width="100" sortable align="right">
                  <template #default="scope">
                    {{ scope.row.unit_price ? '¥' + scope.row.unit_price : '' }}
                  </template>
                </el-table-column>
                <el-table-column prop="amount" label="金额" width="120" sortable align="right">
                  <template #default="scope">
                    <span class="stat-number">{{ formatAmount(scope.row.amount) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="error_type" label="错误类型" width="100" sortable />
                <el-table-column prop="problem_description" label="问题描述" width="200" show-overflow-tooltip />
                <el-table-column label="图片" width="80" align="center">
                  <template #default="scope">
                    <el-button
                      v-if="scope.row.image_path"
                      type="primary"
                      size="small"
                      @click="openImagePreview(scope.row.image_path)"
                    >
                      查看
                    </el-button>
                    <span v-else>无</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                  <template #default="scope">
                    <div class="action-buttons">
                      <el-button size="small" @click="handleView(scope.row)">
                        查看
                      </el-button>
                      <el-button 
                        size="small" 
                        type="primary" 
                        @click="handleEdit(scope.row)"
                        :disabled="!permissions.canUpdate"
                      >
                        编辑
                      </el-button>
                      <el-button 
                        size="small" 
                        type="danger" 
                        @click="handleDelete(scope.row)"
                        :disabled="!permissions.canDelete"
                      >
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 分页 -->
              <div class="pagination-wrapper">
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
            </div>
          </el-tab-pane>

          <!-- 数据统计标签页 -->
          <el-tab-pane label="数据统计" name="statistics">
            <div class="statistics-content">
              <!-- 统计卡片 -->
              <el-row :gutter="20" class="stats-cards">
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatNumber(statistics.totalRecords) }}</div>
                      <div class="stat-label">总记录数</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatAmount(statistics.totalAmount) }}</div>
                      <div class="stat-label">总损失金额</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatNumber(statistics.currentMonthRecords) }}</div>
                      <div class="stat-label">本月记录</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatAmount(statistics.currentMonthAmount) }}</div>
                      <div class="stat-label">本月损失</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <!-- 图表区域 -->
              <el-row :gutter="20" class="charts-row">
                <el-col :span="12">
                  <el-card class="chart-card" shadow="hover">
                    <template #header>
                      <span>按错误类型统计</span>
                    </template>
                    <div id="errorTypeChart" class="chart-container"></div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="chart-card" shadow="hover">
                    <template #header>
                      <span>年度成本损失趋势</span>
                    </template>
                    <div id="costTrendChart" class="chart-container"></div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </div>

  <!-- 新增/编辑对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑出版异常记录' : '新增出版异常记录'"
    width="800px"
    @close="handleDialogClose"
    @keydown="handleDialogKeydown"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="登记日期" prop="registration_date">
            <el-date-picker
              v-model="formData.registration_date"
              type="date"
              placeholder="选择登记日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="出版日期" prop="publication_date">
            <el-date-picker
              v-model="formData.publication_date"
              type="date"
              placeholder="选择出版日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="客户代码" prop="customer_code">
            <el-input
              v-model="formData.customer_code"
              placeholder="请输入客户代码"
              @input="handleFormCustomerCodeInput"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工单号" prop="work_order_number">
            <el-input-group>
              <el-input-group-prepend>WO</el-input-group-prepend>
              <el-input
                v-model="formData.work_order_suffix"
                placeholder="请输入工单号后缀"
                title="只能输入数字和小数点"
                @input="handleFormWorkOrderInput"
              />
            </el-input-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="产品名称" prop="product_name">
            <el-select
              v-model="formData.product_name"
              placeholder="请选择产品名称"
              filterable
              allow-create
              style="width: 100%"
            >
              <el-option
                v-for="product in productNames"
                :key="product"
                :label="product"
                :value="product"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="版类型" prop="plate_type">
            <el-select
              v-model="formData.plate_type"
              placeholder="请选择版类型"
              style="width: 100%"
            >
              <el-option label="CTP" value="CTP" />
              <el-option label="PS版" value="PS版" />
              <el-option label="柔版" value="柔版" />
              <el-option label="刀模" value="刀模" />
              <el-option label="文件" value="文件" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="出版张数" prop="publication_count">
            <el-input-number
              v-model="formData.publication_count"
              :min="1"
              placeholder="请输入出版张数"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="责任单位" prop="responsible_department">
            <el-select
              v-model="formData.responsible_department"
              placeholder="请选择责任单位"
              style="width: 100%"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="责任人" prop="responsible_person">
            <el-input
              v-model="formData.responsible_person"
              placeholder="请输入责任人"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="件数" prop="piece_count">
            <el-input-number
              v-model="formData.piece_count"
              :min="1"
              placeholder="请输入件数"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="长(cm)" prop="length_cm">
            <el-input-number
              v-model="formData.length_cm"
              :min="0"
              :precision="2"
              placeholder="请输入长度"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="宽(cm)" prop="width_cm">
            <el-input-number
              v-model="formData.width_cm"
              :min="0"
              :precision="2"
              placeholder="请输入宽度"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="面积(cm²)">
            <el-input
              :model-value="formData.area_cm2 ? formData.area_cm2.toString() : ''"
              placeholder="自动计算"
              readonly
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="单价" prop="unit_price">
            <el-input-number
              v-model="formData.unit_price"
              :min="0"
              :precision="2"
              placeholder="请输入单价"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="金额">
            <el-input
              :model-value="formData.amount ? formatAmount(formData.amount) : ''"
              placeholder="自动计算"
              readonly
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="错误类型" prop="error_type">
            <el-select
              v-model="formData.error_type"
              placeholder="请选择错误类型"
              style="width: 100%"
            >
              <el-option label="文字错误" value="文字错误" />
              <el-option label="图片错误" value="图片错误" />
              <el-option label="版面错误" value="版面错误" />
              <el-option label="色彩错误" value="色彩错误" />
              <el-option label="尺寸错误" value="尺寸错误" />
              <el-option label="材质错误" value="材质错误" />
              <el-option label="工艺错误" value="工艺错误" />
              <el-option label="其他错误" value="其他错误" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="问题描述" prop="problem_description">
        <el-input
          v-model="formData.problem_description"
          type="textarea"
          :rows="3"
          placeholder="请详细描述问题"
        />
      </el-form-item>

      <el-form-item label="上传图片">
        <FileUpload
          :file-list="fileList"
          :before-upload="beforeUpload"
          :custom-upload="handleCustomUpload"
          @file-change="handleFileChange"
          @file-remove="handleFileRemove"
          @file-preview="handleFilePreview"
          accept="image/*"
          :multiple="true"
          :limit="5"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 图片预览对话框 -->
  <el-dialog
    v-model="imagePreviewVisible"
    title="图片预览"
    width="60%"
    @close="closeImagePreview"
  >
    <div class="image-preview">
      <ImagePreview
        v-if="currentPreviewImage"
        :image-path="currentPreviewImage"
      />
    </div>
  </el-dialog>

  <!-- 查看详情对话框 -->
  <el-dialog
    v-model="viewDialogVisible"
    title="查看出版异常记录详情"
    width="800px"
  >
    <el-descriptions :column="2" border>
      <el-descriptions-item label="登记日期">
        {{ formatDate(viewData.registration_date) }}
      </el-descriptions-item>
      <el-descriptions-item label="出版日期">
        {{ formatDate(viewData.publication_date) }}
      </el-descriptions-item>
      <el-descriptions-item label="客户代码">
        {{ viewData.customer_code }}
      </el-descriptions-item>
      <el-descriptions-item label="工单号">
        {{ viewData.work_order_number }}
      </el-descriptions-item>
      <el-descriptions-item label="产品名称">
        {{ viewData.product_name }}
      </el-descriptions-item>
      <el-descriptions-item label="版类型">
        {{ viewData.plate_type }}
      </el-descriptions-item>
      <el-descriptions-item label="出版张数">
        {{ viewData.publication_count }}
      </el-descriptions-item>
      <el-descriptions-item label="责任单位">
        {{ viewData.responsible_department }}
      </el-descriptions-item>
      <el-descriptions-item label="责任人">
        {{ viewData.responsible_person }}
      </el-descriptions-item>
      <el-descriptions-item label="件数">
        {{ viewData.piece_count }}
      </el-descriptions-item>
      <el-descriptions-item label="长度(cm)">
        {{ viewData.length_cm }}
      </el-descriptions-item>
      <el-descriptions-item label="宽度(cm)">
        {{ viewData.width_cm }}
      </el-descriptions-item>
      <el-descriptions-item label="面积(cm²)">
        {{ viewData.area_cm2 }}
      </el-descriptions-item>
      <el-descriptions-item label="单价">
        {{ viewData.unit_price ? '¥' + viewData.unit_price : '' }}
      </el-descriptions-item>
      <el-descriptions-item label="金额">
        <span class="stat-number">{{ formatAmount(viewData.amount) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="错误类型">
        {{ viewData.error_type }}
      </el-descriptions-item>
      <el-descriptions-item label="问题描述" :span="2">
        {{ viewData.problem_description }}
      </el-descriptions-item>
      <el-descriptions-item label="相关图片" :span="2">
        <div v-if="getImageList(viewData.image_path).length > 0" style="display: flex; gap: 10px; flex-wrap: wrap;">
          <div
            v-for="(image, index) in getImageList(viewData.image_path)"
            :key="index"
            style="cursor: pointer;"
            @click="openImagePreview(image)"
          >
            <el-image
              :src="image.url"
              :alt="image.originalName"
              style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;"
              fit="cover"
              :preview-src-list="[image.url]"
            />
          </div>
        </div>
        <span v-else>无图片</span>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>

  <!-- 导出选项对话框 -->
  <el-dialog
    v-model="exportDialogVisible"
    title="导出选项"
    width="500px"
    class="export-dialog"
  >
    <div class="export-options">
      <div class="export-form">
        <div class="export-option-item">
          <div class="option-header">
            <el-icon class="option-icon"><Document /></el-icon>
            <span class="option-label">导出内容</span>
          </div>
          <div class="option-content">
            <el-checkbox v-model="exportOptions.includeImages" class="custom-checkbox">
              <span class="checkbox-label">包含图片信息</span>
            </el-checkbox>
            <el-checkbox v-model="exportOptions.includeStatistics" class="custom-checkbox">
              <span class="checkbox-label">包含统计数据</span>
            </el-checkbox>
            <div class="export-tip">
              <el-icon class="tip-icon"><InfoFilled /></el-icon>
              <span class="tip-text">导出将包含当前筛选条件下的所有记录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="export-dialog-footer">
      <el-button @click="exportDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmExport" class="confirm-btn">
        <el-icon><Download /></el-icon>
        确认导出
      </el-button>
    </div>
  </el-dialog>

  <!-- 新增/编辑对话框中的图片预览 -->
  <el-dialog
    v-model="dialogImagePreviewVisible"
    title="图片预览"
    width="60%"
    @close="closeDialogImagePreview"
  >
    <div class="image-preview">
      <el-image
        v-if="currentDialogPreviewImage"
        :src="currentDialogPreviewImage"
        style="width: 100%; max-height: 500px;"
        fit="contain"
      />
    </div>
  </el-dialog>
</template>

<script setup>
/**
 * 出版异常管理内容组件
 * 功能：出版异常记录的增删改查、统计分析、图片管理等
 * 作者：系统管理员
 * 日期：2024年
 */

// Vue 相关导入
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 图标导入
import {
  Plus,
  Edit,
  Delete,
  Search,
  RefreshLeft,
  Download,
  Upload,
  View,
  Document,
  Money,
  Calendar,
  TrendCharts,
  Filter,
  Operation,
  InfoFilled,
  Refresh
} from '@element-plus/icons-vue'

// 公共组件导入
import FileUpload from '@/components/FileUpload.vue'
import ImagePreview from '@/components/ImagePreview.vue'

// 状态管理导入
import { useUserStore } from '@/store/user'

// API服务导入
import apiService from '@/services/apiService'

// ECharts 导入
import * as echarts from 'echarts'

// 状态管理
const userStore = useUserStore()
// const permissionStore = usePermissionStore() // 暂时注释掉，文件不存在

// 响应式数据定义
const activeTab = ref('records') // 当前激活的标签页
const tableData = ref([]) // 表格数据
const selectedRows = ref([]) // 选中的行
const departments = ref([]) // 部门列表
const productNames = ref([]) // 产品名称列表

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 筛选条件
const filters = reactive({
  dateRange: [],
  customerCode: '',
  workOrderSuffix: '',
  productName: '',
  responsibleDepartment: '',
  errorType: ''
})

// 统计数据
const statistics = reactive({
  totalRecords: 0,
  totalAmount: 0,
  currentMonthRecords: 0,
  currentMonthAmount: 0,
  errorTypeStats: [],
  monthlyTrend: []
})

// 对话框相关
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const imagePreviewVisible = ref(false)
const dialogImagePreviewVisible = ref(false)
const exportDialogVisible = ref(false)
const isEdit = ref(false)
const currentPreviewImage = ref('')
const currentDialogPreviewImage = ref('')

// 表单相关
const formRef = ref()
const formData = reactive({
  registration_date: '',
  publication_date: '',
  customer_code: '',
  work_order_suffix: '',
  work_order_number: '',
  product_name: '',
  plate_type: '',
  publication_count: null,
  responsible_department: '',
  responsible_person: '',
  piece_count: null,
  length_cm: null,
  width_cm: null,
  area_cm2: null,
  unit_price: null,
  amount: null,
  error_type: '',
  problem_description: '',
  image_path: ''
})

// 查看详情数据
const viewData = reactive({})

// 文件上传相关
const fileList = ref([])
const tempUploadedFiles = ref([])
const originalFiles = ref([])
const removedFiles = ref([])

// 导出选项
const exportOptions = reactive({
  includeImages: true,
  includeStatistics: false
})

// 权限相关
const permissions = reactive({
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canExport: false
})

// 图表实例
let errorTypeChart = null
let costTrendChart = null

// 表单验证规则
const formRules = {
  registration_date: [
    { required: true, message: '请选择登记日期', trigger: 'change' }
  ],
  publication_date: [
    { required: true, message: '请选择出版日期', trigger: 'change' }
  ],
  customer_code: [
    { required: true, message: '请输入客户代码', trigger: 'blur' }
  ],
  work_order_suffix: [
    { required: true, message: '请输入工单号后缀', trigger: 'blur' }
  ],
  product_name: [
    { required: true, message: '请选择或输入产品名称', trigger: 'blur' }
  ],
  plate_type: [
    { required: true, message: '请选择版类型', trigger: 'change' }
  ],
  publication_count: [
    { required: true, message: '请输入出版张数', trigger: 'blur' }
  ],
  responsible_department: [
    { required: true, message: '请选择责任单位', trigger: 'change' }
  ],
  responsible_person: [
    { required: true, message: '请输入责任人', trigger: 'blur' }
  ],
  piece_count: [
    { required: true, message: '请输入件数', trigger: 'blur' }
  ],
  error_type: [
    { required: true, message: '请选择错误类型', trigger: 'change' }
  ],
  problem_description: [
    { required: true, message: '请输入问题描述', trigger: 'blur' }
  ]
}

/**
 * 检查用户权限
 */
const checkPermissions = async () => {
  try {
    // 暂时注释掉权限检查，设置默认权限
    // const userPermissions = await permissionStore.getUserPermissions()
    
    // 设置默认权限（所有权限都开放）
    permissions.canCreate = true
    permissions.canEdit = true
    permissions.canDelete = true
    permissions.canExport = true
    
    /* 原权限检查逻辑
    permissions.canCreate = userPermissions.some(p => 
      p.permission_code === 'publishing_exceptions:create' || 
      p.permission_code === 'publishing_exceptions:*' ||
      p.permission_code === '*'
    )
    
    permissions.canUpdate = userPermissions.some(p => 
      p.permission_code === 'publishing_exceptions:update' || 
      p.permission_code === 'publishing_exceptions:*' ||
      p.permission_code === '*'
    )
    
    permissions.canDelete = userPermissions.some(p => 
      p.permission_code === 'publishing_exceptions:delete' || 
      p.permission_code === 'publishing_exceptions:*' ||
      p.permission_code === '*'
    )
    
    permissions.canExport = userPermissions.some(p => 
      p.permission_code === 'publishing_exceptions:export' || 
      p.permission_code === 'publishing_exceptions:*' ||
      p.permission_code === '*'
    )
    */
  } catch (error) {
    console.error('检查权限失败:', error)
  }
}

/**
 * 获取部门列表
 */
const fetchDepartments = async () => {
  try {
    const response = await apiService.get('/departments')
    if (response.data.success) {
      departments.value = response.data.data || []
    } else {
      ElMessage.error('获取部门列表失败')
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
    ElMessage.error('获取部门列表失败')
  }
}

/**
 * 获取产品名称列表
 */
const fetchProductNames = async () => {
  try {
    await apiService.initialize()
    const response = await apiService.get('/publishing-exceptions/product-names')
    if (response.data.success) {
      productNames.value = response.data.data || []
    } else {
      ElMessage.error('获取产品名称列表失败')
    }
  } catch (error) {
    console.error('获取产品名称列表失败:', error)
    ElMessage.error('获取产品名称列表失败')
  }
}

/**
 * 获取表格数据
 */
const fetchData = async () => {
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...filters
    }
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    // 处理工单号
    if (filters.workOrderSuffix) {
      params.workOrderNumber = `GD${filters.workOrderSuffix}`
    }
    
    const response = await apiService.get('/publishing-exceptions', { params })
    
    if (response.data.success) {
      tableData.value = response.data.data || []
      pagination.total = response.data.pagination.total || 0
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败')
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
    
    // 处理客户代码
    if (filters.customerCode) {
      params.customerCode = filters.customerCode
    }
    
    // 处理工单号
    if (filters.workOrderSuffix) {
      params.workOrderNumber = `GD${filters.workOrderSuffix}`
    }
    
    // 处理产品名称
    if (filters.productName) {
      params.productName = filters.productName
    }
    
    // 处理责任单位
    if (filters.responsibleDepartment) {
      params.responsibleUnit = filters.responsibleDepartment
    }
    
    // 处理错误类型
    if (filters.errorType) {
      params.errorType = filters.errorType
    }
    
    const response = await apiService.get('/publishing-exceptions/statistics/summary', { params })
    
    if (response.data.success) {
      const data = response.data.data || {}
      
      // 更新统计数据
      statistics.totalRecords = data.summary?.totalRecords || 0
      statistics.totalAmount = data.summary?.totalAmount || 0
      statistics.currentMonthRecords = data.summary?.currentMonthRecords || 0
      statistics.currentMonthAmount = data.summary?.currentMonthAmount || 0
      statistics.errorTypeStats = data.byErrorType || []
      statistics.monthlyTrend = data.costTrend || []
      
      // 更新图表
      updateCharts()
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  }
}

/**
 * 更新图表
 */
const updateCharts = () => {
  nextTick(() => {
    // 错误类型分布图
    const errorTypeChartDom = document.getElementById('errorTypeChart')
    if (errorTypeChartDom) {
      if (errorTypeChart) {
        errorTypeChart.dispose()
      }
      errorTypeChart = echarts.init(errorTypeChartDom)
      
      const errorTypeOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '错误类型',
            type: 'pie',
            radius: ['20%', '50%'],
            center: ['60%', '50%'],
            roseType: 'area',
            itemStyle: {
              borderRadius: 8
            },
            data: statistics.errorTypeStats.map(item => ({
              value: item.count,
              name: item.error_type
            }))
          }
        ]
      }
      
      errorTypeChart.setOption(errorTypeOption)
    }
    
    // 成本损失趋势图
    const costTrendChartDom = document.getElementById('costTrendChart')
    if (costTrendChartDom) {
      if (costTrendChart) {
        costTrendChart.dispose()
      }
      costTrendChart = echarts.init(costTrendChartDom)
      
      const costTrendOption = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['损失金额']
        },
        xAxis: {
          type: 'category',
          data: statistics.monthlyTrend.map(item => item.month)
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '¥{value}'
          }
        },
        series: [
          {
            name: '损失金额',
            type: 'line',
            smooth: true,
            data: statistics.monthlyTrend.map(item => item.amount)
          }
        ]
      }
      
      costTrendChart.setOption(costTrendOption)
    }
  })
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.currentPage = 1
  fetchData()
  fetchStatistics()
}

/**
 * 重置筛选条件
 */
const resetFilters = () => {
  filters.dateRange = []
  filters.customerCode = ''
  filters.workOrderSuffix = ''
  filters.productName = ''
  filters.responsibleDepartment = ''
  filters.errorType = ''
  handleSearch()
}

/**
 * 客户代码输入处理（筛选区）
 */
const handleCustomerCodeInput = (value) => {
  // 转换为大写
  filters.customerCode = value.toUpperCase()
}

/**
 * 客户代码输入处理（表单）
 */
const handleFormCustomerCodeInput = (value) => {
  // 转换为大写
  formData.customer_code = value.toUpperCase()
}

/**
 * 工单号输入处理（筛选区）
 */
const handleFilterWorkOrderInput = (value) => {
  // 只允许数字和小数点
  const filteredValue = value.replace(/[^0-9.]/g, '')
  filters.workOrderSuffix = filteredValue
}

/**
 * 工单号输入处理（表单）
 */
const handleWorkOrderInput = (value) => {
  // 只允许数字和小数点
  const filteredValue = value.replace(/[^0-9.]/g, '')
  formData.work_order_suffix = filteredValue
  formData.work_order_number = filteredValue ? `WO${filteredValue}` : ''
}

/**
 * 表单工单号输入处理
 */
const handleFormWorkOrderInput = (value) => {
  handleWorkOrderInput(value)
}

/**
 * 标签页切换处理
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
  resetFormData()
  dialogVisible.value = true
}

/**
 * 编辑记录
 */
const handleEdit = (row) => {
  isEdit.value = true
  
  // 复制数据到表单
  Object.keys(formData).forEach(key => {
    if (row[key] !== undefined) {
      formData[key] = row[key]
    }
  })
  
  // 处理工单号
  if (row.work_order_number && row.work_order_number.startsWith('WO')) {
    formData.work_order_suffix = row.work_order_number.substring(2)
  }
  
  // 处理文件列表
  const imageList = getImageList(row.image_path)
  fileList.value = [...imageList]
  originalFiles.value = [...imageList]
  tempUploadedFiles.value = []
  removedFiles.value = []
  
  dialogVisible.value = true
}

/**
 * 查看记录详情
 */
const handleView = (row) => {
  // 清理之前的缓存数据
  Object.keys(viewData).forEach(key => {
    delete viewData[key]
  })
  
  // 复制数据到查看对象
  Object.assign(viewData, row)
  
  viewDialogVisible.value = true
}

/**
 * 双击行查看详情
 */
const handleRowDoubleClick = (row) => {
  handleView(row)
}

/**
 * 删除记录
 */
const handleDelete = async (row) => {
  if (!permissions.canDelete) {
    ElMessage.warning('您没有删除权限')
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
    
    const response = await apiService.delete(`/publishing-exceptions/${row.id}`)
    if (response.data.success) {
      ElMessage.success('删除成功')
    } else {
      throw new Error(response.data.message || '删除失败')
    }
    fetchData()
    fetchStatistics()
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
  if (!permissions.canDelete) {
    ElMessage.warning('您没有删除权限')
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
    const deletePromises = selectedRows.value.map(async (row) => {
      const response = await apiService.delete(`/publishing-exceptions/${row.id}`)
      if (!response.data.success) {
        throw new Error(response.data.message || '删除失败')
      }
      return response
    })
    
    await Promise.all(deletePromises)
    ElMessage.success('批量删除成功')
    fetchData()
    fetchStatistics()
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
const handleExport = () => {
  if (!permissions.canExport) {
    ElMessage.warning('您没有导出权限')
    return
  }
  
  exportDialogVisible.value = true
}

/**
 * 确认导出
 */
const confirmExport = async () => {
  try {
    const params = {
      ...filters,
      includeImages: exportOptions.includeImages,
      includeStatistics: exportOptions.includeStatistics
    }
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    // 处理工单号
    if (filters.workOrderSuffix) {
      params.workOrderNumber = `GD${filters.workOrderSuffix}`
    }
    
    const response = await apiService.get('/publishing-exceptions/export', { 
      params,
      responseType: 'blob'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `出版异常记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
    exportDialogVisible.value = false
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
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
  fetchData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  fetchData()
}

/**
 * 表单提交
 */
const handleSubmit = async () => {
  try {
    // 表单验证
    await formRef.value.validate()
    
    // 处理工单号
    if (formData.work_order_suffix) {
      formData.work_order_number = `WO${formData.work_order_suffix}`
    }
    
    // 处理文件上传
    const allFiles = [...tempUploadedFiles.value, ...originalFiles.value]
    if (allFiles.length > 0) {
      formData.image_path = JSON.stringify(allFiles.map(file => ({
        filename: file.filename,
        originalName: file.originalName || file.name,
        path: file.path,
        size: file.size
      })))
    } else {
      formData.image_path = ''
    }
    
    if (isEdit.value) {
      // 更新记录
      const response = await apiService.put(`/publishing-exceptions/${formData.id}`, formData)
      if (response.data.success) {
        ElMessage.success('更新成功')
      } else {
        throw new Error(response.data.message || '更新失败')
      }
    } else {
      // 创建记录
      const response = await apiService.post('/publishing-exceptions', formData)
      if (response.data.success) {
        ElMessage.success('创建成功')
      } else {
        throw new Error(response.data.message || '创建失败')
      }
    }
    
    dialogVisible.value = false
    fetchData()
    fetchStatistics()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败')
  }
}

/**
 * 对话框关闭处理
 */
const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetFormData()
  fileList.value = []
  tempUploadedFiles.value = []
  originalFiles.value = []
  removedFiles.value = []
}

/**
 * 对话框键盘事件处理
 */
const handleDialogKeydown = (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    handleSubmit()
  }
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'registration_date') {
      formData[key] = new Date().toISOString().slice(0, 10)
    } else if (key === 'publication_date') {
      formData[key] = new Date().toISOString().slice(0, 10)
    } else if (typeof formData[key] === 'string') {
      formData[key] = ''
    } else {
      formData[key] = null
    }
  })
}

/**
 * 刷新数据
 */
const refreshData = () => {
  fetchData()
  fetchStatistics()
  ElMessage.success('数据已刷新')
}

/**
 * 自定义文件上传处理
 */
const handleCustomUpload = (file) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('image', file)
    
    apiService.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(response => {
      const data = response.data
      if (data.success) {
        const fileInfo = {
          filename: data.data.filename,
          originalName: file.name,
          url: data.data.url,
          path: data.data.path,
          size: file.size
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
 * 文件列表变化处理
 */
const handleFileChange = (files) => {
  // 只有当传入的文件数组长度大于当前文件列表长度时才更新
  if (files.length > fileList.value.length) {
    fileList.value = [...files]
  }
}

/**
 * 文件删除处理
 */
const handleFileRemove = (deletedFiles) => {
  deletedFiles.forEach((deletedFile) => {
    const deletedFileName = deletedFile.name || deletedFile.originalName
    const deletedFileFilename = deletedFile.filename
    const deletedFileUrl = deletedFile.url
    
    const isFileMatch = (file) => {
      const fileName = file.name || file.originalName
      const fileFilename = file.filename
      const fileUrl = file.url
      
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
 * 获取图片URL
 */
const getImageUrl = (imagePath, preventCache = false) => {
  if (!imagePath) return ''
  
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    url = `/files/site-images/publishing-exception/${imagePath}`
  } else {
    url = `${protocol}//${hostname}:8080/files/site-images/publishing-exception/${imagePath}`
  }
  
  if (preventCache) {
    const timestamp = Date.now()
    url += `?t=${timestamp}`
  }
  
  return url
}

/**
 * 解析图片路径
 */
const getImageList = (imagePath) => {
  if (!imagePath) return []
  
  try {
    const imageArray = JSON.parse(imagePath)
    if (Array.isArray(imageArray)) {
      return imageArray.map(imageInfo => ({
        ...imageInfo,
        url: getImageUrl(imageInfo.filename, false)
      }))
    }
  } catch (e) {
    // 旧格式兼容
  }
  
  if (typeof imagePath === 'string' && imagePath.trim()) {
    return [{
      filename: imagePath,
      originalName: imagePath,
      url: getImageUrl(imagePath, false),
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
 * 格式化日期
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
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
 * 格式化日期时间
 */
const formatDateTime = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
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

watch(
  () => formData.plate_type,
  (plateType) => {
    formData.unit_price = null
    
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
        if (price && price > 0) {
          amount = price * pieces
        }
        break
        
      case '柔版':
        if (area && price && area > 0 && price > 0) {
          amount = area * price * pieces
        }
        break
        
      case '刀模':
        if (length && width && price && length > 0 && width > 0 && price > 0) {
          const perimeter = (length * 2) + (width * 2)
          const perimeterM = perimeter / 100
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
 */
const openImagePreview = (imagePathOrInfo) => {
  let imagePath = imagePathOrInfo
  
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
 */
const openImagePreviewInDialog = (imageInfo) => {
  const imageUrl = getImageUrl(imageInfo.filename, false)
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
 */
const handleFilePreview = (fileInfo, url) => {
  let imageUrl = url
  
  if (!imageUrl && fileInfo.filename) {
    imageUrl = getImageUrl(fileInfo.filename, false)
  }
  
  if (imageUrl) {
    currentDialogPreviewImage.value = imageUrl
    dialogImagePreviewVisible.value = true
  }
}

// 监听activeTab变化
watch(activeTab, (newTab) => {
  if (newTab === 'statistics') {
    nextTick(() => {
      fetchStatistics()
    })
  }
})

/**
 * 窗口大小变化处理函数
 */
const handleResize = () => {
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
  fetchProductNames()
  fetchData()
  fetchStatistics()
  
  await checkPermissions()
  
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
  window.removeEventListener('resize', handleResize)
  
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
.common-layout {
  padding: 20px;
  background-color: #f5f7fa;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-height: 0;
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

.el-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
  border-radius: 0;
  padding: 0 20px;
}

.el-tabs :deep(.el-tabs__nav-wrap) {
  padding: 10px 0;
}

.el-tabs :deep(.el-tabs__nav) {
  border: none;
}

.el-tabs :deep(.el-tabs__item) {
  height: 45px;
  line-height: 45px;
  padding: 0 25px;
  margin-right: 8px;
  border: none;
  border-radius: 0;
  font-weight: 500;
  font-size: 16px;
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

.el-tabs :deep(.el-tabs__item.is-active) {
  color: #409EFF;
  background: transparent;
}

.el-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.el-tabs :deep(.el-tabs__content) {
  background: #fff;
  border-radius: 0;
  min-height: 400px;
  position: relative;
}

.el-tabs :deep(.el-tab-pane) {
  animation: fadeInUp 0.5s ease-out;
}

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

@media (max-width: 768px) {
  .el-tabs :deep(.el-tabs__item) {
    padding: 0 15px;
    margin-right: 5px;
    font-size: 14px;
  }
  
  .el-tabs :deep(.el-tabs__header) {
    padding: 0 10px;
  }
  
  .el-tabs :deep(.el-tab-pane) {
    padding: 15px;
  }
}

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

.records-content {
  margin-top: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.toolbar .el-button:first-child {
  margin-left: 20px;
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
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.sidebar-stat-card {
  text-align: center;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.sidebar-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
  background: rgba(64, 158, 255, 0.2);
  border-color: rgba(64, 158, 255, 0.5);
}

.sidebar-stat-card .stat-item {
  padding: 5px;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-stat-card .stat-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-stat-card .stat-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.sidebar-stat-card:hover .stat-icon {
  transform: scale(1.1);
  background: rgba(64, 158, 255, 0.2);
}

.sidebar-stat-card .stat-content {
  flex: 1;
  text-align: left;
}

.sidebar-stat-card .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #409EFF;
  margin-bottom: 4px;
  word-break: break-all;
  line-height: 1.2;
  transition: all 0.3s ease;
}

.sidebar-stat-card:hover .stat-value {
  transform: scale(1.05);
}

.sidebar-stat-card .stat-label {
  font-size: 11px;
  color: #606266;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.sidebar-stat-card:hover .stat-label {
  opacity: 1;
}

.sidebar-stat-card-blue {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
}

.sidebar-stat-card-blue:hover {
  background: rgba(64, 158, 255, 0.2);
  border-color: rgba(64, 158, 255, 0.5);
}

.sidebar-stat-card-orange {
  background: rgba(230, 162, 60, 0.1);
  border-color: rgba(230, 162, 60, 0.3);
}

.sidebar-stat-card-orange:hover {
  background: rgba(230, 162, 60, 0.2);
  border-color: rgba(230, 162, 60, 0.5);
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

.charts-row {
  margin-bottom: 20px;
}

.charts-row .el-col {
  margin-bottom: 20px;
}

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
  justify-content: center;
  gap: 20px;
  padding: 20px 0;
}

.dialog-footer .el-button {
  min-width: 120px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

.el-table .el-table__body .el-button {
  padding-left: 8px;
  padding-right: 8px;
  margin-right: 5px;
}

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

.el-input-group__prepend {
  background-color: transparent !important;
  border: none !important;
  padding: 0 8px;
}

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