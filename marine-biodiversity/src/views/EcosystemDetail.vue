<template>
  <div class="eco-detail" v-if="eco">
    <!-- 顶部 Banner -->
    <div class="detail-banner" :class="eco.type">
      <div class="banner-content">
        <span class="banner-icon">{{ ecoIcons[eco.type] || '🌊' }}</span>
        <div>
          <h1 class="banner-title">{{ eco.name }}</h1>
          <el-tag class="banner-tag" effect="dark">{{ ecoTypeLabel[eco.type] || eco.type }}</el-tag>
        </div>
      </div>
      <div class="banner-actions">
        <el-button @click="$router.back()" :icon="Back">返回</el-button>
        <el-button v-if="authStore.isAdmin" type="warning" :icon="EditPen" @click="openEditDialog">编辑</el-button>
      </div>
    </div>

    <!-- 编辑对话框（内嵌在详情页） -->
    <el-dialog v-model="editDialogVisible" title="编辑生态系统" width="500px" @close="resetForm">
      <el-form ref="editFormRef" :model="editForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="editForm.type" style="width: 100%">
            <el-option v-for="(label, type) in ecoTypeLabel" :key="type" :label="label" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="editForm.area" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 左列：基本信息 + 描述 -->
      <el-col :span="8">
        <el-card class="info-card" style="margin-bottom: 16px">
          <template #header><span class="sec-title">📋 基本信息</span></template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="生态系统名称">{{ eco.name }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ ecoTypeLabel[eco.type] || eco.type }}</el-descriptions-item>
            <el-descriptions-item label="所在地区">{{ eco.area || '未记录' }}</el-descriptions-item>
            <el-descriptions-item label="观测总次数">
              <el-tag type="primary">{{ relatedObs.length }} 次</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="关联物种数">
              <el-tag type="success">{{ uniqueSpecies.length }} 种</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="info-card">
          <template #header><span class="sec-title">📝 生态系统描述</span></template>
          <p class="eco-desc-full">{{ eco.description || '暂无描述信息' }}</p>
        </el-card>

        <!-- 物种统计 -->
        <el-card class="info-card" style="margin-top: 16px" v-if="uniqueSpecies.length > 0">
          <template #header><span class="sec-title">🐠 关联物种</span></template>
          <div class="species-chips">
            <el-tag
              v-for="sp in uniqueSpecies"
              :key="sp.speciesId"
              class="species-chip"
              type="success"
              effect="plain"
              style="cursor: pointer; margin: 4px"
              @click="$router.push(`/species/${sp.speciesId}`)"
            >
              {{ sp.speciesName }}
            </el-tag>
          </div>
        </el-card>
      </el-col>

      <!-- 右列：观测记录列表 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span class="sec-title">🔭 关联观测记录（{{ relatedObs.length }} 条）</span>
              <el-button
                v-if="authStore.canEdit"
                type="primary"
                size="small"
                @click="$router.push({ path: '/observations/add', query: { ecosystemId: eco.id } })"
              >+ 新增观测</el-button>
            </div>
          </template>

          <el-empty v-if="relatedObs.length === 0" description="该生态系统暂无观测记录" />

          <div v-else>
            <el-table :data="pagedObs" border stripe style="width: 100%">
              <el-table-column prop="title" label="观测标题" min-width="140" show-overflow-tooltip />
              <el-table-column prop="observedAt" label="观测时间" width="150" />
              <el-table-column prop="observers" label="观测人员" width="120" show-overflow-tooltip />
              <el-table-column label="环境参数" width="180">
                <template #default="{ row }">
                  <span v-if="row.waterTemp">💧 {{ row.waterTemp }}°C</span>
                  <span v-if="row.salinity" style="margin-left: 8px">🧂 {{ row.salinity }}‰</span>
                </template>
              </el-table-column>
              <el-table-column label="关联物种" width="80">
                <template #default="{ row }">
                  <el-badge :value="row.species?.length || 0" :type="row.species?.length ? 'success' : 'info'" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="210" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="$router.push(`/observations/${row.id}`)">详情</el-button>
                  <el-button
                    v-if="authStore.canEdit"
                    size="small"
                    type="primary"
                    @click="$router.push(`/observations/${row.id}/edit`)"
                  >编辑</el-button>
                  <el-button
                    v-if="authStore.canEdit"
                    size="small"
                    type="danger"
                    :icon="Delete"
                    @click="handleDeleteObs(row)"
                  >删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div style="margin-top: 16px; text-align: center" v-if="relatedObs.length > pageSize">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="relatedObs.length"
                layout="total, prev, pager, next"
                background
              />
            </div>
          </div>
        </el-card>

        <!-- 环境参数趋势（如果有多条观测） -->
        <el-card style="margin-top: 16px" v-if="relatedObs.length >= 2">
          <template #header><span class="sec-title">📊 环境参数概览</span></template>
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="env-stat-box">
                <div class="env-label">平均水温</div>
                <div class="env-value blue">
                  {{ avgTemp !== null ? avgTemp.toFixed(1) + ' °C' : '—' }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="env-stat-box">
                <div class="env-label">平均盐度</div>
                <div class="env-value teal">
                  {{ avgSalinity !== null ? avgSalinity.toFixed(1) + ' ‰' : '—' }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="env-stat-box">
                <div class="env-label">平均水深</div>
                <div class="env-value navy">
                  {{ avgDepth !== null ? avgDepth.toFixed(1) + ' m' : '—' }}
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <el-empty v-else description="生态系统不存在" />
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { Back, EditPen, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '../store/data.js'
import { useAuthStore } from '../store/auth.js'

const route = useRoute()
const dataStore = useDataStore()
const authStore = useAuthStore()

const currentPage = ref(1)
const pageSize = 8

// ---- 编辑 Dialog ----
const editDialogVisible = ref(false)
const editFormRef = ref()
const saving = ref(false)
const editForm = reactive({ name: '', type: '', area: '', description: '' })

const openEditDialog = () => {
  if (!eco.value) return
  Object.assign(editForm, {
    name: eco.value.name,
    type: eco.value.type,
    area: eco.value.area || '',
    description: eco.value.description || ''
  })
  editDialogVisible.value = true
}

const resetForm = () => {
  Object.assign(editForm, { name: '', type: '', area: '', description: '' })
}

const handleSave = async () => {
  if (!editForm.name) {
    ElMessage.warning('名称不能为空')
    return
  }
  saving.value = true
  try {
    await dataStore.updateEcosystem(eco.value.id, { ...editForm })
    ElMessage.success('修改成功')
    editDialogVisible.value = false
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}
// ---- end 编辑 Dialog ----

// ---- 删除观测记录 ----
const handleDeleteObs = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除观测记录「${row.title}」吗？此操作不可撤销。`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return // 用户点了取消
  }
  try {
    await dataStore.deleteObservation(row.id)
    ElMessage.success('删除成功')
    // 如果当前页已无数据，翻回上一页
    if (pagedObs.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch (err) {
    ElMessage.error('删除失败：' + err.message)
  }
}
// ---- end 删除观测记录 ----

const ecoIcons = {
  coral_reef: '🪸', mangrove: '🌿', seagrass: '🌾',
  deep_sea: '🦑', estuary: '🏞️'
}
const ecoTypeLabel = {
  coral_reef: '珊瑚礁', mangrove: '红树林', seagrass: '海草床',
  deep_sea: '深海', estuary: '河口'
}

const eco = computed(() =>
  dataStore.ecosystems.find(e => e.id === parseInt(route.params.id))
)

// 该生态系统关联的所有观测记录
const relatedObs = computed(() =>
  dataStore.observations.filter(o => o.ecosystemId === eco.value?.id)
    .sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt))
)

// 分页后的观测记录
const pagedObs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return relatedObs.value.slice(start, start + pageSize)
})

// 从关联观测中提取唯一物种
const uniqueSpecies = computed(() => {
  const map = new Map()
  relatedObs.value.forEach(obs => {
    obs.species?.forEach(sp => {
      if (!map.has(sp.speciesId)) {
        map.set(sp.speciesId, sp)
      }
    })
  })
  return [...map.values()]
})

// 环境参数均值
const avgTemp = computed(() => {
  const vals = relatedObs.value.map(o => o.waterTemp).filter(v => v !== null && v !== undefined)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
})
const avgSalinity = computed(() => {
  const vals = relatedObs.value.map(o => o.salinity).filter(v => v !== null && v !== undefined)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
})
const avgDepth = computed(() => {
  const vals = relatedObs.value.map(o => o.depth).filter(v => v !== null && v !== undefined)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
})
</script>

<style scoped>
.detail-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-radius: 12px;
  color: white;
}

.detail-banner.coral_reef { background: linear-gradient(135deg, #ff6b6b, #ffa07a); }
.detail-banner.mangrove   { background: linear-gradient(135deg, #52b788, #1e6a3e); }
.detail-banner.seagrass   { background: linear-gradient(135deg, #a8d8a8, #2d9e2d); }
.detail-banner.deep_sea   { background: linear-gradient(135deg, #03045e, #0077b6); }
.detail-banner.estuary    { background: linear-gradient(135deg, #48cae4, #0077b6); }

.banner-content {
  display: flex;
  align-items: center;
  gap: 20px;
}
.banner-icon { font-size: 64px; }
.banner-title { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
.banner-tag { font-size: 13px; }

.banner-actions { display: flex; gap: 10px; }

.sec-title { font-weight: 600; color: #03045e; font-size: 14px; }

.eco-desc-full {
  line-height: 1.8;
  color: #444;
  font-size: 14px;
  white-space: pre-wrap;
}

.species-chips { display: flex; flex-wrap: wrap; }

.env-stat-box {
  text-align: center;
  padding: 16px;
  background: #f8fbff;
  border-radius: 10px;
  border: 1px solid #e0f0ff;
}
.env-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.env-value { font-size: 24px; font-weight: 700; }
.env-value.blue  { color: #0077b6; }
.env-value.teal  { color: #00b4d8; }
.env-value.navy  { color: #03045e; }
</style>
