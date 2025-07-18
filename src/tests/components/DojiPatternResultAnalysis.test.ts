import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DojiPatternResultAnalysis from '../../components/technical-analysis/DojiPatternResultAnalysis.vue'
import type { StockScreenResult } from '../../types/technical-analysis/screener'

// Mock ECharts
vi.mock('echarts/core', () => {
    return {
        init: vi.fn(() => ({
            setOption: vi.fn(),
            resize: vi.fn(),
            dispose: vi.fn()
        })),
        use: vi.fn()
    }
})

// Mock Element Plus components
vi.mock('element-plus', async () => {
    const actual = await vi.importActual('element-plus')
    return {
        ...actual,
        ElCard: {
            name: 'ElCard',
            render() {
                return h('div', { class: 'el-card' }, [
                    this.$slots.header && h('div', { class: 'el-card__header' }, this.$slots.header()),
                    h('div', { class: 'el-card__body' }, this.$slots.default && this.$slots.default())
                ])
            }
        },
        ElDivider: {
            name: 'ElDivider',
            render() {
                return h('div', { class: 'el-divider' }, this.$slots.default && this.$slots.default())
            }
        },
        ElRow: {
            name: 'ElRow',
            render() {
                return h('div', { class: 'el-row' }, this.$slots.default && this.$slots.default())
            }
        },
        ElCol: {
            name: 'ElCol',
            render() {
                return h('div', { class: 'el-col' }, this.$slots.default && this.$slots.default())
            }
        },
        ElProgress: {
            name: 'ElProgress',
            render() {
                return h('div', { class: 'el-progress' }, this.$slots.default && this.$slots.default())
            }
        },
        ElForm: {
            name: 'ElForm',
            render() {
                return h('form', { class: 'el-form' }, this.$slots.default && this.$slots.default())
            }
        },
        ElFormItem: {
            name: 'ElFormItem',
            render() {
                return h('div', { class: 'el-form-item' }, this.$slots.default && this.$slots.default())
            }
        },
        ElSelect: {
            name: 'ElSelect',
            render() {
                return h('div', { class: 'el-select' }, this.$slots.default && this.$slots.default())
            }
        },
        ElOption: {
            name: 'ElOption',
            render() {
                return h('div', { class: 'el-option' }, this.$slots.default && this.$slots.default())
            }
        },
        ElInputNumber: {
            name: 'ElInputNumber',
            render() {
                return h('div', { class: 'el-input-number' }, this.$slots.default && this.$slots.default())
            }
        },
        ElSlider: {
            name: 'ElSlider',
            render() {
                return h('div', { class: 'el-slider' }, this.$slots.default && this.$slots.default())
            }
        },
        ElButton: {
            name: 'ElButton',
            render() {
                return h('button', { class: 'el-button' }, this.$slots.default && this.$slots.default())
            }
        },
        ElEmpty: {
            name: 'ElEmpty',
            render() {
                return h('div', { class: 'el-empty' }, this.$slots.default && this.$slots.default())
            }
        }
    }
})

// Import h from vue
import { h } from 'vue'

describe('DojiPatternResultAnalysis', () => {
    // Mock data
    const mockScreenResult: StockScreenResult = {
        stocks: [
            {
                stockId: '600000',
                stockName: '浦发银行',
                patternDate: Date.now() - 86400000 * 2,
                patternType: 'standard',
                priceBeforePattern: 10.5,
                currentPrice: 11.2,
                priceChange: 6.67,
                volumeChange: 15.3,
                significance: 0.85,
                rank: 1
            },
            {
                stockId: '000001',
                stockName: '平安银行',
                patternDate: Date.now() - 86400000 * 3,
                patternType: 'dragonfly',
                priceBeforePattern: 15.2,
                currentPrice: 16.1,
                priceChange: 5.92,
                volumeChange: 8.7,
                significance: 0.76,
                rank: 2
            },
            {
                stockId: '601398',
                stockName: '工商银行',
                patternDate: Date.now() - 86400000 * 4,
                patternType: 'gravestone',
                priceBeforePattern: 5.3,
                currentPrice: 5.5,
                priceChange: 3.77,
                volumeChange: 5.2,
                significance: 0.62,
                rank: 3
            },
            {
                stockId: '601288',
                stockName: '农业银行',
                patternDate: Date.now() - 86400000 * 5,
                patternType: 'longLegged',
                priceBeforePattern: 3.2,
                currentPrice: 3.4,
                priceChange: 6.25,
                volumeChange: 12.1,
                significance: 0.71,
                rank: 4
            }
        ],
        total: 4,
        criteria: {
            patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
            daysRange: 30,
            minUpwardPercent: 3.0,
            sortBy: 'priceChange',
            sortDirection: 'desc',
            limit: 100
        }
    }

    const emptyScreenResult: StockScreenResult = {
        stocks: [],
        total: 0,
        criteria: {
            patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
            daysRange: 30,
            minUpwardPercent: 3.0,
            sortBy: 'priceChange',
            sortDirection: 'desc',
            limit: 100
        }
    }

    it('renders empty state when no data', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: emptyScreenResult,
                loading: false
            }
        })

        expect(wrapper.find('.empty-result').exists()).toBe(true)
        expect(wrapper.find('.analysis-content').exists()).toBe(false)
    })

    it('renders analysis content when data is available', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        expect(wrapper.find('.empty-result').exists()).toBe(false)
        expect(wrapper.find('.analysis-content').exists()).toBe(true)
    })

    it('shows loading state', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: emptyScreenResult,
                loading: true
            }
        })

        expect(wrapper.find('.el-card').attributes('v-loading')).toBe('true')
    })

    it('calculates average price change correctly', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Average of [6.67, 5.92, 3.77, 6.25] = 5.6525
        expect(wrapper.vm.avgPriceChange).toBeCloseTo(5.65, 1)
    })

    it('calculates average volume change correctly', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Average of [15.3, 8.7, 5.2, 12.1] = 10.325
        expect(wrapper.vm.avgVolumeChange).toBeCloseTo(10.33, 1)
    })

    it('calculates average significance correctly', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Average of [0.85, 0.76, 0.62, 0.71] = 0.735
        expect(wrapper.vm.avgSignificance).toBeCloseTo(0.735, 2)
    })

    it('emits refresh event when refresh button is clicked', async () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        await wrapper.find('.header-actions .el-button').trigger('click')
        expect(wrapper.emitted()).toHaveProperty('refresh')
    })

    it('applies secondary filter correctly', async () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Set filter to only show standard doji patterns
        await wrapper.setData({
            filterForm: {
                patternType: 'standard',
                minPriceChange: 0,
                minSignificance: 0
            }
        })

        await wrapper.find('.secondary-filter .el-button').trigger('click')

        // Should emit filter-change event with filtered data
        expect(wrapper.emitted()).toHaveProperty('filter-change')
        const emittedEvents = wrapper.emitted('filter-change')
        if (emittedEvents) {
            const filteredData = emittedEvents[0][0]
            expect(filteredData.length).toBe(1)
            expect(filteredData[0].patternType).toBe('standard')
        }
    })

    it('resets secondary filter correctly', async () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // First apply a filter
        await wrapper.setData({
            filterForm: {
                patternType: 'standard',
                minPriceChange: 0,
                minSignificance: 0
            }
        })
        await wrapper.find('.secondary-filter .el-button').trigger('click')

        // Then reset it
        await wrapper.findAll('.secondary-filter .el-button').at(1).trigger('click')

        // Should emit filter-change event with all data
        expect(wrapper.emitted('filter-change')).toHaveLength(2)
        const emittedEvents = wrapper.emitted('filter-change')
        if (emittedEvents) {
            const filteredData = emittedEvents[1][0]
            expect(filteredData.length).toBe(4) // All stocks
        }
    })

    it('formats pattern type names correctly', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        expect(wrapper.vm.getPatternTypeName('standard')).toBe('标准十字星')
        expect(wrapper.vm.getPatternTypeName('dragonfly')).toBe('蜻蜓十字星')
        expect(wrapper.vm.getPatternTypeName('gravestone')).toBe('墓碑十字星')
        expect(wrapper.vm.getPatternTypeName('longLegged')).toBe('长腿十字星')
    })

    it('returns correct significance colors', () => {
        const wrapper = mount(DojiPatternResultAnalysis, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        expect(wrapper.vm.getSignificanceColor(0.85)).toBe('#67C23A')
        expect(wrapper.vm.getSignificanceColor(0.65)).toBe('#E6A23C')
        expect(wrapper.vm.getSignificanceColor(0.45)).toBe('#F56C6C')
        expect(wrapper.vm.getSignificanceColor(0.35)).toBe('#909399')
    })
})