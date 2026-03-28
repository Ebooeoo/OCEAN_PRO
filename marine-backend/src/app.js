const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
