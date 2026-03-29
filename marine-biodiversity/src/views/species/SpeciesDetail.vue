<template>
  <div class="species-detail" v-if="species">
    <div class="page-header">
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
      <div class="header-actions" v-if="authStore.canEdit">
        <el-button type="primary" :icon="Edit" @click="$router.push(`/species/${species.id}/edit`)">编辑</el-button>
        <el-button type="danger" :icon="Delete" @click="handleDelete">删除</el-button>
      </div>
    </div>

    <el-row :gutter="24">
      <!-- 左侧：图片与基本信息 -->
      <el-col :span="8">
        <el-card class="info-card">
          <div class="species-hero">
            <img
              v-if="species.imageUrl"
              :src="species.imageUrl"
              :alt="species.chineseName"
              class="hero-img"
              @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
            />
            <div class="hero-placeholder" :style="species.imageUrl ? 'display:none' : 'display:flex'">
              {{ speciesEmoji(species.phylum) }}
            </div>
          </div>
          <h2 class="species-main-name">{{ species.chineseName }}</h2>
          <p class="species-main-latin">{{ species.latinName }}</p>
          <div class="status-tags">
            <el-tag :type="protectionTagType(species.protectionLevel)" size="large">{{ species.protectionLevel }}</el-tag>
            <el-tag :type="endangeredTagType(species.endangeredStatus)" size="large">
              {{ species.endangeredStatus }} · {{ endangeredLabel(species.endangeredStatus) }}
            </el-tag>
          </div>
          
          <el-descriptions :column="1" size="small" class="meta-desc" border>
            <el-descriptions-item label="录入人">{{ species.createdBy }}</el-descriptions-item>
            <el-descriptions-item label="录入时间">{{ species.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="参考文献">{{ species.references || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 右侧：详细信息 -->
      <el-col :span="16">
        <!-- 分类信息 -->
        <el-card class="info-card" style="margin-bottom: 16px">
          <template #header><span class="sec-title">📋 分类学信息</span></template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="门">{{ species.phylum }}</el-descriptions-item>
            <el-descriptions-item label="纲">{{ species.class }}</el-descriptions-item>
            <el-descriptions-item label="目">{{ species.order }}</el-descriptions-item>
            <el-descriptions-item label="科">{{ species.family }}</el-descriptions-item>
            <el-descriptions-item label="属">{{ species.genus }}</el-descriptions-item>
            <el-descriptions-item label="种">{{ species.species }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 生物特征 -->
        <el-card class="info-card" style="margin-bottom: 16px">
          <template #header><span class="sec-title">🔬 生物特征</span></template>
          <el-tabs>
            <el-tab-pane label="形态特征">
              <p class="detail-text">{{ species.morphology || '暂无数据' }}</p>
            </el-tab-pane>
            <el-tab-pane label="生活习性">
              <p class="detail-text">{{ species.habits || '暂无数据' }}</p>
            </el-tab-pane>
            <!-- 有视频链接才显示视频资料 Tab -->
            <el-tab-pane v-if="species.videoUrl" label="🎬 视频资料">
              <!-- 视频预览卡片：点击弹出播放 -->
              <div class="video-preview-card" @click="videoDialogVisible = true">
                <div class="video-preview-content">
                  <el-icon class="video-preview-icon"><VideoPlay /></el-icon>
                  <div class="video-preview-info">
                    <div class="video-preview-title">点击播放视频</div>
                    <div class="video-preview-url">{{ species.videoUrl }}</div>
                  </div>
                </div>
                <el-button type="primary" size="small" plain @click.stop="openVideoLink">
                  在新窗口打开 ↗
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <!-- 地理分布 -->
        <el-card class="info-card" style="margin-bottom: 16px">
          <template #header><span class="sec-title">🗺️ 地理分布</span></template>
          <p class="detail-text" style="margin-bottom: 12px">{{ species.distribution }}</p>
          <div v-if="species.longitude && species.latitude" class="coord-info">
            <el-tag>经度: {{ species.longitude }}°E</el-tag>
            <el-tag>纬度: {{ species.latitude }}°N</el-tag>
          </div>
          <!-- 小地图 -->
          <div v-if="species.longitude" ref="mapRef" class="mini-map"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 视频播放 Dialog -->
    <el-dialog
      v-model="videoDialogVisible"
      title="🎬 视频资料"
      width="760px"
      :close-on-click-modal="true"
      destroy-on-close
      class="video-dialog"
    >
      <!-- B站 iframe -->
      <div v-if="bilibiliEmbedUrl" class="video-wrapper">
        <iframe
          :src="bilibiliEmbedUrl"
          scrolling="no"
          border="0"
          frameborder="no"
          framespacing="0"
          allowfullscreen="true"
          class="video-iframe"
        ></iframe>
      </div>

      <!-- YouTube iframe -->
      <div v-else-if="youtubeEmbedUrl" class="video-wrapper">
        <iframe
          :src="youtubeEmbedUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="video-iframe"
        ></iframe>
      </div>

      <!-- 原生 video -->
      <div v-else-if="isDirectVideo" class="video-wrapper">
        <video controls autoplay class="video-native" :src="species.videoUrl">
          您的浏览器不支持 video 标签
        </video>
      </div>

      <!-- 其他链接 -->
      <div v-else class="video-external">
        <el-icon style="font-size:48px; color:#0077b6; margin-bottom:16px"><VideoPlay /></el-icon>
        <p style="color:#0077b6; word-break:break-all; margin-bottom:16px">{{ species.videoUrl }}</p>
        <el-button type="primary" @click="openVideoLink">在新窗口打开观看 ↗</el-button>
      </div>

      <template #footer>
        <el-button @click="videoDialogVisible = false">关闭</el-button>
        <el-button type="primary" plain @click="openVideoLink">在新窗口打开 ↗</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else description="物种不存在" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Back, Edit, Delete, VideoPlay } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'
import L from 'leaflet'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()
const mapRef = ref()
let map = null
const videoDialogVisible = ref(false)

const species = computed(() => dataStore.getSpeciesById(parseInt(route.params.id)))

// ---- 视频解析 ----
// 检测是否 B站链接，返回 embed URL（支持 BV 号 / av 号 / 短链）
const bilibiliEmbedUrl = computed(() => {
  const url = species.value?.videoUrl || ''
  if (!url) return ''
  // 匹配 BV 号
  const bvMatch = url.match(/BV([a-zA-Z0-9]+)/)
  if (bvMatch) return `https://player.bilibili.com/player.html?bvid=BV${bvMatch[1]}&autoplay=0`
  // 匹配 av 号
  const avMatch = url.match(/av(\d+)/i)
  if (avMatch) return `https://player.bilibili.com/player.html?aid=${avMatch[1]}&autoplay=0`
  return ''
})

// 检测是否 YouTube 链接，返回 embed URL
const youtubeEmbedUrl = computed(() => {
  const url = species.value?.videoUrl || ''
  if (!url) return ''
  // youtu.be/ID 或 youtube.com/watch?v=ID 或 youtube.com/embed/ID
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://www.youtube.com/embed/${match[1]}`
  return ''
})

// 检测是否直链视频文件
const isDirectVideo = computed(() => {
  const url = species.value?.videoUrl || ''
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
})

// 打开外部链接
const openVideoLink = () => {
  window.open(species.value?.videoUrl, '_blank', 'noopener')
}
// ---- end 视频解析 ----

const speciesEmoji = (phylum) => {
  const map = {
    '脊索动物门': '🐬',
    '刺胞动物门': '🪸',
    '节肢动物门': '🦀',
    '褐藻门': '🌿'
  }
  return map[phylum] || '🐠'
}

const protectionTagType = (level) => {
  const map = { '国家一级': 'danger', '国家二级': 'warning', '省级': 'success', '无': 'info', '国际公约': '' }
  return map[level] || 'info'
}

const endangeredTagType = (status) => {
  const map = { CR: 'danger', EN: 'danger', VU: 'warning', NT: '', LC: 'success', DD: 'info' }
  return map[status] || ''
}

const endangeredLabel = (status) => {
  const map = { CR: '极危', EN: '濒危', VU: '易危', NT: '近危', LC: '无危', DD: '数据缺乏' }
  return map[status] || ''
}

onMounted(() => {
  if (species.value?.longitude && mapRef.value) {
    setTimeout(() => {
      map = L.map(mapRef.value, { preferCanvas: true }).setView([species.value.latitude, species.value.longitude], 7)
      // 高德地图瓦片（国内可访问，GCJ-02坐标系）
      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        attribution: '© 高德地图',
        maxZoom: 18
      }).addTo(map)
      L.marker([species.value.latitude, species.value.longitude])
        .addTo(map)
        .bindPopup(`<b>${species.value.chineseName}</b><br>${species.value.distribution}`)
        .openPopup()
    }, 100)
  }
})

onUnmounted(() => { if (map) map.remove() })

const handleDelete = () => {
  ElMessageBox.confirm(`确定要删除 "${species.value.chineseName}" 吗？此操作不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await dataStore.deleteSpecies(species.value.id)
    ElMessage.success('删除成功')
    router.push('/species')
  }).catch(() => {})
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.info-card { height: fit-content; }

.species-hero {
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #e0f3ff, #caf0f8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.hero-img { width: 100%; height: 100%; object-fit: cover; }
.hero-placeholder {
  font-size: 80px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.species-main-name {
  font-size: 22px;
  font-weight: 700;
  color: #03045e;
  margin-bottom: 4px;
}

.species-main-latin {
  font-style: italic;
  color: #666;
  margin-bottom: 12px;
}

.status-tags { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }

.meta-desc { margin-top: 12px; }

.sec-title { font-weight: 600; color: #03045e; }

.detail-text {
  line-height: 1.8;
  color: #444;
  font-size: 14px;
}

.coord-info { display: flex; gap: 8px; margin-bottom: 12px; }

.mini-map {
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

/* 生物特征卡片：tab 内容区固定最小高度，切换 tab 时高度稳定 */
.info-card :deep(.el-tab-pane) {
  min-height: 80px;
}

/* 视频预览卡片（Tab 内的入口） */
.video-preview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f0f8ff;
  border: 1px dashed #90caf9;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.video-preview-card:hover {
  background: #e1f1ff;
  border-color: #4da6ff;
}
.video-preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.video-preview-icon {
  font-size: 28px;
  color: #0077b6;
  flex-shrink: 0;
}
.video-preview-info {
  flex: 1;
  min-width: 0;
}
.video-preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #0077b6;
  margin-bottom: 2px;
}
.video-preview-url {
  font-size: 12px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dialog 内视频区域 */
.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}
.video-iframe,
.video-native {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.video-external {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  text-align: center;
}
</style>
