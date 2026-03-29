/**
 * PostgreSQL 适配层（兼容 mysql2 的 API 风格）
 * 对外接口与原 mysql2/promise 完全一致，所有路由无需修改
 */
const { Pool } = require('pg')
require('dotenv').config()

// Supabase / PostgreSQL 连接池
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
})

pgPool.on('error', (err) => {
  console.error('PostgreSQL 连接池错误:', err.message)
})

/**
 * 将 MySQL 风格的 ? 占位符转换为 PostgreSQL 的 $1, $2, ...
 * 同时处理 IN (?) 的数组展开
 */
function convertSQL(sql, params = []) {
  let newParams = []
  let idx = 1
  let newSql = sql

  // 先处理 IN (?) 数组展开
  newSql = newSql.replace(/IN\s*\(\?\)/gi, (match) => {
    // 找对应参数位置
    const paramIdx = (newSql.slice(0, newSql.indexOf(match)).match(/\?/g) || []).length
    const arr = params[paramIdx]
    if (Array.isArray(arr)) {
      const placeholders = arr.map(() => `$${idx++}`).join(', ')
      newParams.push(...arr)
      return `IN (${placeholders})`
    }
    return match
  })

  // 全量替换（非IN的?）
  newSql = ''
  newParams = []
  idx = 1
  let paramIdx = 0

  for (let i = 0; i < sql.length; i++) {
    // 检测 IN (?)
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

/**
 * 将 PostgreSQL 返回的行数据列名转为小写（兼容字段访问）
 */
function normalizeRows(rows) {
  return rows.map(row => {
    const normalized = {}
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase()] = row[key]
    }
    return normalized
  })
}

/**
 * 模拟 mysql2 的 [rows, fields] 返回格式
 * 同时将 INSERT RETURNING 的 insertId 附加
 */
async function query(sql, params = []) {
  const { sql: pgSql, params: pgParams } = convertSQL(sql, params)
  const result = await pgPool.query(pgSql, pgParams)
  const rows = normalizeRows(result.rows)

  // 模拟 mysql2 返回 [rows, fields]
  // 对于 INSERT，附加 insertId（通过 RETURNING id）
  const meta = {
    insertId: rows[0]?.id || null,
    affectedRows: result.rowCount,
    changedRows: result.rowCount,
  }
  return [rows, meta]
}

/**
 * 模拟 mysql2 的 pool.getConnection() + transaction 支持
 */
async function getConnection() {
  const client = await pgPool.connect()
  return {
    query: async (sql, params = []) => {
      const { sql: pgSql, params: pgParams } = convertSQL(sql, params)
      const result = await client.query(pgSql, pgParams)
      const rows = normalizeRows(result.rows)
      const meta = {
        insertId: rows[0]?.id || null,
        affectedRows: result.rowCount,
      }
      return [rows, meta]
    },
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
  }
}

module.exports = { query, getConnection }
