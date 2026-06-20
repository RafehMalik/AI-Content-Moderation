import api from './client'

export const authApi = {
  register: (name, email, password) =>
    api.post('/register', { name, email, password }),

  login: (email, password) =>
    api.post('/login', { email, password })
}
