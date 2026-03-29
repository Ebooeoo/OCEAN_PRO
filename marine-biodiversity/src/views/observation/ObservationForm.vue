<template>
  <div class="obs-form">
    <div class="page-header">
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
      <h2>{{ isEdit ? '编辑观测记录' : '新增观测记录' }}</h2>
      <!-- 学生提交提示 -->
      <el-alert
        v-if="authStore.user?.role === 'student' && !isEdit"
        type="info"
        :closable="false"
        style="margin-left: 16px; flex: 1"
        show-icon
      >
        <template #title>学生提交的观测记录将发送给科研人员审批，审批通过后才会公开显示</template>
      </el-alert>
    </div>

    <div v-if="loading" style="text-align: center; padding: 40px">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p style="color: #999; margin-top: 12px">加载数据中...</p>
    </div>

    <el-form v-else ref="formRef" :model="form" :rules="rules" label-width="120px">
      <!-- 基本信息 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">📋 观测基本信息</span></template>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="观测主题" prop="title">
              <el-input v-model="form.title" placeholder="如：珠江口白海豚种群调查" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="观测时间" prop="observedAt">
              <el-date-picker v-model="form.observedAt" type="datetime" placeholder="选择观测时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生态系统" prop="ecosystemId">
              <el-select v-model="form.ecosystemId" placeholder="选择生态系统" style="width: 100%" @change="onEcoChange">
                <el-option v-for="e in dataStore.ecosystems" :key="e.id" :label="e.name" :value="e.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经度" prop="longitude">
              <el-input-number v-model="form.longitude" :precision="4" :min="-180" :max="180" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度" prop="latitude">
              <el-input-number v-model="form.latitude" :precision="4" :min="-90" :max="90" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="观测人员">
              <el-input v-model="form.observers" placeholder="多人请用逗号分隔" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 环境参数 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">🌊 环境参数</span></template>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="水温(°C)">
              <el-input-number v-model="form.waterTemp" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="盐度(‰)">
              <el-input-number v-model="form.salinity" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="深度(m)">
              <el-input-number v-model="form.depth" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="天气状况">
              <el-select v-model="form.weatherCondition" style="width: 100%">
                <el-option v-for="w in ['晴', '多云', '阴', '小雨', '大雨', '风暴']" :key="w" :label="w" :value="w" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 关联物种 -->
      <el-card style="margin-bottom: 16px">
        <template #header>
          <div style="display: flex; justify-content: space-between">
            <span class="sec-title">🐠 关联物种记录</span>
            <el-button size="small" type="primary" @click="addSpeciesRecord">+ 添加物种</el-button>
          </div>
        </template>
        <div v-for="(sp, idx) in form.species" :key="idx" class="species-row">
          <!-- 物种下拉：末尾加"添加新物种"入口（仅学生可见） -->
          <el-select
            v-model="sp.speciesId"
            placeholder="选择物种"
            style="flex: 2"
            filterable
            @change="(val) => onSpeciesChange(val, idx)"
          >
            <el-option v-for="s in dataStore.species" :key="s.id" :label="s.chineseName" :value="s.id" />
            <!-- 学生专属：添加新物种 -->
            <template v-if="authStore.user?.role === 'student'" #footer>
              <div class="add-species-footer" @click.stop="openQuickAddSpecies(idx)">
                <el-icon><Plus /></el-icon>
                <span>未找到？点击添加新物种</span>
              </div>
            </template>
          </el-select>
          <el-input-number v-model="sp.count" :min="1" placeholder="数量" style="width: 120px" />
          <el-input v-model="sp.behavior" placeholder="行为描述" style="flex: 1" />
          <el-button type="danger" :icon="Delete" @click="form.species.splice(idx, 1)" />
        </div>
        <el-empty v-if="!form.species.length" description="尚未添加物种记录" :image-size="60" />
      </el-card>

      <!-- 备注 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">📝 备注</span></template>
        <el-form-item label="观测备注">
          <el-input v-model="form.notes" type="textarea" :rows="4" placeholder="记录观测的详细情况..." />
        </el-form-item>
      </el-card>

      <div class="form-actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          <template v-if="authStore.user?.role === 'student' && !isEdit">
            📤 提交审批
          </template>
          <template v-else>
            {{ isEdit ? '保存修改' : '保存观测记录' }}
          </template>
        </el-button>
      </div>
    </el-form>

    <!-- ===== 快速添加物种弹窗（学生专用） ===== -->
    <el-dialog v-model="showQuickAdd" title="🐠 添加新物种" width="500px" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" style="margin-bottom: 16px" show-icon>
        <template #title>提交后，该物种信息将同步发送给科研人员审核确认</template>
      </el-alert>
      <el-form ref="quickFormRef" :model="quickForm" :rules="quickRules" label-width="100px">
        <el-form-item label="中文名" prop="chineseName">
          <el-input v-model="quickForm.chineseName" placeholder="如：中华白海豚" />
        </el-form-item>
        <el-form-item label="拉丁学名">
          <el-input v-model="quickForm.latinName" placeholder="如：Sousa chinensis（可选）" />
        </el-form-item>
        <el-form-item label="门">
          <el-input v-model="quickForm.phylum" placeholder="如：脊索动物门" />
        </el-form-item>
        <el-form-item label="纲">
          <el-input v-model="quickForm.classTax" placeholder="如：哺乳纲" />
        </el-form-item>
        <el-form-item label="简要描述">
          <el-input v-model="quickForm.morphology" type="textarea" :rows="3" placeholder="简要描述外形特征..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQuickAdd = false">取消</el-button>
        <el-button type="primary" :loading="quickAdding" @click="submitQuickSpecies">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Delete, Loading, Plus } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'
import { observationsAPI, speciesAPI } from '../../api/http.js'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()
const formRef = ref()
const submitting = ref(false)
const loading = ref(false)

// 编辑模式
const isEdit = computed(() => route.name === 'ObservationEdit' && !!route.params.id)

const form = reactive({
  title: '', observedAt: '', longitude: null, latitude: null,
  ecosystemId: null, ecosystemName: '', observers: authStore.user?.name || '',
  waterTemp: null, salinity: null, depth: null, weatherCondition: '晴',
  notes: '', species: []
})

const rules = {
  title: [{ required: true, message: '请输入观测主题', trigger: 'blur' }],
  observedAt: [{ required: true, message: '请选择观测时间', trigger: 'change' }],
  ecosystemId: [{ required: true, message: '请选择生态系统', trigger: 'change' }],
  longitude: [{ required: true, message: '请输入经度', trigger: 'blur' }],
  latitude: [{ required: true, message: '请输入纬度', trigger: 'blur' }]
}

// ===== 快速添加物种（学生） =====
const showQuickAdd = ref(false)
const quickAdding = ref(false)
const quickTargetIdx = ref(-1)
const quickFormRef = ref()
const quickForm = reactive({
  chineseName: '', latinName: '', phylum: '', classTax: '', morphology: ''
})
const quickRules = {
  chineseName: [{ required: true, message: '请输入中文名', trigger: 'blur' }]
}

function openQuickAddSpecies(idx) {
  quickTargetIdx.value = idx
  Object.assign(quickForm, { chineseName: '', latinName: '', phylum: '', classTax: '', morphology: '' })
  showQuickAdd.value = true
}

async function submitQuickSpecies() {
  try {
    await quickFormRef.value.validate()
  } catch {
    return
  }
  quickAdding.value = true
  try {
    // 提交物种，后端标记为 pending_review 状态
    const res = await speciesAPI.create({
      chineseName: quickForm.chineseName,
      latinName: quickForm.latinName,
      phylum: quickForm.phylum,
      class: quickForm.classTax,
      morphology: quickForm.morphology,
      status: 0  // 0 = 待审批（由科研人员审核）
    })
    const newSpecies = res.data
    // 刷新物种列表
    await dataStore.loadSpecies()
    // 自动选中刚添加的物种
    if (quickTargetIdx.value >= 0 && form.species[quickTargetIdx.value]) {
      form.species[quickTargetIdx.value].speciesId = newSpecies.id
      form.species[quickTargetIdx.value].speciesName = newSpecies.chineseName
    }
    showQuickAdd.value = false
    ElMessage.success(`"${quickForm.chineseName}" 已添加，将随观测记录一起提交审批`)
  } catch (err) {
    ElMessage.error('添加失败：' + err.message)
  } finally {
    quickAdding.value = false
  }
}

onMounted(async () => {
  if (!dataStore.species.length || !dataStore.ecosystems.length) {
    await dataStore.loadAll()
  }
  if (!isEdit.value && route.query.ecosystemId) {
    const preEcoId = parseInt(route.query.ecosystemId)
    form.ecosystemId = preEcoId
    const eco = dataStore.ecosystems.find(e => e.id === preEcoId)
    if (eco) form.ecosystemName = eco.name
  }
  if (isEdit.value) {
    loading.value = true
    try {
      const id = parseInt(route.params.id)
      let existing = dataStore.observations.find(o => o.id === id)
      if (!existing) {
        const res = await observationsAPI.getById(id)
        existing = res.data
      }
      if (existing) {
        Object.assign(form, {
          title: existing.title || '',
          observedAt: existing.observedAt || '',
          longitude: existing.longitude,
          latitude: existing.latitude,
          ecosystemId: existing.ecosystemId,
          ecosystemName: existing.ecosystemName || '',
          observers: existing.observers || '',
          waterTemp: existing.waterTemp,
          salinity: existing.salinity,
          depth: existing.depth,
          weatherCondition: existing.weatherCondition || '晴',
          notes: existing.notes || '',
          species: (existing.species || []).map(s => ({ ...s }))
        })
      }
    } catch (err) {
      ElMessage.error('加载数据失败：' + err.message)
      router.back()
    } finally {
      loading.value = false
    }
  }
})

const addSpeciesRecord = () => {
  form.species.push({ speciesId: null, speciesName: '', count: 1, behavior: '' })
}

const onSpeciesChange = (val, idx) => {
  const sp = dataStore.species.find(s => s.id === val)
  if (sp) form.species[idx].speciesName = sp.chineseName
}

const onEcoChange = (val) => {
  const eco = dataStore.ecosystems.find(e => e.id === val)
  if (eco) form.ecosystemName = eco.name
}

const handleSubmit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请填写所有必填项')
    return
  }
  submitting.value = true
  try {
    const isStudent = authStore.user?.role === 'student'
    if (isEdit.value) {
      await dataStore.updateObservation(parseInt(route.params.id), { ...form })
      ElMessage.success('观测记录已更新')
    } else {
      // 学生提交：带 pending 标记
      await observationsAPI.create({
        ...form,
        createdBy: authStore.user?.name,
        status: isStudent ? 'pending' : 'approved'
      })
      if (isStudent) {
        ElMessage.success('✅ 已提交！等待科研人员审批后公开显示')
      } else {
        ElMessage.success('观测记录添加成功')
      }
    }
    const fromEcoId = route.query.ecosystemId || form.ecosystemId
    if (fromEcoId && isEdit.value) {
      router.push(`/ecosystems/${fromEcoId}`)
    } else {
      router.push('/observations')
    }
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.page-header h2 { font-size: 18px; color: #03045e; white-space: nowrap; }
.sec-title { font-weight: 600; color: #03045e; }
.species-row { display: flex; gap: 12px; margin-bottom: 10px; align-items: center; }
.form-actions { text-align: center; padding: 16px; }

/* 物种下拉底部"添加新物种"按钮 */
.add-species-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #0077b6;
  font-size: 13px;
  cursor: pointer;
  border-top: 1px solid #e8f4fb;
  transition: background 0.2s;
}
.add-species-footer:hover {
  background: #e8f4fb;
  border-radius: 4px;
}
</style>
