<!--
  DMS-QA Quality Management System
  Copyright (c) 2024-2025 David Lee (zglibk)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<template>
  <AppLayout>
    <div class="home-content">
        <!-- 统计控制区 -->
        <div class="stats-control">
          <div class="stats-control-left">
            <el-date-picker
              v-model="selectedMonth"
              type="month"
              placeholder="选择月份"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              size="default"
              @change="handleMonthChange"
              :clearable="false"
              style="width: 160px;"
            />
          </div>
          <div class="stats-control-right">
            <el-switch
              v-model="showTodayStats"
              :active-text="isCurrentMonth ? '显示今日统计' : '仅当前月份可用'"
              :inactive-text="isCurrentMonth ? '隐藏今日统计' : '仅当前月份可用'"
              @change="handleTodayStatsToggle"
              :disabled="!isCurrentMonth"
            />
          </div>
        </div>

        <!-- 上部统计卡片区 -->
      <div class="stat-row-flex">
        <!-- 加载状态 -->
        <div v-if="statsLoading" class="stat-card loading-card">
          <div class="stat-title">加载中...</div>
          <div class="stat-value"><el-icon class="is-loading"><Loading /></el-icon></div>
        </div>

        <!-- 统计卡片（数据加载完成后显示） -->
        <template v-else>
          <!-- 当卡片数量较少时，直接显示 -->
          <template v-if="!needCarousel">
            <!-- 今日投诉卡片 -->
            <div v-if="shouldShowTodayCard" class="stat-card card-today">
              <div class="card-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <div class="stat-title">今日投诉</div>
                  <div class="stat-value"><b>{{ todayCount }}</b></div>
                </div>
                <div class="card-divider"></div>
                <div class="card-stats">
                  <span class="stat-item-inline">内诉: <b>{{ todayInnerCount || 0 }}</b></span>
                  <span class="stat-item-inline">客诉: <b>{{ todayOuterCount || 0 }}</b></span>
                </div>
              </div>
            </div>

            <!-- 选定月份总投诉卡片 -->
            <div v-if="showMonthCount" class="stat-card card-month">
              <div class="card-icon">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <div class="stat-title">{{ selectedMonthText }}总投诉</div>
                  <div class="stat-value"><b>{{ monthCount }}</b></div>
                </div>
                <div class="card-divider"></div>
                <div class="card-stats">
                  <span class="stat-item-inline">内诉: <b>{{ monthInnerCount || 0 }}</b></span>
                  <span class="stat-item-inline">客诉: <b>{{ monthOuterCount || 0 }}</b></span>
                </div>
              </div>
            </div>

            <!-- 新增：一次交检合格率卡片 -->
            <div class="stat-card quality-rate-card special-layout">
              <div class="card-icon">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="card-content-vertical">
                <div class="card-title-row">一次交检合格率</div>
                <div class="card-percentage-row">{{ qualityStats.passRate }}%</div>
                <div class="card-detail-row">
                  <span>交检: {{ qualityStats.totalInspections }}</span>
                  <span>不合格: {{ qualityStats.failedInspections }}</span>
                </div>
              </div>
            </div>

            <!-- 新增：客诉率卡片 -->
            <div class="stat-card complaint-rate-card special-layout">
              <div class="card-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="card-content-vertical">
                <div class="card-title-row">客诉率</div>
                <div class="card-percentage-row">{{ qualityStats.complaintRate }}%</div>
                <div class="card-detail-row">
                  <span>交付: {{ qualityStats.totalDeliveries }}</span>
                  <span>客诉: {{ qualityStats.complaintBatches }}</span>
                </div>
              </div>
            </div>

            <!-- 各单位统计卡片 -->
            <div
              v-for="(item, idx) in statUnits"
              :key="item.unit + idx"
              :class="['stat-card', 'unit-card', getUnitCardClass(item.type, idx)]"
            >
              <div class="card-icon">
                <el-icon>
                  <OfficeBuilding v-if="item.type === 'department'" />
                  <Tools v-else />
                </el-icon>
              </div>
              <div class="card-content">
                <div class="unit-header">
                  <div class="stat-title">{{ item.unit }}</div>
                  <el-tag
                    :type="item.type === 'workshop' ? 'primary' : 'success'"
                    class="unit-tag"
                  >
                    {{ item.type === 'workshop' ? '车间' : '部门' }}
                  </el-tag>
                </div>
                <div class="card-divider"></div>
                <div class="unit-stats-horizontal">
                  <span class="stat-item-inline">内诉: <b>{{ item.inner }}</b></span>
                  <span class="stat-item-inline">客诉: <b>{{ item.outer }}</b></span>
                </div>
              </div>
            </div>
          </template>

          <!-- 当卡片数量较多时，使用轮播图 -->
          <el-carousel
            v-else
            :interval="5000"
            arrow="always"
            indicator-position="outside"
            height="160px"
            class="stats-carousel"
          >
            <el-carousel-item
              v-for="(page, pageIndex) in cardPages"
              :key="pageIndex"
            >
              <div class="carousel-page">
                <!-- 动态渲染每页的卡片 -->
                <template v-for="(card, cardIndex) in page">
                  <!-- 今日投诉卡片 -->
                  <div v-if="card.type === 'today'" :key="`today-${pageIndex}-${cardIndex}`" class="summary-card today-card">
                    <div class="card-left">
                      <div class="card-icon today">
                        <el-icon><Calendar /></el-icon>
                      </div>
                    </div>
                    <div class="card-right">
                      <div class="card-title">今日投诉</div>
                      <div class="card-value today-value">{{ todayCount }}</div>
                      <div class="card-subtitle">内诉: {{ todayInnerCount || 0 }} | 客诉: {{ todayOuterCount || 0 }}</div>
                    </div>
                  </div>

                  <!-- 选定月份总投诉卡片 -->
                  <div v-else-if="card.type === 'month'" :key="`month-${pageIndex}-${cardIndex}`" class="summary-card month-card">
                    <div class="card-left">
                      <div class="card-icon total">
                        <el-icon><DataAnalysis /></el-icon>
                      </div>
                    </div>
                    <div class="card-right">
                      <div class="card-title">{{ selectedMonthText }}总投诉</div>
                      <div class="card-value total-value">{{ monthCount }}</div>
                      <div class="card-subtitle">内诉: {{ monthInnerCount || 0 }} | 客诉: {{ monthOuterCount || 0 }}</div>
                    </div>
                  </div>

                  <!-- 一次交检合格率卡片 -->
                  <div v-else-if="card.type === 'quality'" :key="`quality-${pageIndex}-${cardIndex}`" class="summary-card quality-card">
                    <div class="card-left">
                      <div class="card-icon rate">
                        <el-icon><CircleCheck /></el-icon>
                      </div>
                    </div>
                    <div class="card-right">
                      <div class="card-title">一次交检合格率</div>
                      <div class="card-value rate-value">{{ qualityStats.passRate }}%</div>
                      <div class="card-subtitle">交检: {{ qualityStats.totalInspections }} | 不合格: {{ qualityStats.failedInspections }}</div>
                    </div>
                  </div>

                  <!-- 客诉率卡片 -->
                  <div v-else-if="card.type === 'complaint'" :key="`complaint-${pageIndex}-${cardIndex}`" class="summary-card complaint-card">
                    <div class="card-left">
                      <div class="card-icon customer-rate">
                        <el-icon><Warning /></el-icon>
                      </div>
                    </div>
                    <div class="card-right">
                      <div class="card-title">客诉率</div>
                      <div class="card-value customer-rate-value">{{ qualityStats.complaintRate }}%</div>
                      <div class="card-subtitle">交付: {{ qualityStats.totalDeliveries }} | 客诉: {{ qualityStats.complaintBatches }}</div>
                    </div>
                  </div>

                  <!-- 各单位统计卡片 -->
                  <div
                    v-else-if="card.type === 'unit'"
                    :key="`unit-${pageIndex}-${cardIndex}`"
                    class="summary-card unit-card"
                  >
                    <div class="card-left">
                      <div class="card-icon" :class="card.data.type === 'workshop' ? 'inner' : 'outer'">
                        <el-icon>
                          <OfficeBuilding v-if="card.data.type === 'department'" />
                          <Tools v-else />
                        </el-icon>
                      </div>
                    </div>
                    <div class="card-right">
                      <div class="card-title">
                        {{ card.data.unit }}
                        <el-tag
                          :type="card.data.type === 'workshop' ? 'primary' : 'success'"
                          size="small"
                          style="margin-left: 8px;"
                        >
                          {{ card.data.type === 'workshop' ? '车间' : '部门' }}
                        </el-tag>
                      </div>
                      <div class="card-value" :class="card.data.type === 'workshop' ? 'inner-value' : 'outer-value'">
                        {{ (card.data.inner || 0) + (card.data.outer || 0) }}
                      </div>
                      <div class="card-subtitle">内诉: {{ card.data.inner || 0 }} | 客诉: {{ card.data.outer || 0 }}</div>
                    </div>
                  </div>
                </template>
              </div>
            </el-carousel-item>
          </el-carousel>
        </template>
      </div>

      <!-- 中部左右结构 -->
      <div class="middle-row">
        <div class="table-container">
          <!-- 历史投诉记录表格卡片 -->
          <el-card class="table-card complaint-table-card">
            <template #header>
              <div class="table-header">
                <div class="table-title">
                  <el-icon><Document /></el-icon>
                  <span>历史投诉记录</span>
                  <el-tooltip content="双击表格行可快速查看详情" placement="top">
                    <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="table-actions">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索客户、工单号、产品名称..."
                    clearable
                    style="width: 280px;"
                    @keyup.enter="handleSimpleSearch"
                    @clear="handleSimpleSearch"
                  >
                    <template #append>
                      <el-button :icon="Search" @click="handleSimpleSearch" />
                    </template>
                  </el-input>
                  <el-button type="primary" @click="showComplaintDialog = true" style="margin-left: 12px;" class="add-complaint-btn">
                    <el-icon style="margin-right: 6px;"><DocumentCopy /></el-icon>
                    新增投诉
                  </el-button>
                  <el-button type="success" @click="showExportDialog = true" style="margin-left: 8px;" class="export-btn">
                    <el-icon style="margin-right: 6px;"><Download /></el-icon>
                    导出Excel
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="tableData"
              style="width: 100%;"
              stripe
              :loading="tableLoading"
              empty-text="暂无投诉记录"
              border
              class="enhanced-table"
              @row-dblclick="handleRowDoubleClick"
            >
              <el-table-column type="index" width="50" :index="(index) => (page - 1) * pageSize + index + 1" resizable>
                <template #header>
                  <div class="table-header-cell">
                    <span class="header-text">#</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="Date" width="110" sortable resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon date-icon"><Calendar /></el-icon>
                    <span class="header-text">日期</span>
                  </div>
                </template>
                <template #default="scope">
                  <el-tag type="info" >
                    {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="Customer" width="120" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon customer-icon"><User /></el-icon>
                    <span class="header-text">客户编号</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="OrderNo" width="130" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon order-icon"><DocumentCopy /></el-icon>
                    <span class="header-text">工单号</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="ProductName" min-width="140" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon product-icon"><Box /></el-icon>
                    <span class="header-text">产品名称</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="Workshop" width="110" resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon workshop-icon"><OfficeBuilding /></el-icon>
                    <span class="header-text">发生车间</span>
                  </div>
                </template>
                <template #default="scope">
                  <el-tag :type="getWorkshopTagType(scope.row.Workshop)">
                    {{ scope.row.Workshop }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="ComplaintCategory" width="110" resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon category-icon"><Warning /></el-icon>
                    <span class="header-text">投诉类别</span>
                  </div>
                </template>
                <template #default="scope">
                  <el-tag :type="scope.row.ComplaintCategory === '客诉' ? 'danger' : 'warning'">
                    {{ scope.row.ComplaintCategory }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="DefectiveCategory" min-width="120" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon defect-icon"><CircleClose /></el-icon>
                    <span class="header-text">不良类别</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="DefectiveItem" min-width="120" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon item-icon"><InfoFilled /></el-icon>
                    <span class="header-text">不良项</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="DefectiveDescription" min-width="150" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon desc-icon"><ChatLineRound /></el-icon>
                    <span class="header-text">不良描述</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="MainDept" min-width="110" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon dept-icon"><Coordinate /></el-icon>
                    <span class="header-text">主责部门</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="MainPerson" min-width="100" show-overflow-tooltip resizable>
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon person-icon"><Avatar /></el-icon>
                    <span class="header-text">主责人</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column width="100" fixed="right">
                <template #header>
                  <div class="table-header-cell">
                    <el-icon class="header-icon action-icon"><Setting /></el-icon>
                    <span class="header-text">操作</span>
                  </div>
                </template>
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button text :icon="View" @click="viewDetail(scope.row)" title="查看详情" class="action-btn" />
                    <el-button text :icon="Edit" @click="editRecord(scope.row)" title="修改记录" class="action-btn" />
                    <el-button text :icon="Delete" @click="deleteRecord(scope.row)" title="删除记录" class="action-btn danger-btn" />
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页器 -->
            <div class="table-footer">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                :page-size="pageSize"
                :current-page="page"
                :page-sizes="pageSizes"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
          </el-card>
          <!-- 质量指标趋势分析卡片 -->
          <QualityMetricsChart />

          <!-- 投诉数据分析图表 -->
          <ComplaintAnalysisChart />
        </div>
        <!-- 右侧高级查询卡片 -->
        <div :span="4">
          <el-card class="query-card">
            <template #header>
              <div class="query-header">
                <el-icon><Search /></el-icon>
                <span>高级查询</span>
              </div>
            </template>

            <el-form :model="advancedQuery" label-width="70px"  class="advanced-form">
              <!-- 客户查询 -->
              <el-form-item label="客户">
                <el-input
                  v-model="advancedQuery.customer"
                  placeholder="输入客户名称"
                  clearable
                />
              </el-form-item>

              <!-- 工单号查询 -->
              <el-form-item label="工单号">
                <el-input
                  v-model="advancedQuery.orderNo"
                  placeholder="输入工单号"
                  clearable
                />
              </el-form-item>

              <!-- 产品名称查询 -->
              <el-form-item label="产品名称">
                <el-input
                  v-model="advancedQuery.productName"
                  placeholder="输入产品名称"
                  clearable
                />
              </el-form-item>

              <!-- 车间查询 -->
              <el-form-item label="车间">
                <el-select
                  v-model="advancedQuery.workshop"
                  placeholder="选择或输入车间"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="workshop in workshopOptions"
                    :key="workshop"
                    :label="workshop"
                    :value="workshop"
                  />
                </el-select>
              </el-form-item>

              <!-- 投诉类别 -->
              <el-form-item label="投诉类别">
                <el-select
                  v-model="advancedQuery.complaintCategory"
                  placeholder="选择或输入投诉类别"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="category in complaintCategoryOptions"
                    :key="category"
                    :label="category"
                    :value="category"
                  />
                </el-select>
              </el-form-item>

              <!-- 客诉类型 -->
              <el-form-item label="客诉类型">
                <el-select
                  v-model="advancedQuery.customerComplaintType"
                  placeholder="选择或输入客诉类型"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="type in customerComplaintTypeOptions"
                    :key="type"
                    :label="type"
                    :value="type"
                  />
                </el-select>
              </el-form-item>

              <!-- 不良类别 -->
              <el-form-item label="不良类别">
                <el-select
                  v-model="advancedQuery.defectiveCategory"
                  placeholder="选择或输入不良类别"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="category in defectiveCategoryOptions"
                    :key="category"
                    :label="category"
                    :value="category"
                  />
                </el-select>
              </el-form-item>

              <!-- 主责部门 -->
              <el-form-item label="主责部门">
                <el-select
                  v-model="advancedQuery.mainDept"
                  placeholder="选择或输入主责部门"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="dept in departmentOptions"
                    :key="dept"
                    :label="dept"
                    :value="dept"
                  />
                </el-select>
              </el-form-item>

              <!-- 主责人 -->
              <el-form-item label="主责人">
                <el-select
                  v-model="advancedQuery.mainPerson"
                  placeholder="选择或输入主责人"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="person in personOptions"
                    :key="person"
                    :label="person"
                    :value="person"
                  />
                </el-select>
              </el-form-item>

              <!-- 日期范围 -->
              <el-form-item label="日期">
                <el-date-picker
                  v-model="advancedQuery.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"                 
                />
              </el-form-item>

              <!-- 不良率范围 -->
              <el-form-item label="不良率">
                <div class="rate-range">
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMin"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最小值"
                    style="width: 70px"                    
                  />
                  <span style="margin: 0 8px; color: #909399;">-</span>
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMax"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最大值"
                    style="width: 70px"                    
                  />
                  <span style="margin-left: 4px; color: #909399; font-size: 12px;">%</span>
                </div>
              </el-form-item>

              <!-- 退货状态 -->
              <el-form-item label="退货状态">
                <el-select
                  v-model="advancedQuery.returnGoods"
                  placeholder="选择退货状态"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option label="已退货" value="1" />
                  <el-option label="未退货" value="0" />
                </el-select>
              </el-form-item>

              <!-- 补印状态 -->
              <el-form-item label="补印状态">
                <el-select
                  v-model="advancedQuery.isReprint"
                  placeholder="选择补印状态"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option label="已补印" value="1" />
                  <el-option label="未补印" value="0" />
                </el-select>
              </el-form-item>

              <!-- 操作按钮 -->
              <el-form-item>
                <div class="query-actions">
                  <el-button
                    type="primary"                    
                    @click="handleAdvancedQuery"
                    :loading="tableLoading"
                  >
                    <el-icon><Search /></el-icon>
                    查询
                  </el-button>
                  <el-button                    
                    @click="resetAdvancedQuery"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="isEditing ? '编辑投诉记录' : '投诉记录详情'"
      width="60%" 
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      class="detail-dialog"
      center
      top="10vh"
      :style="{ height: '80vh' }"
    >
      <div v-if="detailData" class="detail-content" v-loading="detailFieldsLoading" element-loading-text="加载字段信息中...">
        <!-- 动态显示所有字段 -->
        <div v-for="section in detailSections" :key="section.title" class="detail-section">
          <div class="section-header">
            <el-icon class="section-icon" :class="section.iconClass">
              <InfoFilled v-if="section.icon === 'InfoFilled'" />
              <WarningFilled v-else-if="section.icon === 'WarningFilled'" />
              <Tools v-else-if="section.icon === 'Tools'" />
              <Document v-else-if="section.icon === 'Document'" />
              <UserFilled v-else-if="section.icon === 'UserFilled'" />
              <QuestionFilled v-else-if="section.icon === 'QuestionFilled'" />
              <InfoFilled v-else />
            </el-icon>
            <span class="section-title">{{ section.title }}</span>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div
                v-for="field in section.fields"
                :key="field.key"
                class="info-item"
                :class="{ 'full-width': isFullWidthField(field) }"
              >
                <span class="info-label">{{ field.label }}</span>
                <span class="info-value" :class="getFieldValueClass(field)">
                  {{ formatFieldValue(detailData?.[field.key], field) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 附件信息（如果存在） -->
        <div class="detail-section" v-if="detailData.AttachmentFile">
          <div class="section-header">
            <el-icon class="section-icon info"><Paperclip /></el-icon>
            <span class="section-title">附件信息</span>
          </div>
          <div class="section-content">
            <AttachmentViewer
              :record-id="detailData.ID"
              :show-path-info="true"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showDetailDialog = false">
            <el-icon><Close /></el-icon>
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑记录对话框 -->
    <el-dialog
      v-model="showEditDialog"
      width="60%"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      destroy-on-close
      class="edit-dialog"
      center
      top="5vh"
      @close="cleanupEditResources"
    >
      <template #header>
        <div class="edit-dialog-header">
          <el-icon class="header-icon"><Edit /></el-icon>
          <span class="header-title">编辑投诉记录</span>
        </div>
      </template>
      <div class="edit-content" v-loading="editFormLoading" element-loading-text="保存中...">
        <el-form
          :model="editFormData"
          :rules="editRules"
          ref="editFormRef"
          label-width="120px"
          class="edit-form"
          size="default"
        >
          <!-- 动态显示所有字段分组 -->
          <div v-for="section in editSections" :key="section.title" class="edit-section">
            <el-card shadow="always" class="form-card">
              <template #header>
                <div class="section-header">
                  <el-icon class="section-icon" :class="section.iconClass">
                    <InfoFilled v-if="section.icon === 'InfoFilled'" />
                    <WarningFilled v-else-if="section.icon === 'WarningFilled'" />
                    <Tools v-else-if="section.icon === 'Tools'" />
                    <Document v-else-if="section.icon === 'Document'" />
                    <UserFilled v-else-if="section.icon === 'UserFilled'" />
                    <QuestionFilled v-else-if="section.icon === 'QuestionFilled'" />
                    <InfoFilled v-else />
                  </el-icon>
                  <span class="section-title">{{ section.title }}</span>
                </div>
              </template>
              <div class="section-content">
                <!-- 如果是tab布局 -->
                <el-tabs v-if="section.isTabbed" v-model="activeTab[section.title]" type="border-card" class="material-tabs">
                  <el-tab-pane v-for="tab in section.tabs" :key="tab.name" :label="tab.label" :name="tab.name">
                    <el-row :gutter="16">
                      <el-col
                        v-for="field in getTabFields(tab.fields)"
                        :key="field.key"
                        :span="getFieldSpan(field)"
                      >
                        <el-form-item
                          :label="field.label"
                          :prop="field.key"
                          :label-width="getFieldLabelWidth(field)"
                        >
                          <!-- 日期字段 -->
                          <el-date-picker
                            v-if="field.type === 'date'"
                            v-model="editFormData[field.key]"
                            type="date"
                            style="width: 100%"
                            format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD"
                          />
                          <!-- 数字字段 -->
                          <el-input-number
                            v-else-if="field.type === 'number' || field.type === 'decimal'"
                            v-model="editFormData[field.key]"
                            :precision="field.type === 'decimal' ? 2 : 0"
                            :min="0"
                            style="width: 100%"
                          />
                          <!-- 材料名称下拉框 -->
                          <el-select
                            v-else-if="['Paper', 'MaterialA', 'MaterialB', 'MaterialC'].includes(field.key)"
                            v-model="editFormData[field.key]"
                            filterable
                            allow-create
                            :placeholder="`请选择或输入${field.label}`"
                            style="width: 100%"
                            @change="handleEditMaterialChange(field.key, $event)"
                            :loading="editMaterialLoading"
                          >
                            <el-option
                              v-for="material in editMaterialNames"
                              :key="material"
                              :label="material"
                              :value="material"
                            />
                          </el-select>
                          <!-- 文本字段 -->
                          <el-input
                            v-else
                            v-model="editFormData[field.key]"
                            :type="field.type === 'textarea' ? 'textarea' : 'text'"
                            :rows="field.type === 'textarea' ? 3 : undefined"
                            style="width: 100%"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </el-tab-pane>
                </el-tabs>
                <!-- 普通布局 -->
                <el-row v-else :gutter="16">
                  <el-col
                    v-for="field in section.fields"
                    :key="field.key"
                    :span="getFieldSpan(field)"
                  >
                    <el-form-item
                      :label="field.label"
                      :prop="field.key"
                      :label-width="getFieldLabelWidth(field)"
                    >
                      <!-- 日期字段 -->
                      <el-date-picker
                        v-if="field.type === 'date'"
                        v-model="editFormData[field.key]"
                        type="date"
                        style="width: 100%"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                      />
                      <!-- 数字字段 -->
                      <el-input-number
                        v-else-if="field.type === 'number' || field.type === 'decimal'"
                        v-model="editFormData[field.key]"
                        :precision="field.type === 'decimal' ? 2 : 0"
                        :min="0"
                        style="width: 100%"
                      />
                      <!-- 布尔值字段 -->
                      <el-switch
                        v-else-if="field.key === 'ReturnGoods' || field.key === 'IsReprint'"
                        v-model="editFormData[field.key]"
                      />
                      <!-- 发生车间下拉框 -->
                      <el-select
                        v-else-if="field.key === 'Workshop'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择发生车间"
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.workshops" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 投诉类别下拉框 -->
                      <el-select
                        v-else-if="field.key === 'ComplaintCategory'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择投诉类别"
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.complaintCategories" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 客诉类型下拉框 -->
                      <el-select
                        v-else-if="field.key === 'CustomerComplaintType'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择客诉类型"
                        :disabled="editFormData.ComplaintCategory !== '客诉'"                        
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.customerComplaintTypes" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 不良类别下拉框 -->
                      <el-select
                        v-else-if="field.key === 'DefectiveCategory'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择不良类别"
                        @change="handleEditCategoryChange"
                        value-key="ID"                        
                        style="width: 100%"
                      >
                        <el-option
                          v-for="item in editOptions.defectiveCategories"
                          :key="item.ID"
                          :label="item.Name"
                          :value="item"
                        />
                      </el-select>
                      <!-- 不良项下拉框 -->
                      <el-select
                        v-else-if="field.key === 'DefectiveItem'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择不良项"                        
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.defectiveItems" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 主责部门下拉框 -->
                      <el-select
                        v-else-if="field.key === 'MainDept'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择主责部门"                       
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.departments" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 主责人下拉框 -->
                      <el-select
                        v-else-if="field.key === 'MainPerson'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择主责人"                        
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.persons" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 次责人下拉框 -->
                      <el-select
                        v-else-if="field.key === 'SecondPerson'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择次责人"                        
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.persons" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 责任主管下拉框 -->
                      <el-select
                        v-else-if="field.key === 'Manager'"
                        v-model="editFormData[field.key]"
                        filterable
                        placeholder="请选择责任主管"
                        style="width: 100%"
                      >
                        <el-option v-for="item in editOptions.persons" :key="item" :label="item" :value="item" />
                      </el-select>
                      <!-- 材料名称下拉框 -->
                      <el-select
                        v-else-if="['Paper', 'MaterialA', 'MaterialB', 'MaterialC'].includes(field.key)"
                        v-model="editFormData[field.key]"
                        filterable
                        allow-create
                        :placeholder="`请选择或输入${field.label}`"
                        style="width: 100%"
                        @change="handleEditMaterialChange(field.key, $event)"
                        :loading="editMaterialLoading"
                      >
                        <el-option
                          v-for="material in editMaterialNames"
                          :key="material"
                          :label="material"
                          :value="material"
                        />
                      </el-select>
                      <!-- 附件文件字段 - 特殊处理 -->
                      <div v-else-if="field.key === 'AttachmentFile'" class="attachment-field">
                        <div class="attachment-input-section">
                          <el-button @click="selectFile" :loading="editFileUploading" type="primary">
                            <el-icon><Plus /></el-icon>
                            {{ editFileUploading ? '上传中...' : '选择图片' }}
                          </el-button>
                        </div>

                        <!-- 附件文件路径显示 -->
                        <div class="attachment-path-section" style="margin-top: 10px;">
                          <el-input
                            v-model="editFormData[field.key]"
                            readonly
                            placeholder="附件文件路径将在上传后显示"
                            class="attachment-path-input"
                          >
                            <template #prepend>文件路径</template>
                          </el-input>
                        </div>

                        <!-- 图片预览区域 -->
                        <div class="image-preview-area" style="margin-top: 10px;">
                          <ImagePreview
                            v-if="shouldShowImagePreview(editSelectedFileInfo, editFormData[field.key])"
                            :key="`edit-dialog-${editDialogInstanceId}-${editFormData.ID}-${field.key}-${editSelectedFileInfo?.fileName || 'existing'}`"
                            :file-path="editSelectedFileInfo?.previewUrl || editFormData[field.key]"
                            :record-id="editSelectedFileInfo?.previewUrl ? null : editFormData.ID"
                            width="200px"
                            height="150px"
                          />
                          <el-empty v-else description="暂无图片" :image-size="80" />
                        </div>
                      </div>
                      <!-- 文本字段 -->
                      <el-input
                        v-else
                        v-model="editFormData[field.key]"
                        :type="isFullWidthField(field) ? 'textarea' : 'text'"
                        :rows="isFullWidthField(field) ? 2 : undefined"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </el-card>
          </div>
        </el-form>
      </div>

      <template #footer>
        <div class="edit-dialog-footer">
          <el-button size="default" @click="cancelEdit" class="cancel-btn">
            <el-icon style="margin-right: 6px;"><Close /></el-icon>
            取消
          </el-button>
          <el-button type="success" size="default" @click="saveEdit" :loading="editFormLoading" class="save-btn">
            <el-icon style="margin-right: 6px;"><Check /></el-icon>
            {{ editFormLoading ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>



    <!-- Excel导出字段选择对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="选择导出字段"
      width="600px"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="export-field-selection">
        <div class="field-selection-header">
          <el-button            
            @click="selectAllFields"
            :type="activeSelectionButton === 'all' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'all' }"
          >
            全选
          </el-button>
          <el-button            
            @click="selectNoneFields"
            :type="activeSelectionButton === 'none' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'none' }"
          >
            全不选
          </el-button>
          <el-button            
            @click="selectDefaultFields"
            :type="activeSelectionButton === 'default' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'default' }"
          >
            默认选择
          </el-button>
        </div>

        <div class="field-selection-content">
          <el-row :gutter="20">
            <el-col :span="12" v-for="field in exportFields" :key="field.key">
              <el-checkbox
                v-model="field.checked"
                :disabled="field.required"
                class="field-checkbox"
              >
                {{ field.label }}
                <span v-if="field.required" class="required-mark">(必选)</span>
              </el-checkbox>
            </el-col>
          </el-row>
        </div>

        <div class="field-selection-info">
          <el-alert
            title="提示"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              已选择 <strong>{{ selectedFieldsCount }}</strong> 个字段进行导出。
              序号字段为必选项，无法取消。
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showExportDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmExport"
            :loading="exportLoading"
            :disabled="selectedFieldsCount === 0"
          >
            <el-icon><ArrowDown /></el-icon>
            确认导出
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增投诉对话框 -->
    <el-dialog
      v-model="showComplaintDialog"
      width="70%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="complaint-dialog"
      :destroy-on-close="true"
      :append-to-body="true"
      :lock-scroll="false"
      :modal="true"
      center
      top="3vh"
    >
      <template #header>
        <div class="dialog-header-with-icon">
          <el-icon class="dialog-icon"><DocumentCopy /></el-icon>
          <span class="dialog-title">新增投诉记录</span>
        </div>
      </template>
      <ComplaintFormDialog @success="handleComplaintSuccess" @cancel="showComplaintDialog = false" />
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, reactive } from 'vue'
import { Document, Search, Plus, View, RefreshLeft, InfoFilled, WarningFilled, UserFilled, Paperclip, Loading, QuestionFilled, Tools, OfficeBuilding, Download, Close, Edit, Delete, Check, Calendar, DataAnalysis, CircleCheck, Warning, DocumentCopy, Box, CircleClose, ChatLineRound, Coordinate, Avatar, Setting, Picture, Upload, Money } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElPagination, ElMessage, ElMessageBox } from 'element-plus'
import QualityMetricsChart from '@/components/QualityMetricsChart.vue'
import ComplaintAnalysisChart from '@/components/ComplaintAnalysisChart.vue'
import AppLayout from '@/components/common/AppLayout.vue'
import AttachmentViewer from '@/components/AttachmentViewer.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import ComplaintFormDialog from '../components/ComplaintFormDialog.vue'
import * as echarts from 'echarts'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'
import { useSiteConfig } from '../composables/useSiteConfig'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

const router = useRouter()

// 网站配置
const { siteConfig, loadSiteConfig } = useSiteConfig()
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(5)
const pageSizes = ref([5, 10, 20, 50, 100])
const gotoPage = ref(1)
const pageCount = computed(() => Math.ceil(total.value / pageSize.value))
const searchKeyword = ref('')
const tableLoading = ref(false)

// 详情弹窗相关
const showDetailDialog = ref(false)
const isEditing = ref(false)
const detailData = ref(null)
const detailLoading = ref(false)
const detailFieldsLoading = ref(false)
const detailSections = ref([])

// 编辑弹窗相关
const showEditDialog = ref(false)
const editFormData = ref({})
const originalFormData = ref({}) // 保存原始数据用于比较
const editFormLoading = ref(false)
const editFormRef = ref(null)
const editSections = ref([])
const activeTab = ref({})
const editDialogInstanceId = ref(0) // 对话框实例标识，用于强制重新创建组件

// 编辑对话框文件处理相关变量
const editSelectedFileInfo = ref(null)
const editFileUploading = ref(false)

// 编辑表单下拉选项数据
const editOptions = reactive({
  workshops: [],
  departments: [],
  persons: [],
  complaintCategories: [],
  customerComplaintTypes: [],
  defectiveCategories: [],
  defectiveItems: []
})

// 编辑表单验证规则（取消主责部门和主责人的必填校验）
const editRules = {
  Date: [{ required: true, message: '请选择投诉日期', trigger: 'change' }],
  Customer: [{ required: true, message: '请输入客户编号', trigger: 'blur' }],
  OrderNo: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  ProductName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  Workshop: [{ required: true, message: '请输入发生车间', trigger: 'blur' }],
  ProductionQty: [{ required: true, message: '请输入生产数', trigger: 'blur' }],
  ComplaintCategory: [{ required: true, message: '请输入投诉类别', trigger: 'blur' }],
  DefectiveCategory: [{ required: true, message: '请输入不良类别', trigger: 'blur' }],
  DefectiveDescription: [{ required: true, message: '请输入不良描述', trigger: 'blur' }],
  DefectiveItem: [{ required: true, message: '请输入不良项', trigger: 'blur' }],
  Disposition: [{ required: true, message: '请输入处置措施', trigger: 'blur' }]
  // 注意：MainDept 和 MainPerson 不再是必填项
}

// 高级查询数据
const advancedQuery = ref({
  customer: '',
  orderNo: '',
  productName: '',
  workshop: '',
  complaintCategory: '',
  customerComplaintType: '',
  defectiveCategory: '',
  mainDept: '',
  mainPerson: '',
  dateRange: null,
  defectiveRateMin: null,
  defectiveRateMax: null,
  returnGoods: '',
  isReprint: ''
})

// 下拉选项数据
const workshopOptions = ref([])
const complaintCategoryOptions = ref([])
const customerComplaintTypeOptions = ref([])
const defectiveCategoryOptions = ref([])
const departmentOptions = ref([])
const personOptions = ref([])

/**
 * 编辑表单材料相关数据
 */
// 编辑表单材料名称列表
const editMaterialNames = ref([])
// 编辑表单材料数据加载状态
const editMaterialLoading = ref(false)
// 编辑表单单价获取缓存
const editPriceCache = reactive({})

// 是否使用高级查询
const isAdvancedQuery = ref(false)
const todayCount = ref(0)
const todayInnerCount = ref(0)
const todayOuterCount = ref(0)
const monthCount = ref(0)
const monthInnerCount = ref(0)
const monthOuterCount = ref(0)
const showTodayCount = ref(false) // 初始为false，等待数据加载
const showMonthCount = ref(false) // 初始为false，等待数据加载

// 月份选择和今日统计控制
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // 默认当前月份 YYYY-MM
const showTodayStats = ref(true) // 今日统计开关

// 添加统计数据加载状态
const statsLoading = ref(true)

// 计算属性：选定月份的显示文本
const selectedMonthText = computed(() => {
  if (!selectedMonth.value) return '本月'
  const [year, month] = selectedMonth.value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
    return '本月'
  }
  return `${year}年${month}月`
})

// 计算属性：是否为当前月份
const isCurrentMonth = computed(() => {
  if (!selectedMonth.value) return true
  const [year, month] = selectedMonth.value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return parseInt(year) === currentYear && parseInt(month) === currentMonth
})

// 计算属性：是否显示今日投诉卡片（只有当前月份且开关开启时才显示）
const shouldShowTodayCard = computed(() => {
  return showTodayCount.value && showTodayStats.value && isCurrentMonth.value
})

// 导出功能
const exportLoading = ref(false)
const showExportDialog = ref(false)
const activeSelectionButton = ref('')

// 投诉表单对话框
const showComplaintDialog = ref(false)

// 可导出的字段定义（动态从后端获取）
const exportFields = ref([])

// 获取字段信息
const fetchExportFields = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/fields', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      exportFields.value = res.data.data
    } else {
      ElMessage.error('获取字段信息失败')
    }
  } catch (error) {
    ElMessage.error('获取字段信息失败: ' + (error.response?.data?.message || error.message))
  }
}

// 计算属性：已选择的字段数量
const selectedFieldsCount = computed(() => {
  return exportFields.value.filter(field => field.checked).length
})

// 字段选择方法
const selectAllFields = () => {
  exportFields.value.forEach(field => {
    field.checked = true
  })
  activeSelectionButton.value = 'all'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}

const selectNoneFields = () => {
  exportFields.value.forEach(field => {
    if (!field.required) {
      field.checked = false
    }
  })
  activeSelectionButton.value = 'none'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}

const selectDefaultFields = async () => {
  // 重新获取字段信息以恢复默认状态
  await fetchExportFields()
  activeSelectionButton.value = 'default'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}
const statUnits = ref([])

// 质量统计数据
const qualityStats = ref({
  passRate: 0,           // 一次交检合格率
  totalInspections: 0,   // 总交检数
  failedInspections: 0,  // 不合格数（内诉数）
  complaintRate: 0,      // 客诉率
  totalDeliveries: 0,    // 总交付批次
  complaintBatches: 0    // 客诉批次
})

// 轮播图相关
const cardsPerPage = ref(6) // 每页显示的卡片数量
const windowWidth = ref(window.innerWidth) // 响应式窗口宽度

// 响应式调整每页卡片数量
const updateCardsPerPage = () => {
  windowWidth.value = window.innerWidth
  const width = windowWidth.value
  if (width < 480) {
    cardsPerPage.value = 1 // 超小屏手机端，每页只显示1张卡片
  } else if (width < 768) {
    cardsPerPage.value = 2 // 手机端
  } else if (width < 1024) {
    cardsPerPage.value = 3 // 平板端
  } else if (width < 1200) { // 调整阈值，在更大的屏幕下也使用轮播图
    cardsPerPage.value = 4 // 小屏桌面
  } else {
    cardsPerPage.value = 6 // 大屏桌面
  }
}

const needCarousel = computed(() => {
  const totalCards = getTotalCardCount()

  // 中小屏幕下强制使用轮播图，避免卡片被压缩
  if (windowWidth.value < 1200) {
    return true // 中小屏幕下强制使用轮播图
  }

  return totalCards > cardsPerPage.value
})

const cardPages = computed(() => {
  if (!needCarousel.value) return []

  const pages = []
  const units = statUnits.value

  // 创建所有卡片的数组
  let allCards = []

  // 添加固定卡片
  if (shouldShowTodayCard.value) allCards.push({ type: 'today' })
  if (showMonthCount.value) allCards.push({ type: 'month' })
  allCards.push({ type: 'quality' })
  allCards.push({ type: 'complaint' })

  // 添加单位卡片
  units.forEach(unit => allCards.push({ type: 'unit', data: unit }))

  // 按每页卡片数量分页
  for (let i = 0; i < allCards.length; i += cardsPerPage.value) {
    pages.push(allCards.slice(i, i + cardsPerPage.value))
  }

  return pages
})

// 计算总卡片数量
const getTotalCardCount = () => {
  let count = 2 // 一次交检合格率 + 客诉率
  if (shouldShowTodayCard.value) count++
  if (showMonthCount.value) count++
  count += statUnits.value.length
  return count
}

const chartFilter = ref({
  department: '',
  workshop: '',
  defectiveItem: '',
  dateRange: [],
  chartType: 'bar'
})
const chartOptions = ref({
  departments: [],
  workshops: [],
  defectiveItems: []
})

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    user.value = res.data.data
  }
}

// 导航相关方法已移至 AppHeader 组件

const fetchTableData = async () => {
  tableLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }

    // 如果使用高级查询，则使用高级查询参数，否则使用简单搜索
    if (isAdvancedQuery.value) {
      // 高级查询参数
      if (advancedQuery.value.customer) params.customer = advancedQuery.value.customer
      if (advancedQuery.value.orderNo) params.orderNo = advancedQuery.value.orderNo
      if (advancedQuery.value.productName) params.productName = advancedQuery.value.productName
      if (advancedQuery.value.workshop) params.workshop = advancedQuery.value.workshop
      if (advancedQuery.value.complaintCategory) params.complaintCategory = advancedQuery.value.complaintCategory
      if (advancedQuery.value.customerComplaintType) params.customerComplaintType = advancedQuery.value.customerComplaintType
      if (advancedQuery.value.defectiveCategory) params.defectiveCategory = advancedQuery.value.defectiveCategory
      if (advancedQuery.value.mainDept) params.mainDept = advancedQuery.value.mainDept
      if (advancedQuery.value.mainPerson) params.mainPerson = advancedQuery.value.mainPerson
      if (advancedQuery.value.dateRange && advancedQuery.value.dateRange.length === 2) {
        // Element Plus日期选择器已配置value-format="YYYY-MM-DD"，直接使用字符串值
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]

        console.log('高级查询日期范围:', {
          dateRange: advancedQuery.value.dateRange,
          startDate: params.startDate,
          endDate: params.endDate,
          startDateType: typeof params.startDate,
          endDateType: typeof params.endDate
        })
      }
      if (advancedQuery.value.defectiveRateMin !== null) params.defectiveRateMin = advancedQuery.value.defectiveRateMin
      if (advancedQuery.value.defectiveRateMax !== null) params.defectiveRateMax = advancedQuery.value.defectiveRateMax
      if (advancedQuery.value.returnGoods !== '') params.returnGoods = advancedQuery.value.returnGoods
      if (advancedQuery.value.isReprint !== '') params.isReprint = advancedQuery.value.isReprint
    } else {
      // 简单搜索参数
      if (searchKeyword.value) params.search = searchKeyword.value
    }

    const res = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      tableData.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    tableData.value = []
    total.value = 0
  } finally {
    tableLoading.value = false
  }
}

// 处理月份变化
const handleMonthChange = (value) => {
  // 强制更新selectedMonth值
  selectedMonth.value = value

  // 智能控制今日统计开关：非当前月份时自动关闭，当前月份时自动开启
  const [year, month] = value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const isCurrentMonthSelected = parseInt(year) === currentYear && parseInt(month) === currentMonth

  if (!isCurrentMonthSelected) {
    // 非当前月份，关闭今日统计显示
    showTodayStats.value = false
  } else {
    // 当前月份，开启今日统计显示
    showTodayStats.value = true
  }

  // 确保使用最新的月份值
  nextTick(() => {
    fetchStats()
  })
}

// 处理今日统计开关
const handleTodayStatsToggle = (value) => {
  // 不需要重新获取数据，只是控制显示
}

const fetchStats = async () => {
  try {
    statsLoading.value = true // 开始加载
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    // 添加月份参数
    const params = {
      month: selectedMonth.value
    }

    const res = await axios.get('/api/complaint/month-stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    })

    if (res.data.success) {
      // 根据配置显示卡片
      showTodayCount.value = res.data.showTodayCount !== false
      showMonthCount.value = res.data.showMonthCount !== false
      todayCount.value = res.data.todayCount || 0
      todayInnerCount.value = res.data.todayInnerCount || 0
      todayOuterCount.value = res.data.todayOuterCount || 0
      monthCount.value = res.data.monthCount || 0
      monthInnerCount.value = res.data.monthInnerCount || 0
      monthOuterCount.value = res.data.monthOuterCount || 0
      statUnits.value = res.data.units || []

      // 获取质量统计数据
      await fetchQualityStats()

    } else {
      // 统计数据获取失败，静默处理
    }
  } catch (e) {
    if (e.response && e.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  } finally {
    statsLoading.value = false // 加载完成
  }
}

// 获取质量统计数据
const fetchQualityStats = async () => {
  try {
    const token = localStorage.getItem('token')

    // 计算正确的月末日期
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate() // 获取该月的最后一天
    const startDate = `${selectedMonth.value}-01`
    const endDate = `${selectedMonth.value}-${lastDay.toString().padStart(2, '0')}`

    // 并行获取数据
    const [innerComplaintRes, outerComplaintRes, batchStatsRes] = await Promise.all([
      // 获取内诉数量（不合格数）
      axios.get('/api/complaint/list', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '内诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取客诉批次数量
      axios.get('/api/complaint/list', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '客诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取月度批次统计数据
      axios.get('/api/quality-metrics/month-batch-stats', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          month: selectedMonth.value
        }
      })
    ])

    const failedInspections = innerComplaintRes.data.total || 0
    const complaintBatches = outerComplaintRes.data.total || 0

    // 从API获取真实的批次数据
    const batchData = batchStatsRes.data.success ? batchStatsRes.data.data : null
    const totalInspections = batchData ? batchData.inspectionBatches : 0
    const totalDeliveries = batchData ? batchData.deliveryBatches : 0



    // 计算合格率和客诉率
    const passRate = totalInspections > 0 ?
      ((totalInspections - failedInspections) / totalInspections * 100).toFixed(1) : 0
    const complaintRate = totalDeliveries > 0 ?
      (complaintBatches / totalDeliveries * 100).toFixed(1) : 0

    qualityStats.value = {
      passRate: parseFloat(passRate),
      totalInspections,
      failedInspections,
      complaintRate: parseFloat(complaintRate),
      totalDeliveries,
      complaintBatches
    }

  } catch (error) {
    // 设置默认值
    qualityStats.value = {
      passRate: 0,
      totalInspections: 0,
      failedInspections: 0,
      complaintRate: 0,
      totalDeliveries: 0,
      complaintBatches: 0
    }
  }
}

const fetchChartOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    // 转换数据格式：从 [{Name: "xxx"}] 转换为 ["xxx"]，与fetchOptions保持一致
    chartOptions.value.departments = res.data.departments?.map(item => item.Name) || []
    chartOptions.value.workshops = res.data.workshops?.map(item => item.Name) || []
    chartOptions.value.defectiveItems = res.data.defectiveCategories?.map(item => item.Name) || []
  } catch (e) {
    // 获取图表选项失败，静默处理
  }
}

// 图表数据
const chartData = ref({
  workshopData: { x: [], y: [] },
  trendData: { x: [], y: [] },
  categoryData: []
})
const renderCharts = () => {
  try {
    // 柱形图
    const barChartDom = document.getElementById('barChart')
    if (!barChartDom) {
      return
    }
    const barChart = echarts.init(barChartDom)
    barChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}件'
    },
    xAxis: {
      type: 'category',
      data: chartData.value.workshopData.x.length > 0 ? chartData.value.workshopData.x : ['数码印刷', '轮转机', '跟单', '设计', '品检'],
      axisLine: { show: true },
      axisTick: { show: true },
      splitLine: { show: false },
      axisLabel: { rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: true },
      axisTick: { show: true },
      splitLine: { show: false },
      name: '投诉数量'
    },
    grid: { show: false, left: 50, right: 20, top: 30, bottom: 60 },
    series: [{
      type: 'bar',
      data: chartData.value.workshopData.y.length > 0 ? chartData.value.workshopData.y : [12, 20, 15, 8, 18],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: '#67C23A' }
        ])
      }
    }]
  })

  // 折线图
  const lineChartDom = document.getElementById('lineChart')
  if (!lineChartDom) {
    return
  }
  const lineChart = echarts.init(lineChartDom)
  lineChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}件'
    },
    xAxis: {
      type: 'category',
      data: chartData.value.trendData.x.length > 0 ? chartData.value.trendData.x : ['一月', '二月', '三月', '四月', '五月', '六月'],
      axisLine: { show: true },
      axisTick: { show: true },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: true },
      axisTick: { show: true },
      splitLine: { show: false },
      name: '投诉数量'
    },
    grid: { show: false, left: 50, right: 20, top: 30, bottom: 30 },
    series: [{
      type: 'line',
      data: chartData.value.trendData.y.length > 0 ? chartData.value.trendData.y : [5, 8, 6, 12, 10, 15],
      smooth: true,
      lineStyle: { color: '#67C23A', width: 3 },
      itemStyle: { color: '#67C23A' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
          { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
        ])
      }
    }]
  })

  // 玫瑰图
  const roseChartDom = document.getElementById('roseChart')
  if (!roseChartDom) {
    return
  }
  const roseChart = echarts.init(roseChartDom)
  roseChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}件 ({d}%)'
    },
    legend: {
      show: true,
      orient: 'vertical',
      left: 'left',
      top: 'center'
    },
    series: [{
      name: '不良类别',
      type: 'pie',
      roseType: 'area',
      radius: [30, 80],
      center: ['65%', '50%'],
      data: chartData.value.categoryData.length > 0 ? chartData.value.categoryData : [
        { value: 10, name: '印刷不良' },
        { value: 15, name: '裁切不良' },
        { value: 8, name: '装订不良' },
        { value: 20, name: '表面不良' },
        { value: 12, name: '其它不良' }
      ],
      label: {
        show: true,
        fontWeight: 'bold',
        formatter: '{b}\n{d}%'
      },
      itemStyle: {
        borderRadius: 5,
        borderColor: '#fff',
        borderWidth: 2
      }
    }]
  })
  } catch (error) {
    // 图表渲染失败，静默处理
  }
}
const fetchChartData = async () => {
  try {
    const token = localStorage.getItem('token')

    // 获取车间统计数据
    const workshopRes = await axios.get('/api/complaint/workshop-stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: selectedMonth.value + '-01',
        endDate: selectedMonth.value + '-31'
      }
    }).catch(() => ({ data: { success: false } }))

    if (workshopRes.data.success) {
      chartData.value.workshopData = workshopRes.data.data
    } else {
      // 使用统计卡片数据作为备选
      const workshops = statUnits.value.map(unit => unit.unit)
      const counts = statUnits.value.map(unit => unit.inner + unit.outer)
      chartData.value.workshopData = { x: workshops, y: counts }
    }

    // 获取趋势数据（最近6个月）
    const trendRes = await axios.get('/api/complaint/trend-stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: { months: 6 }
    }).catch(() => ({ data: { success: false } }))

    if (trendRes.data.success) {
      chartData.value.trendData = trendRes.data.data
    } else {
      // 使用模拟数据
      const months = []
      const counts = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push((date.getMonth() + 1) + '月')
        counts.push(Math.floor(Math.random() * 20) + 5)
      }
      chartData.value.trendData = { x: months, y: counts }
    }

    // 获取不良类别分布数据
    const categoryRes = await axios.get('/api/complaint/category-stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: selectedMonth.value + '-01',
        endDate: selectedMonth.value + '-31'
      }
    }).catch(() => ({ data: { success: false } }))

    if (categoryRes.data.success) {
      chartData.value.categoryData = categoryRes.data.data
    }

  } catch (error) {
    // 获取图表数据失败，静默处理
  }

  // 刷新图表
  nextTick(() => renderCharts())
}

const handlePageChange = (val) => {
  page.value = val
  gotoPage.value = val
  fetchTableData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  fetchTableData()
}

const jumpToPage = (val) => {
  if (val >= 1 && val <= pageCount.value) {
    page.value = val
    fetchTableData()
  }
}

// 简单搜索方法
const handleSimpleSearch = () => {
  isAdvancedQuery.value = false
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 高级查询方法
const handleAdvancedQuery = () => {
  isAdvancedQuery.value = true
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 处理投诉表单成功提交
const handleComplaintSuccess = () => {
  showComplaintDialog.value = false
  ElMessage.success('投诉记录添加成功')
  // 刷新表格数据和统计数据
  fetchTableData()
  fetchStats()
}

// 重置高级查询
const resetAdvancedQuery = () => {
  advancedQuery.value = {
    customer: '',
    orderNo: '',
    productName: '',
    workshop: '',
    complaintCategory: '',
    customerComplaintType: '',
    defectiveCategory: '',
    mainDept: '',
    mainPerson: '',
    dateRange: null,
    defectiveRateMin: null,
    defectiveRateMax: null,
    returnGoods: '',
    isReprint: ''
  }
  isAdvancedQuery.value = false
  page.value = 1
  fetchTableData()
}

// 获取下拉选项数据
const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })

    workshopOptions.value = res.data.workshops.map(item => item.Name)
    complaintCategoryOptions.value = res.data.complaintCategories.map(item => item.Name)
    customerComplaintTypeOptions.value = res.data.customerComplaintTypes.map(item => item.Name)
    defectiveCategoryOptions.value = res.data.defectiveCategories.map(item => item.Name)
    departmentOptions.value = res.data.departments.map(item => item.Name)
    personOptions.value = res.data.persons.map(item => item.Name)
  } catch (error) {
    // 获取下拉选项失败，静默处理
  }
}

// 获取车间标签类型
const getWorkshopTagType = (workshop) => {
  const typeMap = {
    '数码印刷': 'primary',
    '轮转机': 'success',
    '跟单': 'warning',
    '设计': 'info',
    '品检': 'danger'
  }
  return typeMap[workshop] || 'primary'
}

// 获取单位卡片样式类
const getUnitCardClass = (type, index) => {
  const baseClasses = ['card-unit']

  // 根据类型添加不同的样式
  if (type === 'workshop') {
    baseClasses.push('card-workshop')
  } else {
    baseClasses.push('card-department')
  }

  // 添加索引样式以保持颜色多样性
  baseClasses.push(`card-unit${index % 6}`)

  return baseClasses.join(' ')
}

// 查看详情
const viewDetail = async (row) => {
  try {
    detailLoading.value = true
    const token = localStorage.getItem('token')

    const response = await axios.get(`/api/complaint/detail/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      detailData.value = response.data.data

      // 确保字段信息已加载，如果没有则先加载
      if (exportFields.value.length === 0) {
        detailFieldsLoading.value = true
        await fetchExportFields()
        detailFieldsLoading.value = false
      }

      // 组织详情字段显示
      detailSections.value = organizeDetailFields()

      showDetailDialog.value = true
    } else {
      ElMessage.error(response.data.message || '获取详情失败')
    }
  } catch (error) {
    ElMessage.error('获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 表格行双击事件处理
const handleRowDoubleClick = (row) => {
  // 调用查看详情函数，实现与"查看详情"按钮相同的效果
  viewDetail(row)
}

// 获取编辑表单下拉选项数据
/**
 * 获取编辑表单下拉选项数据
 */
const fetchEditOptions = async () => {
  try {
    const token = localStorage.getItem('token')

    // 并行获取表单选项和材料名称
    const [optionsResponse] = await Promise.all([
      axios.get('/api/complaint/options', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetchEditMaterialNames()
    ])

    // 参考新增投诉的实现，直接访问response.data而不是response.data.data
    const data = optionsResponse.data
    editOptions.workshops = data.workshops?.map(item => item.Name) || []
    editOptions.departments = data.departments?.map(item => item.Name) || []
    editOptions.persons = data.persons?.map(item => item.Name) || []
    editOptions.complaintCategories = data.complaintCategories?.map(item => item.Name) || []
    editOptions.customerComplaintTypes = data.customerComplaintTypes?.map(item => item.Name) || []
    // 不良类别需要保持对象格式，因为需要ID来获取不良项
    editOptions.defectiveCategories = data.defectiveCategories || []
    editOptions.defectiveItems = [] // 初始为空，根据不良类别动态加载

  } catch (error) {
    ElMessage.error('获取下拉选项失败: ' + (error.response?.data?.message || error.message))
  }
}

/**
 * 获取编辑表单材料名称列表
 */
const fetchEditMaterialNames = async () => {
  try {
    editMaterialLoading.value = true;
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/admin/material-prices/material-names', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.success) {
      editMaterialNames.value = res.data.data || [];
    } else {
      // 获取材料名称列表失败，静默处理
    }
  } catch (error) {
    // 不显示错误消息，因为这不是关键功能
  } finally {
    editMaterialLoading.value = false;
  }
}

/**
 * 处理编辑表单材料选择变更事件
 *
 * @param {string} materialType - 材料类型（Paper, MaterialA, MaterialB, MaterialC）
 * @param {string} materialName - 选择的材料名称
 */
const handleEditMaterialChange = async (materialType, materialName) => {
  if (!materialName) {
    return;
  }

  // 检查缓存
  const cacheKey = materialName;
  if (editPriceCache[cacheKey]) {
    setEditMaterialPrice(materialType, editPriceCache[cacheKey]);
    // 如果是纸张，触发人工成本计算
    if (materialType === 'Paper') {
      calculateEditLaborCost();
    }
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/admin/material-prices/get-price', {
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
          clearEditMaterialPrice(materialType);
        } else {
          // 缓存价格信息
          editPriceCache[cacheKey] = price;

          // 设置单价
          setEditMaterialPrice(materialType, price);

          // 如果是纸张，触发人工成本计算
          if (materialType === 'Paper') {
            calculateEditLaborCost();
          }

          // 显示成功消息
          ElMessage.success(`已自动填入${materialName}的单价：￥${price.unitPrice}`);
        }
      } else {
        // 价格为null或undefined时的提示
        ElMessage.warning(`未找到材料"${materialName}"的价格信息，请联系管理员新增价格数据`);
        // 清空价格字段
        clearEditMaterialPrice(materialType);
      }
    } else {
      ElMessage.warning(`未找到材料"${materialName}"的价格信息，请联系管理员新增价格数据`);
      // 清空价格字段
      clearEditMaterialPrice(materialType);
    }
  } catch (error) {
    ElMessage.warning(`获取材料"${materialName}"价格失败，请联系管理员新增价格数据`);
    // 清空价格字段
    clearEditMaterialPrice(materialType);
  }
}

/**
 * 设置编辑表单材料单价
 *
 * @param {string} materialType - 材料类型
 * @param {object} priceInfo - 价格信息对象
 */
const setEditMaterialPrice = (materialType, priceInfo) => {
  const priceFieldMap = {
    'Paper': 'PaperUnitPrice',
    'MaterialA': 'MaterialAUnitPrice',
    'MaterialB': 'MaterialBUnitPrice',
    'MaterialC': 'MaterialCUnitPrice'
  };

  const priceField = priceFieldMap[materialType];
  if (priceField && priceInfo.unitPrice !== null && editFormData.value) {
    editFormData.value[priceField] = priceInfo.unitPrice;
    // 单价变化后，触发总成本计算
    calculateEditTotalCost();
  }
}

/**
 * 清空编辑表单材料单价
 *
 * @param {string} materialType - 材料类型
 */
const clearEditMaterialPrice = (materialType) => {
  const priceFieldMap = {
    'Paper': 'PaperUnitPrice',
    'MaterialA': 'MaterialAUnitPrice',
    'MaterialB': 'MaterialBUnitPrice',
    'MaterialC': 'MaterialCUnitPrice'
  };

  const priceField = priceFieldMap[materialType];
  if (priceField && editFormData.value) {
    editFormData.value[priceField] = 0;
    // 单价变化后，触发总成本计算
    calculateEditTotalCost();
  }
}

/**
 * 计算编辑表单的人工成本
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
const calculateEditLaborCost = () => {
  if (!editFormData.value) {
    return;
  }

  const paperQty = editFormData.value.PaperQty; // 纸张数量（长度）
  const workshop = editFormData.value.Workshop; // 发生车间

  // 如果纸张数量或车间为空，清空人工成本
  if (!paperQty || !workshop) {
    editFormData.value.LaborCost = 0;
    calculateEditTotalCost(); // 触发总成本重新计算
    return;
  }

  // 确保纸张数量是数字
  const length = Number(paperQty);
  if (isNaN(length) || length <= 0) {
    editFormData.value.LaborCost = 0;
    calculateEditTotalCost(); // 触发总成本重新计算
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
  editFormData.value.LaborCost = laborCost;



  // 人工成本变化后，触发总成本计算
  calculateEditTotalCost();
}

/**
 * 计算编辑表单的总成本
 * 根据各材料成本和人工成本自动计算总成本
 *
 * 计算公式：
 * 纸张成本 = (纸张规格/1000) × 纸张数量 × 纸张单价
 * 材料A成本 = (材料A规格/1000) × 材料A数量 × 材料A单价
 * 材料B成本 = (材料B规格/1000) × 材料B数量 × 材料B单价
 * 材料C成本 = (材料C规格/1000) × 材料C数量 × 材料C单价
 * 总成本 = 纸张成本 + 材料A成本 + 材料B成本 + 材料C成本 + 人工费用
 */
const calculateEditTotalCost = () => {
  if (!editFormData.value) {
    return;
  }

  // 获取表单数据
  const formData = editFormData.value;

  // 计算纸张成本：(纸张规格/1000) × 纸张数量 × 纸张单价
  const paperCost = calculateEditMaterialCost(
    formData.PaperSpecification,
    formData.PaperQty,
    formData.PaperUnitPrice
  );

  // 计算材料A成本：(材料A规格/1000) × 材料A数量 × 材料A单价
  const materialACost = calculateEditMaterialCost(
    formData.MaterialASpec,
    formData.MaterialAQty,
    formData.MaterialAUnitPrice
  );

  // 计算材料B成本：(材料B规格/1000) × 材料B数量 × 材料B单价
  const materialBCost = calculateEditMaterialCost(
    formData.MaterialBSpec,
    formData.MaterialBQty,
    formData.MaterialBUnitPrice
  );

  // 计算材料C成本：(材料C规格/1000) × 材料C数量 × 材料C单价
  const materialCCost = calculateEditMaterialCost(
    formData.MaterialCSpec,
    formData.MaterialCQty,
    formData.MaterialCUnitPrice
  );

  // 获取人工费用
  const laborCost = Number(formData.LaborCost) || 0;

  // 计算总成本
  const totalCost = paperCost + materialACost + materialBCost + materialCCost + laborCost;

  // 四舍五入到2位小数，如果为0则保持0
  editFormData.value.TotalCost = totalCost === 0 ? 0 : Math.round(totalCost * 100) / 100;



  // 总成本变化后，触发主责人考核计算
  calculateEditMainPersonAssessment();
}

/**
 * 计算编辑表单的主责人考核金额
 * 根据总成本自动计算主责人考核金额
 *
 * 计算规则：
 * 1. 如果总成本 > 0，则主责人考核金额 = 总成本 × 50%
 * 2. 如果主责人考核金额不足20元，则计为20元
 */
const calculateEditMainPersonAssessment = () => {
  if (!editFormData.value) {
    return;
  }

  const totalCost = Number(editFormData.value.TotalCost) || 0;

  // 如果总成本为0或负数，主责人考核金额为0
  if (totalCost <= 0) {
    editFormData.value.MainPersonAssessment = 0;
    return;
  }

  // 计算主责人考核金额：总成本 × 50%
  let assessmentAmount = totalCost * 0.5;

  // 如果考核金额不足20元，则计为20元
  if (assessmentAmount < 20) {
    assessmentAmount = 20;
  }

  // 四舍五入到2位小数
  editFormData.value.MainPersonAssessment = Math.round(assessmentAmount * 100) / 100;


}

/**
 * 计算编辑表单单个材料的成本
 *
 * @param {number} spec - 材料规格
 * @param {number} qty - 材料数量
 * @param {number} unitPrice - 材料单价
 * @returns {number} 材料成本
 */
const calculateEditMaterialCost = (spec, qty, unitPrice) => {
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

// 处理不良类别变化（编辑表单）
const handleEditCategoryChange = async (categoryObj) => {

  // 清空不良项选择
  if (editFormData.value) {
    editFormData.value.DefectiveItem = ''
  }
  editOptions.defectiveItems = []

  if (!categoryObj || !categoryObj.ID) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`/api/complaint/defective-items/${categoryObj.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    // 参考新增投诉的实现，后端直接返回字符串数组
    editOptions.defectiveItems = response.data || []
  } catch (error) {
    editOptions.defectiveItems = []
    ElMessage.error('获取不良项失败: ' + (error.response?.data?.message || error.message))
  }
}

// 编辑记录
const editRecord = async (row) => {
  try {
    editFormLoading.value = true
    const token = localStorage.getItem('token')

    // 先获取下拉选项数据
    await fetchEditOptions()

    // 获取记录详情
    const response = await axios.get(`/api/complaint/detail/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      const data = response.data.data

      // 初始化编辑表单数据
      const formData = {
        ID: data.ID,
        Date: data.Date ? data.Date.split('T')[0] : '',
        Customer: data.Customer || '',
        OrderNo: data.OrderNo || '',
        ProductName: data.ProductName || '',
        Specification: data.Specification || '',
        Workshop: data.Workshop || '',
        ProductionQty: data.ProductionQty || 0,
        DefectiveQty: data.DefectiveQty || 0,
        DefectiveRate: data.DefectiveRate || 0,
        ComplaintCategory: data.ComplaintCategory || '',
        CustomerComplaintType: data.CustomerComplaintType || '',
        DefectiveCategory: data.DefectiveCategory || '',
        DefectiveItem: data.DefectiveItem || '',
        DefectiveDescription: data.DefectiveDescription || '',
        AttachmentFile: data.AttachmentFile || '',
        DefectiveReason: data.DefectiveReason || '',
        Disposition: data.Disposition || '',
        ReturnGoods: data.ReturnGoods === '是' || data.ReturnGoods === true || data.ReturnGoods === 1,
        IsReprint: data.IsReprint === '是' || data.IsReprint === true || data.IsReprint === 1,
        ReprintQty: data.ReprintQty || 0,
        Paper: data.Paper || '',
        PaperSpecification: data.PaperSpecification || '',
        PaperQty: data.PaperQty || 0,
        PaperUnitPrice: data.PaperUnitPrice || 0,
        MaterialA: data.MaterialA || '',
        MaterialASpec: data.MaterialASpec || '',
        MaterialAQty: data.MaterialAQty || 0,
        MaterialAUnitPrice: data.MaterialAUnitPrice || 0,
        MaterialB: data.MaterialB || '',
        MaterialBSpec: data.MaterialBSpec || '',
        MaterialBQty: data.MaterialBQty || 0,
        MaterialBUnitPrice: data.MaterialBUnitPrice || 0,
        MaterialC: data.MaterialC || '',
        MaterialCSpec: data.MaterialCSpec || '',
        MaterialCQty: data.MaterialCQty || 0,
        MaterialCUnitPrice: data.MaterialCUnitPrice || 0,
        LaborCost: data.LaborCost || 0,
        TotalCost: data.TotalCost || 0,
        MainDept: data.MainDept || '',
        MainPerson: data.MainPerson || '',
        MainPersonAssessment: data.MainPersonAssessment || 0,
        SecondPerson: data.SecondPerson || '',
        SecondPersonAssessment: data.SecondPersonAssessment || 0,
        Manager: data.Manager || '',
        ManagerAssessment: data.ManagerAssessment || 0,
        AssessmentDescription: data.AssessmentDescription || ''
      }

      editFormData.value = formData

      // 初始化文件信息
      if (data.AttachmentFile) {
        const filePath = data.AttachmentFile
        const fileName = filePath.split(/[\/\\]/).pop() || filePath

        // 判断文件类型
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
        const isImage = imageExtensions.includes(extension)

        editSelectedFileInfo.value = {
          fileName: fileName,
          fileSize: 0, // 现有文件大小未知
          fileType: isImage ? 'image/*' : 'application/octet-stream',
          isImage: isImage,
          previewUrl: null, // 现有文件使用API预览
          relativePath: filePath,
          serverPath: null,
          file: null,
          uploaded: true,
          isExisting: true // 标记为现有文件
        }
      } else {
        editSelectedFileInfo.value = null
      }

      // 如果有不良类别，需要找到对应的不良类别对象并加载不良项
      if (data.DefectiveCategory) {
        // 从下拉选项中找到匹配的不良类别对象
        const categoryObj = editOptions.defectiveCategories.find(cat =>
          cat.Name === data.DefectiveCategory || cat.ID === data.DefectiveCategory
        )
        if (categoryObj) {
          // 更新表单数据为对象格式
          editFormData.value.DefectiveCategory = categoryObj
          // 加载对应的不良项
          await handleEditCategoryChange(categoryObj)
        }
      }

      // 确保字段信息已加载，如果没有则先加载
      if (exportFields.value.length === 0) {
        await fetchExportFields()
      }

      // 组织编辑字段显示
      editSections.value = organizeEditFields()

      // 初始化tab状态
      activeTab.value = {
        '材料明细': 'paper'
      }

      // 递增对话框实例ID，确保每次打开都创建新的组件实例
      editDialogInstanceId.value++
      console.log(`编辑对话框实例ID: ${editDialogInstanceId.value}`)

      showEditDialog.value = true

      // 等待DOM更新完成后再保存原始数据
      await nextTick()
      // 深拷贝保存原始数据，确保所有数据处理完成后再备份
      originalFormData.value = JSON.parse(JSON.stringify(editFormData.value))
    } else {
      ElMessage.error(response.data.message || '获取记录详情失败')
    }
  } catch (error) {
    ElMessage.error('获取编辑数据失败')
  } finally {
    editFormLoading.value = false
  }
}

// 保存编辑
const saveEdit = async () => {
  try {
    // 检查数据是否有变更
    if (!hasDataChanged()) {
      ElMessage.primary('数据未发生变更，无需保存')
      return
    }

    // 确认保存
    try {
      await ElMessageBox.confirm(
        '确定要保存当前修改吗？',
        '确认保存',
        {
          confirmButtonText: '确定保存',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'save-confirm-dialog'
        }
      )
    } catch {
      // 用户取消保存
      return
    }

    // 表单验证
    if (!editFormRef.value) {
      ElMessage.error('表单引用未找到')
      return
    }

    // 跳过表单验证，因为动态表单可能有验证问题
    // const valid = await editFormRef.value.validate()
    // if (!valid) {
    //   ElMessage.error('请填写必填字段')
    //   return
    // }

    editFormLoading.value = true
    const token = localStorage.getItem('token')

    if (!token) {
      ElMessage.error('未找到登录令牌，请重新登录')
      editFormLoading.value = false
      return
    }

    // 检查必要的数据
    if (!editFormData.value || !editFormData.value.ID) {
      ElMessage.error('缺少记录ID')
      editFormLoading.value = false
      return
    }

    // 处理数据格式，特别是布尔值
    const submitData = { ...editFormData.value }

    // 转换布尔值为数据库bit类型（true/false）
    submitData.ReturnGoods = Boolean(submitData.ReturnGoods)
    submitData.IsReprint = Boolean(submitData.IsReprint)

    // 处理不良类别格式：如果是对象，转换为字符串
    if (submitData.DefectiveCategory && typeof submitData.DefectiveCategory === 'object') {
      submitData.DefectiveCategory = submitData.DefectiveCategory.Name || submitData.DefectiveCategory
    }

    // 确保数字字段不为空
    const numberFields = ['ProductionQty', 'DefectiveQty', 'DefectiveRate', 'ReprintQty',
                         'PaperQty', 'PaperUnitPrice', 'MaterialAQty', 'MaterialAUnitPrice',
                         'MaterialBQty', 'MaterialBUnitPrice', 'MaterialCQty', 'MaterialCUnitPrice',
                         'LaborCost', 'TotalCost', 'MainPersonAssessment', 'SecondPersonAssessment', 'ManagerAssessment']

    numberFields.forEach(field => {
      if (submitData[field] === null || submitData[field] === undefined || submitData[field] === '') {
        submitData[field] = 0
      }
    })

    // 确保必填字段不为空
    const requiredFields = ['Customer', 'OrderNo', 'ProductName', 'Workshop']
    for (const field of requiredFields) {
      if (!submitData[field] || submitData[field] === '' || submitData[field] === null || submitData[field] === undefined) {
        ElMessage.error(`${field}为必填项，请填写`)
        editFormLoading.value = false
        return
      }
    }

    // 确保日期字段格式正确
    if (!submitData.Date) {
      ElMessage.error('请选择投诉日期')
      editFormLoading.value = false
      return
    }

    // 确保字符串字段不为undefined
    const stringFields = ['Customer', 'OrderNo', 'ProductName', 'Specification', 'Workshop',
                         'ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem',
                         'DefectiveDescription', 'DefectiveReason', 'Disposition', 'AttachmentFile',
                         'Paper', 'PaperSpecification', 'MaterialA', 'MaterialASpec', 'MaterialB', 'MaterialBSpec',
                         'MaterialC', 'MaterialCSpec', 'MainDept', 'MainPerson', 'SecondPerson', 'Manager', 'AssessmentDescription']

    stringFields.forEach(field => {
      if (submitData[field] === null || submitData[field] === undefined) {
        submitData[field] = ''
      }
    })

    // 如果有未上传的文件，先上传文件
    if (editSelectedFileInfo.value && !editSelectedFileInfo.value.uploaded && editSelectedFileInfo.value.file) {
      try {
        const uploadResult = await uploadEditFileToServer(
          editSelectedFileInfo.value.file,
          editSelectedFileInfo.value.generatedFileName
        )

        if (uploadResult.success) {
          // 更新表单数据中的附件路径为服务器返回的路径
          submitData.AttachmentFile = uploadResult.relativePath
        } else {
          throw new Error('文件上传失败')
        }
      } catch (uploadError) {
        ElMessage.error('文件上传失败，请重试')
        editFormLoading.value = false
        return
      }
    }

    const response = await axios.put(`/api/complaint/${submitData.ID}`, submitData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.success) {
      ElMessage.success('更新成功')

      // 清理图片预览缓存
      if (editFormData.value.ID) {
        const cacheKey = `record_${editFormData.value.ID}`
        console.log(`保存成功后清理缓存: ${cacheKey}`)
        // 导入imagePreviewService并清理缓存
        import('@/services/imagePreviewService.js').then(module => {
          module.default.clearCache(cacheKey)
        })
      }

      showEditDialog.value = false
      // 刷新表格数据和统计卡片
      await Promise.all([
        fetchTableData(),
        fetchStats()
      ])
    } else {
      ElMessage.error(response.data?.message || '更新失败')
    }
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      // 可以在这里跳转到登录页面
    } else if (error.response?.status === 404) {
      ElMessage.error('请求的资源不存在，请检查数据')
    } else if (error.response && error.response.data) {
      ElMessage.error(error.response.data.message || '保存失败')
    } else if (error.message) {
      ElMessage.error('保存失败: ' + error.message)
    } else {
      ElMessage.error('保存失败: 未知错误')
    }
  } finally {
    editFormLoading.value = false
  }
}

// 检查数据是否有变更
const hasDataChanged = () => {
  // 如果原始数据为空或者没有ID，说明还没有正确初始化，不应该判断为有变更
  if (!originalFormData.value || !originalFormData.value.ID || !editFormData.value || !editFormData.value.ID) {
    return false
  }

  // 比较所有字段
  const originalKeys = Object.keys(originalFormData.value)
  const currentKeys = Object.keys(editFormData.value)

  // 检查字段数量是否相同
  if (originalKeys.length !== currentKeys.length) {
    return true
  }

  // 逐个比较字段值
  for (const key of originalKeys) {
    const originalValue = originalFormData.value[key]
    const currentValue = editFormData.value[key]

    // 特殊处理对象类型（如不良类别）
    if (typeof originalValue === 'object' && originalValue !== null &&
        typeof currentValue === 'object' && currentValue !== null) {
      const originalStr = JSON.stringify(originalValue)
      const currentStr = JSON.stringify(currentValue)
      if (originalStr !== currentStr) {
        return true
      }
    } else {
      // 统一转换为字符串进行比较，处理null/undefined/空字符串的情况
      const originalStr = (originalValue === null || originalValue === undefined) ? '' : String(originalValue)
      const currentStr = (currentValue === null || currentValue === undefined) ? '' : String(currentValue)

      if (originalStr !== currentStr) {
        return true
      }
    }
  }

  return false
}

// 文件选择功能
const selectedFile = ref(null)
const selectedFileHandle = ref(null)
const fileUploading = ref(false)

// 判断是否为图片文件
const isImageFile = (fileName) => {
  if (!fileName) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return imageExtensions.includes(extension)
}

// 智能获取API基础URL - 使用现有的环境管理系统
const getApiBaseUrl = () => {
  // 使用axios的当前baseURL，这个已经通过smartApiDetector智能设置了
  if (axios.defaults.baseURL) {
    console.log('使用axios默认baseURL:', axios.defaults.baseURL)
    return axios.defaults.baseURL
  }

  // 降级方案：使用localStorage中保存的api-base
  const savedApiBase = localStorage.getItem('api-base')
  if (savedApiBase) {
    console.log('使用localStorage中的api-base:', savedApiBase)
    return savedApiBase
  }

  // 最后降级：使用环境变量
  const envApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  console.log('使用环境变量VITE_API_BASE_URL:', envApiBase)
  return envApiBase
}

// 判断文件路径类型并生成正确的预览URL
const getFilePreviewUrl = (filePath) => {
  if (!filePath || filePath === '' || filePath === null || filePath === undefined) {
    console.log('getFilePreviewUrl: 路径为空，返回null')
    return null
  }

  console.log('=== getFilePreviewUrl 调试信息 ===')
  console.log('输入路径:', filePath)
  console.log('路径类型:', typeof filePath)

  try {
    // 确保filePath是字符串
    const pathStr = String(filePath).trim()
    if (!pathStr) {
      console.log('路径转换为字符串后为空')
      return null
    }

    // 判断是否为服务器上传的文件
    // 1. 包含file_时间戳格式
    // 2. 或者路径以uploads/开头（相对路径）
    // 3. 或者不包含网络路径特征（如\\tj_server\）
    const hasFilePrefix = pathStr.includes('file_') && /file_\d+_/.test(pathStr)
    const isRelativePath = pathStr.startsWith('uploads/') || pathStr.startsWith('./uploads/') || pathStr.startsWith('/uploads/')
    const isNetworkPath = pathStr.includes('\\\\') || pathStr.includes('tj_server') || pathStr.includes('工作\\品质部')

    console.log('路径分析:', {
      hasFilePrefix,
      isRelativePath,
      isNetworkPath,
      pathLength: pathStr.length
    })

    const isServerUpload = hasFilePrefix || isRelativePath || !isNetworkPath

    console.log('判断结果: isServerUpload =', isServerUpload)

    if (isServerUpload) {
      // 服务器上传的文件，使用智能检测的后端API地址
      const backendUrl = getApiBaseUrl()
      const pathParts = pathStr.split(/[\/\\]/).filter(part => part.trim() !== '')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const finalUrl = `${backendUrl}/files/attachments/${encodedPath}`
      console.log('生成服务器URL:', finalUrl)
      console.log('================================')
      return finalUrl
    } else {
      // 网络共享路径的文件，使用动态检测的后端地址
      const backendUrl = getApiBaseUrl()
      const pathParts = pathStr.split(/[\/\\]/).filter(part => part.trim() !== '')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const finalUrl = `${backendUrl}/shared-files/${encodedPath}`
      console.log('生成网络URL:', finalUrl)
      console.log('================================')
      return finalUrl
    }
  } catch (error) {
    console.error('getFilePreviewUrl 处理错误:', error)
    return null
  }
}

// 编辑对话框：生成文件名（与ComplaintFormDialog.vue保持一致）
const generateEditFileName = async (originalFileName) => {
  // 使用表单中的Date字段，而不是当前日期
  const formDate = editFormData.value.Date
  if (!formDate) {
    throw new Error('请先选择投诉日期')
  }

  const date = new Date(formDate)
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  // 获取文件扩展名
  const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'))

  // 从表单数据获取信息
  const customer = editFormData.value.Customer?.trim() || ''
  const orderNo = editFormData.value.OrderNo?.trim() || ''
  const productName = editFormData.value.ProductName?.trim() || ''

  // 处理不良类别字段，可能是字符串或对象
  let defectiveCategory = ''
  if (editFormData.value.DefectiveCategory) {
    if (typeof editFormData.value.DefectiveCategory === 'string') {
      defectiveCategory = editFormData.value.DefectiveCategory.trim()
    } else if (editFormData.value.DefectiveCategory.Name) {
      defectiveCategory = editFormData.value.DefectiveCategory.Name.trim()
    }
  }

  // 检查必填字段
  if (!customer || !orderNo || !productName || !defectiveCategory) {
    throw new Error('请先填写客户编号、工单号、产品名称和不良类别')
  }

  // 获取流水号
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/complaint/sequence-number', {
      params: {
        date: formDate, // 使用表单中的日期
        editId: editFormData.value.ID // 编辑模式时排除当前记录
      },
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const sequenceNumber = String(response.data.sequenceNumber).padStart(2, '0')

    // 生成文件名：客户编号 工单号 产品名称-不良类别 日期流水号.扩展名
    const generatedFileName = `${customer} ${orderNo} ${productName}-${defectiveCategory} ${dateStr}${sequenceNumber}${fileExtension}`

    return generatedFileName
  } catch (error) {
    console.error('获取流水号失败:', error)
    // 如果获取流水号失败，使用01作为默认值
    const generatedFileName = `${customer} ${orderNo} ${productName}-${defectiveCategory} ${dateStr}01${fileExtension}`
    return generatedFileName
  }
}

// 编辑对话框：生成相对路径（与ComplaintFormDialog.vue保持一致）
const generateEditRelativePath = async (generatedFileName) => {
  const currentYear = new Date().getFullYear()
  const customer = editFormData.value.Customer?.trim()

  // 检查客户编号是否为空
  if (!customer) {
    throw new Error('请先填写客户编号')
  }

  // 生成Windows格式的相对路径
  const relativePath = `${currentYear}年异常汇总\\不良图片&资料\\${customer}\\${generatedFileName}`

  return relativePath
}

// 编辑对话框：上传文件到服务器（在保存时调用）
const uploadEditFileToServer = async (file, generatedFileName) => {
  try {
    // 创建FormData
    const formData = new FormData()

    // 创建一个新的File对象，使用生成的文件名
    const renamedFile = new File([file], generatedFileName, { type: file.type })
    formData.append('file', renamedFile)

    // 添加自定义路径参数
    const currentYear = new Date().getFullYear()
    const customer = editFormData.value.Customer?.trim()
    const customPath = `${currentYear}年异常汇总\\不良图片&资料\\${customer}`
    formData.append('customPath', customPath)

    // 获取token
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未找到认证令牌，请重新登录')
    }

    // 上传文件
    const response = await axios.post('/api/upload/complaint-attachment', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data && response.data.success) {
      // 标记文件为已上传
      if (editSelectedFileInfo.value) {
        editSelectedFileInfo.value.uploaded = true
        editSelectedFileInfo.value.serverPath = response.data.serverPath
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

// 上传文件到服务器（旧版本，保留兼容性）
const uploadFileToServer = async (file) => {
  try {
    // 创建FormData对象
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'attachment') // 标识为附件文件

    // 上传文件到服务器
    const token = localStorage.getItem('token')
    const response = await axios.post('/api/upload/complaint-attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('服务器上传响应:', response.data)

    if (response.data && response.data.success) {
      // 更新表单字段
      editFormData.value.AttachmentFile = response.data.relativePath

      // 强制刷新组件 - 通过nextTick确保DOM更新
      await nextTick()

      ElMessage.success('文件上传成功')
      console.log('文件上传成功:', {
        fileName: file.name,
        relativePath: response.data.relativePath,
        serverPath: response.data.serverPath
      })
      return true
    } else {
      throw new Error(response.data?.message || '文件上传失败')
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    ElMessage.error(error.response?.data?.message || error.message || '文件上传失败')
    return false
  }
}

// 编辑对话框：文件选择（延迟上传模式，与ComplaintFormDialog.vue保持一致）
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
    const value = editFormData.value[field]
    let isEmpty = false

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
        editFileUploading.value = true

        // 检查是否为图片文件
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        if (!imageExtensions.includes(extension)) {
          ElMessage.error('请选择图片文件')
          return
        }

        // 生成文件名和相对路径
        const generatedFileName = await generateEditFileName(file.name)
        const relativePath = await generateEditRelativePath(generatedFileName)

        // 创建blob URL用于预览
        const previewUrl = URL.createObjectURL(file)

        // 清理旧的文件信息
        if (editSelectedFileInfo.value?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(editSelectedFileInfo.value.previewUrl)
        }

        // 保存文件信息到临时变量（不上传）
        editSelectedFileInfo.value = {
          fileName: file.name, // 原始文件名
          generatedFileName: generatedFileName, // 生成的文件名
          fileSize: file.size,
          fileType: file.type,
          isImage: true,
          previewUrl: previewUrl, // blob URL用于预览
          relativePath: relativePath, // 生成的相对路径
          file: file, // 原始文件对象
          uploaded: false // 标记为未上传
        }

        // 设置表单字段为生成的相对路径
        editFormData.value.AttachmentFile = relativePath

        ElMessage.success('文件已选择，将在保存时上传')

      } catch (error) {
        console.error('文件处理失败:', error)
        ElMessage.error(error.message || '文件处理失败')
      } finally {
        editFileUploading.value = false
      }
    }
  }

  input.click()
}

// 判断是否应该显示图片预览
const shouldShowImagePreview = (fileInfo, filePath) => {
  // 如果有新选择的文件信息
  if (fileInfo) {
    return fileInfo.isImage && (fileInfo.previewUrl || filePath)
  }

  // 如果只有文件路径（现有文件）
  if (filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

  return false
}

// 格式化日期为本地时区的YYYY-MM-DD格式，避免UTC转换导致的日期偏移
const formatDateToLocal = (date) => {
  const d = new Date(date)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

// 清理编辑对话框资源
const cleanupEditResources = () => {
  // 清理选中文件的预览URL
  if (editSelectedFileInfo.value?.previewUrl && editSelectedFileInfo.value.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(editSelectedFileInfo.value.previewUrl)
  }

  // 重置文件相关状态
  editSelectedFileInfo.value = null
  editFileUploading.value = false
}

// 注意：图片预览功能已移至ImagePreview组件中处理

// 处理文件拖拽
const handleFileDrop = async (event) => {
  event.preventDefault()

  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    selectedFile.value = file



    // 尝试从拖拽事件获取更多路径信息
    let filePath = file.name

    // 检查DataTransferItem是否有路径信息
    const items = event.dataTransfer.items
    if (items && items.length > 0) {
      const item = items[0]
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry()
        if (entry && entry.fullPath) {
          filePath = entry.fullPath
        }
      }
    }

    // 提示用户确认或修改路径
    try {
      const { value } = await ElMessageBox.prompt(
        `已拖拽文件: ${file.name}\n\n请确认或修改文件的完整路径:`,
        '设置文件路径',
        {
          confirmButtonText: '确定',
          cancelButtonText: '仅使用文件名',
          inputValue: filePath.startsWith('/') ? `C:${filePath.replace(/\//g, '\\')}` : `C:\\Users\\Documents\\${file.name}`,
          inputPlaceholder: '例如: C:\\Users\\Documents\\Pictures\\image.jpg'
        }
      )
      editFormData.value.AttachmentFile = value || file.name
      ElMessage.success('文件路径设置成功')
    } catch {
      // 用户选择仅使用文件名
      editFormData.value.AttachmentFile = file.name
      ElMessage.success('文件选择成功（仅文件名）')
    }
  }
}

// 取消编辑
const cancelEdit = () => {
  console.log('=== Home.vue cancelEdit 清理资源 ===')

  // 清理图片预览缓存
  if (editFormData.value.ID) {
    const cacheKey = `record_${editFormData.value.ID}`
    console.log(`清理编辑对话框缓存: ${cacheKey}`)
    // 导入imagePreviewService并清理缓存
    import('@/services/imagePreviewService.js').then(module => {
      module.default.clearCache(cacheKey)
    })
  }

  showEditDialog.value = false
  editFormData.value = {}
  originalFormData.value = {}
  selectedFile.value = null // 清理文件选择状态
  selectedFileHandle.value = null // 清理文件句柄状态

  console.log('=== 编辑对话框资源清理完成 ===')
}

// 删除记录
const deleteRecord = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条投诉记录吗？\n\n客户编号：${row.Customer}\n工单号：${row.OrderNo}\n产品名称：${row.ProductName}\n\n此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false,
        appendToBody: true,
        lockScroll: false,
        modal: true,
        modalClass: 'delete-confirm-modal'
      }
    )

    const token = localStorage.getItem('token')
    const response = await axios.delete(`/api/complaint/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      ElMessage.success('删除成功')
      // 刷新表格数据和统计卡片
      await Promise.all([
        fetchTableData(),
        fetchStats()
      ])
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除记录失败')
    }
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 格式化字段值
const formatFieldValue = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  switch (field.type) {
    case 'date':
      return formatDate(value)
    case 'boolean':
      return value ? '是' : '否'
    case 'number':
    case 'decimal':
      return value || 0
    default:
      return value
  }
}

// 判断是否为全宽字段
const isFullWidthField = (field) => {
  const fullWidthKeys = ['DefectiveDescription', 'DefectiveReason', 'Disposition', 'AssessmentDescription']
  return fullWidthKeys.includes(field.key) || field.key.includes('Description') || field.key.includes('Reason')
}

// 获取字段值的CSS类
const getFieldValueClass = (field) => {
  const classes = []

  if (isFullWidthField(field)) {
    classes.push('text-content')
  }

  if (field.key.includes('Qty') && field.key !== 'ProductionQty') {
    classes.push('highlight-error')
  } else if (field.key === 'ProductionQty') {
    classes.push('highlight-number')
  }

  return classes.join(' ')
}

// 组织详情字段为分组显示
const organizeDetailFields = () => {
  if (!exportFields.value || exportFields.value.length === 0) {
    return []
  }

  // 定义字段分组 - 根据实际数据库字段
  const fieldGroups = {
    basic: {
      title: '基本信息',
      icon: 'InfoFilled',
      iconClass: '',
      fields: ['Date', 'Customer', 'OrderNo', 'ProductName', 'Specification', 'Workshop', 'ProductionQty', 'DefectiveQty', 'DefectiveRate']
    },
    complaint: {
      title: '投诉信息',
      icon: 'WarningFilled',
      iconClass: 'warning',
      fields: ['ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem', 'DefectiveDescription', 'DefectiveReason', 'Disposition']
    },
    materials: {
      title: '物料信息',
      icon: 'Document',
      iconClass: 'info',
      fields: ['Paper', 'PaperSpecification', 'PaperQty', 'PaperUnitPrice', 'MaterialA', 'MaterialASpec', 'MaterialAQty', 'MaterialAUnitPrice', 'MaterialB', 'MaterialBSpec', 'MaterialBQty', 'MaterialBUnitPrice', 'MaterialC', 'MaterialCSpec', 'MaterialCQty', 'MaterialCUnitPrice']
    },
    qualityCost: {
      title: '质量成本损失',
      icon: 'Money',
      iconClass: 'danger',
      fields: ['LaborCost', 'TotalCost']
    },
    processing: {
      title: '处理信息',
      icon: 'Tools',
      iconClass: 'success',
      fields: ['ReturnGoods', 'IsReprint', 'ReprintQty']
    },
    responsibility: {
      title: '责任信息',
      icon: 'UserFilled',
      iconClass: 'success',
      fields: ['MainDept', 'MainPerson', 'MainPersonAssessment', 'SecondPerson', 'SecondPersonAssessment', 'Manager', 'ManagerAssessment']
    },
    assessment: {
      title: '考核信息',
      icon: 'QuestionFilled',
      iconClass: 'warning',
      fields: ['AssessmentDescription']
    }
  }

  const sections = []

  Object.keys(fieldGroups).forEach(groupKey => {
    const group = fieldGroups[groupKey]

    // 处理tab结构
    if (group.isTabbed && group.tabs) {
      sections.push({
        title: group.title,
        icon: group.icon,
        iconClass: group.iconClass,
        isTabbed: true,
        tabs: group.tabs
      })
    } else {
      // 处理普通字段结构
      const groupFields = []

      if (group.fields) {
        group.fields.forEach(fieldKey => {
          const field = exportFields.value.find(f => f.key === fieldKey)
          if (field) {
            groupFields.push(field)
          }
        })
      }

      if (groupFields.length > 0) {
        sections.push({
          title: group.title,
          icon: group.icon,
          iconClass: group.iconClass,
          fields: groupFields
        })
      }
    }
  })

  return sections
}

// 组织编辑字段为分组显示
const organizeEditFields = () => {
  if (!exportFields.value || exportFields.value.length === 0) {
    return []
  }

  // 定义字段分组 - 根据实际数据库字段
  const fieldGroups = {
    basic: {
      title: '基本信息',
      icon: 'InfoFilled',
      iconClass: '',
      fields: ['Date', 'Customer', 'OrderNo', 'ProductName', 'Specification', 'Workshop', 'ProductionQty', 'DefectiveQty', 'DefectiveRate']
    },
    complaint: {
      title: '不良信息',
      icon: 'WarningFilled',
      iconClass: 'warning',
      fields: ['ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem', 'DefectiveDescription', 'DefectiveReason', 'AttachmentFile']
    },
    disposition: {
      title: '处置与补充',
      icon: 'Tools',
      iconClass: 'success',
      fields: ['Disposition', 'ReturnGoods', 'IsReprint', 'ReprintQty']
    },
    materials: {
      title: '材料明细',
      icon: 'Document',
      iconClass: 'info',
      isTabbed: true,
      tabs: [
        {
          name: 'paper',
          label: '纸张',
          fields: ['Paper', 'PaperSpecification', 'PaperQty', 'PaperUnitPrice']
        },
        {
          name: 'materialA',
          label: '材料A',
          fields: ['MaterialA', 'MaterialASpec', 'MaterialAQty', 'MaterialAUnitPrice']
        },
        {
          name: 'materialB',
          label: '材料B',
          fields: ['MaterialB', 'MaterialBSpec', 'MaterialBQty', 'MaterialBUnitPrice']
        },
        {
          name: 'materialC',
          label: '材料C',
          fields: ['MaterialC', 'MaterialCSpec', 'MaterialCQty', 'MaterialCUnitPrice']
        }
      ]
    },
    qualityCost: {
      title: '质量成本损失',
      icon: 'Money',
      iconClass: 'danger',
      fields: ['LaborCost', 'TotalCost']
    },
    responsibility: {
      title: '责任与考核',
      icon: 'UserFilled',
      iconClass: 'danger',
      fields: ['MainDept', 'MainPerson', 'MainPersonAssessment', 'Manager', 'SecondPerson', 'SecondPersonAssessment', 'ManagerAssessment']
    },
    assessment: {
      title: '考核信息',
      icon: 'QuestionFilled',
      iconClass: 'warning',
      fields: ['AssessmentDescription']
    }
  }

  const sections = []

  Object.keys(fieldGroups).forEach(groupKey => {
    const group = fieldGroups[groupKey]

    // 处理tab结构
    if (group.isTabbed && group.tabs) {
      sections.push({
        title: group.title,
        icon: group.icon,
        iconClass: group.iconClass,
        isTabbed: true,
        tabs: group.tabs
      })
    } else {
      // 处理普通字段结构
      const groupFields = []

      if (group.fields) {
        group.fields.forEach(fieldKey => {
          const field = exportFields.value.find(f => f.key === fieldKey)
          if (field) {
            groupFields.push(field)
          }
        })
      }

      if (groupFields.length > 0) {
        sections.push({
          title: group.title,
          icon: group.icon,
          iconClass: group.iconClass,
          fields: groupFields
        })
      }
    }
  })

  return sections
}

// 获取字段标签宽度
const getFieldLabelWidth = (field) => {
  if (isFullWidthField(field)) {
    return '120px'
  }

  // 根据字段名长度调整标签宽度，增加更多空间避免换行
  const labelLength = field.label.length
  if (labelLength <= 2) {
    return '80px'
  } else if (labelLength <= 3) {
    return '90px'
  } else if (labelLength <= 4) {
    return '100px'
  } else if (labelLength <= 6) {
    return '120px'
  } else if (labelLength <= 8) {
    return '140px'
  } else {
    return '160px'
  }
}

// 获取tab字段
const getTabFields = (fieldKeys) => {
  if (!fieldKeys || !Array.isArray(fieldKeys) || !exportFields.value) {
    return []
  }
  return fieldKeys.map(key => exportFields.value.find(f => f.key === key)).filter(Boolean)
}

// 获取字段组件
const getFieldComponent = (field) => {
  if (field.type === 'date') return 'el-date-picker'
  if (field.type === 'number' || field.type === 'decimal') return 'el-input-number'
  if (field.key === 'ReturnGoods' || field.key === 'IsReprint') return 'el-switch'
  if (field.key === 'Workshop' || field.key === 'ComplaintCategory' || field.key === 'CustomerComplaintType' || field.key === 'DefectiveCategory') return 'el-select'
  if (field.type === 'textarea') return 'el-input'
  return 'el-input'
}

// 获取字段属性
const getFieldProps = (field) => {
  const props = { style: 'width: 100%'}

  if (field.type === 'date') {
    props.type = 'date'
    props.format = 'YYYY-MM-DD'
    props['value-format'] = 'YYYY-MM-DD'
  } else if (field.type === 'number' || field.type === 'decimal') {
    props.precision = field.type === 'decimal' ? 2 : 0
    props.min = 0
  } else if (field.type === 'textarea') {
    props.type = 'textarea'
    props.rows = 3
  }

  return props
}

// 获取字段占用的列宽 - 优化布局规则
const getFieldSpan = (field) => {
  // 全宽字段占满整行
  if (isFullWidthField(field)) {
    return 24
  }

  // 根据字段类型和用途进行分组布局
  const fieldKey = field.key
  const labelLength = field.label.length

  // 基本信息模块 - 紧凑布局
  if (['Date', 'Customer', 'OrderNo', 'Workshop'].includes(fieldKey)) {
    return 12  // 2列布局
  }

  // 产品信息 - 产品名称占50%，规格占50%
  if (fieldKey === 'ProductName') {
    return 12  // 50%宽度
  }
  if (fieldKey === 'Specification') {
    return 12  // 50%宽度
  }

  // 数量相关字段 - 3列布局
  if (['ProductionQty', 'DefectiveQty', 'DefectiveRate', 'ReprintQty'].includes(fieldKey)) {
    return 8  // 3列布局
  }

  // 材料明细模块 - 材料名称和规格各占50%
  if (['Paper', 'MaterialA', 'MaterialB', 'MaterialC'].includes(fieldKey)) {
    return 12  // 50%宽度
  }
  if (['PaperSpecification', 'MaterialASpec', 'MaterialBSpec', 'MaterialCSpec'].includes(fieldKey)) {
    return 12  // 50%宽度
  }

  // 数量和价格字段 - 数量字段2倍宽度
  if (['PaperQty', 'MaterialAQty', 'MaterialBQty', 'MaterialCQty'].includes(fieldKey)) {
    return 16  // 2倍当前宽度
  }
  if (['PaperUnitPrice', 'MaterialAUnitPrice', 'MaterialBUnitPrice', 'MaterialCUnitPrice'].includes(fieldKey)) {
    return 8   // 标准宽度
  }

  // 成本字段 - 2列布局
  if (['LaborCost', 'TotalCost'].includes(fieldKey)) {
    return 12  // 2列布局
  }

  // 人员相关字段 - 3列布局
  if (['MainDept', 'MainPerson', 'Manager', 'SecondPerson'].includes(fieldKey)) {
    return 8  // 3列布局
  }

  // 考核字段 - 2列布局
  if (['MainPersonAssessment', 'SecondPersonAssessment', 'ManagerAssessment'].includes(fieldKey)) {
    return 12  // 2列布局
  }

  // 处置相关 - 根据字段类型
  if (['ReturnGoods', 'IsReprint'].includes(fieldKey)) {
    return 8  // 3列布局（开关类型）
  }

  // 下拉选择类字段 - 2列布局
  if (['ComplaintCategory', 'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem'].includes(fieldKey)) {
    return 12  // 2列布局
  }

  // 根据标签长度的默认规则
  if (labelLength <= 4) {
    return 8   // 3列布局
  } else if (labelLength <= 8) {
    return 12  // 2列布局
  } else {
    return 24  // 单列布局
  }
}

watch(pageCount, (val) => {
  if (val === 0) {
    gotoPage.value = 1
  } else if (gotoPage.value > val) {
    gotoPage.value = val
  }
})

// 监听编辑表单纸张数量和车间变化，自动计算人工成本
watch(() => editFormData.value ? [editFormData.value.PaperQty, editFormData.value.Workshop] : [], (values) => {
  if (editFormData.value) {
    calculateEditLaborCost();
  }
}, { deep: true })

// 监听编辑表单成本相关字段变化，自动计算总成本
watch(() => editFormData.value ? [
  editFormData.value.PaperSpecification,
  editFormData.value.PaperQty,
  editFormData.value.PaperUnitPrice,
  editFormData.value.MaterialASpec,
  editFormData.value.MaterialAQty,
  editFormData.value.MaterialAUnitPrice,
  editFormData.value.MaterialBSpec,
  editFormData.value.MaterialBQty,
  editFormData.value.MaterialBUnitPrice,
  editFormData.value.MaterialCSpec,
  editFormData.value.MaterialCQty,
  editFormData.value.MaterialCUnitPrice,
  editFormData.value.LaborCost
] : [], (values) => {
  if (editFormData.value) {
    calculateEditTotalCost();
  }
}, { deep: true })

// 监听编辑表单总成本变化，自动计算主责人考核
watch(() => editFormData.value ? editFormData.value.TotalCost : 0, (totalCost) => {
  if (editFormData.value) {
    calculateEditMainPersonAssessment();
  }
})

function getChartTitle(type) {
  let year = ''
  let month = ''
  if (chartFilter.value.dateRange && chartFilter.value.dateRange.length === 2) {
    const start = chartFilter.value.dateRange[0]
    const end = chartFilter.value.dateRange[1]
    if (start && end && start !== end) {
      // 修复时区问题：使用本地时区方法获取日期组件
      const startDate = new Date(start)
      const endDate = new Date(end)
      year = `${startDate.getFullYear()}-${(startDate.getMonth()+1).toString().padStart(2,'0')}`
      month = `${endDate.getFullYear()}-${(endDate.getMonth()+1).toString().padStart(2,'0')}`
      return `${year} 至 ${month} 投诉${type}`
    }
  }
  const now = new Date()
  year = now.getFullYear()
  month = (now.getMonth()+1).toString().padStart(2,'0')
  return `${year}年${month}月投诉${type}`
}

// 监听配置更新事件
const handleConfigUpdate = (event) => {
  // 重新获取统计数据，保持当前选择的月份
  nextTick(() => {
    fetchStats()
  })
}

// 确认导出方法
const confirmExport = () => {
  showExportDialog.value = false
  exportToExcel()
}

// Excel导出功能
const exportToExcel = async () => {
  exportLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数（不包含分页，获取所有数据）
    const params = {}

    // 如果使用高级查询，则使用高级查询参数，否则使用简单搜索
    if (isAdvancedQuery.value) {
      // 高级查询参数
      if (advancedQuery.value.customer) params.customer = advancedQuery.value.customer
      if (advancedQuery.value.orderNo) params.orderNo = advancedQuery.value.orderNo
      if (advancedQuery.value.productName) params.productName = advancedQuery.value.productName
      if (advancedQuery.value.workshop) params.workshop = advancedQuery.value.workshop
      if (advancedQuery.value.complaintCategory) params.complaintCategory = advancedQuery.value.complaintCategory
      if (advancedQuery.value.customerComplaintType) params.customerComplaintType = advancedQuery.value.customerComplaintType
      if (advancedQuery.value.defectiveCategory) params.defectiveCategory = advancedQuery.value.defectiveCategory
      if (advancedQuery.value.mainDept) params.mainDept = advancedQuery.value.mainDept
      if (advancedQuery.value.mainPerson) params.mainPerson = advancedQuery.value.mainPerson
      if (advancedQuery.value.dateRange && advancedQuery.value.dateRange.length === 2) {
        // Element Plus日期选择器已配置value-format="YYYY-MM-DD"，直接使用字符串值
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]

        console.log('导出功能日期范围:', {
          dateRange: advancedQuery.value.dateRange,
          startDate: params.startDate,
          endDate: params.endDate,
          startDateType: typeof params.startDate,
          endDateType: typeof params.endDate
        })
      }
      if (advancedQuery.value.defectiveRateMin !== null) params.defectiveRateMin = advancedQuery.value.defectiveRateMin
      if (advancedQuery.value.defectiveRateMax !== null) params.defectiveRateMax = advancedQuery.value.defectiveRateMax
      if (advancedQuery.value.returnGoods !== '') params.returnGoods = advancedQuery.value.returnGoods
      if (advancedQuery.value.isReprint !== '') params.isReprint = advancedQuery.value.isReprint
    } else {
      // 简单搜索参数
      if (searchKeyword.value) params.search = searchKeyword.value
    }

    // 设置大的页面大小以获取所有数据
    params.page = 1
    params.pageSize = 10000

    const res = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success && res.data.data.length > 0) {
      // 获取选中的字段
      const selectedFields = exportFields.value.filter(field => field.checked)

      // 准备Excel数据 - 只包含选中的字段
      const excelData = res.data.data.map((item, index) => {
        const rowData = {}

        selectedFields.forEach(field => {
          if (field.key === 'index') {
            rowData[field.label] = index + 1
          } else {
            // 动态处理字段值
            let value = item[field.key]

            // 根据字段类型进行格式化
            switch (field.type) {
              case 'date':
                value = value ? value.slice(0, 10) : ''
                break
              case 'boolean':
                value = value ? '是' : '否'
                break
              case 'number':
              case 'decimal':
                value = value || 0
                break
              default:
                value = value || ''
            }

            rowData[field.label] = value
          }
        })

        return rowData
      })

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // 动态设置列宽 - 根据字段类型和内容
      const getColumnWidth = (field) => {
        // 根据字段类型和标签长度设置列宽
        if (field.key === 'index') return { wch: 6 }

        switch (field.type) {
          case 'date':
            return { wch: 12 }
          case 'boolean':
            return { wch: 8 }
          case 'number':
          case 'decimal':
            return { wch: 10 }
          case 'string':
            // 根据字段名称判断内容长度
            if (field.label.includes('描述') || field.label.includes('原因') || field.label.includes('措施') || field.label.includes('说明')) {
              return { wch: 25 }
            } else if (field.label.includes('规格') || field.label.includes('名称')) {
              return { wch: 20 }
            } else if (field.label.includes('编号') || field.label.includes('工单')) {
              return { wch: 15 }
            } else {
              return { wch: 12 }
            }
          default:
            return { wch: 15 }
        }
      }

      // 根据选中的字段设置列宽
      const colWidths = selectedFields.map(field => getColumnWidth(field))
      ws['!cols'] = colWidths

      // 设置行高
      const rowHeights = []
      // 标题行高度
      rowHeights[0] = { hpt: 25 }
      // 数据行高度
      for (let i = 1; i <= excelData.length; i++) {
        rowHeights[i] = { hpt: 20 }
      }
      ws['!rows'] = rowHeights

      // 美化表格样式
      const range = XLSX.utils.decode_range(ws['!ref'])

      // 定义样式
      const headerStyle = {
        font: { name: 'Microsoft YaHei', sz: 11, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }

      const dataStyle = {
        font: { name: 'Microsoft YaHei', sz: 10 },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0D0D0' } },
          bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
          left: { style: 'thin', color: { rgb: 'D0D0D0' } },
          right: { style: 'thin', color: { rgb: 'D0D0D0' } }
        }
      }

      const evenRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'F8F9FA' } }
      }

      const oddRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'FFFFFF' } }
      }

      // 应用样式
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[cellAddress]) continue

          if (R === 0) {
            // 标题行样式
            ws[cellAddress].s = headerStyle
          } else {
            // 数据行样式 - 隔行变色
            ws[cellAddress].s = R % 2 === 0 ? evenRowStyle : oddRowStyle
          }
        }
      }

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '投诉记录')

      // 生成文件名 - 格式：投诉记录_YYMMDD+时间戳
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2) // 取年份后两位
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')

      const dateStr = `${year}${month}${day}`
      const timeStamp = `${hours}${minutes}${seconds}`
      let fileName = `投诉记录_${dateStr}${timeStamp}.xlsx`

      // 如果有查询条件，添加到文件名
      const selectedFieldsText = `${selectedFieldsCount.value}字段`
      if (isAdvancedQuery.value) {
        fileName = `投诉记录_高级查询_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      } else if (searchKeyword.value) {
        fileName = `投诉记录_搜索结果_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      } else {
        fileName = `投诉记录_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      }

      // 导出文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, fileName)

      ElMessage.success(`成功导出 ${res.data.data.length} 条记录`)
    } else {
      ElMessage.warning('没有数据可导出')
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + (error.response?.data?.message || error.message))
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchTableData()
  fetchChartOptions()
  fetchProfile()
  fetchOptions() // 获取下拉选项
  fetchExportFields() // 获取导出字段信息
  loadSiteConfig() // 加载网站配置

  // 初始化轮播图响应式
  updateCardsPerPage()
  window.addEventListener('resize', updateCardsPerPage)

  // 强制触发一次更新以确保正确设置
  setTimeout(() => {
    updateCardsPerPage()
  }, 100)

  nextTick(() => {
    renderCharts()

    // 初始化智能布局
    setTimeout(() => {
      applyOptimalLayout()
    }, 100)

    // 延迟初始化查询卡片位置，确保所有内容都已渲染
    setTimeout(() => {
      initQueryCardPosition()
    }, 200)
  })

  // 添加配置更新监听器
  window.addEventListener('homeConfigUpdated', handleConfigUpdate)

  // 添加网站配置更新监听器
  window.addEventListener('siteConfigUpdated', (event) => {
    Object.assign(siteConfig, event.detail)
    document.title = siteConfig.siteName
  })

  // 添加滚动监听，动态调整查询卡片位置
  window.addEventListener('scroll', handleScroll)

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)

  // 添加布局优化监听器
  setTimeout(() => {
    const layoutObserver = new ResizeObserver(() => {
      if (window.innerWidth > 1200) {
        setTimeout(() => {
          applyOptimalLayout()
        }, 50)
      }
    })

    // 观察主容器的大小变化
    const mainContent = document.querySelector('.home-main')
    if (mainContent) {
      layoutObserver.observe(mainContent)
    }
  }, 300)
})

// 注意：由于事件监听器使用了匿名函数，我们在组件销毁时会自动清理

// 滚动处理函数（带防抖）
let scrollTimeout = null
const handleScroll = () => {
  // 在小屏幕下不执行固定定位
  if (window.innerWidth <= 1200) return

  // 清除之前的定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }

  // 设置新的定时器，防抖处理
  scrollTimeout = setTimeout(() => {
    const queryCard = document.querySelector('.query-card')
    const tableCard = document.querySelector('.table-card')

    if (!queryCard || !tableCard) return

    const tableCardRect = tableCard.getBoundingClientRect()
    const headerHeight = 80 // 导航栏实际高度
    const padding = 20 // 与导航栏的间距

    // 计算查询卡片应该的位置（始终与表格卡片顶部对齐）
    const targetTop = Math.max(headerHeight + padding, tableCardRect.top)

    // 设置查询卡片位置
    queryCard.style.top = `${targetTop}px`
  }, 10) // 10ms防抖延迟，保持响应性
}

// 智能布局算法 - 动态计算最优布局
const calculateOptimalLayout = () => {
  const queryCard = document.querySelector('.query-card')
  const tableContainer = document.querySelector('.table-container')
  const mainContent = document.querySelector('.home-main')

  if (!tableContainer || !mainContent) return null

  // 获取主容器的实际可用宽度
  const mainRect = mainContent.getBoundingClientRect()
  const containerPadding = 40 // 2.5rem = 40px
  const availableWidth = mainRect.width - containerPadding * 2

  // 如果没有查询卡片，表格占满全宽
  if (!queryCard) {
    return {
      queryCardWidth: 0,
      tableMarginRight: 0,
      containerPadding
    }
  }

  // 计算查询卡片的最优宽度（占总宽度的20-25%）
  let queryCardWidth = Math.min(Math.max(availableWidth * 0.22, 320), 420)

  // 根据屏幕宽度微调
  if (window.innerWidth >= 1600) {
    queryCardWidth = Math.min(queryCardWidth, 420)
  } else if (window.innerWidth >= 1400) {
    queryCardWidth = Math.min(queryCardWidth, 380)
  } else {
    queryCardWidth = Math.min(queryCardWidth, 340)
  }

  // 计算表格容器的最优右边距
  const cardGap = 40 // 增加卡片间距
  const tableMarginRight = queryCardWidth + cardGap

  return {
    queryCardWidth: Math.round(queryCardWidth),
    tableMarginRight: Math.round(tableMarginRight),
    containerPadding
  }
}



// 应用智能布局
const applyOptimalLayout = () => {
  const layout = calculateOptimalLayout()
  if (!layout) return

  const queryCard = document.querySelector('.query-card')
  const tableContainer = document.querySelector('.table-container')

  if (tableContainer) {
    // 应用表格容器边距
    tableContainer.style.marginRight = `${layout.tableMarginRight}px`

    // 如果有查询卡片，应用其样式
    if (queryCard && layout.queryCardWidth > 0) {
      queryCard.style.position = 'fixed'
      queryCard.style.right = '16px' // 固定右边距，更靠近浏览器右边
      queryCard.style.width = `${layout.queryCardWidth}px`
      queryCard.style.transform = 'none'
      queryCard.style.zIndex = '1000'
    }



    // 调试信息（开发环境）
    if (process.env.NODE_ENV === 'development') {
      // 智能布局应用完成
    }
  }
}

// 完全重置查询卡片到初始状态
const resetQueryCardToInitialState = () => {
  const queryCard = document.querySelector('.query-card')
  const tableCard = document.querySelector('.table-card')

  if (!queryCard || !tableCard) return

  // 使用智能布局算法
  applyOptimalLayout()

  // 强制重新计算布局
  tableCard.offsetHeight

  // 获取表格当前位置
  const tableCardRect = tableCard.getBoundingClientRect()
  const headerHeight = 80 // 导航栏实际高度
  const padding = 20 // 与导航栏的间距

  // 设置查询卡片位置（与表格顶部对齐）
  const initialTop = Math.max(headerHeight + padding, tableCardRect.top)
  queryCard.style.top = `${initialTop}px`

  // 确保位置设置生效
  queryCard.offsetHeight
}

// 初始化查询卡片位置
const initQueryCardPosition = () => {
  // 多次尝试初始化，确保DOM完全渲染
  const tryInit = (attempts = 0) => {
    const maxAttempts = 10

    // 在小屏幕下不执行固定定位
    if (window.innerWidth <= 1200) return

    const queryCard = document.querySelector('.query-card')
    const tableCard = document.querySelector('.table-card')

    if (!queryCard || !tableCard) {
      if (attempts < maxAttempts) {
        setTimeout(() => tryInit(attempts + 1), 50)
      }
      return
    }

    resetQueryCardToInitialState()
    // 立即执行一次滚动处理，确保位置正确
    handleScroll()
  }

  setTimeout(() => tryInit(), 100) // 延迟100ms开始尝试
}

// 组件卸载时移除监听器
import { onUnmounted } from 'vue'

// 防抖函数
let resizeTimeout = null
// 窗口大小变化处理函数
const handleResize = () => {
  // 清除之前的定时器
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  // 设置新的定时器，防抖处理
  resizeTimeout = setTimeout(() => {
    const queryCard = document.querySelector('.query-card')
    const tableContainer = document.querySelector('.table-container')

    if (!queryCard || !tableContainer) return

    // 如果是小屏幕，重置查询卡片样式
    if (window.innerWidth <= 1200) {
      queryCard.style.position = 'relative'
      queryCard.style.top = 'auto'
      queryCard.style.right = 'auto'
      queryCard.style.width = '100%'
      tableContainer.style.marginRight = '0'
    } else {
      // 大屏幕时使用智能布局算法
      applyOptimalLayout()

      // 重新初始化滚动监听
      setTimeout(() => {
        initQueryCardPosition()
      }, 100)
    }
  }, 200) // 防抖延迟200ms
}

onUnmounted(() => {
  window.removeEventListener('homeConfigUpdated', handleConfigUpdate)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)

  // 清理定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto; /* 明确允许垂直滚动 */
  height: auto; /* 确保高度可以自动增长 */
  /* 允许垂直滚动 */
}
/* 自定义滚动条样式 */
body::-webkit-scrollbar {
  width: 8px;
}
body::-webkit-scrollbar-track {
  background: #f1f1f1;
}
body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 全局样式 - 详情对话框标题栏美化 */
.el-dialog.detail-dialog .el-dialog__header {
  flex-shrink: 0 !important;
  padding: 24px 24px 16px 24px !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.el-dialog.detail-dialog .el-dialog__title {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #111827 !important;
  letter-spacing: 0.025em !important;
  position: relative !important;
  padding-left: 32px !important;
  line-height: 1.5 !important;
}

.el-dialog.detail-dialog .el-dialog__title::before {
  content: '📋' !important;
  font-size: 18px !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn {
  top: 20px !important;
  right: 20px !important;
  width: 36px !important;
  height: 36px !important;
  background: rgba(107, 114, 128, 0.1) !important;
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  transform: scale(1.05) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
}

.el-dialog.detail-dialog .el-dialog__close {
  color: #6b7280 !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  transition: color 0.2s ease !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: #ef4444 !important;
}
</style>

<style scoped>
.home-bg {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  /* 确保页面内容超出视窗时显示滚动条 */
}
.home-header {
  background: #fff;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 4rem;
  padding: 0 2.5rem;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.scrollable-content {
  margin-top: 4rem; /* 为固定头部留出空间 */
  margin-bottom: 3rem; /* 为固定底部留出空间 */
  min-height: calc(100vh - 7rem); /* 确保内容区域至少占满剩余空间 */
  overflow-y: auto;
}

.fixed-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 0;
}
.header-left {
  display: flex;
  align-items: center;
}
.logo {
  height: 2.25rem;
  margin-right: 0.625rem;
}
.logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #b0b4ba;
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.nav-menu-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}
.nav-menu {
  background: transparent;
  border-bottom: none;
  display: inline-block;
  min-width: 0;
  flex-shrink: 0;
}
.nav-menu :deep(.el-menu-item) {
  background: transparent !important;
  position: relative;
  padding: 0 24px !important;
  margin: 0 8px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* 悬停背景效果 - 已禁用 */

/* 底部指示线 */
.nav-menu :deep(.el-menu-item)::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  border-radius: 2px 2px 0 0;
  transform: translateX(-50%);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 悬停背景效果已禁用 */

.nav-menu :deep(.el-menu-item:hover)::after,
.nav-menu :deep(.el-menu-item.is-active)::after {
  width: 80%;
}

.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
  background: transparent !important;
  color: #409EFF !important;
  box-shadow: none !important;
  border-bottom: none !important;
  transform: translateY(-1px);
}

/* 激活状态背景效果已禁用 */

.nav-menu :deep(.el-menu-item.is-active) {
  font-weight: 600;
  color: #409EFF !important;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.admin-btn {
  margin-right: 0.625rem;
}
.avatar-icon {
  background: #e6e6e6;
  color: #409EFF;
  cursor: pointer;
}
.username {
  margin: 0 0.5rem;
  font-weight: 500;
  cursor: pointer;
}
.home-main {
  flex: 1;
  padding: 1.5rem 2.5rem 4rem 2.5rem; /* 减少顶部内边距，增加底部边距避免被footer遮挡 */
  margin-top: 4rem; /* 为固定导航栏留出空间 */
  /* 移除overflow限制，让页面自然滚动 */
  overflow: visible; /* 确保内容可见 */
}

/* 统计控制区样式 */
.stats-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.stats-control-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stats-control-right {
  display: flex;
  align-items: center;
}
.stat-row-flex {
  display: flex;
  flex-wrap: nowrap;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

/* 轮播图样式 */
.stats-carousel {
  width: 100%;
  margin-bottom: 0.5rem; /* 减小与下方的间距 */
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

/* 轮播图背景装饰 */
.stats-carousel::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.stats-carousel::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -30%;
  width: 60%;
  height: 60%;
  background: radial-gradient(circle, rgba(103, 194, 58, 0.02) 0%, transparent 70%);
  pointer-events: none;
}

.carousel-page {
  display: flex;
  gap: 1.5rem;
  align-items: center; /* 改为居中对齐 */
  justify-content: center; /* 水平居中 */
  height: 100%;
  padding: 0 1.5rem;
  position: relative;
  z-index: 1;
}

/* 轮播图指示器样式 */
.stats-carousel :deep(.el-carousel__indicators) {
  margin-top: 1rem;
}

.stats-carousel :deep(.el-carousel__indicator) {
  width: 10px;
  height: 10px;
  margin: 0 6px;
}

.stats-carousel :deep(.el-carousel__button) {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: rgba(148, 163, 184, 0.4);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.stats-carousel :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: #409eff;
  border-color: rgba(64, 158, 255, 0.3);
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
  transform: scale(1.2);
}

/* 轮播图箭头样式 */
.stats-carousel :deep(.el-carousel__arrow) {
  background: rgba(255, 255, 255, 0.95);
  color: #64748b;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.stats-carousel :deep(.el-carousel__arrow:hover) {
  background: #409eff;
  color: white;
  border-color: #409eff;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
  transform: scale(1.05);
}

.stats-carousel :deep(.el-carousel__arrow--left) {
  left: 15px;
}

.stats-carousel :deep(.el-carousel__arrow--right) {
  right: 15px;
}

/* 轮播图内的统计卡片样式 - 与ComplaintAnalysisChart保持一致 */
.carousel-page .summary-card {
  display: flex;
  align-items: center;
  padding: 20px;
  margin: 0 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 120px;
  flex: 1 1 0;
  min-width: 0;
  max-width: 400px;
}

.carousel-page .summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.carousel-page .summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.carousel-page .summary-card:hover::before {
  transform: scaleX(1);
}

.carousel-page .card-left {
  margin-right: 16px;
}

.carousel-page .card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
}

/* Element Plus 经典配色 */
.carousel-page .card-icon.today {
  background: linear-gradient(135deg, #409EFF20, #409EFF10);
  color: #409EFF;
  border: 2px solid #409EFF20;
}
.carousel-page .card-icon.total {
  background: linear-gradient(135deg, #409EFF20, #409EFF10);
  color: #409EFF;
  border: 2px solid #409EFF20;
}
.carousel-page .card-icon.inner {
  background: linear-gradient(135deg, #E6A23C20, #E6A23C10);
  color: #E6A23C;
  border: 2px solid #E6A23C20;
}
.carousel-page .card-icon.outer {
  background: linear-gradient(135deg, #F56C6C20, #F56C6C10);
  color: #F56C6C;
  border: 2px solid #F56C6C20;
}
.carousel-page .card-icon.rate {
  background: linear-gradient(135deg, #67C23A20, #67C23A10);
  color: #67C23A;
  border: 2px solid #67C23A20;
}
.carousel-page .card-icon.customer-rate {
  background: linear-gradient(135deg, #90939920, #90939910);
  color: #909399;
  border: 2px solid #90939920;
}

.carousel-page .summary-card:hover .card-icon {
  transform: scale(1.1);
}

.carousel-page .card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.carousel-page .card-title {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
}

.carousel-page .card-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 2px;
  transition: all 0.3s ease;
}

.carousel-page .card-subtitle {
  font-size: 11px;
  color: #C0C4CC;
  font-weight: 400;
}

/* 不同卡片的数值颜色 */
.carousel-page .today-value { color: #409EFF; }
.carousel-page .total-value { color: #409EFF; }
.carousel-page .inner-value { color: #E6A23C; }
.carousel-page .outer-value { color: #F56C6C; }
.carousel-page .rate-value { color: #67C23A; }
.carousel-page .customer-rate-value { color: #909399; }
.stat-row-flex .stat-card {
  flex: 1 1 0;
  min-width: 0;
  max-width: 400px; /* 设置最大宽度，防止卡片过宽 */
  margin: 0;
  height: 7.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1rem;
  border-radius: 0.75rem;
  background: white;
  border: 1px solid #e8e8e8;
  text-align: left;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
  cursor: pointer;
  gap: 1rem;
}

/* 统计卡片容器响应式布局 */
.stat-row-flex {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-start;
}

/* 针对1366*768分辨率的统计卡片容器优化 */
@media (max-width: 1366px) and (min-width: 1201px) {
  .stat-row-flex {
    gap: 0.75rem; /* 减小卡片间距 */
  }

  .stat-row-flex .stat-card {
    max-width: 300px; /* 进一步限制最大宽度 */
    min-width: 280px; /* 设置最小宽度确保内容不被压缩 */
  }
}

.stat-row-flex .stat-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}


.unit-tag {
  font-size: 0.625rem !important;
  padding: 0.125rem 0.375rem !important;
  height: auto !important;
  line-height: 1.2 !important;
}
.middle-row {
  margin-bottom: 1.5rem;
  position: relative;
}

.table-container {
  margin-right: 380px; /* 增加默认边距，为高级查询卡片留出更多空间 */
  transition: margin-right 0.3s ease; /* 平滑过渡效果 */
}
.table-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  margin-bottom: 1.5rem;
  margin-top: 0 !important; /* 确保顶部对齐 */
}
.table-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.query-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  height: auto;
  min-height: unset;
  width: 340px; /* 增加默认宽度 */
  display: block;
  position: fixed; /* 使用fixed定位以便精确控制 */
  top: 120px; /* 初始位置，避免与导航栏重叠 */
  right: 1rem; /* 更靠近浏览器右边 */
  margin-top: 0 !important; /* 确保与左侧卡片顶部对齐 */
  z-index: 1000; /* 确保在其他元素之上 */
  transition: top 0.2s ease-out, width 0.3s ease, right 0.3s ease; /* 平滑过渡效果 */
}

.query-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: bold;
  color: #409eff;
}

.advanced-form {
  padding: 0;
}

.advanced-form .el-form-item {
  margin-bottom: 16px;
}

.advanced-form .el-form-item:last-child {
  margin-bottom: 0;
}

.advanced-form .el-form-item__content {
  width: 100% !important;
}

.advanced-form .el-form-item__label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.advanced-form .el-input,
.advanced-form .el-select {
  font-size: 12px;
}

.rate-range {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.query-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.query-actions .el-button {
  font-size: 12px;
  border-radius: 4px;
  width: 100% !important;
  height: 36px !important;
  margin: 0 !important;
  flex: 1;
  box-sizing: border-box;
}

/* 针对小尺寸按钮的特殊样式 */
.query-actions .el-button--small {
  height: 36px !important;
  padding: 8px 15px !important;
  font-size: 12px !important;
  line-height: 1 !important;
}

/* 更具体的选择器确保样式生效 */
.query-actions .el-button.el-button--small {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button.el-button--small.el-button--primary {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button.el-button--small.el-button--default {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.query-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #337ecc 0%, #5aa3e6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.query-actions .el-button--default {
  height: 36px !important;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
}

.query-actions .el-button--default:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
  color: #409eff;
}

.query-title {
  font-size: 0.95rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.chart-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.home-footer {
  background: #fff;
  color: #888;
  text-align: center;
  padding: 1rem 0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
}
.unit-card {
  /* 只保留阴影和无边框，不设置background，避免覆盖子类 */
  box-shadow: 0 0 10px #ddd !important;
  border: none !important;
}
/* 不同卡片的图标和文字颜色 */
.card-today .card-icon .el-icon {
  color: #2196f3;
}

.card-today .stat-title {
  color: #2196f3 !important;
}

.card-month .card-icon .el-icon {
  color: #9c27b0;
}

.card-month .stat-title {
  color: #9c27b0 !important;
}

.quality-rate-card .card-icon .el-icon {
  color: #4caf50;
}

.quality-rate-card .stat-title,
.quality-rate-card .card-title-row {
  color: #4caf50 !important;
}

.complaint-rate-card .card-icon .el-icon {
  color: #ff9800;
}

.complaint-rate-card .stat-title,
.complaint-rate-card .card-title-row {
  color: #ff9800 !important;
}

/* 单位卡片颜色变化 */
.card-unit0 .card-icon .el-icon {
  color: #409eff;
}

.card-unit0 .stat-title {
  color: #409eff !important;
}

.card-unit0 .stat-item-inline b {
  color: #409eff !important;
}

.card-unit1 .card-icon .el-icon {
  color: #67c23a;
}

.card-unit1 .stat-title {
  color: #67c23a !important;
}

.card-unit1 .stat-item-inline b {
  color: #67c23a !important;
}

.card-unit2 .card-icon .el-icon {
  color: #e6a23c;
}

.card-unit2 .stat-title {
  color: #e6a23c !important;
}

.card-unit2 .stat-item-inline b {
  color: #e6a23c !important;
}

.card-unit3 .card-icon .el-icon {
  color: #f56c6c;
}

.card-unit3 .stat-title {
  color: #f56c6c !important;
}

.card-unit3 .stat-item-inline b {
  color: #f56c6c !important;
}

.card-unit4 .card-icon .el-icon {
  color: #909399;
}

.card-unit4 .stat-title {
  color: #909399 !important;
}

.card-unit4 .stat-item-inline b {
  color: #909399 !important;
}

.card-unit5 .card-icon .el-icon {
  color: #c45656;
}

.card-unit5 .stat-title {
  color: #c45656 !important;
}

.card-unit5 .stat-item-inline b {
  color: #c45656 !important;
}

.card-unit6 .card-icon .el-icon {
  color: #73767a;
}

.card-unit6 .stat-title {
  color: #73767a !important;
}

.card-unit6 .stat-item-inline b {
  color: #73767a !important;
}

/* 旧的stat-detail样式已移除，使用新的统一布局 */

.loading-card {
  background: white !important;
  color: #666 !important;
  border: 1px solid #e8e8e8 !important;
}

.loading-card .stat-value {
  font-size: 1.5rem !important;
}

/* 旧的单位卡片样式已移除，使用新的统一设计 */
.stat-label {
  font-size: 13px;
  color: #409EFF;
  margin-left: 2px;
}
.el-dropdown-link:focus,
.el-dropdown-link:focus-visible,
.el-dropdown-link:active {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.chart-filter-row {
  margin-bottom: 10px;
  padding: 0 10px;
}
.chart-content-flex {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 15px;
  margin-top: 8px;
  padding: 0 15px;
  box-sizing: border-box;
}
.chart-box {
  flex: 1 1 0;
  min-width: 0;
  background: #fafbfc;
  border-radius: 8px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 16px 0 rgba(64,158,255,0.10);
  border: 1.5px solid #e0e3ea;
  padding: 8px 0 0 0;
  box-sizing: border-box;
}
.chart-label {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #409EFF;
}
.chart-ec {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
}
/* 表格头部样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-title .tip-icon {
  color: #909399;
  font-size: 14px;
  margin-left: 4px;
  cursor: help;
  transition: color 0.2s ease;
}

.table-title .tip-icon:hover {
  color: #409eff;
}

.table-actions {
  display: flex;
  align-items: center;
}

/* 表格底部样式 */
.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 投诉记录表格卡片样式 */
.complaint-table-card {
  margin-top: 24px;
  /* 移除高度限制，让表格自然展开 */
  display: flex;
  flex-direction: column;
}

/* 详情弹窗样式 - 使用深度选择器 */
.detail-dialog :deep(.el-dialog) {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 auto !important;
  top: 10vh !important;
  transform: translateY(0) !important;
}

/* 详情对话框标题栏美化样式已移至全局样式 */

.detail-dialog :deep(.el-dialog__body) {
  flex: 1 !important;
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.detail-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  padding: 16px 24px !important;
  border-top: 1px solid #e4e7ed !important;
  background: #f8f9fa !important;
}

.detail-dialog .detail-content {
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 16px 24px !important;
  background: #fafbfc !important;
  height: 100% !important;
  max-height: calc(80vh - 160px) !important;
}

/* 详情区块样式 */
.detail-section {
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.detail-section:last-child {
  margin-bottom: 0;
}

/* 区块头部 */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  font-size: 15px;
}

.section-icon {
  font-size: 18px;
  color: #409eff;
}

.section-icon.warning {
  color: #e6a23c;
}

.section-icon.success {
  color: #67c23a;
}

.section-icon.info {
  color: #909399;
}

.section-title {
  color: #303133;
  font-weight: 600;
}

/* 区块内容 */
.section-content {
  padding: 20px;
}

/* 信息网格布局 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.3s ease;
  min-height: 44px;
  overflow: hidden;
}

.info-item.full-width {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-height: auto;
}

.info-item.full-width .info-label {
  font-weight: 600;
  color: #606266;
  margin-bottom: 4px;
}

.info-item.full-width .info-value {
  width: 100%;
  text-align: left;
  line-height: 1.6;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  min-height: 60px;
}

.info-item:hover {
  background: #f0f2f5;
  border-left-color: #409eff;
}

.info-label {
  font-weight: 600;
  color: #606266;
  font-size: 13px;
  min-width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.info-value.highlight-number {
  color: #2563eb;
  font-weight: 600;
}

.info-value.highlight-error {
  color: #dc2626;
  font-weight: 600;
}

/* 文本字段样式 */
.text-fields {
  margin-top: 20px;
}

.text-field {
  margin-bottom: 16px;
}

.text-field:last-child {
  margin-bottom: 0;
}

.text-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #606266;
  font-size: 14px;
}

.text-label .el-icon {
  color: #909399;
  font-size: 16px;
}

.text-content {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  color: #1f2937;
  line-height: 1.6;
  min-height: 60px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  overflow-wrap: break-word;
}

/* 责任信息样式 */
.responsibility-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.resp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  flex: 1;
  min-width: 200px;
  overflow: hidden;
}

.resp-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #606266;
  font-size: 14px;
  flex-shrink: 0;
}

.resp-label .el-icon {
  color: #909399;
  font-size: 16px;
}

/* 附件信息样式 */
.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 10px;
  border: 1px solid #bae6fd;
  overflow: hidden;
}

.file-icon {
  color: #0ea5e9;
  font-size: 20px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: #1f2937;
  font-weight: 500;
  font-size: 14px;
  word-break: break-word;
  overflow-wrap: break-word;
}

.dialog-footer {
  text-align: center;
  flex-shrink: 0;
}

.complaint-table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 移除overflow: hidden，允许内容自然滚动 */
}

.complaint-table-card .el-table {
  flex: 1;
}

/* 表格行双击提示样式 */
.complaint-table-card :deep(.el-table__body-wrapper .el-table__row) {
  cursor: pointer;
  transition: all 0.2s ease;
}

.complaint-table-card :deep(.el-table__body-wrapper .el-table__row:hover) {
  background-color: #f0f9ff !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.complaint-table-card :deep(.el-table__body-wrapper .el-table__row:hover td) {
  background-color: transparent !important;
}



/* 移除表格高度限制，让页面自然滚动 */
/*
.complaint-table-card .el-table__body-wrapper {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
*/

/* 表格列宽拖拽增强样式 */
.complaint-table-card :deep(.el-table th.gutter) {
  display: table-cell !important;
}

.complaint-table-card :deep(.el-table .el-table__header-wrapper .el-table__header thead tr th) {
  position: relative;
}

.complaint-table-card :deep(.el-table .el-table__header-wrapper .el-table__header thead tr th:hover) {
  background-color: #f5f7fa;
}

/* 表格标题栏文字水平居中 */
.complaint-table-card :deep(.el-table .el-table__header-wrapper .el-table__header thead tr th .cell) {
  text-align: center !important;
}

/* 美化表头样式 */
.enhanced-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.enhanced-table :deep(.el-table__header th) {
  background: transparent !important;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #374151;
  padding: 16px 8px !important;
}

.enhanced-table :deep(.el-table__header th:hover) {
  background: rgba(64, 158, 255, 0.05) !important;
}

/* 表头单元格样式 */
.table-header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  width: 100%;
}

.header-icon {
  font-size: 14px;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.header-text {
  white-space: nowrap;
  font-weight: 600;
}

/* 不同类型图标的颜色 */
.date-icon {
  color: #10b981;
}

.customer-icon {
  color: #3b82f6;
}

.order-icon {
  color: #8b5cf6;
}

.product-icon {
  color: #f59e0b;
}

.workshop-icon {
  color: #ef4444;
}

.category-icon {
  color: #f97316;
}

.defect-icon {
  color: #dc2626;
}

.item-icon {
  color: #06b6d4;
}

.desc-icon {
  color: #84cc16;
}

.dept-icon {
  color: #6366f1;
}

.person-icon {
  color: #ec4899;
}

.action-icon {
  color: #64748b;
}

/* 表头悬停效果 */
.enhanced-table :deep(.el-table__header th:hover .header-icon) {
  transform: scale(1.1);
  opacity: 1;
}

.enhanced-table :deep(.el-table__header th:hover .header-text) {
  color: #1f2937;
}

/* 排序箭头水平排列 */
.enhanced-table :deep(.el-table th.is-sortable .cell) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
  position: relative !important;
}

.enhanced-table :deep(.el-table th.is-sortable .caret-wrapper) {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 2px !important;
  margin-left: 0 !important;
  height: 12px !important;
  width: auto !important;
  vertical-align: middle !important;
  position: static !important;
  flex-shrink: 0 !important;
}

.enhanced-table :deep(.el-table th.is-sortable .sort-caret) {
  position: static !important;
  border: 2px solid transparent !important;
  margin: 0 1px !important;
  width: 0 !important;
  height: 0 !important;
  display: inline-block !important;
}

.enhanced-table :deep(.el-table th.is-sortable .sort-caret.ascending) {
  border-bottom-color: #c0c4cc !important;
  border-top: none !important;
  border-left-width: 2px !important;
  border-right-width: 2px !important;
  border-bottom-width: 3px !important;
}

.enhanced-table :deep(.el-table th.is-sortable .sort-caret.descending) {
  border-top-color: #c0c4cc !important;
  border-bottom: none !important;
  border-left-width: 2px !important;
  border-right-width: 2px !important;
  border-top-width: 3px !important;
}

.enhanced-table :deep(.el-table th.is-sortable .sort-caret.ascending:hover) {
  border-bottom-color: #409eff !important;
}

.enhanced-table :deep(.el-table th.is-sortable .sort-caret.descending:hover) {
  border-top-color: #409eff !important;
}

/* 激活状态的排序箭头 */
.enhanced-table :deep(.el-table th.is-sortable.ascending .sort-caret.ascending) {
  border-bottom-color: #409eff !important;
}

.enhanced-table :deep(.el-table th.is-sortable.descending .sort-caret.descending) {
  border-top-color: #409eff !important;
}

/* 拖拽手柄样式 */
.complaint-table-card :deep(.el-table th.is-leaf) {
  border-right: 1px solid #ebeef5;
}

.complaint-table-card :deep(.el-table th.is-leaf:hover) {
  border-right-color: #409eff;
}

/* 拖拽时的视觉反馈 */
.complaint-table-card :deep(.el-table .el-table__border-left-patch) {
  border-left: 1px solid #409eff;
}

.complaint-table-card :deep(.el-table .el-table__border-right-patch) {
  border-right: 1px solid #409eff;
}

/* 编辑对话框样式 */
.edit-dialog {
  --el-dialog-margin-top: 5vh;
}

.edit-dialog :deep(.el-dialog) {
  margin: 5vh auto;
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 12px 32px 4px rgba(0, 0, 0, 0.04), 0 8px 20px rgba(0, 0, 0, 0.08);
}

.edit-dialog :deep(.el-dialog__header) {
  flex-shrink: 0;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #ffffff;
  border-radius: 12px 12px 0 0;
}

.edit-dialog :deep(.el-dialog__body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fafbfc;
}

.edit-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 20px 24px;
  border-top: 1px solid #e4e7ed;
  background: #ffffff;
  border-radius: 0 0 12px 12px;
}

/* 编辑对话框头部样式 */
.edit-dialog-header {
  display: flex;
  align-items: center;
  color: #303133;
}

.edit-dialog-header .header-icon {
  font-size: 20px;
  margin-right: 10px;
  color: #409eff;
}

.edit-dialog-header .header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 编辑对话框底部按钮样式 */
.edit-dialog-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.edit-dialog-footer .cancel-btn {
  background: #f5f7fa;
  border-color: #dcdfe6;
  color: #606266;
  transition: all 0.3s ease;
}

.edit-dialog-footer .cancel-btn:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.edit-dialog-footer .save-btn {
  background: #67c23a;
  border-color: #67c23a;
  transition: all 0.3s ease;
}

.edit-dialog-footer .save-btn:hover {
  background: #5daf34;
  border-color: #5daf34;
}

.edit-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: #fafbfc;
  height: 100%;
  max-height: calc(90vh - 180px);
}

.edit-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.edit-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 32px;
  padding-right: 12px;
}

.edit-form :deep(.el-form-item__content) {
  line-height: 32px;
}

/* 统一控件高度 - 所有输入控件保持32px高度 */
.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-select .el-input__wrapper),
.edit-form :deep(.el-date-editor.el-input),
.edit-form :deep(.el-input-number .el-input__wrapper),
.edit-form :deep(.el-cascader .el-input__wrapper) {
  min-height: 32px !important;
  height: 32px !important;
}

.edit-form :deep(.el-input__inner),
.edit-form :deep(.el-select .el-input__inner),
.edit-form :deep(.el-date-editor .el-input__inner),
.edit-form :deep(.el-input-number .el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
}

/* 强制所有下拉框高度一致 */
.edit-form :deep(.el-select),
.edit-form :deep(.el-select .el-input),
.edit-form :deep(.el-select .el-input__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
}

/* 强制所有日期选择器高度一致 */
.edit-form :deep(.el-date-editor),
.edit-form :deep(.el-date-editor .el-input__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
}

/* 强制所有数字输入框高度一致 */
.edit-form :deep(.el-input-number),
.edit-form :deep(.el-input-number .el-input__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
}

.edit-form :deep(.el-select) {
  width: 100%;
}

.edit-form :deep(.el-date-editor) {
  width: 100%;
}

.edit-form :deep(.el-input-number) {
  width: 100%;
}

/* 材料明细tab样式 */
.material-tabs {
  margin-top: 16px;
}

.material-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.material-tabs :deep(.el-tabs__item) {
  font-weight: 500;
  color: #606266;
}

.material-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 600;
}

.material-tabs :deep(.el-tabs__content) {
  padding: 16px 0;
}

.edit-form {
  height: 100%;
}

.edit-form .form-card {
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.edit-form .form-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #c6d9f7;
}

.edit-form .form-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 20px;
  border-radius: 10px 10px 0 0;
}

.edit-form .section-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.edit-form .section-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #409eff;
}

.edit-form .form-card :deep(.el-card__body) {
  padding: 20px;
  background: white;
  border-radius: 0 0 10px 10px;
}

/* 编辑表单字段优化 */
.edit-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.edit-form :deep(.el-form-item__label) {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  padding-right: 6px;
  line-height: 32px;
}

.edit-form :deep(.el-input--small .el-input__inner) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}

.edit-form :deep(.el-textarea--small .el-textarea__inner) {
  font-size: 13px;
  padding: 8px 12px;
}

.edit-form :deep(.el-input-number--small) {
  width: 100%;
}

.edit-form :deep(.el-input-number--small .el-input__inner) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}

.edit-form :deep(.el-switch--small) {
  height: 20px;
  line-height: 20px;
}

/* 对话框内容区域优化 */
.edit-content {
  padding: 0;
}

.edit-form .form-card {
  margin-bottom: 12px;
}

.edit-form .form-card:last-child {
  margin-bottom: 0;
}

.edit-form .form-card :deep(.el-card__header) {
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.edit-form .form-card :deep(.el-card__body) {
  padding: 12px 16px;
}

/* 编辑表单字段布局优化 */
.edit-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.edit-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  padding-right: 8px;
  line-height: 32px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.edit-form :deep(.el-form-item__content) {
  line-height: 32px;
}

/* 优化行间距 */
.edit-form :deep(.el-row) {
  margin-bottom: 8px;
}

.edit-form :deep(.el-row:last-child) {
  margin-bottom: 0;
}

/* 优化列间距 */
.edit-form :deep(.el-col) {
  padding-left: 8px;
  padding-right: 8px;
}

/* 材料明细tab内容优化 */
.material-tabs :deep(.el-tab-pane) {
  padding: 16px 0;
}

.material-tabs :deep(.el-row) {
  margin-bottom: 12px;
}

/* 编辑对话框分组样式 */
.edit-section {
  margin-bottom: 12px;
}

.edit-section:last-child {
  margin-bottom: 0;
}

.edit-section .section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-section .section-icon {
  font-size: 16px;
}

.edit-section .section-icon.warning {
  color: #e6a23c;
}

.edit-section .section-icon.success {
  color: #67c23a;
}

.edit-section .section-icon.info {
  color: #409eff;
}

.edit-section .section-icon.danger {
  color: #f56c6c;
}

.edit-section .section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* 响应式布局优化 */
@media (max-width: 768px) {
  /* 小屏下所有字段改为单列布局 */
  .edit-form .el-col {
    width: 100% !important;
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* 调整标签宽度 */
  .edit-form :deep(.el-form-item__label) {
    width: 80px !important;
    min-width: 80px !important;
  }

  /* 调整对话框宽度 */
  .edit-dialog :deep(.el-dialog) {
    width: 60% !important;
    margin: 5vh auto !important;
  }
}

@media (max-width: 1200px) and (min-width: 769px) {
  /* 中等屏幕下优化布局 */
  .edit-form .el-col[class*="span-6"] {
    width: 50% !important;
    flex: 0 0 50% !important;
    max-width: 50% !important;
  }

  .edit-form .el-col[class*="span-8"] {
    width: 50% !important;
    flex: 0 0 50% !important;
    max-width: 50% !important;
  }
}

/* 卡片类型样式 */
.card-workshop {
  border-left: 4px solid #409eff;
}

.card-department {
  border-left: 4px solid #67c23a;
}

.admin-main, .main, .home-main {
  background: #fafbfc;
}
/* 大屏幕到中等屏幕的过渡 */
@media (max-width: 1200px) {
  .query-card {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    width: 100% !important;
    margin-bottom: 1.5rem;
    transition: none !important;
  }

  .table-container {
    margin-right: 0 !important;
  }

  .middle-row {
    flex-direction: column;
  }
}

/* 平板设备 */
@media (max-width: 768px) {
  .home-header {
    padding: 0.5rem 1rem;
    flex-wrap: wrap;
    min-height: 100px; /* 给导航菜单换行留出空间 */
    align-items: flex-start;
  }

  /* 平板设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  /* 确保右侧区域不挤压左侧logo */
  .header-right {
    flex-shrink: 0; /* 防止被压缩 */
    gap: 0.5rem; /* 稍微减少间距 */
  }

  .home-header .nav-menu {
    order: 3;
    width: 100%;
    margin-top: 0.5rem;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    padding: 0.25rem 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .home-header .nav-menu .el-menu {
    background: transparent;
    border: none;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 1rem;
    font-size: 0.875rem;
    height: 36px;
    line-height: 36px;
  }

  .home-main {
    margin-top: 5rem; /* 为导航菜单留出额外空间 */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  /* 平板设备下统计控制区调整 */
  .stats-control {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 1rem;
  }

  .stats-control-left,
  .stats-control-right {
    justify-content: center;
    width: 100%;
  }

  .stats-control-left .el-date-picker {
    width: 200px;
  }

  /* 平板设备下统计卡片调整 */
  .stat-row-flex .stat-card {
    max-width: 320px; /* 平板设备适中的最大宽度，针对1366*768优化 */
    height: 7rem; /* 适中的高度，避免过高 */
    padding: 0.75rem 0.5rem; /* 适中的内边距 */
  }

  .carousel-page .stat-card {
    max-width: 320px; /* 轮播图内卡片也适配平板 */
  }

  /* 针对1366*768分辨率的特殊优化 */
  .stat-row-flex .stat-card.special-layout {
    height: 6.5rem; /* 特殊布局卡片高度稍微减小 */
    padding: 0.6rem 0.4rem;
  }

  .stat-row-flex .stat-card .card-icon {
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
  }

  .stat-row-flex .stat-card .card-icon .el-icon {
    font-size: 20px;
  }

  .stat-row-flex .stat-card .stat-title {
    font-size: 1rem;
    margin-bottom: 0.75rem; /* 增加标题下边距 */
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1.1rem;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .table-actions .el-input {
    flex: 1;
    min-width: 200px;
  }

  .chart-content-flex {
    flex-direction: column;
    gap: 1rem;
  }

  .chart-box {
    width: 100% !important;
    min-height: 250px;
  }

  /* 平板设备下分页器优化 */
  .table-footer {
    justify-content: center;
  }

  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 手机设备 */
@media (max-width: 600px) {
  .home-header, .home-main {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .home-header {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    min-height: 90px; /* 手机设备稍微减少高度 */
  }

  /* 手机设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  .logo {
    height: 2rem; /* 稍微缩小logo */
    margin-right: 0; /* 移除右边距，因为没有文字了 */
  }

  .home-header .nav-menu {
    margin-top: 0.25rem;
    padding: 0.125rem 0;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 0.5rem;
    font-size: 0.8rem;
    height: 32px;
    line-height: 32px;
  }

  .home-main {
    margin-top: 6rem; /* 手机设备需要更多上边距，因为导航栏高度约90px */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  /* 手机设备下统计控制区调整 */
  .stats-control {
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    margin-left: 0;
    margin-right: 0;
  }

  .stats-control-left {
    justify-content: center;
    width: 100%;
  }

  .stats-control-left .el-date-picker {
    width: 100% !important;
    max-width: 250px;
  }

  .stats-control-right {
    justify-content: center;
    width: 100%;
  }

  /* 确保开关文字在小屏幕下完整显示 */
  .stats-control-right .el-switch {
    width: 100%;
    max-width: 280px;
  }

  .stats-control-right .el-switch .el-switch__label {
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-row-flex {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem; /* 确保与导航菜单有足够间距 */
  }

  .stat-row-flex .stat-card {
    max-width: none; /* 小屏幕下移除最大宽度限制，让卡片充分利用空间 */
    height: 9rem; /* 进一步增加小屏幕高度 */
    border-radius: 0.5rem;
    padding: 1.2rem 0.8rem; /* 增加内边距 */
  }

  .carousel-page .stat-card {
    max-width: none; /* 轮播图内卡片也移除最大宽度限制 */
  }

  /* 小屏幕下统计卡片文字调整 */
  .stat-row-flex .stat-card .stat-title {
    font-size: 0.9rem; /* 标题文字稍微缩小 */
    margin-bottom: 0.8rem; /* 增加标题下边距 */
    line-height: 1.2;
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1rem; /* 数字稍微缩小 */
    font-weight: normal;
    line-height: 1.3;
  }

  .stat-row-flex .stat-card .stat-value b {
    font-size: 1.2rem; /* 加粗数字稍大一些 */
    font-weight: bold;
  }

  .home-footer {
    font-size: 0.8rem;
  }

  .query-card .el-form-item__label {
    width: 50px !important;
    font-size: 0.8rem;
  }

  .query-card .el-input,
  .query-card .el-select {
    font-size: 0.875rem;
  }

  .table-actions .el-input {
    min-width: 150px;
  }

  .table-actions .el-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .table-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    justify-content: center; /* 居中对齐 */
  }

  /* 小屏幕下分页器样式优化 */
  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  /* 确保分页器组件在小屏幕下完整显示 */
  .table-footer .el-pagination .el-pagination__sizes {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .table-footer .el-pagination .el-pagination__total {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* 分页器按钮组在小屏幕下的样式 */
  .table-footer .el-pagination .el-pager {
    margin: 0.25rem;
  }

  .table-footer .el-pagination .btn-prev,
  .table-footer .el-pagination .btn-next {
    margin: 0.25rem;
  }

  .chart-box {
    min-height: 200px;
  }
}

/* Excel导出字段选择对话框样式 */
.export-field-selection {
  padding: 10px 0;
}

/* 保存确认对话框样式 */
:deep(.save-confirm-dialog) {
  border-radius: 12px;
}

:deep(.save-confirm-dialog .el-message-box__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.save-confirm-dialog .el-message-box__title) {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

:deep(.save-confirm-dialog .el-message-box__content) {
  padding: 20px;
  color: #606266;
  font-size: 14px;
}

:deep(.save-confirm-dialog .el-message-box__btns) {
  padding: 10px 20px 20px;
  text-align: right;
}

:deep(.save-confirm-dialog .el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-weight: 500;
}

:deep(.save-confirm-dialog .el-button--default) {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 8px 20px;
  margin-right: 10px;
}

/* 附件文件字段样式 */
.attachment-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.attachment-input-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attachment-path-section {
  width: 100%;
}

/* 编辑对话框附件路径input样式 - 使用最强权重和直接选择器 */
.attachment-path-section {
  width: 100% !important;
}

.attachment-path-section .attachment-path-input {
  width: 100% !important;
}

/* 使用全局深度选择器，不依赖特定class */
:deep(.attachment-path-section .el-input) {
  width: 100% !important;
}

:deep(.attachment-path-section .el-input-group) {
  width: 100% !important;
  display: flex !important;
}

:deep(.attachment-path-section .el-input-group .el-input) {
  flex: 1 !important;
  width: auto !important;
}

:deep(.attachment-path-section .el-input-group .el-input__wrapper) {
  flex: 1 !important;
  width: auto !important;
  min-width: 0 !important;
}

:deep(.attachment-path-section .el-input__wrapper) {
  width: 100% !important;
  flex: 1 !important;
}

:deep(.attachment-path-section .el-input__inner) {
  width: 100% !important;
  flex: 1 !important;
}

/* 针对有prepend的input组件特殊处理 */
:deep(.attachment-path-section .el-input-group__prepend) {
  flex-shrink: 0 !important;
  white-space: nowrap !important;
}

:deep(.attachment-path-section .el-input-group__prepend + .el-input .el-input__wrapper) {
  flex: 1 !important;
  width: auto !important;
}

.edit-dialog :deep(.el-input-group__prepend) {
  flex-shrink: 0;
  white-space: nowrap;
}

.edit-dialog :deep(.el-input-group__append) {
  flex-shrink: 0;
}

.select-file-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.file-drop-zone {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #909399;
}

.file-drop-zone:hover {
  border-color: #409eff;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.file-drop-zone.dragover {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.image-preview-area {
  width: 200px;
  height: 150px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-area .el-empty {
  padding: 20px 10px;
}

.image-preview-area .el-empty__description {
  font-size: 12px;
  color: #909399;
}



.image-preview {
  width: 80px;
  height: 80px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-preview:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 80px;
  height: 80px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}



/* 图片预览对话框样式 */
.image-preview-dialog :deep(.el-dialog) {
  border-radius: 12px;
}

.image-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f5f5f5;
  border-radius: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 确保对话框不影响页面布局 */
:deep(.el-dialog) {
  position: fixed !important;
}

:deep(.el-overlay) {
  position: fixed !important;
}

.field-selection-header {
  margin-bottom: 20px;
  text-align: center;
}

.field-selection-header .el-button {
  margin: 0 5px;
}

.field-selection-content {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.field-checkbox {
  margin-bottom: 12px;
  width: 100%;
  display: block;
}

.field-checkbox .el-checkbox__label {
  font-size: 14px;
  color: #606266;
}

.required-mark {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 4px;
}

.field-selection-info {
  margin-top: 15px;
}

.field-selection-info .el-alert {
  border-radius: 4px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}

/* 按钮高亮效果 */
.active-selection-btn {
  animation: buttonHighlight 2s ease-in-out;
}

@keyframes buttonHighlight {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0px;
  white-space: nowrap;
}

.action-btn {
  padding: 4px 4px !important;
  min-width: auto !important;
  border: none !important;
  background: transparent !important;
  color: #409eff !important;
  transition: all 0.2s ease;
  font-size: 16px !important;
  margin: 0 !important;
}

.action-btn .el-icon {
  font-size: 16px !important;
  width: 16px !important;
  height: 16px !important;
}

.action-btn:hover {
  background: rgba(64, 158, 255, 0.1) !important;
  color: #337ecc !important;
  transform: scale(1.05);
}

.action-btn:hover .el-icon {
  font-size: 16px !important;
}

.action-btn.danger-btn {
  color: #f56c6c !important;
}

.action-btn.danger-btn .el-icon {
  font-size: 16px !important;
}

.action-btn.danger-btn:hover {
  background: rgba(245, 108, 108, 0.1) !important;
  color: #dd6161 !important;
}

.action-btn.danger-btn:hover .el-icon {
  font-size: 16px !important;
}

/* 删除确认对话框样式 */
.delete-confirm-modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2000 !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

/* 确保删除确认对话框不影响页面布局 */
:deep(.el-message-box) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 2001 !important;
  margin: 0 !important;
}

/* 防止删除确认对话框导致页面滚动条变化 */
body.el-popup-parent--hidden {
  padding-right: 0 !important;
}

/* 超小屏幕设备 (< 480px) */
@media (max-width: 480px) {
  .stat-row-flex {
    gap: 0.5rem; /* 进一步减小卡片间距 */
  }

  .stat-row-flex .stat-card {
    max-width: none; /* 移除最大宽度限制 */
    height: 8rem; /* 适中的高度 */
    padding: 1rem 0.75rem; /* 适中的内边距 */
  }

  .carousel-page .stat-card {
    max-width: none; /* 轮播图内卡片也移除最大宽度限制 */
  }

  .stats-carousel {
    padding: 0.75rem; /* 减小轮播图内边距 */
    margin-bottom: 0.25rem; /* 进一步减小与下方的间距 */
  }

  .carousel-page {
    gap: 0.5rem; /* 减小轮播图内卡片间距 */
    padding: 0 0.5rem; /* 减小轮播图页面内边距 */
  }
}

/* 投诉表单对话框样式 */
.complaint-dialog {
  border-radius: 12px;
}

.complaint-dialog .el-dialog {
  margin: 3vh auto !important;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.complaint-dialog .el-dialog__header {
  background: #409eff;
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
  text-align: center;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.complaint-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 600;
}

.complaint-dialog .el-dialog__body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(94vh - 120px);
  background: #fafbfc;
}

/* 对话框标题图标样式 */
.dialog-header-with-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dialog-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

/* 确保对话框遮罩层覆盖整个视窗 */
.complaint-dialog .el-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}

/* 按钮美化样式 */
.add-complaint-btn {
  background: #409eff !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3) !important;
  transition: all 0.3s ease !important;
  font-weight: 600 !important;
}

.add-complaint-btn:hover {
  background: #66b1ff !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4) !important;
}

.export-btn {
  background: #67c23a !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3) !important;
  transition: all 0.3s ease !important;
  font-weight: 600 !important;
}

.export-btn:hover {
  background: #85ce61 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(103, 194, 58, 0.4) !important;
}

/* 搜索框美化 */
.search-input {
  border-radius: 8px !important;
}

.search-input .el-input__wrapper {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  transition: all 0.3s ease !important;
}

.search-input .el-input__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.search-input .el-input__wrapper.is-focus {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3) !important;
}

/* 表格标题图标美化 */
.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.table-title-icon {
  font-size: 18px;
  color: #409eff;
}

/* 操作按钮美化 */
.action-btn {
  transition: all 0.3s ease !important;
  border-radius: 6px !important;
}

.action-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.danger-btn:hover {
  color: #f56c6c !important;
  background-color: rgba(245, 108, 108, 0.1) !important;
}

/* 统计卡片图标美化 */
.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(64, 158, 255, 0.1);
  margin-bottom: 12px;
}

.card-icon .el-icon {
  font-size: 24px;
  color: #409eff;
}

/* 特殊卡片图标颜色 */
.card-today .card-icon {
  background: rgba(255, 193, 7, 0.1);
}

.card-today .card-icon .el-icon {
  color: #ffc107;
}

.card-month .card-icon {
  background: rgba(64, 158, 255, 0.1);
}

.card-month .card-icon .el-icon {
  color: #409eff;
}

.quality-rate-card .card-icon {
  background: rgba(103, 194, 58, 0.1);
}

.quality-rate-card .card-icon .el-icon {
  color: #67c23a;
}

.complaint-rate-card .card-icon {
  background: rgba(245, 108, 108, 0.1);
}

.complaint-rate-card .card-icon .el-icon {
  color: #f56c6c;
}

/* 特殊布局卡片样式 */
.special-layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.card-content-vertical {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.card-title-row {
  font-size: 0.875rem;
  font-weight: 600;
  color: #606266;
  line-height: 1.2;
}

.card-percentage-row {
  font-size: 1.75rem;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.card-detail-row {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #909399;
  line-height: 1.2;
}

.card-detail-row span {
  white-space: nowrap;
}

/* 响应式调整特殊布局卡片 */
@media (max-width: 1366px) and (min-width: 1201px) {
  .special-layout .card-content-vertical {
    gap: 0.3rem;
  }

  .special-layout .card-title-row {
    font-size: 0.8rem;
    line-height: 1.1;
  }

  .special-layout .card-percentage-row {
    font-size: 1.6rem;
    line-height: 1;
  }

  .special-layout .card-detail-row {
    font-size: 0.7rem;
    gap: 0.75rem;
    line-height: 1.1;
  }

  /* 针对1366*768分辨率优化卡片图标 */
  .special-layout .card-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

  .special-layout .card-icon .el-icon {
    font-size: 20px;
  }
}

@media (max-width: 1200px) {
  .special-layout .card-content-vertical {
    gap: 0.2rem;
  }

  .special-layout .card-title-row {
    font-size: 0.75rem;
  }

  .special-layout .card-percentage-row {
    font-size: 1.25rem;
  }

  .special-layout .card-detail-row {
    font-size: 0.65rem;
    gap: 0.5rem;
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .special-layout {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .special-layout .card-content-vertical {
    gap: 0.5rem;
  }

  .special-layout .card-title-row {
    font-size: 0.875rem;
  }

  .special-layout .card-percentage-row {
    font-size: 1.5rem;
  }

  .special-layout .card-detail-row {
    font-size: 0.75rem;
    gap: 1rem;
    flex-direction: row;
    justify-content: center;
  }
}
</style>