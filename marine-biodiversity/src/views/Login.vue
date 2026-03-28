<template>
  <div class="login-page">
    <!-- 背景动画 -->
    <div class="ocean-bg">
      <div class="wave wave1"></div>
      <div class="wave wave2"></div>
      <div class="wave wave3"></div>
    </div>
    
    <!-- 登录卡片 -->
    <div class="login-container">
      <div class="login-header">
        <div class="logo-icon">🐬</div>
        <h1>海洋生物多样性信息管理系统</h1>
        <p>广东海洋大学 · Marine Biodiversity Information System</p>
      </div>
      
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>
      
      <!-- 演示账号 -->
      <div class="demo-accounts">
        <div class="demo-title">演示账号</div>
        <div class="demo-list">
          <div v-for="account in demoAccounts" :key="account.role" class="demo-item" @click="quickLogin(account)">
            <el-tag :type="account.tagType" size="small">{{ account.roleLabel }}</el-tag>
            <span class="demo-info">{{ account.username }} / {{ account.password }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const demoAccounts = [
  { username: 'admin', password: 'admin123', role: 'admin', roleLabel: '管理员', tagType: 'danger' },
  { username: 'researcher', password: 'research123', role: 'researcher', roleLabel: '科研人员', tagType: 'warning' },
  { username: 'student', password: 'student123', role: 'student', roleLabel: '学生', tagType: 'success' },
  { username: 'public', password: 'public123', role: 'public', roleLabel: '访客', tagType: 'info' }
]

const quickLogin = (account) => {
  form.username = account.username
  form.password = account.password
  handleLogin()
}

const handleLogin = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const result = await authStore.login(form.username, form.password)
    if (result.success) {
      ElMessage.success(`欢迎回来，${result.user.name}！`)
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message || '用户名或密码错误')
    }
  } catch (err) {
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
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
  width: 420px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(3, 4, 94, 0.3);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 64px;
  line-height: 1;
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.login-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #03045e;
  margin-bottom: 6px;
}

.login-header p {
  font-size: 12px;
  color: #90e0ef;
  color: #0077b6;
}

.login-form {
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  background: linear-gradient(135deg, #0077b6, #00b4d8);
  border: none;
  border-radius: 8px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #00b4d8, #0077b6);
  transform: translateY(-1px);
}

.demo-accounts {
  border-top: 1px solid #e0f0ff;
  padding-top: 16px;
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
  gap: 8px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
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
