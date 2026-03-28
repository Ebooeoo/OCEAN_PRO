import { defineStore } from 'pinia'
import { speciesAPI, observationsAPI, ecosystemsAPI, authAPI } from '../api/http.js'

export const useDataStore = defineStore('data', {
  state: () => ({
    species: [],
    ecosystems: [],
    observations: [],
    users: [],
    logs: [],
    loading: false
  }),

  getters: {
    speciesCount: (state) => state.species.length,
    observationCount: (state) => state.observations.length,
    ecosystemCount: (state) => state.ecosystems.length,

    protectionStats: (state) => {
      const stats = {}
      state.species.forEach(s => {
        stats[s.protectionLevel] = (stats[s.protectionLevel] || 0) + 1
      })
      return stats
    },

    phylumStats: (state) => {
      const stats = {}
      state.species.forEach(s => {
        stats[s.phylum] = (stats[s.phylum] || 0) + 1
      })
      return stats
    },

    endangeredStats: (state) => {
      const stats = { CR: 0, EN: 0, VU: 0, NT: 0, LC: 0, DD: 0 }
      state.species.forEach(s => {
        if (s.endangeredStatus in stats) stats[s.endangeredStatus]++
      })
      return stats
    }
  },

  actions: {
    // ===== 初始化加载 =====
    async loadAll() {
      this.loading = true
      try {
        const [sp, obs, eco, usr] = await Promise.all([
          speciesAPI.getAll(),
          observationsAPI.getAll(),
          ecosystemsAPI.getAll(),
          authAPI.getUsers()
        ])
        this.species = sp.data
        this.observations = obs.data
        this.ecosystems = eco.data
        this.users = usr.data
      } catch (err) {
        console.error('加载数据失败:', err.message)
      } finally {
        this.loading = false
      }
    },

    async loadSpecies(filters = {}) {
      const res = await speciesAPI.getAll(filters)
      this.species = res.data
      return res.data
    },

    // ===== 物种 CRUD =====
    async addSpecies(data) {
      const res = await speciesAPI.create(data)
      this.species.push(res.data)
      return res.data
    },

    async updateSpecies(id, data) {
      const res = await speciesAPI.update(id, data)
      const idx = this.species.findIndex(s => s.id === id)
      if (idx !== -1) this.species[idx] = res.data
      return res.data
    },

    async deleteSpecies(id) {
      await speciesAPI.delete(id)
      this.species = this.species.filter(s => s.id !== id)
    },

    getSpeciesById(id) {
      return this.species.find(s => s.id === id)
    },

    searchSpecies(filters) {
      let result = [...this.species]
      if (filters.name) {
        const q = filters.name.toLowerCase()
        result = result.filter(s =>
          s.chineseName?.toLowerCase().includes(q) ||
          s.latinName?.toLowerCase().includes(q)
        )
      }
      if (filters.phylum) result = result.filter(s => s.phylum === filters.phylum)
      if (filters.protectionLevel) result = result.filter(s => s.protectionLevel === filters.protectionLevel)
      if (filters.endangeredStatus) result = result.filter(s => s.endangeredStatus === filters.endangeredStatus)
      return result
    },

    // ===== 生态系统 CRUD =====
    async addEcosystem(data) {
      const res = await ecosystemsAPI.create(data)
      this.ecosystems.push(res.data)
      return res.data
    },

    async updateEcosystem(id, data) {
      const res = await ecosystemsAPI.update(id, data)
      const idx = this.ecosystems.findIndex(e => e.id === id)
      if (idx !== -1) this.ecosystems[idx] = res.data
      return res.data
    },

    async deleteEcosystem(id) {
      await ecosystemsAPI.delete(id)
      this.ecosystems = this.ecosystems.filter(e => e.id !== id)
    },

    // ===== 观测记录 CRUD =====
    async addObservation(data) {
      const res = await observationsAPI.create(data)
      this.observations.push(res.data)
      return res.data
    },

    async updateObservation(id, data) {
      const res = await observationsAPI.update(id, data)
      const idx = this.observations.findIndex(o => o.id === id)
      if (idx !== -1) this.observations[idx] = res.data
      return res.data
    },

    async deleteObservation(id) {
      await observationsAPI.delete(id)
      this.observations = this.observations.filter(o => o.id !== id)
    }
  }
})
