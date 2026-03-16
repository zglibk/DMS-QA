<template>
  <div class="quality-assessment-notice">
    <div class="page" id="assessment-page">
      <!-- ═══════ 顶部 ═══════ -->
      <div class="header">
        <div class="company-info">
          <div class="company-logo">
            <svg viewBox="0 0 100 96" xmlns="http://www.w3.org/2000/svg" style="height:100%; display:block">
              <!-- Logo Mark (TJ) -->
              <rect x="0" y="4" width="22" height="20" fill="#043a7a"/>
              <rect x="24" y="4" width="22" height="20" fill="#043a7a"/>
              <rect x="48" y="4" width="22" height="20" fill="#043a7a"/>
              <rect x="24" y="26" width="22" height="66" fill="#043a7a"/>
              <rect x="0" y="72" width="22" height="20" fill="#043a7a"/>
              <!-- Text -->
              <text x="78" y="20" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="18" fill="#2980b9" font-weight="bold">腾</text>
              <text x="78" y="43" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="18" fill="#c0392b" font-weight="bold">佳</text>
              <text x="78" y="66" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="18" fill="#f1c40f" font-weight="bold">印</text>
              <text x="78" y="89" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="18" fill="#000000" font-weight="bold">务</text>
            </svg>
          </div>
          <div class="company-text">
            <strong>珠海腾佳印务有限公司</strong>
            Zhuhai Tengjia Printing Co., Ltd.
          </div>
        </div>
        <div class="title-area">
          <div class="main-title">质量考核通知单</div>
        </div>
        <div class="no-area">
          通知编号：<span class="doc-no">TJ-QA-</span><input class="inp" style="width:80px; display:inline-block" v-model="formData.docNo" placeholder="2026-001"><br>
          表单编号：F-PZ-05&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;版本：{{ formData.version || 'A/0' }}
        </div>
      </div>
      <hr class="divider-thick">
      <hr class="divider-thin">

      <!-- ═══════ 表格一：基本信息 + 过失描述 ═══════ -->
      <table class="tbl-top">
        <colgroup>
          <col style="width:68px">
          <col style="width:68px">
          <col>
          <col style="width:68px">
          <col>
          <col style="width:68px">
          <col>
        </colgroup>
        <tr>
          <td class="label" rowspan="3">基<br>本<br>信<br>息</td>
          <td class="label">被考核人</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.personName" placeholder="姓名" :disabled="readonly"></td>
          <td class="label">岗位</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.post" placeholder="岗位" :disabled="readonly"></td>
          <td class="label">直接主管</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.supervisor" placeholder="主管姓名" :disabled="readonly"></td>
        </tr>
        <tr>
          <td class="label">所在部门</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.department" placeholder="部门/班组" :disabled="readonly"></td>
          <td class="label">涉及工单</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.workOrder" placeholder="工单号 / 客户名称" :disabled="readonly"></td>
          <td class="label">提交人</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.submitter" placeholder="姓名" :disabled="readonly"></td>
        </tr>
        <tr>
          <td class="label">发生时间</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.occurrenceDate" placeholder="年 / 月 / 日" :disabled="readonly"></td>
          <td class="label">发生地点</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.location" placeholder="车间/工序/场所" :disabled="readonly"></td>
          <td class="label">提交日期</td>
          <td><input class="inp-clean" v-model="formData.basicInfo.submitDate" placeholder="年 / 月 / 日" :disabled="readonly"></td>
        </tr>
        <tr><td colspan="7" class="section-bar">过失 / 异常描述 及 原因分析</td></tr>
        <tr>
          <td class="label">过失<br>描述</td>
          <td colspan="2" style="height:100px; vertical-align:top; padding:6px">
            <textarea v-model="formData.description.fault" style="width:100%;height:100%;border:none;resize:none;font-family:inherit;font-size:12.5px;outline:none;color:#222;background:transparent" placeholder="简述质量异常/过失的具体内容、造成的影响及损失情况..." :disabled="readonly"></textarea>
          </td>
          <td class="label">原因<br>分析</td>
          <td colspan="3" style="height:100px; vertical-align:top; padding:6px">
            <textarea v-model="formData.description.analysis" style="width:100%;height:100%;border:none;resize:none;font-family:inherit;font-size:12.5px;outline:none;color:#222;background:transparent" placeholder="简述产生异常的原因..." :disabled="readonly"></textarea>
          </td>
        </tr>
      </table>

      <!-- ═══════ 表格二：考核详情 ═══════ -->
      <table class="tbl-main">
        <colgroup>
          <col style="width:36px">
          <col>
          <col>
          <col style="width:80px">
          <col style="width:125px">
          <col style="width:68px">
          <col style="width:62px">
          <col style="width:62px">
        </colgroup>

        <tr><td colspan="8" class="section-bar">考核详情</td></tr>
        <tr>
          <td class="sub-header">序号</td>
          <td class="sub-header" colspan="2">事故类型</td>
          <td class="sub-header">事故等级</td>
          <td class="sub-header">当月发生频次</td>
          <td class="sub-header">损失成本(元)</td>
          <td class="sub-header">应考核(元)</td>
          <td class="sub-header">实考核(元)</td>
        </tr>
        
        <tr v-for="(row, index) in formData.assessmentDetails" :key="index" class="detail-row">
          <td class="label" style="text-align:center; font-weight:400; position:relative">
            <span class="row-num">{{ index + 1 }}</span>
            <button v-if="formData.assessmentDetails.length > 1 && !readonly" class="del-row-btn no-print" @click="removeDetailRow(index)" title="删除此行">×</button>
          </td>
          <td colspan="2" style="padding:0; height: 44px">
            <textarea class="inp-clean" v-model="row.type" style="height:100%; width:100%; padding:6px 8px; resize:none; overflow:hidden; line-height:1.4" placeholder="输入事故类型" :disabled="readonly"></textarea>
          </td>
          <td style="text-align:center; vertical-align:middle">
            <div class="radio-group">
              <label><input type="radio" :name="'level_' + index" value="A" v-model="row.level" @change="recalcRow(index)" :disabled="readonly"> A级</label>
              <label><input type="radio" :name="'level_' + index" value="B" v-model="row.level" @change="recalcRow(index)" :disabled="readonly"> B级</label>
            </div>
          </td>
          <td style="text-align:center; vertical-align:middle">
            <div class="radio-group">
              <label><input type="radio" :name="'freq_' + index" value="1" v-model="row.frequency" @change="recalcRow(index)" :disabled="readonly"> 首次</label>
              <label><input type="radio" :name="'freq_' + index" value="2" v-model="row.frequency" @change="recalcRow(index)" :disabled="readonly"> 再次</label>
              <label><input type="radio" :name="'freq_' + index" value="3" v-model="row.frequency" @change="recalcRow(index)" :disabled="readonly"> 多次</label>
            </div>
          </td>
          <td style="text-align:center; vertical-align:middle">
            <input class="loss-input" v-model.number="row.lossAmount" placeholder="0" @input="recalcRow(index)" :disabled="readonly">
          </td>
          <td style="text-align:center; vertical-align:middle">
            <span class="calc-val auto-amt">{{ row.shouldAssessAmount !== null ? row.shouldAssessAmount.toFixed(2) : '—' }}</span>
          </td>
          <td style="text-align:center; vertical-align:middle">
            <input class="actual-input detail-amt" v-model.number="row.actualAssessAmount" placeholder="0.00" :disabled="readonly">
          </td>
        </tr>

        <tr class="no-print" v-if="!readonly">
          <td colspan="8" style="text-align:center; padding:4px; border:1px solid #888">
            <button class="add-row-btn" @click="addDetailRow" title="添加考核条目">＋ 添加考核条目</button>
          </td>
        </tr>

        <!-- 处罚依据 & 合计 -->
        <tr>
          <td class="label">处罚依据</td>
          <td colspan="4" style="font-size:12px; color:#555; padding:6px 8px">
            根据公司《质量考核管理制度》第 <input class="inp-amt" v-model="formData.punishmentBasis" style="width:28px" :disabled="readonly"> 条之规定
          </td>
          <td style="text-align:center; font-size:11.5px; color:#888; background:#faf9f7">
            合计
          </td>
          <td style="text-align:center; background:#faf9f7">
            <span class="calc-val">{{ totalAutoAmount }}</span>
          </td>
          <td style="text-align:center; background:#fffaf5">
            <b style="color:#b71c1c">¥</b> <span class="calc-val" style="font-size:13px">{{ totalActualAmount }}</span>
          </td>
        </tr>

        <!-- ═══════ 处理结果 ═══════ -->
        <tr><td colspan="8" class="section-bar">处理结果</td></tr>
        <tr>
          <td class="label">品质部门<br>意见</td>
          <td colspan="5" style="padding:6px 8px">
            <div class="chk-group">
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="口头警告" :disabled="readonly"> 口头警告</label>
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="书面警告" :disabled="readonly"> 书面警告</label>
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="绩效考核" :disabled="readonly"> 绩效考核（¥<input class="inp-amt" v-model="formData.qualityDeptPerfAmount" style="width:45px" :disabled="readonly">元）</label>
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="培训整改" :disabled="readonly"> 培训整改</label>
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="调岗" :disabled="readonly"> 调岗</label>
              <label><input type="checkbox" v-model="formData.qualityDeptOpinion" value="辞退" :disabled="readonly"> 辞退</label>
            </div>
          </td>
          <td colspan="2" style="vertical-align:bottom; padding:8px">
            <div class="sign-box">
              <div class="sign-row">签字：<div class="line"></div></div>
              <div class="sign-row">日期：<div class="line"></div></div>
            </div>
          </td>
        </tr>

        <!-- ═══════ 各方确认 ═══════ -->
        <tr><td colspan="8" class="section-bar">各方确认</td></tr>

        <tr>
          <td class="label" style="font-size:11px">被考核人<br>所在部门<br>意见</td>
          <td colspan="5" style="padding:6px 8px">
            <div class="chk-group" style="margin-bottom:4px">
              <label><input type="checkbox" v-model="formData.deptOpinion.type" value="口头警告" :disabled="readonly"> 口头警告</label>
              <label><input type="checkbox" v-model="formData.deptOpinion.type" value="书面警告" :disabled="readonly"> 书面警告</label>
              <label><input type="checkbox" v-model="formData.deptOpinion.type" value="绩效考核" :disabled="readonly"> 绩效考核（¥<input class="inp-amt" v-model="formData.deptOpinion.amount" style="width:45px" :disabled="readonly">元）</label>
              <label><input type="checkbox" v-model="formData.deptOpinion.type" value="辞退" :disabled="readonly"> 辞退</label>
            </div>
            <div style="font-size:11.5px;color:#666;margin-top:4px">补充意见：<input class="inp" v-model="formData.deptOpinion.comment" style="width:70%" :disabled="readonly"></div>
          </td>
          <td colspan="2" style="vertical-align:bottom; padding:8px">
            <div class="sign-box">
              <div class="sign-row">主管签字：<div class="line"></div></div>
              <div class="sign-row">日期：<div class="line"></div></div>
            </div>
          </td>
        </tr>

        <tr>
          <td class="label" style="font-size:11px">本人<br>确认</td>
          <td colspan="5" style="padding:6px 8px">
            <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:12.5px">
                <input type="radio" name="selfConfirm" value="同意" v-model="formData.selfConfirm.status" style="accent-color:#b71c1c;width:13px;height:13px" :disabled="readonly"> 同意
              </label>
              <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:12.5px">
                <input type="radio" name="selfConfirm" value="不同意" v-model="formData.selfConfirm.status" style="accent-color:#b71c1c;width:13px;height:13px" :disabled="readonly"> 不同意
              </label>
            </div>
            <div style="font-size:11.5px;color:#666;margin-top:5px">
              如不同意请阐述理由：<input class="inp" v-model="formData.selfConfirm.reason" style="width:65%" :disabled="readonly">
            </div>
            <div style="font-size:11.5px;color:#333;margin-top:6px;border-top:1px dashed #ccc;padding-top:4px;font-weight:600">
              如当事人不同意，部门主管签署意见：
              <span style="display:inline-flex;gap:10px;margin-left:6px;align-items:center;font-weight:400">
                <label style="display:flex;align-items:center;gap:2px;cursor:pointer;font-size:11.5px;color:#444">
                  <input type="radio" name="supervisorConfirm" value="同意" v-model="formData.supervisorConfirm.status" style="width:12px;height:12px;accent-color:#b71c1c" :disabled="readonly"> 同意
                </label>
                <label style="display:flex;align-items:center;gap:2px;cursor:pointer;font-size:11.5px;color:#444">
                  <input type="radio" name="supervisorConfirm" value="不同意" v-model="formData.supervisorConfirm.status" style="width:12px;height:12px;accent-color:#b71c1c" :disabled="readonly"> 不同意
                </label>
                <label style="display:flex;align-items:center;gap:2px;cursor:pointer;font-size:11.5px;color:#444">
                  <input type="radio" name="supervisorConfirm" value="其他" v-model="formData.supervisorConfirm.status" style="width:12px;height:12px;accent-color:#b71c1c" :disabled="readonly"> 其他：<input class="inp" v-model="formData.supervisorConfirm.otherReason" style="width:90px;font-size:11.5px;display:inline-block" :disabled="readonly">
                </label>
              </span>
            </div>
          </td>
          <td colspan="2" style="vertical-align:bottom; padding:8px">
            <div class="sign-box">
              <div class="sign-row">本人签字：<div class="line"></div></div>
              <div class="sign-row">日期：<div class="line"></div></div>
            </div>
          </td>
        </tr>

        <tr>
          <td class="label" style="font-size:11px">总经理<br>意见</td>
          <td colspan="5" class="h-50" style="font-size:11.5px; color:#999; vertical-align:top">
            批示：
          </td>
          <td colspan="2" style="vertical-align:bottom; padding:8px">
            <div class="sign-box">
              <div class="sign-row">签字：<div class="line"></div></div>
              <div class="sign-row">日期：<div class="line"></div></div>
            </div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <b>说明：</b><br>① 本通知单一式叁份，被考核人、品质部及行政部各留存一份。<br>
        ② 被考核人如对处理结果有异议，可在收到本通知之日起 <span class="red">2个工作日</span> 内，向所在部门或品质部申诉，逾期未申诉视为接受处理结果。<br>
        ③ 考核金额从当月绩效奖金中扣除。<br>
        ④ 考核返还：一个季度内未再发生品质异常，将在季度后返还相应金额。例:5月发生的品质考核，6、7、8月为改善期，改善期若未发生品质异常，即在9月工资返还相关金额。<br>
        ⑤ 损失成本 = 直接经济损失（报废/返修/降价）+ 客户索赔金额。
      </div>
    </div>

    <!-- 打印控制栏 - 移到下方 -->
    <div class="print-bar no-print">
      <button class="btn" @click="handlePrint">🖨️ 打印 / 导出PDF</button>
      <button v-if="!readonly" class="btn btn-save" @click="handleSave" :disabled="loading">{{ loading ? '保存中...' : '💾 保存' }}</button>
      <button class="btn btn-close" @click="handleClose">✖ 关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  readonly: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'print', 'close', 'save'])

// 默认数据结构
const defaultData = {
  docNo: '',
  version: 'A/0',
  basicInfo: {
    personName: '',
    post: '',
    supervisor: '',
    department: '',
    workOrder: '',
    submitter: '',
    occurrenceDate: '',
    location: '',
    submitDate: ''
  },
  description: {
    fault: '',
    analysis: ''
  },
  assessmentDetails: [
    { type: '', level: '', frequency: '', lossAmount: null, shouldAssessAmount: null, actualAssessAmount: null }
  ],
  punishmentBasis: '',
  qualityDeptOpinion: [],
  qualityDeptPerfAmount: null,
  deptOpinion: {
    type: [],
    amount: null,
    comment: ''
  },
  selfConfirm: {
    status: '',
    reason: ''
  },
  supervisorConfirm: {
    status: '',
    otherReason: ''
  }
}

// 初始化数据
const formData = reactive({ ...defaultData, ...props.initialData, ...props.modelValue })

// 监听 props 变化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    Object.assign(formData, newVal)
  }
}, { deep: true })

  // 监听 formData 变化并触发 emit
  watch(formData, (newVal) => {
    emit('update:modelValue', newVal)
  }, { deep: true })

// 计算属性
const totalAutoAmount = computed(() => {
  const sum = formData.assessmentDetails.reduce((acc, curr) => acc + (parseFloat(curr.shouldAssessAmount) || 0), 0)
  return sum > 0 ? sum.toFixed(2) : '—'
})

const totalActualAmount = computed(() => {
  const sum = formData.assessmentDetails.reduce((acc, curr) => acc + (parseFloat(curr.actualAssessAmount) || 0), 0)
  return sum > 0 ? sum.toFixed(2) : '0.00'
})

// 同步实考核合计到提交部门意见的绩效考核金额
watch(totalActualAmount, (newVal) => {
  if (parseFloat(newVal) > 0) {
    formData.qualityDeptPerfAmount = newVal
    if (!formData.qualityDeptOpinion.includes('绩效考核')) {
      formData.qualityDeptOpinion.push('绩效考核')
    }
  } else {
    formData.qualityDeptPerfAmount = null
  }
})

// 方法
const addDetailRow = () => {
  formData.assessmentDetails.push({
    type: '', level: '', frequency: '', lossAmount: null, shouldAssessAmount: null, actualAssessAmount: null
  })
}

const removeDetailRow = (index) => {
  if (formData.assessmentDetails.length > 1) {
    formData.assessmentDetails.splice(index, 1)
  }
}

const recalcRow = (index) => {
  const row = formData.assessmentDetails[index]
  const level = row.level
  const freq = parseInt(row.frequency) || 1
  const loss = parseFloat(row.lossAmount) || 0

  let amt = null
  if (level === 'A') {
    // A级：损失成本 × 50%，考核金额范围 100 < X ≤ 1000
    // 未填损失成本时按最低限100元
    if (loss <= 0) amt = 100
    else {
      const calc = loss * 0.5
      amt = Math.max(100, Math.min(calc, 1000))
    }
  } else if (level === 'B') {
    // B级：阶梯固定金额
    if (freq === 1) amt = 20
    else if (freq === 2) amt = 50
    else amt = 100 // 3次及以上
  }

  row.shouldAssessAmount = amt
  // 自动填入实考核（如果实考核为空）
  if (amt !== null && (!row.actualAssessAmount || row.actualAssessAmount === 0)) {
    row.actualAssessAmount = amt
  }
}

const resetForm = () => {
  if (!confirm('确认清空所有已填写的内容？')) return
  Object.assign(formData, JSON.parse(JSON.stringify(defaultData)))
  emit('reset')
}

const handlePrint = () => {
  window.print()
  emit('print')
}

const handleSave = () => {
  emit('save')
}

const handleClose = () => {
  emit('close')
}

// 暴露给父组件
defineExpose({
  formData,
  addDetailRow,
  handlePrint,
  handleSave
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

/* 重置部分样式以适应 Vue 组件环境 */
.quality-assessment-notice {
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  background: transparent; /* 完全透明，去除外围色块 */
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 30px 20px;
  box-sizing: border-box;
}

.page {
  background: #fff;
  width: 794px; /* A4 width */
  padding: 32px 40px 28px;
  box-shadow: 0 2px 24px rgba(0,0,0,0.10);
  position: relative;
  box-sizing: border-box;
}

/* ── 顶部标题区 ── */
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.company-info { display: flex; align-items: center; gap: 10px; min-width: 180px; }
.company-logo {
  height: 45px; width: 47px; flex-shrink: 0; margin-right: 10px;
}
.company-text { font-size: 12.5px; color: #666; line-height: 1.45; }
.company-text strong { color: #333; font-size: 13.5px; font-weight: 600; display: block; }
.title-area { text-align: center; flex: 1; }
.main-title { font-family: 'Noto Serif SC', 'SimSun', serif; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #1a1a1a; }
.no-area { text-align: right; font-size: 12px; color: #333; min-width: 180px; line-height: 1.6; }
.no-area .doc-no { color: #b71c1c; font-weight: 600; font-size: 12.5px; }
.divider-thick { border: none; border-top: 2.5px solid #222; margin: 6px 0 0; }
.divider-thin { border: none; border-top: 0.8px solid #222; margin: 2px 0 10px; }

/* ── 表格通用 ── */
table { width: 100%; border-collapse: collapse; font-size: 12.5px; color: #222; }
.tbl-top { margin-bottom: -1px; } /* 消除两表之间的间隙 */
td, th { border: 1px solid #888; padding: 5px 8px; vertical-align: middle; }
.label { background: #f2f2f2; font-weight: 600; white-space: nowrap; text-align: center; color: #333; width: 74px; font-size: 12px; }
.section-bar { background: #333; color: #fff; text-align: center; font-weight: 600; letter-spacing: 4px; font-size: 12.5px; padding: 5px; }
.sub-header { background: #e5e5e5; text-align: center; font-weight: 600; font-size: 11.5px; padding: 5px 4px; color: #444; }

/* ── 输入控件 ── */
.inp { border: none; border-bottom: 1px solid #bbb; width: 100%; background: transparent; font-family: inherit; font-size: 12.5px; color: #222; padding: 2px 4px; outline: none; transition: border-color 0.2s; }
.inp:focus { border-bottom-color: #b71c1c; }
.inp:disabled, .inp-clean:disabled, textarea:disabled, .inp-amt:disabled, .actual-input:disabled, .loss-input:disabled { 
  background-color: transparent !important; 
  cursor: not-allowed; 
  color: #000;
  opacity: 1;
}
.inp-clean { border: none; width: 100%; background: transparent; font-family: inherit; font-size: 12.5px; color: #222; padding: 2px 4px; outline: none; }
.inp-sm { width: 50px; text-align: center; }
.inp-amt { border: none; border-bottom: 1px solid #bbb; width: 65px; background: transparent; font-family: inherit; font-size: 12.5px; text-align: center; outline: none; }
.inp-amt:focus { border-bottom-color: #b71c1c; }

/* ── 复选框 ── */
.chk-group { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; padding: 2px 0; }
.chk-group label { display: flex; align-items: center; gap: 3px; cursor: pointer; font-size: 12.5px; white-space: nowrap; user-select: none; }
.chk-group input[type=checkbox] { width: 13px; height: 13px; cursor: pointer; accent-color: #b71c1c; }
.chk-group input[type=checkbox]:disabled { cursor: not-allowed; opacity: 0.6; }

/* ── 单选按钮组 ── */
.radio-group { display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: nowrap; }
.radio-group label { display: flex; align-items: center; gap: 2px; cursor: pointer; font-size: 11.5px; white-space: nowrap; user-select: none; color: #444; }
.radio-group input[type=radio] { width: 13px; height: 13px; cursor: pointer; accent-color: #b71c1c; margin: 0; }
.radio-group input[type=radio]:disabled { cursor: not-allowed; opacity: 0.6; }

/* ── 高度控制 ── */
.h-50 { height: 50px; vertical-align: top; padding: 6px 8px; }
.h-64 { height: 64px; vertical-align: top; padding: 6px 8px; }

/* ── 签字区 ── */
.sign-box { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.sign-row { display: flex; align-items: center; gap: 4px; font-size: 11.5px; white-space: nowrap; }
.sign-row .line { border-bottom: 1px solid #aaa; flex: 1; min-width: 70px; height: 16px; }

/* ── 底部说明 ── */
.footer-note { border: 1px solid #888; border-top: none; padding: 7px 10px; font-size: 11px; color: #666; line-height: 1.7; background: #faf9f7; }
.footer-note b { color: #333; }
.footer-note .red { color: #b71c1c; font-weight: 600; }

/* ── 按钮 ── */
.print-bar { 
  position: fixed; 
  bottom: 24px; 
  left: 50%; 
  transform: translateX(-50%); 
  display: flex; 
  gap: 16px; 
  z-index: 1000;
  /* 确保按钮组在页面内容区域内居中，而不是相对于整个视口 */
  /* 由于父容器通常是flex布局，这里可能需要调整 */
  /* 如果父组件是 .notice-wrapper { display: flex; justify-content: center; } */
  /* 且 QualityAssessmentNotice 是其子元素 */
  /* 我们可以尝试将 position: fixed 改为 sticky 或者调整 left */
  /* 但考虑到这是一个从底部浮动的栏，fixed 是最稳妥的，只是基准点问题 */
  /* 如果侧边栏存在，fixed 是相对于视口的，所以确实会偏左 */
  /* 为了修正这个问题，我们可以尝试用 sticky 布局放在内容底部 */
}

/* 修正：不再使用 fixed 全局定位，而是相对于组件自身定位 */
/* 前提是父组件高度足够且 overflow 正常 */
/* 但为了保证始终悬浮在底部，还是得用 fixed，但需要修正 left */
/* 更好的做法是将 print-bar 放在 .page 内部底部，或者使用 sticky */

/* 方案二：使用 sticky 定位在 .quality-assessment-notice 底部 */
/* 需要修改 HTML 结构，将 print-bar 放在最下面 */
/* 或者简单点，给 print-bar 加一个 calc */
/* 侧边栏通常宽 200px-260px，但它是动态的 */
/* 最稳妥的方式是让 print-bar 位于 .page 的正下方，随页面滚动，或者使用 sticky */

/* 既然用户觉得偏左，那说明他是相对于“右侧内容区”来看的 */
/* 我们可以尝试将 left: 50% 改为 left: calc(50% + 100px) 这种硬编码，但这不灵活 */
/* 或者，我们可以将 print-bar 放入 .page 容器内（但在打印时隐藏），或者使用 sticky */

/* 让我们尝试 sticky 方案 */
.quality-assessment-notice {
  /* ... 原有样式 ... */
  position: relative; /* 为 sticky 提供上下文 */
}

.print-bar { 
  position: sticky; 
  bottom: 20px; 
  margin-top: 20px; /* 与上方内容保持距离 */
  align-self: center; /* 在 flex 容器中居中 */
  transform: none; /* 移除 translateX */
  left: auto; /* 移除 left */
  display: flex; 
  gap: 16px; 
  z-index: 1000; 
}
.btn { background: #043a7a; color: #fff; border: none; padding: 10px 20px; font-size: 13px; cursor: pointer; font-family: inherit; letter-spacing: 1px; transition: background 0.2s; box-shadow: 0 3px 12px rgba(0,0,0,0.18); border-radius: 4px; }
.btn:hover { background: #b71c1c; }
.btn-save { background: #27ae60; }
.btn-save:hover { background: #219150; }
.btn-save:disabled { background: #95a5a6; cursor: not-allowed; }
.btn-close { background: #e74c3c; }
.btn-close:hover { background: #c0392b; }

/* ── 考核金额区 ── */
.calc-row { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
.calc-label { color: #888; white-space: nowrap; }
.calc-val { font-weight: 600; color: #b71c1c; min-width: 50px; text-align: center; }
.calc-arrow { color: #ccc; font-size: 13px; }
.actual-input {
  border: 1px solid #ddd; border-radius: 2px; width: 62px; text-align: center;
  font-family: inherit; font-size: 12px; font-weight: 600; color: #b71c1c;
  padding: 2px 4px; outline: none; background: #fffaf5; transition: border-color 0.2s;
}
.actual-input:focus { border-color: #b71c1c; }

/* ── 损失成本输入 ── */
.loss-input {
  border: 1px solid #ddd; border-radius: 2px; width: 70px; text-align: center;
  font-family: inherit; font-size: 12px; color: #333;
  padding: 2px 4px; outline: none; background: #f9f9f6; transition: border-color 0.2s;
}
.loss-input:focus { border-color: #b71c1c; }

/* ── 添加/删除行按钮 ── */
.add-row-btn { background: transparent; border: 1px dashed #bbb; color: #888; padding: 3px 16px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.2s; border-radius: 3px; letter-spacing: 1px; }
.add-row-btn:hover { border-color: #b71c1c; color: #b71c1c; background: #fef5f5; }
.del-row-btn { background: transparent; border: none; color: #ccc; font-size: 15px; cursor: pointer; padding: 0 4px; line-height: 1; transition: color 0.15s; position: absolute; top: 2px; right: 2px; }
.del-row-btn:hover { color: #b71c1c; }

/* ── 打印适配 ── */
@media print {
  /* 隐藏所有元素，只显示打印区域 */
  body * {
    visibility: hidden;
  }
  
  /* 恢复打印区域可见性 */
  #assessment-page, #assessment-page * {
    visibility: visible;
  }

  /* 定位打印区域到页面左上角 */
  #assessment-page {
    position: fixed; /* 改为 fixed 以确保相对于视口定位 */
    left: 0;
    top: 0;
    width: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    z-index: 2147483647; /* 使用最大 z-index */
    box-shadow: none !important;
    overflow: visible !important;
  }

  /* 确保 HTML 和 BODY 在打印时没有背景色和边距 */
  html, body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }

  /* 隐藏特定不需要打印的元素 */
  .no-print, .print-bar, .add-row-btn, .del-row-btn { 
    display: none !important; 
  }

  /* 样式调整 */
  .quality-assessment-notice { 
    background: #fff !important; 
    padding: 0 !important;
    display: block !important;
  }
  
  .section-bar, .label, .sub-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .inp, .inp-amt { border-bottom-style: solid !important; }
  .inp-clean { border: none !important; }
  input::placeholder, textarea::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; }
}
</style>
