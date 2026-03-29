-- ============================================================
--  海洋生物多样性信息管理系统 - 数据库初始化脚本
--  广东海洋大学软件综合实践课程
--
--  使用方法：
--    mysql -u root -p < marine-biodiversity-init.sql
--  或在 MySQL Workbench / Navicat 中直接运行本文件
--
--  环境要求：MySQL 8.0+
--  执行后账号密码：
--    admin     / admin123
--    researcher/ researcher123
--    student   / student123
--    public    / public123
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `marine_biodiversity`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `marine_biodiversity`;

-- ============================================================
--  建表（先删旧表，按外键依赖顺序）
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `observation_species`;
DROP TABLE IF EXISTS `observations`;
DROP TABLE IF EXISTS `species`;
DROP TABLE IF EXISTS `ecosystems`;
DROP TABLE IF EXISTS `user_applications`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
--  users
-- ----------------------------
CREATE TABLE `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('admin','researcher','student','public') NOT NULL DEFAULT 'public',
  `name`       VARCHAR(100) DEFAULT NULL,
  `email`      VARCHAR(100) DEFAULT NULL,
  `avatar`     LONGTEXT,
  `status`     TINYINT      DEFAULT '1',
  `created_at` DATE         DEFAULT (CURDATE()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  ecosystems
-- ----------------------------
CREATE TABLE `ecosystems` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `type`        VARCHAR(50)  DEFAULT NULL,
  `description` TEXT,
  `area`        VARCHAR(200) DEFAULT NULL,
  `created_at`  DATE         DEFAULT (CURDATE()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  species
-- ----------------------------
CREATE TABLE `species` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `chinese_name`     VARCHAR(100) NOT NULL,
  `latin_name`       VARCHAR(200) DEFAULT NULL,
  `phylum`           VARCHAR(100) DEFAULT NULL,
  `class`            VARCHAR(100) DEFAULT NULL,
  `order`            VARCHAR(100) DEFAULT NULL,
  `family`           VARCHAR(100) DEFAULT NULL,
  `genus`            VARCHAR(100) DEFAULT NULL,
  `species`          VARCHAR(100) DEFAULT NULL,
  `morphology`       TEXT,
  `habits`           TEXT,
  `distribution`     TEXT,
  `longitude`        DECIMAL(10,6) DEFAULT NULL,
  `latitude`         DECIMAL(10,6) DEFAULT NULL,
  `protection_level` VARCHAR(50)  DEFAULT '无',
  `endangered_status`VARCHAR(10)  DEFAULT 'LC',
  `image_url`        LONGTEXT,
  `video_url`        LONGTEXT,
  `references_text`  TEXT,
  `created_by`       VARCHAR(100) DEFAULT NULL,
  `created_at`       DATE         DEFAULT (CURDATE()),
  `status`           TINYINT      DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  observations
-- ----------------------------
CREATE TABLE `observations` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `title`             VARCHAR(200) NOT NULL,
  `observed_at`       DATETIME     DEFAULT NULL,
  `longitude`         DECIMAL(10,6) DEFAULT NULL,
  `latitude`          DECIMAL(10,6) DEFAULT NULL,
  `ecosystem_id`      INT          DEFAULT NULL,
  `ecosystem_name`    VARCHAR(100) DEFAULT NULL,
  `observers`         VARCHAR(200) DEFAULT NULL,
  `water_temp`        DECIMAL(5,2) DEFAULT NULL,
  `salinity`          DECIMAL(5,2) DEFAULT NULL,
  `depth`             DECIMAL(8,2) DEFAULT NULL,
  `weather_condition` VARCHAR(50)  DEFAULT NULL,
  `notes`             TEXT,
  `created_by`        VARCHAR(100) DEFAULT NULL,
  `created_at`        DATE         DEFAULT (CURDATE()),
  PRIMARY KEY (`id`),
  KEY `ecosystem_id` (`ecosystem_id`),
  CONSTRAINT `observations_ibfk_1`
    FOREIGN KEY (`ecosystem_id`) REFERENCES `ecosystems` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  observation_species（观测-物种关联）
-- ----------------------------
CREATE TABLE `observation_species` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `observation_id` INT          NOT NULL,
  `species_id`     INT          NOT NULL,
  `species_name`   VARCHAR(100) DEFAULT NULL,
  `count`          INT          DEFAULT '0',
  `behavior`       VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `observation_id` (`observation_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `observation_species_ibfk_1`
    FOREIGN KEY (`observation_id`) REFERENCES `observations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `observation_species_ibfk_2`
    FOREIGN KEY (`species_id`) REFERENCES `species` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  activity_logs（操作日志）
-- ----------------------------
CREATE TABLE `activity_logs` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `user_id`   INT          DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `action`    VARCHAR(100) DEFAULT NULL,
  `target`    VARCHAR(200) DEFAULT NULL,
  `time`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `ip`        VARCHAR(50)  DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
--  user_applications（注册申请审核）
-- ----------------------------
CREATE TABLE `user_applications` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(100) DEFAULT NULL,
  `username`       VARCHAR(50)  NOT NULL,
  `email`          VARCHAR(100) DEFAULT NULL,
  `password`       VARCHAR(255) NOT NULL,
  `role`           ENUM('student','public') NOT NULL DEFAULT 'student',
  `status`         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `apply_time`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `apply_ip`       VARCHAR(50)  DEFAULT NULL,
  `review_remark`  VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  数据导入
-- ============================================================

-- ----------------------------
--  users 数据
--  密码均为 bcrypt 哈希，对应明文：
--    admin      → admin123
--    researcher → researcher123
--    student    → student123
--    public     → public123  （此账号密码未哈希，系统登录时自动升级）
-- ----------------------------
INSERT INTO `users` (`id`,`username`,`password`,`role`,`name`,`email`,`avatar`,`status`,`created_at`) VALUES
(1,'admin',   '$2a$10$PCzaIhLU0p1.CswC17tMp.WXLygelFUpNaPSrM38uR32biI7MJMHO','admin',     '系统管理员','admin@gdou.edu.cn',     NULL,1,'2024-01-01'),
(2,'researcher','$2a$10$XLCLUirKzGmvHjkAfeqZs.61DTaaRn1A8j/DodZCfcP.h7WfMWfjO','researcher','张教授',    'zhang@gdou.edu.cn',    NULL,1,'2024-01-05'),
(3,'student', '$2a$10$alhle6zmZKgU7bsW6/dkGOVOSURMiLl0Ht2moLg3QygodtyNWCBcO','student',   '赵学生',    'zhao@gdou.edu.cn',     NULL,1,'2024-02-01'),
(4,'public',  'public123',                                                     'public',    '访客用户',  'guest@example.com',    NULL,1,'2024-03-01');

-- ----------------------------
--  ecosystems 数据
-- ----------------------------
INSERT INTO `ecosystems` (`id`,`name`,`type`,`description`,`area`,`created_at`) VALUES
(1,'珊瑚礁生态系统','coral_reef',
 '热带和亚热带浅海的珊瑚礁区域，生物多样性极为丰富，被称为"海洋中的热带雨林"。',
 '南海','2024-01-01'),
(2,'红树林生态系统','mangrove',
 '热带和亚热带海岸潮间带的红树林区域，是陆地与海洋的过渡地带，具有防风固浪的重要功能。',
 '广东湛江、雷州半岛','2024-01-01'),
(3,'海草床生态系统','seagrass',
 '浅海区域的海草草场，是儒艮、海龟等珍稀动物的重要觅食地和栖息地。',
 '广东沿海浅海区','2024-01-01'),
(4,'深海生态系统','deep_sea',
 '水深超过200米的深海区域，独特的高压、低温、无光环境孕育了特殊的生命形式。',
 '南海深水区','2024-01-01'),
(5,'河口生态系统','estuary',
 '淡水与海水交汇的河口区域，是众多洄游鱼类和鸟类的重要栖息地。',
 '珠江口、韩江口','2024-01-01');

-- ----------------------------
--  species 数据
-- ----------------------------
INSERT INTO `species`
  (`id`,`chinese_name`,`latin_name`,`phylum`,`class`,`order`,`family`,`genus`,`species`,
   `morphology`,`habits`,`distribution`,`longitude`,`latitude`,
   `protection_level`,`endangered_status`,`image_url`,`video_url`,`references_text`,
   `created_by`,`created_at`,`status`)
VALUES
(1,'中华白海豚','Sousa chinensis','脊索动物门','哺乳纲','鲸目','海豚科','白海豚属','中华白海豚',
 '体型中等，成体体长2-2.5米。幼豚为深灰色，随年龄增长逐渐变为粉白色。吻部较长，背鳍呈三角形，位于背部中央。',
 '主要栖息于河口和近海浅水区域，以鱼类为主食，常在广东、福建沿海出没。社会性动物，通常以小群体活动。',
 '华南沿海，主要集中在珠江口水域',113.500000,22.300000,
 '国家一级','VU',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/187872615/medium.jpeg',
 '','《中国海洋生物名录》2023版','张教授','2024-01-15',1),

(2,'绿海龟','Chelonia mydas','脊索动物门','爬行纲','龟目','海龟科','海龟属','绿海龟',
 '背甲呈椭圆形，成体背甲长80-120cm，重量可达100-200kg。背甲呈橄榄绿色至棕色，腹甲黄白色。前肢特化为桨状鳍足。',
 '主要以海草和藻类为食（故名绿海龟）。每年回到出生海滩产卵，一次产卵80-120枚，孵化期约60天。',
 '热带和亚热带海域，广东惠州、汕尾沿海有分布',115.200000,22.500000,
 '国家二级','EN',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/248337518/medium.jpg',
 '','IUCN红色名录2023','张教授','2024-01-20',1),

(3,'鹦嘴鱼','Scarinae spp.','脊索动物门','辐鳍鱼纲','鲈形目','鹦嘴鱼科','鹦嘴鱼属','鹦嘴鱼',
 '体色鲜艳多变，嘴部牙齿愈合形似鸟喙，体长30-120cm不等，不同种差异较大。',
 '珊瑚礁的重要清洁者，用坚硬的喙啃食珊瑚，消化其中的藻类，排出的细沙是珊瑚礁沙滩的重要来源。',
 '南海珊瑚礁区域',110.800000,20.100000,
 '无','LC',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/11294069/medium.jpg',
 '','南海鱼类志','张教授','2024-02-01',1),

(4,'石珊瑚','Scleractinia spp.','刺胞动物门','珊瑚虫纲','石珊瑚目','石珊瑚科','石珊瑚属','石珊瑚',
 '群体生活的腔肠动物，个体称珊瑚虫，直径仅数毫米，但群体可形成巨大的礁盘。骨骼由碳酸钙构成。',
 '与虫黄藻共生，依赖光合作用获取营养。对水温变化极为敏感，水温升高1-2℃可导致白化死亡。',
 '南海、西沙群岛、南沙群岛浅海区',112.300000,16.800000,
 '无','VU',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/4440362/medium.jpg',
 '','珊瑚礁生态系统研究报告2022','张教授','2024-02-10',1),

(5,'马尾藻','Sargassum spp.','褐藻门','褐藻纲','墨角藻目','马尾藻科','马尾藻属','马尾藻',
 '大型褐藻，茎叶状体复杂，具有气囊使藻体漂浮。颜色黄褐色至深褐色，长度可达数米。',
 '固着或漂浮生活，是许多鱼类和无脊椎动物的重要栖息地和食物来源，也是重要的经济藻类。',
 '南海及广东沿海浅水区',114.100000,21.600000,
 '无','LC',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/20415351/medium.jpeg',
 '','中国海藻志','张教授','2024-02-15',1),

(6,'布氏鲸','Balaenoptera brydei','脊索动物门','哺乳纲','鲸目','须鲸科','须鲸属','布氏鲸',
 '中型须鲸，体长12-14米，体重约20吨。体色背部深灰色，腹部白色或浅灰色，头顶有3条隆起。',
 '滤食性，主要以小型鱼类（沙丁鱼、鯷鱼等）为食，常在南海近岸水域出没，偶有搁浅记录。',
 '南海及东海，广东茂名、阳江沿海有目击记录',110.900000,21.800000,
 '国家一级','EN',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/361046934/medium.jpg',
 '','《广东省海洋哺乳动物调查报告》2021','张教授','2024-02-20',1),

(7,'红树林招潮蟹','Uca spp.','节肢动物门','甲壳纲','十足目','沙蟹科','招潮蟹属','招潮蟹',
 '小型螃蟹，雄性一只螯大一只螯小，大螯可占体重一半以上，颜色鲜艳。体宽约2-3cm。',
 '栖息于红树林潮间带泥滩，挖洞穴居，退潮时出来觅食有机碎屑，涨潮时躲入洞穴。',
 '广东湛江、珠海、惠州红树林区',110.350000,21.200000,
 '无','LC',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/71938950/medium.jpg',
 '','红树林生态系统研究','张教授','2024-03-01',1),

(8,'玳瑁','Eretmochelys imbricata','脊索动物门','爬行纲','龟目','海龟科','玳瑁属','玳瑁',
 '体型较小的海龟，背甲长约60-90cm，背甲鳞片呈叠瓦状排列，花纹美丽，颜色金黄色至棕色。嘴尖如鹰喙。',
 '主要以海绵为食，也食珊瑚礁中的软体动物、水母等。是唯一能消化硅质海绵的海洋动物。',
 '热带珊瑚礁区，南海诸岛及广东、海南沿海',109.700000,18.200000,
 '国家一级','CR',
 'https://inaturalist-open-data.s3.amazonaws.com/photos/9696846/medium.jpg',
 '','CITES附录I物种名录','张教授','2024-03-10',1);

-- ----------------------------
--  observations 数据
-- ----------------------------
INSERT INTO `observations`
  (`id`,`title`,`observed_at`,`longitude`,`latitude`,`ecosystem_id`,`ecosystem_name`,
   `observers`,`water_temp`,`salinity`,`depth`,`weather_condition`,`notes`,
   `created_by`,`created_at`)
VALUES
(1,'珠江口白海豚群体观测','2024-03-10 09:30:00',
 113.5000,22.3000,5,'河口生态系统',
 '张教授,李研究员',24.50,28.50,5.00,'晴','观测到约8头白海豚群体，其中2头幼豚，行为活跃，在船只附近跃出水面。',
 'researcher','2024-03-10'),

(2,'惠州海龟产卵调查','2024-06-20 20:00:00',
 114.7000,22.6000,3,'海草床生态系统',
 '张教授,志愿者团队',29.00,33.00,1.00,'晴','记录到3只绿海龟上岸产卵，产卵量估计约100枚，巢穴位置已标记保护。',
 'researcher','2024-06-20'),

(3,'南海珊瑚礁鱼类多样性调查','2024-04-15 08:00:00',
 110.8000,20.1000,1,'珊瑚礁生态系统',
 '张教授,赵学生,钱研究员',27.50,35.00,15.00,'晴','珊瑚覆盖率约65%，记录到鹦嘴鱼12条，珊瑚礁生态状况良好，发现珊瑚新生区域。',
 'researcher','2024-04-15'),

(4,'湛江红树林生态调查','2024-05-22 07:30:00',
 110.3500,21.2000,2,'红树林生态系统',
 '张教授,李研究员,赵学生',26.00,25.00,0.50,'多云','红树林区域招潮蟹种群密度较高，发现多个新洞穴群落，鸟类多样性丰富。',
 'researcher','2024-05-22'),

(5,'南海布氏鲸目击记录','2024-08-03 14:00:00',
 110.9000,21.8000,4,'深海生态系统',
 '张教授',28.00,34.50,50.00,'晴','在深水区域目击1头布氏鲸，正在追逐鱼群觅食，行为活跃，观测约45分钟后向南游去。',
 'researcher','2024-08-03');

-- ----------------------------
--  observation_species 数据
-- ----------------------------
INSERT INTO `observation_species` (`id`,`observation_id`,`species_id`,`species_name`,`count`,`behavior`) VALUES
(1,1,1,'中华白海豚',8,'跃水、追逐、与幼豚互动，在船只附近游弋'),
(2,2,2,'绿海龟',  3,'上岸产卵，行动缓慢，完成产卵后返回海中'),
(3,3,3,'鹦嘴鱼',  12,'在珊瑚间觅食，啃食藻类覆盖的珊瑚石'),
(4,3,4,'石珊瑚',  0,'群体生长，覆盖率约65%，发现新生珊瑚群落'),
(5,4,7,'红树林招潮蟹',200,'退潮觅食，挥舞大螯求偶，部分正在修整洞穴'),
(6,5,6,'布氏鲸',  1,'水面追逐鱼群，多次露背换气，未见跃身击浪');

-- ----------------------------
--  activity_logs 数据
-- ----------------------------
INSERT INTO `activity_logs` (`id`,`user_id`,`user_name`,`action`,`target`,`time`,`ip`) VALUES
(1,1,'系统管理员','系统初始化','数据库初始化完成','2024-01-01 08:00:00','127.0.0.1'),
(2,2,'张教授',    '添加物种','中华白海豚',        '2024-03-15 09:35:12','192.168.1.100'),
(3,2,'张教授',    '添加物种','绿海龟',            '2024-02-10 14:20:33','192.168.1.100'),
(4,1,'系统管理员','用户审批','赵学生',            '2024-02-01 09:00:00','192.168.1.1');

-- user_applications 无历史数据，保持为空


-- ============================================================
--  AUTO_INCREMENT 修正（避免新数据与现有ID冲突）
-- ============================================================
ALTER TABLE `users`              AUTO_INCREMENT = 5;
ALTER TABLE `ecosystems`         AUTO_INCREMENT = 6;
ALTER TABLE `species`            AUTO_INCREMENT = 9;
ALTER TABLE `observations`       AUTO_INCREMENT = 6;
ALTER TABLE `observation_species`AUTO_INCREMENT = 7;
ALTER TABLE `activity_logs`      AUTO_INCREMENT = 20;

-- ============================================================
--  完成提示
-- ============================================================
SELECT '✅ marine_biodiversity 数据库初始化完成！' AS status;
SELECT CONCAT('  - 用户数: ', COUNT(*)) AS info FROM users
UNION ALL
SELECT CONCAT('  - 物种数: ', COUNT(*)) FROM species
UNION ALL
SELECT CONCAT('  - 生态系统数: ', COUNT(*)) FROM ecosystems
UNION ALL
SELECT CONCAT('  - 观测记录数: ', COUNT(*)) FROM observations
UNION ALL
SELECT CONCAT('  - 观测-物种关联数: ', COUNT(*)) FROM observation_species;
