const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001
const pool = require('./db/pool')

// 中间件
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ──── 启动时自动补全数据库字段（兼容老库） ────
async function ensureDbColumns() {
  const alterSQLs = [
    // observations 表：审批字段
    "ALTER TABLE observations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'",
    "ALTER TABLE observations ADD COLUMN IF NOT EXISTS review_remark VARCHAR(200)",
    "ALTER TABLE observations ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100)",
    // species 表：status 字段允许 0=待审批
    // status 原本已存在，只需确保 DEFAULT 兼容即可，不重复添加
  ]
  for (const sql of alterSQLs) {
    try { await pool.query(sql) } catch (e) {
      // MySQL 不支持 IF NOT EXISTS，需要特殊处理
      if (e.message && e.message.includes('Duplicate column')) continue
      // 忽略字段已存在的错误
      if (e.code === 'ER_DUP_FIELDNAME') continue
    }
  }
}

ensureDbColumns().then(() => {
  console.log('✅ 数据库字段检查完成')
}).catch(err => {
  console.warn('⚠️  数据库字段检查跳过:', err.message)
})

// 路由
app.use('/api/species', require('./routes/species'))
app.use('/api/observations', require('./routes/observations'))
app.use('/api/ecosystems', require('./routes/ecosystems'))
app.use('/api/auth', require('./routes/auth'))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `接口不存在: ${req.path}` })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ success: false, message: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 海洋生物后端服务启动成功`)
  console.log(`   端口: ${PORT}`)
  console.log(`   接口: http://localhost:${PORT}/api`)
  console.log(`   健康: http://localhost:${PORT}/api/health\n`)
})

