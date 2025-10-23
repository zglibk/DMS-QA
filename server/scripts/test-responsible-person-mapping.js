/**
 * 测试ResponsiblePerson字段映射到InitiatedBy的功能
 */
const axios = require('axios');

async function testResponsiblePersonMapping() {
  try {
    console.log('测试ResponsiblePerson字段映射功能...\n');

    // 设置认证token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsInJvbGVDb2RlIjoiYWRtaW4iLCJyb2xlcyI6W3siSUQiOjEsIlJvbGVOYW1lIjoi57O757uf566h55CG5ZGYIiwiUm9sZUNvZGUiOiJhZG1pbiJ9XSwiaWF0IjoxNzYxMjE2OTEyLCJleHAiOjE3NjEyMjQxMTJ9.Ar2m6iUQg0nKFvRqMFO7v1GRzg3peMdjTlLWU5Rpu_4';
    const headers = { Authorization: `Bearer ${token}` };

    // 1. 获取一个现有记录
    console.log('1. 获取现有投诉记录...');
    const getResponse = await axios.get('http://localhost:3001/api/supplier-complaints?page=1&size=1');
    
    if (!getResponse.data.success || !getResponse.data.data.list || getResponse.data.data.list.length === 0) {
      console.log('没有找到现有记录，无法进行更新测试');
      return;
    }

    const existingRecord = getResponse.data.data.list[0];
    console.log(`找到记录 ID: ${existingRecord.ID}, 供应商: ${existingRecord.SupplierName}`);

    // 2. 记录更新前的InitiatedBy值
    console.log('\n2. 更新前的InitiatedBy值:');
    console.log(`InitiatedBy: ${existingRecord.InitiatedBy || '空'}`);

    // 3. 测试更新数据（使用ResponsiblePerson字段）
    const updateData = {
      ResponsiblePerson: '测试责任人-张三'
    };

    console.log('\n3. 执行PUT更新（仅更新ResponsiblePerson字段）...');
    console.log('更新数据:', JSON.stringify(updateData, null, 2));
    
    const putResponse = await axios.put(`http://localhost:3001/api/supplier-complaints/${existingRecord.ID}`, updateData, { headers });
    
    if (putResponse.data.success) {
      console.log('PUT请求成功');
      
      // 4. 验证更新后的数据
      console.log('\n4. 验证更新后的数据...');
      const verifyResponse = await axios.get(`http://localhost:3001/api/supplier-complaints/${existingRecord.ID}`);
      
      if (verifyResponse.data.success) {
        const updatedRecord = verifyResponse.data.data;
        console.log('验证成功');
        console.log(`更新后的InitiatedBy: ${updatedRecord.InitiatedBy || '空'}`);
        
        // 检查ResponsiblePerson是否正确映射到InitiatedBy
        if (updatedRecord.InitiatedBy === '测试责任人-张三') {
          console.log('ResponsiblePerson字段映射成功！');
        } else {
          console.log('ResponsiblePerson字段映射失败');
          console.log(`期望值: 测试责任人-张三`);
          console.log(`实际值: ${updatedRecord.InitiatedBy}`);
        }
      } else {
        console.log('验证失败:', verifyResponse.data.message);
      }
    } else {
      console.log('PUT请求失败:', putResponse.data.message);
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('错误详情:', error.response.data.error);
    }
  }
}

testResponsiblePersonMapping();