// 验证真实数据库中的日期范围查询结果

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function verifyRealData() {
  console.log('=== 验证真实数据库查询结果 ===');
  console.log('目标：验证2025-07-01到2025-07-28日期范围查询');
  console.log('预期：总记录数60条，不应包含2025-06-30的数据');
  
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
    
    // 2. 查询2025-07-01到2025-07-28的所有数据
    console.log('\n--- 步骤2：查询完整日期范围数据 ---');
    console.log('查询条件：startDate=2025-07-01, endDate=2025-07-28');
    
    // 获取所有数据（设置较大的pageSize）
    const response = await axios.get(`${BASE_URL}/complaint/list`, {
      params: {
        startDate: '2025-07-01',
        endDate: '2025-07-28',
        page: 1,
        pageSize: 100  // 设置足够大的页面大小以获取所有数据
      },
      headers
    });
    
    console.log('\n查询结果概览:');
    console.log('- 状态码:', response.status);
    console.log('- 总记录数:', response.data.total);
    console.log('- 当前页记录数:', response.data.data.length);
    console.log('- 总页数:', Math.ceil(response.data.total / 100));
    
    // 3. 详细分析所有记录的日期分布
    console.log('\n--- 步骤3：详细日期分析 ---');
    
    const allRecords = [];
    let currentPage = 1;
    let totalPages = Math.ceil(response.data.total / 100);
    
    // 获取所有页面的数据
    while (currentPage <= totalPages) {
      const pageResponse = await axios.get(`${BASE_URL}/complaint/list`, {
        params: {
          startDate: '2025-07-01',
          endDate: '2025-07-28',
          page: currentPage,
          pageSize: 100
        },
        headers
      });
      
      allRecords.push(...pageResponse.data.data);
      currentPage++;
    }
    
    console.log(`已获取所有 ${allRecords.length} 条记录`);
    
    // 按日期分组统计
    const dateStats = {};
    const june30Records = [];
    const julyRecords = [];
    const otherRecords = [];
    
    allRecords.forEach(record => {
      const recordDate = new Date(record.Date);
      const year = recordDate.getFullYear();
      const month = recordDate.getMonth() + 1;
      const day = recordDate.getDate();
      
      const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      if (!dateStats[dateKey]) {
        dateStats[dateKey] = 0;
      }
      dateStats[dateKey]++;
      
      if (year === 2025 && month === 6 && day === 30) {
        june30Records.push(record);
      } else if (year === 2025 && month === 7) {
        julyRecords.push(record);
      } else {
        otherRecords.push(record);
      }
    });
    
    console.log('\n日期分布统计:');
    const sortedDates = Object.keys(dateStats).sort();
    sortedDates.forEach(date => {
      console.log(`- ${date}: ${dateStats[date]}条记录`);
    });
    
    console.log('\n汇总统计:');
    console.log(`- 2025年6月30日记录数: ${june30Records.length}`);
    console.log(`- 2025年7月记录数: ${julyRecords.length}`);
    console.log(`- 其他日期记录数: ${otherRecords.length}`);
    console.log(`- 总记录数: ${allRecords.length}`);
    
    // 4. 验证结果
    console.log('\n--- 步骤4：验证结果 ---');
    
    const totalExpected = 60;
    const totalActual = allRecords.length;
    
    console.log(`预期总记录数: ${totalExpected}`);
    console.log(`实际总记录数: ${totalActual}`);
    
    if (totalActual === totalExpected) {
      console.log('✅ 总记录数验证通过');
    } else {
      console.log('❌ 总记录数验证失败');
    }
    
    if (june30Records.length === 0) {
      console.log('✅ 日期范围验证通过：不包含2025-06-30的数据');
    } else {
      console.log(`❌ 日期范围验证失败：包含${june30Records.length}条2025-06-30的数据`);
      console.log('\n2025-06-30的记录详情:');
      june30Records.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.ID}, Date: ${record.Date}, Customer: ${record.Customer}`);
      });
    }
    
    // 5. 最终结论
    console.log('\n--- 最终结论 ---');
    if (totalActual === totalExpected && june30Records.length === 0) {
      console.log('🎉 验证完全通过！');
      console.log('✅ 总记录数正确：60条');
      console.log('✅ 日期范围正确：不包含边界外数据');
      console.log('✅ 查询逻辑修复成功');
    } else {
      console.log('❌ 验证失败！');
      if (totalActual !== totalExpected) {
        console.log(`- 总记录数不匹配：预期${totalExpected}，实际${totalActual}`);
      }
      if (june30Records.length > 0) {
        console.log(`- 包含不应该出现的2025-06-30数据：${june30Records.length}条`);
      }
    }
    
    // 6. 额外验证：检查7月数据的日期范围
    if (julyRecords.length > 0) {
      console.log('\n--- 额外验证：7月数据日期范围 ---');
      const julyDates = julyRecords.map(record => {
        const date = new Date(record.Date);
        return date.getDate();
      }).sort((a, b) => a - b);
      
      const minDay = Math.min(...julyDates);
      const maxDay = Math.max(...julyDates);
      
      console.log(`7月数据日期范围: ${minDay}日 ~ ${maxDay}日`);
      
      if (minDay >= 1 && maxDay <= 28) {
        console.log('✅ 7月数据日期范围正确');
      } else {
        console.log('❌ 7月数据日期范围异常');
      }
    }
    
    console.log('\n=== 验证完成 ===');
    
  } catch (error) {
    console.error('验证失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行验证
verifyRealData();