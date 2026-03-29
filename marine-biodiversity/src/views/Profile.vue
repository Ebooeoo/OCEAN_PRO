<template>
  <div class="profile-page">
    <el-row :gutter="20">
      <!-- 左侧：头像卡片 -->
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="avatar-section">
            <!-- 头像显示（有头像显示图片，否则显示首字母） -->
            <div class="avatar-wrapper" @click="triggerUpload" title="点击更换头像">
              <el-avatar v-if="currentAvatar" :src="currentAvatar" :size="90" class="big-avatar" />
              <el-avatar v-else :size="90" class="big-avatar">
                {{ (user?.name || user?.username || '?').charAt(0) }}
              </el-avatar>
              <div class="avatar-mask">
                <span>更换头像</span>
              </div>
            </div>
            <!-- 隐藏文件输入 -->
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              style="display:none" @change="handleAvatarChange" />
            <h3>{{ user?.name }}</h3>
            <el-tag :type="roleTagType">{{ roleName }}</el-tag>
            <p class="avatar-tip">点击头像可更换</p>
          </div>
          <el-descriptions :column="1" border size="small" style="margin-top: 16px">
            <el-descriptions-item label="用户名">{{ user?.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user?.email || '未填写' }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ roleName }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 右侧：信息修改 -->
      <el-col :span="16">
        <el-card style="margin-bottom: 16px">
          <template #header><span class="sec-title">✏️ 修改个人信息</span></template>
          <el-form :model="infoForm" label-width="100px">
            <el-form-item label="显示名称">
              <el-input v-model="infoForm.name" placeholder="您的真实姓名" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="infoForm.email" placeholder="您的邮箱地址" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="infoSaving" @click="handleSaveInfo">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <template #header><span class="sec-title">🔒 修改密码</span></template>
          <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="100px">
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" placeholder="新密码（至少6位）" show-password />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="warning" :loading="pwdSaving" @click="handleChangePwd">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../store/auth.js'
import { authAPI } from '../api/http.js'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const roleName = computed(() => authStore.roleName)
const fileInput = ref()
const infoSaving = ref(false)
const pwdSaving = ref(false)
const pwdFormRef = ref()

const roleTagType = computed(() => {
  const map = { admin: 'danger', researcher: 'warning', student: 'success', public: 'info' }
  return map[user.value?.role] || 'info'
})

// 当前头像（优先用 store 里的）
const currentAvatar = computed(() => authStore.user?.avatar || null)

// 个人信息表单
const infoForm = reactive({ name: user.value?.name || '', email: user.value?.email || '' })

// 密码表单
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const validateConfirmPwd = (rule, val, cb) => {
  if (val !== pwdForm.newPassword) cb(new Error('两次密码不一致'))
  else cb()
}
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }, { validator: validateConfirmPwd, trigger: 'blur' }]
}

// 保存个人信息
const handleSaveInfo = async () => {
  infoSaving.value = true
  try {
    const res = await authAPI.updateProfile({ name: infoForm.name, email: infoForm.email, avatar: currentAvatar.value })
    authStore.user = { ...authStore.user, ...res.data }
    localStorage.setItem('marine_user', JSON.stringify(authStore.user))
    ElMessage.success('个人信息已更新')
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    infoSaving.value = false
  }
}

// 修改密码
const handleChangePwd = async () => {
  if (!pwdFormRef.value) return
  try { await pwdFormRef.value.validate() } catch { return }
  pwdSaving.value = true
  try {
    await authAPI.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
    ElMessage.success('密码修改成功！下次登录请使用新密码。')
    Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
  } catch (err) {
    ElMessage.error(err.message || '密码修改失败')
  } finally {
    pwdSaving.value = false
  }
}

// 头像上传
const triggerUpload = () => { fileInput.value?.click() }

const handleAvatarChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像图片不能超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const base64 = ev.target.result
    try {
      const res = await authAPI.uploadAvatar(base64)
      authStore.user = { ...authStore.user, avatar: res.avatar }
      localStorage.setItem('marine_user', JSON.stringify(authStore.user))
      ElMessage.success('头像更新成功')
    } catch (err) {
      ElMessage.error('头像上传失败：' + err.message)
    }
  }
  reader.readAsDataURL(file)
  // 重置 input 允许重复选同一文件
  e.target.value = ''
}
</script>

<style scoped>
.profile-card { text-align: center; }
.avatar-section { padding: 20px 0 10px; }

.avatar-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}
.avatar-wrapper:hover .avatar-mask { opacity: 1; }

.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}

.big-avatar {
  background: linear-gradient(135deg, #0077b6, #00b4d8);
  color: white;
  font-size: 32px;
  font-weight: bold;
}

.avatar-section h3 { margin: 12px 0 6px; font-size: 18px; color: #03045e; }
.avatar-tip { font-size: 12px; color: #aaa; margin-top: 6px; }
.sec-title { font-weight: 600; color: #03045e; }
</style>
