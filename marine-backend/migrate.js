const pool = require('./src/db/pool')

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100),
        password VARCHAR(255) NOT NULL,
        role ENUM('student','public') NOT NULL DEFAULT 'student',
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        apply_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        apply_ip VARCHAR(50),
        review_remark VARCHAR(200)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✅ user_applications 表创建成功')

    // 给 users 表加 avatar 字段（如果不存在）
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'marine_biodiversity' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
    `)
    if (cols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN avatar TEXT AFTER email')
      console.log('✅ users 表已添加 avatar 字段')
    } else {
      console.log('ℹ️  avatar 字段已存在，跳过')
    }

    process.exit(0)
  } catch (e) {
    console.error('❌ 迁移失败:', e.message)
    process.exit(1)
  }
}

migrate()
