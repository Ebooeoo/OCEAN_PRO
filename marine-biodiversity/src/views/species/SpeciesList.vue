<template>
  <div class="species-list">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input v-model="filters.name" placeholder="搜索物种名称/学名" :prefix-icon="Search" clearable @input="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.phylum" placeholder="选择门纲" clearable @change="handleSearch">
            <el-option v-for="p in phylumOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.protectionLevel" placeholder="保护等级" clearable @change="handleSearch">
            <el-option label="国家一级" value="国家一级" />
            <el-option label="国家二级" value="国家二级" />
            <el-option label="省级" value="省级" />
            <el-option label="国际公约" value="国际公约" />
            <el-option label="无" value="无" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.endangeredStatus" placeholder="濒危状态" clearable @change="handleSearch">
            <el-option v-for="s in ['CR','EN','VU','NT','LC','DD']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-col>
        <el-col :span="6" style="text-align: right">
          <el-button @click="resetFilters">重置</el-button>
          <el-button v-if="authStore.canEdit" type="primary" :icon="Plus" @click="$router.push('/species/add')">
            添加物种
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 视图切换 -->
    <div class="view-toggle">
      <span class="result-count">共 {{ filteredSpecies.length }} 条记录</span>
      <el-button-group>
        <el-button :type="viewMode === 'card' ? 'primary' : ''" @click="viewMode = 'card'" :icon="Grid">卡片</el-button>
        <el-button :type="viewMode === 'table' ? 'primary' : ''" @click="viewMode = 'table'" :icon="List">表格</el-button>
      </el-button-group>
    </div>

    <!-- 卡片视图 -->
    <el-row v-if="viewMode === 'card'" :gutter="16">
      <el-col v-for="species in pagedSpecies" :key="species.id" :span="6" style="margin-bottom: 16px">
        <el-card class="species-card card-hover" @click="$router.push(`/species/${species.id}`)">
          <div class="species-img">
            <img
              v-if="species.imageUrl"
              :src="species.imageUrl"
              :alt="species.chineseName"
              class="species-img-real"
              @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
            />
            <div class="species-img-placeholder" :style="species.imageUrl ? 'display:none' : 'display:flex'">
              {{ speciesEmoji(species.phylum) }}
            </div>
          </div>
          <div class="species-info">
            <h3 class="species-name">{{ species.chineseName }}</h3>
            <p class="species-latin">{{ species.latinName }}</p>
            <div class="species-tags">
              <el-tag :type="protectionTagType(species.protectionLevel)" size="small">{{ species.protectionLevel }}</el-tag>
              <el-tag :type="endangeredTagType(species.endangeredStatus)" size="small">{{ species.endangeredStatus }}</el-tag>
            </div>
            <p class="species-family">{{ species.phylum }} · {{ species.class }}</p>
          </div>
          <div v-if="authStore.canEdit" class="species-actions" @click.stop>
            <el-button-group size="small">
              <el-button :icon="Edit" @click="$router.push(`/species/${species.id}/edit`)">编辑</el-button>
              <el-button :icon="Delete" type="danger" @click="handleDelete(species)">删除</el-button>
            </el-button-group>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 表格视图 -->
    <el-card v-else>
      <el-table :data="pagedSpecies" stripe border style="width: 100%" @row-click="(row) => $router.push(`/species/${row.id}`)">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="chineseName" label="中文名" width="120" />
        <el-table-column prop="latinName" label="学名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="phylum" label="门" width="120" />
        <el-table-column prop="class" label="纲" width="100" />
        <el-table-column prop="protectionLevel" label="保护等级" width="100">
          <template #default="{ row }">
            <el-tag :type="protectionTagType(row.protectionLevel)" size="small">{{ row.protectionLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="endangeredStatus" label="濒危状态" width="90">
          <template #default="{ row }">
            <el-tag :type="endangeredTagType(row.endangeredStatus)" size="small">{{ row.endangeredStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="distribution" label="分布区域" show-overflow-tooltip />
        <el-table-column prop="createdBy" label="录入人" width="90" />
        <el-table-column label="操作" width="150" v-if="authStore.canEdit">
          <template #default="{ row }">
            <el-button size="small" @click.stop="$router.push(`/species/${row.id}/edit`)">编辑</el-button>
            <el-button size="small" type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[8, 16, 24, 48]"
        :total="filteredSpecies.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Plus, Grid, List, Edit, Delete } from '@element-plus/icons-vue'
import { useDataStore } from '../../store/data.js'
import { useAuthStore } from '../../store/auth.js'

const dataStore = useDataStore()
const authStore = useAuthStore()

const viewMode = ref('card')
const currentPage = ref(1)
const pageSize = ref(8)

const filters = reactive({ name: '', phylum: '', protectionLevel: '', endangeredStatus: '' })

const phylumOptions = computed(() => [...new Set(dataStore.species.map(s => s.phylum))])

const filteredSpecies = computed(() => dataStore.searchSpecies(filters))

const pagedSpecies = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSpecies.value.slice(start, start + pageSize.value)
})

const handleSearch = () => { currentPage.value = 1 }
const resetFilters = () => {
  Object.assign(filters, { name: '', phylum: '', protectionLevel: '', endangeredStatus: '' })
  currentPage.value = 1
}

const protectionTagType = (level) => {
  const map = { '国家一级': 'danger', '国家二级': 'warning', '省级': 'success', '无': 'info', '国际公约': '' }
  return map[level] || 'info'
}

const endangeredTagType = (status) => {
  const map = { CR: 'danger', EN: 'danger', VU: 'warning', NT: '', LC: 'success', DD: 'info' }
  return map[status] || ''
}

const speciesEmoji = (phylum) => {
  const map = {
    '脊索动物门': '🐬',
    '刺胞动物门': '🪸',
    '节肢动物门': '🦀',
    '褐藻门': '🌿'
  }
  return map[phylum] || '🐠'
}

const handleDelete = (species) => {
  ElMessageBox.confirm(`确定要删除 "${species.chineseName}" 吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await dataStore.deleteSpecies(species.id)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败：' + err.message)
    }
  }).catch(() => {})
}
</script>

<style scoped>
.search-card { margin-bottom: 16px; }

.view-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-count {
  color: #666;
  font-size: 14px;
}

.species-card {
  cursor: pointer;
  overflow: hidden;
}

.species-img {
  height: 160px;
  overflow: hidden;
  background: linear-gradient(135deg, #e0f3ff, #caf0f8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -16px -16px 12px -16px;
}

.species-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.species-img-real {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.species-card:hover .species-img-real {
  transform: scale(1.05);
}

.species-img-placeholder {
  font-size: 64px;
  opacity: 0.6;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.species-name {
  font-size: 16px;
  font-weight: 600;
  color: #03045e;
  margin-bottom: 4px;
}

.species-latin {
  font-size: 12px;
  color: #999;
  font-style: italic;
  margin-bottom: 8px;
}

.species-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.species-family {
  font-size: 12px;
  color: #0077b6;
}

.species-actions {
  margin-top: 10px;
  border-top: 1px solid #f0f8ff;
  padding-top: 10px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>
