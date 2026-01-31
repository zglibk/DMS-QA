<template>
  <el-dialog
    :model-value="visible"
    :title="item?.Id ? '编辑接口' : '添加接口'"
    width="800px"
    top="3vh"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="formData" label-width="100px" class="api-form">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="所属模块" required>
            <el-select v-model="formData.GroupId" placeholder="选择模块" style="width: 100%">
              <el-option
                v-for="g in groups"
                :key="g.Id"
                :label="g.GroupName"
                :value="g.Id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="接口名称" required>
            <el-input v-model="formData.ApiName" placeholder="如：查询工单列表" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="6">
          <el-form-item label="请求方式">
            <el-select v-model="formData.HttpMethod" style="width: 100%">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="接口路径">
            <el-input v-model="formData.ApiPath" placeholder="/api/xxx/xxx" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="排序">
            <el-input-number v-model="formData.SortOrder" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 标签页切换不同编辑区域 -->
      <el-tabs v-model="activeTab" class="editor-tabs">
        <el-tab-pane label="接口描述" name="description">
          <div class="editor-wrapper">
            <RichTextEditor v-model="formData.ApiDescription" placeholder="输入接口描述..." />
          </div>
        </el-tab-pane>

        <el-tab-pane label="请求参数" name="request">
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <el-button type="primary" size="small" @click="insertParamTable('request')">
                <el-icon><Grid /></el-icon>
                插入参数表格
              </el-button>
              <span class="toolbar-tip">提示：可直接编辑富文本，或点击按钮插入标准参数表格</span>
            </div>
            <RichTextEditor v-model="formData.RequestParams" placeholder="输入请求参数说明..." />
          </div>
        </el-tab-pane>

        <el-tab-pane label="响应参数" name="response">
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <el-button type="primary" size="small" @click="insertParamTable('response')">
                <el-icon><Grid /></el-icon>
                插入参数表格
              </el-button>
              <span class="toolbar-tip">提示：可直接编辑富文本，或点击按钮插入标准参数表格</span>
            </div>
            <RichTextEditor v-model="formData.ResponseParams" placeholder="输入响应参数说明..." />
          </div>
        </el-tab-pane>

        <el-tab-pane label="响应示例" name="example">
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <el-button size="small" @click="formatJson">
                <el-icon><MagicStick /></el-icon>
                格式化JSON
              </el-button>
              <span class="toolbar-tip">支持JSON语法高亮</span>
            </div>
            <div class="code-editor-container">
              <MonacoEditor
                v-model="formData.ResponseExample"
                language="json"
                :height="350"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="调用示例" name="requestExample">
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <el-button type="primary" size="small" @click="generateRequestExample">
                <el-icon><MagicStick /></el-icon>
                生成示例
              </el-button>
              <el-button size="small" @click="formatRequestExample">
                <el-icon><MagicStick /></el-icon>
                格式化
              </el-button>
              <span class="toolbar-tip">支持 cURL、JavaScript、Python、Java、Go、PHP 多种语言</span>
            </div>
            <div class="code-editor-container">
              <MonacoEditor
                v-model="formData.RequestExample"
                language="shell"
                :height="400"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="备注" name="remark">
          <div class="editor-wrapper">
            <RichTextEditor v-model="formData.Remark" placeholder="输入备注信息..." />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, MagicStick } from '@element-plus/icons-vue'
import RichTextEditor from './RichTextEditor.vue'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps({
  visible: Boolean,
  item: Object,
  groups: Array
})

const emit = defineEmits(['update:visible', 'save'])

const activeTab = ref('description')
const formData = ref({
  GroupId: null,
  ApiName: '',
  HttpMethod: 'GET',
  ApiPath: '',
  ApiDescription: '',
  RequestParams: '',
  ResponseParams: '',
  RequestExample: '',
  ResponseExample: '',
  Remark: '',
  SortOrder: 0
})

// 监听item变化，初始化表单
watch(() => props.item, (val) => {
  if (val) {
    formData.value = { ...val }
  } else {
    formData.value = {
      GroupId: null,
      ApiName: '',
      HttpMethod: 'GET',
      ApiPath: '',
      ApiDescription: '',
      RequestParams: '',
      ResponseParams: '',
      RequestExample: '',
      ResponseExample: '',
      Remark: '',
      SortOrder: 0
    }
  }
  activeTab.value = 'description'
}, { immediate: true })

// 插入参数表格模板
const insertParamTable = (type) => {
  const tableHtml = type === 'request' 
    ? `<table class="param-table">
<thead>
<tr><th>参数名</th><th>类型</th><th>必填</th><th>说明</th></tr>
</thead>
<tbody>
<tr><td>param1</td><td>String</td><td>是</td><td>参数说明</td></tr>
<tr><td>param2</td><td>Int</td><td>否</td><td>参数说明</td></tr>
</tbody>
</table>`
    : `<table class="param-table">
<thead>
<tr><th>参数名</th><th>类型</th><th>说明</th></tr>
</thead>
<tbody>
<tr><td>code</td><td>Int</td><td>状态码，0表示成功</td></tr>
<tr><td>msg</td><td>String</td><td>提示信息</td></tr>
<tr><td>data</td><td>Array/Object</td><td>返回数据</td></tr>
</tbody>
</table>`

  if (type === 'request') {
    formData.value.RequestParams = (formData.value.RequestParams || '') + tableHtml
  } else {
    formData.value.ResponseParams = (formData.value.ResponseParams || '') + tableHtml
  }
}

// 格式化JSON
const formatJson = () => {
  try {
    const json = JSON.parse(formData.value.ResponseExample)
    formData.value.ResponseExample = JSON.stringify(json, null, 2)
    ElMessage.success('格式化成功')
  } catch (e) {
    ElMessage.error('JSON格式不正确')
  }
}

// 根据参数名推断示例值
const guessParamValue = (paramName, paramDesc = '') => {
  const name = paramName.toLowerCase()
  const desc = paramDesc.toLowerCase()
  
  // 日期类参数
  if (name.includes('date') || name.includes('time') || desc.includes('日期') || desc.includes('时间')) {
    if (name.includes('start') || name.includes('begin') || desc.includes('开始')) {
      return '2025-01-01 00:00:00'
    }
    if (name.includes('end') || desc.includes('结束')) {
      return '2025-01-31 23:59:59'
    }
    return '2025-01-15 12:00:00'
  }
  
  // 工单号
  if (name.includes('pnum') || name === 'pnum' || desc.includes('工单')) {
    return 'GD25010001'
  }
  
  // 订单号
  if (name.includes('order') || desc.includes('订单')) {
    return 'TJ25010001'
  }
  
  // 客户编码
  if (name.includes('customer') && name.includes('id')) {
    return 'A01'
  }
  
  // 物料编码
  if (name.includes('material') || name.includes('product')) {
    return 'M001'
  }
  
  // 页码
  if (name === 'page' || name === 'pageno' || name === 'pagenum') {
    return '1'
  }
  
  // 每页数量
  if (name === 'pagesize' || name === 'limit' || name === 'size') {
    return '20'
  }
  
  // ID类
  if (name.endsWith('id')) {
    return '1'
  }
  
  // 默认
  return '示例值'
}

// 解析请求参数表格，提取参数名和描述
const parseRequestParams = (paramsHtml) => {
  const params = []
  if (!paramsHtml) return params
  
  // 匹配表格行：<tr><td><code>ParamName</code></td><td>描述</td>...
  // 或者：<tr><td>ParamName</td><td>描述</td>...
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>(?:<code>)?(\w+)(?:<\/code>)?<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>/gi
  let match
  while ((match = rowRegex.exec(paramsHtml)) !== null) {
    const paramName = match[1]
    const paramDesc = match[2] || ''
    // 排除表头
    if (!['参数', '参数名', '参数编码', '名称', '类型', '必填', '说明', '备注'].includes(paramName)) {
      params.push({ name: paramName, desc: paramDesc })
    }
  }
  
  return params
}

// 生成调用示例
const generateRequestExample = () => {
  const method = formData.value.HttpMethod || 'GET'
  const path = formData.value.ApiPath || '/api/xxx'
  const baseUrl = 'http://192.168.1.168:99'
  const apiName = formData.value.ApiName || '接口调用'
  
  // 解析请求参数（包含参数名和描述）
  const params = parseRequestParams(formData.value.RequestParams)
  
  // 生成参数对象（带智能推断的示例值）
  const paramObj = {}
  params.forEach(p => {
    paramObj[p.name] = guessParamValue(p.name, p.desc)
  })
  
  // 构建查询字符串（用于GET请求，不编码以便阅读）
  const queryString = params.map(p => `${p.name}=${paramObj[p.name]}`).join('&')
  // 编码后的查询字符串（用于实际请求）
  const encodedQueryString = params.map(p => `${p.name}=${encodeURIComponent(paramObj[p.name])}`).join('&')
  
  // URL（不带token，token放请求头）
  const baseApiUrl = `${baseUrl}${path}`
  const getUrlWithParams = params.length > 0 ? `${baseApiUrl}?${queryString}` : baseApiUrl
  const getUrlEncoded = params.length > 0 ? `${baseApiUrl}?${encodedQueryString}` : baseApiUrl
  
  // 生成Java参数代码
  const javaParams = params.map(p => `        .add("${p.name}", "${paramObj[p.name]}")`).join('\n')
  
  // 生成Go参数代码
  const goParams = params.map(p => `    q.Add("${p.name}", "${paramObj[p.name]}")`).join('\n')
  
  // 生成PHP参数代码
  const phpParams = params.map(p => `    "${p.name}" => "${paramObj[p.name]}"`).join(',\n')
  
  // 生成示例
  let example = `# ${apiName}
# 基础地址: ${baseUrl}
# 接口路径: ${path}
# 请求方式: ${method}

# ========================================
# 方式一：HTTP 请求
# ========================================
${method} ${getUrlWithParams}
请求头:
    Content-Type: application/json
    access_token: YOUR_TOKEN

# ========================================
# 方式二：cURL 命令行
# ========================================
curl -X ${method} \\
    "${getUrlEncoded}" \\
    -H "Content-Type: application/json" \\
    -H "access_token: YOUR_TOKEN"${method !== 'GET' && params.length > 0 ? ` \\
    -d '${JSON.stringify(paramObj, null, 2)}'` : ''}

# ========================================
# 方式三：JavaScript (fetch)
# ========================================
const baseUrl = "${baseUrl}";
const token = "YOUR_TOKEN";  // 先调用 /client/token 获取

${method === 'GET' ? `// GET请求 - 参数拼接在URL
const params = new URLSearchParams(${JSON.stringify(paramObj)});
const url = \`\${baseUrl}${path}?\${params}\`;

fetch(url, {
    method: "GET",
    headers: {
        "access_token": token
    }
})` : `// ${method}请求 - 参数放body
fetch(\`\${baseUrl}${path}\`, {
    method: "${method}",
    headers: {
        "Content-Type": "application/json",
        "access_token": token
    },
    body: JSON.stringify(${JSON.stringify(paramObj, null, 8).replace(/\n/g, '\n    ')})
})`}
.then(res => res.json())
.then(data => {
    if (data.code === 0) {
        console.log("成功:", data.data);
    } else {
        console.error("失败:", data.msg);
    }
})
.catch(err => console.error("请求错误:", err));

# ========================================
# 方式四：Python (requests)
# ========================================
import requests

base_url = "${baseUrl}"
token = "YOUR_TOKEN"  # 先调用 /client/token 获取
headers = {"access_token": token}

${method === 'GET' ? `# GET请求
params = ${JSON.stringify(paramObj, null, 4)}

response = requests.get(
    f"{base_url}${path}",
    params=params,
    headers=headers
)` : `# ${method}请求
data = ${JSON.stringify(paramObj, null, 4)}

response = requests.${method.toLowerCase()}(
    f"{base_url}${path}",
    json=data,
    headers=headers
)`}

result = response.json()
if result.get("code") == 0:
    print("成功:", result.get("data"))
else:
    print("失败:", result.get("msg"))

# ========================================
# 方式五：Java (OkHttp)
# ========================================
import okhttp3.*;

OkHttpClient client = new OkHttpClient();

${method === 'GET' ? `// GET请求
HttpUrl.Builder urlBuilder = HttpUrl.parse("${baseUrl}${path}").newBuilder()
${javaParams};

Request request = new Request.Builder()
    .url(urlBuilder.build())
    .addHeader("access_token", "YOUR_TOKEN")
    .get()
    .build();` : `// ${method}请求
MediaType JSON = MediaType.parse("application/json; charset=utf-8");
String jsonBody = "${JSON.stringify(paramObj).replace(/"/g, '\\"')}";
RequestBody body = RequestBody.create(jsonBody, JSON);

Request request = new Request.Builder()
    .url("${baseUrl}${path}")
    .addHeader("access_token", "YOUR_TOKEN")
    .${method.toLowerCase()}(body)
    .build();`}

try (Response response = client.newCall(request).execute()) {
    String responseBody = response.body().string();
    System.out.println(responseBody);
}

# ========================================
# 方式六：Go (net/http)
# ========================================
package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
    "net/url"
)

func main() {
    baseUrl := "${baseUrl}${path}"
    
${method === 'GET' ? `    // GET请求 - 构建URL参数
    u, _ := url.Parse(baseUrl)
    q := u.Query()
${goParams}
    u.RawQuery = q.Encode()
    
    req, _ := http.NewRequest("GET", u.String(), nil)` : `    // ${method}请求
    jsonData := \`${JSON.stringify(paramObj)}\`
    req, _ := http.NewRequest("${method}", baseUrl, strings.NewReader(jsonData))
    req.Header.Set("Content-Type", "application/json")`}
    req.Header.Set("access_token", "YOUR_TOKEN")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("请求错误:", err)
        return
    }
    defer resp.Body.Close()
    
    body, _ := ioutil.ReadAll(resp.Body)
    fmt.Println(string(body))
}

# ========================================
# 方式七：PHP (cURL)
# ========================================
<?php
$baseUrl = "${baseUrl}${path}";
$token = "YOUR_TOKEN";  // 先调用 /client/token 获取

${method === 'GET' ? `// GET请求
$params = [
${phpParams}
];
$url = $baseUrl . "?" . http_build_query($params);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "access_token: " . $token
]);` : `// ${method}请求
$data = [
${phpParams}
];

$ch = curl_init($baseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "access_token: " . $token
]);`}

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($result["code"] === 0) {
    echo "成功: " . print_r($result["data"], true);
} else {
    echo "失败: " . $result["msg"];
}
?>
`
  
  formData.value.RequestExample = example
  ElMessage.success('调用示例已生成')
}

// 格式化调用示例
const formatRequestExample = () => {
  // 简单的清理和格式化
  let content = formData.value.RequestExample || ''
  content = content.replace(/\r\n/g, '\n').replace(/\t/g, '  ')
  formData.value.RequestExample = content
  ElMessage.success('格式化成功')
}

// 保存
const handleSave = () => {
  if (!formData.value.GroupId) {
    ElMessage.warning('请选择所属模块')
    return
  }
  if (!formData.value.ApiName) {
    ElMessage.warning('请输入接口名称')
    return
  }
  
  emit('save', { ...formData.value })
}
</script>

<style lang="scss" scoped>
.api-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}

.editor-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }
  
  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
}

.editor-wrapper {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  
  .toolbar-tip {
    color: #909399;
    font-size: 12px;
  }
}

.code-editor-container {
  height: 350px;
}
</style>
