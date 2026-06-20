// The real axios-based API client is commented out so the frontend can run
// without the backend. Do not remove the original code; it's kept here
// for easy reactivation later.


import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api


// --- Mock API implementation (for frontend testing without backend) ---

// const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// const mockDb = {
//   users: [{ id: 1, name: 'Mock User', email: 'mock@example.com', role: 'admin' }],
//   policies: [
//     { id: 1, name: 'Nudity', enabled: true, threshold: 0.7, action: 'flag' },
//     { id: 2, name: 'Violence', enabled: true, threshold: 0.8, action: 'remove' }
//   ],
//   submissions: [
//     { id: 's1', userId: 1, status: 'processed', outcome: 'allowed', images: [], createdAt: new Date().toISOString() }
//   ],
//   appeals: []
// }

// function response(data, status = 200) {
//   return Promise.resolve({ data, status })
// }

// const api = {
//   get: async (url) => {
//     await wait(50)
//     if (url.startsWith('/admin/policies')) return response({ policies: mockDb.policies })
//     if (url.startsWith('/admin/analytics')) return response({
//       verdicts: { byOutcome: [], byCategory: [] },
//       submissions: { total: mockDb.submissions.length, today: 0, week: 0, timeline: [] },
//       appeals: { total: mockDb.appeals.length, pending: mockDb.appeals.filter((a) => a.status === 'Pending').length, accepted: 0, rejected: 0 },
//       topUsers: { bySubmissions: [], byViolations: [] }
//     })
//     if (url.startsWith('/admin/users')) return response({ users: mockDb.users })
//     if (url.startsWith('/admin/submissions')) return response({ submissions: mockDb.submissions })
//     if (url.startsWith('/submissions/')) {
//       const id = url.split('/').pop()
//       const found = mockDb.submissions.find((s) => s.id === id) || null
//       // return a detail shape expected by admin UI
//       const detail = found ? { ...found, verdicts: [{ id: 'v1', imageUrl: '', outcome: 'Flagged', categoryResults: [{ category: 'Nudity', detected: true }] }] } : null
//       return response(detail)
//     }
//     if (url.startsWith('/submissions')) return response({ submissions: mockDb.submissions })
//     if (url.startsWith('/appeals/my')) return response({ appeals: mockDb.appeals.filter((a) => a.userId === 1) })
//     if (url.startsWith('/admin/appeals')) return response({ appeals: mockDb.appeals })
//     return response({})
//   },

//   post: async (url, data, config = {}) => {
//     // simulate upload progress for multipart/form-data
//     if (config && typeof config.onUploadProgress === 'function') {
//       const total = 100
//       for (let loaded = 10; loaded <= total; loaded += 30) {
//         // small delay between progress ticks
//         // eslint-disable-next-line no-await-in-loop
//         await wait(50)
//         config.onUploadProgress({ loaded, total })
//       }
//     }

//     await wait(100)
//     if (url === '/login') {
//       const user = mockDb.users.find((u) => u.email === data.email) || mockDb.users[0]
//       const token = 'mock-token'
//       localStorage.setItem('token', token)
//       localStorage.setItem('user', JSON.stringify(user))
//       return response({ token, user })
//     }

//     if (url === '/register') {
//       const role = data.email?.includes('admin') ? 'admin' : 'user'
//       const newUser = { id: mockDb.users.length + 1, name: data.name, email: data.email, role }
//       mockDb.users.push(newUser)
//       const token = 'mock-token'
//       localStorage.setItem('token', token)
//       localStorage.setItem('user', JSON.stringify(newUser))
//       return response({ token, user: newUser })
//     }

//     if (url === '/submit') {
//       const newSub = { id: `s${mockDb.submissions.length + 1}`, userId: 1, status: 'processing', images: [], createdAt: new Date().toISOString() }
//       mockDb.submissions.push(newSub)
//       return response(newSub, 201)
//     }

//     if (url === '/appeals') {
//       const id = `a${mockDb.appeals.length + 1}`
//       const appeal = { id, userId: 1, submissionId: data.submissionId, reason: data.reason, status: 'pending' }
//       mockDb.appeals.push(appeal)
//       return response(appeal, 201)
//     }

//     return response({})
//   },

//   put: async (url, data) => {
//     await wait(50)
//     if (url.startsWith('/admin/policies/')) {
//       const id = parseInt(url.split('/').pop(), 10)
//       const p = mockDb.policies.find((x) => x.id === id)
//       if (p) Object.assign(p, data)
//       return response(p || null)
//     }
//     return response({})
//   },

//   patch: async (url, data) => {
//     await wait(50)
//     if (url.startsWith('/admin/verdicts/')) return response({ ok: true })
//     if (url.startsWith('/admin/appeals/')) {
//       const id = url.split('/').pop()
//       const a = mockDb.appeals.find((x) => x.id === id)
//       if (a) Object.assign(a, data)
//       return response(a || null)
//     }
//     return response({})
//   }
// }

// export default api
