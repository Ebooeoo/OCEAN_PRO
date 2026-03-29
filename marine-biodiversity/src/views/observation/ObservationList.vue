<template>
  <div class="observation-list">
    <!-- 搜索和操作 -->
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索观测主题/地点" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterEcosystem" placeholder="生态系统" clearable>
            <el-option v-for="e in dataStore.ecosystems" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-col>
        <el-col :span="11" style="text-align: right">
          <el-button v-if="authStore.canEdit" type="primary" :icon="Plus" @click="$router.push('/observations/add')">
            新增观测记录
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计条 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6" v-for="stat in obsStats" :key="stat.label">
        <div class="mini-stat" :style="{ borderLeft: `4px solid ${stat.color}` }">
          <span class="mini-val" :style="{ color: stat.color }">{{ stat.value }}</span>
          <span class="mini-label">{{ stat.label }}</span>
        </div>
      </el-col>
    </el-row>

    <!-- 观测记录卡片列表 -->
    <div class="obs-list">
      <el-card
        v-for="obs in pagedObs"
        :key="obs.id"
        class="obs-card card-hover"
        @click="$router.push(`/observations/${obs.id}`)"
      >
        <div class="obs-header">
          <div class="obs-title-area">
            <h3 class="obs-title">{{ obs.title }}</h3>
            <el-tag type="info" size="small">{{ obs.ecosystemName }}</el-tag>
          </div>
          <div class="obs-meta">
            <span class="obs-date">📅 {{ obs.observedAt }}</span>
            <span class="obs-person">👤 {{ obs.observers }}</span>
          </div>
        </div>
        
        <div class="obs-body">
          <div class="obs-env">
            <span v-if="obs.waterTemp">🌡️ 水温: {{ obs.waterTemp }}°C</span>
            <span v-if="obs.salinity">🧂 盐度: {{ obs.salinity }}‰</span>
            <span v-if="obs.depth">📏 深度: {{ obs.depth }}m</span>
            <span>☀️ {{ obs.weatherCondition }}</span>
            <span>📍 {{ obs.longitude }}°E, {{ obs.latitude }}°N</span>
          </div>
          
          <!-- 关联物种 -->
          <div class="obs-species" v-if="obs.species?.length">
            <span class="species-label">发现物种：</span>
            <el-tag
              v-for="sp in obs.species"
              :key="sp.speciesId"
              type="success"
              size="small"
              style="margin-right: 6px"
            >
              {{ sp.speciesName }} × {{ sp.count }}
            </el-tag>
          </div>
          
          <p class="obs-notes">{{ obs.notes }}</p>
        </div>
        
        <div class="obs-footer" v-if="authStore.canEdit" @click.stop>
          <el-button size="small" @click="$router.push(`/observations/${obs.id}`)">详情</el-button>
          <el-button size="small" type="primary" @click="$router.push(`/observations/${obs.id}/edit`)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(obs)">删除</el-button>
        </div>
      </el-card>
      
      <el-empty v-if="!filteredObs.length" description="暂无观测记录" />
    </div>

    <!-- 分页 -->
    <div class="obs-pagination" v-if="filteredObs.length > pageSize">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20, 50]"
        :total="filteredObs.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="() => {}"
        @size-change="() => { currentPage = 1 }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'

const dataStore = useDataStore()
const authStore = useAuthStore()
const searchText = ref('')
const filterEcosystem = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredObs = computed(() => {
  let list = [...dataStore.observations]
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(o => o.title?.toLowerCase().includes(q) || o.notes?.toLowerCase().includes(q))
  }
  if (filterEcosystem.value) {
    list = list.filter(o => o.ecosystemId === filterEcosystem.value)
  }
  return list
})

const pagedObs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredObs.value.slice(start, start + pageSize.value)
})

const obsStats = computed(() => [
  { label: '观测总次数', value: dataStore.observations.length, color: '#0077b6' },
  { label: '涉及物种数', value: new Set(dataStore.observations.flatMap(o => o.species?.map(s => s.speciesId) || [])).size, color: '#00b4d8' },
  { label: '覆盖生态系统', value: new Set(dataStore.observations.map(o => o.ecosystemId)).size, color: '#48cae4' },
  { label: '参与人员', value: new Set(dataStore.observations.flatMap(o => o.observers?.split(',') || [])).size, color: '#f77f00' }
])

const handleDelete = (obs) => {
  ElMessageBox.confirm(`确定删除观测记录 "${obs.title}" 吗？`, '删除确认', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  }).then(async () => {
    try {
      await dataStore.deleteObservation(obs.id)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败：' + err.message)
    }
  }).catch(() => {})
}
</script>

<style scoped>
.search-card { margin-bottom: 16px; }

.mini-stat {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,119,182,0.08);
}
.mini-val { font-size: 24px; font-weight: 700; }
.mini-label { font-size: 12px; color: #999; }

.obs-card {
  margin-bottom: 12px;
  cursor: pointer;
}

.obs-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.obs-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.obs-title {
  font-size: 16px;
  font-weight: 600;
  color: #03045e;
}

.obs-meta {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 13px;
}

.obs-env {
  display: flex;
  gap: 16px;
  color: #0077b6;
  font-size: 13px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.obs-species {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.species-label { font-size: 13px; color: #666; margin-right: 6px; }

.obs-notes {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.obs-footer {
  margin-top: 12px;
  border-top: 1px solid #f0f8ff;
  padding-top: 12px;
}

.obs-pagination {
  margin-top: 20px;
  text-align: center;
}
</style>

