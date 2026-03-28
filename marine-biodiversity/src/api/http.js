// 后端 API 基础地址
const BASE_URL = 'http://localhost:3001/api'

// 通用请求函数（自动携带登录 token）
async function request(method, path, data = null) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const token = localStorage.getItem('marine_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch {}
  const options = { method, headers }
  if (data) options.body = JSON.stringify(data)
  const res = await fetch(`${BASE_URL}${path}`, options)
  const json = await res.json()
  if (!json.success) throw new Error(json.message || '请求失败')
  return json
}

// ===== 物种 API =====
export const speciesAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/species${q ? '?' + q : ''}`)
  },
  getById: (id) => request('GET', `/species/${id}`),
  create: (data) => request('POST', '/species', data),
  update: (id, data) => request('PUT', `/species/${id}`, data),
  delete: (id) => request('DELETE', `/species/${id}`)
}

// ===== 观测记录 API =====
export const observationsAPI = {
  getAll: () => request('GET', '/observations'),
  getById: (id) => request('GET', `/observations/${id}`),
  create: (data) => request('POST', '/observations', data),
  update: (id, data) => request('PUT', `/observations/${id}`, data),
  delete: (id) => request('DELETE', `/observations/${id}`)
}

// ===== 生态系统 API =====
export const ecosystemsAPI = {
  getAll: () => request('GET', '/ecosystems'),
  create: (data) => request('POST', '/ecosystems', data),
  update: (id, data) => request('PUT', `/ecosystems/${id}`, data),
  delete: (id) => request('DELETE', `/ecosystems/${id}`)
}

// ===== 认证 API =====
export const authAPI = {
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  getUsers: () => request('GET', '/auth/users'),
  getLogs: (params = {}) => request('GET', '/auth/logs' + (params.userId ? `?userId=${params.userId}` : '')),
  createUser: (data) => request('POST', '/auth/users', data),
  updateUser: (id, data) => request('PUT', `/auth/users/${id}`, data),
  toggleStatus: (id, status) => request('PATCH', `/auth/users/${id}/status`, { status })
}
