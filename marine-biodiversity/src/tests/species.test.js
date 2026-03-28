import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '../store/data.js'

describe('物种信息管理模块 (DataStore - Species)', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDataStore()
  })

  // TC-SPECIES-001: 初始数据加载
  it('TC-SPECIES-001: 初始物种数据正确加载', () => {
    expect(store.speciesCount).toBeGreaterThan(0)
    expect(store.species.length).toBe(store.speciesCount)
    expect(store.species[0]).toHaveProperty('chineseName')
    expect(store.species[0]).toHaveProperty('latinName')
  })

  // TC-SPECIES-002: 添加新物种
  it('TC-SPECIES-002: 成功添加新物种', () => {
    const initialCount = store.speciesCount
    const newSpecies = {
      chineseName: '测试鱼类',
      latinName: 'Testus fishus',
      phylum: '脊索动物门',
      class: '辐鳍鱼纲',
      distribution: '测试海域',
      protectionLevel: '省级',
      endangeredStatus: 'LC',
      createdBy: '测试用户'
    }
    const added = store.addSpecies(newSpecies)
    expect(store.speciesCount).toBe(initialCount + 1)
    expect(added.id).toBeTruthy()
    expect(added.chineseName).toBe('测试鱼类')
    expect(added.createdAt).toBeTruthy()
  })

  // TC-SPECIES-003: 编辑物种信息
  it('TC-SPECIES-003: 成功编辑物种信息', () => {
    const targetId = store.species[0].id
    const originalName = store.species[0].chineseName
    store.updateSpecies(targetId, { chineseName: '修改后的名称' })
    const updated = store.getSpeciesById(targetId)
    expect(updated.chineseName).toBe('修改后的名称')
    expect(updated.chineseName).not.toBe(originalName)
  })

  // TC-SPECIES-004: 删除物种
  it('TC-SPECIES-004: 成功删除物种记录', () => {
    const initialCount = store.speciesCount
    const targetId = store.species[0].id
    store.deleteSpecies(targetId)
    expect(store.speciesCount).toBe(initialCount - 1)
    expect(store.getSpeciesById(targetId)).toBeUndefined()
  })

  // TC-SPECIES-005: 按名称搜索
  it('TC-SPECIES-005: 按中文名搜索物种', () => {
    const results = store.searchSpecies({ name: '白海豚' })
    expect(results.length).toBeGreaterThan(0)
    results.forEach(r => {
      expect(r.chineseName.toLowerCase()).toContain('白海豚')
    })
  })

  // TC-SPECIES-006: 按学名搜索
  it('TC-SPECIES-006: 按学名搜索物种', () => {
    const results = store.searchSpecies({ name: 'Chelonia' })
    expect(results.length).toBeGreaterThan(0)
  })

  // TC-SPECIES-007: 按保护等级筛选
  it('TC-SPECIES-007: 按保护等级筛选物种', () => {
    const results = store.searchSpecies({ protectionLevel: '国家一级' })
    results.forEach(r => {
      expect(r.protectionLevel).toBe('国家一级')
    })
  })

  // TC-SPECIES-008: 多条件组合筛选
  it('TC-SPECIES-008: 多条件组合筛选正确', () => {
    const results = store.searchSpecies({ phylum: '脊索动物门', endangeredStatus: 'VU' })
    results.forEach(r => {
      expect(r.phylum).toBe('脊索动物门')
      expect(r.endangeredStatus).toBe('VU')
    })
  })

  // TC-SPECIES-009: 保护等级统计
  it('TC-SPECIES-009: 保护等级统计数据正确', () => {
    const stats = store.protectionStats
    expect(typeof stats).toBe('object')
    const total = Object.values(stats).reduce((a, b) => a + b, 0)
    expect(total).toBe(store.speciesCount)
  })

  // TC-SPECIES-010: 濒危状态统计
  it('TC-SPECIES-010: 濒危状态统计数据格式正确', () => {
    const stats = store.endangeredStats
    expect(stats).toHaveProperty('CR')
    expect(stats).toHaveProperty('EN')
    expect(stats).toHaveProperty('VU')
    expect(stats).toHaveProperty('LC')
  })

  // TC-SPECIES-011: 根据ID查询物种
  it('TC-SPECIES-011: 根据ID查询物种返回正确结果', () => {
    const first = store.species[0]
    const found = store.getSpeciesById(first.id)
    expect(found).toBeTruthy()
    expect(found.id).toBe(first.id)
    expect(found.chineseName).toBe(first.chineseName)
  })

  // TC-SPECIES-012: 查询不存在的物种
  it('TC-SPECIES-012: 查询不存在的物种ID返回undefined', () => {
    const notFound = store.getSpeciesById(99999)
    expect(notFound).toBeUndefined()
  })

  // TC-SPECIES-013: 空搜索返回全部
  it('TC-SPECIES-013: 空条件搜索返回所有物种', () => {
    const results = store.searchSpecies({})
    expect(results.length).toBe(store.speciesCount)
  })
})
