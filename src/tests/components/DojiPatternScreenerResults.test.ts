import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DojiPatternScreenerResults from '../../components/technical-analysis/DojiPatternScreenerResults.vue'
import type { StockScreenResult } from '../../types/technical-analysis/screener'

// Mock DojiPatternResultAnalysis component
vi.mock('../../components/technical-analysis/DojiPatternResultAnalysis.vue', () => ({
    default: {
        name: 'DojiPatternResultAnalysis',
        render() {
            return h('div', { class: 'doji-pattern-result-analysis' })
        },
        props: ['screenResult', 'loading']
    }
}))

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
        ElTable: {
            name: 'ElTable',
            render() {
                return h('table', { class: 'el-table' }, this.$slots.default && this.$slots.default())
            }
        },
        ElTableColumn: {
            name: 'ElTableColumn',
            render() {
                return h('div', { class: 'el-table-column' }, this.$slots.default && this.$slots.default())
            }
        },
        ElPagination: {
            name: 'ElPagination',
            render() {
                return h('div', { class: 'el-pagination' }, this.$slots.default && this.$slots.default())
            }
        },
        ElDialog: {
            name: 'ElDialog',
            render() {
                return h('div', { class: 'el-dialog' }, [
                    this.$slots.header && h('div', { class: 'el-dialog__header' }, this.$slots.header()),
                    h('div', { class: 'el-dialog__body' }, this.$slots.default && this.$slots.default()),
                    this.$slots.footer && h('div', { class: 'el-dialog__footer' }, this.$slots.footer())
                ])
            }
        },
        ElEmpty: {
            name: 'ElEmpty',
            render() {
                return h('div', { class: 'el-empty' }, this.$slots.default && this.$slots.default())
            }
        },
        ElTag: {
            name: 'ElTag',
            render() {
                return h('span', { class: 'el-tag' }, this.$slots.default && this.$slots.default())
            }
        },
        ElButton: {
            name: 'ElButton',
            render() {
                return h('button', { class: 'el-button' }, this.$slots.default && this.$slots.default())
            }
        },
        ElProgress: {
            name: 'ElProgress',
            render() {
                return h('div', { class: 'el-progress' }, this.$slots.default && this.$slots.default())
            }
        },
        ElDescriptions: {
            name: 'ElDescriptions',
            render() {
                return h('div', { class: 'el-descriptions' }, this.$slots.default && this.$slots.default())
            }
        },
        ElDescriptionsItem: {
            name: 'ElDescriptionsItem',
            render() {
                return h('div', { class: 'el-descriptions-item' }, this.$slots.default && this.$slots.default())
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
        ElRadioGroup: {
            name: 'ElRadioGroup',
            render() {
                return h('div', { class: 'el-radio-group' }, this.$slots.default && this.$slots.default())
            }
        },
        ElRadio: {
            name: 'ElRadio',
            render() {
                return h('div', { class: 'el-radio' }, this.$slots.default && this.$slots.default())
            }
        },
        ElCheckboxGroup: {
            name: 'ElCheckboxGroup',
            render() {
                return h('div', { class: 'el-checkbox-group' }, this.$slots.default && this.$slots.default())
            }
        },
        ElCheckbox: {
            name: 'ElCheckbox',
            render() {
                return h('div', { class: 'el-checkbox' }, this.$slots.default && this.$slots.default())
            }
        },
        ElDivider: {
            name: 'ElDivider',
            render() {
                return h('div', { class: 'el-divider' })
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
        }
    }
})

// Import h from vue
import { h } from 'vue'

describe('DojiPatternScreenerResults', () => {
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
            }
        ],
        total: 2,
        criteria: {
            patternTypes: ['standard', 'dragonfly'],
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
            patternTypes: ['standard', 'dragonfly'],
            daysRange: 30,
            minUpwardPercent: 3.0,
            sortBy: 'priceChange',
            sortDirection: 'desc',
            limit: 100
        }
    }

    it('renders empty state when no results', () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: emptyScreenResult,
                loading: false
            }
        })

        expect(wrapper.find('.empty-result').exists()).toBe(true)
        expect(wrapper.find('.result-content').exists()).toBe(false)
    })

    it('renders results when data is available', () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        expect(wrapper.find('.empty-result').exists()).toBe(false)
        expect(wrapper.find('.result-content').exists()).toBe(true)
        expect(wrapper.find('.result-summary').text()).toContain('2')
    })

    it('shows loading state', () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: emptyScreenResult,
                loading: true
            }
        })

        expect(wrapper.find('.el-card').attributes('v-loading')).toBe('true')
    })

    it('emits refresh event when refresh button is clicked', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        await wrapper.find('.header-actions .el-button').trigger('click')
        expect(wrapper.emitted()).toHaveProperty('refresh')
    })

    it('opens detail dialog when view detail button is clicked', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Find and click the view detail button
        const viewDetailButton = wrapper.find('.el-table-column .el-button')
        await viewDetailButton.trigger('click')

        // Check if the detail dialog is visible
        expect(wrapper.vm.detailDialogVisible).toBe(true)
        expect(wrapper.emitted()).toHaveProperty('view-detail')
    })

    it('formats pattern type names correctly', () => {
        const wrapper = mount(DojiPatternScreenerResults, {
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

    it('provides pattern descriptions', () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        expect(wrapper.vm.getPatternDescription('standard')).toContain('标准十字星')
        expect(wrapper.vm.getPatternDescription('dragonfly')).toContain('蜻蜓十字星')
    })

    it('handles pagination changes', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        await wrapper.vm.handleSizeChange(50)
        expect(wrapper.vm.pageSize).toBe(50)

        await wrapper.vm.handleCurrentChange(2)
        expect(wrapper.vm.currentPage).toBe(2)
    })

    it('opens export dialog when export button is clicked', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Find and click the export button
        const exportButton = wrapper.findAll('.header-actions .el-button').at(0)
        await exportButton.trigger('click')

        // Check if the export dialog is visible
        expect(wrapper.vm.exportDialogVisible).toBe(true)
    })

    it('toggles analysis view when analysis button is clicked', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Initially analysis should be hidden
        expect(wrapper.vm.showAnalysis).toBe(false)
        expect(wrapper.find('.doji-pattern-result-analysis').exists()).toBe(false)

        // Find and click the analysis button (third button in header actions)
        const analysisButton = wrapper.findAll('.header-actions .el-button').at(2)
        await analysisButton.trigger('click')

        // Analysis should now be visible
        expect(wrapper.vm.showAnalysis).toBe(true)
        expect(wrapper.find('.doji-pattern-result-analysis').exists()).toBe(true)

        // Click again to hide
        await analysisButton.trigger('click')
        expect(wrapper.vm.showAnalysis).toBe(false)
    })

    it('handles filter changes from analysis component', async () => {
        const wrapper = mount(DojiPatternScreenerResults, {
            props: {
                screenResult: mockScreenResult,
                loading: false
            }
        })

        // Initial filtered stocks should match all stocks
        expect(wrapper.vm.filteredStocks.length).toBe(2)

        // Simulate filter change with only one stock
        const filteredData = [mockScreenResult.stocks[0]]
        await wrapper.vm.handleFilterChange(filteredData)

        // Filtered stocks should be updated
        expect(wrapper.vm.filteredStocks.length).toBe(1)
        expect(wrapper.vm.filteredStocks[0].stockId).toBe('600000')

        // Current page should be reset to 1
        expect(wrapper.vm.currentPage).toBe(1)
    })
})