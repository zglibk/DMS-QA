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
  <div class="home-bg">
    <!-- 顶部导航栏 -->
    <div class="home-header">
        <!-- 左侧logo及系统名 -->
        <div class="header-left">
          <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="logo" class="logo" @error="handleLogoError" />
          <span class="logo-text">{{ siteConfig?.siteName || '质量数据管理系统' }}</span>
        </div>
        <!-- 中间菜单栏 -->
        <div class="header-center">
          <div class="nav-menu-wrap">
            <el-menu mode="horizontal" :default-active="activeMenu" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
              <el-menu-item index="home">首页</el-menu-item>
              <el-menu-item index="complaint">投诉管理</el-menu-item>
              <el-menu-item index="stats">数据可视化</el-menu-item>
            </el-menu>
          </div>
        </div>
        <!-- 右侧用户区 -->
        <div class="header-right">  
          <el-button type="primary" text class="admin-btn" @click="goAdmin">登录后台</el-button>
          <el-avatar :size="32" :src="user.Avatar" class="avatar-icon" @click="goProfile">
            <template v-if="!user.Avatar">
              <el-icon><User /></el-icon>
            </template>
          </el-avatar>
          <span class="username" @click="goProfile">{{ user.Username }}</span>
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
    </div>

    <!-- 内容区 -->
    <div class="home-main">
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
                    size="small"
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
                  <div v-if="card.type === 'today'" :key="`today-${pageIndex}-${cardIndex}`" class="stat-card card-today">
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
                  <div v-else-if="card.type === 'month'" :key="`month-${pageIndex}-${cardIndex}`" class="stat-card card-month">
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

                  <!-- 一次交检合格率卡片 -->
                  <div v-else-if="card.type === 'quality'" :key="`quality-${pageIndex}-${cardIndex}`" class="stat-card quality-rate-card special-layout">
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

                  <!-- 客诉率卡片 -->
                  <div v-else-if="card.type === 'complaint'" :key="`complaint-${pageIndex}-${cardIndex}`" class="stat-card complaint-rate-card special-layout">
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
                    v-else-if="card.type === 'unit'"
                    :key="`unit-${pageIndex}-${cardIndex}`"
                    :class="['stat-card', 'unit-card', getUnitCardClass(card.data.type, cardIndex)]"
                  >
                    <div class="card-icon">
                      <el-icon>
                        <OfficeBuilding v-if="card.data.type === 'department'" />
                        <Tools v-else />
                      </el-icon>
                    </div>
                    <div class="card-content">
                      <div class="unit-header">
                        <div class="stat-title">{{ card.data.unit }}</div>
                        <el-tag
                          size="small"
                          :type="card.data.type === 'workshop' ? 'primary' : 'success'"
                          class="unit-tag"
                        >
                          {{ card.data.type === 'workshop' ? '车间' : '部门' }}
                        </el-tag>
                      </div>
                      <div class="card-divider"></div>
                      <div class="unit-stats-horizontal">
                        <span class="stat-item-inline">内诉: <b>{{ card.data.inner }}</b></span>
                        <span class="stat-item-inline">客诉: <b>{{ card.data.outer }}</b></span>
                      </div>
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
                  <el-button type="primary" @click="router.push('/add')" style="margin-left: 12px;">
                    <el-icon><Plus /></el-icon>
                    新增投诉
                  </el-button>
                  <el-button type="success" @click="showExportDialog = true" style="margin-left: 8px;">
                    <el-icon><ArrowDown /></el-icon>
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
            >
              <el-table-column label="#" type="index" width="60" :index="(index) => (page - 1) * pageSize + index + 1" resizable />
              <el-table-column prop="Date" label="日期" width="110" sortable resizable>
                <template #default="scope">
                  <el-tag type="info" size="small">
                    {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="Customer" label="客户编号" width="120" show-overflow-tooltip resizable />
              <el-table-column prop="OrderNo" label="工单号" width="130" show-overflow-tooltip resizable />
              <el-table-column prop="ProductName" label="产品名称" width="140" show-overflow-tooltip resizable />
              <el-table-column prop="Workshop" label="发生车间" width="110" resizable>
                <template #default="scope">
                  <el-tag size="small" :type="getWorkshopTagType(scope.row.Workshop)">
                    {{ scope.row.Workshop }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ComplaintCategory" label="投诉类别" width="110" resizable>
                <template #default="scope">
                  <el-tag size="small" :type="scope.row.ComplaintCategory === '客诉' ? 'danger' : 'warning'">
                    {{ scope.row.ComplaintCategory }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="DefectiveCategory" label="不良类别" width="120" show-overflow-tooltip resizable />
              <el-table-column prop="DefectiveItem" label="不良项" width="120" show-overflow-tooltip resizable />
              <el-table-column prop="DefectiveDescription" label="不良描述" width="150" show-overflow-tooltip resizable />
              <el-table-column prop="MainDept" label="主责部门" width="110" show-overflow-tooltip resizable />
              <el-table-column prop="MainPerson" label="主责人" width="100" show-overflow-tooltip resizable />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button text :icon="View" size="small" @click="viewDetail(scope.row)" title="查看详情" class="action-btn" />
                    <el-button text :icon="Edit" size="small" @click="editRecord(scope.row)" title="修改记录" class="action-btn" />
                    <el-button text :icon="Delete" size="small" @click="deleteRecord(scope.row)" title="删除记录" class="action-btn danger-btn" />
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
          <!-- 数据分析图表卡片 -->
          <el-card class="chart-card">
            <div class="chart-title">数据分析图表</div>
            <!-- 图表筛选条件区 -->
            <div class="chart-filter-row">
              <el-form :inline="true" size="small" @submit.prevent>
                <el-form-item label="部门">
                  <el-select v-model="chartFilter.department" placeholder="请选择部门" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.departments" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="车间">
                  <el-select v-model="chartFilter.workshop" placeholder="请选择车间" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.workshops" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="不良项">
                  <el-select v-model="chartFilter.defectiveItem" placeholder="请选择不良项" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.defectiveItems" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="日期">
                  <el-date-picker v-model="chartFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:220px" @change="fetchChartData" />
                </el-form-item>
              </el-form>
            </div>
            <!-- 图表区 -->
            <div class="chart-content-flex">
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('柱形图') }}</div><div class="chart-ec" id="barChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('趋势图') }}</div><div class="chart-ec" id="lineChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('占比分析图') }}</div><div class="chart-ec" id="roseChart"></div></div>
            </div>
          </el-card>
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

            <el-form :model="advancedQuery" label-width="70px" size="small" class="advanced-form">
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
                  size="small"
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
                    size="small"
                  />
                  <span style="margin: 0 8px; color: #909399;">-</span>
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMax"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最大值"
                    style="width: 70px"
                    size="small"
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
                    size="small"
                    @click="handleAdvancedQuery"
                    :loading="tableLoading"
                  >
                    <el-icon><Search /></el-icon>
                    查询
                  </el-button>
                  <el-button
                    size="small"
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

    <!-- 底部版权栏 -->
    <div class="home-footer">
      © 2024 质量数据管理系统 版权所有
    </div>

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="isEditing ? '编辑投诉记录' : '投诉记录详情'"
      width="90%"
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
            <div class="attachment-info">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name">{{ detailData.AttachmentFile }}</span>
              <el-button type="primary" size="small" link>
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
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
      title="编辑投诉记录"
      width="90%"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      destroy-on-close
      class="edit-dialog"
      center
      top="10vh"
      :style="{ height: '80vh' }"
    >
      <div class="edit-content" v-loading="editFormLoading" element-loading-text="保存中...">
        <el-form
          :model="editFormData"
          :rules="editRules"
          ref="editFormRef"
          label-width="80px"
          class="edit-form"
          size="small"
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
                <el-row :gutter="16">
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
                        size="small"
                      />
                      <!-- 数字字段 -->
                      <el-input-number
                        v-else-if="field.type === 'number' || field.type === 'decimal'"
                        v-model="editFormData[field.key]"
                        :precision="field.type === 'decimal' ? 2 : 0"
                        :min="0"
                        style="width: 100%"
                        size="small"
                      />
                      <!-- 布尔值字段 -->
                      <el-switch
                        v-else-if="field.key === 'ReturnGoods' || field.key === 'IsReprint'"
                        v-model="editFormData[field.key]"
                        size="small"
                      />
                      <!-- 文本字段 -->
                      <el-input
                        v-else
                        v-model="editFormData[field.key]"
                        :type="isFullWidthField(field) ? 'textarea' : 'text'"
                        :rows="isFullWidthField(field) ? 2 : undefined"
                        size="small"
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
        <div class="dialog-footer">
          <el-button @click="cancelEdit">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="saveEdit" :loading="editFormLoading">
            <el-icon><Check /></el-icon>
            保存
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
            size="small"
            @click="selectAllFields"
            :type="activeSelectionButton === 'all' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'all' }"
          >
            全选
          </el-button>
          <el-button
            size="small"
            @click="selectNoneFields"
            :type="activeSelectionButton === 'none' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'none' }"
          >
            全不选
          </el-button>
          <el-button
            size="small"
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, reactive } from 'vue'
import { ArrowDown, User, Document, Search, Plus, View, RefreshLeft, InfoFilled, WarningFilled, UserFilled, Paperclip, Loading, QuestionFilled, Tools, OfficeBuilding, Download, Close, Edit, Delete, Check, Calendar, DataAnalysis, CircleCheck, Warning } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElPagination, ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'
import { useSiteConfig } from '../composables/useSiteConfig'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

const router = useRouter()
const activeMenu = ref('home')

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
const detailData = ref(null)
const detailLoading = ref(false)
const detailFieldsLoading = ref(false)
const detailSections = ref([])

// 编辑弹窗相关
const showEditDialog = ref(false)
const editFormData = ref({})
const editFormLoading = ref(false)
const editFormRef = ref(null)
const editSections = ref([])

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
      console.log('获取到字段信息:', exportFields.value.length, '个字段')
    } else {
      ElMessage.error('获取字段信息失败')
    }
  } catch (error) {
    console.error('获取字段信息失败:', error)
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

const handleMenuSelect = (index) => {
  activeMenu.value = index
  if (index === 'complaint') {
    router.push('/add')
  } else if (index === 'stats') {
    router.push('/data-visualization')
  }
}
const goProfile = () => {
  router.push('/profile')
}
const logout = () => {
  // 清除token并跳转登录
  localStorage.removeItem('token')
  window.location.href = '/login'
}
const goAdmin = () => {
  // 权限校验：仅admin或有后台权限的用户可进入
  if (user.value.Role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('无后台权限')
  }
}

// 删除原有的 loadSiteConfig 函数，现在使用 composable 中的

// LOGO加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png' // 回退到默认LOGO
}

const fetchTableData = async () => {
  tableLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    // console.log('发送请求参数:', params)

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
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]
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
      // console.log('🔍 数据接收调试:')
      // console.log('- 接收到的数据条数:', res.data.data.length)
      // console.log('- 总记录数:', res.data.total)
      // console.log('- 页面大小:', res.data.pageSize)

      tableData.value = res.data.data
      total.value = res.data.total

      // console.log('- 设置后tableData长度:', tableData.value.length)
      // console.log('- tableData前3条:', res.data.data.slice(0, 3))
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
  console.log('月份变化:', value, '当前selectedMonth:', selectedMonth.value)
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
    console.log('非当前月份，自动关闭今日统计显示')
  } else {
    // 当前月份，开启今日统计显示
    showTodayStats.value = true
    console.log('当前月份，自动开启今日统计显示')
  }

  // 确保使用最新的月份值
  nextTick(() => {
    console.log('准备获取统计数据，月份:', selectedMonth.value)
    fetchStats()
  })
}

// 处理今日统计开关
const handleTodayStatsToggle = (value) => {
  console.log('今日统计开关:', value)
  // 不需要重新获取数据，只是控制显示
}

const fetchStats = async () => {
  try {
    statsLoading.value = true // 开始加载
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('未找到token，跳转到登录页')
      window.location.href = '/login'
      return
    }

    // 添加月份参数
    const params = {
      month: selectedMonth.value
    }

    console.log('发送统计请求，参数:', params)

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

      console.log('统计数据获取成功:', {
        targetMonth: res.data.targetMonth,
        selectedMonth: selectedMonth.value,
        todayCount: todayCount.value,
        monthCount: monthCount.value,
        unitsCount: statUnits.value.length
      })
    } else {
      console.error('统计数据获取失败:', res.data.message)
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
    if (e.response && e.response.status === 401) {
      console.warn('认证失败，跳转到登录页')
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

    // 获取内诉数量（不合格数）
    const innerComplaintRes = await axios.get('/api/complaint/list', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page: 1,
        pageSize: 1,
        complaintCategory: '内诉',
        startDate: selectedMonth.value + '-01',
        endDate: selectedMonth.value + '-31'
      }
    })

    const failedInspections = innerComplaintRes.data.total || 0

    // 获取客诉批次数量
    const outerComplaintRes = await axios.get('/api/complaint/list', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page: 1,
        pageSize: 1,
        complaintCategory: '客诉',
        startDate: selectedMonth.value + '-01',
        endDate: selectedMonth.value + '-31'
      }
    })

    const complaintBatches = outerComplaintRes.data.total || 0

    // 暂时使用模拟数据，后续需要从ERP获取真实数据
    const totalInspections = 1000 // 需要从迅越ERP获取
    const totalDeliveries = 800   // 需要从迅越ERP获取

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

    console.log('质量统计数据:', qualityStats.value)
  } catch (error) {
    console.error('获取质量统计数据失败:', error)
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
    console.error('获取图表选项失败:', e)
  }
}

// 图表数据
const chartData = ref({
  workshopData: { x: [], y: [] },
  trendData: { x: [], y: [] },
  categoryData: []
})
const renderCharts = () => {
  // 柱形图
  const barChart = echarts.init(document.getElementById('barChart'))
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
  const lineChart = echarts.init(document.getElementById('lineChart'))
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
  const roseChart = echarts.init(document.getElementById('roseChart'))
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

    console.log('图表数据获取完成:', chartData.value)
  } catch (error) {
    console.error('获取图表数据失败:', error)
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
  // console.log('分页大小改变:', val)
  pageSize.value = val
  page.value = 1
  // console.log('当前pageSize:', pageSize.value)
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
    console.error('获取下拉选项失败:', error)
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
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 编辑记录
const editRecord = async (row) => {
  try {
    editFormLoading.value = true
    const token = localStorage.getItem('token')

    // 获取记录详情
    const response = await axios.get(`/api/complaint/detail/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      const data = response.data.data

      // 初始化编辑表单数据
      editFormData.value = {
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

      // 确保字段信息已加载，如果没有则先加载
      if (exportFields.value.length === 0) {
        await fetchExportFields()
      }

      // 组织编辑字段显示
      editSections.value = organizeEditFields()

      showEditDialog.value = true
    } else {
      ElMessage.error(response.data.message || '获取记录详情失败')
    }
  } catch (error) {
    console.error('获取编辑数据失败:', error)
    ElMessage.error('获取编辑数据失败')
  } finally {
    editFormLoading.value = false
  }
}

// 保存编辑
const saveEdit = async () => {
  try {
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

    console.log('提交的数据:', submitData)

    const response = await axios.put(`/api/complaint/${submitData.ID}`, submitData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.success) {
      ElMessage.success('更新成功')
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
    console.error('保存编辑失败:', error)
    console.error('错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })

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

// 取消编辑
const cancelEdit = () => {
  showEditDialog.value = false
  editFormData.value = {}
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
      console.error('删除记录失败:', error)
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
      fields: ['Paper', 'PaperSpecification', 'PaperQty', 'PaperUnitPrice', 'MaterialA', 'MaterialASpec', 'MaterialAQty', 'MaterialAUnitPrice', 'MaterialB', 'MaterialBSpec', 'MaterialBQty', 'MaterialBUnitPrice', 'MaterialC', 'MaterialCSpec', 'MaterialCQty', 'MaterialCUnitPrice', 'LaborCost', 'TotalCost']
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
    const groupFields = []

    group.fields.forEach(fieldKey => {
      const field = exportFields.value.find(f => f.key === fieldKey)
      if (field) {
        groupFields.push(field)
      }
    })

    if (groupFields.length > 0) {
      sections.push({
        title: group.title,
        icon: group.icon,
        iconClass: group.iconClass,
        fields: groupFields
      })
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
      title: '材料成本',
      icon: 'Document',
      iconClass: 'info',
      fields: ['Paper', 'PaperSpecification', 'PaperQty', 'PaperUnitPrice', 'LaborCost', 'TotalCost']
    },
    materialsDetail: {
      title: '材料明细',
      icon: 'Document',
      iconClass: 'info',
      fields: ['MaterialA', 'MaterialASpec', 'MaterialAQty', 'MaterialAUnitPrice', 'MaterialB', 'MaterialBSpec', 'MaterialBQty', 'MaterialBUnitPrice', 'MaterialC', 'MaterialCSpec', 'MaterialCQty', 'MaterialCUnitPrice']
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
    const groupFields = []

    group.fields.forEach(fieldKey => {
      const field = exportFields.value.find(f => f.key === fieldKey)
      if (field) {
        groupFields.push(field)
      }
    })

    if (groupFields.length > 0) {
      sections.push({
        title: group.title,
        icon: group.icon,
        iconClass: group.iconClass,
        fields: groupFields
      })
    }
  })

  return sections
}

// 获取字段标签宽度
const getFieldLabelWidth = (field) => {
  if (isFullWidthField(field)) {
    return '80px'
  }

  // 根据字段名长度调整标签宽度
  const labelLength = field.label.length
  if (labelLength <= 3) {
    return '50px'
  } else if (labelLength <= 4) {
    return '60px'
  } else if (labelLength <= 6) {
    return '80px'
  } else {
    return '100px'
  }
}

// 获取字段占用的列宽 - 响应式布局
const getFieldSpan = (field) => {
  // 全宽字段占满整行
  if (isFullWidthField(field)) {
    return 24
  }

  // 需要减少2/3宽度的紧凑字段
  const compactFields = [
    'Date', 'Customer', 'OrderNo', 'Workshop',
    'ProductionQty', 'DefectiveQty', 'DefectiveRate',
    'ComplaintCategory', 'DefectiveCategory', 'DefectiveItem',
    'MainDept', 'MainPerson', 'MainPersonAssessment',
    'SecondPerson', 'SecondPersonAssessment', 'ManagerAssessment'
  ]

  if (compactFields.includes(field.key)) {
    return 8  // 紧凑字段 - 3列布局
  }

  // 中等宽度字段
  const mediumFields = [
    'ProductName', 'Specification', 'CustomerComplaintType', 'Manager',
    'ReturnGoods', 'IsReprint', 'ReprintQty', 'AttachmentFile',
    'Paper', 'PaperSpecification', 'PaperQty', 'PaperUnitPrice',
    'LaborCost', 'TotalCost'
  ]

  if (mediumFields.includes(field.key)) {
    return 12  // 中等字段 - 2列布局
  }

  // 材料字段
  const materialFields = [
    'MaterialA', 'MaterialASpec', 'MaterialAQty', 'MaterialAUnitPrice',
    'MaterialB', 'MaterialBSpec', 'MaterialBQty', 'MaterialBUnitPrice',
    'MaterialC', 'MaterialCSpec', 'MaterialCQty', 'MaterialCUnitPrice'
  ]

  if (materialFields.includes(field.key)) {
    return 6  // 材料字段 - 4列布局（仅材料部分）
  }

  // 默认宽度
  return 12
}

watch(pageCount, (val) => {
  if (val === 0) {
    gotoPage.value = 1
  } else if (gotoPage.value > val) {
    gotoPage.value = val
  }
})

function getChartTitle(type) {
  let year = ''
  let month = ''
  if (chartFilter.value.dateRange && chartFilter.value.dateRange.length === 2) {
    const start = chartFilter.value.dateRange[0]
    const end = chartFilter.value.dateRange[1]
    if (start && end && start !== end) {
      year = `${new Date(start).getFullYear()}-${(new Date(start).getMonth()+1).toString().padStart(2,'0')}`
      month = `${new Date(end).getFullYear()}-${(new Date(end).getMonth()+1).toString().padStart(2,'0')}`
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
  console.log('收到配置更新事件:', event.detail)
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
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]
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
    console.error('导出Excel失败:', error)
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

// 完全重置查询卡片到初始状态
const resetQueryCardToInitialState = () => {
  const queryCard = document.querySelector('.query-card')
  const tableCard = document.querySelector('.table-card')

  if (!queryCard || !tableCard) return

  // 完全重置样式
  queryCard.style.position = 'fixed'
  queryCard.style.right = '2.5rem'
  queryCard.style.width = '300px'
  queryCard.style.transform = 'none'
  queryCard.style.zIndex = '1000'

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
    if (!queryCard) return

    // 如果是小屏幕，重置查询卡片样式
    if (window.innerWidth <= 1200) {
      queryCard.style.position = 'relative'
      queryCard.style.top = 'auto'
      queryCard.style.right = 'auto'
      queryCard.style.width = '100%'
    } else {
      // 大屏幕时完全重置并重新初始化位置
      setTimeout(() => {
        // 使用新的重置函数
        resetQueryCardToInitialState()

        // 重新初始化滚动监听
        setTimeout(() => {
          initQueryCardPosition()
        }, 100)
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
}
.nav-menu :deep(.el-menu-item)::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2.5px;
  background: #409EFF;
  border-radius: 2px;
  transition: width 0.2s, left 0.2s;
}
.nav-menu :deep(.el-menu-item:hover)::after,
.nav-menu :deep(.el-menu-item.is-active)::after {
  width: 60%;
  left: 20%;
}
.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
  background: transparent !important;
  color: #409EFF !important;
  box-shadow: none !important;
  border-bottom: none !important;
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
  background-color: rgb(224, 242, 215); /* 设置背景色 */
  border-radius: 0.75rem;
  padding: 1rem;
}

.carousel-page {
  display: flex;
  gap: 1.25rem;
  align-items: center; /* 改为居中对齐 */
  justify-content: center; /* 水平居中 */
  height: 100%;
  padding: 0 1rem;
}

/* 轮播图指示器样式 */
.stats-carousel :deep(.el-carousel__indicators) {
  margin-top: 0.5rem;
}

.stats-carousel :deep(.el-carousel__indicator) {
  width: 8px;
  height: 8px;
}

.stats-carousel :deep(.el-carousel__button) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #c0c4cc;
}

.stats-carousel :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: #409eff;
}

/* 轮播图箭头样式 */
.stats-carousel :deep(.el-carousel__arrow) {
  background-color: rgba(255, 255, 255, 0.8);
  color: #409eff;
  border: 1px solid #e4e7ed;
}

.stats-carousel :deep(.el-carousel__arrow:hover) {
  background-color: #409eff;
  color: white;
}

/* 轮播图内的卡片样式 */
.carousel-page .stat-card {
  flex: 1 1 0;
  min-width: 0;
  max-width: 400px; /* 设置最大宽度，防止卡片过宽 */
  margin: 0;
  height: 7.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: center; /* 确保卡片在容器中垂直居中 */
  padding: 1rem;
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}
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

.stat-row-flex .stat-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

/* 单位卡片布局 */
.unit-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.unit-stats-horizontal {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.stat-item-inline {
  font-size: 0.75rem;
  color: #666;
}

.stat-item-inline b {
  font-size: 1rem;
  font-weight: bold;
  margin-left: 0.25rem;
}
/* 卡片图标样式 */
.card-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon .el-icon {
  font-size: 1.75rem;
  color: #409eff;
}

/* 卡片内容样式 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 卡片分隔线 */
.card-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 0.25rem 0;
}

/* 卡片统计区域 */
.card-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* 特殊布局卡片样式 */
.special-layout .card-content-vertical {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 0.25rem 0;
}

.card-title-row {
  font-size: 0.875rem;
  font-weight: 600;
  color: #409eff;
  line-height: 1.2;
}

.card-percentage-row {
  font-size: 1.25rem;
  font-weight: bold;
  color: #f56c6c !important;
  line-height: 1;
  margin: 0.25rem 0;
}

.card-detail-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #666;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
}

.card-detail-row span {
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
}

.stat-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #409eff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-value {
  font-size: 0.75rem;
  font-weight: normal;
  color: #666;
  margin: 0;
}

.stat-value b {
  font-size: 1.5rem;
  font-weight: bold;
  color: #303133 !important;
  margin-right: 0.25rem;
}

/* 在header中的stat-value样式调整 */
.card-header .stat-value {
  margin: 0;
}

.card-header .stat-value b {
  font-size: 1.75rem;
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
  margin-right: 320px; /* 为固定定位的查询卡片留出空间：300px宽度 + 20px间距 */
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
  display: block;
  position: fixed; /* 使用fixed定位以便精确控制 */
  top: 120px; /* 初始位置，避免与导航栏重叠 */
  right: 2.5rem; /* 与页面右边距保持一致 */
  width: 300px; /* 固定宽度 */
  margin-top: 0 !important; /* 确保与左侧卡片顶部对齐 */
  z-index: 1000; /* 确保在其他元素之上 */
  transition: top 0.2s ease-out; /* 平滑过渡效果 */
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
  padding: 1rem 0 0.5rem 0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  box-shadow: 0 -0.0625rem 0.375rem 0 rgba(0,0,0,0.03);
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
  --el-dialog-margin-top: 10vh;
}

.edit-dialog :deep(.el-dialog) {
  margin: 10vh auto;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.edit-dialog :deep(.el-dialog__header) {
  flex-shrink: 0;
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #ebeef5;
}

.edit-dialog :deep(.el-dialog__body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.edit-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid #ebeef5;
}

.edit-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
  background: #fafbfc;
  height: 100%;
  max-height: calc(80vh - 160px);
}

.edit-form {
  height: 100%;
}

.edit-form .form-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.edit-form .form-card-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.edit-form .form-card-header::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #409eff;
  margin-right: 8px;
  border-radius: 2px;
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

/* 编辑表单字段布局 */
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

.edit-form :deep(.el-form-item__content) {
  line-height: 32px;
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
    width: 95% !important;
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
    max-width: 350px; /* 平板设备适中的最大宽度 */
    height: 8rem; /* 增加平板设备高度 */
    padding: 1rem 0.5rem; /* 增加内边距 */
  }

  .carousel-page .stat-card {
    max-width: 350px; /* 轮播图内卡片也适配平板 */
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
</style>