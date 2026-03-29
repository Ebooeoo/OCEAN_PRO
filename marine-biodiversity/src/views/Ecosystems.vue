<template>
  <div class="ecosystems">
    <div class="page-header-bar">
      <h2 class="page-title">🌊 生态系统管理</h2>
      <el-button v-if="authStore.isAdmin" type="primary" :icon="Plus" @click="openDialog()">添加生态系统</el-button>
    </div>

    <el-row :gutter="20">
      <el-col v-for="eco in dataStore.ecosystems" :key="eco.id" :span="8" style="margin-bottom: 20px">
        <el-card class="eco-card card-hover" style="cursor: pointer" @click="$router.push(`/ecosystems/${eco.id}`)">
          <div class="eco-banner" :class="eco.type">
            <span class="eco-icon">{{ ecoIcons[eco.type] || '🌊' }}</span>
          </div>
          <div class="eco-content">
            <h3>{{ eco.name }}</h3>
            <el-tag type="info" size="small">{{ ecoTypeLabel[eco.type] }}</el-tag>
            <p class="eco-desc">{{ eco.description }}</p>
            <div class="eco-stats">
              <span>📍 {{ eco.area }}</span>
              <span>🔭 {{ getObsCount(eco.id) }} 次观测</span>
              <span>🐠 {{ getSpecCount(eco.id) }} 种物种</span>
            </div>
          </div>
          <div class="eco-actions" @click.stop>
            <el-button size="small" type="primary" @click="$router.push(`/ecosystems/${eco.id}`)">查看详情</el-button>
            <template v-if="authStore.isAdmin">
              <el-button size="small" @click="openDialog(eco)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDelete(eco)">删除</el-button>
            </template>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editItem ? '编辑生态系统' : '添加生态系统'" width="500px">
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="(label, type) in ecoTypeLabel" :key="type" :label="label" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="form.area" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
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
import { ref, reactive } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useDataStore } from '../store/data.js'
import { useAuthStore } from '../store/auth.js'

const dataStore = useDataStore()
const authStore = useAuthStore()
const dialogVisible = ref(false)
const editItem = ref(null)
const formRef = ref()
const saving = ref(false)

const form = reactive({ name: '', type: '', area: '', description: '' })

const ecoIcons = { coral_reef: '🪸', mangrove: '🌿', seagrass: '🌾', deep_sea: '🦑', estuary: '🏞️' }
const ecoTypeLabel = { coral_reef: '珊瑚礁', mangrove: '红树林', seagrass: '海草床', deep_sea: '深海', estuary: '河口' }

const getObsCount = (id) => dataStore.observations.filter(o => o.ecosystemId === id).length
const getSpecCount = (id) => {
  const specIds = new Set()
  dataStore.observations.filter(o => o.ecosystemId === id).forEach(o => {
    o.species?.forEach(s => specIds.add(s.speciesId))
  })
  return specIds.size
}

const openDialog = (item = null) => {
  editItem.value = item
  if (item) Object.assign(form, item)
  else Object.assign(form, { name: '', type: '', area: '', description: '' })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) {
    ElMessage.warning('名称不能为空')
    return
  }
  saving.value = true
  try {
    if (editItem.value) {
      await dataStore.updateEcosystem(editItem.value.id, { ...form })
      ElMessage.success('修改成功')
    } else {
      await dataStore.addEcosystem({ ...form })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}

const handleDelete = (eco) => {
  ElMessageBox.confirm(`确定删除 "${eco.name}" 吗？`, '确认', { type: 'warning' }).then(async () => {
    try {
      await dataStore.deleteEcosystem(eco.id)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败：' + err.message)
    }
  }).catch(() => {})
}
</script>

<style scoped>
.page-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; color: #03045e; }

.eco-card { overflow: hidden; }

.eco-banner {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -16px -16px 16px -16px;
}
.eco-banner.coral_reef { background: linear-gradient(135deg, #ff6b6b, #ffa07a); }
.eco-banner.mangrove { background: linear-gradient(135deg, #52b788, #1e6a3e); }
.eco-banner.seagrass { background: linear-gradient(135deg, #a8d8a8, #52b788); }
.eco-banner.deep_sea { background: linear-gradient(135deg, #03045e, #0077b6); }
.eco-banner.estuary { background: linear-gradient(135deg, #48cae4, #0077b6); }

.eco-icon { font-size: 56px; }

.eco-content h3 { font-size: 16px; color: #03045e; margin-bottom: 8px; }

.eco-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin: 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.eco-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #0077b6;
  flex-wrap: wrap;
}

.eco-actions {
  margin-top: 12px;
  border-top: 1px solid #f0f8ff;
  padding-top: 12px;
}
</style>
