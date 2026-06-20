import api from './client'

export const submissionApi = {
  submit: (files, onProgress) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    return api.post('/submit', formData, {
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      }
    })
  },

  getMine: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.outcome) params.append('outcome', filters.outcome)
    if (filters.category) params.append('category', filters.category)
    if (filters.from) params.append('from', filters.from)
    if (filters.to) params.append('to', filters.to)
    return api.get(`/submissions?${params.toString()}`)
  },

  getOne: (id) => api.get(`/submissions/${id}`),

  // Admin
  getAllAdmin: () => api.get('/admin/submissions')
}
// import api from './client'

// export const submissionApi = {
//   submit: async (files, onProgress) => {
//     const formData = new FormData()
//     files.forEach((file) => formData.append('images', file))
//     const baseURL = api.defaults?.baseURL || ''
//     const url = `${baseURL}/submit`

//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest()
//       xhr.open('POST', url)

//       const token = localStorage.getItem('token')
//       if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

//       xhr.upload.onprogress = (e) => {
//         if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total))
//       }

//       xhr.onreadystatechange = () => {
//         if (xhr.readyState !== 4) return
//         try {
//           const status = xhr.status
//           const text = xhr.responseText || ''
//           const json = text ? JSON.parse(text) : {}
//           if (status >= 200 && status < 300) {
//             // Resolve with axios-like shape so callers using { data } destructuring keep working
//             resolve({ data: json })
//           } else {
//             const err = new Error(json.error || `Upload failed with status ${status}`)
//             err.response = { data: json, status }
//             reject(err)
//           }
//         } catch (err) {
//           reject(err)
//         }
//       }

//       xhr.onerror = () => reject(new Error('Network error during submission'))
//       xhr.send(formData)
//     })
//   },

//   getMine: (filters = {}) => {
//     const params = new URLSearchParams()
//     if (filters.outcome) params.append('outcome', filters.outcome)
//     if (filters.category) params.append('category', filters.category)
//     if (filters.from) params.append('from', filters.from)
//     if (filters.to) params.append('to', filters.to)
//     return api.get(`/submissions?${params.toString()}`)
//   },

//   getOne: (id) => api.get(`/submissions/${id}`),

//   // Admin
//   getAllAdmin: () => api.get('/admin/submissions')
// }