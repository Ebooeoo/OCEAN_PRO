<template>
  <div class="login-page">
    <!-- 背景动画 -->
    <div class="ocean-bg">
      <div class="wave wave1"></div>
      <div class="wave wave2"></div>
      <div class="wave wave3"></div>
    </div>
    
    <!-- 登录/注册卡片 -->
    <div class="login-container">
      <div class="login-header">
        <div class="logo-icon">🐬</div>
        <h1>海洋生物多样性信息管理系统</h1>
        <p>广东海洋大学 · Marine Biodiversity Information System</p>
      </div>

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" class="login-tabs">
        <!-- 登录 Tab -->
        <el-tab-pane label="登 录" name="login">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large"
                :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-button type="primary" size="large" class="login-btn" :loading="loginLoading" @click="handleLogin">
              登 录
            </el-button>
          </el-form>

          <!-- 演示账号 -->
          <div class="demo-accounts">
            <div class="demo-title">演示账号（点击快速登录）</div>
            <div class="demo-list">
              <div v-for="account in demoAccounts" :key="account.role" class="demo-item" @click="quickLogin(account)">
                <el-tag :type="account.tagType" size="small">{{ account.roleLabel }}</el-tag>
                <span class="demo-info">{{ account.username }} / {{ account.password }}</span>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 注册申请 Tab -->
        <el-tab-pane label="注册申请" name="register">
          <div class="register-tip">
            <el-alert type="info" :closable="false" show-icon>
              学生和访客可提交注册申请，等待管理员审核后即可使用系统。
            </el-alert>
          </div>
          <el-form ref="regFormRef" :model="regForm" :rules="regRules" label-width="0" class="login-form">
            <el-form-item prop="name">
              <el-input v-model="regForm.name" placeholder="真实姓名（选填）" size="large" :prefix-icon="UserFilled" />
            </el-form-item>
            <el-form-item prop="username">
              <el-input v-model="regForm.username" placeholder="请输入用户名（登录账号）" size="large" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="regForm.email" placeholder="邮箱地址（选填）" size="large" :prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="regForm.password" type="password" placeholder="设置登录密码（至少6位）" size="large"
                :prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="regForm.confirmPassword" type="password" placeholder="再次确认密码" size="large"
                :prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item prop="role">
              <el-select v-model="regForm.role" placeholder="申请角色" size="large" style="width: 100%">
                <el-option label="学生" value="student" />
                <el-option label="访客（公众）" value="public" />
              </el-select>
            </el-form-item>
            <el-button type="success" size="large" class="login-btn" :loading="regLoading" @click="handleRegister">
              提交注册申请
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Message } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth.js'
import { authAPI } from '../api/http.js'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('login')
const loginFormRef = ref()
const regFormRef = ref()
const loginLoading = ref(false)
const regLoading = ref(false)

// 登录表单
const loginForm = reactive({ username: '', password: '' })
const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 注册表单
const regForm = reactive({ name: '', username: '', email: '', password: '', confirmPassword: '', role: 'student' })
const validateConfirmPwd = (rule, value, callback) => {
  if (value !== regForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}
const regRules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPwd, trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择申请角色', trigger: 'change' }]
}

// 演示账号
const demoAccounts = [
  { username: 'admin', password: 'admin123', role: 'admin', roleLabel: '管理员', tagType: 'danger' },
  { username: 'researcher', password: 'research123', role: 'researcher', roleLabel: '科研人员', tagType: 'warning' },
  { username: 'student', password: 'student123', role: 'student', roleLabel: '学生', tagType: 'success' },
  { username: 'public', password: 'public123', role: 'public', roleLabel: '访客', tagType: 'info' }
]

const quickLogin = (account) => {
  loginForm.username = account.username
  loginForm.password = account.password
  handleLogin()
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  try { await loginFormRef.value.validate() } catch { return }
  loginLoading.value = true
  try {
    const result = await authStore.login(loginForm.username, loginForm.password)
    if (result.success) {
      ElMessage.success(`欢迎回来，${result.user.name}！`)
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message || '用户名或密码错误')
    }
  } catch (err) {
    ElMessage.error(err.message || '登录失败，请稍后重试')
  } finally {
    loginLoading.value = false
  }
}

const handleRegister = async () => {
  if (!regFormRef.value) return
  try { await regFormRef.value.validate() } catch { return }
  regLoading.value = true
  try {
    await authAPI.register({
      name: regForm.name,
      username: regForm.username,
      email: regForm.email,
      password: regForm.password,
      role: regForm.role
    })
    ElMessage.success('注册申请已提交！请等待管理员审核，审核通过后即可登录。')
    // 重置表单并切换到登录tab
    Object.assign(regForm, { name: '', username: '', email: '', password: '', confirmPassword: '', role: 'student' })
    activeTab.value = 'login'
  } catch (err) {
    ElMessage.error(err.message || '提交失败，请稍后重试')
  } finally {
    regLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-gradient);
  position: relative;
  overflow: hidden;
}

.ocean-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  border-radius: 50%;
  opacity: 0.3;
}

.wave1 {
  height: 300px;
  background: rgba(144, 224, 239, 0.4);
  animation: wave 8s linear infinite;
}

.wave2 {
  height: 250px;
  background: rgba(0, 180, 216, 0.3);
  animation: wave 12s linear infinite reverse;
}

.wave3 {
  height: 200px;
  background: rgba(0, 119, 182, 0.2);
  animation: wave 16s linear infinite;
}

@keyframes wave {
  0% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(-25%) rotate(3deg); }
  100% { transform: translateX(-50%) rotate(0deg); }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 440px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 36px 40px 32px;
  box-shadow: 0 20px 60px rgba(3, 4, 94, 0.3);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-icon {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 10px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.login-header h1 {
  font-size: 17px;
  font-weight: 700;
  color: #03045e;
  margin-bottom: 6px;
}

.login-header p {
  font-size: 12px;
  color: #0077b6;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.login-form {
  margin-bottom: 16px;
}

.register-tip {
  margin-bottom: 14px;
}

.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  background: linear-gradient(135deg, #0077b6, #00b4d8);
  border: none;
  border-radius: 8px;
  margin-top: 4px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #00b4d8, #0077b6);
  transform: translateY(-1px);
}

.demo-accounts {
  border-top: 1px solid #e0f0ff;
  padding-top: 14px;
  margin-top: 4px;
}

.demo-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
  text-align: center;
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  background: #f0f8ff;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-item:hover {
  background: #e0f0ff;
  transform: translateX(4px);
}

.demo-info {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}
</style>
