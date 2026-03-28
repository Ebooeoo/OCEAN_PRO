<template>
  <div class="obs-detail" v-if="obs">
    <div class="page-header">
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
      <div v-if="authStore.canEdit">
        <el-button type="danger" @click="handleDelete">删除记录</el-button>
      </div>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card style="margin-bottom: 16px">
          <template #header>
            <div style="display: flex; align-items: center; gap: 10px">
              <h2 style="font-size: 18px; color: #03045e">{{ obs.title }}</h2>
              <el-tag type="info">{{ obs.ecosystemName }}</el-tag>
            </div>
          </template>
          
          <el-descriptions :column="2" border>
            <el-descriptions-item label="观测时间">{{ obs.observedAt }}</el-descriptions-item>
            <el-descriptions-item label="观测人员">{{ obs.observers }}</el-descriptions-item>
            <el-descriptions-item label="地理坐标">{{ obs.longitude }}°E, {{ obs.latitude }}°N</el-descriptions-item>
            <el-descriptions-item label="天气状况">{{ obs.weatherCondition }}</el-descriptions-item>
            <el-descriptions-item label="水温">{{ obs.waterTemp }}°C</el-descriptions-item>
            <el-descriptions-item label="盐度">{{ obs.salinity }}‰</el-descriptions-item>
            <el-descriptions-item label="深度">{{ obs.depth }}m</el-descriptions-item>
            <el-descriptions-item label="记录人">{{ obs.createdBy }}</el-descriptions-item>
          </el-descriptions>
          
          <div style="margin-top: 16px">
            <div class="section-title">📝 观测备注</div>
            <p style="line-height: 1.8; color: #444; font-size: 14px">{{ obs.notes }}</p>
          </div>
        </el-card>

        <!-- 关联物种 -->
        <el-card>
          <template #header><span class="sec-title">🐠 关联物种记录</span></template>
          <el-table :data="obs.species" border stripe>
            <el-table-column prop="speciesName" label="物种名称" />
            <el-table-column prop="count" label="数量/个体数" width="120" />
            <el-table-column prop="behavior" label="行为描述" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" @click="$router.push(`/species/${row.speciesId}`)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <!-- 地图 -->
      <el-col :span="8">
        <el-card>
          <template #header><span class="sec-title">🗺️ 观测位置</span></template>
          <div ref="mapRef" class="obs-map"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
  <el-empty v-else description="记录不存在" />
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Back } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'
import L from 'leaflet'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()
const mapRef = ref()
let map = null

const obs = computed(() => dataStore.observations.find(o => o.id === parseInt(route.params.id)))

onMounted(() => {
  if (obs.value?.longitude && mapRef.value) {
    setTimeout(() => {
      map = L.map(mapRef.value, { preferCanvas: true }).setView([obs.value.latitude, obs.value.longitude], 8)
      // 高德地图瓦片（国内可访问，GCJ-02坐标系）
      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        attribution: '© 高德地图',
        maxZoom: 18
      }).addTo(map)
      L.marker([obs.value.latitude, obs.value.longitude])
        .addTo(map)
        .bindPopup(`<b>${obs.value.title}</b><br>${obs.value.observedAt}`)
        .openPopup()
    }, 100)
  }
})

onUnmounted(() => { if (map) map.remove() })

const handleDelete = () => {
  ElMessageBox.confirm('确定删除此观测记录吗？', '删除确认', { type: 'warning' }).then(async () => {
    await dataStore.deleteObservation(obs.value.id)
    ElMessage.success('删除成功')
    router.push('/observations')
  }).catch(() => {})
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sec-title { font-weight: 600; color: #03045e; }
.section-title { font-weight: 600; color: #03045e; margin-bottom: 8px; }
.obs-map { height: 300px; border-radius: 8px; overflow: hidden; }
</style>
