<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <span class="logo-emoji">🐬</span>
        <span v-show="!isCollapsed" class="logo-text">海洋生物系统</span>
      </div>
      
      <!-- 导航菜单 -->
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapsed"
        :collapse-transition="false"
        class="sidebar-menu"
        router
        background-color="transparent"
        text-color="#caf0f8"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>数据看板</template>
        </el-menu-item>
        
        <el-menu-item index="/species">
          <el-icon>🐠</el-icon>
          <template #title>物种管理</template>
        </el-menu-item>
        
        <el-menu-item index="/observations">
          <el-icon><Location /></el-icon>
          <template #title>观测记录</template>
        </el-menu-item>
        
        <el-menu-item index="/ecosystems">
          <el-icon><Sugar /></el-icon>
          <template #title>生态系统</template>
        </el-menu-item>
        
        <el-menu-item index="/map">
          <el-icon><MapLocation /></el-icon>
          <template #title>分布地图</template>
        </el-menu-item>
        
        <el-menu-item index="/analytics">
          <el-icon><TrendCharts /></el-icon>
          <template #title>统计分析</template>
        </el-menu-item>
        
        <el-menu-item v-if="authStore.isAdmin" index="/users">
          <el-icon><UserFilled /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
      </el-menu>
      
      <!-- 折叠按钮 -->
      <div class="collapse-btn" @click="isCollapsed = !isCollapsed">
        <el-icon><component :is="isCollapsed ? 'Expand' : 'Fold'" /></el-icon>
      </div>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <!-- 通知 -->
          <el-badge :value="3" class="notification-badge">
            <el-button :icon="Bell" circle size="small" />
          </el-badge>
          
          <!-- 用户信息 -->
          <el-dropdown @command="handleCommand" trigger="click">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ authStore.user?.name?.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ authStore.user?.name }}</span>
              <el-tag :type="roleTagType" size="small">{{ authStore.roleName }}</el-tag>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人资料
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 页面内容 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Bell, ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth.js'
import { useDataStore } from '../store/data.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const dataStore = useDataStore()
const isCollapsed = ref(false)

// 进入布局时自动从后端加载全部数据
onMounted(() => {
  dataStore.loadAll()
})

const currentTitle = computed(() => route.meta.title || '')

const roleTagType = computed(() => {
  const map = { admin: 'danger', researcher: 'warning', student: 'success', public: 'info' }
  return map[authStore.user?.role] || 'info'
})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      authStore.logout()
      router.push('/login')
      ElMessage.success('已安全退出')
    }).catch(() => {})
  } else if (command === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: #f0f8ff;
}

.sidebar {
  background: linear-gradient(180deg, #03045e 0%, #0077b6 100%);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(144, 224, 239, 0.2);
}

.logo-emoji {
  font-size: 28px;
  flex-shrink: 0;
}

.logo-text {
  color: #caf0f8;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-menu {
  flex: 1;
  border: none !important;
  padding: 8px 0;
}

.sidebar-menu :deep(.el-menu-item) {
  margin: 2px 8px;
  border-radius: 8px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(144, 224, 239, 0.2) !important;
  border-left: 3px solid #90e0ef;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(144, 224, 239, 0.1) !important;
}

.collapse-btn {
  padding: 16px;
  text-align: center;
  color: #90e0ef;
  cursor: pointer;
  border-top: 1px solid rgba(144, 224, 239, 0.2);
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: rgba(144, 224, 239, 0.1);
}

.header {
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 8px rgba(0, 119, 182, 0.1);
  height: 60px !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f0f8ff;
}

.user-avatar {
  background: linear-gradient(135deg, #0077b6, #00b4d8);
  color: white;
  font-weight: bold;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.main-content {
  padding: 24px;
  overflow-y: auto;
}
</style>
