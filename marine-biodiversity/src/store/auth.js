import { defineStore } from 'pinia'
import { authAPI } from '../api/http.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('marine_user') || 'null'),
    token: localStorage.getItem('marine_token') || null
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isResearcher: (state) => ['admin', 'researcher'].includes(state.user?.role),
    canEdit: (state) => ['admin', 'researcher'].includes(state.user?.role),
    roleName: (state) => {
      const roleMap = { admin: '管理员', researcher: '科研人员', student: '学生', public: '访客' }
      return roleMap[state.user?.role] || '未知'
    }
  },

  actions: {
    async login(username, password) {
      try {
        const res = await authAPI.login(username, password)
        this.user = res.user
        this.token = res.token
        localStorage.setItem('marine_user', JSON.stringify(res.user))
        localStorage.setItem('marine_token', res.token)
        return { success: true, user: res.user }
      } catch (err) {
        return { success: false, message: err.message || '用户名或密码错误' }
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('marine_user')
      localStorage.removeItem('marine_token')
    }
  }
})
