import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '../store/data.js'

describe('观测记录与生态系统模块 (DataStore - Observations)', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDataStore()
  })

  // TC-OBS-001: 初始观测数据
  it('TC-OBS-001: 初始观测记录数据正确加载', () => {
    expect(store.observationCount).toBeGreaterThan(0)
    expect(store.observations[0]).toHaveProperty('title')
    expect(store.observations[0]).toHaveProperty('longitude')
    expect(store.observations[0]).toHaveProperty('latitude')
  })

  // TC-OBS-002: 添加观测记录
  it('TC-OBS-002: 成功添加观测记录', () => {
    const initialCount = store.observationCount
    const newObs = {
      title: '测试观测记录',
      observedAt: '2024-08-01 10:00',
      longitude: 113.5,
      latitude: 22.3,
      ecosystemId: 1,
      ecosystemName: '珊瑚礁生态系统',
      observers: '测试人员',
      waterTemp: 28.0,
      salinity: 32.0,
      depth: 5.0,
      weatherCondition: '晴',
      notes: '测试备注',
      species: []
    }
    const added = store.addObservation(newObs)
    expect(store.observationCount).toBe(initialCount + 1)
    expect(added.id).toBeTruthy()
    expect(added.title).toBe('测试观测记录')
  })

  // TC-OBS-003: 观测记录关联物种
  it('TC-OBS-003: 观测记录可关联多个物种', () => {
    const obs = store.addObservation({
      title: '多物种观测',
      observedAt: '2024-08-15 09:00',
      longitude: 113.0,
      latitude: 22.0,
      ecosystemId: 1,
      ecosystemName: '珊瑚礁生态系统',
      observers: '张老师',
      species: [
        { speciesId: 1, speciesName: '中华白海豚', count: 3, behavior: '游泳' },
        { speciesId: 2, speciesName: '绿海龟', count: 2, behavior: '觅食' }
      ]
    })
    expect(obs.species).toHaveLength(2)
    expect(obs.species[0].speciesId).toBe(1)
    expect(obs.species[1].speciesId).toBe(2)
  })

  // TC-OBS-004: 编辑观测记录
  it('TC-OBS-004: 成功编辑观测记录', () => {
    const targetId = store.observations[0].id
    store.updateObservation(targetId, { notes: '更新的备注内容' })
    const updated = store.observations.find(o => o.id === targetId)
    expect(updated.notes).toBe('更新的备注内容')
  })

  // TC-OBS-005: 删除观测记录
  it('TC-OBS-005: 成功删除观测记录', () => {
    const initialCount = store.observationCount
    const targetId = store.observations[0].id
    store.deleteObservation(targetId)
    expect(store.observationCount).toBe(initialCount - 1)
    expect(store.observations.find(o => o.id === targetId)).toBeUndefined()
  })

  // TC-OBS-006: 生态系统数据加载
  it('TC-OBS-006: 生态系统数据正确加载', () => {
    expect(store.ecosystemCount).toBeGreaterThan(0)
    store.ecosystems.forEach(eco => {
      expect(eco).toHaveProperty('name')
      expect(eco).toHaveProperty('type')
    })
  })

  // TC-OBS-007: 环境参数记录
  it('TC-OBS-007: 观测记录包含完整环境参数', () => {
    const obsWithParams = store.observations.find(o => o.waterTemp && o.salinity && o.depth)
    expect(obsWithParams).toBeTruthy()
    expect(typeof obsWithParams.waterTemp).toBe('number')
    expect(typeof obsWithParams.salinity).toBe('number')
    expect(typeof obsWithParams.depth).toBe('number')
  })

  // TC-OBS-008: 观测时间字段验证
  it('TC-OBS-008: 观测记录时间字段格式正确', () => {
    store.observations.forEach(obs => {
      expect(obs.observedAt).toBeTruthy()
      expect(typeof obs.observedAt).toBe('string')
    })
  })

  // TC-OBS-009: 地理坐标有效性
  it('TC-OBS-009: 观测地理坐标在有效范围内', () => {
    store.observations.forEach(obs => {
      if (obs.longitude !== null && obs.longitude !== undefined) {
        expect(obs.longitude).toBeGreaterThanOrEqual(-180)
        expect(obs.longitude).toBeLessThanOrEqual(180)
      }
      if (obs.latitude !== null && obs.latitude !== undefined) {
        expect(obs.latitude).toBeGreaterThanOrEqual(-90)
        expect(obs.latitude).toBeLessThanOrEqual(90)
      }
    })
  })
})

describe('数据统计分析模块', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDataStore()
  })

  // TC-STAT-001: 物种数量统计
  it('TC-STAT-001: 物种总数统计正确', () => {
    expect(store.speciesCount).toBe(store.species.length)
  })

  // TC-STAT-002: 观测次数统计
  it('TC-STAT-002: 观测次数统计正确', () => {
    expect(store.observationCount).toBe(store.observations.length)
  })

  // TC-STAT-003: 保护等级统计完整性
  it('TC-STAT-003: 保护等级统计涵盖所有物种', () => {
    const stats = store.protectionStats
    const total = Object.values(stats).reduce((sum, v) => sum + v, 0)
    expect(total).toBe(store.speciesCount)
  })

  // TC-STAT-004: 濒危状态统计值类型
  it('TC-STAT-004: 濒危状态统计值均为非负整数', () => {
    const stats = store.endangeredStats
    Object.values(stats).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(v)).toBe(true)
    })
  })

  // TC-STAT-005: 门纲分类统计
  it('TC-STAT-005: 门纲统计完整覆盖所有物种', () => {
    const stats = store.phylumStats
    const total = Object.values(stats).reduce((sum, v) => sum + v, 0)
    expect(total).toBe(store.speciesCount)
  })
})
