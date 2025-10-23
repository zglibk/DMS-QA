/**
 * 使用真实token测试供应商投诉API功能
 * 功能：验证修复后的更新API是否正常工作
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsInJvbGVDb2RlIjoiYWRtaW4iLCJyb2xlcyI6W3siSUQiOjEsIlJvbGVOYW1lIjoi57O757uf566h55CG5ZGYIiwiUm9sZUNvZGUiOiJhZG1pbiJ9XSwiaWF0IjoxNzYxMjA5ODU4LCJleHAiOjE3NjEyMTcwNTh9.kj5bzNy03Olokgn5nRa5-0sLimXL9_boXpJNnzMi1kY';

/**
 * 创建axios实例，包含认证头
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * 测试创建供应商投诉
 */
async function testCreateComplaint() {
  console.log('\n🔍 1. 测试创建供应商投诉...');
  
  try {
    const complaintData = {
      supplierName: '带token测试供应商',
      materialName: '测试材料',
      materialCode: 'TEST001',
      complaintType: '质量问题',
      description: '这是一个使用真实token的测试投诉，用于验证API功能',
      urgencyLevel: '高',
      initiatedBy: '测试用户',
      quantity: 100,
      unitPrice: 10.5,
      purchaseOrderNo: 'PO2025001',
      incomingDate: new Date().toISOString().split('T')[0],
      batchQuantity: 1000,
      inspectionDate: new Date().toISOString().split('T')[0]
    };

    const response = await api.post('/supplier-complaints', complaintData);
    
    console.log('创建响应状态:', response.status);
    console.log('创建响应数据:', response.data);
    
    if (response.data.success && response.data.data.id) {
      console.log('✅ 创建成功，ID:', response.data.data.id);
      return response.data.data.id;
    } else {
      console.log('❌ 创建失败');
      return null;
    }
  } catch (error) {
    console.log('❌ 创建请求失败:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试更新供应商投诉（使用认证）
 */
async function testUpdateComplaint(complaintId) {
  console.log('\n🔍 2. 测试更新供应商投诉（带认证）...');
  
  try {
    const updateData = {
      processStatus: 'processing',
      processResult: '正在处理中，已联系供应商',
      verificationResult: '初步验证完成，问题属实'
    };

    const response = await api.put(`/supplier-complaints/${complaintId}`, updateData);
    
    console.log('更新响应状态:', response.status);
    console.log('更新响应数据:', response.data);
    
    if (response.status === 200) {
      console.log('✅ 更新成功');
      return true;
    } else {
      console.log('❌ 更新失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 更新请求失败:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试获取更新后的记录
 */
async function testGetComplaint(complaintId) {
  console.log('\n🔍 3. 测试获取更新后的记录...');
  
  try {
    const response = await api.get(`/supplier-complaints/${complaintId}`);
    
    console.log('获取响应状态:', response.status);
    console.log('✅ 获取成功');
    console.log('记录详情:', JSON.stringify(response.data.data, null, 2));
    
    return response.data.data;
  } catch (error) {
    console.log('❌ 获取请求失败:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试无认证的更新请求（应该失败）
 */
async function testUpdateWithoutAuth(complaintId) {
  console.log('\n🔍 4. 测试无认证的更新请求（应该返回401）...');
  
  try {
    const updateData = {
      processStatus: 'completed',
      processResult: '无认证测试',
      verificationResult: '这个请求应该被拒绝'
    };

    // 创建无认证的axios实例
    const noAuthApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await noAuthApi.put(`/supplier-complaints/${complaintId}`, updateData);
    
    console.log('❌ 意外成功（应该被拒绝）:', response.status, response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 正确拒绝无认证请求:', error.response.status, error.response.data);
      return true;
    } else {
      console.log('❌ 意外错误:', error.response?.status, error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🎯 开始测试修复后的供应商投诉API功能...');
  console.log('使用token:', TOKEN.substring(0, 50) + '...');
  
  try {
    // 1. 创建投诉
    const complaintId = await testCreateComplaint();
    if (!complaintId) {
      console.log('❌ 创建失败，无法继续测试');
      return;
    }

    // 2. 测试带认证的更新
    const updateSuccess = await testUpdateComplaint(complaintId);
    
    // 3. 获取更新后的记录
    const updatedRecord = await testGetComplaint(complaintId);
    
    // 4. 测试无认证的更新（应该失败）
    const authTestSuccess = await testUpdateWithoutAuth(complaintId);
    
    // 测试总结
    console.log('\n🎯 测试完成');
    console.log('📋 测试总结:');
    console.log(`- 创建功能：${complaintId ? '✅ 正常' : '❌ 失败'}`);
    console.log(`- 认证更新：${updateSuccess ? '✅ 正常' : '❌ 失败'}`);
    console.log(`- 获取记录：${updatedRecord ? '✅ 正常' : '❌ 失败'}`);
    console.log(`- 认证验证：${authTestSuccess ? '✅ 正常' : '❌ 失败'}`);
    
    if (updateSuccess && authTestSuccess) {
      console.log('\n🎉 所有测试通过！API修复成功！');
    } else {
      console.log('\n⚠️ 部分测试失败，需要进一步检查');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTests().catch(console.error);