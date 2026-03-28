<template>
  <div class="users-page">
    <div class="page-header-bar">
      <h2 class="page-title">👥 用户管理</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">添加用户</el-button>
    </div>

    <el-card v-loading="loading">
      <el-table :data="dataStore.users" stripe border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)">{{ roleLabels[row.role] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'">{{ row.status ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button
              size="small"
              :type="row.status ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 活动日志 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="page-title" style="font-size: 16px">📋 用户活动日志</span>
          <el-button size="small" @click="refreshLogs" :loading="logsLoading">刷新</el-button>
        </div>
      </template>
      <el-table :data="dataStore.logs" stripe size="small" v-loading="logsLoading">
        <el-table-column prop="userName" label="用户" width="100" />
        <el-table-column prop="action" label="操作" width="130" />
        <el-table-column prop="target" label="目标" />
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="ip" label="IP地址" width="140" />
      </el-table>
    </el-card>

    <!-- 编辑/添加对话框 -->
    <el-dialog v-model="dialogVisible" :title="editItem ? '编辑用户' : '添加用户'" width="420px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="(label, role) in roleLabels" :key="role" :label="label" :value="role" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editItem" label="初始密码">
          <el-input v-model="form.password" placeholder="默认 123456" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useDataStore } from '../store/data.js'
import { authAPI } from '../api/http.js'

const dataStore = useDataStore()
const dialogVisible = ref(false)
const editItem = ref(null)
const loading = ref(false)
const logsLoading = ref(false)
const saving = ref(false)
const form = reactive({ name: '', username: '', email: '', role: 'student', password: '' })

const roleLabels = { admin: '管理员', researcher: '科研人员', student: '学生', public: '访客' }
const roleTagType = (role) => {
  const map = { admin: 'danger', researcher: 'warning', student: 'success', public: 'info' }
  return map[role] || 'info'
}

// 加载活动日志
const refreshLogs = async () => {
  logsLoading.value = true
  try {
    const res = await authAPI.getLogs()
    dataStore.logs = res.data
  } catch (err) {
    ElMessage.error('加载日志失败：' + err.message)
  } finally {
    logsLoading.value = false
  }
}

// 页面加载时从后端获取用户列表 + 活动日志
onMounted(async () => {
  loading.value = true
  try {
    const [usersRes] = await Promise.all([
      authAPI.getUsers(),
      refreshLogs()
    ])
    dataStore.users = usersRes.data
  } catch (err) {
    ElMessage.error('加载用户列表失败：' + err.message)
  } finally {
    loading.value = false
  }
})

const openDialog = (item = null) => {
  editItem.value = item
  if (item) {
    Object.assign(form, { name: item.name, username: item.username, email: item.email, role: item.role, password: '' })
  } else {
    Object.assign(form, { name: '', username: '', email: '', role: 'student', password: '' })
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.username) {
    ElMessage.warning('用户名不能为空')
    return
  }
  saving.value = true
  try {
    if (editItem.value) {
      // 编辑：调用后端更新接口
      const res = await authAPI.updateUser(editItem.value.id, {
        name: form.name, username: form.username, email: form.email, role: form.role
      })
      const idx = dataStore.users.findIndex(u => u.id === editItem.value.id)
      if (idx !== -1) dataStore.users[idx] = res.data
      ElMessage.success('修改成功')
    } else {
      // 新增：调用后端创建接口
      const res = await authAPI.createUser({ ...form })
      dataStore.users.push(res.data)
      ElMessage.success('添加成功，默认密码：' + (form.password || '123456'))
    }
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (user) => {
  const newStatus = user.status ? 0 : 1
  try {
    await authAPI.toggleStatus(user.id, newStatus)
    user.status = newStatus
    ElMessage.success(newStatus ? '已启用' : '已禁用')
  } catch (err) {
    ElMessage.error('操作失败：' + err.message)
  }
}
</script>

<style scoped>
.page-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; color: #03045e; }
</style>
