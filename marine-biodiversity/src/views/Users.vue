<template>
  <div class="users-page">
    <!-- 页面标题+Tab -->
    <el-tabs v-model="activeTab">
      <!-- 用户列表 Tab -->
      <el-tab-pane label="👥 用户列表" name="users">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="openDialog()">添加用户</el-button>
        </div>
        <el-card v-loading="loading">
          <el-table :data="dataStore.users" stripe border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="头像" width="70">
              <template #default="{ row }">
                <el-avatar v-if="row.avatar" :src="row.avatar" :size="36" />
                <el-avatar v-else :size="36" style="background: #0077b6">
                  {{ (row.name || row.username || '?').charAt(0) }}
                </el-avatar>
              </template>
            </el-table-column>
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
                <el-button size="small" :type="row.status ? 'warning' : 'success'" @click="toggleStatus(row)">
                  {{ row.status ? '禁用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 注册申请审核 Tab -->
      <el-tab-pane name="applications">
        <template #label>
          📋 注册申请
          <el-badge v-if="pendingCount > 0" :value="pendingCount" type="danger" style="margin-left: 4px" />
        </template>
        <div class="tab-header">
          <el-radio-group v-model="appFilter" size="small" @change="loadApplications">
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="approved">已通过</el-radio-button>
            <el-radio-button value="rejected">已拒绝</el-radio-button>
            <el-radio-button value="">全部</el-radio-button>
          </el-radio-group>
        </div>
        <el-card v-loading="appsLoading">
          <el-table :data="applications" stripe border empty-text="暂无申请记录">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="role" label="申请角色" width="100">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabels[row.role] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="appStatusType(row.status)" size="small">{{ appStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="applyTime" label="申请时间" width="160" />
            <el-table-column prop="reviewRemark" label="审核备注" />
            <el-table-column label="操作" width="180" v-if="appFilter === 'pending' || appFilter === ''">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button size="small" type="success" @click="approveApp(row)">通过</el-button>
                  <el-button size="small" type="danger" @click="rejectApp(row)">拒绝</el-button>
                </template>
                <span v-else style="color:#999;font-size:12px">已处理</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 活动日志 Tab -->
      <el-tab-pane label="📋 活动日志" name="logs">
        <div class="tab-header" style="justify-content: flex-end">
          <el-button size="small" @click="refreshLogs" :loading="logsLoading">刷新</el-button>
        </div>
        <el-card v-loading="logsLoading">
          <el-table :data="dataStore.logs" stripe size="small">
            <el-table-column prop="userName" label="用户" width="100" />
            <el-table-column prop="action" label="操作" width="130" />
            <el-table-column prop="target" label="目标" />
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column prop="ip" label="IP地址" width="150" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑/添加用户对话框 -->
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

    <!-- 审核备注对话框 -->
    <el-dialog v-model="remarkVisible" :title="remarkAction === 'approve' ? '审核通过' : '拒绝申请'" width="380px">
      <el-form label-width="80px">
        <el-form-item label="审核备注">
          <el-input v-model="remarkText" type="textarea" :rows="3"
            :placeholder="remarkAction === 'approve' ? '如：审核通过，欢迎加入' : '如：信息不完整，请重新申请'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkVisible = false">取消</el-button>
        <el-button :type="remarkAction === 'approve' ? 'success' : 'danger'" :loading="remarkSaving" @click="submitRemark">
          {{ remarkAction === 'approve' ? '确认通过' : '确认拒绝' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useDataStore } from '../store/data.js'
import { authAPI } from '../api/http.js'

const dataStore = useDataStore()
const activeTab = ref('users')
const dialogVisible = ref(false)
const editItem = ref(null)
const loading = ref(false)
const logsLoading = ref(false)
const saving = ref(false)
const form = reactive({ name: '', username: '', email: '', role: 'student', password: '' })

// 注册申请相关
const applications = ref([])
const appsLoading = ref(false)
const appFilter = ref('pending')
const remarkVisible = ref(false)
const remarkText = ref('')
const remarkAction = ref('approve')  // 'approve' | 'reject'
const remarkTargetId = ref(null)
const remarkSaving = ref(false)

const pendingCount = computed(() => applications.value.filter(a => a.status === 'pending').length)

const roleLabels = { admin: '管理员', researcher: '科研人员', student: '学生', public: '访客' }
const roleTagType = (role) => ({ admin: 'danger', researcher: 'warning', student: 'success', public: 'info' }[role] || 'info')
const appStatusType = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info')
const appStatusLabel = (s) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s)

// 加载注册申请
const loadApplications = async () => {
  appsLoading.value = true
  try {
    const res = await authAPI.getApplications(appFilter.value)
    applications.value = res.data
  } catch (err) {
    ElMessage.error('加载申请列表失败：' + err.message)
  } finally {
    appsLoading.value = false
  }
}

// 审核操作（先弹备注框）
const approveApp = (row) => {
  remarkAction.value = 'approve'
  remarkTargetId.value = row.id
  remarkText.value = '审核通过，欢迎使用系统！'
  remarkVisible.value = true
}
const rejectApp = (row) => {
  remarkAction.value = 'reject'
  remarkTargetId.value = row.id
  remarkText.value = ''
  remarkVisible.value = true
}
const submitRemark = async () => {
  remarkSaving.value = true
  try {
    if (remarkAction.value === 'approve') {
      await authAPI.approveApplication(remarkTargetId.value, remarkText.value)
      ElMessage.success('已审核通过，用户账号已创建')
    } else {
      await authAPI.rejectApplication(remarkTargetId.value, remarkText.value)
      ElMessage.success('已拒绝申请')
    }
    remarkVisible.value = false
    await loadApplications()
    // 刷新用户列表（审核通过后会多一个用户）
    if (remarkAction.value === 'approve') {
      const usersRes = await authAPI.getUsers()
      dataStore.users = usersRes.data
    }
  } catch (err) {
    ElMessage.error('操作失败：' + err.message)
  } finally {
    remarkSaving.value = false
  }
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

// 页面加载
onMounted(async () => {
  loading.value = true
  try {
    const [usersRes] = await Promise.all([authAPI.getUsers(), refreshLogs(), loadApplications()])
    dataStore.users = usersRes.data
  } catch (err) {
    ElMessage.error('加载数据失败：' + err.message)
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
  if (!form.username) { ElMessage.warning('用户名不能为空'); return }
  saving.value = true
  try {
    if (editItem.value) {
      const res = await authAPI.updateUser(editItem.value.id, { name: form.name, username: form.username, email: form.email, role: form.role })
      const idx = dataStore.users.findIndex(u => u.id === editItem.value.id)
      if (idx !== -1) dataStore.users[idx] = res.data
      ElMessage.success('修改成功')
    } else {
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
.users-page { padding: 0; }
.tab-header { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 16px; gap: 12px; }
</style>
