import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../store/auth.js'

describe('用户认证模块 (AuthStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  // TC-AUTH-001: 管理员登录成功
  it('TC-AUTH-001: 管理员使用正确账号密码登录成功', () => {
    const store = useAuthStore()
    const result = store.login('admin', 'admin123')
    expect(result.success).toBe(true)
    expect(result.user.role).toBe('admin')
    expect(result.user.name).toBe('系统管理员')
  })

  // TC-AUTH-002: 错误密码登录失败
  it('TC-AUTH-002: 错误密码登录应返回失败', () => {
    const store = useAuthStore()
    const result = store.login('admin', 'wrongpassword')
    expect(result.success).toBe(false)
    expect(result.message).toBeTruthy()
  })

  // TC-AUTH-003: 不存在用户登录失败
  it('TC-AUTH-003: 不存在的用户名应登录失败', () => {
    const store = useAuthStore()
    const result = store.login('nonexistent', 'password')
    expect(result.success).toBe(false)
  })

  // TC-AUTH-004: 科研人员角色验证
  it('TC-AUTH-004: 科研人员登录后权限判断正确', () => {
    const store = useAuthStore()
    store.login('researcher', 'research123')
    expect(store.isLoggedIn).toBe(true)
    expect(store.canEdit).toBe(true)
    expect(store.isAdmin).toBe(false)
    expect(store.roleName).toBe('科研人员')
  })

  // TC-AUTH-005: 学生角色权限验证
  it('TC-AUTH-005: 学生角色无编辑权限', () => {
    const store = useAuthStore()
    store.login('student', 'student123')
    expect(store.isLoggedIn).toBe(true)
    expect(store.canEdit).toBe(false)
    expect(store.isAdmin).toBe(false)
  })

  // TC-AUTH-006: 登出功能
  it('TC-AUTH-006: 登出后用户状态清除', () => {
    const store = useAuthStore()
    store.login('admin', 'admin123')
    expect(store.isLoggedIn).toBe(true)
    store.logout()
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  // TC-AUTH-007: 密码不回传
  it('TC-AUTH-007: 登录成功用户对象不包含密码字段', () => {
    const store = useAuthStore()
    const result = store.login('admin', 'admin123')
    expect(result.user.password).toBeUndefined()
    expect(store.user.password).toBeUndefined()
  })

  // TC-AUTH-008: localStorage持久化
  it('TC-AUTH-008: 登录后信息持久化到localStorage', () => {
    const store = useAuthStore()
    store.login('admin', 'admin123')
    expect(localStorage.getItem('marine_token')).toBeTruthy()
    expect(localStorage.getItem('marine_user')).toBeTruthy()
  })
})
