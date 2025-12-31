<template>
  <div class="print-container" :class="{ 'preview-mode': previewMode }" id="incoming-report-print">
    <img v-if="siteConfig.logoBase64Img" :src="siteConfig.logoBase64Img" class="company-logo" alt="logo" />
    <div class="header">
      <h2 class="company-name">{{ siteConfig.companyName || '珠海腾佳印务有限公司' }}</h2>
      <h1 class="title">来料检验报告</h1>
      <div class="report-no-row">NO: {{ data.ReportNo }}</div>
    </div>

    <table class="main-table">
      <colgroup>
        <col style="width: 10%;">
        <col style="width: 10%;">
        <col style="width: 10%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
        <col style="width: 12%;">
        <col style="width: 13%;">
      </colgroup>
      <!-- Info Section -->
      <tbody>
        <tr>
          <td class="label">供应商</td>
          <td class="value" colspan="5" style="text-align: left; padding-left: 10px;">{{ data.Supplier }}</td>
          <td class="label">来料日期</td>
          <td class="value">{{ formatDate(data.ArrivalDate) }}</td>
        </tr>
        <tr>
          <td class="label">品名</td>
          <td class="value" colspan="3" style="text-align: left; padding-left: 10px;">{{ data.ProductName }}</td>
          <td class="label">规格</td>
          <td class="value">{{ data.Specification }}</td>
          <td class="label">来料数量</td>
          <td class="value">{{ data.Quantity }}</td>
        </tr>
        <tr>
          <td class="label">抽样数</td>
          <td class="value">{{ data.SamplingQuantity }}</td>
          <td class="label">采购单号</td>
          <td class="value">{{ data.PONumber }}</td>
          <td class="label">抽样标准</td>
          <td class="value" colspan="3" style="text-align: left; padding-left: 10px;">{{ data.InspectionBasis }}</td>
        </tr>
        <tr>
            <td class="label">检验依据</td>
            <td class="value" colspan="7" style="text-align: left; padding-left: 10px;">{{ computedInspectionStandards }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Detail Section -->
    <table class="detail-table">
      <colgroup>
        <col style="width: 10%;">
        <col style="width: 15%;">
        <col style="width: 10%;">
        <col style="width: 27%;">
        <col style="width: 12%;">
        <col style="width: 8%;">
        <col style="width: 8%;">
        <col style="width: 10%;">
      </colgroup>
      <thead>
        <tr>
          <th>序号</th>
          <th>检验名称</th>
          <th>检验方法</th>
          <th>检验内容描述</th>
          <th>合格标准</th>
          <th>检验结果</th>
          <th>单项判定</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in data.details" :key="index">
          <!-- Show index + 1 for sequence number -->
          <td class="center">{{ index + 1 }}</td>
          <td class="center">{{ item.ItemName }}</td>
          <td class="center">{{ item.SubMethod || '目测/测量' }}</td>
          <td style="text-align: left; padding: 5px;">
            <div v-if="item.InspectionContent">{{ item.InspectionContent }}</div>
          </td>
          <td class="center">
            <div v-if="item.AcceptanceCriteria">{{ item.AcceptanceCriteria }}</div>
          </td>
          <td class="center" style="word-break: break-all;">
             {{ formatResultValue(item) }}
            </td>
          <td class="center">
              <span v-if="item.SingleItemJudgment === '合格'">√</span>
              <span v-else-if="item.SingleItemJudgment === '不合格'">×</span>
              <span v-else>{{ item.SingleItemJudgment }}</span>
          </td>
          <td class="center">{{ item.ItemRemark }}</td>
        </tr>
        <tr v-if="!data.details || data.details.length === 0">
            <td colspan="8" class="center" style="height: 200px;">无检验明细</td>
        </tr>
         <!-- Fill empty rows to maintain height if needed, but for now let's just use min-height -->
      </tbody>
    </table>

    <!-- Conclusion Section -->
    <table class="footer-table">
      <colgroup>
        <col style="width: 10%;">
        <col style="width: 15%;">
        <col style="width: 10%;">
        <col style="width: 30%;">
        <col style="width: 15%;">
        <col style="width: 10%;">
        <col style="width: 10%;">
      </colgroup>
      <tbody>
        <tr class="tall-row">
            <td class="label">检验结论</td>
            <td colspan="6" class="value" style="text-align: left; padding-left: 20px;">
            <span class="check-item">
                <div class="custom-checkbox">
                    <span v-if="data.ReportResult === '合格'" class="checkmark">✔</span>
                </div>
                合格
            </span>
            <span class="check-item">
                <div class="custom-checkbox">
                    <span v-if="data.ReportResult === '不合格'" class="checkmark">✔</span>
                </div>
                不合格
            </span>
            <span class="check-item">
                <div class="custom-checkbox">
                    <span v-if="data.ReportResult === '特采'" class="checkmark">✔</span>
                </div>
                让步接受
            </span>
            </td>
        </tr>
        <tr class="tall-row">
            <td class="label">备注</td>
            <td colspan="6" class="value" style="height: 100px; text-align: left; vertical-align: top;">
            {{ data.ReportRemark }}
            </td>
        </tr>
      </tbody>
    </table>

    <!-- Signature Section (No Border) -->
    <div class="bottom-meta">
        <span>表单编号: F-CK-01 &nbsp;&nbsp; 版本: A/1</span>
    </div>

    <div class="signature-section">
        <div class="signature-item">
            <span class="label">检验人:</span>
            <span class="value">{{ data.InspectorRealName || data.Inspector }}</span>
        </div>
        <div class="signature-item">
            <span class="label">日期:</span>
            <span class="value">{{ formatDate(data.InspectionDate) }}</span>
        </div>
        <div class="signature-item">
            <span class="label">审核人:</span>
            <span class="value">{{ data.AuditorRealName || data.Auditor }}</span>
        </div>
    </div>

  </div>
</template>

<script setup>
import { defineProps, computed, reactive, onMounted } from 'vue'
import dayjs from 'dayjs'
import api from '@/utils/api'
// 移除本地硬编码的默认LOGO，避免404
// import defaultLogo from '@/assets/logo-print.png'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  previewMode: {
    type: Boolean,
    default: false
  }
})

const siteConfig = reactive({
  logoBase64Img: '',
  companyName: ''
})


const loadSiteConfig = async () => {
  try {
    const res = await api.get('/config/site-config')
    if (res.success && res.data) {
      if (res.data.logoBase64Img) {
        siteConfig.logoBase64Img = res.data.logoBase64Img
      }
      if (res.data.companyName) {
        siteConfig.companyName = res.data.companyName
      }
    }
  } catch (e) {
    console.error('Failed to load site config', e)
  }
}

// 监听数据变化，每次打开打印时重新加载配置
// 由于组件可能被缓存，我们需要一种方式在每次显示时刷新
// 这里简单起见，我们在 onMounted 加载一次
// 如果需要实时性，可以在父组件通过 ref 调用，或者这里监听 props 变化（虽然 data 变化不代表 config 变化）
// 更好的方式是暴露一个 refreshConfig 方法
defineExpose({
  refreshConfig: loadSiteConfig
})

onMounted(() => {
  loadSiteConfig()
})

const computedInspectionStandards = computed(() => {
    if (!props.data.details || props.data.details.length === 0) return ''
    // Extract unique basis from details (changed from InspectionStandard to InspectionBasis)
    const standards = props.data.details
        .map(d => d.InspectionBasis) // Use the new field
        .filter(s => s && s.trim() !== '')
    // Remove duplicates
    const unique = [...new Set(standards)]
    return unique.join('; ')
})

const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

const formatResultValue = (item) => {
    if (!item) return '';
    const name = (item.ItemName || '').trim();
    const val = item.SampleValues;
    const unit = item.Unit;

    // 1. 初粘性/力：取最小值（带#号）
    if (name.includes('初粘性') || name.includes('初粘力')) {
        let parsed = val;
        if (typeof val === 'string') {
            try { parsed = JSON.parse(val); } catch(e) { return val; }
        }
        if (!Array.isArray(parsed) || parsed.length === 0) return val;

        // Extract numbers and find min
        let minNum = Infinity;
        let minStr = '';
        
        parsed.forEach(v => {
            const strV = String(v);
            const match = strV.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num < minNum) {
                    minNum = num;
                    minStr = strV;
                }
            }
        });
        
        return minNum === Infinity ? (parsed[0] || '') : minStr;
    }

    // 2. 持粘性/力：取最小值（时间）
    // 格式通常是 ">= 24h" 或 "24h" 或数字
    if (name.includes('持粘性') || name.includes('持粘力')) {
        let parsed = val;
        if (typeof val === 'string') {
            try { parsed = JSON.parse(val); } catch(e) { return val; }
        }
        if (!Array.isArray(parsed) || parsed.length === 0) return val;

        // 如果都是一样的（例如都是 ">= 24h"），直接返回第一个
        const allSame = parsed.every(v => v === parsed[0]);
        if (allSame) return parsed[0];

        // 否则尝试找最小值
        // 简单处理：提取数字比较
        let minNum = Infinity;
        let minStr = '';
        
        parsed.forEach(v => {
            const strV = String(v);
            const match = strV.match(/([\d\.]+)/);
            if (match) {
                const num = parseFloat(match[1]);
                if (!isNaN(num) && num < minNum) {
                    minNum = num;
                    minStr = strV;
                }
            }
        });
        
        return minNum === Infinity ? (parsed[0] || '') : minStr;
    }

    // 3. 剥离力/离型力：去掉 /25mm 后缀，并使用默认格式化（平均值）
    if (name.includes('剥离力') || name.includes('离型力')) {
        const formatted = formatSampleValues(val, unit);
        return String(formatted).replace(/\/25mm/g, '');
    }

    // 4. 默认：使用平均值或原样
    return formatSampleValues(val, unit);
}

const formatSampleValues = (val, unit) => {
  if (!val) return ''
  let parsed = val
  if (typeof val === 'string') {
    try {
      parsed = JSON.parse(val)
    } catch (e) {
      return val
    }
  }
  
  if (Array.isArray(parsed)) {
      if (parsed.length === 0) return ''
      
      // Check if values are numbers AND do not contain special suffix like #
      // parseFloat("8#") is 8, which is a number, but we don't want to average ball numbers.
      const allNumbers = parsed.every(v => {
          if (typeof v === 'string' && v.includes('#')) return false;
          return !isNaN(parseFloat(v));
      });
      
      if (allNumbers) {
          // Calculate average
          const sum = parsed.reduce((a, b) => a + parseFloat(b), 0)
          const avg = sum / parsed.length
          // Keep up to 3 decimal places if needed, remove trailing zeros
          let result = parseFloat(avg.toFixed(3))
          if (unit) {
              result += '' + unit // Append unit with a space if preferred, but usually tight: "500mm"
          }
          return result
      } else {
          // If non-numbers (e.g. "OK"), check if all are same
          const allSame = parsed.every(v => v === parsed[0])
          if (allSame) {
              return parsed[0]
          }
          // If mixed non-numbers, join with comma
          return parsed.join(', ')
      }
  }
  return val
}
</script>

<style scoped>
/* Print Styles */
.print-container {
  width: 210mm;
  min-height: 297mm; /* A4 */
  padding: 10mm 15mm; /* Adjusted margins */
  padding-bottom: 20mm; /* 给页脚留出空间 */
  background: white;
  box-sizing: border-box;
  font-family: "SimSun", "Songti SC", serif;
  color: #000;
  display: none;
  position: relative; /* 确保是定位父级 */
}

.print-container.preview-mode {
  display: block;
  margin: 0 auto;
}

@media print {
  .print-container {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    margin: 0;
    padding: 10mm 15mm;
    padding-bottom: 20mm; /* 给页脚留出空间 */
    z-index: 9999;
  }
  @page {
      size: A4;
      margin: 0;
  }
}

/* General Table */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0; /* Tighten up */
}

td, th {
  border: 1px solid #000;
  padding: 8px 5px; /* Increased padding from 4px to 8px */
  font-size: 12px;
  text-align: center;
  vertical-align: middle;
  line-height: 1.5; /* Added line-height for better readability */
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 15px;
  position: relative;
  /* 确保 header 不会遮挡绝对定位的 logo */
  z-index: 1;
}

.report-no-row {
  font-size: 12px;
  color: red; /* 红色字体 */
  text-align: right; /* 靠右对齐 */
  margin-top: 5px; /* 与标题保持间距 */
  font-weight: bold;
}

.company-logo {
  position: absolute;
  left: 15mm; /* 与 print-container padding-left 一致 */
  top: 5mm;  /* 进一步上移 */
  width: 40px;
  height: 40px;
  object-fit: contain;
  z-index: 2; /* 确保 logo 在最上层 */
}

.title {
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
  font-size: 30px;
  font-weight: bold;
  letter-spacing: 5px;
  margin: 5px 0;
}

.company-name {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  letter-spacing: 2px;
}

/* Old report-no removed */

/* Specific Tables */
.main-table td {
    padding-top: 15px;
    padding-bottom: 15px;
    height: 65px; /* 强制固定高度，确保各行高度一致，即使内容换行 */
}
.main-table td.label {
    font-weight: bold;
}

.detail-table {
    border-top: none; 
}
.detail-table th {
    font-weight: bold;
    background-color: transparent; /* No gray bg */
}

/* Footer Table */
.footer-table {
    margin-top: -1px; /* Overlap borders */
}
.footer-table td {
    padding: 8px;
}
.tall-row td {
    padding-top: 15px;
    padding-bottom: 15px;
}

.check-item {
    margin-right: 30px;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
}
.custom-checkbox {
    width: 14px;
    height: 14px;
    border: 1px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    background: white;
}
.checkmark {
    font-size: 12px;
    font-weight: bold;
    line-height: 1;
}

/* Signature Section */
.signature-section {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    padding: 0 20px;
    font-size: 14px;
    /* 恢复绝对定位，使其始终在页面底部 */
    position: absolute;
    bottom: 25mm; /* 稍微上移，给底部留白 */
    left: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 0 15mm; /* Match container padding */
}

.signature-item {
    display: flex;
    align-items: center;
}
.signature-item .label {
    font-weight: bold;
    margin-right: 10px;
}
.signature-item .value {
    border-bottom: 1px solid #000;
    min-width: 100px;
    text-align: center;
    padding-bottom: 2px;
}

.bottom-meta {
    margin-top: 5px;
    display: flex;
    justify-content: flex-end; /* 右对齐 */
    font-size: 10px;
    padding: 0 5px;
    /* 取消绝对定位，使其紧跟表格 */
    /* position: absolute; */
    /* bottom: 10mm; */
    /* left: 15mm; */
    /* right: 15mm; */
}

/* 移除页脚相关样式 */

</style>
