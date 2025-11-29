<template>
  <div class="sample-approval">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon style="margin-right: 8px; vertical-align: middle;"><Document /></el-icon>
        样板承认书
      </h2>
      <p>管理样板承认书的制作、回签、分发等流程</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :span="6">
        <div class="stat-card total-card">
          <div class="stat-card-content">
            <div class="stat-icon-wrapper">
              <el-icon class="stat-icon"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-header">
                <div class="stat-number">{{ statistics.total }}</div>
                <div class="stat-trend">+12%</div>
              </div>
              <div class="stat-label">总数量</div>
              <div class="stat-desc">样板承认书总数</div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card signed-card">
          <div class="stat-card-content">
            <div class="stat-icon-wrapper">
              <el-icon class="stat-icon"><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-header">
                <div class="stat-number">{{ statistics.signed }}</div>
                <div class="stat-trend positive">+8%</div>
              </div>
              <div class="stat-label">已回签</div>
              <div class="stat-desc">客户已确认回签</div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card unsigned-card">
          <div class="stat-card-content">
            <div class="stat-icon-wrapper">
              <el-icon class="stat-icon"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-header">
                <div class="stat-number">{{ statistics.unsigned }}</div>
                <div class="stat-trend warning">-3%</div>
              </div>
              <div class="stat-label">未回签</div>
              <div class="stat-desc">等待客户回签</div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card cancelled-card">
          <div class="stat-card-content">
            <div class="stat-icon-wrapper">
              <el-icon class="stat-icon"><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-header">
                <div class="stat-number">{{ statistics.cancelled }}</div>
                <div class="stat-trend negative">+2%</div>
              </div>
              <div class="stat-label">已作废</div>
              <div class="stat-desc">已取消或作废</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索表单 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="证书编号">
          <el-input 
            v-model="searchForm.certificateNo" 
            placeholder="请输入证书编号" 
            clearable 
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 150px;" 
          />
        </el-form-item>
        <el-form-item label="客户编号">
          <el-input 
            v-model="searchForm.customerNo" 
            placeholder="客户编号" 
            clearable 
            @input="handleCustomerNoInput('search')"
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 100px;"
          />
        </el-form-item>
        <el-form-item label="工单号">
          <el-input 
            v-model="searchForm.workOrderNo" 
            placeholder="请输入工单号" 
            clearable 
            @input="handleWorkOrderNoInput('search')"
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 130px;" 
          />
        </el-form-item>
        <el-form-item label="产品编号">
          <el-input 
            v-model="searchForm.productNo" 
            placeholder="请输入产品编号" 
            clearable 
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
          />
        </el-form-item>
        <el-form-item label="样板状态">
          <el-select 
            v-model="searchForm.sampleStatus" 
            placeholder="请选择样板状态" 
            clearable 
            @change="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 100px;"
          >
            <el-option label="正常使用" value="正常使用" />
            <el-option label="待更新" value="待更新" />
            <el-option label="待作废" value="待作废" />
            <el-option label="已作废" value="已作废" />
          </el-select>
        </el-form-item>
        <el-form-item label="制作日期">
          <el-date-picker
            v-model="searchForm.createDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleAutoSearch"
            @clear="handleAutoSearch"
            style="max-width: 250px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="action-section">
          <el-button type="primary" @click="handleAdd" :disabled="!canAdd">
          <el-icon><Plus /></el-icon>
          新增样品承认书
        </el-button>
        <el-button type="success" @click="handleExportList" :disabled="!canExport">
          <el-icon><Download /></el-icon>
          导出清单
        </el-button>
        <el-button type="danger" @click="handleBatchDelete" :disabled="!canDelete || selectedRows.length === 0">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never" ref="tableCardRef">
      <el-table
        :data="sortedTableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        :default-sort="{ prop: 'certificateNo', order: 'descending' }"
        stripe
        border
        :max-height="tableMaxHeight"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="certificateNo" label="样板编号" width="120" fixed="left" align="center" header-align="center" sortable="custom" />
        <el-table-column prop="customerNo" label="客户编号" width="100" align="center" header-align="center" sortable="custom" />
        <el-table-column prop="workOrderNo" label="工单号" width="120" align="center" header-align="center" sortable="custom" />
        <el-table-column prop="productNo" label="产品编号" width="160" align="center" header-align="center" class-name="no-wrap-column" sortable="custom" />
        <el-table-column prop="productName" label="品名" width="200" show-overflow-tooltip sortable />
        <el-table-column prop="productSpec" label="产品规格" width="150" align="center" header-align="center" show-overflow-tooltip sortable />
        <el-table-column label="图片预览" width="100" align="center" header-align="center">
          <template #default="scope">
            <el-button 
              v-if="scope.row.productDrawing || scope.row.colorCardImage" 
              type="primary" 
              link 
              @click="viewImages(scope.row)"
            >
              查看
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="colorCardQuantity" label="色卡数量(本)" width="100" align="center" header-align="center" sortable />
        <el-table-column prop="createDate" label="制作日期" width="120" align="center" header-align="center" sortable />
        <el-table-column prop="creator" label="制作人" width="100" align="center" header-align="center" show-overflow-tooltip sortable />
        <el-table-column prop="follower" label="跟单员" width="100" align="center" header-align="center" show-overflow-tooltip sortable />
        <el-table-column prop="returnQuantity" label="回签数量(本)" width="100" align="center" header-align="center" sortable />
        <el-table-column prop="signer" label="签字人" width="100" align="center" header-align="center" show-overflow-tooltip sortable />
        <el-table-column prop="signDate" label="签字日期" width="120" align="center" header-align="center" sortable />
        <el-table-column prop="receiver" label="签收人" width="100" align="center" header-align="center" show-overflow-tooltip sortable />
        <el-table-column prop="receiveDate" label="签收日期" width="120" align="center" header-align="center" sortable />
        <el-table-column label="判定" width="100" align="center" header-align="center">
          <template #default="scope">
            <el-tag :type="getJudgmentType(scope.row.judgment)">{{ scope.row.judgment }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="样板状态" width="100" align="center" header-align="center">
          <template #default="scope">
            <el-tag :type="getSampleStatusType(scope.row.sampleStatus)">{{ scope.row.sampleStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expiryDate" label="到期日期" width="120" align="center" header-align="center" sortable />
        <el-table-column label="操作" width="160" fixed="right" align="center" header-align="center">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)" :disabled="!canEdit">编辑</el-button>
            <el-button type="success" link @click="handleView(scope.row)">查看</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)" :disabled="!canDelete">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper" ref="paginationRef">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[5, 10, 20, 50]"
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
  width="44%"
  :before-close="handleDialogClose"
  append-to-body
  :lock-scroll="true"
>
      <el-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
        class="sample-form"
      >
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="样板编号" prop="certificateNo">
              <el-input 
                v-model="formData.certificateNo" 
                placeholder="自动生成" 
                readonly 
                class="readonly-input"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户编号" prop="customerNo">
              <el-input 
                v-model="formData.customerNo" 
                placeholder="请输入客户编号" 
                @input="handleCustomerNoInput('form')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工单号" prop="workOrderNo">
              <el-input 
                v-model="formData.workOrderNo" 
                placeholder="请输入工单号" 
                @input="handleWorkOrderNoInput('form')"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="产品编号" prop="productNo">
              <el-input v-model="formData.productNo" placeholder="请输入产品编号" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="品名" prop="productName">
              <el-input v-model="formData.productName" placeholder="请输入品名"  />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="产品规格" prop="productSpec">
              <el-input v-model="formData.productSpec" placeholder="请输入产品规格"  />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="色卡数量" prop="colorCardQuantity">
              <el-input-number v-model="formData.colorCardQuantity" :min="1" placeholder="请输入色卡数量"  style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="制作日期" prop="createDate">
              <el-date-picker
                v-model="formData.createDate"
                type="date"
                placeholder="请选择制作日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                
                style="width: 100%"
                @change="calculateExpiryDate"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品图纸" prop="productDrawing">
              <el-upload
                class="upload-demo upload-no-filename"
                :auto-upload="false"
                :on-change="handleDrawingFileChange"
                :on-remove="handleDrawingFileRemove"
                :on-preview="handleDrawingPreview"
                :before-upload="beforeUpload"
                :file-list="drawingFileList"
                list-type="picture-card"
                multiple
                :limit="5"
                accept="image/*"
              >
                <el-icon class="upload-plus-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">最多可选择5张图片</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="色卡图像" prop="colorCardImage">
              <el-upload
                class="upload-demo upload-no-filename"
                :auto-upload="false"
                :on-change="handleColorCardFileChange"
                :on-remove="handleColorCardFileRemove"
                :on-preview="handleColorCardPreview"
                :before-upload="beforeUpload"
                :file-list="colorCardFileList"
                list-type="picture-card"
                multiple
                :limit="5"
                accept="image/*"
              >
                <el-icon class="upload-plus-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">最多可选择5张图片</div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="有效期(年)" prop="validityPeriod">
              <el-input-number 
                v-model="formData.validityPeriod" 
                :min="0.5" 
                :max="2" 
                :step="0.1" 
                :precision="1"
                placeholder="请输入有效期" 
                 
                style="width: 100%" 
                @change="calculateExpiryDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="回签数量" prop="returnQuantity">
              <el-input-number v-model="formData.returnQuantity" :min="0" placeholder="请输入回签数量"  style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="制作人" prop="creator">
              <el-select v-model="formData.creator" placeholder="请选择制作人" filterable  style="width: 100%">
                <el-option
                  v-for="person in personList"
                  :key="person.ID"
                  :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                  :value="person.Name"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="跟单员" prop="follower">
              <el-select v-model="formData.follower" placeholder="请选择跟单员" filterable  style="width: 100%">
                <el-option
                  v-for="person in personList"
                  :key="person.ID"
                  :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                  :value="person.Name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="签字人" prop="signer">
              <el-input v-model="formData.signer" placeholder="请输入签字人"  />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="签字日期" prop="signDate">
              <el-date-picker
                v-model="formData.signDate"
                type="date"
                placeholder="请选择签字日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="签收人" prop="receiver">
              <el-select v-model="formData.receiver" placeholder="请选择签收人" filterable  style="width: 100%">
                <el-option
                  v-for="person in personList"
                  :key="person.ID"
                  :label="`${person.Name}（${person.DepartmentName || '未分配'}）`"
                  :value="person.Name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="签收日期" prop="receiveDate">
              <el-date-picker
                v-model="formData.receiveDate"
                type="date"
                placeholder="请选择签收日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="判定" prop="judgment">
              <el-select v-model="formData.judgment" placeholder="请选择判定结果"  style="width: 100%">
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
                <el-option label="待定" value="待定" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="分发数量" prop="distributionQuantity">
              <el-input-number v-model="formData.distributionQuantity" :min="0" placeholder="请输入分发数量"  style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="样板状态" prop="sampleStatus">
              <el-select v-model="formData.sampleStatus" placeholder="请选择样板状态"  style="width: 100%">
                <el-option label="正常使用" value="正常使用" />
                <el-option label="待更新" value="待更新" />
                <el-option label="待作废" value="待作废" />
                <el-option label="已作废" value="已作废" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="到期日期" prop="expiryDate">
              <el-date-picker
                v-model="formData.expiryDate"
                type="date"
                placeholder="自动计算"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                
                style="width: 100%"
                readonly
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <!-- 空列用于保持布局一致性 -->
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="分发部门" prop="distributionDepartment">
              <el-cascader
                v-model="formData.distributionDepartment"
                :options="departmentTree"
                :props="{ 
                  checkStrictly: true, 
                  value: 'ID', 
                  label: 'Name', 
                  children: 'children',
                  multiple: true,
                  emitPath: false
                }"
                :show-all-levels="false"
                placeholder="请选择分发部门"
                clearable
                filterable
                collapse-tags
                collapse-tags-tooltip
                style="width: 100%"
                @change="handleDepartmentChange"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="formData.remark"
                type="textarea"
                :rows="2"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <el-divider />

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogClose" class="footer-button" type="danger" plain>
            <el-icon><CircleClose /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="handleSubmit" class="footer-button">
            <el-icon><SuccessFilled /></el-icon>
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="样板承认书详情" width="80%" :close-on-click-modal="false">
      <div class="view-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="样板编号">{{ viewData.certificateNo }}</el-descriptions-item>
          <el-descriptions-item label="客户编号">{{ viewData.customerNo }}</el-descriptions-item>
          <el-descriptions-item label="工单号">{{ viewData.workOrderNo }}</el-descriptions-item>
          <el-descriptions-item label="产品编号">{{ viewData.productNo }}</el-descriptions-item>
          <el-descriptions-item label="品名">{{ viewData.productName }}</el-descriptions-item>
          <el-descriptions-item label="产品规格">{{ viewData.productSpec }}</el-descriptions-item>
          <el-descriptions-item label="色卡数量">{{ viewData.colorCardQuantity }}本</el-descriptions-item>
          <el-descriptions-item label="制作日期">{{ viewData.createDate }}</el-descriptions-item>
          <el-descriptions-item label="制作人">{{ viewData.creator }}</el-descriptions-item>
          <el-descriptions-item label="跟单员">{{ viewData.follower }}</el-descriptions-item>
          <el-descriptions-item label="签收人">{{ viewData.receiver }}</el-descriptions-item>
          <el-descriptions-item label="签收日期">{{ viewData.receiveDate || '未签收' }}</el-descriptions-item>
          <el-descriptions-item label="退回数量">{{ viewData.returnQuantity || 0 }}本</el-descriptions-item>
          <el-descriptions-item label="签字人">{{ viewData.signer }}</el-descriptions-item>
          <el-descriptions-item label="签字日期">{{ viewData.signDate || '未签字' }}</el-descriptions-item>
          <el-descriptions-item label="判定">
            <el-tag :type="getJudgmentType(viewData.judgment)">{{ viewData.judgment || '未判定' }}</el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="样板状态">
            <el-tag :type="getSampleStatusType(viewData.sampleStatus)">{{ viewData.sampleStatus }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="到期日期">{{ viewData.expiryDate }}</el-descriptions-item>
          <el-descriptions-item label="分发数量">{{ viewData.distributionQuantity || 0 }}本</el-descriptions-item>
          <el-descriptions-item label="产品图纸" :span="2">
            <el-button v-if="viewData.productDrawing" type="primary" link @click="viewImage(viewData.productDrawing)">
              查看图纸
            </el-button>
            <span v-else>暂无图纸</span>
          </el-descriptions-item>
          <el-descriptions-item label="色卡图像" :span="2">
            <el-button v-if="viewData.colorCardImage" type="primary" link @click="viewImage(viewData.colorCardImage)">
              查看色卡
            </el-button>
            <span v-else>暂无色卡</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            <div class="remark-content">{{ viewData.remark || '无备注' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false" type="primary">
            <el-icon><Check /></el-icon>
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片预览组件 - 使用封装的ImgPreview组件 -->
<ImgPreview v-model="imageViewerVisible" :imgs="previewImageUrls" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Document, Check, Clock, Close, Plus, CircleClose, SuccessFilled,
  Back, Right, DArrowRight, ZoomOut, ZoomIn, RefreshRight, RefreshLeft, Refresh, Download
} from '@element-plus/icons-vue'
import api from '@/utils/api'
import { useUserStore } from '@/store/user'
import ImgPreview from '@/components/ImgPreview.vue'
// ExcelJS 将在需要时动态导入
// 导出相关库将在需要时动态导入

// 用户信息
const userStore = useUserStore()
const currentUser = computed(() => userStore.user?.Username || '系统')

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
    console.log('开始权限检查...')
    // 检查是否有管理员角色
    const hasAdminRole = userStore.hasRole && (userStore.hasRole('admin') || userStore.hasRole('系统管理员') || userStore.hasRole('质量经理'))
    console.log('管理员角色检查:', hasAdminRole)
    
    if (hasAdminRole) {
      // 管理员拥有所有权限
      permissions.canAdd = true
      permissions.canEdit = true
      permissions.canDelete = true
      permissions.canExport = true
      console.log('管理员权限设置完成:', permissions)
    } else {
      // 使用异步权限检查（支持用户级权限优先级）
      console.log('开始异步权限检查...')
      const [addPerm, editPerm, deletePerm, exportPerm] = await Promise.all([
        userStore.hasActionPermissionAsync('sample:add'),
        userStore.hasActionPermissionAsync('sample:edit'),
        userStore.hasActionPermissionAsync('sample:delete'),
        userStore.hasActionPermissionAsync('sample:export')
      ])
      
      console.log('权限检查结果:', { addPerm, editPerm, deletePerm, exportPerm })
      
      permissions.canAdd = addPerm
      permissions.canEdit = editPerm
      permissions.canDelete = deletePerm
      permissions.canExport = exportPerm
      console.log('权限设置完成:', permissions)
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

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const imagePreviewVisible = ref(false)
const previewImageUrls = ref([]) // 修改为数组，支持多图片预览
const imageViewerVisible = ref(false) // 新增：控制el-image-viewer显示状态
const selectedRows = ref([])
const formRef = ref(null)
const drawingFileList = ref([])
const colorCardFileList = ref([])
const personList = ref([])
const departmentTree = ref([])
const viewData = ref({})

// 统计数据
const statistics = reactive({
  total: 0,
  signed: 0,
  unsigned: 0,
  cancelled: 0
})

// 搜索表单
const searchForm = reactive({
  certificateNo: '',
  customerNo: '',
  workOrderNo: '',
  productNo: '',
  sampleStatus: '',
  createDateRange: []
})

// 表格数据
const tableData = ref([])

// 排序状态
const sortState = reactive({
  prop: 'certificateNo',
  order: 'descending'
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

// 表格最大高度（用于让表格内部滚动，页面不产生滚动条）
// 通过计算视口高度与表格卡片位置、分页器高度等得到一个合理的 px 值
const tableMaxHeight = ref(480)

// 表格卡片与分页容器的引用，用于测量位置与高度
const tableCardRef = ref(null)
const paginationRef = ref(null)

/**
 * 计算表格最大高度
 * 目标：当数据较多（如每页 20/50 条）时，表格内部滚动而不是页面滚动；
 * 当数据较少（如每页 5 条）且内容不超过视口时，页面不出现滚动条。
 */
function computeTableMaxHeight() {
  // 视口高度
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight

  // el-card 组件的 DOM 元素（Element Plus 组件需通过 $el 获取根元素）
  const cardEl = tableCardRef.value && tableCardRef.value.$el ? tableCardRef.value.$el : tableCardRef.value

  // 分页容器的 DOM 元素
  const paginationEl = paginationRef.value

  // 如果无法获取必要元素，则使用一个安全的默认值
  if (!cardEl || !cardEl.getBoundingClientRect) {
    tableMaxHeight.value = Math.max(300, viewportHeight - 320)
    return
  }

  // 卡片到视口顶部的距离
  const cardRect = cardEl.getBoundingClientRect()
  const cardTop = cardRect.top

  // 分页器高度（包含外边距），默认估算为 64px
  const paginationHeight = paginationEl && paginationEl.getBoundingClientRect
    ? Math.ceil(paginationEl.getBoundingClientRect().height + 16) // 额外加入 margin/间距估算
    : 64

  // 额外的安全内边距，避免靠近底部出现遮挡
  const safetyPadding = 32

  // 计算可用高度，并设置一个下限，避免过小
  const available = Math.max(240, Math.floor(viewportHeight - cardTop - paginationHeight - safetyPadding))
  tableMaxHeight.value = available
}

onMounted(() => {
  nextTick(() => computeTableMaxHeight())
  window.addEventListener('resize', computeTableMaxHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', computeTableMaxHeight)
})

// 表单数据
const formData = reactive({
  id: null,
  certificateNo: '',
  customerNo: '',
  workOrderNo: '',
  productNo: '',
  productName: '',
  productSpec: '',
  productDrawing: '',
  colorCardImage: '',
  colorCardQuantity: 1,
  createDate: '',
  creator: '',
  follower: '',
  receiver: '',
  returnQuantity: 0,
  signer: '',
  signDate: '',
  receiveDate: '',
  judgment: '',
  distributionDepartment: [],
  distributionQuantity: 0,
  sampleStatus: '正常使用',
  validityPeriod: 1, // 有效期（年），默认1年
  expiryDate: '',
  remark: ''
})

// 表单验证规则
const formRules = {
  customerNo: [{ required: true, message: '请输入客户编号', trigger: 'blur' }],
  workOrderNo: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入品名', trigger: 'blur' }],
  productSpec: [{ required: true, message: '请输入产品规格', trigger: 'blur' }],
  colorCardQuantity: [{ required: true, message: '请输入色卡数量', trigger: 'blur' }],
  createDate: [{ required: true, message: '请选择制作日期', trigger: 'change' }],
  validityPeriod: [
    { required: true, message: '请输入有效期', trigger: 'blur' },
    { type: 'number', min: 0.5, max: 2, message: '有效期必须在0.5-2年之间', trigger: 'blur' }
  ]
}

// 上传地址
const uploadUrl = '/api/upload'

// 计算属性
const dialogTitle = computed(() => {
  return formData.id ? '编辑样板承认书' : '新增样板承认书'
})

/**
 * 排序后的表格数据
 * 应用自然排序算法到指定的列
 */
const sortedTableData = computed(() => {
  if (!sortState.prop || !sortState.order || sortState.order === 'null') {
    return tableData.value
  }
  
  // 需要使用自然排序的字段
  const naturalSortFields = ['certificateNo', 'customerNo', 'workOrderNo', 'productNo']
  
  const data = [...tableData.value]
  const isAscending = sortState.order === 'ascending'
  
  // 如果是需要自然排序的字段
  if (naturalSortFields.includes(sortState.prop)) {
    return data.sort((a, b) => {
      return naturalSort(a[sortState.prop], b[sortState.prop], isAscending)
    })
  } else {
    // 其他字段使用默认排序
    return data.sort((a, b) => {
      const aVal = a[sortState.prop]
      const bVal = b[sortState.prop]
      
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return isAscending ? aVal - bVal : bVal - aVal
      }
      
      const result = String(aVal).localeCompare(String(bVal), 'zh-CN')
      return isAscending ? result : -result
    })
  }
})

/**
 * 获取人员列表
 */
async function loadPersonList() {
  try {
    const response = await api.get('/person/list?pageSize=1000&includeInactive=false')
    if (response.success) {
      personList.value = response.data
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

// ==================== 自然排序算法 ====================
/**
 * 自然排序比较函数
 * 支持字母+数字混合排序,例如: A1, A2, A10, A20, B1, B2...
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @param {boolean} ascending - 是否升序,默认true
 * @returns {number} - 比较结果
 */
function naturalSort(a, b, ascending = true) {
  // 处理空值
  if (!a && !b) return 0
  if (!a) return ascending ? 1 : -1
  if (!b) return ascending ? -1 : 1
  
  // 转换为字符串
  a = String(a)
  b = String(b)
  
  // 提取字符串中的数字和非数字部分
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) || []
  const bParts = b.match(re) || []
  
  // 逐部分比较
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''
    
    // 如果都是数字,按数值比较
    if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10)
      if (diff !== 0) {
        return ascending ? diff : -diff
      }
    } else {
      // 否则按字符串比较
      const diff = aPart.localeCompare(bPart, 'zh-CN')
      if (diff !== 0) {
        return ascending ? diff : -diff
      }
    }
  }
  
  return 0
}

/**
 * 获取部门树
 */
async function loadDepartmentTree() {
  try {
    const response = await api.get('/departments/tree')
    if (response.success) {
      departmentTree.value = response.data
    }
  } catch (error) {
    console.error('获取部门树失败:', error)
  }
}

/**
 * 部门选择变化处理
 */
function handleDepartmentChange(value) {
  // 处理部门选择变化
  console.log('选择的部门:', value)
}

// 样版编号由后端按年月流水号规则自动生成

/**
 * 获取判定结果标签类型
 */
function getJudgmentType(judgment) {
  switch (judgment) {
    case '合格': return 'success'
    case '不合格': return 'danger'
    case '待定': return 'warning'
    default: return 'info'
  }
}

/**
 * 获取样板状态标签类型
 */
function getSampleStatusType(sampleStatus) {
  switch (sampleStatus) {
    case '正常使用': return 'success'
    case '待更新': return 'warning'
    case '待作废': return 'danger'
    case '已作废': return 'info'
    default: return 'info'
  }
}

/**
 * 加载表格数据
 */
async function loadTableData() {
  loading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    
    // 处理日期范围
    if (searchForm.createDateRange && searchForm.createDateRange.length === 2) {
      params.createDateStart = searchForm.createDateRange[0]
      params.createDateEnd = searchForm.createDateRange[1]
      delete params.createDateRange
    }
    
    const response = await api.get('/sample/list', { params })
    
    if (response.code === 200) {
      tableData.value = response.data.list
      pagination.total = response.data.total
      
      // 加载统计数据
      await loadStatistics()
    } else {
      ElMessage.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
async function loadStatistics() {
  try {
    const response = await api.get('/sample/statistics')
    
    if (response.code === 200) {
      const data = response.data
      
      statistics.total = data.total || 0
      statistics.signed = data.signed || 0
      statistics.unsigned = data.unsigned || 0
      statistics.cancelled = data.cancelled || 0
    } else {
      ElMessage.error(response.message || '获取统计数据失败')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  pagination.currentPage = 1
  loadTableData()
}

/**
 * 重置搜索
 */
function handleReset() {
  Object.keys(searchForm).forEach(key => {
    if (Array.isArray(searchForm[key])) {
      searchForm[key] = []
    } else {
      searchForm[key] = ''
    }
  })
  handleSearch()
}

/**
 * 新增处理
 */
async function handleAdd() {
  // 权限检查
  if (!canAdd.value) {
    ElMessage.error('您没有新增样品承认书的权限')
    return
  }
  
  resetForm()
  formData.createDate = new Date().toISOString().split('T')[0]
  
  // 自动计算到期日期
  calculateExpiryDate()
  
  try {
    // 获取下一个样版编号预览
    const response = await api.get('/sample/next-certificate-no')
    if (response.code === 200) {
      formData.certificateNo = response.data.certificateNo
    } else {
      formData.certificateNo = '获取编号失败'
      ElMessage.warning('获取样版编号失败，请重试')
    }
  } catch (error) {
    console.error('获取样版编号失败:', error)
    formData.certificateNo = '获取编号失败'
    ElMessage.error('获取样版编号失败')
  }
  
  dialogVisible.value = true
}

/**
 * 根据部门名称查找部门ID
 * @param {Array<string>} deptNames - 部门名称数组
 * @returns {Array<number>} - 部门ID数组
 */
function findDepartmentIdsByNames(deptNames) {
  const ids = []
  
  // 递归查找部门树中的部门ID
  function searchInTree(nodes, names) {
    for (const node of nodes) {
      if (names.includes(node.Name)) {
        ids.push(node.ID)
      }
      if (node.children && node.children.length > 0) {
        searchInTree(node.children, names)
      }
    }
  }
  
  if (departmentTree.value && departmentTree.value.length > 0) {
    searchInTree(departmentTree.value, deptNames)
  }
  
  return ids
}

/**
 * 编辑处理
 * 支持多图片路径的加载和显示
 */
function handleEdit(row) {
  // 权限检查
  if (!canEdit.value) {
    ElMessage.error('您没有编辑样品承认书的权限')
    return
  }
  
  resetForm()
  Object.assign(formData, { ...row })
  
  // ==================== 处理分发部门数据格式 ====================
  // 将后端返回的各种可能格式统一转换为数组格式
  if (row.distributionDepartment) {
    console.log('原始分发部门数据:', row.distributionDepartment, '类型:', typeof row.distributionDepartment)
    
    // 情况1: 已经是数组，直接使用
    if (Array.isArray(row.distributionDepartment)) {
      formData.distributionDepartment = row.distributionDepartment
      console.log('分发部门是数组，直接使用:', formData.distributionDepartment)
    }
    // 情况2: 是字符串，需要解析
    else if (typeof row.distributionDepartment === 'string') {
      const trimmed = row.distributionDepartment.trim()
      
      // 情况2.1: JSON字符串 "[1,2,3]"
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          formData.distributionDepartment = JSON.parse(trimmed)
          console.log('分发部门是JSON字符串，解析为:', formData.distributionDepartment)
        } catch (e) {
          console.error('解析分发部门JSON失败:', e)
          formData.distributionDepartment = []
        }
      }
      // 情况2.2: 逗号分隔的ID字符串 "1,2,3"
      else if (/^\d+(,\d+)*$/.test(trimmed)) {
        formData.distributionDepartment = trimmed.split(',').map(id => parseInt(id.trim(), 10))
        console.log('分发部门是逗号分隔的ID，解析为:', formData.distributionDepartment)
      }
      // 情况2.3: 逗号分隔的部门名称 "生产部,质检部"
      else if (trimmed.includes(',')) {
        // 需要通过部门名称查找部门ID
        const deptNames = trimmed.split(',').map(name => name.trim())
        formData.distributionDepartment = findDepartmentIdsByNames(deptNames)
        console.log('分发部门是部门名称，转换为ID:', formData.distributionDepartment)
      }
      // 情况2.4: 单个ID字符串 "1"
      else if (/^\d+$/.test(trimmed)) {
        formData.distributionDepartment = [parseInt(trimmed, 10)]
        console.log('分发部门是单个ID字符串，转换为:', formData.distributionDepartment)
      }
      // 情况2.5: 单个部门名称 "生产部"
      else {
        const deptIds = findDepartmentIdsByNames([trimmed])
        formData.distributionDepartment = deptIds
        console.log('分发部门是单个部门名称，转换为:', formData.distributionDepartment)
      }
    }
    // 情况3: 是数字（单个部门ID）
    else if (typeof row.distributionDepartment === 'number') {
      formData.distributionDepartment = [row.distributionDepartment]
      console.log('分发部门是单个数字ID，转换为数组:', formData.distributionDepartment)
    }
    // 情况4: 其他类型，设为空数组
    else {
      formData.distributionDepartment = []
      console.warn('分发部门数据格式未知，设为空数组:', row.distributionDepartment)
    }
  } else {
    // 没有分发部门数据
    formData.distributionDepartment = []
    console.log('没有分发部门数据，设为空数组')
  }

  // 如果没有有效期字段，设置默认值
  if (!formData.validityPeriod) {
    formData.validityPeriod = 1
  }
  
  // 处理多图片路径加载到文件列表（编辑模式下显示已有文件）
if (formData.productDrawing) {
  const drawingPaths = formData.productDrawing.split(';').filter(path => path.trim())
  drawingFileList.value = drawingPaths.map((path, index) => ({
    name: `图纸${index + 1}`,
    url: getAdaptedImageUrl(path),  // 使用完整URL用于显示
    originalPath: path,  // 保存原始路径用于保存
    status: 'success',
    uid: Date.now() + index
  }))
  console.log('✓ 产品图纸加载完成，数量:', drawingFileList.value.length)
} else {
  drawingFileList.value = []
}

if (formData.colorCardImage) {
  const colorCardPaths = formData.colorCardImage.split(';').filter(path => path.trim())
  colorCardFileList.value = colorCardPaths.map((path, index) => ({
    name: `色卡${index + 1}`,
    url: getAdaptedImageUrl(path),  // 使用完整URL用于显示
    originalPath: path,  // 保存原始路径用于保存
    status: 'success',
    uid: Date.now() + index + 1000
  }))
  console.log('✓ 色卡图像加载完成，数量:', colorCardFileList.value.length)
} else {
  colorCardFileList.value = []
}
  
  // 重新计算到期日期（以防数据不一致）
  calculateExpiryDate()
  
  dialogVisible.value = true
}

/**
 * 查看处理
 */
function handleView(row) {
  viewData.value = { ...row }
  viewDialogVisible.value = true
}

/**
 * 删除处理
 */
async function handleDelete(row) {
  // 权限检查
  if (!canDelete.value) {
    ElMessage.error('您没有删除样品承认书的权限')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除样板编号为 ${row.certificateNo} 的样板承认书吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/sample/delete/${row.id}`)
    
    if (response.code === 200) {
      ElMessage.success('删除成功')
      loadTableData()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 导出处理
 */
function handleExport(row) {
  // 权限检查
  if (!canExport.value) {
    ElMessage.error('您没有导出样品承认书的权限')
    return
  }
  
  // 实现单个导出逻辑
  ElMessage.info('导出功能待实现')
}

/**
 * 导出样品承认书清单到Excel文件
 * 使用XLSX库生成Excel文件，参考返工管理模块的成功实现
 */
async function handleExportList() {
  // 权限检查
  if (!canExport.value) {
    ElMessage.error('您没有导出样品承认书清单的权限')
    return
  }
  
  try {
    // 导出前询问用户确认
    const confirmResult = await ElMessageBox.confirm(
      '确定要导出当前筛选条件下的样品承认书清单吗？',
      '导出确认',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => {
      return 'cancel'
    })
    
    if (confirmResult === 'cancel') {
      return
    }
    
    loading.value = true
    ElMessage.info('正在导出数据，请稍候...')
    
    // 构建查询参数，获取所有符合条件的数据
    const params = {
      page: 1,
      pageSize: 999999, // 设置一个很大的数值来获取所有数据
      certificateNo: searchForm.certificateNo,
      customerNo: searchForm.customerNo,
      workOrderNo: searchForm.workOrderNo,
      productNo: searchForm.productNo,
      sampleStatus: searchForm.sampleStatus
    }
    
    // 处理日期范围
    if (searchForm.createDateRange && searchForm.createDateRange.length === 2) {
      params.createDateStart = searchForm.createDateRange[0]
      params.createDateEnd = searchForm.createDateRange[1]
    }
    
    // 获取数据
    const response = await api.get('/sample/list', { params })
    
    if (response.code === 200) {
      const allData = response.data.list
      
      if (allData.length === 0) {
        ElMessage.warning('没有符合条件的数据可导出')
        return
      }
      
      // 动态导入XLSX库和样式库
       const XLSX = await import('xlsx-js-style')
       const { saveAs } = await import('file-saver')
      
      // 准备导出数据，在首列添加序号字段
      const exportData = allData.map((item, index) => ({
        '序号': index + 1,
        '样品编号': item.certificateNo,
        '客户编号': item.customerNo,
        '工单号': item.workOrderNo,
        '产品编号': item.productNo,
        '品名': item.productName,
        '产品规格': item.productSpec,
        '色卡数量(本)': item.colorCardQuantity,
        '制作日期': item.createDate,
        '制作人': item.creator,
        '跟单员': item.follower,
        '签字人': item.signer || '',
        '签字日期': item.signDate || '',
        '回签数量(本)': item.returnQuantity || 0,
        '签收人': item.receiver || '',
        '签收日期': item.receiveDate || '',
        '判定': item.judgment || '',
        '样品状态': item.sampleStatus,
        '到期日期': item.expiryDate || '',
        '分发数量(本)': item.distributionQuantity || 0,
        '备注': item.remark || ''
      }))
      
      // 创建工作簿和工作表
       const workbook = XLSX.utils.book_new()
       const worksheet = XLSX.utils.json_to_sheet(exportData)
       
       // 设置列宽
       const columnWidths = [
         { wch: 8 },   // 序号
         { wch: 15 },  // 样品编号
         { wch: 12 },  // 客户编号
         { wch: 12 },  // 工单号
         { wch: 12 },  // 产品编号
         { wch: 25 },  // 品名
         { wch: 15 },  // 产品规格
         { wch: 12 },  // 色卡数量
         { wch: 12 },  // 制作日期
         { wch: 10 },  // 制作人
         { wch: 10 },  // 跟单员
         { wch: 10 },  // 签字人
         { wch: 12 },  // 签字日期
         { wch: 12 },  // 回签数量
         { wch: 10 },  // 签收人
         { wch: 12 },  // 签收日期
         { wch: 10 },  // 判定
         { wch: 10 },  // 样品状态
         { wch: 12 },  // 到期日期
         { wch: 12 },  // 分发数量
         { wch: 20 }   // 备注
       ]
       worksheet['!cols'] = columnWidths
       
       // 设置表格样式
       const range = XLSX.utils.decode_range(worksheet['!ref'])
       
       // 定义样式
       const headerStyle = {
         font: { bold: true, sz: 11, color: { rgb: '000000' } },
         fill: { fgColor: { rgb: 'D9D9D9' } },
         alignment: { horizontal: 'center', vertical: 'center' },
         border: {
           top: { style: 'thin', color: { rgb: '808080' } },
           bottom: { style: 'thin', color: { rgb: '808080' } },
           left: { style: 'thin', color: { rgb: '808080' } },
           right: { style: 'thin', color: { rgb: '808080' } }
         }
       }
       
       const dataStyle = {
         font: { sz: 10, color: { rgb: '000000' } },
         alignment: { horizontal: 'center', vertical: 'center' },
         border: {
           top: { style: 'thin', color: { rgb: '808080' } },
           bottom: { style: 'thin', color: { rgb: '808080' } },
           left: { style: 'thin', color: { rgb: '808080' } },
           right: { style: 'thin', color: { rgb: '808080' } }
         }
       }
       
       const dataStyleLeft = {
         ...dataStyle,
         alignment: { horizontal: 'left', vertical: 'center' }
       }
       
       // 应用样式到单元格
       for (let R = range.s.r; R <= range.e.r; ++R) {
         for (let C = range.s.c; C <= range.e.c; ++C) {
           const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
           if (!worksheet[cellAddress]) continue
           
           if (R === 0) {
             // 表头行样式
             worksheet[cellAddress].s = headerStyle
           } else {
             // 数据行样式
             if (C === 5) { // 品名列使用左对齐
               worksheet[cellAddress].s = dataStyleLeft
             } else {
               worksheet[cellAddress].s = dataStyle
             }
             
             // 交替行背景色
             if (R % 2 === 0) {
               worksheet[cellAddress].s = {
                 ...worksheet[cellAddress].s,
                 fill: { fgColor: { rgb: 'F8F9FA' } }
               }
             }
           }
         }
       }
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '样品承认书清单')
      
      // 生成文件名
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      
      const dateStr = `${year}${month}${day}`
      const timeStr = `${hours}${minutes}${seconds}`
      const fileName = `样品承认书清单_${dateStr}_${timeStr}.xlsx`
      
      // 导出文件
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, fileName)
      
      ElMessage.success(`导出成功！共导出 ${allData.length} 条记录`)
    } else {
      ElMessage.error('获取数据失败')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(`导出失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

/**
 * 批量删除处理
 */
async function handleBatchDelete() {
  // 权限检查
  if (!canDelete.value) {
    ElMessage.error('您没有批量删除样品承认书的权限')
    return
  }
  
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的数据')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条样板承认书吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    const response = await api.delete('/sample/batch-delete', { data: { ids } })
    
    if (response.code === 200) {
      ElMessage.success('批量删除成功')
      selectedRows.value = []
      loadTableData()
    } else {
      ElMessage.error(response.message || '批量删除失败')
    }
  } catch (error) {
    console.error('批量删除失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 选择变化处理
 */
function handleSelectionChange(selection) {
  selectedRows.value = selection
}

/**
 * 处理表格排序变化
 * @param {Object} param0 - 排序参数
 */
function handleSortChange({ column, prop, order }) {
  console.log('排序变化:', { prop, order })
  sortState.prop = prop
  sortState.order = order
}

/**
 * 分页大小变化处理
 */
function handleSizeChange(size) {
  pagination.pageSize = size
  loadTableData()
  nextTick(() => computeTableMaxHeight())
}

/**
 * 当前页变化处理
 */
function handleCurrentChange(page) {
  pagination.currentPage = page
  loadTableData()
  nextTick(() => computeTableMaxHeight())
}

/**
 * 环境自适应的图片URL构建函数
 * 根据当前环境（开发/生产）动态构建图片访问URL
 * @param {string} imagePath - 图片路径
 * @param {boolean} preventCache - 是否防止缓存，默认false
 * @returns {string} 完整的图片URL
 */
function getAdaptedImageUrl(imagePath, preventCache = false) {
  if (!imagePath) return ''
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 构建图片URL
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：没有文件服务器，直接使用相对路径访问文件
    // 确保路径以/files/开头，用于Vite开发服务器的静态文件代理
    url = imagePath.startsWith('/files/') ? imagePath : `/files/${imagePath.replace(/^\/+/, '')}`
  } else {
    // 生产环境：使用Nginx文件服务器，文件访问需要通过8080端口
    const cleanPath = imagePath.startsWith('/files/') ? imagePath : `/files/${imagePath.replace(/^\/+/, '')}`
    url = `${protocol}//${hostname}:8080${cleanPath}`
  }
  
  // 只在需要防止缓存时添加时间戳参数
  if (preventCache) {
    const timestamp = Date.now()
    url += `?t=${timestamp}`
  }
  
  return url
}

/**
 * 多图片查看 - 支持同时显示产品图纸和色卡图像
 * 支持多图片路径的解析（分号分隔）
 * @param {Object} row - 表格行数据，包含 productDrawing 和 colorCardImage 字段
 */
function viewImages(row) {
  const imageUrls = []
  
  // 处理产品图纸路径（支持多图片）
  if (row.productDrawing && row.productDrawing.trim()) {
    const drawingPaths = row.productDrawing.split(';').filter(path => path.trim())
    drawingPaths.forEach(path => {
      imageUrls.push(getAdaptedImageUrl(path))
    })
  }
  
  // 处理色卡图像路径（支持多图片）
  if (row.colorCardImage && row.colorCardImage.trim()) {
    const colorCardPaths = row.colorCardImage.split(';').filter(path => path.trim())
    colorCardPaths.forEach(path => {
      imageUrls.push(getAdaptedImageUrl(path))
    })
  }
  
  // 如果没有图片，显示提示信息
  if (imageUrls.length === 0) {
    ElMessage.warning('暂无图片可预览')
    return
  }
  
  // 设置图片URL数组并显示预览器
  previewImageUrls.value = imageUrls
  imageViewerVisible.value = true
}

/**
 * 图片查看 - 使用封装的ImgPreview组件（支持单图片和多图片路径）
 */
function viewImage(imageUrl) {
  // 如果传入的图片URL为空或无效，显示提示信息
  if (!imageUrl || !imageUrl.trim()) {
    ElMessage.warning('暂无图片可预览')
    return
  }

  const imageUrls = []
  
  // 处理图片路径（支持多图片，分号分隔）
  if (imageUrl && imageUrl.trim()) {
    const imagePaths = imageUrl.split(';').filter(path => path.trim())
    imagePaths.forEach(path => {
      imageUrls.push(getAdaptedImageUrl(path))
    })
  }
  
  // 如果没有有效的图片路径，显示提示信息
  if (imageUrls.length === 0) {
    ElMessage.warning('暂无图片可预览')
    return
  }

  // 使用环境自适应的URL构建函数，转换为数组格式
  previewImageUrls.value = imageUrls
  
  // 通过v-model双向绑定显示图片预览器
  imageViewerVisible.value = true
}

/**
 * 关闭图片预览器 - 由于使用v-model双向绑定，ImgPreview组件会自动处理关闭逻辑
 * 此函数保留用于其他可能的关闭场景
 */
function closeImageViewer() {
  imageViewerVisible.value = false
}

/**
 * 图片下载功能
 * @param {string} imageUrl - 图片URL
 */
function downloadImage(imageUrl) {
  if (!imageUrl || !imageUrl.trim()) {
    ElMessage.warning('图片地址无效，无法下载')
    return
  }

  try {
    // 从URL中提取文件名和扩展名
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'jpg'
    const downloadFileName = fileName || `sample_image_${Date.now()}.${fileExtension}`

    // 使用fetch下载图片
    fetch(imageUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.blob()
      })
      .then(blob => {
        // 创建下载链接
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = downloadFileName
        document.body.appendChild(link)
        link.click()
        
        // 清理资源
        URL.revokeObjectURL(blobUrl)
        document.body.removeChild(link)
        
        ElMessage.success('图片下载成功')
      })
      .catch(error => {
        console.error('图片下载失败:', error)
        ElMessage.error('图片下载失败，请检查网络连接或图片地址')
      })
  } catch (error) {
    console.error('下载过程中发生错误:', error)
    ElMessage.error('下载失败，请重试')
  }
}

/**
 * 文件上传前检查
 */
function beforeUpload(file) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传图片大小不能超过 2MB!')
    return false
  }
  return true
}

/**
 * 产品图纸文件选择变化处理
 */
function handleDrawingFileChange(file, fileList) {
  drawingFileList.value = fileList
}

/**
 * 产品图纸文件移除处理
 */
function handleDrawingFileRemove(file, fileList) {
  drawingFileList.value = fileList
  
  // 同步更新formData中的productDrawing字段
  // 使用 originalPath 而不是 url
  const remainingPaths = fileList
    .filter(f => f.status === 'success')
    .map(f => f.originalPath || extractPathFromUrl(f.url))  // 优先使用原始路径
    .filter(path => path)
  
  formData.productDrawing = remainingPaths.join(';')
  console.log('产品图纸删除后更新formData.productDrawing:', formData.productDrawing)
}

/**
 * 色卡图像文件选择变化处理
 */
function handleColorCardFileChange(file, fileList) {
  colorCardFileList.value = fileList
}

/**
 * 色卡图像文件移除处理
 */
function handleColorCardFileRemove(file, fileList) {
  colorCardFileList.value = fileList
  
  // 同步更新formData中的colorCardImage字段
  // 使用 originalPath 而不是 url
  const remainingPaths = fileList
    .filter(f => f.status === 'success')
    .map(f => f.originalPath || extractPathFromUrl(f.url))  // 优先使用原始路径
    .filter(path => path)
  
  formData.colorCardImage = remainingPaths.join(';')
  console.log('色卡图像删除后更新formData.colorCardImage:', formData.colorCardImage)
}

/**
 * 产品图纸预览处理
 */
function handleDrawingPreview(file) {
  console.log('预览图纸文件:', file)
  
  if (file.url && !file.raw) {
    // 已上传的文件，file.url 已经是完整URL，直接使用
    previewImageUrls.value = [file.url]  // ✅ 直接使用，不再调用 getAdaptedImageUrl
    imageViewerVisible.value = true
    console.log('使用已处理的URL预览:', file.url)
  } else if (file.raw) {
    // 新选择的文件，创建临时URL预览
    const tempUrl = URL.createObjectURL(file.raw)
    previewImageUrls.value = [tempUrl]
    imageViewerVisible.value = true
    console.log('使用临时URL预览:', tempUrl)
  }
}

/**
 * 色卡图像预览处理
 */
function handleColorCardPreview(file) {
  console.log('预览色卡文件:', file)
  
  if (file.url && !file.raw) {
    // 已上传的文件，file.url 已经是完整URL，直接使用
    previewImageUrls.value = [file.url]  // ✅ 直接使用，不再调用 getAdaptedImageUrl
    imageViewerVisible.value = true
    console.log('使用已处理的URL预览:', file.url)
  } else if (file.raw) {
    // 新选择的文件，创建临时URL预览
    const tempUrl = URL.createObjectURL(file.raw)
    previewImageUrls.value = [tempUrl]
    imageViewerVisible.value = true
    console.log('使用临时URL预览:', tempUrl)
  }
}

/**
 * 批量上传文件到服务器
 * @param {Array} fileList - 文件列表
 * @param {string} fileType - 文件类型
 * @returns {Promise<Array>} 上传成功的文件URL数组
 */
async function uploadFiles(fileList, fileType) {
  const uploadPromises = []
  
  console.log('uploadFiles 调用:', { fileList, fileType })
  
  for (const fileItem of fileList) {
    console.log('处理文件项:', fileItem)
    if (fileItem.raw) { // 只上传新选择的文件（有raw属性的是新文件）
      console.log('发现新文件，准备上传:', fileItem.name)
      const formData = new FormData()
      formData.append('file', fileItem.raw)
      formData.append('fileType', fileType)
      
      const uploadPromise = api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      uploadPromises.push(uploadPromise)
    } else {
      console.log('跳过已存在文件:', fileItem.name || fileItem.url)
    }
  }
  
  console.log('准备上传的文件数量:', uploadPromises.length)
  
  try {
    const results = await Promise.all(uploadPromises)
    console.log('上传结果:', results)
    console.log('上传结果详细信息:', results.map(r => ({ data: r.data, status: r.status })))
    
    // 处理不同的响应格式
    const urls = results.map(result => {
      if (result.data && result.data.url) {
        return result.data.url
      } else if (result.data && result.data.data && result.data.data.url) {
        return result.data.data.url
      } else if (result.url) {
        return result.url
      } else {
        console.warn('无法从响应中提取URL:', result)
        return null
      }
    }).filter(url => url)
    
    console.log('提取的URL列表:', urls)
    return urls
  } catch (error) {
    console.error('文件上传失败:', error)
    ElMessage.error('文件上传失败')
    throw error
  }
}

/**
 * 产品图纸上传成功处理
 * 支持多图片上传，将多个图片路径用分号分隔存储
 */
function handleDrawingSuccess(response, file) {
  // 获取当前已有的图片路径
  const existingPaths = formData.productDrawing ? formData.productDrawing.split(';').filter(path => path.trim()) : []
  
  // 添加新上传的图片路径
  existingPaths.push(response.url)
  
  // 合并路径并存储到表单数据
  formData.productDrawing = existingPaths.join(';')
  
  // 更新文件列表显示
  drawingFileList.value.push({ name: file.name, url: response.url })
  
  ElMessage.success('图纸上传成功')
}

/**
 * 色卡图像上传成功处理
 * 支持多图片上传，将多个图片路径用分号分隔存储
 */
function handleColorCardSuccess(response, file) {
  // 获取当前已有的图片路径
  const existingPaths = formData.colorCardImage ? formData.colorCardImage.split(';').filter(path => path.trim()) : []
  
  // 添加新上传的图片路径
  existingPaths.push(response.url)
  
  // 合并路径并存储到表单数据
  formData.colorCardImage = existingPaths.join(';')
  
  // 更新文件列表显示
  colorCardFileList.value.push({ name: file.name, url: response.url })
  
  ElMessage.success('色卡上传成功')
}

/**
 * 计算到期日期
 * 根据制作日期和有效期自动计算到期日期
 */
function calculateExpiryDate() {
  if (formData.createDate && formData.validityPeriod) {
    const createDate = new Date(formData.createDate)
    // 计算到期日期：制作日期 + 有效期（年）
    const expiryDate = new Date(createDate)
    expiryDate.setFullYear(createDate.getFullYear() + formData.validityPeriod)
    
    // 格式化为 YYYY-MM-DD
    formData.expiryDate = expiryDate.toISOString().split('T')[0]
  } else {
    formData.expiryDate = ''
  }
}

/**
 * 重置表单
 */
function resetForm() {
  Object.keys(formData).forEach(key => {
    if (Array.isArray(formData[key])) {
      formData[key] = []
    } else if (typeof formData[key] === 'number') {
      if (key === 'colorCardQuantity') {
        formData[key] = 1
      } else if (key === 'validityPeriod') {
        formData[key] = 1 // 有效期默认1年
      } else {
        formData[key] = 0
      }
    } else {
      formData[key] = key === 'id' ? null : ''
    }
  })
  drawingFileList.value = []
  colorCardFileList.value = []
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 对话框关闭处理
 */
function handleDialogClose() {
  dialogVisible.value = false
  resetForm()
}

/**
 * 处理客户编号输入自动大写
 * @param {string} type - 输入类型：'search' 或 'form'
 */
function handleCustomerNoInput(type) {
  if (type === 'search') {
    // 搜索表单中的客户编号自动转大写
    searchForm.customerNo = searchForm.customerNo.toUpperCase()
  } else if (type === 'form') {
    // 新增/编辑表单中的客户编号自动转大写
    formData.customerNo = formData.customerNo.toUpperCase()
  }
}

/**
 * 处理工单号输入自动大写
 * @param {string} type - 输入类型：'search' 或 'form'
 */
function handleWorkOrderNoInput(type) {
  if (type === 'search') {
    // 搜索表单中的工单号自动转大写
    searchForm.workOrderNo = searchForm.workOrderNo.toUpperCase()
  } else if (type === 'form') {
    // 新增/编辑表单中的工单号自动转大写
    formData.workOrderNo = formData.workOrderNo.toUpperCase()
  }
}

/**
 * 自动触发查询
 * 当输入框失去焦点、清空内容或下拉选择时自动执行查询
 */
function handleAutoSearch() {
  // 延迟执行查询，避免频繁触发
  setTimeout(() => {
    handleSearch()
  }, 100)
}

/**
 * 表单提交处理
 */
async function handleSubmit() {
  // 执行表单验证
  const isValid = await new Promise((resolve) => {
    formRef.value.validate((valid, fields) => {
      if (!valid && fields) {
        // 获取第一个验证失败的字段错误信息
        const firstFieldKey = Object.keys(fields)[0]
        const firstFieldErrors = fields[firstFieldKey]
        if (firstFieldErrors && firstFieldErrors.length > 0) {
          const errorMessage = firstFieldErrors[0].message
          ElMessage.error(errorMessage)
        } else {
          ElMessage.error('请检查表单填写是否完整')
        }
      }
      resolve(valid)
    })
  })
  
  if (!isValid) {
    return
  }
  
  try {
    // 显示上传进度
    loading.value = true
    
    // 上传产品图纸文件
    let productDrawingUrls = []
    console.log('准备上传产品图纸，文件列表:', drawingFileList.value)
    if (drawingFileList.value && drawingFileList.value.length > 0) {
      try {
        productDrawingUrls = await uploadFiles(drawingFileList.value, 'productDrawing')
        console.log('产品图纸上传结果:', productDrawingUrls)
        console.log('产品图纸上传结果类型:', typeof productDrawingUrls, Array.isArray(productDrawingUrls))
      } catch (error) {
        loading.value = false
        return // 上传失败，停止提交
      }
    }
    
    // 上传色卡图像文件
    let colorCardUrls = []
    console.log('准备上传色卡图像，文件列表:', colorCardFileList.value)
    if (colorCardFileList.value && colorCardFileList.value.length > 0) {
      try {
        colorCardUrls = await uploadFiles(colorCardFileList.value, 'colorCard')
        console.log('色卡图像上传结果:', colorCardUrls)
        console.log('色卡图像上传结果类型:', typeof colorCardUrls, Array.isArray(colorCardUrls))
      } catch (error) {
        loading.value = false
        return // 上传失败，停止提交
      }
    }
    
    const submitData = { ...formData }
    
    // 处理图片路径数据
    if (productDrawingUrls.length > 0) {
      // 获取现有的图片路径（编辑时可能已有）
      const existingDrawingPaths = submitData.productDrawing ? 
        submitData.productDrawing.split(';').filter(path => path.trim()) : []
      
      // 合并现有路径和新上传的路径
      const allDrawingPaths = [...existingDrawingPaths, ...productDrawingUrls]
      submitData.productDrawing = allDrawingPaths.join(';')
    } else if (submitData.id) {
      // 编辑模式下，如果没有新上传的文件，使用当前formData中的路径（可能已被删除操作更新）
      submitData.productDrawing = formData.productDrawing || ''
    }
    
    if (colorCardUrls.length > 0) {
      // 获取现有的图片路径（编辑时可能已有）
      const existingColorCardPaths = submitData.colorCardImage ? 
        submitData.colorCardImage.split(';').filter(path => path.trim()) : []
      
      // 合并现有路径和新上传的路径
      const allColorCardPaths = [...existingColorCardPaths, ...colorCardUrls]
      submitData.colorCardImage = allColorCardPaths.join(';')
    } else if (submitData.id) {
      // 编辑模式下，如果没有新上传的文件，使用当前formData中的路径（可能已被删除操作更新）
      submitData.colorCardImage = formData.colorCardImage || ''
    }
    
    // 处理分发部门数据 - 确保数据格式正确
    if (Array.isArray(submitData.distributionDepartment)) {
      // 保持数组格式，后端会进行JSON.stringify处理
      submitData.distributionDepartment = submitData.distributionDepartment
    } else if (!submitData.distributionDepartment) {
      // 如果为空，设置为空数组
      submitData.distributionDepartment = []
    }
    
    let response
    if (submitData.id) {
      // 更新
      response = await api.put(`/sample/update/${submitData.id}`, submitData)
    } else {
      // 新增 - 移除id和certificateNo字段，由后端自动生成样版编号
      delete submitData.id
      delete submitData.certificateNo
      response = await api.post('/sample/create', submitData)
    }
    
    if (response.code === 200) {
      ElMessage.success(formData.id ? '更新成功' : '新增成功')
      dialogVisible.value = false
      loadTableData()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

/**
 * 从完整URL中提取原始路径
 * @param {string} url - 完整的图片URL
 * @returns {string} 提取的路径
 */
function extractPathFromUrl(url) {
  if (!url) return ''
  
  // 如果包含 /files/，提取该部分
  const match = url.match(/\/files\/.+/)
  if (match) {
    return match[0]
  }
  
  // 如果是完整URL，提取路径部分
  try {
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch (e) {
    // 如果不是有效URL，直接返回
    return url
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  // 首先进行权限检查
  await checkPermissions()

  // 然后加载页面数据
  loadTableData()
  loadPersonList()
  loadDepartmentTree()
  
  // 应用默认排序
  sortState.prop = 'certificateNo'
  sortState.order = 'descending'
})
</script>

<style scoped>

:deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* 修复 el-col 的 padding */
:deep(.el-col) {
  padding-left: 8px !important;
  padding-right: 8px !important;
}

/* 确保卡片容器不会溢出 */
:deep(.el-card) {
  box-sizing: border-box;
  margin-bottom: 16px;
}

/* 确保表单不会导致滚动 */
:deep(.el-form) {
  box-sizing: border-box;
}

/* 修复分页容器 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 0; /* 确保底部没有额外 margin */
  padding-bottom: 0;
}

.sample-approval {

  box-sizing: border-box;
  min-height: 100%;
  height: auto;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 250px;
  margin: 0 auto;
  min-height: 120px;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
}

.stat-card:hover::before {
  height: 6px;
}

/* 总数量卡片 */
.total-card::before {
  background: linear-gradient(90deg, #409eff, #36cfc9);
}

.total-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #409eff, #36cfc9);
}

.total-card .stat-number {
  color: #409eff;
}

/* 已回签卡片 */
.signed-card::before {
  background: linear-gradient(90deg, #67c23a, #95de64);
}

.signed-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #67c23a, #95de64);
}

.signed-card .stat-number {
  color: #67c23a;
}

/* 未回签卡片 */
.unsigned-card::before {
  background: linear-gradient(90deg, #e6a23c, #fadb14);
}

.unsigned-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #e6a23c, #fadb14);
}

.unsigned-card .stat-number {
  color: #e6a23c;
}

/* 已作废卡片 */
.cancelled-card::before {
  background: linear-gradient(90deg, #f56c6c, #ff7875);
}

.cancelled-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #f56c6c, #ff7875);
}

.cancelled-card .stat-number {
  color: #f56c6c;
}

/* 卡片内容左右布局 */
.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 图标区域 */
.stat-icon-wrapper {
  flex-shrink: 0;
}

/* 信息区域 */
.stat-info {
  flex: 1;
  min-width: 0;
}

/* 数字和趋势的头部布局 */
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.stat-icon-wrapper .stat-icon {
  font-size: 18px;
  color: white;
}

.stat-trend {
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  background: #f0f2f5;
  color: #606266;
}

.stat-trend.positive {
  background: #f6ffed;
  color: #52c41a;
}

.stat-trend.warning {
  background: #fffbe6;
  color: #faad14;
}

.stat-trend.negative {
  background: #fff2f0;
  color: #ff4d4f;
}

.stat-content {
  position: relative;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 3px;
  line-height: 1;
  animation: countUp 0.8s ease-out;
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 3px;
  line-height: 1.2;
}

.stat-desc {
  font-size: 10px;
  color: #9ca3af;
  line-height: 1.3;
  margin-top: 2px;
}

@keyframes countUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  animation: slideInUp 0.6s ease-out;
}

.stat-card:nth-child(1) {
  animation-delay: 0.1s;
}

.stat-card:nth-child(2) {
  animation-delay: 0.2s;
}

.stat-card:nth-child(3) {
  animation-delay: 0.3s;
}

.stat-card:nth-child(4) {
  animation-delay: 0.4s;
}

.stat-card:hover .stat-number {
  animation: pulse 0.6s ease-in-out;
}

.stat-card:hover .stat-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 查看详情对话框样式 */
.view-content {
  padding: 20px;
}

.view-content :deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

.view-content :deep(.el-descriptions__header) {
  background-color: #f5f7fa;
  font-weight: 600;
}

.view-content :deep(.el-descriptions__body) {
  background-color: #fff;
}

.view-content :deep(.el-descriptions__label) {
  font-weight: 600;
  color: #303133;
  background-color: #fafafa;
}

.view-content :deep(.el-descriptions__content) {
  color: #606266;
}

.remark-content {
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  white-space: pre-wrap;
  word-break: break-word;
}

.search-card,
.toolbar-card,
.table-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-section {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 表格样式优化 */
:deep(.el-table th) {
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

:deep(.el-table td) {
  text-align: center;
  vertical-align: middle;
}

/* 品名列保持左对齐 */
:deep(.el-table .el-table__cell:has([data-prop="productName"])) {
  text-align: left;
}

/* 表格标题防止换行 */
:deep(.el-table__header-wrapper .el-table__header th .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作列按钮间距优化 */
:deep(.el-table .el-button + .el-button) {
  margin-left: 2px;
}

.sample-form {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  box-sizing: border-box;
}

/* 自定义滚动条样式 */
.sample-form::-webkit-scrollbar {
  width: 6px;
}

.sample-form::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.sample-form::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.sample-form::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.upload-demo {
  width: 100%;
}

.image-preview {
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 0;
}

.dialog-footer .el-button {
  margin-top: 0;
}

.footer-button {
  min-width: 120px;
  padding: 12px 24px;
}

/* 表格表头样式 */
.table-card :deep(.el-table__header-wrapper) {
  background-color: #f5f7fa;
}

.table-card :deep(.el-table__header th) {
  background-color: #f5f7fa !important;
}

/* 表格内容禁止换行 */
.table-card :deep(.el-table__body td),
.table-card :deep(.el-table__header th) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 单元格内的 .cell 容器禁止换行 */
.table-card :deep(.el-table__body td .cell),
.table-card :deep(.el-table__header th .cell) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* 品名列强制单行显示 */
.table-card :deep(.el-table__body td .cell) {
  white-space: nowrap !important;
  word-break: keep-all !important;
  word-wrap: normal !important;
}

/* El-tag 标签内容禁止换行 */
.table-card :deep(.el-table__body td .el-tag) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: inline-block;
  vertical-align: middle;
}

/* 操作列按钮不换行 - 增强版 */
.table-card :deep(.el-table__body td .el-button) {
  margin-right: 8px;
  white-space: nowrap !important;
  flex-shrink: 0;
}

/* 操作列容器不换行 */
.table-card :deep(.el-table__body td:last-child .cell) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
}

/* 确保所有文本内容都不换行 */
.table-card :deep(.el-table__body td),
.table-card :deep(.el-table__body td *) {
  white-space: nowrap !important;
}

/* 操作列按钮不换行 */
.table-card :deep(.el-table__body td .el-button) {
  margin-right: 8px;
  white-space: nowrap;
}

.table-card :deep(.el-table__body td .el-button:last-child) {
  margin-right: 0;
}

/* 不可编辑输入框样式 */
.readonly-input :deep(.el-input__inner) {
  background-color: #f5f7fa !important;
  color: #909399;
  cursor: not-allowed;
}

.readonly-input :deep(.el-input__wrapper) {
  background-color: #f5f7fa !important;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

/* 对话框样式优化 */
:deep(.el-dialog) {
  max-width: 95vw;
}

:deep(.el-dialog__body) {
  padding: 20px 20px 8px 20px;
  overflow-x: hidden;
}

:deep(.el-dialog__footer) {
  padding: 8px 20px 20px 20px;
}

/* 确保表单行不会超出容器 */
.sample-form :deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.sample-form :deep(.el-col) {
  padding-left: 8px;
  padding-right: 8px;
}

/* 级联选择器下拉面板宽度限制 */
:deep(.el-cascader-panel) {
  max-width: 300px;
}

/* 分割线样式优化 */
.sample-form + .el-divider {
  margin: 12px 0 8px 0;
}

/* 产品编号列禁止换行 */
:deep(.no-wrap-column .cell) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 禁用按钮样式 */
.el-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.el-button.is-link:disabled {
  color: #c0c4cc !important;
  cursor: not-allowed;
}

/* 隐藏上传组件文件名，节省空间 */
.upload-no-filename :deep(.el-upload-list__item-name) {
  display: none !important;
}

.upload-no-filename :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 60px;
  height: 60px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.upload-no-filename :deep(.el-upload--picture-card) {
  width: 60px;
  height: 60px;
  line-height: 58px;
}

.upload-no-filename :deep(.el-upload-list--picture-card .el-upload-list__item-thumbnail) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-no-filename :deep(.el-upload-list--picture-card .el-upload-list__item-actions) {
  font-size: 12px;
}

.upload-no-filename :deep(.el-upload-list--picture-card .el-upload-list__item-actions .el-icon) {
  font-size: 12px;
}

/* 十字加号按钮样式 */
.upload-plus-icon {
  font-size: 24px;
  color: #8c939d;
  cursor: pointer;
  transition: color 0.3s;
}

.upload-no-filename :deep(.el-upload--picture-card:hover) .upload-plus-icon {
  color: #409eff;
}
</style>