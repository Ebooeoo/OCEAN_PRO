const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { requireAuth, requireRole } = require('../middleware/auth')
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

// ========================================
// POST /api/auth/login
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' })
    }
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND status = 1',
      [username]
    )
    if (!rows.length) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' })
    }
    const user = rows[0]

    // 支持 bcrypt 加密密码和历史明文密码（兼容迁移期）
    let passwordMatch = false
    if (user.password.startsWith('$2')) {
      // bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password)
    } else {
      // 历史明文密码（兼容旧数据），比对后自动升级为 bcrypt
      passwordMatch = (password === user.password)
      if (passwordMatch) {
        const hash = await bcrypt.hash(password, 10)
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id])
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' })
    }

    const safeUser = { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email }
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' })
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(user.id, user.name, '用户登录', `角色：${user.role}`, ip)
    res.json({ success: true, token, user: safeUser })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/auth/register - 用户自助注册申请（需管理员审核）
// ========================================
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
    }
    // 角色只允许 student / public 自助注册
    const allowedRoles = ['student', 'public']
    const applyRole = allowedRoles.includes(role) ? role : 'student'

    // 检查用户名是否已存在（包含待审核的）
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? UNION SELECT id FROM user_applications WHERE username = ?',
      [username, username]
    )
    if (existing.length) {
      return res.status(409).json({ success: false, message: '用户名已被使用或已有待审核申请' })
    }

    const hash = await bcrypt.hash(password, 10)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    const [result] = await pool.query(
      "INSERT INTO user_applications (name, username, email, password, role, status, apply_ip) VALUES (?, ?, ?, ?, ?, 'pending', ?) RETURNING id",
      [name || '', username, email || '', hash, applyRole, formatIp(ip)]
    )
    writeLog(0, username, '提交注册申请', `角色：${applyRole}`, ip)
    res.json({ success: true, message: '注册申请已提交，请等待管理员审核', id: result.insertId })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// GET /api/auth/applications - 获取注册申请列表（仅管理员）
// ========================================
router.get('/applications', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query
    let sql = 'SELECT id, name, username, email, role, status, apply_time, apply_ip, review_remark FROM user_applications'
    const params = []
    if (status) { sql += ' WHERE status = ?'; params.push(status) }
    sql += ' ORDER BY apply_time DESC'
    const [rows] = await pool.query(sql, params)
    res.json({ success: true, data: rows.map(r => ({
      id: r.id, name: r.name, username: r.username, email: r.email,
      role: r.role, status: r.status,
      applyTime: r.apply_time ? String(r.apply_time).replace('T', ' ').slice(0, 19) : '',
      applyIp: r.apply_ip, reviewRemark: r.review_remark || ''
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/auth/applications/:id/approve - 审核通过注册申请（管理员）
// ========================================
router.post('/applications/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { remark } = req.body
    const [apps] = await pool.query("SELECT * FROM user_applications WHERE id = ? AND status = 'pending'", [req.params.id])
    if (!apps.length) return res.status(404).json({ success: false, message: '申请不存在或已处理' })
    const app = apps[0]

    // 创建正式用户
    const [result] = await pool.query(
      'INSERT INTO users (name, username, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_DATE) RETURNING id',
      [app.name, app.username, app.email, app.password, app.role]
    )
    // 更新申请状态
    await pool.query(
      "UPDATE user_applications SET status = 'approved', review_remark = ? WHERE id = ?",
      [remark || '审核通过', req.params.id]
    )
    const operator = getOperator(req)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(operator.id, operator.name, '审核通过注册申请', `${app.username}（${app.role}）`, ip)
    res.json({ success: true, message: '审核通过，用户已创建', userId: result.insertId })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/auth/applications/:id/reject - 拒绝注册申请（管理员）
// ========================================
router.post('/applications/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { remark } = req.body
    const [apps] = await pool.query("SELECT * FROM user_applications WHERE id = ? AND status = 'pending'", [req.params.id])
    if (!apps.length) return res.status(404).json({ success: false, message: '申请不存在或已处理' })
    const app = apps[0]
    await pool.query(
      "UPDATE user_applications SET status = 'rejected', review_remark = ? WHERE id = ?",
      [remark || '审核未通过', req.params.id]
    )
    const operator = getOperator(req)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(operator.id, operator.name, '拒绝注册申请', `${app.username}`, ip)
    res.json({ success: true, message: '已拒绝申请' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// GET /api/auth/logs - 获取活动日志（需登录）
// ========================================
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const userId = req.query.userId
    let sql = 'SELECT id, user_id, user_name, action, target, time, ip FROM activity_logs'
    const params = []
    if (userId) { sql += ' WHERE user_id = ?'; params.push(userId) }
    sql += ' ORDER BY time DESC LIMIT ?'
    params.push(limit)
    const [rows] = await pool.query(sql, params)
    const data = rows.map(r => ({
      id: r.id, userId: r.user_id, userName: r.user_name,
      action: r.action, target: r.target, ip: r.ip,
      time: r.time instanceof Date ? r.time.toISOString().replace('T', ' ').slice(0, 19) : String(r.time).slice(0, 19)
    }))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// GET /api/auth/users - 获取用户列表（仅管理员）
// ========================================
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
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

// ========================================
// POST /api/auth/users - 新增用户（仅管理员）
// ========================================
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, email, role, password } = req.body
    if (!username) return res.status(400).json({ success: false, message: '用户名不能为空' })
    const rawPwd = password || '123456'
    const hash = await bcrypt.hash(rawPwd, 10)
    const [result] = await pool.query(
      'INSERT INTO users (name, username, email, role, password, status) VALUES (?, ?, ?, ?, ?, 1)',
      [name || '', username, email || '', role || 'student', hash]
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

// ========================================
// PUT /api/auth/users/:id - 编辑用户（仅管理员）
// ========================================
router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, email, role } = req.body
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

// ========================================
// PATCH /api/auth/users/:id/status - 切换用户启用/禁用（仅管理员）
// ========================================
router.patch('/users/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
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

// ========================================
// PUT /api/auth/profile - 修改个人信息（需登录）
// ========================================
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { name, email, avatar } = req.body
    await pool.query('UPDATE users SET name=?, email=?, avatar=? WHERE id=?', [name, email, avatar || null, userId])
    const [rows] = await pool.query('SELECT id, username, role, name, email, avatar, status FROM users WHERE id=?', [userId])
    const r = rows[0]
    res.json({ success: true, data: { id: r.id, username: r.username, role: r.role, name: r.name, email: r.email, avatar: r.avatar } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// PUT /api/auth/password - 修改密码（需登录）
// ========================================
router.put('/password', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请填写旧密码和新密码' })
    }
    const [rows] = await pool.query('SELECT password FROM users WHERE id=?', [userId])
    if (!rows.length) return res.status(404).json({ success: false, message: '用户不存在' })
    const user = rows[0]

    let match = false
    if (user.password.startsWith('$2')) {
      match = await bcrypt.compare(oldPassword, user.password)
    } else {
      match = (oldPassword === user.password)
    }
    if (!match) return res.status(400).json({ success: false, message: '旧密码不正确' })

    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password=? WHERE id=?', [hash, userId])
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(userId, req.user.name, '修改密码', '', ip)
    res.json({ success: true, message: '密码修改成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/auth/upload-avatar - 头像上传（Base64，需登录）
// ========================================
router.post('/upload-avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body  // base64 data URL
    if (!avatar) return res.status(400).json({ success: false, message: '头像数据不能为空' })
    // 限制大小：base64后约为原始文件的1.37倍，限制在2MB以内
    if (avatar.length > 2800000) {
      return res.status(400).json({ success: false, message: '头像图片不能超过2MB' })
    }
    await pool.query('UPDATE users SET avatar=? WHERE id=?', [avatar, req.user.id])
    res.json({ success: true, avatar, message: '头像上传成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.writeLog = writeLog
module.exports = router
