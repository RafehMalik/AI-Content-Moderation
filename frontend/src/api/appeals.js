import api from './client'

export const appealApi = {
  create: (submissionId, reason) =>
    api.post('/appeals', { submissionId, reason }),

  getMine: () => api.get('/appeals/my'),

  // Admin
  getAll: (status) =>
    api.get(`/admin/appeals${status ? `?status=${status}` : ''}`),

  review: (id, status, adminResponse) =>
    api.patch(`/admin/appeals/${id}`, { status, adminResponse })
}
