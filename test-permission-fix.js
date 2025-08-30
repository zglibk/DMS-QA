/**
 * 测试权限修复后的效果
 * 验证hasAnyAdminPermission函数是否能正确识别zsx用户的权限
 */
function testPermissionFix() {
    console.log('=== 测试hasAnyAdminPermission函数权限检查逻辑 ===');
    
    // 模拟zsx用户的权限数据（基于之前查询的实际数据）
    const mockMenusData = [
        // 菜单级权限示例
        { name: '首页', path: '/home', Permission: null },
        { name: '质量管理', path: '/quality', Permission: null },
        { name: '数据分析', path: '/analysis', Permission: null },
        { name: '系统设置', path: '/system/settings', Permission: null },
        { name: '用户管理', path: '/admin/users', Permission: null },
        { name: '角色管理', path: '/admin/roles', Permission: null },
        
        // 按钮级权限示例（path为null）
        { name: '新增按钮', path: null, Permission: 'add' },
        { name: '编辑按钮', path: null, Permission: 'edit' },
        { name: '删除按钮', path: null, Permission: 'delete' },
        { name: '导出按钮', path: null, Permission: 'export' },
        { name: '审核按钮', path: null, Permission: 'approve' }
    ];
    
    console.log('\n1. 模拟权限数据:');
    console.log('   总权限数量:', mockMenusData.length);
    
    const menuPermissions = mockMenusData.filter(menu => menu.path !== null);
    const buttonPermissions = mockMenusData.filter(menu => menu.path === null);
    
    console.log('   菜单级权限数量:', menuPermissions.length);
    console.log('   按钮级权限数量:', buttonPermissions.length);
    
    // 2. 测试修复前的逻辑（使用menu.path || menu.Path）
    console.log('\n2. 测试修复前的逻辑（使用 menu.path || menu.Path）:');
    const adminRouteRegex = /^\/admin(\/.*)?$/;
    const systemRouteRegex = /^\/system(\/.*)?$/;
    
    const oldLogicResult = mockMenusData.some(menu => {
        const path = menu.path || menu.Path; // 修复前的逻辑
        return (path && (adminRouteRegex.test(path) || systemRouteRegex.test(path))) || !path;
    });
    
    console.log('   修复前结果:', oldLogicResult);
    
    // 3. 测试修复后的逻辑（只使用menu.path）
    console.log('\n3. 测试修复后的逻辑（只使用 menu.path）:');
    const newLogicResult = mockMenusData.some(menu => {
        const path = menu.path; // 修复后的逻辑
        return (path && (adminRouteRegex.test(path) || systemRouteRegex.test(path))) || !path;
    });
    
    console.log('   修复后结果:', newLogicResult);
        
        // 检查admin路径权限
        const adminRouteRegex = /^\/admin(\/.*)?$/;
        const systemRouteRegex = /^\/system(\/.*)?$/;
        
        const adminMenus = menus.filter(menu => {
            const path = menu.path; // 使用修复后的字段名
            return path && (adminRouteRegex.test(path) || systemRouteRegex.test(path));
        });
        
        // 检查按钮级权限
        const buttonPermissions = menus.filter(menu => {
            const path = menu.path; // 使用修复后的字段名
            return !path; // path为null或undefined的按钮级权限
        });
        
        // 最终权限检查结果
        const hasAdminMenus = adminMenus.length > 0;
        const hasButtonPermissions = buttonPermissions.length > 0;
        const hasAnyAdminPermission = hasAdminMenus || hasButtonPermissions;
        
        console.log('   Admin路径权限数量:', adminMenus.length);
        console.log('   Admin路径权限样本:', adminMenus.slice(0, 3).map(m => ({ name: m.name, path: m.path })));
        console.log('   按钮级权限数量:', buttonPermissions.length);
        console.log('   按钮级权限样本:', buttonPermissions.slice(0, 3).map(m => ({ name: m.name, permission: m.Permission })));
        
        console.log('\n5. 权限检查结果:');
        console.log('   hasAdminMenus:', hasAdminMenus);
        console.log('   hasButtonPermissions:', hasButtonPermissions);
        console.log('   hasAnyAdminPermission:', hasAnyAdminPermission);
        
        if (hasAnyAdminPermission) {
            console.log('\n✅ 权限修复成功！zsx用户应该能看到"登录后台"按钮');
        } else {
            console.log('\n❌ 权限检查仍然失败，需要进一步调试');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

testPermissionFix();