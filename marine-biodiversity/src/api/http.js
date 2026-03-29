// 后端 API 基础地址
// 本地开发：http://localhost:3001/api
// 生产部署：通过 VITE_API_BASE_URL 环境变量注入
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

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
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/observations${q ? '?' + q : ''}`)
  },
  getById: (id) => request('GET', `/observations/${id}`),
  create: (data) => request('POST', '/observations', data),
  update: (id, data) => request('PUT', `/observations/${id}`, data),
  delete: (id) => request('DELETE', `/observations/${id}`),
  // 审批相关（科研人员/管理员）
  getPending: () => request('GET', '/observations/pending'),
  getPendingCount: () => request('GET', '/observations/pending/count'),
  approve: (id, remark) => request('POST', `/observations/${id}/approve`, { remark }),
  reject: (id, remark) => request('POST', `/observations/${id}/reject`, { remark })
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
  register: (data) => request('POST', '/auth/register', data),
  getUsers: () => request('GET', '/auth/users'),
  getLogs: (params = {}) => request('GET', '/auth/logs' + (params.userId ? `?userId=${params.userId}` : '')),
  createUser: (data) => request('POST', '/auth/users', data),
  updateUser: (id, data) => request('PUT', `/auth/users/${id}`, data),
  toggleStatus: (id, status) => request('PATCH', `/auth/users/${id}/status`, { status }),
  // 注册申请管理（管理员）
  getApplications: (status) => request('GET', `/auth/applications${status ? '?status=' + status : ''}`),
  approveApplication: (id, remark) => request('POST', `/auth/applications/${id}/approve`, { remark }),
  rejectApplication: (id, remark) => request('POST', `/auth/applications/${id}/reject`, { remark }),
  // 个人信息
  updateProfile: (data) => request('PUT', '/auth/profile', data),
  changePassword: (oldPassword, newPassword) => request('PUT', '/auth/password', { oldPassword, newPassword }),
  uploadAvatar: (avatar) => request('POST', '/auth/upload-avatar', { avatar })
}
