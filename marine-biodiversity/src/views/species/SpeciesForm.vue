<template>
  <div class="species-form">
    <div class="page-header">
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
      <h2>{{ isEdit ? '编辑物种信息' : '添加新物种' }}</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="form-body">
      <!-- 基本信息 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">📋 基本信息</span></template>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="中文名" prop="chineseName">
              <el-input v-model="form.chineseName" placeholder="如：中华白海豚" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学名（拉丁名）" prop="latinName">
              <el-input v-model="form.latinName" placeholder="如：Sousa chinensis" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 分类信息 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">🔬 分类学信息</span></template>
        <el-row :gutter="20">
          <el-col :span="8" v-for="field in taxonFields" :key="field.key">
            <el-form-item :label="field.label">
              <el-input v-model="form[field.key]" :placeholder="field.placeholder" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 生物特征 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">📖 生物特征</span></template>
        <el-form-item label="形态特征">
          <el-input v-model="form.morphology" type="textarea" :rows="4" placeholder="描述外形特征..." />
        </el-form-item>
        <el-form-item label="生活习性">
          <el-input v-model="form.habits" type="textarea" :rows="4" placeholder="描述生活习性..." />
        </el-form-item>
      </el-card>

      <!-- 分布与保护 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">🗺️ 分布与保护状态</span></template>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="分布区域" prop="distribution">
              <el-input v-model="form.distribution" placeholder="描述地理分布区域" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经度">
              <el-input-number v-model="form.longitude" :min="-180" :max="180" :precision="4" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="纬度">
              <el-input-number v-model="form.latitude" :min="-90" :max="90" :precision="4" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="保护等级" prop="protectionLevel">
              <el-select v-model="form.protectionLevel" style="width: 100%">
                <el-option label="国家一级" value="国家一级" />
                <el-option label="国家二级" value="国家二级" />
                <el-option label="省级" value="省级" />
                <el-option label="国际公约" value="国际公约" />
                <el-option label="无" value="无" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="濒危状态" prop="endangeredStatus">
              <el-select v-model="form.endangeredStatus" style="width: 100%">
                <el-option label="CR - 极危" value="CR" />
                <el-option label="EN - 濒危" value="EN" />
                <el-option label="VU - 易危" value="VU" />
                <el-option label="NT - 近危" value="NT" />
                <el-option label="LC - 无危" value="LC" />
                <el-option label="DD - 数据缺乏" value="DD" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 多媒体与参考 -->
      <el-card style="margin-bottom: 16px">
        <template #header><span class="sec-title">🖼️ 多媒体与参考</span></template>
        <el-form-item label="图片URL">
          <el-input v-model="form.imageUrl" placeholder="输入图片链接地址" />
        </el-form-item>
        <el-form-item label="视频链接">
          <el-input v-model="form.videoUrl" placeholder="输入视频链接地址" />
        </el-form-item>
        <el-form-item label="参考文献">
          <el-input v-model="form.references" type="textarea" :rows="2" placeholder="文献来源..." />
        </el-form-item>
      </el-card>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '添加物种' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'
import { speciesAPI } from '../../api/http.js'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const isEdit = computed(() => !!route.params.id)

const form = reactive({
  chineseName: '', latinName: '', phylum: '', class: '', order: '',
  family: '', genus: '', species: '', morphology: '', habits: '',
  distribution: '', longitude: null, latitude: null,
  protectionLevel: '', endangeredStatus: '', imageUrl: '', videoUrl: '', references: ''
})

const taxonFields = [
  { key: 'phylum', label: '门', placeholder: '如：脊索动物门' },
  { key: 'class', label: '纲', placeholder: '如：哺乳纲' },
  { key: 'order', label: '目', placeholder: '如：鲸目' },
  { key: 'family', label: '科', placeholder: '如：海豚科' },
  { key: 'genus', label: '属', placeholder: '如：白海豚属' },
  { key: 'species', label: '种', placeholder: '如：中华白海豚' }
]

const rules = {
  chineseName: [{ required: true, message: '请输入中文名', trigger: 'blur' }],
  latinName: [{ required: true, message: '请输入学名', trigger: 'blur' }],
  distribution: [{ required: true, message: '请输入分布区域', trigger: 'blur' }],
  protectionLevel: [{ required: true, message: '请选择保护等级', trigger: 'change' }],
  endangeredStatus: [{ required: true, message: '请选择濒危状态', trigger: 'change' }]
}

onMounted(async () => {
  if (isEdit.value) {
    // 优先从内存取，取不到再从后端单条拉取（防止直接刷新编辑页时表单全空）
    let existing = dataStore.getSpeciesById(parseInt(route.params.id))
    if (!existing) {
      try {
        const res = await speciesAPI.getById(parseInt(route.params.id))
        existing = res.data
      } catch {
        ElMessage.error('物种数据加载失败，请返回重试')
        router.back()
        return
      }
    }
    if (existing) Object.assign(form, existing)
  }
})

const handleSubmit = async () => {
  if (!formRef.value) return
  let valid = false
  try {
    await formRef.value.validate()
    valid = true
  } catch {
    valid = false
  }
  if (!valid) {
    ElMessage.warning('请填写所有必填项')
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await dataStore.updateSpecies(parseInt(route.params.id), { ...form })
      ElMessage.success('修改成功')
    } else {
      const createdBy = authStore.user?.name || authStore.user?.username || '未知用户'
      await dataStore.addSpecies({ ...form, createdBy })
      ElMessage.success('添加成功！已跳转到物种列表')
    }
    router.push('/species')
  } catch (err) {
    ElMessage.error('操作失败，请重试')
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h2 { font-size: 18px; color: #03045e; }
.sec-title { font-weight: 600; color: #03045e; }
.form-actions {
  text-align: center;
  padding: 16px;
}
</style>
