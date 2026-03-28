import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../store/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据看板', icon: 'DataBoard' }
      },
      {
        path: 'species',
        name: 'SpeciesList',
        component: () => import('../views/species/SpeciesList.vue'),
        meta: { title: '物种管理', icon: 'Fish' }
      },
      {
        path: 'species/add',
        name: 'SpeciesAdd',
        component: () => import('../views/species/SpeciesForm.vue'),
        meta: { title: '添加物种', requiresRole: ['admin', 'researcher'] }
      },
      {
        path: 'species/:id',
        name: 'SpeciesDetail',
        component: () => import('../views/species/SpeciesDetail.vue'),
        meta: { title: '物种详情' }
      },
      {
        path: 'species/:id/edit',
        name: 'SpeciesEdit',
        component: () => import('../views/species/SpeciesForm.vue'),
        meta: { title: '编辑物种', requiresRole: ['admin', 'researcher'] }
      },
      {
        path: 'observations',
        name: 'ObservationList',
        component: () => import('../views/observation/ObservationList.vue'),
        meta: { title: '观测记录', icon: 'Location' }
      },
      {
        path: 'observations/add',
        name: 'ObservationAdd',
        component: () => import('../views/observation/ObservationForm.vue'),
        meta: { title: '新增观测', requiresRole: ['admin', 'researcher'] }
      },
      {
        path: 'observations/:id',
        name: 'ObservationDetail',
        component: () => import('../views/observation/ObservationDetail.vue'),
        meta: { title: '观测详情' }
      },
      {
        path: 'ecosystems',
        name: 'Ecosystems',
        component: () => import('../views/Ecosystems.vue'),
        meta: { title: '生态系统', icon: 'TreeFilled' }
      },
      {
        path: 'map',
        name: 'MapView',
        component: () => import('../views/MapView.vue'),
        meta: { title: '分布地图', icon: 'MapLocation' }
      },
      {
        path: 'analytics',
        name: 'Analytics',
        component: () => import('../views/Analytics.vue'),
        meta: { title: '统计分析', icon: 'TrendCharts' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户管理', icon: 'UserFilled', requiresRole: ['admin'] }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人资料' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    next('/login')
    return
  }
  
  if (to.meta.requiresRole && !to.meta.requiresRole.includes(authStore.user?.role)) {
    next('/dashboard')
    return
  }
  
  document.title = to.meta.title ? `${to.meta.title} - 海洋生物多样性信息管理系统` : '海洋生物多样性信息管理系统'
  next()
})

export default router
