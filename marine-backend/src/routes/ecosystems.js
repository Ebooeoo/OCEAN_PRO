const express = require('express')
const router = express.Router()
const pool = require('../db/pool')

// GET /api/ecosystems
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ecosystems ORDER BY id ASC')
    const data = rows.map(r => ({
      id: r.id, name: r.name, type: r.type,
      description: r.description, area: r.area,
      createdAt: r.created_at ? String(r.created_at).split('T')[0] : ''
    }))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/ecosystems - 新增生态系统
router.post('/', async (req, res) => {
  try {
    const { name, type, area, description } = req.body
    if (!name) return res.status(400).json({ success: false, message: '名称不能为空' })
    const [result] = await pool.query(
      'INSERT INTO ecosystems (name, type, area, description) VALUES (?, ?, ?, ?)',
      [name, type || '', area || '', description || '']
    )
    const [rows] = await pool.query('SELECT * FROM ecosystems WHERE id = ?', [result.insertId])
    const r = rows[0]
    res.json({ success: true, data: { id: r.id, name: r.name, type: r.type, description: r.description, area: r.area, createdAt: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).slice(0,10)) : '' } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/ecosystems/:id - 编辑生态系统
router.put('/:id', async (req, res) => {
  try {
    const { name, type, area, description } = req.body
    await pool.query('UPDATE ecosystems SET name=?, type=?, area=?, description=? WHERE id=?', [name, type, area, description, req.params.id])
    const [rows] = await pool.query('SELECT * FROM ecosystems WHERE id = ?', [req.params.id])
    const r = rows[0]
    res.json({ success: true, data: { id: r.id, name: r.name, type: r.type, description: r.description, area: r.area, createdAt: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).slice(0,10)) : '' } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/ecosystems/:id - 删除生态系统
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ecosystems WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
