const jwt = require('jsonwebtoken')
require('dotenv').config()

const JWT_SECRET = process.env.JWT_SECRET || 'marine_gdou_secret_2024'

/**
 * JWT 鉴权中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return res.status(401).json({ success: false, message: '未登录，请先登录' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded  // 将用户信息挂载到 req.user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token 已过期或无效，请重新登录' })
  }
}

/**
 * 角色权限中间件（需先经过 requireAuth）
 * @param {...string} roles - 允许的角色列表
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `权限不足，需要角色: ${roles.join(' 或 ')}` })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
