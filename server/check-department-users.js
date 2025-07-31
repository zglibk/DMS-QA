const { sql, getDynamicConfig } = require('./db');

async function checkDepartmentUsers() {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    console.log('正在检查"跟单"部门下的用户和人员...');
    
    // 查询跟单部门的用户
    const userResult = await pool.request()
      .query(`
        SELECT u.RealName as UserName, u.Username, d.Name as DepartmentName, d.ID as DepartmentID
        FROM [User] u 
        INNER JOIN Department d ON u.DepartmentID = d.ID 
        WHERE d.Name = N'跟单'
      `);
    
    console.log('\n=== 跟单部门下的用户 ===');
    if (userResult.recordset.length > 0) {
      userResult.recordset.forEach(user => {
        console.log(`用户名: ${user.UserName}, 登录名: ${user.Username}, 部门: ${user.DepartmentName} (ID: ${user.DepartmentID})`);
      });
    } else {
      console.log('没有找到用户');
    }
    
    // 查询跟单部门的人员
    const personResult = await pool.request()
      .query(`
        SELECT p.Name as PersonName, d.Name as DepartmentName, d.ID as DepartmentID
        FROM Person p 
        INNER JOIN Department d ON p.DepartmentID = d.ID 
        WHERE d.Name = N'跟单'
      `);
    
    console.log('\n=== 跟单部门下的人员 ===');
    if (personResult.recordset.length > 0) {
      personResult.recordset.forEach(person => {
        console.log(`人员姓名: ${person.PersonName}, 部门: ${person.DepartmentName} (ID: ${person.DepartmentID})`);
      });
    } else {
      console.log('没有找到人员');
    }
    
    // 查询所有部门，显示可以转移到的部门
    const deptResult = await pool.request()
      .query(`
        SELECT ID, Name, ParentID
        FROM Department 
        WHERE Name != N'跟单' AND Status = 1
        ORDER BY Name
      `);
    
    console.log('\n=== 可转移到的其他部门 ===');
    deptResult.recordset.forEach(dept => {
      console.log(`部门ID: ${dept.ID}, 部门名称: ${dept.Name}`);
    });
    
    await pool.close();
    
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

checkDepartmentUsers();