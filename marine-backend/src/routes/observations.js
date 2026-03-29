const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { writeLog } = require('./auth')
const { requireAuth, requireRole } = require('../middleware/auth')

function toFrontend(row, speciesList = []) {
  return {
    id: row.id,
    title: row.title,
    observedAt: row.observed_at ? String(row.observed_at).replace('T', ' ').substring(0, 16) : '',
    longitude: parseFloat(row.longitude) || null,
    latitude: parseFloat(row.latitude) || null,
    ecosystemId: row.ecosystem_id,
    ecosystemName: row.ecosystem_name,
    observers: row.observers,
    waterTemp: parseFloat(row.water_temp) || null,
    salinity: parseFloat(row.salinity) || null,
    depth: parseFloat(row.depth) || null,
    weatherCondition: row.weather_condition,
    notes: row.notes,
    species: speciesList,
    createdBy: row.created_by,
    createdAt: row.created_at ? String(row.created_at).split('T')[0] : '',
    status: row.status || 'approved',           // approved | pending | rejected
    reviewRemark: row.review_remark || '',
    reviewedBy: row.reviewed_by || ''
  }
}

// ========================================
// GET /api/observations - 支持分页
// 普通用户只看 approved，科研/管理员看全部
// ========================================
router.get('/', async (req, res) => {
  try {
    const { page, pageSize, ecosystem, keyword } = req.query
    // 从 Authorization 中解析角色（可选，无 token 按访客处理）
    let userRole = 'public'
    try {
      const token = req.headers.authorization?.split(' ')[1]
      if (token) {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'marine_gdou_secret_2024')
        userRole = decoded.role || 'public'
      }
    } catch {}

    const canSeeAll = ['admin', 'researcher'].includes(userRole)
    const wheres = []
    const params = []
    const countParams = []

    // 普通用户只看已审批
    if (!canSeeAll) {
      wheres.push("status = 'approved'")
    }
    if (ecosystem) {
      wheres.push('ecosystem_id = ?')
      params.push(ecosystem)
      countParams.push(ecosystem)
    }
    if (keyword) {
      wheres.push('(title LIKE ? OR notes LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
      countParams.push(`%${keyword}%`, `%${keyword}%`)
    }

    let sql = 'SELECT * FROM observations'
    let countSql = 'SELECT COUNT(*) as total FROM observations'
    if (wheres.length) {
      sql += ' WHERE ' + wheres.join(' AND ')
      countSql += ' WHERE ' + wheres.join(' AND ')
    }

    const pg = parseInt(page) || 0
    const ps = parseInt(pageSize) || 0

    if (ps > 0) {
      const offset = pg > 0 ? (pg - 1) * ps : 0
      const [countRows] = await pool.query(countSql, countParams)
      const total = countRows[0].total
      sql += ' ORDER BY id DESC LIMIT ? OFFSET ?'
      params.push(ps, offset)
      const [rows] = await pool.query(sql, params)
      const ids = rows.map(r => r.id)
      let spMap = {}
      if (ids.length > 0) {
        const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id IN (?)', [ids])
        spRows.forEach(s => {
          if (!spMap[s.observation_id]) spMap[s.observation_id] = []
          spMap[s.observation_id].push({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior })
        })
      }
      return res.json({ success: true, data: rows.map(r => toFrontend(r, spMap[r.id] || [])), total, page: pg || 1, pageSize: ps })
    }

    sql += ' ORDER BY id DESC'
    const [rows] = await pool.query(sql, params)
    const ids = rows.map(r => r.id)
    let spMap = {}
    if (ids.length > 0) {
      const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id IN (?)', [ids])
      spRows.forEach(s => {
        if (!spMap[s.observation_id]) spMap[s.observation_id] = []
        spMap[s.observation_id].push({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior })
      })
    }
    res.json({ success: true, data: rows.map(r => toFrontend(r, spMap[r.id] || [])), total: rows.length })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// GET /api/observations/pending/count - 待审批数量（科研/管理员）
// ========================================
router.get('/pending/count', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as total FROM observations WHERE status = 'pending'")
    res.json({ success: true, count: parseInt(rows[0].total) || 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// GET /api/observations/pending - 待审批列表（科研/管理员）
// ========================================
router.get('/pending', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM observations WHERE status = 'pending' ORDER BY id DESC")
    const ids = rows.map(r => r.id)
    let spMap = {}
    if (ids.length > 0) {
      const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id IN (?)', [ids])
      spRows.forEach(s => {
        if (!spMap[s.observation_id]) spMap[s.observation_id] = []
        spMap[s.observation_id].push({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior })
      })
    }
    res.json({ success: true, data: rows.map(r => toFrontend(r, spMap[r.id] || [])), total: rows.length })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/observations/:id/approve - 审批通过（科研/管理员）
// ========================================
router.post('/:id/approve', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const { remark } = req.body
    const reviewedBy = req.user.name || req.user.username
    await pool.query(
      "UPDATE observations SET status = 'approved', review_remark = ?, reviewed_by = ? WHERE id = ?",
      [remark || '审核通过', reviewedBy, req.params.id]
    )
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(req.user.id, reviewedBy, '审批观测记录', `ID:${req.params.id} 通过`, ip)
    res.json({ success: true, message: '审批通过' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/observations/:id/reject - 审批拒绝（科研/管理员）
// ========================================
router.post('/:id/reject', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const { remark } = req.body
    const reviewedBy = req.user.name || req.user.username
    await pool.query(
      "UPDATE observations SET status = 'rejected', review_remark = ?, reviewed_by = ? WHERE id = ?",
      [remark || '审核未通过', reviewedBy, req.params.id]
    )
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(req.user.id, reviewedBy, '审批观测记录', `ID:${req.params.id} 拒绝`, ip)
    res.json({ success: true, message: '已拒绝' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/observations/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM observations WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: '记录不存在' })
    const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id = ?', [req.params.id])
    const speciesList = spRows.map(s => ({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior }))
    res.json({ success: true, data: toFrontend(rows[0], speciesList) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ========================================
// POST /api/observations（需登录，学生/科研/管理员均可提交）
// 学生提交的 status = pending，其他 status = approved
// ========================================
router.post('/', requireAuth, async (req, res) => {
  // 角色检查：公众不能提交
  if (!['admin', 'researcher', 'student'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '权限不足' })
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const d = req.body
    const createdBy = req.user.name || req.user.username
    // 学生强制 pending，不管前端传什么
    const status = req.user.role === 'student' ? 'pending' : 'approved'
    const [result] = await conn.query(`
      INSERT INTO observations
        (title, observed_at, longitude, latitude, ecosystem_id, ecosystem_name,
         observers, water_temp, salinity, depth, weather_condition, notes, created_by, created_at, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_DATE,?)
    `, [
      d.title, d.observedAt || null, d.longitude || null, d.latitude || null,
      d.ecosystemId || null, d.ecosystemName || '',
      d.observers || '', d.waterTemp || null, d.salinity || null, d.depth || null,
      d.weatherCondition || '', d.notes || '', createdBy, status
    ])
    const obsId = result.insertId || (Array.isArray(result) && result[0]?.id)
    if (d.species && d.species.length > 0) {
      for (const sp of d.species) {
        await conn.query(
          'INSERT INTO observation_species (observation_id, species_id, species_name, count, behavior) VALUES (?,?,?,?,?)',
          [obsId, sp.speciesId, sp.speciesName || '', sp.count || 0, sp.behavior || '']
        )
      }
    }
    await conn.commit()
    const [rows] = await pool.query('SELECT * FROM observations WHERE id = ?', [obsId])
    const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id = ?', [obsId])
    const speciesList = spRows.map(s => ({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior }))
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    const action = status === 'pending' ? '提交观测审批' : '创建观测记录'
    writeLog(req.user.id, createdBy, action, d.title || '', ip)
    res.json({ success: true, data: toFrontend(rows[0], speciesList), message: status === 'pending' ? '已提交审批' : '添加成功' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ success: false, message: err.message })
  } finally {
    conn.release()
  }
})

// ========================================
// PUT /api/observations/:id（需登录 + admin/researcher）
// ========================================
router.put('/:id', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const d = req.body
    await conn.query(`
      UPDATE observations SET
        title=?, observed_at=?, longitude=?, latitude=?, ecosystem_id=?, ecosystem_name=?,
        observers=?, water_temp=?, salinity=?, depth=?, weather_condition=?, notes=?
      WHERE id=?
    `, [
      d.title, d.observedAt || null, d.longitude || null, d.latitude || null,
      d.ecosystemId || null, d.ecosystemName || '',
      d.observers || '', d.waterTemp || null, d.salinity || null, d.depth || null,
      d.weatherCondition || '', d.notes || '',
      req.params.id
    ])
    await conn.query('DELETE FROM observation_species WHERE observation_id = ?', [req.params.id])
    if (d.species && d.species.length > 0) {
      for (const sp of d.species) {
        await conn.query(
          'INSERT INTO observation_species (observation_id, species_id, species_name, count, behavior) VALUES (?,?,?,?,?)',
          [req.params.id, sp.speciesId, sp.speciesName || '', sp.count || 0, sp.behavior || '']
        )
      }
    }
    await conn.commit()
    const [rows] = await pool.query('SELECT * FROM observations WHERE id = ?', [req.params.id])
    const [spRows] = await pool.query('SELECT * FROM observation_species WHERE observation_id = ?', [req.params.id])
    const speciesList = spRows.map(s => ({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior }))
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(req.user.id, req.user.name || req.user.username, '编辑观测记录', d.title || `ID:${req.params.id}`, ip)
    res.json({ success: true, data: toFrontend(rows[0], speciesList), message: '更新成功' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ success: false, message: err.message })
  } finally {
    conn.release()
  }
})

// ========================================
// DELETE /api/observations/:id（需登录 + admin/researcher）
// ========================================
router.delete('/:id', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT title, created_by FROM observations WHERE id = ?', [req.params.id])
    const title = rows[0]?.title || `ID:${req.params.id}`
    await pool.query('DELETE FROM observations WHERE id = ?', [req.params.id])
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(req.user.id, req.user.name || req.user.username, '删除观测记录', title, ip)
    res.json({ success: true, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
