const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const JWT_SECRET = process.env.JWT_SECRET || 'marine_gdou_secret_2024'

// ===== 工具函数：写入活动日志 =====
function formatIp(ip) {
  if (!ip) return ''
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (本机)'
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}

async function writeLog(userId, userName, action, target, ip) {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_name, action, target, ip) VALUES (?, ?, ?, ?, ?)',
      [userId || 0, userName || '未知', action, target || '', formatIp(ip)]
    )
  } catch (e) {
    console.error('写日志失败:', e.message)
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' })
    }
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ? AND status = 1',
      [username, password]
    )
    if (!rows.length) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' })
    }
    const user = rows[0]
    const safeUser = { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email }
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' })
    // 记录登录日志
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(user.id, user.name, '用户登录', `角色：${user.role}`, ip)
    res.json({ success: true, token, user: safeUser })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/auth/logs - 获取活动日志（按时间倒序，最近100条）
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const userId = req.query.userId // 可选：按用户过滤
    let sql = 'SELECT id, user_id, user_name, action, target, time, ip FROM activity_logs'
    const params = []
    if (userId) {
      sql += ' WHERE user_id = ?'
      params.push(userId)
    }
    sql += ' ORDER BY time DESC LIMIT ?'
    params.push(limit)
    const [rows] = await pool.query(sql, params)
    const data = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      target: r.target,
      ip: r.ip,
      time: r.time instanceof Date ? r.time.toISOString().replace('T', ' ').slice(0, 19) : String(r.time).slice(0, 19)
    }))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/auth/users - 获取用户列表（仅管理员）
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, name, email, status, created_at FROM users')
    const data = rows.map(r => ({
      id: r.id, username: r.username, role: r.role, name: r.name,
      email: r.email, status: r.status,
      createdAt: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).slice(0, 10)) : ''
    }))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/users - 新增用户
router.post('/users', async (req, res) => {
  try {
    const { name, username, email, role, password } = req.body
    if (!username) return res.status(400).json({ success: false, message: '用户名不能为空' })
    const pwd = password || '123456' // 默认密码
    const [result] = await pool.query(
      'INSERT INTO users (name, username, email, role, password, status) VALUES (?, ?, ?, ?, ?, 1)',
      [name || '', username, email || '', role || 'student', pwd]
    )
    const [rows] = await pool.query('SELECT id, username, role, name, email, status, created_at FROM users WHERE id = ?', [result.insertId])
    const r = rows[0]
    const createdAt = r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).slice(0, 10)) : ''
    const operator = getOperator(req)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(operator.id, operator.name, '新增用户', `${name || username}（${role || 'student'}）`, ip)
    res.json({ success: true, data: { id: r.id, username: r.username, role: r.role, name: r.name, email: r.email, status: r.status, createdAt } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// 从 Authorization header 解析操作者信息
function getOperator(req) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return { id: 0, name: '系统管理员' }
    const decoded = jwt.verify(token, JWT_SECRET)
    return { id: decoded.id || 0, name: decoded.name || decoded.username || '管理员' }
  } catch {
    return { id: 0, name: '系统管理员' }
  }
}

// PUT /api/auth/users/:id - 编辑用户
router.put('/users/:id', async (req, res) => {
  try {
    const { name, username, email, role } = req.body
    // 先查出旧名字，用于日志描述
    const [oldRows] = await pool.query('SELECT name, username FROM users WHERE id=?', [req.params.id])
    const oldName = oldRows[0] ? (oldRows[0].name || oldRows[0].username) : `ID:${req.params.id}`
    await pool.query('UPDATE users SET name=?, username=?, email=?, role=? WHERE id=?', [name, username, email, role, req.params.id])
    const [rows] = await pool.query('SELECT id, username, role, name, email, status, created_at FROM users WHERE id = ?', [req.params.id])
    const r = rows[0]
    const createdAt = r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).slice(0, 10)) : ''
    const operator = getOperator(req)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    const desc = oldName !== (name || username) ? `${oldName} → ${name || username}` : (name || username)
    writeLog(operator.id, operator.name, '编辑用户', desc, ip)
    res.json({ success: true, data: { id: r.id, username: r.username, role: r.role, name: r.name, email: r.email, status: r.status, createdAt } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH /api/auth/users/:id/status - 切换用户启用/禁用
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    await pool.query('UPDATE users SET status=? WHERE id=?', [status, req.params.id])
    const [urows] = await pool.query('SELECT name, username FROM users WHERE id=?', [req.params.id])
    const uname = urows[0] ? (urows[0].name || urows[0].username) : `用户${req.params.id}`
    const operator = getOperator(req)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(operator.id, operator.name, status ? '启用用户' : '禁用用户', uname, ip)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/users 中也修正操作者
router.writeLog = writeLog
module.exports = router
