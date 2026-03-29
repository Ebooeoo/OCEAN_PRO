# 海洋生物多样性信息管理系统 — 部署手册

> 方案：**Railway（后端 + MySQL）+ Netlify（前端）**，全程免费，约 30 分钟完成

---

## 架构总览

```
用户浏览器
    │
    ├─► Netlify（前端静态页面）  https://your-app.netlify.app
    │       └── npm run build → dist/
    │
    └─► Railway（Node.js 后端）  https://your-backend.railway.app
            └── MySQL 数据库（Railway 插件）
```

---

## 前置准备

- [x] 注册 [Railway](https://railway.app) 账号（GitHub 登录即可）
- [x] 注册 [Netlify](https://netlify.com) 账号（GitHub 登录即可）
- [x] 项目已推送到 GitHub（Gitee 也支持，但需先同步到 GitHub）

---

## 第一步：Railway 部署后端 + 数据库

### 1.1 创建项目

1. 登录 Railway → 点击 **「New Project」**
2. 选择 **「Deploy from GitHub repo」**
3. 授权并选择你的仓库
4. Railway 会扫描到两个目录，选择 **`marine-backend`** 子目录部署

> ⚠️ 如果仓库根目录就是 marine-backend，直接选根目录即可

### 1.2 添加 MySQL 数据库

1. 在 Railway 项目页面点击 **「+ New」→「Database」→「Add MySQL」**
2. 等待数据库创建完成（约1分钟）
3. 点击 MySQL 服务 → 「Variables」Tab，记录以下信息：
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`（默认是 `railway`）

### 1.3 导入数据库

1. 点击 MySQL 服务 → 「Connect」Tab → 找到 **「MySQL Client」** 连接命令
2. 或者使用 TablePlus / DBeaver 连接 Railway MySQL：
   - 主机：`MYSQLHOST` 的值
   - 端口：`MYSQLPORT` 的值
   - 用户名：`MYSQLUSER` 的值
   - 密码：`MYSQLPASSWORD` 的值
   - 数据库：`railway`
3. **导入 SQL 文件**：将 `marine-biodiversity-full-export.sql` 导入到该数据库

   **命令行方式**（推荐）：
   ```bash
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> railway < marine-biodiversity-full-export.sql
   ```

### 1.4 配置后端环境变量

在 Railway 后端服务 → 「Variables」Tab，添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `DB_HOST` | Railway MySQL 的 `MYSQLHOST` 值 |
| `DB_PORT` | Railway MySQL 的 `MYSQLPORT` 值 |
| `DB_USER` | Railway MySQL 的 `MYSQLUSER` 值 |
| `DB_PASSWORD` | Railway MySQL 的 `MYSQLPASSWORD` 值 |
| `DB_NAME` | `railway` |
| `JWT_SECRET` | 随机字符串，例如 `marine_gdou_prod_2026_xK9mN2pQ` |

> 💡 Railway 提供了「Reference Variables」功能，可以直接引用 MySQL 插件的变量，无需手动复制粘贴

### 1.5 获取后端地址

部署完成后，Railway 会分配一个域名，形如：
```
https://marine-backend-production.up.railway.app
```

记下这个地址，第二步会用到。

---

## 第二步：Netlify 部署前端

### 2.1 创建项目

1. 登录 Netlify → 点击 **「Add new site」→「Import an existing project」**
2. 选择 GitHub → 选择你的仓库
3. 配置构建参数：
   - **Base directory**：`marine-biodiversity`
   - **Build command**：`npm run build`
   - **Publish directory**：`marine-biodiversity/dist`

### 2.2 配置前端环境变量

在 Netlify 项目 → 「Site configuration」→「Environment variables」，添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_BASE_URL` | 第一步获取的 Railway 后端地址 + `/api`，例如 `https://marine-backend-production.up.railway.app/api` |

### 2.3 触发重新部署

添加环境变量后，点击 **「Deploys」→「Trigger deploy」→「Deploy site」**

### 2.4 获取前端地址

部署完成后，Netlify 会分配一个地址，形如：
```
https://marine-biodiversity.netlify.app
```

---

## 第三步：验证部署

1. 访问 Netlify 地址，确认页面正常加载
2. 尝试登录（使用你原来的管理员账号）
3. 检查物种列表、观测记录等数据是否正常显示
4. 测试添加/编辑/删除操作是否正常

---

## 常见问题

### ❌ 前端打开白屏 / 刷新404

**原因**：Vue Router 使用 history 模式，Netlify 不认识子路由  
**解决**：已在 `netlify.toml` 配置重定向规则，部署时会自动生效

### ❌ 前端能显示但接口报错 CORS

**原因**：后端 CORS 配置限制了来源  
**解决**：后端 `app.js` 已设置 `cors({ origin: '*' })`，应该没问题；如果仍然报错，检查 Railway 后端是否已启动

### ❌ 数据库连接失败

**检查顺序**：
1. Railway Variables 里 `DB_*` 变量是否都填了
2. `DB_NAME` 是否填的是 `railway`（不是 `marine_biodiversity`）
3. Railway MySQL 服务是否在运行中

### ❌ Railway 免费额度说明

- Railway 免费账户每月 **$5 额度**，后端 + MySQL 日常使用大概消耗 **$1-2/月**
- 学生可以申请 [GitHub Student Pack](https://education.github.com/pack)，包含 Railway $10/月额度

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `marine-biodiversity-full-export.sql` | 完整数据库备份，含所有表结构和现有数据 |
| `marine-backend/railway.json` | Railway 后端部署配置 |
| `marine-backend/.env.example` | 后端环境变量示例 |
| `marine-biodiversity/netlify.toml` | Netlify 前端部署配置（含 SPA 重定向规则）|
| `marine-biodiversity/.env.production.example` | 前端生产环境变量示例 |

---

## 快速备忘

```
后端地址：https://_____________.railway.app
前端地址：https://_____________.netlify.app
数据库：  Railway MySQL（环境变量注入）
```
