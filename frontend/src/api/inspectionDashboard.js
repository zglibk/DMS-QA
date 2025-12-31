import api from '@/utils/api'

// Get dashboard summary stats
export function getDashboardSummary() {
    return api.get('/inspection/dashboard/summary')
}

// Get unified task list
// params: { page, pageSize, type, keyword }
export function getDashboardTasks(params) {
    return api.get('/inspection/dashboard/tasks', { params })
}

// Batch audit
// data: { items: [{id, type}], action: 'pass'|'reject', comment }
export function batchAudit(data) {
    return api.post('/inspection/dashboard/audit/batch', data)
}
