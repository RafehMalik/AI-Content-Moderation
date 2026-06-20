import api from './client'

export const adminApi = {
  getPolicies: () => api.get('/admin/policies'),

  updatePolicy: (id, enabled, threshold, action) =>
    api.put(`/admin/policies/${id}`, { enabled, threshold, action }),

  overrideVerdict: (id, outcome) =>
    api.patch(`/admin/verdicts/${id}`, { outcome }),

  getAnalytics: () => api.get('/admin/analytics'),

  getUsers: () => api.get('/admin/users')
}
