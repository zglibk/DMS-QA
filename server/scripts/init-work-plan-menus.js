const sql = require('mssql');
const { getDynamicConfig } = require('../db');

async function initWorkPlanMenus() {
    try {
        const config = await getDynamicConfig();
        const pool = await sql.connect(config);
        
        console.log('开始添加工作计划管理系统菜单...');
        
        // 1. 添加工作计划管理顶级菜单
        let workPlanMenuId;
        const existingMenu = await pool.request()
            .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'work-plan'");
        
        if (existingMenu.recordset.length === 0) {
            const result = await pool.request()
                .query(`INSERT INTO [dbo].[Menus] (
                    [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
                    [Permission], [SortOrder], [Visible], [Status], [Description]
                ) VALUES (
                    'work-plan', N'工作计划', 'menu', 'Calendar', '/admin/work-plan', 
                    'work-plan:view', 50, 1, 1, N'工作计划管理模块，包含计划制定、日志记录、进度跟踪等功能'
                ); SELECT SCOPE_IDENTITY() as ID`);
            workPlanMenuId = result.recordset[0].ID;
            console.log('✅ 工作计划管理顶级菜单添加成功，ID:', workPlanMenuId);
        } else {
            workPlanMenuId = existingMenu.recordset[0].ID;
            console.log('⚠️ 工作计划管理顶级菜单已存在，ID:', workPlanMenuId);
        }
        
        // 2. 添加子菜单
        const subMenus = [
            {
                code: 'work-dashboard',
                name: '工作台',
                icon: 'Monitor',
                path: '/admin/work-plan/dashboard',
                component: 'work-plan/WorkDashboard',
                permission: 'work-plan:dashboard:view',
                sortOrder: 10,
                description: '工作概览、待办事项、进度统计'
            },
            {
                code: 'plan-management',
                name: '计划管理',
                icon: 'FileText',
                path: '/admin/work-plan/plans',
                component: 'work-plan/PlanManagement',
                permission: 'work-plan:plans:view',
                sortOrder: 20,
                description: '工作计划的创建、编辑、删除和查看'
            },
            {
                code: 'work-logs',
                name: '工作日志',
                icon: 'BookOpen',
                path: '/admin/work-plan/logs',
                component: 'work-plan/WorkLogs',
                permission: 'work-plan:logs:view',
                sortOrder: 30,
                description: '日常工作记录和总结'
            },
            {
                code: 'progress-tracking',
                name: '进度跟踪',
                icon: 'TrendingUp',
                path: '/admin/work-plan/progress',
                component: 'work-plan/ProgressTracking',
                permission: 'work-plan:progress:view',
                sortOrder: 40,
                description: '计划执行进度的跟踪和监控'
            },
            {
                code: 'statistics-analysis',
                name: '统计分析',
                icon: 'BarChart3',
                path: '/admin/work-plan/statistics',
                component: 'work-plan/StatisticsAnalysis',
                permission: 'work-plan:statistics:view',
                sortOrder: 50,
                description: '工作效率和完成情况的统计分析'
            },
            {
                code: 'plan-templates',
                name: '计划模板',
                icon: 'Layout',
                path: '/admin/work-plan/templates',
                component: 'work-plan/PlanTemplates',
                permission: 'work-plan:templates:view',
                sortOrder: 60,
                description: '常用计划模板的管理和使用'
            }
        ];
        
        for (const menu of subMenus) {
            const existing = await pool.request()
                .query(`SELECT ID FROM [dbo].[Menus] WHERE MenuCode = '${menu.code}'`);
            
            if (existing.recordset.length === 0) {
                await pool.request()
                    .query(`INSERT INTO [dbo].[Menus] (
                        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
                        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
                    ) VALUES (
                        ${workPlanMenuId}, '${menu.code}', N'${menu.name}', 'menu', '${menu.icon}', '${menu.path}', 
                        '${menu.component}', '${menu.permission}', ${menu.sortOrder}, 1, 1, N'${menu.description}'
                    )`);
                console.log(`✅ ${menu.name}子菜单添加成功`);
            } else {
                console.log(`⚠️ ${menu.name}子菜单已存在`);
            }
        }
        
        // 3. 为管理员角色分配菜单权限
        const adminRole = await pool.request()
            .query("SELECT ID FROM [dbo].[Roles] WHERE RoleName = 'admin' OR RoleName = '管理员'");
        
        if (adminRole.recordset.length > 0) {
            const roleId = adminRole.recordset[0].ID;
            
            // 获取所有工作计划相关菜单
            const workPlanMenus = await pool.request()
                .query(`SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'work-plan' OR ParentID = ${workPlanMenuId}`);
            
            for (const menu of workPlanMenus.recordset) {
                const existingPermission = await pool.request()
                    .query(`SELECT * FROM [dbo].[RoleMenus] WHERE RoleID = ${roleId} AND MenuID = ${menu.ID}`);
                
                if (existingPermission.recordset.length === 0) {
                    await pool.request()
                        .query(`INSERT INTO [dbo].[RoleMenus] (RoleID, MenuID) VALUES (${roleId}, ${menu.ID})`);
                }
            }
            console.log('✅ 管理员角色菜单权限分配成功');
        }
        
        console.log('🎉 工作计划管理系统菜单初始化完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 菜单初始化失败:', error.message);
        process.exit(1);
    }
}

initWorkPlanMenus();