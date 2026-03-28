const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { writeLog } = require('./auth')



// 工具函数：将数据库字段名转为前端驼峰格式
function toFrontend(row) {
  if (!row) return null
  return {
    id: row.id,
    chineseName: row.chinese_name,
    latinName: row.latin_name,
    phylum: row.phylum,
    class: row.class,
    order: row.order,
    family: row.family,
    genus: row.genus,
    species: row.species,
    morphology: row.morphology,
    habits: row.habits,
    distribution: row.distribution,
    longitude: parseFloat(row.longitude) || null,
    latitude: parseFloat(row.latitude) || null,
    protectionLevel: row.protection_level,
    endangeredStatus: row.endangered_status,
    imageUrl: row.image_url || '',
    videoUrl: row.video_url || '',
    references: row.references_text || '',
    createdBy: row.created_by,
    createdAt: row.created_at ? String(row.created_at).split('T')[0] : '',
    status: row.status
  }
}

// GET /api/species - 获取所有物种（支持搜索过滤）
router.get('/', async (req, res) => {
  try {
    const { name, phylum, protectionLevel, endangeredStatus } = req.query
    let sql = 'SELECT * FROM species WHERE status = 1'
    const params = []

    if (name) {
      sql += ' AND (chinese_name LIKE ? OR latin_name LIKE ?)'
      params.push(`%${name}%`, `%${name}%`)
    }
    if (phylum) { sql += ' AND phylum = ?'; params.push(phylum) }
    if (protectionLevel) { sql += ' AND protection_level = ?'; params.push(protectionLevel) }
    if (endangeredStatus) { sql += ' AND endangered_status = ?'; params.push(endangeredStatus) }

    sql += ' ORDER BY id ASC'
    const [rows] = await pool.query(sql, params)
    res.json({ success: true, data: rows.map(toFrontend) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/species/:id - 获取单条物种
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM species WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: '物种不存在' })
    res.json({ success: true, data: toFrontend(rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/species - 新增物种
router.post('/', async (req, res) => {
  try {
    const d = req.body
    const [result] = await pool.query(`
      INSERT INTO species
        (chinese_name, latin_name, phylum, class, \`order\`, family, genus, species,
         morphology, habits, distribution, longitude, latitude,
         protection_level, endangered_status, image_url, video_url, references_text,
         created_by, created_at, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),1)
    `, [
      d.chineseName, d.latinName, d.phylum, d.class, d.order, d.family, d.genus, d.species,
      d.morphology, d.habits, d.distribution, d.longitude || null, d.latitude || null,
      d.protectionLevel || '无', d.endangeredStatus || 'LC',
      d.imageUrl || '', d.videoUrl || '', d.references || '',
      d.createdBy || '未知'
    ])
    const [rows] = await pool.query('SELECT * FROM species WHERE id = ?', [result.insertId])
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(0, d.createdBy || '未知', '添加物种', d.chineseName || '', ip)
    res.json({ success: true, data: toFrontend(rows[0]), message: '添加成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/species/:id - 更新物种
router.put('/:id', async (req, res) => {
  try {
    const d = req.body
    await pool.query(`
      UPDATE species SET
        chinese_name=?, latin_name=?, phylum=?, class=?, \`order\`=?, family=?, genus=?, species=?,
        morphology=?, habits=?, distribution=?, longitude=?, latitude=?,
        protection_level=?, endangered_status=?, image_url=?, video_url=?, references_text=?
      WHERE id=?
    `, [
      d.chineseName, d.latinName, d.phylum, d.class, d.order, d.family, d.genus, d.species,
      d.morphology, d.habits, d.distribution, d.longitude || null, d.latitude || null,
      d.protectionLevel, d.endangeredStatus, d.imageUrl || '', d.videoUrl || '', d.references || '',
      req.params.id
    ])
    const [rows] = await pool.query('SELECT * FROM species WHERE id = ?', [req.params.id])
    const ip2 = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(0, d.createdBy || '未知', '编辑物种', d.chineseName || `ID:${req.params.id}`, ip2)
    res.json({ success: true, data: toFrontend(rows[0]), message: '更新成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/species/:id - 删除物种（软删除）
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT chinese_name FROM species WHERE id = ?', [req.params.id])
    const name = rows[0]?.chinese_name || `ID:${req.params.id}`
    await pool.query('UPDATE species SET status = 0 WHERE id = ?', [req.params.id])
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    writeLog(0, '操作用户', '删除物种', name, ip)
    res.json({ success: true, message: '删除成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
