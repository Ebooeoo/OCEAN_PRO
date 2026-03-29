<template>
  <div class="analytics">
    <el-tabs v-model="activeTab">
      <!-- 物种统计 -->
      <el-tab-pane label="🐠 物种统计" name="species">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card>
              <template #header><span class="chart-title">保护等级分布</span></template>
              <div ref="prot1Ref" class="chart-md"></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card>
              <template #header><span class="chart-title">濒危状态统计</span></template>
              <div ref="endRef" class="chart-md"></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card>
              <template #header><span class="chart-title">门纲分类统计</span></template>
              <div ref="phylumRef" class="chart-md"></div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
      
      <!-- 观测统计 -->
      <el-tab-pane label="📍 观测统计" name="observations">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header><span class="chart-title">各生态系统观测次数</span></template>
              <div ref="ecoObsRef" class="chart-md"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><span class="chart-title">各生态系统发现物种数</span></template>
              <div ref="ecoSpecRef" class="chart-md"></div>
            </el-card>
          </el-col>
          <el-col :span="24" style="margin-top: 20px">
            <el-card>
              <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span class="chart-title">观测活动时间趋势</span>
                  <el-radio-group v-model="timeDimension" size="small" @change="refreshObsCharts">
                    <el-radio-button value="month">按月</el-radio-button>
                    <el-radio-button value="year">按年</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div ref="timelineRef" class="chart-lg"></div>
            </el-card>
          </el-col>
          <el-col :span="24" style="margin-top: 20px">
            <el-card>
              <template #header><span class="chart-title">观测人员活动统计</span></template>
              <div ref="personRef" class="chart-md"></div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 数据导出 -->
      <el-tab-pane label="📥 数据导出" name="export">
        <el-row :gutter="20">
          <el-col :span="8" v-for="exp in exportOptions" :key="exp.title">
            <el-card class="export-card card-hover">
              <div class="export-icon">{{ exp.icon }}</div>
              <h3>{{ exp.title }}</h3>
              <p>{{ exp.desc }}</p>
              <div class="export-btns">
                <el-button type="primary" @click="handleExport(exp.type, 'xlsx')" style="margin-top: 12px">
                  导出 Excel
                </el-button>
                <el-button @click="handleExport(exp.type, 'csv')" style="margin-top: 12px">
                  导出 CSV
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-card style="margin-top: 20px">
          <template #header><span class="chart-title">💡 导出说明</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="物种数据">包含：中文名、学名、分类学、保护等级、濒危状态、分布区域、录入人等</el-descriptions-item>
            <el-descriptions-item label="观测记录">包含：主题、时间、坐标、生态系统、环境参数、关联物种数等</el-descriptions-item>
            <el-descriptions-item label="统计报告">包含：物种统计、生态系统统计、观测次数趋势等摘要数据</el-descriptions-item>
            <el-descriptions-item label="格式说明">Excel(.xlsx)：包含格式化表头，适合汇报；CSV：纯文本，适合数据处理</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'
import { useDataStore } from '../store/data.js'

const dataStore = useDataStore()
const activeTab = ref('species')
const timeDimension = ref('month')

const prot1Ref = ref()
const endRef = ref()
const phylumRef = ref()
const ecoObsRef = ref()
const ecoSpecRef = ref()
const personRef = ref()
const timelineRef = ref()
let charts = []

const disposeAll = () => { charts.forEach(c => c.dispose()); charts = [] }

const initSpeciesCharts = () => {
  // 保护等级饼
  const c1 = echarts.init(prot1Ref.value)
  charts.push(c1)
  const p = dataStore.protectionStats
  c1.setOption({
    color: ['#e63946','#f77f00','#2ec4b6','#6c757d','#9b59b6'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', radius: ['40%','70%'], center: ['50%','45%'],
      data: Object.entries(p).map(([name, value]) => ({ name, value })),
      label: { show: true, formatter: '{b}: {c}' }
    }]
  })

  // 濒危状态
  const c2 = echarts.init(endRef.value)
  charts.push(c2)
  const e = dataStore.endangeredStats
  const endColors = { CR:'#e63946', EN:'#f77f00', VU:'#ffd166', NT:'#06d6a0', LC:'#118ab2', DD:'#adb5bd' }
  c2.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', radius: ['40%','70%'], center: ['50%','45%'],
      data: Object.entries(e).filter(([,v]) => v > 0).map(([name,val]) => ({ name, value: val, itemStyle: { color: endColors[name] } })),
      label: { show: true, formatter: '{b}: {c}' }
    }]
  })

  // 门纲分布
  const c3 = echarts.init(phylumRef.value)
  charts.push(c3)
  const ph = dataStore.phylumStats
  const entries = Object.entries(ph).sort((a,b) => b[1]-a[1])
  c3.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: entries.map(e => e[0].replace('门','门\n')), axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(e => e[1]),
      itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#00b4d8'},{offset:1,color:'#0077b6'}]), borderRadius: [4,4,0,0] }
    }]
  })
}

// 观测时间趋势统计
const getTimelineData = () => {
  const dim = timeDimension.value
  const map = {}
  dataStore.observations.forEach(o => {
    if (!o.observedAt) return
    const date = new Date(o.observedAt)
    if (isNaN(date.getTime())) return
    const key = dim === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}`
    map[key] = (map[key] || 0) + 1
  })
  // 按时间排序
  const sorted = Object.entries(map).sort((a, b) => a[0] > b[0] ? 1 : -1)
  return { labels: sorted.map(e => e[0]), values: sorted.map(e => e[1]) }
}

const refreshObsCharts = async () => {
  await nextTick()
  initObsCharts()
}

const initObsCharts = () => {
  // 各生态系统观测次数
  const ecoObs = {}
  dataStore.observations.forEach(o => {
    ecoObs[o.ecosystemName] = (ecoObs[o.ecosystemName] || 0) + 1
  })
  const c4 = echarts.init(ecoObsRef.value)
  charts.push(c4)
  c4.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: '60%',
      data: Object.entries(ecoObs).map(([name, value]) => ({ name, value })),
      label: { formatter: '{b}: {c}次' }
    }]
  })

  // 各生态系统物种
  const ecoSpec = {}
  dataStore.observations.forEach(o => {
    const specSet = new Set(o.species?.map(s => s.speciesId) || [])
    ecoSpec[o.ecosystemName] = (ecoSpec[o.ecosystemName] || new Set())
    specSet.forEach(id => ecoSpec[o.ecosystemName].add(id))
  })
  const c5 = echarts.init(ecoSpecRef.value)
  charts.push(c5)
  const ecoSpecEntries = Object.entries(ecoSpec).map(([name, set]) => ({ name, value: set.size }))
  c5.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '25%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: ecoSpecEntries.map(e => e.name), axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', name: '物种数' },
    series: [{ type: 'bar', data: ecoSpecEntries.map(e => e.value),
      itemStyle: { color: '#48cae4', borderRadius: [4,4,0,0] }
    }]
  })

  // 时间趋势折线图
  const tl = getTimelineData()
  const c_tl = echarts.init(timelineRef.value)
  charts.push(c_tl)
  c_tl.setOption({
    tooltip: { trigger: 'axis', formatter: (params) => `${params[0].name}<br/>观测次数：${params[0].value}` },
    grid: { left: '5%', right: '5%', bottom: '12%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: tl.labels, axisLabel: { rotate: tl.labels.length > 12 ? 30 : 0, fontSize: 11 } },
    yAxis: { type: 'value', name: '观测次数', minInterval: 1 },
    series: [{
      type: 'line',
      data: tl.values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#0077b6', width: 2 },
      itemStyle: { color: '#0077b6' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(0,119,182,0.3)'},{offset:1,color:'rgba(0,119,182,0.02)'}]) }
    }]
  })

  // 人员统计
  const personObs = {}
  dataStore.observations.forEach(o => {
    o.observers?.split(',').forEach(p => {
      const name = p.trim()
      if (name) personObs[name] = (personObs[name] || 0) + 1
    })
  })
  const c6 = echarts.init(personRef.value)
  charts.push(c6)
  c6.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(personObs) },
    yAxis: { type: 'value', name: '观测次数', minInterval: 1 },
    series: [{ type: 'bar', data: Object.values(personObs),
      itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#f77f00'},{offset:1,color:'#ffd166'}]), borderRadius: [4,4,0,0] }
    }]
  })
}

watch(activeTab, async (tab) => {
  disposeAll()
  await nextTick()
  await nextTick()
  if (tab === 'species') initSpeciesCharts()
  else if (tab === 'observations') initObsCharts()
})

onMounted(async () => {
  if (!dataStore.species.length || !dataStore.observations.length) {
    await dataStore.loadAll()
  }
  await nextTick()
  initSpeciesCharts()
})

onUnmounted(disposeAll)

const exportOptions = [
  { title: '物种数据报表', desc: '导出所有物种信息，包含分类、分布、保护等级等完整数据', icon: '🐠', type: 'species' },
  { title: '观测记录报表', desc: '导出全部观测记录，包含环境参数和关联物种信息', icon: '📍', type: 'observations' },
  { title: '统计分析报告', desc: '导出系统统计摘要，包含各维度的统计数据', icon: '📊', type: 'summary' }
]

// ===== Excel 导出（使用 xlsx 库） =====
const exportToExcel = (type) => {
  let ws, filename

  if (type === 'species') {
    const headers = ['ID', '中文名', '学名', '门', '纲', '目', '科', '属', '种', '保护等级', '濒危状态', '分布区域', '经度', '纬度', '录入人', '录入时间']
    const rows = dataStore.species.map(s => [
      s.id, s.chineseName, s.latinName, s.phylum, s.class, s.order, s.family, s.genus, s.species,
      s.protectionLevel, s.endangeredStatus, s.distribution, s.longitude, s.latitude, s.createdBy, s.createdAt
    ])
    ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    filename = `物种数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`
    // 设置列宽
    ws['!cols'] = [
      {wch:8},{wch:14},{wch:24},{wch:14},{wch:12},{wch:10},{wch:12},{wch:12},{wch:12},
      {wch:12},{wch:10},{wch:24},{wch:10},{wch:10},{wch:10},{wch:12}
    ]
  } else if (type === 'observations') {
    const headers = ['ID', '观测主题', '观测时间', '生态系统', '经度', '纬度', '观测人员', '水温(°C)', '盐度(‰)', '深度(m)', '天气', '关联物种数', '备注']
    const rows = dataStore.observations.map(o => [
      o.id, o.title, o.observedAt, o.ecosystemName, o.longitude, o.latitude, o.observers,
      o.waterTemp, o.salinity, o.depth, o.weatherCondition, o.species?.length || 0, o.notes
    ])
    ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    filename = `观测记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`
    ws['!cols'] = [
      {wch:8},{wch:24},{wch:18},{wch:16},{wch:10},{wch:10},{wch:16},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12},{wch:30}
    ]
  } else {
    // 统计报告：多Sheet Excel
    const wb = XLSX.utils.book_new()

    // Sheet 1: 物种统计
    const sp = dataStore.protectionStats
    const wsStats = XLSX.utils.aoa_to_sheet([
      ['指标', '数值'],
      ['物种总数', dataStore.speciesCount],
      ['观测总次数', dataStore.observationCount],
      ['生态系统数', dataStore.ecosystemCount],
      [''],
      ['=== 保护等级统计 ==='],
      ...Object.entries(sp).map(([k, v]) => [k, v]),
      [''],
      ['=== 濒危状态统计 ==='],
      ...Object.entries(dataStore.endangeredStats).map(([k, v]) => [k, v]),
    ])
    XLSX.utils.book_append_sheet(wb, wsStats, '统计概览')

    // Sheet 2: 时间趋势
    const tl = getTimelineData()
    const wsTl = XLSX.utils.aoa_to_sheet([
      ['时间', '观测次数'],
      ...tl.labels.map((l, i) => [l, tl.values[i]])
    ])
    XLSX.utils.book_append_sheet(wb, wsTl, '观测时间趋势')

    XLSX.writeFile(wb, `统计报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`)
    ElMessage.success('统计报告已导出')
    return
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
  ElMessage.success('Excel 文件已导出：' + filename)
}

// ===== CSV 导出 =====
const exportToCsv = (type) => {
  let content = '', filename = ''
  if (type === 'species') {
    const headers = ['ID', '中文名', '学名', '门', '纲', '保护等级', '濒危状态', '分布区域', '录入人', '录入时间']
    const rows = dataStore.species.map(s => [s.id, s.chineseName, s.latinName, s.phylum, s.class, s.protectionLevel, s.endangeredStatus, s.distribution, s.createdBy, s.createdAt])
    content = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    filename = `物种数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
  } else if (type === 'observations') {
    const headers = ['ID', '主题', '观测时间', '生态系统', '经度', '纬度', '观测人员', '水温', '盐度', '关联物种数']
    const rows = dataStore.observations.map(o => [o.id, o.title, o.observedAt, o.ecosystemName, o.longitude, o.latitude, o.observers, o.waterTemp, o.salinity, o.species?.length || 0])
    content = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    filename = `观测记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
  } else {
    const tl = getTimelineData()
    content = `海洋生物多样性信息管理系统 - 统计报告\n生成时间: ${new Date().toLocaleString('zh-CN')}\n\n` +
      `物种总数,${dataStore.speciesCount}\n观测总次数,${dataStore.observationCount}\n生态系统数,${dataStore.ecosystemCount}\n\n` +
      `=== 保护等级统计 ===\n` + Object.entries(dataStore.protectionStats).map(([k,v]) => `${k},${v}`).join('\n') +
      `\n\n=== 观测时间趋势 ===\n时间,次数\n` + tl.labels.map((l,i) => `${l},${tl.values[i]}`).join('\n')
    filename = `统计报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
  }
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  ElMessage.success('CSV 文件已导出：' + filename)
}

const handleExport = (type, format) => {
  if (format === 'xlsx') exportToExcel(type)
  else exportToCsv(type)
}
</script>

<style scoped>
.chart-title { font-weight: 600; color: #03045e; }
.chart-md { height: 280px; }
.chart-lg { height: 320px; }
.export-card { text-align: center; padding: 10px; min-height: 200px; }
.export-icon { font-size: 48px; margin-bottom: 12px; }
.export-card h3 { font-size: 16px; color: #03045e; margin-bottom: 8px; }
.export-card p { font-size: 13px; color: #666; line-height: 1.6; }
.export-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
</style>
