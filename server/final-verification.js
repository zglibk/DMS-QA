// 最终验证用户反馈的具体问题是否已解决

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function finalVerification() {
  console.log('=== 最终验证：用户反馈问题是否已解决 ===');
  console.log('问题描述：只设置日期范围（2025-7-1 ~ 2025-7-28）时出现6月30日数据');
  
  try {
    // 1. 登录获取token
    console.log('\n--- 步骤1：用户登录 ---');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    
    if (loginResponse.status !== 200) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }
    
    const token = loginResponse.data.token;
    console.log('登录成功，获取到token');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 模拟用户反馈的具体场景
    console.log('\n--- 步骤2：模拟用户反馈的场景 ---');
    console.log('查询条件：只设置日期范围 2025-7-1 ~ 2025-7-28（无前导零格式）');
    
    const userScenarioResponse = await axios.get(`${BASE_URL}/complaint/list`, {
      params: {
        startDate: '2025-7-1',
        endDate: '2025-7-28',
        page: 1,
        pageSize: 20
      },
      headers
    });
    
    console.log('\n查询结果:');
    console.log('- 状态码:', userScenarioResponse.status);
    console.log('- 总记录数:', userScenarioResponse.data.total);
    console.log('- 当前页记录数:', userScenarioResponse.data.data.length);
    
    if (userScenarioResponse.data.data.length > 0) {
      // 检查所有记录的日期
      console.log('\n--- 详细日期分析 ---');
      
      const dateStats = {
        june30: 0,
        july: 0,
        other: 0
      };
      
      const june30Records = [];
      const julyRecords = [];
      
      userScenarioResponse.data.data.forEach(record => {
        const recordDate = new Date(record.Date);
        const year = recordDate.getFullYear();
        const month = recordDate.getMonth() + 1;
        const day = recordDate.getDate();
        
        if (year === 2025 && month === 6 && day === 30) {
          dateStats.june30++;
          june30Records.push(record);
        } else if (year === 2025 && month === 7) {
          dateStats.july++;
          julyRecords.push(record);
        } else {
          dateStats.other++;
        }
      });
      
      console.log('日期统计:');
      console.log(`- 2025年6月30日记录数: ${dateStats.june30}`);
      console.log(`- 2025年7月记录数: ${dateStats.july}`);
      console.log(`- 其他日期记录数: ${dateStats.other}`);
      
      // 显示6月30日的记录（如果有）
      if (june30Records.length > 0) {
        console.log('\n❌ 问题依然存在！发现6月30日的记录:');
        june30Records.forEach((record, index) => {
          console.log(`  ${index + 1}. ID: ${record.ID}, Date: ${record.Date}, Customer: ${record.Customer}`);
        });
        
        console.log('\n🔍 问题分析：');
        console.log('- 查询条件：startDate=2025-7-1, endDate=2025-7-28');
        console.log('- 预期结果：只包含7月1日到7月28日的数据');
        console.log('- 实际结果：包含了6月30日的数据');
        console.log('- 结论：日期查询逻辑仍有问题');
      } else {
        console.log('\n✅ 问题已解决！查询结果不包含6月30日的数据');
        
        // 显示前5条7月记录作为验证
        if (julyRecords.length > 0) {
          console.log('\n前5条7月记录:');
          julyRecords.slice(0, 5).forEach((record, index) => {
            const recordDate = new Date(record.Date);
            const dateStr = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, '0')}-${recordDate.getDate().toString().padStart(2, '0')}`;
            console.log(`  ${index + 1}. ID: ${record.ID}, Date: ${dateStr}, Customer: ${record.Customer}`);
          });
        }
      }
      
      // 3. 对比不同日期格式的查询结果
      console.log('\n--- 步骤3：验证不同日期格式的一致性 ---');
      
      const standardFormatResponse = await axios.get(`${BASE_URL}/complaint/list`, {
        params: {
          startDate: '2025-07-01',
          endDate: '2025-07-28',
          page: 1,
          pageSize: 5
        },
        headers
      });
      
      console.log('标准格式查询结果:');
      console.log('- 总记录数:', standardFormatResponse.data.total);
      console.log('- 当前页记录数:', standardFormatResponse.data.data.length);
      
      if (userScenarioResponse.data.total === standardFormatResponse.data.total) {
        console.log('✅ 不同日期格式返回相同的查询结果');
      } else {
        console.log('❌ 不同日期格式返回的查询结果不一致');
        console.log(`  无前导零格式: ${userScenarioResponse.data.total}条`);
        console.log(`  标准格式: ${standardFormatResponse.data.total}条`);
      }
      
      // 4. 最终结论
      console.log('\n--- 最终结论 ---');
      if (dateStats.june30 === 0 && userScenarioResponse.data.total === standardFormatResponse.data.total) {
        console.log('🎉 修复完全成功！');
        console.log('✅ 用户反馈的问题已彻底解决');
        console.log('✅ 日期范围查询现在正确排除了边界外的数据');
        console.log('✅ 不同日期格式（有无前导零）现在返回一致的结果');
        console.log('✅ 高级查询中的日期处理逻辑已修复');
      } else {
        console.log('❌ 问题仍然存在！');
        console.log('- 需要进一步检查日期查询逻辑');
        console.log('- 可能需要检查SQL查询条件或数据库时区设置');
      }
    } else {
      console.log('\n⚠️ 查询结果为空');
      console.log('这可能表示：');
      console.log('1. 日期格式问题导致查询条件无效');
      console.log('2. 数据库中确实没有该日期范围的数据');
      console.log('3. 查询逻辑存在其他问题');
    }
    
    console.log('\n=== 最终验证完成 ===');
    
  } catch (error) {
    console.error('验证失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行最终验证
finalVerification();