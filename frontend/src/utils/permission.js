import { useUserStore } from '@/store/user'

/**
 * Check if current user has audit permission for performance reports
 * @param {Object} report The report object (must contain CreatedBy and Status)
 * @returns {Boolean}
 */
export const checkPerformanceAuditPermission = (report) => {
    const userStore = useUserStore()
    if (!report) return false
    
    // 1. Basic Status Check
    if (report.Status !== 'Submitted') return false
    
    // 2. Creator Check (Cannot audit own report unless admin?)
    // Usually creator cannot audit own report to ensure segregation of duties
    const isCreator = report.CreatedBy === userStore.user.username
    if (isCreator && !userStore.isAdmin) return false

    // 3. Permission Check
    // Admin always has permission
    if (userStore.isAdmin) return true

    // Check specific permission
    const hasAuditPerm = userStore.hasPermission('quality:performance:audit')
    
    // Check Leader Role/Position (Optional, based on requirement "具备权限管理赋予的审核权限（如岗位）")
    // If hasAuditPerm is true, it means the role/position already granted this permission.
    // So we mainly rely on hasAuditPerm.
    
    return hasAuditPerm
}

/**
 * Check if current user can edit performance report
 */
export const checkPerformanceEditPermission = (report) => {
    const userStore = useUserStore()
    if (!report) return false
    
    const isCreator = report.CreatedBy === userStore.user.username
    // Only creator can edit when Draft or Rejected
    // Admin might be able to edit? Usually no, admin audits.
    return (report.Status === 'Draft' || report.Status === 'Rejected') && isCreator
}