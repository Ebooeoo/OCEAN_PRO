<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6" v-for="stat in stats" :key="stat.label">
        <div class="stat-card card-hover" :style="{ borderTop: `4px solid ${stat.color}` }">
          <div class="stat-icon" :style="{ background: `${stat.color}20` }">
            <span>{{ stat.icon }}</span>
          </div>
          <div class="stat-info">
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <!-- 物种保护等级饼图 -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">🛡️ 保护等级分布</span>
          </template>
          <div ref="pieChart1Ref" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <!-- 濒危状态分布 -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">⚠️ 濒危状态统计</span>
          </template>
          <div ref="pieChart2Ref" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <!-- 门纲分布 -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">🌊 门纲分布统计</span>
          </template>
          <div ref="barChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最新物种 & 最新观测 -->
    <el-row :gutter="20" class="table-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="table-header">
              <span class="card-title">🐠 最新录入物种</span>
              <el-button text type="primary" @click="$router.push('/species')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentSpecies" size="small" stripe>
            <el-table-column prop="chineseName" label="中文名" />
            <el-table-column prop="protectionLevel" label="保护等级">
              <template #default="{ row }">
                <el-tag :type="protectionTagType(row.protectionLevel)" size="small">{{ row.protectionLevel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="endangeredStatus" label="濒危状态">
              <template #default="{ row }">
                <el-tag :type="endangeredTagType(row.endangeredStatus)" size="small">{{ row.endangeredStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="录入时间" width="100" />
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="table-header">
              <span class="card-title">📍 最新观测记录</span>
              <el-button text type="primary" @click="$router.push('/observations')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentObs" size="small" stripe>
            <el-table-column prop="title" label="观测主题" show-overflow-tooltip />
            <el-table-column prop="observers" label="观测人员" width="100" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="观测日期" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useDataStore } from '../store/data.js'

const dataStore = useDataStore()

const pieChart1Ref = ref()
const pieChart2Ref = ref()
const barChartRef = ref()
let charts = []

const stats = computed(() => [
  { label: '物种总数', value: dataStore.speciesCount, icon: '🐠', color: '#0077b6' },
  { label: '观测记录', value: dataStore.observationCount, icon: '📍', color: '#00b4d8' },
  { label: '生态系统', value: dataStore.ecosystemCount, icon: '🌊', color: '#48cae4' },
  { label: '国家一级保护', value: Object.values(dataStore.species.filter(s => s.protectionLevel === '国家一级')).length, icon: '🛡️', color: '#f77f00' }
])

const recentSpecies = computed(() => [...dataStore.species].reverse().slice(0, 5))
const recentObs = computed(() => [...dataStore.observations].reverse().slice(0, 5))

const protectionTagType = (level) => {
  const map = { '国家一级': 'danger', '国家二级': 'warning', '省级': 'success', '无': 'info' }
  return map[level] || 'info'
}

const endangeredTagType = (status) => {
  const map = { CR: 'danger', EN: 'danger', VU: 'warning', NT: '', LC: 'success', DD: 'info' }
  return map[status] || ''
}

onMounted(async () => {
  // 若数据尚未加载（如直接刷新进入Dashboard），主动拉取
  if (!dataStore.species.length || !dataStore.observations.length) {
    await dataStore.loadAll()
  }
  await nextTick()
  initCharts()
})

onUnmounted(() => {
  charts.forEach(c => c.dispose())
})

const initCharts = () => {
  // 保护等级饼图
  const chart1 = echarts.init(pieChart1Ref.value)
  charts.push(chart1)
  const protStats = dataStore.protectionStats
  chart1.setOption({
    color: ['#e63946', '#f77f00', '#2ec4b6', '#6c757d'],
    tooltip: { trigger: 'item', formatter: '{b}: {c}种 ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: Object.entries(protStats).map(([name, value]) => ({ name, value })),
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } }
    }]
  })

  // 濒危状态
  const chart2 = echarts.init(pieChart2Ref.value)
  charts.push(chart2)
  const endStats = dataStore.endangeredStats
  const endColors = { CR: '#e63946', EN: '#f77f00', VU: '#ffd166', NT: '#06d6a0', LC: '#118ab2', DD: '#adb5bd' }
  chart2.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}种' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: Object.entries(endStats).filter(([,v]) => v > 0).map(([name, value]) => ({
        name, value, itemStyle: { color: endColors[name] }
      })),
      label: { show: false }
    }]
  })

  // 门纲分布柱图
  const chart3 = echarts.init(barChartRef.value)
  charts.push(chart3)
  const phylumStats = dataStore.phylumStats
  const entries = Object.entries(phylumStats).sort((a, b) => b[1] - a[1])
  chart3.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '20%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: entries.map(e => e[0].replace('门', '')),
      axisLabel: { rotate: 30, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '物种数' },
    series: [{
      type: 'bar',
      data: entries.map(e => e[1]),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#00b4d8' },
          { offset: 1, color: '#0077b6' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  })
}
</script>

<style scoped>
.dashboard {}

.stat-row { margin-bottom: 20px; }

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 119, 182, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #999;
}

.chart-row { margin-bottom: 20px; }

.chart-card {}

.chart-container {
  height: 220px;
}

.card-title {
  font-weight: 600;
  color: #03045e;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
