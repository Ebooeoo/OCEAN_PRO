/**
 * PostgreSQL 数据库初始化脚本（适用于 Supabase）
 * 在 Koyeb 部署后手动运行一次：node src/db/init.js
 */
const { Pool } = require('pg')
require('dotenv').config()

async function initDB() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  console.log('✅ PostgreSQL 连接成功')

  try {
    // ===== 建表 =====

    // 用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id        SERIAL PRIMARY KEY,
        username  VARCHAR(50) NOT NULL UNIQUE,
        password  VARCHAR(255) NOT NULL,
        role      VARCHAR(20) NOT NULL DEFAULT 'public',
        name      VARCHAR(100),
        email     VARCHAR(100),
        avatar    TEXT,
        status    SMALLINT DEFAULT 1,
        created_at DATE DEFAULT CURRENT_DATE
      )
    `)
    console.log('✅ 表 users 已就绪')

    // 生态系统表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ecosystems (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        type        VARCHAR(50),
        description TEXT,
        area        VARCHAR(200),
        created_at  DATE DEFAULT CURRENT_DATE
      )
    `)
    console.log('✅ 表 ecosystems 已就绪')

    // 物种表
    await client.query(`
      CREATE TABLE IF NOT EXISTS species (
        id                SERIAL PRIMARY KEY,
        chinese_name      VARCHAR(100) NOT NULL,
        latin_name        VARCHAR(200),
        phylum            VARCHAR(100),
        class             VARCHAR(100),
        "order"           VARCHAR(100),
        family            VARCHAR(100),
        genus             VARCHAR(100),
        species           VARCHAR(100),
        morphology        TEXT,
        habits            TEXT,
        distribution      TEXT,
        longitude         DECIMAL(10,6),
        latitude          DECIMAL(10,6),
        protection_level  VARCHAR(50) DEFAULT '无',
        endangered_status VARCHAR(10) DEFAULT 'LC',
        image_url         TEXT,
        video_url         TEXT,
        references_text   TEXT,
        created_by        VARCHAR(100),
        created_at        DATE DEFAULT CURRENT_DATE,
        status            SMALLINT DEFAULT 1
      )
    `)
    console.log('✅ 表 species 已就绪')

    // 观测记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS observations (
        id                SERIAL PRIMARY KEY,
        title             VARCHAR(200) NOT NULL,
        observed_at       TIMESTAMP,
        longitude         DECIMAL(10,6),
        latitude          DECIMAL(10,6),
        ecosystem_id      INT REFERENCES ecosystems(id) ON DELETE SET NULL,
        ecosystem_name    VARCHAR(100),
        observers         VARCHAR(200),
        water_temp        DECIMAL(5,2),
        salinity          DECIMAL(5,2),
        depth             DECIMAL(8,2),
        weather_condition VARCHAR(50),
        notes             TEXT,
        created_by        VARCHAR(100),
        created_at        DATE DEFAULT CURRENT_DATE
      )
    `)
    console.log('✅ 表 observations 已就绪')

    // 观测-物种关联表
    await client.query(`
      CREATE TABLE IF NOT EXISTS observation_species (
        id             SERIAL PRIMARY KEY,
        observation_id INT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
        species_id     INT NOT NULL REFERENCES species(id) ON DELETE CASCADE,
        species_name   VARCHAR(100),
        count          INT DEFAULT 0,
        behavior       VARCHAR(200)
      )
    `)
    console.log('✅ 表 observation_species 已就绪')

    // 用户注册申请表
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_applications (
        id             SERIAL PRIMARY KEY,
        name           VARCHAR(100),
        username       VARCHAR(50) NOT NULL UNIQUE,
        email          VARCHAR(100),
        password       VARCHAR(255) NOT NULL,
        role           VARCHAR(20) NOT NULL DEFAULT 'student',
        status         VARCHAR(20) NOT NULL DEFAULT 'pending',
        apply_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        apply_ip       VARCHAR(50),
        review_remark  VARCHAR(200)
      )
    `)
    console.log('✅ 表 user_applications 已就绪')

    // 活动日志表
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id        SERIAL PRIMARY KEY,
        user_id   INT,
        user_name VARCHAR(100),
        action    VARCHAR(100),
        target    VARCHAR(200),
        time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip        VARCHAR(50)
      )
    `)
    console.log('✅ 表 activity_logs 已就绪')

    // ===== 插入初始数据 =====

    // 用户
    const { rows: userRows } = await client.query('SELECT COUNT(*) AS cnt FROM users')
    if (parseInt(userRows[0].cnt) === 0) {
      await client.query(`
        INSERT INTO users (username, password, role, name, email, status, created_at) VALUES
        ('admin',      'admin123',    'admin',      '系统管理员', 'admin@gdou.edu.cn',  1, '2024-01-01'),
        ('researcher', 'research123', 'researcher', '张教授',     'zhang@gdou.edu.cn',  1, '2024-01-05'),
        ('student',    'student123',  'student',    '赵学生',     'zhao@gdou.edu.cn',   1, '2024-02-01'),
        ('public',     'public123',   'public',     '访客用户',   'guest@example.com',  1, '2024-03-01')
      `)
      console.log('✅ 用户初始数据已插入')
    }

    // 生态系统
    const { rows: ecoRows } = await client.query('SELECT COUNT(*) AS cnt FROM ecosystems')
    if (parseInt(ecoRows[0].cnt) === 0) {
      await client.query(`
        INSERT INTO ecosystems (name, type, description, area, created_at) VALUES
        ('珊瑚礁生态系统', 'coral_reef', '热带和亚热带浅海的珊瑚礁区域，生物多样性极为丰富，被称为"海洋中的热带雨林"。', '南海', '2024-01-01'),
        ('红树林生态系统', 'mangrove',   '热带和亚热带海岸潮间带的红树林区域，是陆地与海洋的过渡地带，具有防风固浪的重要功能。', '广东湛江、雷州半岛', '2024-01-01'),
        ('海草床生态系统', 'seagrass',   '浅海区域的海草草场，是儒艮、海龟等珍稀动物的重要觅食地和栖息地。', '广东沿海浅海区', '2024-01-01'),
        ('深海生态系统',   'deep_sea',   '水深超过200米的深海区域，独特的高压、低温、无光环境孕育了特殊的生命形式。', '南海深水区', '2024-01-01'),
        ('河口生态系统',   'estuary',    '淡水与海水交汇的河口区域，是众多洄游鱼类和鸟类的重要栖息地。', '珠江口、韩江口', '2024-01-01')
      `)
      console.log('✅ 生态系统初始数据已插入')
    }

    // 物种
    const { rows: spRows } = await client.query('SELECT COUNT(*) AS cnt FROM species')
    if (parseInt(spRows[0].cnt) === 0) {
      await client.query(`
        INSERT INTO species (chinese_name, latin_name, phylum, class, "order", family, genus, species, morphology, habits, distribution, longitude, latitude, protection_level, endangered_status, image_url, video_url, references_text, created_by, created_at, status) VALUES
        ('中华白海豚','Sousa chinensis','脊索动物门','哺乳纲','鲸目','海豚科','白海豚属','中华白海豚',
         '体型中等，成体体长2-2.5米。幼豚为深灰色，随年龄增长逐渐变为粉白色。吻部较长，背鳍呈三角形，位于背部中央。',
         '主要栖息于河口和近海浅水区域，以鱼类为主食，常在广东、福建沿海出没。社会性动物，通常以小群体活动。',
         '华南沿海，主要集中在珠江口水域',113.5,22.3,'国家一级','VU',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Chinese_White_Dolphin.jpg/480px-Chinese_White_Dolphin.jpg',
         '','《中国海洋生物名录》2023版','张教授','2024-01-15',1),
        ('绿海龟','Chelonia mydas','脊索动物门','爬行纲','龟目','海龟科','海龟属','绿海龟',
         '背甲呈椭圆形，成体背甲长80-120cm，重量可达100-200kg。背甲呈橄榄绿色至棕色，腹甲黄白色。前肢特化为桨状鳍足。',
         '主要以海草和藻类为食（故名绿海龟）。每年回到出生海滩产卵，一次产卵80-120枚，孵化期约60天。',
         '热带和亚热带海域，广东惠州、汕尾沿海有分布',115.2,22.8,'国家二级','EN',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Green_turtle_swimming_over_coral_reefs_in_Hawaii.jpg/480px-Green_turtle_swimming_over_coral_reefs_in_Hawaii.jpg',
         '','《世界自然保护联盟濒危物种红色名录》','李研究员','2024-02-10',1),
        ('鹦嘴鱼','Scaridae sp.','脊索动物门','辐鳍鱼纲','鲈形目','鹦嘴鱼科','鹦嘴鱼属','鹦嘴鱼',
         '以其鸟喙状的融合齿板著称，体色鲜艳多样，雄性通常比雌性更为艳丽。体长通常30-60cm。',
         '珊瑚礁鱼类，以珊瑚和藻类为食，用喙状牙齿啃食珊瑚，排出的碎屑是热带海滩白沙的主要来源之一。',
         '南海珊瑚礁区域，西沙、南沙群岛均有分布',112.3,16.8,'省级','LC',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Chlorurus_sordidus_1.jpg/480px-Chlorurus_sordidus_1.jpg',
         '','《南海鱼类图谱》','王老师','2024-03-05',1),
        ('珊瑚虫','Anthozoa','刺胞动物门','珊瑚纲','石珊瑚目','鹿角珊瑚科','鹿角珊瑚属','鹿角珊瑚',
         '群体生物，由众多珊瑚虫个体组成。骨骼为碳酸钙质，形态多样，包括分枝状、块状、板状等。',
         '依靠共生藻（虫黄藻）进行光合作用获取营养，同时捕食浮游生物。是珊瑚礁生态系统的核心造礁生物。',
         '南海珊瑚礁区，水温25-29°C的清澈浅海',111.5,17.5,'国际公约','VU',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Coral_reef_at_palmyra.jpg/480px-Coral_reef_at_palmyra.jpg',
         '','《中国珊瑚礁状况报告》2022','陈教授','2024-01-20',1),
        ('马尾藻','Sargassum','褐藻门','褐藻纲','墨角藻目','马尾藻科','马尾藻属','海蒿子',
         '大型褐藻，具有气囊（浮胞）保持漂浮状态，叶状体宽扁，叶缘具锯齿，体长可达数米。',
         '广泛分布于潮间带和亚潮间带，为众多海洋生物提供栖息地和食物来源。',
         '广东沿海各岸段均有分布',114.8,21.5,'无','LC',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Sargassum_brown_algae.jpg/480px-Sargassum_brown_algae.jpg',
         '','《中国海藻志》','赵学生','2024-04-12',1),
        ('布氏鲸','Balaenoptera brydei','脊索动物门','哺乳纲','偶蹄目','须鲸科','须鲸属','布氏鲸',
         '中型须鲸，体长12-15米，背部深灰色，腹部白色。头部有3条平行的纵脊，这是与其他须鲸区别的重要特征。',
         '主要以鱼群、磷虾为食，采用侧身滚转、冲刺等方式捕食。在广东沿海近年多次发现搁浅或活体。',
         '热带和亚热带海域，广东湛江、茂名近海有记录',110.5,21.2,'国家一级','DD',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bryde%27s_whale_%28Balaenoptera_brydei%29.jpg/480px-Bryde%27s_whale_%28Balaenoptera_brydei%29.jpg',
         '','《中国鲸类调查报告》2023','张教授','2024-05-08',1),
        ('红树林螃蟹','Sesarma mederi','节肢动物门','软甲纲','十足目','方蟹科','相手蟹属','无齿相手蟹',
         '甲壳宽约3cm，近方形，暗褐色或棕红色。螯足左右不对称，善攀爬树木。',
         '典型红树林生物，以落叶、有机碎屑为食，是红树林生态系统物质循环的重要参与者。',
         '广东雷州半岛、湛江红树林自然保护区',110.2,20.9,'无','LC',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Sesarma_mederi.jpg/480px-Sesarma_mederi.jpg',
         '','《红树林生态系统研究》','李研究员','2024-03-22',1),
        ('玳瑁','Eretmochelys imbricata','脊索动物门','爬行纲','龟目','海龟科','玳瑁属','玳瑁',
         '背甲呈心形，覆有棕黄色和棕褐色相间的美丽花纹，吻部弯曲如鹰钩，成体背甲长约60-90cm。',
         '主要以海绵为食，也摄食水母、藻类等。喜栖息于珊瑚礁区域，是珊瑚礁生态系统的重要物种。',
         '南海热带水域，西沙群岛有繁殖种群',112.0,16.5,'国家一级','CR',
         'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Hawksbill_turtle_-_Eretmochelys_imbricata.jpg/480px-Hawksbill_turtle_-_Eretmochelys_imbricata.jpg',
         '','CITES附录I物种','陈教授','2024-02-28',1)
      `)
      console.log('✅ 物种初始数据已插入（8条）')
    }

    // 观测记录
    const { rows: obsRows } = await client.query('SELECT COUNT(*) AS cnt FROM observations')
    if (parseInt(obsRows[0].cnt) === 0) {
      const obsResult = await client.query(`
        INSERT INTO observations (title, observed_at, longitude, latitude, ecosystem_id, ecosystem_name, observers, water_temp, salinity, depth, weather_condition, notes, created_by, created_at)
        VALUES
        ('珠江口白海豚种群调查','2024-03-15 09:30:00',113.5,22.3,5,'河口生态系统','张教授, 李研究员',22.5,18.3,5.2,'晴','观测到5只中华白海豚个体，其中包含1只幼豚，群体行为活跃，正在觅食。','张教授','2024-03-15'),
        ('惠州绿海龟产卵监测','2024-06-20 21:00:00',115.2,22.8,1,'珊瑚礁生态系统','李研究员, 王老师',28.1,32.5,0.5,'多云','在后门湾沙滩监测到绿海龟上岸产卵，共记录3个巢穴，每巢约100枚卵。','李研究员','2024-06-20'),
        ('湛江红树林生态调查','2024-04-10 08:00:00',110.2,20.9,2,'红树林生态系统','陈教授, 赵学生',25.3,24.1,1.5,'晴','在湛江红树林国家级自然保护区开展综合生态调查，记录到多种底栖生物和鸟类。','陈教授','2024-04-10'),
        ('西沙群岛珊瑚礁鱼类调查','2024-05-18 10:00:00',112.3,16.8,1,'珊瑚礁生态系统','王老师, 赵学生',29.2,34.8,8.0,'晴','西沙珊瑚礁潜水调查，记录到鱼类30余种，珊瑚覆盖率约65%。','王老师','2024-05-18'),
        ('广东近海布氏鲸监测','2024-07-05 14:30:00',110.5,21.2,4,'深海生态系统','张教授',30.1,33.2,15.0,'晴','在湛江近海发现布氏鲸群体，共3只，正在进行协作觅食行为，拍摄到大量珍贵影像资料。','张教授','2024-07-05')
        RETURNING id
      `)

      // 插入观测-物种关联
      const ids = obsResult.rows.map(r => r.id)
      await client.query(`
        INSERT INTO observation_species (observation_id, species_id, species_name, count, behavior) VALUES
        ($1,1,'中华白海豚',5,'觅食'),
        ($2,2,'绿海龟',3,'产卵'),
        ($3,7,'红树林螃蟹',50,'觅食'),
        ($4,3,'鹦嘴鱼',20,'觅食'),
        ($4,4,'珊瑚虫',500,'固着'),
        ($5,6,'布氏鲸',3,'觅食')
      `, [ids[0], ids[1], ids[2], ids[3], ids[4]])
      console.log('✅ 观测记录初始数据已插入（5条）')
    }

    // 活动日志
    const { rows: logRows } = await client.query('SELECT COUNT(*) AS cnt FROM activity_logs')
    if (parseInt(logRows[0].cnt) === 0) {
      await client.query(`
        INSERT INTO activity_logs (user_id, user_name, action, target, time, ip) VALUES
        (2,'张教授','添加物种','中华白海豚','2024-01-15 10:23:45','192.168.1.100'),
        (2,'张教授','创建观测记录','珠江口白海豚种群调查','2024-03-15 09:35:12','192.168.1.100'),
        (3,'李研究员','添加物种','绿海龟','2024-02-10 14:20:33','192.168.1.102'),
        (1,'系统管理员','用户审批','赵学生','2024-02-01 09:00:00','192.168.1.1')
      `)
      console.log('✅ 活动日志初始数据已插入')
    }

    console.log('\n🎉 PostgreSQL 数据库初始化完成！所有表和初始数据已就绪。')
  } finally {
    client.release()
    await pool.end()
  }
}

initDB().catch(err => {
  console.error('❌ 初始化失败:', err.message)
  process.exit(1)
})
