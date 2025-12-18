<template>
  <component :is="containerComponent">
    <component :is="contentComponent" :class="wrapperClass">
      <div class="shipment-report-page" :class="{ 'admin-page': isAdmin }">
        <!-- 页面标题 -->
        <div class="page-header">
          <div class="header-content">
            <div class="title-section">
              <el-icon class="header-icon"><Box /></el-icon>
              <h1>出货检验报告</h1>
            </div>
            <p class="subtitle">查询工单信息，生成客户出货检验报告</p>
          </div>
          <div class="header-actions">
            <el-button :disabled="!userStore.hasPermission('shipment:template:view')" type="primary" plain @click="showTemplateManager = true">
              <el-icon><Setting /></el-icon>
              模板管理
            </el-button>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div class="main-content">
          <!-- 左侧：查询和结果 -->
          <div class="left-panel">
            <!-- 搜索区域 -->
            <el-card shadow="hover" class="search-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Search /></el-icon>
                  <span>第一步：查询工单信息</span>
                </div>
              </template>
              
              <el-form :model="searchForm" label-width="100px" class="search-form">
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="工单号">
                      <el-input v-model.trim="searchForm.pNum" placeholder="如 GD25080001" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Document /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="物料编号">
                      <el-input v-model.trim="searchForm.materialId" placeholder="请输入物料编码" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Collection /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="物料名称">
                      <el-input v-model.trim="searchForm.materialName" placeholder="物料名称关键字" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Goods /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="开始时间">
                      <el-date-picker v-model="searchForm.startDate" type="datetime" placeholder="选择开始时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="结束时间">
                      <el-date-picker v-model="searchForm.endDate" type="datetime" placeholder="选择结束时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label=" ">
                      <div class="btn-group">
                        <el-button :disabled="!userStore.hasPermission('shipment:report:search')" type="primary" @click="handleSearch" :loading="loading">
                          <el-icon><Search /></el-icon>查询
                        </el-button>
                        <el-button @click="handleReset">
                          <el-icon><Refresh /></el-icon>重置
                        </el-button>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
            </el-card>

            <!-- 工单信息卡片 -->
            <el-card v-if="result.workOrderInfo" shadow="hover" class="result-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Tickets /></el-icon>
                  <span>工单信息</span>
                  <el-tag type="success" v-if="result.workOrderInfo.StatusDes">{{ result.workOrderInfo.StatusDes }}</el-tag>
                </div>
              </template>
              
              <el-descriptions :column="4" border size="small">
                <el-descriptions-item label="工单号"><el-text type="primary" tag="b">{{ result.workOrderInfo.PNum }}</el-text></el-descriptions-item>
                <el-descriptions-item label="订单号">{{ result.workOrderInfo.OrderNum }}</el-descriptions-item>
                <el-descriptions-item label="CPO">{{ result.workOrderInfo.CPO || '-' }}</el-descriptions-item>
                <el-descriptions-item label="客户编码"><el-tag size="small">{{ result.workOrderInfo.CustomerID }}</el-tag></el-descriptions-item>
                <el-descriptions-item label="产品名称" :span="2">{{ result.workOrderInfo.Product }}</el-descriptions-item>
                <el-descriptions-item label="开单日期">{{ result.workOrderInfo.InDate || '-' }}</el-descriptions-item>
                <el-descriptions-item label="交货日期">{{ result.workOrderInfo.DeliveryDate }}</el-descriptions-item>
                <el-descriptions-item label="业务员" :span="2">{{ result.workOrderInfo.Sales }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 产品资料卡片 -->
            <el-card v-if="result.productInfo && result.productInfo.length > 0" shadow="hover" class="result-card product-card">
              <template #header>
                <div class="card-header">
                  <el-icon><ShoppingBag /></el-icon>
                  <span>第二步：选择产品生成报告</span>
                  <el-tag>{{ result.productInfo.length }} 项</el-tag>
                  <span class="header-tip">勾选多个产品可合并生成一份报告</span>
                  <el-button v-if="selectedProducts.length > 1" :disabled="!userStore.hasPermission('shipment:report:export')" type="success" size="small" style="margin-left: auto" @click="handleBatchGenerateReport">
                    <el-icon><Printer /></el-icon>合并生成报告 ({{ selectedProducts.length }}项)
                  </el-button>
                </div>
              </template>
              
              <el-table 
                ref="productTableRef"
                :data="result.productInfo" 
                stripe border 
                highlight-current-row 
                @row-click="handleProductSelect" 
                @selection-change="handleSelectionChange"
                :row-class-name="getProductRowClass"
              >
                <el-table-column type="selection" width="45" />
                <el-table-column prop="productId" label="产品编码" width="100" show-overflow-tooltip />
                <el-table-column prop="cProductId" label="客户料号" min-width="120" show-overflow-tooltip />
                <el-table-column prop="product" label="产品名称" min-width="180" show-overflow-tooltip />
                <el-table-column prop="cProduct" label="工厂订单号" min-width="120" show-overflow-tooltip />
                <el-table-column prop="scale" label="规格" width="100" show-overflow-tooltip />
                <el-table-column prop="orderCount" label="订单数" width="80" align="right" />
                <el-table-column prop="pCount" label="成品数" width="80" align="right" />
                <el-table-column label="操作" width="120" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="primary" size="small" @click.stop="handleGenerateReport(row)">
                      <el-icon><Printer /></el-icon>生成报告
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 物料信息折叠面板 -->
            <el-collapse v-if="result.materialList.length > 0 || result.materialInList.length > 0" v-model="activeCollapse" class="material-collapse">
              <el-collapse-item name="material" v-if="result.materialList.length > 0">
                <template #title>
                  <div class="collapse-title">
                    <el-icon><Files /></el-icon>
                    <span>物料信息</span>
                    <el-tag type="info" size="small">{{ result.materialList.length }} 项</el-tag>
                  </div>
                </template>
                <el-table :data="result.materialList" stripe border size="small" max-height="300">
                  <el-table-column prop="type" label="类型" width="70">
                    <template #default="{ row }">
                      <el-tag :type="row.type === '纸张' ? 'primary' : 'warning'" size="small">{{ row.type }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="物料名称" min-width="180" show-overflow-tooltip />
                  <el-table-column prop="brand" label="品牌/供应商" width="120" show-overflow-tooltip />
                  <el-table-column prop="spec" label="规格" width="100" show-overflow-tooltip />
                  <el-table-column label="数量" width="100" align="right">
                    <template #default="{ row }">{{ row.srcCount || row.count || '-' }}</template>
                  </el-table-column>
                </el-table>
              </el-collapse-item>

              <el-collapse-item name="materialIn" v-if="result.materialInList.length > 0">
                <template #title>
                  <div class="collapse-title">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>物料入库明细（供应商信息）</span>
                    <el-tag type="success" size="small">{{ result.materialInList.length }} 条</el-tag>
                  </div>
                </template>
                <el-table :data="result.materialInList" stripe border size="small" max-height="300">
                  <el-table-column prop="inId" label="入库单号" width="100" show-overflow-tooltip />
                  <el-table-column prop="inDate" label="入库日期" width="140" show-overflow-tooltip />
                  <el-table-column prop="supply" label="供应商" min-width="150" show-overflow-tooltip>
                    <template #default="{ row }">
                      <el-text type="primary" tag="b">{{ row.supply }}</el-text>
                    </template>
                  </el-table-column>
                  <el-table-column prop="materialName" label="物料名称" min-width="150" show-overflow-tooltip />
                  <el-table-column prop="model" label="型号" width="120" show-overflow-tooltip />
                  <el-table-column prop="materialType" label="物料类型" width="90" show-overflow-tooltip />
                  <el-table-column prop="materialSubType" label="子类型" width="90" show-overflow-tooltip />
                  <el-table-column prop="count" label="数量" width="80" align="right" />
                </el-table>
              </el-collapse-item>
            </el-collapse>

            <!-- 初始提示 -->
            <el-empty v-if="!hasSearched" description="请输入工单号或物料信息进行查询" class="initial-hint">
              <template #image><el-icon :size="80" color="#c0c4cc"><Search /></el-icon></template>
              <div class="hint-text">
                <p>使用说明：</p>
                <ul>
                  <li>1. 输入<strong>工单号</strong>、<strong>物料编号</strong>或<strong>物料名称</strong>查询</li>
                  <li>2. 在产品资料中点击<strong>生成报告</strong>按钮</li>
                  <li>3. 系统根据客户模板生成出货检验报告</li>
                </ul>
              </div>
            </el-empty>

            <el-empty v-if="hasSearched && !result.workOrderInfo && result.materialList.length === 0" description="未查询到相关数据">
              <el-button type="primary" @click="handleReset">重置条件</el-button>
            </el-empty>
          </div>

          <!-- 右侧：报告预览 -->
          <div class="right-panel" v-if="selectedProduct">
            <el-card shadow="hover" class="preview-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Document /></el-icon>
                  <span>报告预览</span>
                  <div class="preview-actions">
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="success" size="small" @click="handleExportReport"><el-icon><Download /></el-icon>导出</el-button>
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="primary" size="small" @click="handlePrintReport"><el-icon><Printer /></el-icon>打印</el-button>
                  </div>
                </div>
              </template>

              <div class="report-preview" ref="previewRef">
                <div class="report-header">
                  <h2>出货检验报告</h2>
                  <p class="report-no">报告编号：{{ reportPreview.reportNo }}</p>
                </div>

                <el-descriptions :column="2" border size="small" class="report-info">
                  <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID }}</el-descriptions-item>
                  <el-descriptions-item label="工单号">{{ result.workOrderInfo?.PNum }}</el-descriptions-item>
                  <el-descriptions-item label="CPO">{{ result.workOrderInfo?.CPO || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="订单号">{{ result.workOrderInfo?.OrderNum }}</el-descriptions-item>
                  <el-descriptions-item label="产品编码">{{ selectedProduct.productId }}</el-descriptions-item>
                  <el-descriptions-item label="客户料号">{{ selectedProduct.cProductId }}</el-descriptions-item>
                  <el-descriptions-item label="产品名称" :span="2">{{ selectedProduct.product }}</el-descriptions-item>
                  <el-descriptions-item label="规格">{{ selectedProduct.scale }}</el-descriptions-item>
                  <el-descriptions-item label="数量">{{ selectedProduct.pCount || selectedProduct.orderCount }}</el-descriptions-item>
                </el-descriptions>

                <div class="report-section">
                  <h4>原材料信息</h4>
                  <el-table :data="result.materialList" border size="small" max-height="180">
                    <el-table-column prop="type" label="类型" width="60" />
                    <el-table-column prop="name" label="物料名称" min-width="120" show-overflow-tooltip />
                    <el-table-column prop="brand" label="供应商" width="100" show-overflow-tooltip />
                    <el-table-column prop="spec" label="规格" width="80" />
                  </el-table>
                </div>

                <div class="report-section">
                  <h4>检验结果</h4>
                  <el-descriptions :column="2" border size="small">
                    <el-descriptions-item label="外观检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="尺寸检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="功能检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="包装检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                  </el-descriptions>
                </div>

                <div class="report-footer">
                  <div class="signature-row">
                    <div class="signature-item"><span>检验员：</span><span class="signature-line"></span></div>
                    <div class="signature-item"><span>审核：</span><span class="signature-line"></span></div>
                    <div class="signature-item"><span>日期：</span><span class="signature-line">{{ reportPreview.date }}</span></div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 模板管理对话框 -->
        <el-dialog v-model="showTemplateManager" title="出货报告模板管理" width="900px">
          <div class="template-toolbar">
            <el-button :disabled="!userStore.hasPermission('shipment:template:add')" type="primary" @click="handleAddTemplate"><el-icon><Plus /></el-icon>新增模板</el-button>
            <el-button @click="fetchTemplates"><el-icon><Refresh /></el-icon>刷新</el-button>
          </div>
          <el-table :data="templateList" stripe border>
            <el-table-column prop="customerId" label="客户编码" width="100" />
            <el-table-column prop="customerName" label="客户名称" width="120" show-overflow-tooltip />
            <el-table-column prop="templateName" label="模板名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="fileName" label="文件名" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link v-if="row.fileName" type="primary" :underline="false" @click="downloadTemplate(row)">
                  {{ row.fileName }}
                </el-link>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="更新时间" width="110" />
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <el-button :disabled="!userStore.hasPermission('shipment:template:edit')" type="primary" link size="small" @click="handleEditTemplate(row)">编辑</el-button>
                <el-button :disabled="!userStore.hasPermission('shipment:template:delete')" type="danger" link size="small" @click="handleDeleteTemplate(row)">删除</el-button>
                <el-button :disabled="!userStore.hasPermission('shipment:template:mapping')" type="success" link size="small" @click="openMappingDialog(row)">映射</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-dialog>

        <!-- 模板预览与映射编辑 - 已移至独立页面 TemplateMappingEditor.vue -->

        <!-- 新增/编辑模板对话框 -->
        <el-dialog v-model="showTemplateForm" :title="templateFormMode === 'add' ? '新增报告模板' : '编辑报告模板'" width="550px">
          <el-form :model="templateForm" label-width="100px" :rules="templateRules" ref="templateFormRef">
            <el-form-item label="客户编码" prop="customerId">
              <el-input v-model="templateForm.customerId" placeholder="请输入客户编码" />
            </el-form-item>
            <el-form-item label="客户名称" prop="customerName">
              <el-input v-model="templateForm.customerName" placeholder="请输入客户名称" />
            </el-form-item>
            <el-form-item label="模板名称" prop="templateName">
              <el-input v-model="templateForm.templateName" placeholder="请输入模板名称" />
            </el-form-item>
            <el-form-item label="模板说明">
              <el-input v-model="templateForm.description" type="textarea" :rows="3" placeholder="请输入模板说明" />
            </el-form-item>
            <el-form-item label="模板文件" :required="templateFormMode === 'add'">
              <!-- 编辑模式：显示当前文件 -->
              <div v-if="templateFormMode === 'edit' && templateForm.fileName" class="current-file-info">
                <div class="file-row">
                  <el-icon><Document /></el-icon>
                  <span class="file-name" :title="templateForm.fileName">{{ templateForm.fileName }}</span>
                  <el-button type="primary" link size="small" @click="downloadCurrentTemplate">
                    <el-icon><Download /></el-icon>下载
                  </el-button>
                </div>
                <div class="file-action">
                  <el-upload 
                    ref="replaceUploadRef"
                    :auto-upload="false" 
                    :limit="1" 
                    :show-file-list="false"
                    accept=".xlsx,.xls,.docx,.doc" 
                    :on-change="handleReplaceTemplateFile"
                  >
                    <el-button type="warning" size="small">
                      <el-icon><RefreshRight /></el-icon>替换文件
                    </el-button>
                  </el-upload>
                  <span v-if="templateForm.newFileName" class="new-file-hint">
                    <el-icon><Check /></el-icon>
                    新文件：{{ templateForm.newFileName }}
                  </span>
                </div>
              </div>
              <!-- 新增模式：选择文件 -->
              <el-upload 
                v-else
                :auto-upload="false" 
                :limit="1" 
                accept=".xlsx,.xls,.docx,.doc" 
                :on-change="handleTemplateFileChange"
              >
                <el-button type="primary"><el-icon><Upload /></el-icon>选择文件</el-button>
                <template #tip><div class="el-upload__tip">支持 Excel、Word 格式</div></template>
              </el-upload>
            </el-form-item>
            <el-form-item label="启用状态">
              <el-switch v-model="templateForm.enabled" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showTemplateForm = false">取消</el-button>
            <el-button type="primary" @click="handleSaveTemplate">保存</el-button>
          </template>
        </el-dialog>

        <!-- 生成报告对话框 -->
        <el-dialog v-model="showReportDialog" title="生成出货检验报告" width="580px">
          <el-alert 
            :type="reportDialogProducts.length > 1 ? 'success' : 'info'" 
            :closable="false" 
            show-icon 
            :title="reportDialogProducts.length > 1 ? `将合并 ${reportDialogProducts.length} 个产品生成一份报告` : '即将为以下产品生成出货检验报告'" 
          />
          
          <!-- 单产品显示 -->
          <el-descriptions v-if="reportDialogProducts.length === 1" :column="1" border size="small" style="margin-top: 16px">
            <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID }}</el-descriptions-item>
            <el-descriptions-item label="产品编码">{{ reportDialogProducts[0]?.productId }}</el-descriptions-item>
            <el-descriptions-item label="客户料号">{{ reportDialogProducts[0]?.cProductId }}</el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ reportDialogProducts[0]?.product }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ reportDialogProducts[0]?.pCount || reportDialogProducts[0]?.orderCount }}</el-descriptions-item>
          </el-descriptions>
          
          <!-- 多产品列表 -->
          <div v-else style="margin-top: 16px">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID }}</el-descriptions-item>
              <el-descriptions-item label="工单号">{{ result.workOrderInfo?.PNum }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="reportDialogProducts" border size="small" style="margin-top: 12px" max-height="200">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="cProductId" label="客户料号" min-width="140" show-overflow-tooltip />
              <el-table-column prop="product" label="产品名称" min-width="150" show-overflow-tooltip />
              <el-table-column prop="pCount" label="数量" width="80" align="right">
                <template #default="{ row }">{{ row.pCount || row.orderCount }}</template>
              </el-table-column>
              <el-table-column prop="scale" label="规格" width="100" show-overflow-tooltip />
            </el-table>
            <div style="margin-top: 8px; color: #909399; font-size: 12px;">
              合计：{{ reportDialogProducts.reduce((sum, p) => sum + (p.pCount || p.orderCount || 0), 0) }} 件
            </div>
          </div>
          
          <el-form label-width="100px" style="margin-top: 16px">
            <el-form-item label="报告模板">
              <el-select v-model="selectedTemplateId" placeholder="选择报告模板" style="width: 100%">
                <el-option v-for="tpl in availableTemplates" :key="tpl.id" :label="tpl.templateName" :value="tpl.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="报告格式">
              <el-radio-group v-model="reportFormat">
                <el-radio label="excel">Excel</el-radio>
                <el-radio label="pdf">PDF</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showReportDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmGenerateReport" :loading="generatingReport">
              <el-icon><Printer /></el-icon>生成报告
            </el-button>
          </template>
        </el-dialog>
      </div>
    </component>
  </component>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box, Search, Document, Collection, Goods, Refresh, Tickets, ShoppingBag, Files, OfficeBuilding, Setting, Plus, Upload, Download, Printer, RefreshRight, Check } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import ExcelJS from 'exceljs'
import AppLayout from '@/components/common/AppLayout.vue'
import ContentWrapper from '@/components/common/ContentWrapper.vue'
import api from '@/utils/api'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const containerComponent = computed(() => isAdmin.value ? 'div' : AppLayout)
const contentComponent = computed(() => isAdmin.value ? 'div' : ContentWrapper)
const wrapperClass = computed(() => isAdmin.value ? '' : 'shipment-content-wrapper')

const searchForm = reactive({ pNum: '', materialId: '', materialName: '', startDate: '', endDate: '' })
const router = useRouter()
const loading = ref(false)
const hasSearched = ref(false)
const result = reactive({ workOrderInfo: null, materialList: [], materialInList: [], productInfo: [] })
const activeCollapse = ref(['material'])
const selectedProduct = ref(null)
const previewRef = ref(null)
const reportPreview = reactive({ reportNo: '', date: '' })
const productTableRef = ref(null)
const selectedProducts = ref([])  // 多选的产品列表

// 引入用户Store
import { useUserStore } from '@/store/user'
const userStore = useUserStore()

/**
 * 获取当前登录用户名
 * 优先从 Pinia userStore 获取，其次从 localStorage 获取
 */
function getCurrentUserName() {
  // 1. 优先从 Pinia userStore 获取
  try {
    if (userStore?.user) {
      const user = userStore.user
      // 尝试多种用户名字段
      const name = user.realName || user.RealName || 
                   user.userName || user.UserName ||
                   user.username || user.Username || 
                   user.name || user.Name ||
                   user.nickName || user.NickName ||
                   user.displayName || user.DisplayName
      if (name) return name
    }
  } catch (e) {
    console.warn('从userStore获取用户信息失败:', e)
  }
  
  // 2. 从 localStorage 获取（Pinia 持久化存储）
  try {
    // Pinia 持久化通常存储在这些键名下
    const possibleKeys = ['user', 'userInfo', 'pinia-user', 'auth', 'currentUser', 'loginUser']
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        // 可能是 { user: {...} } 或直接是用户对象
        const userObj = parsed.user || parsed
        const name = userObj.realName || userObj.RealName ||
                     userObj.userName || userObj.UserName ||
                     userObj.username || userObj.Username || 
                     userObj.name || userObj.Name ||
                     userObj.nickName || userObj.NickName ||
                     userObj.displayName || userObj.DisplayName
        if (name) return name
      }
    }
  } catch (e) {
    console.warn('从localStorage获取用户信息失败:', e)
  }
  
  return '' // 未找到用户信息时返回空
}

// 模板管理
const showTemplateManager = ref(false)
const templateList = ref([])
const showTemplateForm = ref(false)
const templateFormMode = ref('add')
const templateFormRef = ref(null)
const replaceUploadRef = ref(null)
const templateForm = reactive({ 
  id: null, 
  customerId: '', 
  customerName: '', 
  templateName: '', 
  description: '', 
  enabled: true, 
  fileName: '',      // 当前文件名
  fileType: '', 
  fileArrayBuffer: null, 
  fileBase64: null,
  newFileName: '',   // 替换的新文件名
  newFileArrayBuffer: null,  // 替换的新文件内容
  newFileBase64: null
})
const templateRules = {
  customerId: [{ required: true, message: '请输入客户编码', trigger: 'blur' }],
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

// 报告生成
const showReportDialog = ref(false)
const reportDialogProduct = ref(null)  // 兼容旧代码
const reportDialogProducts = ref([])   // 支持多产品
const selectedTemplateId = ref(null)
const reportFormat = ref('excel')
const generatingReport = ref(false)

const availableTemplates = computed(() => {
  if (!result.workOrderInfo?.CustomerID) return templateList.value.filter(t => t.enabled)
  return templateList.value.filter(t => t.enabled && (t.customerId === result.workOrderInfo.CustomerID || t.customerId === 'DEFAULT'))
})

const TEMPLATE_STORAGE_KEY = 'shipment_report_templates'

/**
 * 将ArrayBuffer转换为Base64字符串
 */
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 将Base64字符串转换为ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 将模板列表持久化到localStorage
 */
function saveTemplatesToStorage() {
  try {
    const data = templateList.value.map(t => ({
      id: t.id,
      customerId: t.customerId,
      customerName: t.customerName,
      templateName: t.templateName,
      description: t.description,
      updateTime: t.updateTime,
      enabled: t.enabled,
      fileName: t.fileName || templateForm.fileName || null,
      fileType: t.fileType || templateForm.fileType || null,
      fileBase64: t.fileBase64 || null
    }))
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

/**
 * 从localStorage加载模板列表
 */
function loadTemplatesFromStorage() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) return
    const list = JSON.parse(raw)
    if (Array.isArray(list)) {
      templateList.value = list.map(item => ({
        ...item,
        fileArrayBuffer: item.fileBase64 ? base64ToArrayBuffer(item.fileBase64) : null
      }))
    }
  } catch {}
}

/**
 * 处理模板文件选择，读取并缓存Excel模板的二进制内容
 */
function handleTemplateFileChange(uploadFile) {
  try {
    const raw = uploadFile?.raw
    if (!raw) { ElMessage.warning('未选择有效文件'); return }
    const isExcel = /\.(xlsx|xls)$/i.test(raw.name)
    if (!isExcel) {
      ElMessage.warning('当前仅支持Excel模板（.xlsx/.xls），Word模板暂不渲染')
    }
    const reader = new FileReader()
    reader.onload = e => {
      const arrayBuffer = e.target?.result
      templateForm.fileName = raw.name
      templateForm.fileType = raw.type
      templateForm.fileArrayBuffer = isExcel ? arrayBuffer : null
      templateForm.fileBase64 = isExcel ? arrayBufferToBase64(arrayBuffer) : null
      templateForm.rawFile = raw
      ElMessage.success('模板文件已加载')
    }
    reader.onerror = () => ElMessage.error('读取模板文件失败')
    reader.readAsArrayBuffer(raw)
  } catch (e) {
    ElMessage.error('处理模板文件失败：' + (e.message || '未知错误'))
  }
}

/**
 * ============================================================
 * 客户特殊处理器配置
 * 不同客户的报告模板可能需要不同的数据处理逻辑
 * ============================================================
 */

/**
 * 从产品名称中提取规格（格式：数字*数字mm）
 * 适用于：A08 等客户
 * @param {string} productName - 产品名称
 * @returns {string} 提取的规格，如无则返回空字符串
 */
function extractSpecFromProductName(productName) {
  if (!productName) return ''
  
  const starPos = productName.indexOf('*')
  const mmPos = productName.toLowerCase().indexOf('mm')
  
  // 必须同时包含 * 和 mm，且 mm 在 * 之后
  if (starPos === -1 || mmPos === -1 || mmPos <= starPos) {
    return ''
  }
  
  // 从 * 向前找数字的起始位置
  let startPos = starPos
  while (startPos > 0 && /[\d.]/.test(productName[startPos - 1])) {
    startPos--
  }
  
  // 提取从数字开始到 mm 结束的字符串
  return productName.substring(startPos, mmPos + 2)
}

/**
 * 根据 GB/T1804-c 级公差标准获取允许偏差
 * @param {number} nominal - 标称尺寸(mm)
 * @returns {number} 允许偏差(±)
 */
function getGBT1804cTolerance(nominal) {
  // GB/T1804-c 级线性尺寸公差表
  if (nominal <= 3) return 0.2
  if (nominal <= 6) return 0.3
  if (nominal <= 30) return 0.5
  if (nominal <= 120) return 0.8
  if (nominal <= 400) return 1.2
  if (nominal <= 1000) return 2.0
  if (nominal <= 2000) return 3.0
  return 4.0 // > 2000mm
}

/**
 * 根据规格尺寸生成实测尺寸（按GB/T1804-c级公差）
 * 在公差范围内生成随机的实测值，每次调用生成不同的值
 * @param {string} spec - 规格尺寸，如 "110*220mm"
 * @returns {string} 实测尺寸，如 "110.1*220.2"
 */
function generateMeasuredSize_GBT1804c(spec) {
  if (!spec) return ''
  
  // 提取规格中的数字，格式如 110*220mm 或 110*220
  const match = spec.match(/([\d.]+)\s*\*\s*([\d.]+)/)
  if (!match) return ''
  
  const width = parseFloat(match[1])
  const height = parseFloat(match[2])
  
  if (isNaN(width) || isNaN(height)) return ''
  
  // 获取公差范围
  const widthTol = getGBT1804cTolerance(width)
  const heightTol = getGBT1804cTolerance(height)
  
  // 生成真随机偏差，在公差范围内 [-tolerance, +tolerance]
  // 使用 Math.random() 生成真随机数，每次调用结果不同
  const widthOffset = (Math.random() * 2 - 1) * widthTol   // 范围: -widthTol ~ +widthTol
  const heightOffset = (Math.random() * 2 - 1) * heightTol // 范围: -heightTol ~ +heightTol
  
  const measuredWidth = width + widthOffset
  const measuredHeight = height + heightOffset
  
  // 根据原始精度决定输出精度
  const widthDecimals = (match[1].split('.')[1] || '').length
  const heightDecimals = (match[2].split('.')[1] || '').length
  
  // 实测值至少保留1位小数
  const outWidthDecimals = Math.max(1, widthDecimals)
  const outHeightDecimals = Math.max(1, heightDecimals)
  
  return `${measuredWidth.toFixed(outWidthDecimals)}*${measuredHeight.toFixed(outHeightDecimals)}`
}

/**
 * 客户特殊处理器配置表
 * 每个客户可以配置不同的处理函数
 * 
 * 配置项说明：
 * - extractSpec: 从产品名称提取规格的函数，参数(productName)，返回规格字符串
 * - generateMeasuredSize: 生成实测尺寸的函数，参数(spec)，返回实测尺寸字符串
 * - customFields: 自定义字段处理函数，参数(product, context)，返回额外字段对象
 * - columnWidths: 模板列宽配置数组（从Excel中读取的实际列宽值，A列开始）
 * 
 * 添加新客户处理器示例：
 * 'B01': {
 *   extractSpec: (name) => { ... },  // 自定义规格提取
 *   generateMeasuredSize: (spec) => { ... },  // 自定义实测尺寸计算
 *   customFields: (product, ctx) => ({ 自定义字段: '值' }),
 *   columnWidths: [4.4, 6.9, ...]  // A列开始的列宽数组
 * }
 */
const CUSTOMER_HANDLERS = {
  // A08 客户：贴纸类产品，规格在产品名称中，按GB/T1804-c公差
  'A08': {
    extractSpec: extractSpecFromProductName,
    generateMeasuredSize: generateMeasuredSize_GBT1804c,
    // 自定义字段：检测项自动填OK，结果判定填合格
    customFields: () => ({
      // 首件核对（J~N列）
      外观: 'OK',
      颜色: 'OK',
      图文: 'OK',
      字体: 'OK',
      啤切线: 'OK',
      // 工单核对（O~Q列）
      物料编号: 'OK',
      模切方式: 'OK',
      包装方式: 'OK',
      // 图纸核对（R~S列）
      材质: 'OK',
      印刷内容: 'OK',
      // 结果判定（V列）
      结果判定: '合格'
    }),
    // 模板列宽配置（Excel中A~W列的实际列宽值）
    // 这是从Excel模板中直接读取的列宽，确保生成报告与模板打印效果一致
    columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7]
  },
  
  // A84 客户：与A08使用相同的处理逻辑和模板
  'A84': {
    extractSpec: extractSpecFromProductName,
    generateMeasuredSize: generateMeasuredSize_GBT1804c,
    customFields: () => ({
      外观: 'OK',
      颜色: 'OK',
      图文: 'OK',
      字体: 'OK',
      啤切线: 'OK',
      物料编号: 'OK',
      模切方式: 'OK',
      包装方式: 'OK',
      材质: 'OK',
      印刷内容: 'OK',
      结果判定: '合格'
    }),
    columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7]
  }
  
  // 示例：添加其他客户处理器
  // 'B01': {
  //   extractSpec: (name) => { /* B01客户的规格提取逻辑 */ },
  //   generateMeasuredSize: (spec) => { /* B01客户的实测尺寸计算 */ }
  // },
  // 'C02': {
  //   extractSpec: null,  // 不需要提取规格
  //   generateMeasuredSize: generateMeasuredSize_GBT1804c,  // 复用GB/T1804-c
  //   customFields: (product, ctx) => ({
  //     '批次号': `${ctx.PNum}-${product.productId}`
  //   })
  // }
}

/**
 * 获取客户处理器
 * @param {string} customerID - 客户编码
 * @returns {object|null} 处理器配置对象
 */
function getCustomerHandler(customerID) {
  return CUSTOMER_HANDLERS[customerID] || null
}

/**
 * 构造填充模板的上下文数据
 * 支持单产品和多产品模式
 */
function buildTemplateContext() {
  const wo = result.workOrderInfo || {}
  const customerID = wo.CustomerID || ''
  
  // 获取客户特殊处理器
  const handler = getCustomerHandler(customerID)
  console.log('buildTemplateContext - customerID:', customerID, 'handler:', handler ? '已获取' : '未找到')

  // 获取要处理的产品列表（多产品或单产品）
  const products = reportDialogProducts.value && reportDialogProducts.value.length > 0 
    ? reportDialogProducts.value 
    : (selectedProduct.value ? [selectedProduct.value] : [])
  
  // 第一个产品用于填充顶部字段（单产品模式时的主要产品）
  const sp = products[0] || {}
  
  // 构建表格数据 - 支持多产品，只包含明确定义的字段
  const tableData = products.map((p, index) => {
    // 只提取我们明确需要的字段，避免原始对象的其他属性干扰
    const count = p.pCount || p.orderCount || ''
    
    // 规格处理：优先使用原有规格，否则尝试用处理器提取
    let scale = p.scale || ''
    if (!scale && handler?.extractSpec && p.product) {
      scale = handler.extractSpec(p.product)
    }
    
    // 实测尺寸：如果处理器配置了生成函数，则自动生成
    const measuredSize = handler?.generateMeasuredSize ? handler.generateMeasuredSize(scale) : ''
    console.log(`产品 ${index + 1} - scale: ${scale}, measuredSize: ${measuredSize}`)
    
    // 基础字段
    const baseFields = {
      // 序号
      Index: index + 1,
      序号: index + 1,
      
      // 产品编码
      ProductID: p.productId || '',
      产品编码: p.productId || '',
      
      // 客户料号
      CProductID: p.cProductId || '',
      客户料号: p.cProductId || '',
      
      // 产品名称
      Product: p.product || '',
      产品名称: p.product || '',
      品名: p.product || '',
      
      // 工厂订单号
      CProduct: p.cProduct || '',
      工厂订单号: p.cProduct || '',
      
      // 规格（可由处理器自动提取）
      Scale: scale,
      规格: scale,
      规格尺寸: scale,
      
      // 实测尺寸（可由处理器自动生成）
      MeasuredSize: measuredSize,
      实测尺寸: measuredSize,
      实测: measuredSize,
      
      // 数量 - 统一使用同一个值
      Count: count,
      数量: count,
      出货数量: count,
      OrderCount: count,
      订单数: count,
      PCount: count,
      成品数: count
    }
    
    // 如果处理器有自定义字段函数，合并自定义字段
    if (handler?.customFields) {
      const customData = handler.customFields(p, { customerID, wo, index })
      console.log(`产品 ${index + 1} - customFields:`, customData)
      Object.assign(baseFields, customData)
    } else {
      console.log(`产品 ${index + 1} - 无customFields函数`)
    }
    
    console.log(`产品 ${index + 1} - 最终baseFields包含字段:`, Object.keys(baseFields))
    
    return baseFields
  })
  
  // 计算合计数量
  const totalCount = products.reduce((sum, p) => sum + (p.pCount || p.orderCount || 0), 0)
  
  // 生成报告编号
  const now = new Date()
  const reportNo = reportPreview.reportNo || `SR${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const reportDate = reportPreview.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  // 第一个产品的规格（可由处理器自动提取）
  let spScale = sp.scale || ''
  if (!spScale && handler?.extractSpec && sp.product) {
    spScale = handler.extractSpec(sp.product)
  }
  
  return {
    // 工单信息
    CustomerID: wo.CustomerID || '',
    客户编码: wo.CustomerID || '',
    PNum: wo.PNum || '',
    工单号: wo.PNum || '',
    CPO: wo.CPO || '',
    OrderNum: wo.OrderNum || '',
    订单号: wo.OrderNum || '',
    
    // 产品信息（第一个产品，用于单产品模式或顶部字段）
    ProductID: sp.productId || '',
    产品编码: sp.productId || '',
    CProductID: sp.cProductId || '',
    客户料号: sp.cProductId || '',
    Product: sp.product || '',
    产品名称: sp.product || '',
    品名: sp.product || '',
    CProduct: sp.cProduct || '',
    工厂订单号: sp.cProduct || '',
    Scale: spScale,
    规格: spScale,
    Count: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    数量: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    出货数量: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    
    // 合计信息（多产品模式）
    TotalCount: totalCount,
    合计数量: totalCount,
    ProductCount: products.length,
    产品数量: products.length,
    
    // 报告信息
    ReportNo: reportNo,
    报告编号: reportNo,
    ReportDate: reportDate,
    日期: reportDate,
    报告日期: reportDate,
    
    // 检验人员和日期（底部签名区）
    Inspector: getCurrentUserName(),
    检验人员: getCurrentUserName(),
    检验员: getCurrentUserName(),
    InspectDate: reportDate,
    检验日期: reportDate,
    
    // 表格数据
    tableData
  }
}

/**
 * 使用占位符 {{Key}} 填充Excel模板工作簿
 */
function fillWorkbookPlaceholders(wb, context) {
  try {
    const replaceText = (text) => {
      if (typeof text !== 'string') return text
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '')
    }
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name]
      Object.keys(ws).forEach(addr => {
        const cell = ws[addr]
        if (cell && cell.v !== undefined) {
          cell.v = replaceText(cell.v)
        }
      })
    })
    return wb
  } catch (e) {
    throw e
  }
}

/**
 * 基于上传的Excel模板执行导出（保留模板样式与布局）
 */
async function exportFromTemplate(template) {
  try {
    const arrayBuffer = template?.fileArrayBuffer
    let buf = arrayBuffer
    if (!buf && template?.id) {
      const resp = await api.get(`/shipment-report/templates/${template.id}/download`, { responseType: 'arraybuffer' })
      buf = resp
    }
    if (!buf) { throw new Error('未加载Excel模板文件') }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buf)
    
    // 优先使用后端保存的映射
    let mapping = null
    try {
      const resp = await api.get(`/shipment-report/templates/${template.id}/mapping`)
      mapping = resp?.data ?? resp
      console.log('获取到的映射配置:', mapping)
    } catch (e) {
      console.warn('获取映射配置失败:', e)
    }

    const ctx = buildTemplateContext()
    console.log('构建的上下文数据:', ctx)
    
    // 检查映射是否有效（非空对象且有字段或表格配置）
    const hasValidMapping = mapping && 
      (
        (mapping.fields && mapping.fields.length > 0) || 
        (mapping.table && mapping.table.columns && mapping.table.columns.length > 0) ||
        (mapping.placeholders && mapping.placeholders.length > 0)
      )
    
    if (hasValidMapping) {
      console.log('使用映射配置填充模板')
      applyMappingFill(workbook, mapping, ctx)
    } else {
      console.log('无有效映射，使用自动识别填充')
      // 无映射时，退化为标签+表头自动填充
      const worksheet = workbook.worksheets[0]
      const headerPairs = [
        { label: '客户编码', value: result.workOrderInfo?.CustomerID },
        { label: '工单号', value: result.workOrderInfo?.PNum },
        { label: '订单号', value: result.workOrderInfo?.OrderNum },
        { label: '客户料号', value: selectedProduct.value?.cProductId },
        { label: '产品名称', value: selectedProduct.value?.product },
        { label: '规格', value: selectedProduct.value?.scale },
        { label: '数量', value: selectedProduct.value?.pCount || selectedProduct.value?.orderCount },
        { label: 'CPO', value: result.workOrderInfo?.CPO },
        { label: '报告编号', value: reportPreview.reportNo },
        { label: '日期', value: reportPreview.date }
      ]
      writeLabelValues(worksheet, headerPairs)
      const tableHeaders = ['序号', '客户料号', '产品名称', '出货数量', '规格']
      const headerRowNumber = findHeaderRow(worksheet, tableHeaders)
      if (headerRowNumber) {
        const startRow = headerRowNumber + 1
        setRowValuesByHeader(worksheet, headerRowNumber, startRow, [
          { header: '序号', value: 1 },
          { header: '客户料号', value: selectedProduct.value?.cProductId },
          { header: '产品名称', value: selectedProduct.value?.product },
          { header: '出货数量', value: selectedProduct.value?.pCount || selectedProduct.value?.orderCount },
          { header: '规格', value: selectedProduct.value?.scale }
        ])
      }
    }

    // 列宽处理：优先使用映射配置中的columnWidths，其次使用客户硬编码配置
    const customerID = result.workOrderInfo?.CustomerID || ''
    const handler = getCustomerHandler(customerID)
    const targetSheetIndex = mapping?.table?.sheetIndex || 0
    const ws = workbook.worksheets[targetSheetIndex]
    
    // 根据用户反馈的数据对比，ExcelJS 写入时列宽会变窄约 0.63
    const WIDTH_COMPENSATION = 0.63
    // Excel中的列宽单位是字符数，但实际渲染受到默认字体影响
    // 这里添加一个全局放大系数 1.43
    const GLOBAL_SCALE = 1.43

    // 列宽来源优先级：1.映射配置中的columnWidths  2.客户处理器的硬编码columnWidths
    let widthSource = null
    let widthSourceName = ''
    
    // 优先使用映射配置中的列宽（模板映射编辑器中手动配置的）
    if (mapping?.layout?.columnWidths && Array.isArray(mapping.layout.columnWidths) && mapping.layout.columnWidths.length > 0) {
      widthSource = mapping.layout.columnWidths
      widthSourceName = '映射配置'
    }
    // 其次使用客户处理器的硬编码列宽
    else if (handler?.columnWidths && Array.isArray(handler.columnWidths)) {
      widthSource = handler.columnWidths
      widthSourceName = `客户${customerID}硬编码`
    }

    if (ws && widthSource) {
      console.log(`使用${widthSourceName}列宽, 长度: ${widthSource.length}`)

      widthSource.forEach((w, idx) => {
        if (typeof w === 'number' && w > 0) {
          try {
            const col = ws.getColumn(idx + 1)
            if (col) {
              const finalWidth = (w * GLOBAL_SCALE) + WIDTH_COMPENSATION
              col.width = finalWidth
              // 关键修复：显式标记 customWidth，否则 Excel 可能会忽略该宽度
              // @ts-ignore
              col.customWidth = true 
              console.log(`列 ${idx + 1} 设置宽度: ${finalWidth} (原值: ${w})`)
            }
          } catch (e) { /* 忽略 */ }
        }
      })
    } else {
      console.log('未找到列宽配置，跳过列宽设置')
    }

    console.log('=== 列宽设置完成 ===')

    const outBuffer = await workbook.xlsx.writeBuffer()
    
    // 生成文件名：客户编码_出货检验报告_工单号_x项_yymmddhhmmss.xlsx
    const pNum = result.workOrderInfo?.PNum || ''
    const productCount = reportDialogProducts.value?.length || 1
    
    // 生成时间戳 yymmddhhmmss
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${yy}${mm}${dd}${hh}${mi}${ss}`
    
    // 组装文件名：A08_出货检验报告_工单号_x项_yymmddhhmmss.xlsx
    let fileName = ''
    if (customerID) fileName += `${customerID}_`
    fileName += '出货检验报告'
    if (pNum) fileName += `_${pNum}`
    if (productCount > 1) fileName += `_${productCount}项`
    fileName += `_${timestamp}.xlsx`
    
    saveAs(new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
    ElMessage.success('报告导出成功')
  } catch (e) {
    ElMessage.error('模板导出失败：' + (e.message || '未知错误'))
  }
}

/**
 * 根据映射配置填充 ExcelJS 工作簿
 * @param {ExcelJS.Workbook} workbook - ExcelJS 工作簿对象
 * @param {Object} mapping - 映射配置
 * @param {Object} ctx - 填充上下文数据
 */
function applyMappingFill(workbook, mapping, ctx) {
  if (!workbook || !mapping) {
    console.warn('applyMappingFill: workbook或mapping为空')
    return
  }
  
  const sheetIndex = mapping.table?.sheetIndex || 0
  const worksheet = workbook.worksheets[sheetIndex]
  if (!worksheet) {
    console.warn(`applyMappingFill: 找不到工作表 ${sheetIndex}`)
    return
  }
  
  console.log('开始填充映射，工作表索引:', sheetIndex)

  // 1. 填充顶部字段 (fields)
  if (mapping.fields && Array.isArray(mapping.fields)) {
    console.log('填充顶部字段，数量:', mapping.fields.length)
    mapping.fields.forEach(field => {
      if (!field.cell) return
      // 支持通过 name 或 label 获取值
      const value = ctx[field.name] ?? ctx[field.label]
      console.log(`  字段 ${field.name} -> ${field.cell} = ${value}`)
      if (value !== undefined && value !== null && value !== '') {
        try {
          const cell = worksheet.getCell(field.cell)
          // 清除可能存在的公式
          if (cell.formula || cell.sharedFormula) {
            cell.formula = undefined
          }
          cell.value = value
        } catch (e) {
          console.warn(`填充字段 ${field.name} 到 ${field.cell} 失败:`, e.message)
        }
      }
    })
  }

  // 2. 填充占位符 (placeholders)
  if (mapping.placeholders && Array.isArray(mapping.placeholders)) {
    console.log('填充占位符，数量:', mapping.placeholders.length)
    mapping.placeholders.forEach(ph => {
      if (!ph.cell) return
      const value = ctx[ph.name]
      console.log(`  占位符 ${ph.name} -> ${ph.cell} = ${value}`)
      if (value !== undefined && value !== null && value !== '') {
        try {
          const cell = worksheet.getCell(ph.cell)
          // 清除可能存在的公式
          if (cell.formula || cell.sharedFormula) {
            cell.formula = undefined
          }
          cell.value = value
        } catch (e) {
          console.warn(`填充占位符 ${ph.name} 到 ${ph.cell} 失败:`, e.message)
        }
      }
    })
  }

  // 3. 填充表格数据 (table)
  // 定义允许的字段名白名单
  const ALLOWED_FIELD_NAMES = new Set([
    // 序号
    'Index', '序号',
    // 产品编码
    'ProductID', '产品编码',
    // 客户料号
    'CProductID', '客户料号',
    // 产品名称
    'Product', '产品名称', '品名',
    // 工厂订单号
    'CProduct', '工厂订单号',
    // 规格
    'Scale', '规格', '规格尺寸',
    // 实测尺寸
    'MeasuredSize', '实测尺寸', '实测',
    // 数量
    'Count', '数量', '出货数量', 'OrderCount', '订单数', 'PCount', '成品数',
    // 检测项（A08客户等）
    '外观', '颜色', '图文', '字体', '啤切线',
    '物料编号', '模切方式', '包装方式',
    '材质', '印刷内容',
    // 结果判定
    '结果判定', '判定结果', '结果'
  ])
  
  const tableData = ctx.tableData
  if (mapping.table && tableData && Array.isArray(tableData) && tableData.length > 0) {
    const { startRow, columns } = mapping.table
    console.log('填充表格数据，起始行:', startRow, '列数:', columns?.length, '数据行数:', tableData.length)
    console.log('列映射配置:', JSON.stringify(columns, null, 2))
    
    if (!startRow || !columns || !Array.isArray(columns) || columns.length === 0) {
      console.warn('表格配置不完整，跳过表格填充')
      return
    }

    // 预先清除数据区域的公式（避免共享公式错误）
    const endRow = startRow + tableData.length - 1
    columns.forEach(col => {
      const targetCol = col.merge ? col.merge.startCol : col.col
      if (!targetCol) return
      for (let r = startRow; r <= endRow; r++) {
        try {
          const cell = worksheet.getCell(r, targetCol)
          // 如果单元格有公式，清除它
          if (cell.formula || cell.sharedFormula || cell._value?.formula) {
            cell.value = null
            cell.formula = undefined
          }
        } catch (e) {
          // 忽略错误，继续处理
        }
      }
    })

    tableData.forEach((rowData, rowIndex) => {
      const excelRowNum = startRow + rowIndex
      console.log(`  填充第 ${excelRowNum} 行`)
      
      columns.forEach(col => {
        // 检查字段名是否在白名单中
        const fieldName = col.name || col.header
        if (!fieldName) {
          console.warn(`    跳过：列配置缺少name和header`)
          return
        }
        
        // 只使用白名单中的字段名
        if (!ALLOWED_FIELD_NAMES.has(fieldName) && !ALLOWED_FIELD_NAMES.has(col.name) && !ALLOWED_FIELD_NAMES.has(col.header)) {
          console.warn(`    跳过：字段名 "${fieldName}" 不在白名单中`)
          return
        }
        
        // 只使用明确配置的字段名获取数据
        let value = undefined
        
        // 优先使用 name 字段匹配
        if (col.name && ALLOWED_FIELD_NAMES.has(col.name) && rowData[col.name] !== undefined) {
          value = rowData[col.name]
        }
        // 其次使用 header 字段匹配
        else if (col.header && ALLOWED_FIELD_NAMES.has(col.header) && rowData[col.header] !== undefined) {
          value = rowData[col.header]
        }
        
        // 跳过空值
        if (value === undefined || value === null || value === '') return

        // 使用起始列（处理合并单元格情况）
        const targetCol = col.merge ? col.merge.startCol : col.col
        if (!targetCol) {
          console.warn(`    列 ${col.name || col.header} 没有指定列号`)
          return
        }

        console.log(`    列 [name=${col.name}, header=${col.header}] -> 第${targetCol}列 = ${value}`)
        try {
          const cell = worksheet.getCell(excelRowNum, targetCol)
          // 公式已在前面预先清除，直接写入值
          cell.value = value
        } catch (e) {
          console.warn(`填充表格数据 (${excelRowNum}, ${targetCol}) 失败:`, e.message)
        }
      })
    })
  } else {
    console.log('无表格数据需要填充')
  }
  
  console.log('映射填充完成')
}

/**
 * 在包含 label 文本的单元格右侧写入值
 */
function writeLabelValues(worksheet, pairs) {
  pairs.forEach(({ label, value }) => {
    if (value === undefined || value === null) return
    const pos = findTextCell(worksheet, label)
    if (pos) {
      const { row, col } = pos
      worksheet.getRow(row).getCell(col + 1).value = value
    }
  })
}

/**
 * 查找包含指定文本的单元格位置
 */
function findTextCell(worksheet, text) {
  for (let r = worksheet.dimensions.top; r <= worksheet.dimensions.bottom; r++) {
    const row = worksheet.getRow(r)
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const cell = row.getCell(c)
      if (cell && typeof cell.value === 'string' && cell.value.trim() === text) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

/**
 * 查找表头行（匹配至少一个目标表头）
 */
function findHeaderRow(worksheet, headers) {
  for (let r = worksheet.dimensions.top; r <= worksheet.dimensions.bottom; r++) {
    const row = worksheet.getRow(r)
    const texts = []
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const val = row.getCell(c).value
      if (typeof val === 'string') texts.push(val.trim())
    }
    if (headers.some(h => texts.includes(h))) return r
  }
  return null
}

/**
 * 根据表头名称将值写入指定行
 */
function setRowValuesByHeader(worksheet, headerRowNumber, targetRowNumber, pairs) {
  const headerRow = worksheet.getRow(headerRowNumber)
  pairs.forEach(({ header, value }) => {
    if (value === undefined || value === null) return
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const val = headerRow.getCell(c).value
      if (typeof val === 'string' && val.trim() === header) {
        worksheet.getRow(targetRowNumber).getCell(c).value = value
        break
      }
    }
  })
}

/**
 * 基于Excel模板渲染为HTML并打印
 */
async function printFromTemplate(template) {
  try {
    const arrayBuffer = template?.fileArrayBuffer
    let buf = arrayBuffer
    if (!buf && template?.id) {
      const resp = await api.get(`/shipment-report/templates/${template.id}/download`, { responseType: 'arraybuffer' })
      buf = resp
    }
    if (!buf) { throw new Error('未加载Excel模板文件') }
    const wb = XLSX.read(buf, { type: 'array' })
    const ctx = buildTemplateContext()
    const filled = fillWorkbookPlaceholders(wb, ctx)
    const firstSheet = filled.Sheets[filled.SheetNames[0]]
    const html = XLSX.utils.sheet_to_html(firstSheet)
    let win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
    } else {
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (!doc) throw new Error('打印窗口不可用')
      doc.open()
      doc.write(html)
      doc.close()
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 200)
    }
    ElMessage.success('按模板打印成功')
  } catch (e) {
    ElMessage.error('模板打印失败：' + (e.message || '未知错误'))
  }
}

/**
 * 获取当前选择的模板对象
 */
function getSelectedTemplate() {
  const id = selectedTemplateId.value
  if (!id) return null
  return templateList.value.find(t => t.id === id) || null
}

/**
 * 执行查询，根据工单/物料条件获取报告所需数据
 */
async function handleSearch() {
  if (!searchForm.pNum && !searchForm.materialId && !searchForm.materialName) {
    ElMessage.warning('请至少输入一个查询条件')
    return
  }
  loading.value = true
  hasSearched.value = true
  selectedProduct.value = null
  try {
    const params = {}
    if (searchForm.pNum) params.pNum = searchForm.pNum.trim()
    if (searchForm.materialId) params.materialId = searchForm.materialId.trim()
    if (searchForm.materialName) params.materialName = searchForm.materialName.trim()
    params.StartDate = searchForm.startDate || formatDateTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    params.EndDate = searchForm.endDate || formatDateTime(new Date())

    const response = await api.get('/erp/shipment-report', { params })
    let res = response.data && response.data.workOrderInfo !== undefined ? response.data : response

    if (res.code !== undefined) {
      if (res.code === 0 && res.data) {
        Object.assign(result, { workOrderInfo: res.data.workOrderInfo, materialList: res.data.materialList || [], materialInList: res.data.materialInList || [], productInfo: res.data.productInfo || [] })
      } else {
        ElMessage.error(res.message || '查询失败')
        return
      }
    } else {
      Object.assign(result, { workOrderInfo: res.workOrderInfo, materialList: res.materialList || [], materialInList: res.materialInList || [], productInfo: res.productInfo || [] })
    }

    const parts = []
    if (result.workOrderInfo) parts.push('工单 1 条')
    if (result.productInfo?.length > 0) parts.push(`产品 ${result.productInfo.length} 项`)
    if (result.materialList.length > 0) parts.push(`物料 ${result.materialList.length} 项`)
    if (result.materialInList.length > 0) parts.push(`入库明细 ${result.materialInList.length} 条`)
    parts.length > 0 ? ElMessage.success(`查询成功：${parts.join('、')}`) : ElMessage.info('未找到匹配的数据')
  } catch (error) {
    ElMessage.error('查询失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm:ss 字符串
 */
function formatDateTime(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/**
 * 重置查询条件与结果
 */
function handleReset() {
  Object.assign(searchForm, { pNum: '', materialId: '', materialName: '', startDate: '', endDate: '' })
  Object.assign(result, { workOrderInfo: null, materialList: [], materialInList: [], productInfo: [] })
  hasSearched.value = false
  selectedProduct.value = null
  selectedProducts.value = []
  reportDialogProducts.value = []
  if (productTableRef.value) {
    productTableRef.value.clearSelection()
  }
}

/**
 * 选择产品行，刷新右侧预览数据
 */
function handleProductSelect(row) {
  selectedProduct.value = row
  const now = new Date()
  reportPreview.reportNo = `SR${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  reportPreview.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 设置产品行高亮样式
 */
function getProductRowClass({ row }) {
  return selectedProduct.value?.productId === row.productId ? 'selected-row' : ''
}

/**
 * 处理表格多选变化
 */
function handleSelectionChange(selection) {
  selectedProducts.value = selection
}

/**
 * 触发单产品生成报告流程
 */
function handleGenerateReport(row) {
  selectedProduct.value = row
  reportDialogProduct.value = row
  reportDialogProducts.value = [row]  // 单产品数组
  const customerId = result.workOrderInfo?.CustomerID
  const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
  selectedTemplateId.value = matched?.id || templateList.value[0]?.id
  showReportDialog.value = true
}

/**
 * 触发多产品合并生成报告流程
 */
function handleBatchGenerateReport() {
  if (selectedProducts.value.length < 2) {
    ElMessage.warning('请至少选择2个产品进行合并生成')
    return
  }
  selectedProduct.value = selectedProducts.value[0]
  reportDialogProduct.value = selectedProducts.value[0]
  reportDialogProducts.value = [...selectedProducts.value]  // 多产品数组
  const customerId = result.workOrderInfo?.CustomerID
  const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
  selectedTemplateId.value = matched?.id || templateList.value[0]?.id
  showReportDialog.value = true
}

/**
 * 确认生成报告
 */
async function confirmGenerateReport() {
  if (!selectedTemplateId.value) { ElMessage.warning('请选择报告模板'); return }
  generatingReport.value = true
  try {
    await new Promise(r => setTimeout(r, 500))
    showReportDialog.value = false
    
    // 如果是单产品，更新预览
    if (reportDialogProducts.value.length === 1) {
      handleProductSelect(reportDialogProducts.value[0])
    }
    
    const tpl = getSelectedTemplate()
    const useTemplate = !!(tpl?.id)
    console.log('生成报告，使用模板:', useTemplate, '模板ID:', tpl?.id, '产品数量:', reportDialogProducts.value.length)
    
    if (reportFormat.value === 'excel') {
      useTemplate ? await exportFromTemplate(tpl) : handleExportReport()
    } else {
      useTemplate ? await printFromTemplate(tpl) : handlePrintReport()
    }
    ElMessage.success('报告生成成功')
    
    // 清空多选
    if (productTableRef.value) {
      productTableRef.value.clearSelection()
    }
  } catch (err) {
    ElMessage.error('导出/打印失败：' + (err.message || '未知错误'))
  } finally {
    generatingReport.value = false
  }
}

/**
 * 导出报告为Excel文件
 */
function handleExportReport() {
  if (!selectedProduct.value || !result.workOrderInfo) {
    ElMessage.warning('请先选择产品')
    return
  }
  const tpl = getSelectedTemplate()
  // 只要选择了模板（有id），就使用模板导出
  if (tpl?.id) {
    exportFromTemplate(tpl)
    return
  }
  try {
    const materialRows = (result.materialList || []).map(m => [m.type || '', m.name || '', m.brand || '', m.spec || ''])
    const rows = [
      ['出货检验报告'],
      ['报告编号', reportPreview.reportNo],
      ['日期', reportPreview.date],
      [],
      ['客户编码', result.workOrderInfo.CustomerID, '工单号', result.workOrderInfo.PNum],
      ['CPO', result.workOrderInfo.CPO || '-', '订单号', result.workOrderInfo.OrderNum],
      ['产品编码', selectedProduct.value.productId, '客户料号', selectedProduct.value.cProductId],
      ['产品名称', selectedProduct.value.product, '规格', selectedProduct.value.scale],
      ['数量', selectedProduct.value.pCount || selectedProduct.value.orderCount],
      [],
      ['原材料信息'],
      ['类型', '物料名称', '供应商', '规格'],
      ...materialRows,
      [],
      ['检验结果'],
      ['外观检验', '合格'],
      ['尺寸检验', '合格'],
      ['功能检验', '合格'],
      ['包装检验', '合格']
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, '出货报告')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    
    // 生成专业的文件名
    const customerID = result.workOrderInfo?.CustomerID || ''
    const pNum = result.workOrderInfo?.PNum || ''
    const dateStr = reportPreview.date || new Date().toISOString().slice(0, 10)
    let fileName = '出货检验报告'
    if (customerID) fileName += `_${customerID}`
    if (pNum) fileName += `_${pNum}`
    fileName += `_${dateStr}.xlsx`
    
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
    ElMessage.success('Excel 导出成功')
  } catch (e) {
    ElMessage.error('导出失败：' + (e.message || '未知错误'))
  }
}
/**
 * 打印报告（可选择另存为PDF）
 */
function handlePrintReport() {
  try {
    if (!previewRef.value) {
      ElMessage.warning('请先选择产品以生成预览')
      return
    }
    const html = previewRef.value.innerHTML
    let printWin = window.open('', '_blank')
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; }
        .report-header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #333; margin-bottom: 12px; }
        .report-section { margin-bottom: 12px; }
        .report-section h4 { margin: 0 0 8px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      </style>
    `
    if (printWin) {
      printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${html}</body></html>`)
      printWin.document.close()
      printWin.focus()
      printWin.print()
    } else {
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (!doc) throw new Error('打印窗口不可用')
      doc.open()
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${html}</body></html>`)
      doc.close()
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 200)
    }
  } catch (e) {
    ElMessage.error('打印失败：' + (e.message || '未知错误'))
  }
}

/**
 * 打开新增模板表单
 */
function handleAddTemplate() {
  templateFormMode.value = 'add'
  Object.assign(templateForm, { 
    id: null, 
    customerId: '', 
    customerName: '', 
    templateName: '', 
    description: '', 
    enabled: true, 
    fileName: '', 
    fileType: '', 
    fileArrayBuffer: null, 
    fileBase64: null,
    rawFile: null,
    newFileName: '',
    newFileArrayBuffer: null,
    newFileBase64: null
  })
  showTemplateForm.value = true
}

/**
 * 编辑模板，填充表单
 */
function handleEditTemplate(row) {
  templateFormMode.value = 'edit'
  Object.assign(templateForm, { 
    ...row, 
    fileArrayBuffer: row.fileBase64 ? base64ToArrayBuffer(row.fileBase64) : row.fileArrayBuffer || null,
    // 清空替换文件相关字段
    newFileName: '',
    newFileArrayBuffer: null,
    newFileBase64: null
  })
  showTemplateForm.value = true
}

/**
 * 下载当前模板文件
 */
function downloadCurrentTemplate() {
  if (!templateForm.id) return
  const tpl = templateList.value.find(t => t.id === templateForm.id)
  if (tpl) {
    downloadTemplate(tpl)
  }
}

/**
 * 处理替换模板文件
 */
function handleReplaceTemplateFile(uploadFile) {
  const file = uploadFile.raw
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    templateForm.newFileName = file.name
    templateForm.newFileArrayBuffer = e.target.result
    templateForm.newFileBase64 = arrayBufferToBase64(e.target.result)
    templateForm.fileType = file.type || file.name.split('.').pop()
    ElMessage.success(`已选择新文件：${file.name}`)
  }
  reader.readAsArrayBuffer(file)
}

/**
 * 打开映射编辑对话框，加载后端解析与已保存映射
 */
/**
 * 打开映射编辑页面
 */
function openMappingDialog(row) {
  router.push(`/shipment-report/template-mapping/${row.id}`)
}

/**
 * 保存当前映射到后端（保留兼容）
 */
async function saveCurrentMapping() {
  try {
    if (!mappingTemplateId) { ElMessage.warning('缺少模板ID'); return }
    await api.post(`/shipment-report/templates/${mappingTemplateId}/mapping`, mappingData)
    ElMessage.success('映射保存成功')
  } catch (e) {
    ElMessage.error('保存映射失败：' + (e.message || '未知错误'))
  }
}

async function fetchTemplates() {
  try {
    const resp = await api.get('/shipment-report/templates')
    const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : [])
    templateList.value = list
  } catch {}
}

/**
 * 下载模板文件
 */
async function downloadTemplate(row) {
  try {
    const resp = await api.get(`/shipment-report/templates/${row.id}/download`, { responseType: 'blob' })
    const blob = new Blob([resp], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, row.fileName || `template_${row.id}.xlsx`)
  } catch (e) {
    ElMessage.error('下载失败：' + (e.message || '未知错误'))
  }
}

/**
 * 删除模板，带确认
 */
async function handleDeleteTemplate(row) {
  try {
    await ElMessageBox.confirm(`确定删除模板 "${row.templateName}"？`, '提示', { type: 'warning' })
    await api.delete(`/shipment-report/templates/${row.id}`)
    const idx = templateList.value.findIndex(t => t.id === row.id)
    if (idx > -1) { templateList.value.splice(idx, 1); ElMessage.success('删除成功') }
  } catch {}
}

/**
 * 保存模板（新增/编辑）
 */
async function handleSaveTemplate() {
  try {
    await templateFormRef.value.validate()
    if (templateFormMode.value === 'add') {
      // 新增模式：必须有文件
      if (!templateForm.rawFile) {
        ElMessage.warning('请选择模板文件')
        return
      }
      const fd = new FormData()
      fd.append('customerId', templateForm.customerId || '')
      fd.append('customerName', templateForm.customerName || '')
      fd.append('templateName', templateForm.templateName || '')
      fd.append('description', templateForm.description || '')
      fd.append('enabled', templateForm.enabled ? 'true' : 'false')
      fd.append('file', templateForm.rawFile)
      const resp = await api.post('/shipment-report/templates', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const item = resp?.data ?? resp
      templateList.value.push(item)
      ElMessage.success('模板上传成功')
    } else {
      // 编辑模式：可选替换文件
      const fd = new FormData()
      fd.append('customerId', templateForm.customerId || '')
      fd.append('customerName', templateForm.customerName || '')
      fd.append('templateName', templateForm.templateName || '')
      fd.append('description', templateForm.description || '')
      fd.append('enabled', templateForm.enabled ? 'true' : 'false')
      // 如果有新文件（替换），使用新文件
      if (templateForm.rawFile) {
        fd.append('file', templateForm.rawFile)
      } else if (templateForm.newFileArrayBuffer) {
        // 将 ArrayBuffer 转为 Blob 并上传
        const blob = new Blob([templateForm.newFileArrayBuffer], { type: 'application/octet-stream' })
        fd.append('file', blob, templateForm.newFileName)
      }
      const resp = await api.put(`/shipment-report/templates/${templateForm.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const item = resp?.data ?? resp
      const idx = templateList.value.findIndex(t => t.id === item.id)
      if (idx > -1) { 
        templateList.value[idx] = item
        ElMessage.success(templateForm.newFileName ? '模板文件已替换' : '模板更新成功') 
      }
    }
    showTemplateForm.value = false
    // 清空替换文件相关字段
    templateForm.newFileName = ''
    templateForm.newFileArrayBuffer = null
    templateForm.newFileBase64 = null
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('保存失败：' + (e.message || '验证失败'))
    }
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.shipment-report-page { padding: 20px; min-height: 100%; }

.page-header { display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 20px 30px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
.header-content { display: flex; align-items: center; gap: 20px; }
.title-section { display: flex; align-items: center; gap: 12px; }
.header-icon { font-size: 36px; color: #667eea; }
.page-header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin: 0; }
.subtitle { color: #64748b; font-size: 14px; margin: 0; }

.main-content { display: flex; gap: 20px; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.right-panel { width: 420px; flex-shrink: 0; position: sticky; top: 20px; }

.search-card, .result-card, .preview-card { background: rgba(255, 255, 255, 0.95); border-radius: 12px; border: none; }
:deep(.el-card__header) { padding: 12px 20px; border-bottom: 1px solid #f0f0f0; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #334155; }
.card-header .el-icon { font-size: 18px; color: #667eea; }
.card-header .el-tag { margin-left: auto; }
.header-tip { font-size: 12px; color: #94a3b8; font-weight: normal; margin-left: 8px; }

.search-form { padding: 10px 0; }
.btn-group { display: flex; gap: 10px; }

.product-card :deep(.el-table) { cursor: pointer; }
.product-card :deep(.selected-row) { background-color: #e8f4ff !important; }

.material-collapse { background: rgba(255, 255, 255, 0.95); border-radius: 12px; overflow: hidden; }
.collapse-title { display: flex; align-items: center; gap: 8px; }
.collapse-title .el-icon { color: #667eea; }
.collapse-title .el-tag { margin-left: 8px; }

.preview-card { position: sticky; top: 20px; }
.preview-actions { margin-left: auto; display: flex; gap: 8px; }

.report-preview { padding: 10px; }
.report-header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #667eea; margin-bottom: 16px; }
.report-header h2 { margin: 0 0 8px 0; color: #1a1a2e; font-size: 20px; }
.report-no { color: #64748b; font-size: 13px; margin: 0; }
.report-info { margin-bottom: 16px; }
.report-section { margin-bottom: 16px; }
.report-section h4 { margin: 0 0 10px 0; color: #334155; font-size: 14px; padding-left: 10px; border-left: 3px solid #667eea; }
.report-footer { border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 20px; }
.signature-row { display: flex; justify-content: space-between; }
.signature-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.signature-line { display: inline-block; min-width: 60px; border-bottom: 1px solid #333; }

.initial-hint { background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 40px 20px; }
.hint-text { text-align: left; color: #64748b; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; max-width: 400px; margin-left: auto; margin-right: auto; }
.hint-text p { margin: 0 0 12px 0; font-weight: 500; color: #334155; }
.hint-text ul { margin: 0; padding-left: 20px; }
.hint-text li { margin-bottom: 8px; line-height: 1.6; }
.hint-text strong { color: #667eea; }

.template-toolbar { margin-bottom: 16px; }

/* 模板预览表格样式 */
.mapping-preview {
  overflow: auto;
  max-height: 400px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.mapping-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.mapping-preview :deep(th),
.mapping-preview :deep(td) {
  border: 1px solid #d0d0d0;
  padding: 4px 8px;
  text-align: left;
  min-width: 60px;
  position: relative;
}
.mapping-preview :deep(th) {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}
.mapping-preview :deep(tr:nth-child(even)) {
  background-color: #fafafa;
}
.mapping-preview :deep(tr:hover) {
  background-color: #e8f4ff;
}
.mapping-preview :deep(td:hover) {
  background-color: #d4e9ff;
  cursor: pointer;
  outline: 2px solid #409eff;
  outline-offset: -2px;
}
/* 添加行号列样式 */
.mapping-preview :deep(tr td:first-child),
.mapping-preview :deep(tr th:first-child) {
  background-color: #f0f0f0;
  color: #666;
  font-weight: 500;
  text-align: center;
  min-width: 40px;
}

:deep(.el-table th) { background-color: #f8fafc !important; color: #475569; font-weight: 600; }
:deep(.el-descriptions__label) { background-color: #f8fafc !important; font-weight: 500; }

/* 模板文件信息样式 */
.current-file-info {
  width: 100%;
}
.current-file-info .file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}
.current-file-info .file-row .el-icon {
  color: #409eff;
  font-size: 18px;
}
.current-file-info .file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-size: 13px;
}
.current-file-info .file-action {
  display: flex;
  align-items: center;
  gap: 12px;
}
.current-file-info .new-file-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  font-size: 12px;
}
.current-file-info .new-file-hint .el-icon {
  font-size: 14px;
}

@media (max-width: 1200px) { .main-content { flex-direction: column; } .right-panel { width: 100%; } .preview-card { position: static; } }
@media (max-width: 768px) { .shipment-report-page { padding: 12px; } .page-header { flex-direction: column; gap: 16px; padding: 16px; } }

/* 后台页面特定样式 */
.shipment-report-page.admin-page {
  padding-top: 0;
}

.admin-page .page-header {
  margin-top: 0;
  border-radius: 8px; /* 稍微减小圆角以适应后台风格 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); /* 减弱阴影 */
}

/* 前台页面特定样式 - 修复顶部空距过大问题 */
:deep(.shipment-content-wrapper .content-container) {
  /* 恢复对 ShipmentReport 页面的特殊处理 */
  /* 抵消 AppLayout 的 header-gap，使该页面紧贴导航栏 */
  margin-top: calc(-1 * var(--header-gap)) !important; 
  /* 重新计算高度以适应负边距 */
  min-height: calc(100vh - 7.5rem + var(--header-gap) - 10px) !important;
}

/* 调整 AppLayout 带来的顶部间距 */
:deep(.app-layout .scrollable-content) {
  /* 这里无法直接影响父组件 AppLayout 的样式，但可以通过负 margin 调整视觉效果 */
  /* 或者让 content-container 向上移动 */
}
</style>
