<template>
  <div class="map-view">
    <el-card class="map-controls">
      <el-row :gutter="16" align="middle">
        <el-col :span="4">
          <el-select v-model="mapMode" @change="updateMap">
            <el-option label="🐠 物种分布" value="species" />
            <el-option label="📍 观测地点" value="observations" />
            <el-option label="🌊 综合视图" value="all" />
          </el-select>
        </el-col>
        <el-col :span="4" v-if="mapMode === 'species' || mapMode === 'all'">
          <el-select v-model="filterProtection" placeholder="保护等级筛选" clearable @change="updateMap">
            <el-option label="国家一级" value="国家一级" />
            <el-option label="国家二级" value="国家二级" />
            <el-option label="省级" value="省级" />
          </el-select>
        </el-col>
        <el-col :span="14">
          <div class="map-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#e63946"></span> 国家一级保护</span>
            <span class="legend-item"><span class="legend-dot" style="background:#f77f00"></span> 国家二级保护</span>
            <span class="legend-item"><span class="legend-dot" style="background:#2ec4b6"></span> 省级/其他</span>
            <span class="legend-item"><span class="legend-dot" style="background:#0077b6; clip-path: polygon(50% 0%, 100% 100%, 0% 100%)"></span> 观测地点</span>
          </div>
        </el-col>
        <el-col :span="2" style="text-align: right">
          <span class="point-count">{{ pointCount }} 个标记点</span>
        </el-col>
      </el-row>
    </el-card>
    
    <el-card class="map-card">
      <div ref="mapRef" class="main-map"></div>
    </el-card>

    <!-- 侧边信息面板 -->
    <el-drawer v-model="drawerVisible" :title="selectedItem?.name || selectedItem?.title" direction="rtl" size="400px">
      <div v-if="selectedItem && selectedItem.type === 'species'">
        <div class="drawer-section">
          <img v-if="selectedItem.imageUrl" :src="selectedItem.imageUrl" style="width: 100%; border-radius: 8px; margin-bottom: 12px" />
          <div class="drawer-placeholder" v-else>🐠</div>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="学名">{{ selectedItem.latinName }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ selectedItem.phylum }} · {{ selectedItem.class }}</el-descriptions-item>
          <el-descriptions-item label="保护等级">
            <el-tag :type="protTagType(selectedItem.protectionLevel)" size="small">{{ selectedItem.protectionLevel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="濒危状态">{{ selectedItem.endangeredStatus }}</el-descriptions-item>
          <el-descriptions-item label="分布区域">{{ selectedItem.distribution }}</el-descriptions-item>
        </el-descriptions>
        <el-button type="primary" style="width: 100%; margin-top: 12px" @click="$router.push(`/species/${selectedItem.id}`)">
          查看完整详情
        </el-button>
      </div>
      <div v-if="selectedItem && selectedItem.type === 'observation'">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="观测时间">{{ selectedItem.observedAt }}</el-descriptions-item>
          <el-descriptions-item label="生态系统">{{ selectedItem.ecosystemName }}</el-descriptions-item>
          <el-descriptions-item label="观测人员">{{ selectedItem.observers }}</el-descriptions-item>
          <el-descriptions-item label="水温">{{ selectedItem.waterTemp }}°C</el-descriptions-item>
          <el-descriptions-item label="盐度">{{ selectedItem.salinity }}‰</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 12px">
          <div class="sec-title">关联物种：</div>
          <el-tag v-for="sp in selectedItem.species" :key="sp.speciesId" style="margin: 4px" type="success">
            {{ sp.speciesName }} × {{ sp.count }}
          </el-tag>
        </div>
        <el-button type="primary" style="width: 100%; margin-top: 12px" @click="$router.push(`/observations/${selectedItem.id}`)">
          查看完整详情
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import L from 'leaflet'
import { useDataStore } from '../store/data.js'

const dataStore = useDataStore()
const mapRef = ref()
const mapMode = ref('all')
const filterProtection = ref('')
const drawerVisible = ref(false)
const selectedItem = ref(null)
let map = null
let markers = []

const pointCount = computed(() => markers.length)

const protTagType = (level) => {
  const map = { '国家一级': 'danger', '国家二级': 'warning', '省级': 'success' }
  return map[level] || 'info'
}

const getSpeciesColor = (level) => {
  const map = { '国家一级': '#e63946', '国家二级': '#f77f00', '省级': '#2ec4b6', '无': '#6c757d', '国际公约': '#9b59b6' }
  return map[level] || '#2ec4b6'
}

const createCircleMarker = (lat, lng, color, item) => {
  const marker = L.circleMarker([lat, lng], {
    radius: 10,
    fillColor: color,
    color: 'white',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.85
  })
  marker.on('click', () => {
    selectedItem.value = item
    drawerVisible.value = true
  })
  marker.bindTooltip(item.chineseName || item.title, { permanent: false })
  return marker
}

const updateMap = () => {
  if (!map) return
  markers.forEach(m => m.remove())
  markers = []

  const speciesItems = (mapMode.value === 'species' || mapMode.value === 'all') 
    ? dataStore.species.filter(s => s.longitude && s.latitude && (!filterProtection.value || s.protectionLevel === filterProtection.value))
    : []

  const obsItems = (mapMode.value === 'observations' || mapMode.value === 'all')
    ? dataStore.observations.filter(o => o.longitude && o.latitude)
    : []

  speciesItems.forEach(s => {
    const m = createCircleMarker(s.latitude, s.longitude, getSpeciesColor(s.protectionLevel), { ...s, type: 'species', name: s.chineseName })
    m.addTo(map)
    markers.push(m)
  })

  obsItems.forEach(o => {
    const m = L.marker([o.latitude, o.longitude], {
      icon: L.divIcon({
        html: `<div style="background: #0077b6; color: white; border-radius: 4px; padding: 2px 6px; font-size: 11px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3)">📍</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      })
    })
    m.on('click', () => {
      selectedItem.value = { ...o, type: 'observation' }
      drawerVisible.value = true
    })
    m.bindTooltip(o.title, { permanent: false })
    m.addTo(map)
    markers.push(m)
  })
}

onMounted(() => {
  setTimeout(() => {
    map = L.map(mapRef.value, { preferCanvas: true }).setView([21.5, 112.0], 6)
    // 高德地图瓦片（国内可访问，GCJ-02坐标系）
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      attribution: '© 高德地图',
      maxZoom: 18
    }).addTo(map)
    updateMap()
  }, 100)
})

onUnmounted(() => { if (map) map.remove() })
</script>

<style scoped>
.map-controls { margin-bottom: 12px; }
.map-legend { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; }
.legend-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.point-count { font-size: 12px; color: #999; }
.main-map { height: calc(100vh - 260px); min-height: 500px; border-radius: 8px; overflow: hidden; }
.drawer-section { margin-bottom: 12px; }
.drawer-placeholder { height: 120px; background: linear-gradient(135deg, #e0f3ff, #caf0f8); display: flex; align-items: center; justify-content: center; font-size: 64px; border-radius: 8px; margin-bottom: 12px; }
.sec-title { font-weight: 600; color: #03045e; margin-bottom: 6px; }
</style>
