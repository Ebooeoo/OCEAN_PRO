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
              <el-button type="primary" @click="handleExport(exp.type)" style="margin-top: 16px">
                导出 {{ exp.format }}
              </el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useDataStore } from '../store/data.js'

const dataStore = useDataStore()
const activeTab = ref('species')

const prot1Ref = ref()
const endRef = ref()
const phylumRef = ref()
const ecoObsRef = ref()
const ecoSpecRef = ref()
const personRef = ref()
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

  // 人员统计
  const personObs = {}
  dataStore.observations.forEach(o => {
    o.observers?.split(',').forEach(p => {
      const name = p.trim()
      personObs[name] = (personObs[name] || 0) + 1
    })
  })
  const c6 = echarts.init(personRef.value)
  charts.push(c6)
  c6.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(personObs) },
    yAxis: { type: 'value', name: '观测次数' },
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
  // 若数据尚未加载（如直接刷新进入Analytics），主动拉取
  if (!dataStore.species.length || !dataStore.observations.length) {
    await dataStore.loadAll()
  }
  await nextTick()
  initSpeciesCharts()
})

onUnmounted(disposeAll)

const exportOptions = [
  { title: '物种数据报表', desc: '导出所有物种信息，包含分类、分布、保护等级等完整数据', icon: '🐠', type: 'species', format: 'CSV' },
  { title: '观测记录报表', desc: '导出全部观测记录，包含环境参数和关联物种信息', icon: '📍', type: 'observations', format: 'CSV' },
  { title: '统计分析报告', desc: '导出系统统计摘要，包含各维度的统计数据', icon: '📊', type: 'summary', format: 'TXT' }
]

const handleExport = (type) => {
  let content = ''
  let filename = ''
  
  if (type === 'species') {
    const headers = ['ID', '中文名', '学名', '门', '纲', '保护等级', '濒危状态', '分布区域', '录入人', '录入时间']
    const rows = dataStore.species.map(s => [s.id, s.chineseName, s.latinName, s.phylum, s.class, s.protectionLevel, s.endangeredStatus, s.distribution, s.createdBy, s.createdAt])
    content = [headers, ...rows].map(r => r.join(',')).join('\n')
    filename = '物种数据_' + new Date().toLocaleDateString() + '.csv'
  } else if (type === 'observations') {
    const headers = ['ID', '主题', '观测时间', '生态系统', '经度', '纬度', '观测人员', '水温', '盐度', '关联物种数']
    const rows = dataStore.observations.map(o => [o.id, o.title, o.observedAt, o.ecosystemName, o.longitude, o.latitude, o.observers, o.waterTemp, o.salinity, o.species?.length || 0])
    content = [headers, ...rows].map(r => r.join(',')).join('\n')
    filename = '观测记录_' + new Date().toLocaleDateString() + '.csv'
  } else {
    content = `海洋生物多样性信息管理系统 - 统计报告\n生成时间: ${new Date().toLocaleString()}\n\n` +
      `=== 物种统计 ===\n总物种数: ${dataStore.speciesCount}\n` +
      Object.entries(dataStore.protectionStats).map(([k,v]) => `${k}: ${v}种`).join('\n') +
      `\n\n=== 观测统计 ===\n总观测次数: ${dataStore.observationCount}\n`
    filename = '统计报告_' + new Date().toLocaleDateString() + '.txt'
  }
  
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  ElMessage.success('导出成功：' + filename)
}
</script>

<style scoped>
.chart-title { font-weight: 600; color: #03045e; }
.chart-md { height: 280px; }
.export-card { text-align: center; padding: 10px; }
.export-icon { font-size: 48px; margin-bottom: 12px; }
.export-card h3 { font-size: 16px; color: #03045e; margin-bottom: 8px; }
.export-card p { font-size: 13px; color: #666; line-height: 1.6; }
</style>
