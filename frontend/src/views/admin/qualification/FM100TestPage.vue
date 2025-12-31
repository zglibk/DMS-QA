<template>
  <div class="fm100-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>FM100 色觉测试</h2>
        <p class="desc">Farnsworth-Munsell 100 Hue Test 色彩辨别能力测试与分析</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleAddTest">新增测试记录</el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="姓名">
          <el-input v-model="searchForm.name" placeholder="输入姓名" clearable style="width: 140px;" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="测试等级">
          <el-select v-model="searchForm.grade" placeholder="选择等级" clearable style="width: 120px;">
            <el-option label="优异" value="优异" />
            <el-option label="良好" value="良好" />
            <el-option label="需关注" value="需关注" />
            <el-option label="不达标" value="不达标" />
          </el-select>
        </el-form-item>
        <el-form-item label="测试日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" style="width: 220px;" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试记录列表 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe border :header-cell-style="{ textAlign: 'center' }">
        <el-table-column prop="personnelName" label="姓名" min-width="90" align="center" show-overflow-tooltip />
        <el-table-column prop="employeeNo" label="工号" min-width="90" align="center" show-overflow-tooltip />
        <el-table-column prop="department" label="部门" min-width="100" align="center" show-overflow-tooltip />
        <el-table-column prop="testDate" label="测试日期" min-width="105" align="center">
          <template #default="{ row }">{{ formatDate(row.testDate) }}</template>
        </el-table-column>
        <el-table-column prop="tes" label="TES" min-width="70" align="center" />
        <el-table-column label="√TES" min-width="70" align="center" v-if="false">
          <template #default="{ row }">{{ row.sqrtTes ? Number(row.sqrtTes).toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="grade" label="等级" min-width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="gradeStyle(row.grade)" size="small">{{ row.grade }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span :style="getCategoryStyle(row.category)">{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="diagnosis" label="测试评价" min-width="140" align="left" header-align="center" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getDiagnosisLabel(row.diagnosis) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长(分钟)" min-width="90" align="center" />
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">
                <el-icon><View /></el-icon>详情
              </el-button>
              <el-button type="primary" link size="small" @click="handleEdit(row)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-button type="warning" link size="small" @click="handlePrintReport(row)">
                <el-icon><Printer /></el-icon>报告
              </el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next" @size-change="fetchData" @current-change="fetchData" />
      </div>
    </el-card>

    <!-- 新增/编辑测试对话框 -->
    <el-dialog v-model="testDialog.visible" :title="testDialog.title" width="900px" destroy-on-close top="3vh">
      <div class="test-dialog-body">
        <div class="form-section">
          <el-form ref="testFormRef" :model="testForm" :rules="testRules" label-width="100px" size="default">
            <div class="form-title">一、受测对象</div>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="选择人员" prop="personnelId">
                  <el-select v-model="testForm.personnelId" placeholder="选择或输入" filterable allow-create default-first-option style="width: 100%;" @change="handlePersonChange">
                    <el-option v-for="p in personnelList" :key="p.id" :label="p.employeeNo ? p.name + ' (' + p.employeeNo + ')' : p.name" :value="p.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="测试日期" prop="testDate">
                  <el-date-picker v-model="testForm.testDate" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="form-title">二、测试结果</div>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="测试时长(分)">
                  <el-input-number v-model="testForm.duration" :min="0" :precision="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="错误总分TES">
                  <el-input-number v-model="testForm.tes" :min="0" style="width: 100%;" @change="calcSqrtTes" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12" v-if="false">
              <el-col :span="12">
                <el-form-item label="√TES" prop="sqrtTes">
                  <el-input-number v-model="testForm.sqrtTes" :min="0" :precision="2" style="width: 100%;" @change="updateGrade" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="分类">
                  <el-select v-model="testForm.category" placeholder="选择" style="width: 100%;">
                    <el-option label="优秀色彩分辨力" value="优秀色彩分辨力" />
                    <el-option label="一般色彩分辨力" value="一般色彩分辨力" />
                    <el-option label="低色彩分辨力" value="低色彩分辨力" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="form-title">三、百分位数</div>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="未选定(%)">
                  <el-input-number v-model="testForm.pctUnselected" :min="0" :max="100" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="工厂(%)">
                  <el-input-number v-model="testForm.pctFactory" :min="0" :max="100" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="经验丰富(%)">
                  <el-input-number v-model="testForm.pctExperienced" :min="0" :max="100" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="form-title">四、Vingrys 分析</div>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="角度(Angle)">
                  <el-input-number v-model="testForm.angle" :precision="2" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="C指数">
                  <el-input-number v-model="testForm.cIndex" :precision="2" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="24">
                <el-form-item>
                  <template #label>
                    <div class="label-with-tooltip">
                      错误棋子号
                      <el-tooltip placement="top" effect="light">
                        <template #content>
                          <div style="max-width: 300px; line-height: 1.6;">
                            <b>自动诊断依据 (基于 FM100 混淆轴):</b><br/>
                            <span style="color: #409EFF;">● 蓝色弱 (Tritan):</span> 错误集中在 46-52 或 85-5<br/>
                            <span style="color: #F56C6C;">● 红色弱 (Protan):</span> 错误集中在 62-70 或 17-24<br/>
                            <span style="color: #67C23A;">● 绿色弱 (Deutan):</span> 错误集中在 56-61 或 12-17<br/>
                            <br/>
                            <i>系统将统计落在各区间的错误数量，取最大值进行判定。</i>
                          </div>
                        </template>
                        <el-icon class="info-icon"><InfoFilled /></el-icon>
                      </el-tooltip>
                    </div>
                  </template>
                  <el-input v-model="testForm.errorCapNo" placeholder="请输入发生错误的棋子编号，以逗号或空格分隔（例如：45, 46, 50）" @blur="autoDiagnose">
                    <template #append>
                      <el-button @click="autoDiagnose">自动诊断</el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="S指数">
                  <el-input-number v-model="testForm.sIndex" :precision="2" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="测试评价">
                  <el-select v-model="testForm.diagnosis" placeholder="选择" style="width: 100%;">
                    <el-option label="正常 (Normal)" value="Normal" />
                    <el-option label="优秀分辨力 (Superior Discrimination)" value="Superior Discrimination" />
                    <el-option label="红色弱 (Protan Deficiency)" value="Protan Deficiency" />
                    <el-option label="绿色弱 (Deutan Deficiency)" value="Deutan Deficiency" />
                    <el-option label="蓝色弱 (Tritan Deficiency)" value="Tritan Deficiency" />
                    <el-option label="低分辨力 (Low Discrimination)" value="Low Discrimination" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="form-title">五、测试截图</div>
            <el-form-item label="软件截图">
              <el-upload class="screenshot-upload" :show-file-list="false" :before-upload="beforeUpload" :http-request="handleUpload" accept="image/*">
                <el-image v-if="screenshotPreview" :src="screenshotPreview" class="preview-img" fit="contain" :preview-src-list="[screenshotPreview]" @click.stop />
                <div v-else class="upload-placeholder">
                  <el-icon :size="28"><Upload /></el-icon>
                  <span>点击上传截图</span>
                </div>
              </el-upload>
              <el-button v-if="screenshotPreview" type="danger" size="small" @click="removeScreenshot" style="margin-top: 8px;">删除截图</el-button>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="testForm.remarks" type="textarea" :rows="2" placeholder="备注信息" />
            </el-form-item>
          </el-form>
        </div>
        <div class="preview-section">
          <div class="preview-title">测试等级预览</div>
          <div class="grade-preview" v-if="testForm.tes != null">
            <div :class="['grade-circle', gradeInfo.class]">
              <div class="grade-value">{{ testForm.tes }}</div>
              <div class="grade-label">TES</div>
            </div>
            <div :class="['grade-badge', gradeInfo.badgeClass]">{{ gradeInfo.grade }}</div>
            <div class="grade-desc">{{ gradeInfo.desc }}</div>
            <div class="job-match" v-if="gradeInfo.jobs">
              <div class="job-title">适合岗位</div>
              <div class="job-list">{{ gradeInfo.jobs }}</div>
            </div>
          </div>
          <div v-else class="no-preview">
            <el-icon :size="40"><DataAnalysis /></el-icon>
            <p>输入 TES 后显示等级</p>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="testDialog.visible = false">取消</el-button>
        <el-button v-if="!testForm.id" type="info" @click="loadExample">载入示例</el-button>
        <el-button type="primary" @click="submitTest" :loading="testDialog.loading">保存记录</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="reportDialog.visible" :title="reportDialog.title" width="750px" destroy-on-close>
      <div class="report-content">
        <div class="report-header">
          <h3>FM100 色觉测试分析报告</h3>
          <p>{{ currentDetail.personnelName }} | {{ formatDate(currentDetail.testDate) }}</p>
        </div>
        
        <div class="score-overview">
          <!-- 左侧基本信息 -->
          <div class="info-side left">
            <div class="info-item">
              <span class="label">测试时长</span>
              <span class="value">{{ currentDetail.duration }} 分钟</span>
            </div>
            <div class="info-item">
              <span class="label">分类</span>
              <span class="value" :style="getCategoryStyle(currentDetail.category)">{{ currentDetail.category }}</span>
            </div>
          </div>

          <!-- 中间圆环 -->
          <div class="score-display">
            <div :class="['score-circle', getGradeClass(currentDetail.grade)]">
              <div class="score-val">{{ currentDetail.tes }}</div>
              <div class="score-lbl">TES</div>
            </div>
            <div :class="['result-tag', getGradeTagClass(currentDetail.grade)]">{{ currentDetail.grade }}</div>
          </div>

          <!-- 右侧诊断信息 -->
          <div class="info-side right">
            <div class="info-item">
              <span class="label">角度</span>
              <span class="value">{{ currentDetail.angle ? Number(currentDetail.angle).toFixed(2) : '-' }}°</span>
            </div>
            <div class="info-item">
              <span class="label">C 指数</span>
              <span class="value">{{ currentDetail.cIndex ? Number(currentDetail.cIndex).toFixed(2) : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">测试评价</span>
              <span class="value">{{ getDiagnosisLabel(currentDetail.diagnosis) }}</span>
            </div>
          </div>
        </div>

        <el-descriptions title="百分位排名" :column="3" border size="small" style="margin-top: 16px;">
          <el-descriptions-item label="未选定人群">超过 {{ currentDetail.pctUnselected }}%</el-descriptions-item>
          <el-descriptions-item label="工厂人群">超过 {{ currentDetail.pctFactory }}%</el-descriptions-item>
          <el-descriptions-item label="经验丰富人群">超过 {{ currentDetail.pctExperienced }}%</el-descriptions-item>
        </el-descriptions>
        
        <div v-if="currentDetail.screenshotPath" class="screenshot-view">
          <h4>测试截图</h4>
          <el-image :src="getAdaptedImageUrl(currentDetail.screenshotPath)" fit="contain" style="max-width: 100%; max-height: 180px;" :preview-src-list="[getAdaptedImageUrl(currentDetail.screenshotPath)]" />
        </div>
      </div>
      <template #footer>
        <el-button @click="reportDialog.visible = false">关闭</el-button>
        <el-button type="primary" @click="handlePrint">打印报告</el-button>
      </template>
    </el-dialog>

    <!-- 打印报告容器 (隐藏) -->
    <div style="display: none;">
      <div id="print-area" class="print-container">
        <div class="print-header">
          <div class="company-name">珠海腾佳印务有限公司</div>
          <h1>孟赛尔色棋-X-rite FM100色觉测试报告</h1>
          <div class="report-meta">
            <span>报告编号: {{ getReportNo(currentDetail) }}</span>
            <span>生成日期: {{ new Date().toLocaleDateString() }}</span>
          </div>
        </div>
        
        <div class="section-title">基本信息</div>
        <table class="info-table">
          <tr>
            <td class="label">姓名</td>
            <td class="value">{{ currentDetail.personnelName }}</td>
            <td class="label">工号</td>
            <td class="value">{{ currentDetail.employeeNo || '-' }}</td>
          </tr>
          <tr>
            <td class="label">部门</td>
            <td class="value">{{ currentDetail.department || '-' }}</td>
            <td class="label">测试日期</td>
            <td class="value">{{ formatDate(currentDetail.testDate) }}</td>
          </tr>
        </table>

        <div class="section-title">测试结果</div>
        <div class="result-box">
          <div class="result-main">
            <div class="tes-score">
              <span class="label">错误总分 (TES)</span>
              <span class="val">{{ currentDetail.tes }}</span>
            </div>
            <div class="diagnosis-res">
              <span class="label">测试评价</span>
              <span class="val">{{ getDiagnosisLabel(currentDetail.diagnosis) }}</span>
            </div>
            <div class="grade-res">
              <span class="label">等级评定</span>
              <span class="val">{{ currentDetail.grade }}</span>
            </div>
          </div>
          <div class="result-details">
            <div class="detail-item"><span>测试时长:</span> {{ currentDetail.duration }} 分钟</div>
            <div class="detail-item"><span>分类:</span> {{ currentDetail.category }}</div>
            <div class="detail-item"><span>Vingrys Angle:</span> {{ currentDetail.angle ? Number(currentDetail.angle).toFixed(2) : '-' }}°</div>
            <div class="detail-item"><span>C-Index:</span> {{ currentDetail.cIndex ? Number(currentDetail.cIndex).toFixed(2) : '-' }}</div>
            <div class="detail-item"><span>S-Index:</span> {{ currentDetail.sIndex ? Number(currentDetail.sIndex).toFixed(2) : '-' }}</div>
          </div>
        </div>

        <div class="section-title">百分位排名</div>
        <div class="rank-cards">
          <div class="rank-card">
            <div class="rank-label">未选定人群</div>
            <div class="rank-value">Top {{ currentDetail.pctUnselected }}%</div>
          </div>
          <div class="rank-card">
            <div class="rank-label">工厂人群</div>
            <div class="rank-value">Top {{ currentDetail.pctFactory }}%</div>
          </div>
          <div class="rank-card">
            <div class="rank-label">经验丰富人群</div>
            <div class="rank-value">Top {{ currentDetail.pctExperienced }}%</div>
          </div>
        </div>

        <div class="section-title">测试图谱</div>
        <div class="chart-area">
          <img v-if="currentDetail.screenshotPath" :src="getAdaptedImageUrl(currentDetail.screenshotPath)" class="chart-img" />
          <div v-else class="no-chart">无图谱数据</div>
        </div>

        <div class="footer-sign">
          <div class="sign-box">
            <span>测试人签名/日期：</span>
            <div class="sign-line" style="width: 160px;"></div>
          </div>
          <div class="sign-box">
            <span>审核人签名/日期：</span>
            <div class="sign-line" style="width: 160px;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, View, Delete, Upload, Document, DataAnalysis, Edit, InfoFilled, Printer } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'

const searchForm = reactive({ name: '', grade: '', dateRange: null })
const tableData = ref([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const personnelList = ref([])
const testDialog = reactive({ visible: false, loading: false, title: '新增FM100测试记录' })
const testFormRef = ref()
const testForm = reactive({
  id: null,
  personnelId: null, personName: '', employeeNo: '', department: '', testDate: new Date().toISOString().split('T')[0],
  duration: null, tes: null, sqrtTes: null, category: '',
  pctUnselected: null, pctFactory: null, pctExperienced: null,
  angle: null, cIndex: null, sIndex: null, diagnosis: '', remarks: '', errorCapNo: ''
})
const testRules = {
  personnelId: [{ required: true, message: '请选择人员', trigger: 'change' }],
  testDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  sqrtTes: [{ required: true, message: '请输入√TES', trigger: 'blur' }]
}
const screenshotFile = ref(null)
const screenshotPreview = ref('')
const reportDialog = reactive({ visible: false, title: '测试详情' })
const currentDetail = ref({})

const gradeInfo = computed(() => {
  const v = testForm.tes
  if (v == null || v === '') return { grade: '无数据', class: 'grade-fail', badgeClass: 'badge-danger', desc: '请输入TES总分', jobs: '' }
  
  if (v <= 16) return { grade: '优异', class: 'grade-superior', badgeClass: 'badge-success', desc: '色彩分辨力极佳', jobs: '调墨员、色彩管理、终检员' }
  if (v <= 36) return { grade: '良好', class: 'grade-good', badgeClass: 'badge-info', desc: '色彩分辨力良好', jobs: '印刷机长、首检员、IQC' }
  if (v <= 64) return { grade: '需关注', class: 'grade-attention', badgeClass: 'badge-warning', desc: '色彩分辨力一般，建议进一步评估', jobs: '过程检验员、机台操作员' }
  return { grade: '不达标', class: 'grade-fail', badgeClass: 'badge-danger', desc: '不建议安排至色彩关键岗位', jobs: '' }
})

onMounted(async () => {
  await fetchPersonnelList()
  await fetchData()
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})

const fetchPersonnelList = async () => {
  try {
    const res = await apiService.get('/qualification/personnel/all')
    if (res.data.success) personnelList.value = res.data.data
  } catch (e) { console.error('获取人员列表失败:', e) }
}

const fetchData = async () => {
  try {
    loading.value = true
    const params = { page: pagination.page, pageSize: pagination.pageSize, name: searchForm.name || undefined, grade: searchForm.grade || undefined }
    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const res = await apiService.get('/qualification/fm100', { params })
    if (res.data.success) {
      tableData.value = res.data.data || []
      pagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('获取数据失败:', e)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { name: '', grade: '', dateRange: null }); pagination.page = 1; fetchData() }

const handleAddTest = () => {
  Object.assign(testForm, {
    id: null,
    personnelId: null, personName: '', employeeNo: '', department: '', testDate: new Date().toISOString().split('T')[0],
    duration: null, tes: null, sqrtTes: null, category: '',
    pctUnselected: null, pctFactory: null, pctExperienced: null,
    angle: null, cIndex: null, sIndex: null, diagnosis: '', remarks: '', errorCapNo: ''
  })
  screenshotFile.value = null
  screenshotPreview.value = ''
  testDialog.title = '新增FM100测试记录'
  testDialog.visible = true
}

const handlePersonChange = (val) => {
  if (typeof val === 'number') {
    const p = personnelList.value.find(x => x.id === val)
    if (p) { testForm.personName = p.name; testForm.employeeNo = p.employeeNo || ''; testForm.department = p.department || '' }
  } else if (typeof val === 'string') {
    testForm.personName = val; testForm.employeeNo = ''; testForm.department = ''
  }
}

const calcSqrtTes = () => { if (testForm.tes != null && testForm.tes >= 0) testForm.sqrtTes = Math.sqrt(testForm.tes) }
const updateGrade = () => {}

const handleEdit = async (row) => {
  try {
    const res = await apiService.get(`/qualification/fm100/${row.id}`)
    if (res.data.success) {
      const data = res.data.data
      Object.assign(testForm, {
        id: data.id,
        personnelId: data.personnelId,
        personName: data.personnelName,
        employeeNo: data.employeeNo,
        department: data.department,
        testDate: data.testDate ? data.testDate.split('T')[0] : null,
        duration: data.duration,
        tes: data.tes,
        sqrtTes: data.grade ? (data.sqrtTes || Math.sqrt(data.tes)) : data.sqrtTes, // 如果有成绩但sqrtTes为空，尝试计算
        category: data.category,
        pctUnselected: data.pctUnselected,
        pctFactory: data.pctFactory,
        pctExperienced: data.pctExperienced,
        angle: data.angle,
        cIndex: data.cIndex,
        sIndex: data.sIndex,
        diagnosis: data.diagnosis,
        remarks: data.remarks,
        errorCapNo: data.errorCapNo || ''
      })
      
      // 如果sqrtTes依然为空，手动重新计算一次以确保等级显示正确
      if (testForm.tes != null && (testForm.sqrtTes == null || testForm.sqrtTes === 0)) {
        calcSqrtTes()
      }

      screenshotFile.value = null
      if (data.screenshotPath) {
        screenshotPreview.value = getAdaptedImageUrl(data.screenshotPath)
      } else {
        screenshotPreview.value = ''
      }

      testDialog.title = '编辑FM100测试记录'
      testDialog.visible = true
    }
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

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

const removeScreenshot = (event) => {
  if (event) event.stopPropagation()
  screenshotFile.value = null
  screenshotPreview.value = ''
}

const handleUpload = ({ file }) => {
  screenshotFile.value = file
  const reader = new FileReader()
  reader.onload = e => screenshotPreview.value = e.target.result
  reader.readAsDataURL(file)
}

const loadExample = () => {
  Object.assign(testForm, { duration: 11, tes: 4, sqrtTes: 2, category: '优秀色彩分辨力', pctUnselected: 90, pctFactory: 90, pctExperienced: 70, angle: 59.95, cIndex: 1.01, sIndex: 1.23, diagnosis: 'Normal', errorCapNo: '' })
}

const autoDiagnose = () => {
  if (!testForm.errorCapNo) return
  
  // 解析错误棋子号
  // 支持空格、逗号分隔
  const caps = testForm.errorCapNo.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n))
  
  if (caps.length === 0) {
    testForm.diagnosis = 'Normal'
    return
  }
  
  // 统计落在各区间的数量
  let tritanCount = 0 // 蓝色弱: 46-52 & 85-5
  let protanCount = 0 // 红色弱: 62-70 & 17-24
  let deutanCount = 0 // 绿色弱: 56-61 & 12-17
  
  caps.forEach(cap => {
    // Tritan (蓝色弱): 45-55 (放宽一点范围) 或 83-7 (跨越85-5)
    if ((cap >= 45 && cap <= 55) || cap >= 83 || cap <= 7) tritanCount++
    
    // Protan (红色弱): 62-70 或 17-24
    if ((cap >= 62 && cap <= 70) || (cap >= 17 && cap <= 24)) protanCount++
    
    // Deutan (绿色弱): 56-61 或 12-17
    if ((cap >= 56 && cap <= 61) || (cap >= 12 && cap <= 17)) deutanCount++
  })
  
  // 简单的判定逻辑
  // 1. 哪个区间的错误数量最多，且至少有2个错误，就判定为该类型
  // 2. 如果都没有显著特征，则判定为低分辨力
  
  if (tritanCount > protanCount && tritanCount > deutanCount && tritanCount >= 2) {
    testForm.diagnosis = 'Tritan Deficiency'
  } else if (protanCount > tritanCount && protanCount > deutanCount && protanCount >= 2) {
    testForm.diagnosis = 'Protan Deficiency'
  } else if (deutanCount > tritanCount && deutanCount > protanCount && deutanCount >= 2) {
    testForm.diagnosis = 'Deutan Deficiency'
  } else if (gradeInfo.value.grade === '需关注' || gradeInfo.value.grade === '不达标') {
    testForm.diagnosis = 'Low Discrimination'
  } else {
    // 默认保持 Normal 或根据具体情况
    if (caps.length > 0) testForm.diagnosis = 'Normal' // 错误很少，认为是正常
  }
  
  ElMessage.success(`自动诊断完成: ${getDiagnosisLabel(testForm.diagnosis)} (T:${tritanCount}, P:${protanCount}, D:${deutanCount})`)
}

const submitTest = async () => {
  try {
    await testFormRef.value?.validate()
    testDialog.loading = true
    const formData = new FormData()
    if (typeof testForm.personnelId === 'number') formData.append('personnelId', testForm.personnelId)
    formData.append('personName', testForm.personName || '')
    formData.append('employeeNo', testForm.employeeNo || '')
    formData.append('department', testForm.department || '')
    formData.append('testDate', testForm.testDate)
    formData.append('duration', testForm.duration || 0)
    formData.append('tes', testForm.tes || 0)
    formData.append('sqrtTes', testForm.sqrtTes || 0)
    formData.append('category', testForm.category || '')
    formData.append('pctUnselected', testForm.pctUnselected || 0)
    formData.append('pctFactory', testForm.pctFactory || 0)
    formData.append('pctExperienced', testForm.pctExperienced || 0)
    formData.append('angle', testForm.angle || 0)
    formData.append('cIndex', testForm.cIndex || 0)
    formData.append('sIndex', testForm.sIndex || 0)
    formData.append('diagnosis', testForm.diagnosis || '')
    formData.append('errorCapNo', testForm.errorCapNo || '')
    formData.append('grade', gradeInfo.value.grade)
    formData.append('remarks', testForm.remarks || '')
    if (screenshotFile.value) formData.append('screenshot', screenshotFile.value)
    
    if (testForm.id) {
      await apiService.put(`/qualification/fm100/${testForm.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      ElMessage.success('更新成功')
    } else {
      await apiService.post('/qualification/fm100', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      ElMessage.success('保存成功')
    }
    
    testDialog.visible = false
    fetchData()
    fetchPersonnelList()
  } catch (e) {
    if (e !== false) { console.error('保存失败:', e); ElMessage.error(e.response?.data?.message || '保存失败') }
  } finally {
    testDialog.loading = false
  }
}

const fetchDetail = async (row) => {
  try {
    const res = await apiService.get(`/qualification/fm100/${row.id}`)
    if (res.data.success) {
      currentDetail.value = res.data.data
      return true
    }
    return false
  } catch (e) {
    ElMessage.error('获取详情失败')
    return false
  }
}

const handleViewDetail = async (row) => {
  if (await fetchDetail(row)) {
    reportDialog.title = '测试详情'
    reportDialog.visible = true
  }
}

const getReportNo = (row) => {
  if (row && row.reportNo) return row.reportNo
  if (!row || !row.id) return ''
  const date = new Date(row.testDate)
  const year = date.getFullYear()
  return `FM${year}${String(row.id).padStart(6, '0')}`
}

const handlePrintReport = async (row) => {
  if (await fetchDetail(row)) {
    // 等待数据加载并渲染完成后，稍微延迟一下再打印
    setTimeout(() => {
      handlePrint()
    }, 500)
  }
}

const handlePrint = () => {
  const printContent = document.getElementById('print-area').innerHTML
  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:absolute;width:0;height:0;left:-9999px;')
  document.body.appendChild(iframe)
  
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(`
    <html>
      <head>
        <title>FM100测试报告-${currentDetail.value.personnelName}</title>
        <style>
          body { font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif; padding: 20px; }
          .print-container { width: 100%; max-width: 800px; margin: 0 auto; }
          .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .company-name { font-size: 10pt; font-weight: bold; margin-bottom: 5px; color: #333; }
          .print-header h1 { margin: 0 0 10px; font-size: 24px; }
          .report-meta { display: flex; justify-content: space-between; color: #666; font-size: 12px; }
          .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px; border-left: 4px solid #333; padding-left: 10px; background: #f5f5f5; padding: 5px 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
          .info-table td { border: 1px solid #ccc; padding: 6px; font-size: 13px; }
          .info-table .label { background: #f9f9f9; font-weight: bold; width: 15%; text-align: center; }
          .info-table .value { width: 35%; text-align: center; }
          .rank-cards { display: flex; gap: 10px; margin-bottom: 10px; height: 100px; }
          .rank-card { flex: 1; border: 1px solid #ccc; padding: 10px; text-align: center; background: #fff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: center; }
          .rank-label { font-size: 13px; color: #666; margin-bottom: 8px; font-weight: bold; background: transparent; padding: 0; border-radius: 0; }
          .rank-value { font-size: 24px; font-weight: bold; color: #333; }
          .result-box { border: 1px solid #ccc; padding: 10px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; height: 100px; justify-content: center; }
          .result-main { display: flex; justify-content: space-around; border-bottom: 1px dashed #eee; padding-bottom: 10px; flex: 1; align-items: center; }
          .result-main > div { text-align: center; }
          .result-main .label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
          .result-main .val { font-size: 18px; font-weight: bold; color: #000; }
          .result-details { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }
          .detail-item { font-size: 13px; color: #333; }
          .detail-item span { color: #666; margin-right: 5px; }
          .chart-area { text-align: center; margin: 10px 0; border: 1px solid #eee; padding: 5px; min-height: 220px; display: flex; align-items: center; justify-content: center; }
          .chart-img { max-width: 100%; max-height: 340px; object-fit: contain; }
          .no-chart { color: #ccc; font-size: 13px; }
          .footer-sign { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 20px; }
          .sign-box { display: flex; align-items: flex-end; gap: 10px; font-size: 13px; color: #333; }
          .sign-line { width: 120px; border-bottom: 1px solid #333; }
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .section-title { background: #eee !important; margin: 15px 0 8px; color: #000 !important; }
            .info-table .label { background: #f9f9f9 !important; color: #000 !important; }
            .info-table .value { color: #000 !important; }
            .print-container { width: 100%; max-width: 100%; }
            .rank-label { color: #666 !important; }
            .rank-value { color: #333 !important; }
            .detail-item { color: #000 !important; }
            .detail-item span { color: #666 !important; }
            @page { margin: 10mm; size: A4; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
    </html>
  `)
  doc.close()
  
  // 等待图片加载完成后打印
  const img = doc.querySelector('img')
  if (img) {
    img.onload = () => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
    // 如果图片已经加载（缓存）
    if (img.complete) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  } else {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 100)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该测试记录吗？', '提示', { type: 'warning' })
    await apiService.delete(`/qualification/fm100/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

const gradeStyle = g => ({ '优异': 'success', '良好': 'success', '需关注': 'warning', '不达标': 'danger' }[g] || '')
const getGradeClass = g => ({ '优异': 'grade-superior', '良好': 'grade-good', '需关注': 'grade-attention' }[g] || 'grade-fail')
const getGradeTagClass = g => ({ '优异': 'tag-success', '良好': 'tag-success', '需关注': 'tag-warning' }[g] || 'tag-danger')
const formatDate = d => { if (!d) return ''; const date = new Date(d); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const getCategoryStyle = c => {
  if (c === '优秀色彩分辨力') return 'color: #67c23a; font-weight: 600;'
  if (c === '一般色彩分辨力') return 'color: #e6a23c; font-weight: 600;'
  if (c === '低色彩分辨力') return 'color: #f56c6c; font-weight: 600;'
  return ''
}
const getDiagnosisLabel = (val) => {
  const map = {
    'Normal': '正常',
    'Superior Discrimination': '优秀分辨力',
    'Protan Deficiency': '红色弱',
    'Deutan Deficiency': '绿色弱',
    'Tritan Deficiency': '蓝色弱',
    'Low Discrimination': '低分辨力'
  }
  return map[val] || val
}
const getAdaptedImageUrl = (imagePath, preventCache = false) => {
  if (!imagePath) return ''
  
  // 如果已经是完整的HTTP URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // 如果是data URL或blob URL，直接返回
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath
  }
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 构建图片URL
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：使用Vite代理，确保路径以/files/开头
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

// 粘贴上传支持
const handlePaste = (event) => {
  // 只有在对话框显示时才处理粘贴
  if (!testDialog.visible) return

  const items = event.clipboardData && event.clipboardData.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          if (beforeUpload(file)) {
            handleUpload({ file })
            ElMessage.success('截图已粘贴')
          }
        }
        break
      }
    }
  }
}
</script>

<style scoped>
.fm100-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 6px; font-size: 20px; color: #303133; }
.page-header .desc { margin: 0; font-size: 13px; color: #909399; }
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 20px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
.test-dialog-body { display: flex; gap: 20px; }
.form-section { flex: 1; max-height: 65vh; overflow-y: auto; padding-right: 12px; }
.preview-section { width: 200px; padding: 16px; background: #f5f7fa; border-radius: 8px; text-align: center; }
.preview-title { font-size: 14px; font-weight: 600; color: #606266; margin-bottom: 16px; }
.form-title { font-size: 14px; font-weight: 600; color: #606266; margin: 16px 0 12px; padding-left: 8px; border-left: 3px solid #409eff; }
.form-title:first-child { margin-top: 0; }
.screenshot-upload { width: 100%; }
.screenshot-upload :deep(.el-upload) { width: 100%; border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; }
.screenshot-upload :deep(.el-upload:hover) { border-color: #409eff; }
.upload-placeholder { padding: 20px; text-align: center; color: #909399; }
.preview-img { width: 100%; max-height: 150px; object-fit: contain; }
.grade-preview { padding: 12px 0; }
.grade-circle { width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; }
.grade-value { font-size: 22px; font-weight: 700; }
.grade-label { font-size: 11px; opacity: 0.9; }
.grade-superior { background: linear-gradient(135deg, #11998e, #38ef7d); }
.grade-good { background: linear-gradient(135deg, #56ab2f, #a8e063); }
.grade-attention { background: linear-gradient(135deg, #f7971e, #ffd200); }
.grade-fail { background: linear-gradient(135deg, #cb2d3e, #ef473a); }
.grade-badge { display: inline-block; padding: 3px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.badge-success { background: #d4edda; color: #155724; }
.badge-info { background: #d1ecf1; color: #0c5460; }
.badge-warning { background: #fff3cd; color: #856404; }
.badge-danger { background: #f8d7da; color: #721c24; }
.grade-desc { font-size: 12px; color: #909399; line-height: 1.4; }
.job-match { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #dcdfe6; }
.job-title { font-size: 12px; color: #606266; margin-bottom: 4px; }
.job-list { font-size: 11px; color: #909399; }
.no-preview { padding: 30px 0; color: #c0c4cc; }
.no-preview p { margin-top: 8px; font-size: 12px; }
.report-content { padding: 16px; background: white; }
.report-header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #409eff; }
.report-header h3 { margin: 0 0 6px; font-size: 17px; color: #303133; }
.report-header p { margin: 0; color: #909399; font-size: 13px; }
.score-overview { display: flex; align-items: center; justify-content: center; margin-bottom: 24px; gap: 24px; }
.info-side { display: flex; flex-direction: column; gap: 12px; width: 180px; }
.info-side.left { text-align: right; }
.info-side.right { text-align: left; }
.info-item { display: flex; flex-direction: column; }
.info-item .label { font-size: 12px; color: #909399; margin-bottom: 2px; }
.info-item .value { font-size: 14px; font-weight: 600; color: #303133; }
.score-display { text-align: center; }
.score-circle { width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; }
.score-val { font-size: 24px; font-weight: 700; }
.score-lbl { font-size: 11px; opacity: 0.9; }
.result-tag { display: inline-block; padding: 4px 18px; border-radius: 16px; font-size: 13px; font-weight: 600; }
.tag-success { background: #d4edda; color: #155724; }
.tag-warning { background: #fff3cd; color: #856404; }
.tag-danger { background: #f8d7da; color: #721c24; }
.screenshot-view { margin-top: 12px; }
.screenshot-view h4 { font-size: 14px; color: #606266; margin: 0 0 6px; }
.label-with-tooltip { display: flex; align-items: center; }
.info-icon { margin-left: 4px; color: #E6A23C; cursor: help; }
.action-buttons { white-space: nowrap; }
</style>
