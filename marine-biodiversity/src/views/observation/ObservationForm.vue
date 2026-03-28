<template>
  <div class="obs-form">
    <div class="page-header">
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
      <h2>新增观测记录</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
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
          <el-select v-model="sp.speciesId" placeholder="选择物种" style="flex: 2" @change="(val) => onSpeciesChange(val, idx)">
            <el-option v-for="s in dataStore.species" :key="s.id" :label="s.chineseName" :value="s.id" />
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
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存观测记录</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Delete } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'

const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()
const formRef = ref()
const submitting = ref(false)

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
    await dataStore.addObservation({ ...form, createdBy: authStore.user?.name })
    ElMessage.success('观测记录添加成功')
    router.push('/observations')
  } catch (err) {
    ElMessage.error('保存失败：' + err.message)
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.page-header h2 { font-size: 18px; color: #03045e; }
.sec-title { font-weight: 600; color: #03045e; }
.species-row { display: flex; gap: 12px; margin-bottom: 10px; align-items: center; }
.form-actions { text-align: center; padding: 16px; }
</style>
