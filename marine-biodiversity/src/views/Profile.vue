<template>
  <div class="profile-page">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="avatar-section">
            <el-avatar :size="80" class="big-avatar">{{ user?.name?.charAt(0) }}</el-avatar>
            <h3>{{ user?.name }}</h3>
            <el-tag :type="roleTagType">{{ roleName }}</el-tag>
          </div>
          <el-descriptions :column="1" border size="small" style="margin-top: 20px">
            <el-descriptions-item label="用户名">{{ user?.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user?.email }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ roleName }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      
      <el-col :span="16">
        <el-card>
          <template #header><span class="sec-title">修改个人信息</span></template>
          <el-form :model="form" label-width="100px">
            <el-form-item label="显示名称">
              <el-input v-model="form.name" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="form.newPassword" type="password" placeholder="不修改请留空" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSave">保存修改</el-button>
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
const saving = ref(false)
const roleTagType = computed(() => {
  const map = { admin: 'danger', researcher: 'warning', student: 'success', public: 'info' }
  return map[user.value?.role] || 'info'
})

const form = reactive({ name: user.value?.name || '', email: user.value?.email || '', newPassword: '' })

const handleSave = async () => {
  saving.value = true
  try {
    const payload = { name: form.name, email: form.email, username: user.value.username, role: user.value.role }
    if (form.newPassword) payload.password = form.newPassword
    const res = await authAPI.updateUser(user.value.id, payload)
    // 用后端返回的最新数据更新 store 和 localStorage
    authStore.user = { ...authStore.user, ...res.data }
    localStorage.setItem('marine_user', JSON.stringify(authStore.user))
    form.newPassword = ''
    ElMessage.success('个人信息已更新')
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-card { text-align: center; }
.avatar-section { padding: 20px 0; }
.big-avatar { background: linear-gradient(135deg, #0077b6, #00b4d8); color: white; font-size: 32px; font-weight: bold; }
.avatar-section h3 { margin: 12px 0 6px; font-size: 18px; color: #03045e; }
.sec-title { font-weight: 600; color: #03045e; }
</style>
