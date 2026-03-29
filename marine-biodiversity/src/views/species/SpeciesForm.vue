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
        <el-form-item label="物种图片">
          <div class="image-upload-area">
            <!-- 预览 -->
            <div v-if="form.imageUrl" class="image-preview">
              <el-image :src="form.imageUrl" fit="cover" style="width: 160px; height: 120px; border-radius: 8px;" />
              <el-button size="small" type="danger" @click="form.imageUrl = ''" style="margin-top: 6px">移除图片</el-button>
            </div>
            <div v-else class="image-placeholder" @click="triggerImageUpload">
              <span style="font-size: 32px">📷</span>
              <span style="font-size: 13px; color: #999; margin-top: 6px">点击上传图片</span>
              <el-tag type="info" size="small" style="margin-top: 4px">支持 JPG/PNG/WEBP，≤10MB（自动压缩）</el-tag>
            </div>
            <input ref="imgFileInput" type="file" accept="image/jpeg,image/png,image/webp"
              style="display:none" @change="handleImageUpload" />
          </div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px">
            <el-button size="small" @click="triggerImageUpload" :loading="imgUploading">
              {{ form.imageUrl ? '重新上传' : '本地上传' }}
            </el-button>
            <span style="color: #999; font-size: 12px">或</span>
            <el-input v-model="form.imageUrl" placeholder="粘贴图片URL地址" size="small" style="flex: 1" />
          </div>
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
const imgFileInput = ref()
const imgUploading = ref(false)

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

// 图片本地上传（转base64，自动压缩到 ≤1MB）
const triggerImageUpload = () => {
  if (!imgFileInput.value) {
    ElMessage.error('上传组件未就绪，请刷新页面重试')
    return
  }
  imgFileInput.value.click()
}

// 将图片压缩到目标尺寸（canvas重绘）
const compressImage = (dataUrl, maxWidth = 1200, quality = 0.85) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      // 超宽才等比缩小
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl) // 压缩失败就用原图
    img.src = dataUrl
  })
}

const handleImageUpload = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 10MB')
    e.target.value = ''
    return
  }
  imgUploading.value = true
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      let dataUrl = ev.target.result
      // 超过 1MB base64 就自动压缩
      if (dataUrl.length > 1024 * 1024) {
        ElMessage.info('图片较大，正在自动压缩...')
        dataUrl = await compressImage(dataUrl)
      }
      form.imageUrl = dataUrl
      ElMessage.success('图片加载成功')
    } catch (err) {
      ElMessage.error('图片处理失败，请重试')
      console.error(err)
    } finally {
      imgUploading.value = false
    }
  }
  reader.onerror = () => {
    ElMessage.error('文件读取失败，请重试')
    imgUploading.value = false
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

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

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-placeholder {
  width: 160px;
  height: 120px;
  border: 2px dashed #cce7ff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f0f8ff;
  transition: all 0.2s;
}

.image-placeholder:hover {
  border-color: #0077b6;
  background: #e0f0ff;
}

.form-actions {
  text-align: center;
  padding: 16px;
}
</style>
