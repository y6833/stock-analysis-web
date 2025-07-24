/**
 * 数据处理性能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { performance } from 'perf_hooks'

// Mock performance API for Node.js environment
if (typeof window === 'undefined') {
  global.performance = performance as any
}

// 测试工具函数
const measurePerformance = async (fn: () => any, label: string) => {
  performance.mark(`${label}-start`)
  const result = await fn()
  performance.mark(`${label}-end`)
  performance.measure(label, `${label}-start`, `${label}-end`)
  
  const measures = performance.getEntriesByName(label)
  const duration = measures[0]?.duration || 0
  
  return { result, duration }
}

describe('数据处理性能测试', () => {
  let performanceEntries: PerformanceEntry[] = []

  beforeEach(() => {
    performanceEntries = []
    
    // Mock performance.mark and performance.measure
    vi.spyOn(performance, 'mark').mockImplementation((name: string) => {
      performanceEntries.push({
        name,
        entryType: 'mark',
        startTime: performance.now(),
        duration: 0
      } as PerformanceEntry)
    })

    vi.spyOn(performance, 'measure').mockImplementation((name: string, startMark?: string, endMark?: string) => {
      const entry = {
        name,
        entryType: 'measure',
        startTime: performance.now() - 100,
        duration: 100
      } as PerformanceEntry
      performanceEntries.push(entry)
      return entry
    })

    vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
      return performanceEntries.filter(entry => entry.name === name)
    })
  })

  describe('大数据集处理性能', () => {
    it('应该高效处理大型数组过滤', async () => {
      // 创建大型数据集
      const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        category: i % 5,
        isActive: i % 3 === 0
      }))

      // 测试过滤性能
      const { duration: filterDuration } = await measurePerformance(() => {
        return largeDataset.filter(item => item.value > 500 && item.isActive)
      }, 'array-filter')

      // 测试映射性能
      const { duration: mapDuration } = await measurePerformance(() => {
        return largeDataset.map(item => ({
          id: item.id,
          formattedValue: `¥${item.value.toFixed(2)}`,
          status: item.isActive ? '活跃' : '非活跃'
        }))
      }, 'array-map')

      // 测试排序性能
      const { duration: sortDuration } = await measurePerformance(() => {
        return [...largeDataset].sort((a, b) => a.value - b.value)
      }, 'array-sort')

      // 测试聚合性能
      const { duration: reduceDuration } = await measurePerformance(() => {
        return largeDataset.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + item.value
          return acc
        }, {} as Record<number, number>)
      }, 'array-reduce')

      // 验证性能指标
      expect(filterDuration).toBeLessThan(50)
      expect(mapDuration).toBeLessThan(100)
      expect(sortDuration).toBeLessThan(200)
      expect(reduceDuration).toBeLessThan(100)
    })

    it('应该高效处理对象操作', async () => {
      // 创建大型对象
      const createLargeObject = (depth: number, breadth: number) => {
        const obj: Record<string, any> = {}
        
        const buildLevel = (prefix: string, currentDepth: number) => {
          if (currentDepth <= 0) return
          
          for (let i = 0; i < breadth; i++) {
            const key = `${prefix}_${i}`
            if (currentDepth === 1) {
              obj[key] = i
            } else {
              obj[key] = {}
              buildLevel(`${key}`, currentDepth - 1)
            }
          }
        }
        
        buildLevel('key', depth)
        return obj
      }

      const largeObject = createLargeObject(4, 10)

      // 测试对象克隆性能
      const { duration: cloneDuration } = await measurePerformance(() => {
        return JSON.parse(JSON.stringify(largeObject))
      }, 'object-clone')

      // 测试对象合并性能
      const { duration: mergeDuration } = await measurePerformance(() => {
        const obj1 = { ...largeObject }
        const obj2 = { newProp: 'value', key_0_0: 'updated' }
        return { ...obj1, ...obj2 }
      }, 'object-merge')

      // 测试对象遍历性能
      const { duration: traverseDuration } = await measurePerformance(() => {
        const result: string[] = []
        const traverse = (obj: Record<string, any>, path: string = '') => {
          for (const key in obj) {
            const currentPath = path ? `${path}.${key}` : key
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              traverse(obj[key], currentPath)
            } else {
              result.push(`${currentPath}=${obj[key]}`)
            }
          }
        }
        traverse(largeObject)
        return result
      }, 'object-traverse')

      // 验证性能指标
      expect(cloneDuration).toBeLessThan(100)
      expect(mergeDuration).toBeLessThan(50)
      expect(traverseDuration).toBeLessThan(150)
    })
  })

  describe('数据转换性能', () => {
    it('应该高效处理数据格式转换', async () => {
      // 创建测试数据
      const rawData = Array.from({ length: 10000 }, (_, i) => ({
        id: `item_${i}`,
        timestamp: new Date(2023, 0, 1).getTime() + i * 60000,
        value: Math.random() * 100,
        metadata: {
          source: `source_${i % 5}`,
          category: `category_${i % 10}`,
          tags: Array.from({ length: 3 }, (_, j) => `tag_${j}`)
        }
      }))

      // 测试数组到对象映射性能
      const { duration: arrayToObjectDuration } = await measurePerformance(() => {
        return rawData.reduce((acc, item) => {
          acc[item.id] = item
          return acc
        }, {} as Record<string, any>)
      }, 'array-to-object')

      // 测试数据规范化性能
      const { duration: normalizeDuration } = await measurePerformance(() => {
        const entities: Record<string, any> = {}
        const ids: string[] = []
        
        rawData.forEach(item => {
          ids.push(item.id)
          entities[item.id] = {
            ...item,
            formattedDate: new Date(item.timestamp).toISOString(),
            categoryId: item.metadata.category
          }
        })
        
        return { entities, ids }
      }, 'normalize-data')

      // 测试数据分组性能
      const { duration: groupDuration } = await measurePerformance(() => {
        const groups: Record<string, any[]> = {}
        
        rawData.forEach(item => {
          const category = item.metadata.category
          if (!groups[category]) {
            groups[category] = []
          }
          groups[category].push(item)
        })
        
        return groups
      }, 'group-data')

      // 测试数据聚合性能
      const { duration: aggregateDuration } = await measurePerformance(() => {
        const result: Record<string, { count: number, sum: number, avg: number }> = {}
        
        rawData.forEach(item => {
          const category = item.metadata.category
          if (!result[category]) {
            result[category] = { count: 0, sum: 0, avg: 0 }
          }
          
          result[category].count++
          result[category].sum += item.value
        })
        
        // 计算平均值
        Object.keys(result).forEach(key => {
          result[key].avg = result[key].sum / result[key].count
        })
        
        return result
      }, 'aggregate-data')

      // 验证性能指标
      expect(arrayToObjectDuration).toBeLessThan(50)
      expect(normalizeDuration).toBeLessThan(100)
      expect(groupDuration).toBeLessThan(50)
      expect(aggregateDuration).toBeLessThan(50)
    })
  })

  describe('字符串处理性能', () => {
    it('应该高效处理大量字符串操作', async () => {
      // 创建大量字符串
      const strings = Array.from({ length: 10000 }, (_, i) => 
        `Item ${i}: This is a test string with some random content ${Math.random()}`
      )
      
      // 测试字符串连接性能
      const { duration: concatDuration } = await measurePerformance(() => {
        let result = ''
        for (const str of strings) {
          result += str + '\n'
        }
        return result
      }, 'string-concat')

      // 测试字符串数组连接性能
      const { duration: joinDuration } = await measurePerformance(() => {
        return strings.join('\n')
      }, 'string-join')

      // 测试字符串替换性能
      const { duration: replaceDuration } = await measurePerformance(() => {
        return strings.map(str => str.replace(/test/g, 'production'))
      }, 'string-replace')

      // 测试字符串搜索性能
      const { duration: searchDuration } = await measurePerformance(() => {
        return strings.filter(str => str.includes('random'))
      }, 'string-search')

      // 测试正则表达式性能
      const { duration: regexDuration } = await measurePerformance(() => {
        const regex = /Item (\d+): .* (\d+\.\d+)$/
        return strings.map(str => {
          const match = str.match(regex)
          if (match) {
            return {
              id: parseInt(match[1]),
              value: parseFloat(match[2])
            }
          }
          return null
        }).filter(Boolean)
      }, 'regex-extract')

      // 验证性能指标
      expect(concatDuration).toBeLessThan(100)
      expect(joinDuration).toBeLessThan(20)  // join应该比循环连接快得多
      expect(replaceDuration).toBeLessThan(50)
      expect(searchDuration).toBeLessThan(30)
      expect(regexDuration).toBeLessThan(100)
    })
  })

  describe('内存使用优化', () => {
    it('应该高效使用内存池', async () => {
      // 创建对象池
      class ObjectPool<T> {
        private pool: T[] = []
        private factory: () => T
        private reset: (obj: T) => void
        
        constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
          this.factory = factory
          this.reset = reset
          
          // 预填充池
          for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory())
          }
        }
        
        get(): T {
          return this.pool.length > 0 ? this.pool.pop()! : this.factory()
        }
        
        release(obj: T): void {
          this.reset(obj)
          this.pool.push(obj)
        }
        
        size(): number {
          return this.pool.length
        }
      }
      
      // 创建测试对象池
      const pool = new ObjectPool<{
        id: number,
        data: number[],
        isActive: boolean
      }>(
        // 工厂函数
        () => ({ id: 0, data: [], isActive: false }),
        // 重置函数
        (obj) => {
          obj.id = 0
          obj.data.length = 0
          obj.isActive = false
        },
        100 // 初始大小
      )
      
      // 测试对象池性能
      const { duration: poolDuration } = await measurePerformance(() => {
        const objects: any[] = []
        
        // 获取1000个对象
        for (let i = 0; i < 1000; i++) {
          const obj = pool.get()
          obj.id = i
          obj.isActive = i % 2 === 0
          obj.data.push(i, i * 2, i * 3)
          objects.push(obj)
        }
        
        // 处理对象
        const results = objects.map(obj => obj.data.reduce((sum: number, val: number) => sum + val, 0))
        
        // 释放所有对象回池
        objects.forEach(obj => pool.release(obj))
        
        return { results, poolSize: pool.size() }
      }, 'object-pool')
      
      // 测试常规对象创建性能
      const { duration: nativeCreationDuration } = await measurePerformance(() => {
        const objects: any[] = []
        
        // 创建1000个对象
        for (let i = 0; i < 1000; i++) {
          const obj = { id: i, data: [i, i * 2, i * 3], isActive: i % 2 === 0 }
          objects.push(obj)
        }
        
        // 处理对象
        return objects.map(obj => obj.data.reduce((sum: number, val: number) => sum + val, 0))
      }, 'native-creation')

      // 验证性能指标
      expect(poolDuration).toBeLessThanOrEqual(nativeCreationDuration * 1.2) // 对象池应该不会比原生创建慢太多
    })
  })

  describe('算法性能', () => {
    it('应该高效实现常见算法', async () => {
      // 创建测试数据
      const numbers = Array.from({ length: 10000 }, () => Math.floor(Math.random() * 10000))
      
      // 测试排序算法性能
      const { duration: sortDuration } = await measurePerformance(() => {
        return [...numbers].sort((a, b) => a - b)
      }, 'sort-algorithm')
      
      // 测试二分查找性能
      const { duration: binarySearchDuration } = await measurePerformance(() => {
        const sorted = [...numbers].sort((a, b) => a - b)
        const target = sorted[Math.floor(sorted.length / 2)]
        
        let left = 0
        let right = sorted.length - 1
        
        while (left <= right) {
          const mid = Math.floor((left + right) / 2)
          if (sorted[mid] === target) {
            return mid
          }
          if (sorted[mid] < target) {
            left = mid + 1
          } else {
            right = mid - 1
          }
        }
        
        return -1
      }, 'binary-search')
      
      // 测试线性查找性能
      const { duration: linearSearchDuration } = await measurePerformance(() => {
        const target = numbers[Math.floor(numbers.length / 2)]
        return numbers.indexOf(target)
      }, 'linear-search')
      
      // 测试去重性能
      const { duration: uniqueDuration } = await measurePerformance(() => {
        return [...new Set(numbers)]
      }, 'unique-algorithm')
      
      // 验证性能指标
      expect(sortDuration).toBeLessThan(100)
      expect(binarySearchDuration).toBeLessThan(10)
      expect(uniqueDuration).toBeLessThan(50)
      
      // 二分查找应该比线性查找快
      expect(binarySearchDuration).toBeLessThan(linearSearchDuration)
    })
  })
})