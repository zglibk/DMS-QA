const { sql, getDynamicConfig } = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function transferDepartmentUsers() {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    console.log('=== 跟单部门人员转移工具 ===\n');
    
    // 查询跟单部门的人员
    const personResult = await pool.request()
      .query(`
        SELECT p.ID, p.Name as PersonName, d.Name as DepartmentName, d.ID as DepartmentID
        FROM Person p 
        INNER JOIN Department d ON p.DepartmentID = d.ID 
        WHERE d.Name = N'跟单'
      `);
    
    if (personResult.recordset.length === 0) {
      console.log('跟单部门下没有人员，可以直接删除部门。');
      await pool.close();
      rl.close();
      return;
    }
    
    console.log('跟单部门下的人员：');
    personResult.recordset.forEach((person, index) => {
      console.log(`${index + 1}. ${person.PersonName} (ID: ${person.ID})`);
    });
    
    // 查询可转移到的部门
    const deptResult = await pool.request()
      .query(`
        SELECT ID, Name
        FROM Department 
        WHERE Name != N'跟单' AND Status = 1
        ORDER BY Name
      `);
    
    console.log('\n可转移到的部门：');
    deptResult.recordset.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.Name} (ID: ${dept.ID})`);
    });
    
    console.log('\n选择操作：');
    console.log('1. 将所有人员转移到同一个部门');
    console.log('2. 逐个转移人员到不同部门');
    console.log('3. 删除所有人员（谨慎操作）');
    console.log('4. 退出');
    
    const choice = await askQuestion('\n请选择操作 (1-4): ');
    
    switch (choice) {
      case '1':
        await transferAllToSameDepartment(pool, personResult.recordset, deptResult.recordset);
        break;
      case '2':
        await transferIndividually(pool, personResult.recordset, deptResult.recordset);
        break;
      case '3':
        await deleteAllPersons(pool, personResult.recordset);
        break;
      case '4':
        console.log('操作已取消。');
        break;
      default:
        console.log('无效选择。');
    }
    
    await pool.close();
    rl.close();
    
  } catch (error) {
    console.error('操作失败:', error.message);
    rl.close();
  }
}

async function transferAllToSameDepartment(pool, persons, departments) {
  console.log('\n请选择目标部门：');
  departments.forEach((dept, index) => {
    console.log(`${index + 1}. ${dept.Name} (ID: ${dept.ID})`);
  });
  
  const deptChoice = await askQuestion('请输入部门编号: ');
  const deptIndex = parseInt(deptChoice) - 1;
  
  if (deptIndex < 0 || deptIndex >= departments.length) {
    console.log('无效的部门编号。');
    return;
  }
  
  const targetDept = departments[deptIndex];
  const confirm = await askQuestion(`确认将所有 ${persons.length} 个人员转移到 "${targetDept.Name}" 部门吗？(y/n): `);
  
  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    try {
      for (const person of persons) {
        await pool.request()
          .input('personId', sql.Int, person.ID)
          .input('deptId', sql.Int, targetDept.ID)
          .query('UPDATE Person SET DepartmentID = @deptId WHERE ID = @personId');
        
        console.log(`✓ ${person.PersonName} 已转移到 ${targetDept.Name}`);
      }
      console.log(`\n✅ 成功将 ${persons.length} 个人员转移到 "${targetDept.Name}" 部门。`);
      console.log('现在可以删除"跟单"部门了。');
    } catch (error) {
      console.error('转移失败:', error.message);
    }
  } else {
    console.log('操作已取消。');
  }
}

async function transferIndividually(pool, persons, departments) {
  console.log('\n开始逐个转移人员...');
  
  for (const person of persons) {
    console.log(`\n当前人员: ${person.PersonName}`);
    console.log('可选择的部门：');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.Name} (ID: ${dept.ID})`);
    });
    console.log(`${departments.length + 1}. 跳过此人员`);
    
    const choice = await askQuestion('请选择目标部门编号: ');
    const choiceIndex = parseInt(choice) - 1;
    
    if (choiceIndex === departments.length) {
      console.log(`跳过 ${person.PersonName}`);
      continue;
    }
    
    if (choiceIndex < 0 || choiceIndex >= departments.length) {
      console.log('无效选择，跳过此人员。');
      continue;
    }
    
    const targetDept = departments[choiceIndex];
    
    try {
      await pool.request()
        .input('personId', sql.Int, person.ID)
        .input('deptId', sql.Int, targetDept.ID)
        .query('UPDATE Person SET DepartmentID = @deptId WHERE ID = @personId');
      
      console.log(`✓ ${person.PersonName} 已转移到 ${targetDept.Name}`);
    } catch (error) {
      console.error(`转移 ${person.PersonName} 失败:`, error.message);
    }
  }
  
  console.log('\n人员转移完成。请检查是否还有人员留在"跟单"部门。');
}

async function deleteAllPersons(pool, persons) {
  console.log('\n⚠️  警告：此操作将永久删除以下人员：');
  persons.forEach(person => {
    console.log(`- ${person.PersonName}`);
  });
  
  const confirm1 = await askQuestion('\n确认要删除这些人员吗？(yes/no): ');
  if (confirm1.toLowerCase() !== 'yes') {
    console.log('操作已取消。');
    return;
  }
  
  const confirm2 = await askQuestion('再次确认删除操作，输入 "DELETE" 继续: ');
  if (confirm2 !== 'DELETE') {
    console.log('操作已取消。');
    return;
  }
  
  try {
    for (const person of persons) {
      await pool.request()
        .input('personId', sql.Int, person.ID)
        .query('DELETE FROM Person WHERE ID = @personId');
      
      console.log(`✓ 已删除 ${person.PersonName}`);
    }
    console.log(`\n✅ 成功删除 ${persons.length} 个人员。`);
    console.log('现在可以删除"跟单"部门了。');
  } catch (error) {
    console.error('删除失败:', error.message);
  }
}

transferDepartmentUsers();