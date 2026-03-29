<template>
  <div class="pending-page">
    <div class="page-header">
      <div>
        <h2>📋 观测记录审批</h2>
        <p class="subtitle">审核学生提交的观测记录，通过后将公开显示</p>
      </div>
      <el-button :icon="Refresh" @click="loadPending">刷新</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="8">
        <div class="stat-card pending">
          <div class="stat-num">{{ stats.pending }}</div>
          <div class="stat-label">⏳ 待审批</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card approved">
          <div class="stat-num">{{ stats.approved }}</div>
          <div class="stat-label">✅ 已通过</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card rejected">
          <div class="stat-num">{{ stats.rejected }}</div>
          <div class="stat-label">❌ 已拒绝</div>
        </div>
      </el-col>
    </el-row>

    <!-- 标签页：待审批 / 全部历史 -->
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="⏳ 待审批" name="pending">
        <el-table :data="pendingList" v-loading="loading" border stripe style="width: 100%">
          <el-table-column prop="title" label="观测主题" min-width="200" />
          <el-table-column prop="observedAt" label="观测时间" width="160" />
          <el-table-column prop="ecosystemName" label="生态系统" width="140" />
          <el-table-column prop="createdBy" label="提交人" width="100" />
          <el-table-column label="关联物种" width="200">
            <template #default="{ row }">
              <el-tag
                v-for="sp in (row.species || []).slice(0, 3)"
                :key="sp.speciesId"
                size="small"
                style="margin: 2px"
              >{{ sp.speciesName }}</el-tag>
              <span v-if="row.species?.length > 3" style="color:#999;font-size:12px">+{{ row.species.length - 3 }}</span>
              <span v-if="!row.species?.length" style="color:#ccc">无</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="viewDetail(row)">查看</el-button>
              <el-button size="small" type="success" @click="openApprove(row, 'approve')">通过</el-button>
              <el-button size="small" type="danger" @click="openApprove(row, 'reject')">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !pendingList.length" description="暂无待审批记录 🎉" />
      </el-tab-pane>

      <el-tab-pane label="📜 审批历史" name="history">
        <el-table :data="historyList" v-loading="loading" border stripe style="width: 100%">
          <el-table-column prop="title" label="观测主题" min-width="200" />
          <el-table-column prop="createdBy" label="提交人" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reviewedBy" label="审批人" width="100" />
          <el-table-column prop="reviewRemark" label="审批意见" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="showApprove"
      :title="approveAction === 'approve' ? '✅ 审批通过' : '❌ 拒绝申请'"
      width="440px"
    >
      <div style="margin-bottom: 12px; color: #666">
        观测主题：<strong>{{ currentRecord?.title }}</strong>
      </div>
      <el-form label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approveRemark"
            type="textarea"
            :rows="3"
            :placeholder="approveAction === 'approve' ? '填写审批通过意见（可选）' : '填写拒绝原因（可选）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApprove = false">取消</el-button>
        <el-button
          :type="approveAction === 'approve' ? 'success' : 'danger'"
          :loading="approving"
          @click="submitApprove"
        >
          {{ approveAction === 'approve' ? '确认通过' : '确认拒绝' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetail" title="观测记录详情" width="600px">
      <template v-if="detailRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="观测主题" :span="2">{{ detailRecord.title }}</el-descriptions-item>
          <el-descriptions-item label="观测时间">{{ detailRecord.observedAt }}</el-descriptions-item>
          <el-descriptions-item label="生态系统">{{ detailRecord.ecosystemName }}</el-descriptions-item>
          <el-descriptions-item label="经度">{{ detailRecord.longitude }}</el-descriptions-item>
          <el-descriptions-item label="纬度">{{ detailRecord.latitude }}</el-descriptions-item>
          <el-descriptions-item label="观测人员">{{ detailRecord.observers }}</el-descriptions-item>
          <el-descriptions-item label="天气">{{ detailRecord.weatherCondition }}</el-descriptions-item>
          <el-descriptions-item label="水温">{{ detailRecord.waterTemp ?? '-' }} °C</el-descriptions-item>
          <el-descriptions-item label="盐度">{{ detailRecord.salinity ?? '-' }} ‰</el-descriptions-item>
          <el-descriptions-item label="提交人">{{ detailRecord.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(detailRecord.status)" size="small">{{ statusLabel(detailRecord.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRecord.notes || '无' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detailRecord.species?.length" style="margin-top: 16px">
          <strong>关联物种：</strong>
          <el-tag v-for="sp in detailRecord.species" :key="sp.speciesId" style="margin: 4px">
            {{ sp.speciesName }} × {{ sp.count }}
            <span v-if="sp.behavior">（{{ sp.behavior }}）</span>
          </el-tag>
        </div>
      </template>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <template v-if="detailRecord?.status === 'pending'">
          <el-button type="success" @click="openApprove(detailRecord, 'approve'); showDetail = false">通过</el-button>
          <el-button type="danger" @click="openApprove(detailRecord, 'reject'); showDetail = false">拒绝</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
function getHeaders() {
  const token = localStorage.getItem('marine_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const loading = ref(false)
const activeTab = ref('pending')
const pendingList = ref([])
const historyList = ref([])
const stats = reactive({ pending: 0, approved: 0, rejected: 0 })

// 审批弹窗
const showApprove = ref(false)
const approveAction = ref('approve')
const approveRemark = ref('')
const currentRecord = ref(null)
const approving = ref(false)

// 详情弹窗
const showDetail = ref(false)
const detailRecord = ref(null)

async function loadPending() {
  loading.value = true
  try {
    const res = await fetch(`${BASE}/observations/pending`, { headers: getHeaders() })
    const json = await res.json()
    if (json.success) {
      pendingList.value = json.data
      stats.pending = json.data.length
    }
  } catch (err) {
    ElMessage.error('加载失败：' + err.message)
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await fetch(`${BASE}/observations`, { headers: getHeaders() })
    const json = await res.json()
    if (json.success) {
      historyList.value = json.data.filter(o => o.status !== 'pending')
      stats.approved = historyList.value.filter(o => o.status === 'approved').length
      stats.rejected = historyList.value.filter(o => o.status === 'rejected').length
    }
  } catch {}
  loading.value = false
}

function onTabChange(tab) {
  if (tab === 'history') loadHistory()
}

function statusTag(s) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning'
}
function statusLabel(s) {
  return s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审批'
}

function viewDetail(row) {
  detailRecord.value = row
  showDetail.value = true
}

function openApprove(row, action) {
  currentRecord.value = row
  approveAction.value = action
  approveRemark.value = ''
  showApprove.value = true
}

async function submitApprove() {
  if (!currentRecord.value) return
  approving.value = true
  try {
    const endpoint = approveAction.value === 'approve' ? 'approve' : 'reject'
    const res = await fetch(`${BASE}/observations/${currentRecord.value.id}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ remark: approveRemark.value })
    })
    const json = await res.json()
    if (json.success) {
      ElMessage.success(approveAction.value === 'approve' ? '✅ 审批通过，已公开显示' : '已拒绝该记录')
      showApprove.value = false
      loadPending()
    } else {
      ElMessage.error(json.message)
    }
  } catch (err) {
    ElMessage.error('操作失败：' + err.message)
  } finally {
    approving.value = false
  }
}

onMounted(() => {
  loadPending()
})
</script>

<style scoped>
.pending-page { max-width: 1100px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-header h2 { font-size: 20px; color: #03045e; margin: 0 0 4px; }
.subtitle { color: #666; font-size: 13px; margin: 0; }

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border-left: 4px solid #ccc;
}
.stat-card.pending { border-left-color: #e6a23c; }
.stat-card.approved { border-left-color: #67c23a; }
.stat-card.rejected { border-left-color: #f56c6c; }
.stat-num { font-size: 32px; font-weight: 700; color: #03045e; }
.stat-label { font-size: 14px; color: #666; margin-top: 4px; }
</style>
