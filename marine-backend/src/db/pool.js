/**
 * 数据库适配层：
 *   - 本地开发：读取 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME → 使用 mysql2
 *   - 生产部署（Koyeb+Supabase）：读取 DATABASE_URL → 使用 pg (PostgreSQL)
 * 对外接口与 mysql2/promise 完全一致，所有路由无需修改
 */
require('dotenv').config()

const usePostgres = !!process.env.DATABASE_URL

// ──────────────────────────────────────────────
// PostgreSQL 模式（生产环境 Supabase）
// ──────────────────────────────────────────────
if (usePostgres) {
  const { Pool } = require('pg')

  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  })

  pgPool.on('error', (err) => {
    console.error('PostgreSQL 连接池错误:', err.message)
  })

  pgPool.connect()
    .then(c => { console.log('✅ PostgreSQL (Supabase) 连接成功'); c.release() })
    .catch(err => console.error('❌ PostgreSQL 连接失败:', err.message))

  function convertSQL(sql, params = []) {
    let newSql = ''
    let newParams = []
    let idx = 1
    let paramIdx = 0

    for (let i = 0; i < sql.length; i++) {
      const inMatch = sql.slice(i).match(/^IN\s*\(\?\)/i)
      if (inMatch) {
        const arr = params[paramIdx]
        if (Array.isArray(arr)) {
          const placeholders = arr.map(() => `$${idx++}`).join(', ')
          newParams.push(...arr)
          newSql += `IN (${placeholders})`
          i += inMatch[0].length - 1
          paramIdx++
        } else {
          newSql += `IN ($${idx++})`
          newParams.push(arr)
          i += inMatch[0].length - 1
          paramIdx++
        }
      } else if (sql[i] === '?') {
        newSql += `$${idx++}`
        newParams.push(params[paramIdx++])
      } else {
        newSql += sql[i]
      }
    }
    return { sql: newSql, params: newParams }
  }

  function normalizeRows(rows) {
    return rows.map(row => {
      const normalized = {}
      for (const key of Object.keys(row)) {
        normalized[key.toLowerCase()] = row[key]
      }
      return normalized
    })
  }

  async function query(sql, params = []) {
    const { sql: pgSql, params: pgParams } = convertSQL(sql, params)
    const result = await pgPool.query(pgSql, pgParams)
    const rows = normalizeRows(result.rows)
    const meta = {
      insertId: rows[0]?.id || null,
      affectedRows: result.rowCount,
      changedRows: result.rowCount,
    }
    return [rows, meta]
  }

  async function getConnection() {
    const client = await pgPool.connect()
    return {
      query: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = convertSQL(sql, params)
        const result = await client.query(pgSql, pgParams)
        const rows = normalizeRows(result.rows)
        const meta = { insertId: rows[0]?.id || null, affectedRows: result.rowCount }
        return [rows, meta]
      },
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    }
  }

  module.exports = { query, getConnection }

} else {
  // ──────────────────────────────────────────────
  // MySQL 模式（本地开发）
  // ──────────────────────────────────────────────
  const mysql = require('mysql2/promise')

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marine_biodiversity',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  })

  pool.getConnection()
    .then(c => { console.log('✅ MySQL 连接成功'); c.release() })
    .catch(err => console.error('❌ MySQL 连接失败:', err.message))

  module.exports = pool
}
