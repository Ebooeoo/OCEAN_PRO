const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { writeLog } = require('./auth')

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
    createdAt: row.created_at ? String(row.created_at).split('T')[0] : ''
  }
}

// GET /api/observations
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM observations ORDER BY id ASC')
    // 批量获取所有关联物种
    const ids = rows.map(r => r.id)
    let spMap = {}
    if (ids.length > 0) {
      const [spRows] = await pool.query(
        'SELECT * FROM observation_species WHERE observation_id IN (?)', [ids]
      )
      spRows.forEach(s => {
        if (!spMap[s.observation_id]) spMap[s.observation_id] = []
        spMap[s.observation_id].push({ speciesId: s.species_id, speciesName: s.species_name, count: s.count, behavior: s.behavior })
      })
    }
    res.json({ success: true, data: rows.map(r => toFrontend(r, spMap[r.id] || [])) })
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

// POST /api/observations
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const d = req.body
    const [result] = await conn.query(`
      INSERT INTO observations
        (title, observed_at, longitude, latitude, ecosystem_id, ecosystem_name,
         observers, water_temp, salinity, depth, weather_condition, notes, created_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE())
    `, [
      d.title, d.observedAt || null, d.longitude || null, d.latitude || null,
      d.ecosystemId || null, d.ecosystemName || '',
      d.observers || '', d.waterTemp || null, d.salinity || null, d.depth || null,
      d.weatherCondition || '', d.notes || '', d.createdBy || '未知'
    ])
    const obsId = result.insertId

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
    writeLog(0, d.createdBy || '未知', '创建观测记录', d.title || '', ip)
    res.json({ success: true, data: toFrontend(rows[0], speciesList), message: '添加成功' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ success: false, message: err.message })
  } finally {
    conn.release()
  }
})

// PUT /api/observations/:id
router.put('/:id', async (req, res) => {
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
    // 重建关联
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
    res.json({ success: true, message: '更新成功' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ success: false, message: err.message })
  } finally {
    conn.release()
  }
})

// DELETE /api/observations/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT title, created_by FROM observations WHERE id = ?', [req.params.id])
    const title = rows[0]?.title || `ID:${req.params.id}`
    const creator = rows[0]?.created_by || '未知'
    await pool.query('DELETE FROM observations WHERE id = ?', [req.params.id])
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(0, creator, '删除观测记录', title, ip)
    res.json({ success: true, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
