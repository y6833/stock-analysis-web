import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dojiPatternSettingsService } from '@/services/dojiPatternSettingsService'

// 十字星形态设置接口
export interface DojiPatternSettings {
    // 基础识别参数
    bodyThreshold: number
    equalPriceThreshold: number
    longLegThreshold: number

    // 形态类型
    enabledPatternTypes: string[]

    // 显示设置
    minSignificance: number
    markerSize: string
    markerOpacity: number
    displayOptions: string[]

    // 性能设置
    calculationMode: string
    cacheTimeout: number
    maxCalculationCount: number
}

// 默认设置
export const DEFAULT_DOJI_SETTINGS: DojiPatternSettings = {
    bodyThreshold: 0.5,
    equalPriceThreshold: 0.1,
    longLegThreshold: 2.0,
    enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
    minSignificance: 0.5,
    markerSize: 'medium',
    markerOpacity: 0.8,
    displayOptions: ['showTooltip', 'showSignificance', 'showPriceMovement'],
    calculationMode: 'cached',
    cacheTimeout: 300,
    maxCalculationCount: 1000,
}

// 形态类型映射
export const PATTERN_TYPE_NAMES: Record<string, string> = {
    standard: '标准十字星',
    dragonfly: '蜻蜓十字星',
    gravestone: '墓碑十字星',
    longLegged: '长腿十字星'
}

// 标记大小映射
export const MARKER_SIZE_MAP: Record<string, number> = {
    small: 6,
    medium: 8,
    large: 10
}

// 计算模式映射
export const CALCULATION_MODE_NAMES: Record<string, string> = {
    realtime: '实时计算',
    ondemand: '按需计算',
    cached: '缓存模式'
}

// 存储键
const STORAGE_KEY = 'dojiPatternSettings'

// 全局设置状态
const globalSettings = reactive<DojiPatternSettings>({ ...DEFAULT_DOJI_SETTINGS })
const isLoaded = ref(false)

/**
 * 十字星形态设置组合式函数
 */
export function useDojiPatternSettings() {
    // 本地设置状态
    const settings = reactive<DojiPatternSettings>({ ...globalSettings })
    const loading = ref(false)
    const saving = ref(false)

    // 计算属性
    const isDefaultSettings = computed(() => {
        return JSON.stringify(settings) === JSON.stringify(DEFAULT_DOJI_SETTINGS)
    })

    const enabledPatternCount = computed(() => {
        return settings.enabledPatternTypes.length
    })

    const settingsHash = computed(() => {
        return btoa(JSON.stringify(settings)).slice(0, 8)
    })

    /**
     * 加载设置
     */
    const loadSettings = async (): Promise<void> => {
        try {
            loading.value = true

            // 先从本地存储加载
            const savedSettings = localStorage.getItem(STORAGE_KEY)
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings)
                Object.assign(settings, { ...DEFAULT_DOJI_SETTINGS, ...parsed })
            }

            // 从服务器加载用户设置
            try {
                const serverSettings = await dojiPatternSettingsService.getUserSettings()
                if (serverSettings) {
                    Object.assign(settings, { ...DEFAULT_DOJI_SETTINGS, ...serverSettings })
                    // 同步到本地存储
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
                }
            } catch (serverError) {
                console.warn('从服务器加载设置失败，使用本地设置:', serverError)
            }

            Object.assign(globalSettings, settings)
            isLoaded.value = true
        } catch (error) {
            console.error('加载十字星设置失败:', error)
            ElMessage.warning('加载设置失败，使用默认设置')
            Object.assign(settings, DEFAULT_DOJI_SETTINGS)
        } finally {
            loading.value = false
        }
    }

    /**
     * 保存设置
     */
    const saveSettings = async (): Promise<boolean> => {
        try {
            saving.value = true

            // 验证设置
            if (!validateSettings(settings)) {
                throw new Error('设置验证失败')
            }

            // 保存到服务器
            try {
                await dojiPatternSettingsService.saveUserSettings(settings)
            } catch (serverError) {
                console.warn('保存到服务器失败，仅保存到本地:', serverError)
            }

            // 保存到本地存储
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

            // 更新全局设置
            Object.assign(globalSettings, settings)

            ElMessage.success('设置保存成功')
            return true
        } catch (error) {
            console.error('保存十字星设置失败:', error)
            ElMessage.error('保存设置失败')
            return false
        } finally {
            saving.value = false
        }
    }

    /**
     * 重置为默认设置
     */
    const resetToDefaults = (): void => {
        Object.assign(settings, DEFAULT_DOJI_SETTINGS)
    }

    /**
     * 更新单个设置项
     */
    const updateSetting = <K extends keyof DojiPatternSettings>(
        key: K,
        value: DojiPatternSettings[K]
    ): void => {
        settings[key] = value
    }

    /**
     * 批量更新设置
     */
    const updateSettings = (newSettings: Partial<DojiPatternSettings>): void => {
        Object.assign(settings, newSettings)
    }

    /**
     * 导出设置
     */
    const exportSettings = (): string => {
        return JSON.stringify(settings, null, 2)
    }

    /**
     * 导入设置
     */
    const importSettings = (configJson: string): boolean => {
        try {
            const importedSettings = JSON.parse(configJson)

            // 验证导入的设置
            if (!validateSettings(importedSettings)) {
                throw new Error('导入的设置格式不正确')
            }

            Object.assign(settings, { ...DEFAULT_DOJI_SETTINGS, ...importedSettings })
            ElMessage.success('设置导入成功')
            return true
        } catch (error) {
            console.error('导入设置失败:', error)
            ElMessage.error('导入设置失败，请检查配置格式')
            return false
        }
    }

    /**
     * 获取形态类型配置
     */
    const getPatternTypeConfig = (patternType: string) => {
        return {
            enabled: settings.enabledPatternTypes.includes(patternType),
            name: PATTERN_TYPE_NAMES[patternType] || patternType,
            threshold: getPatternThreshold(patternType)
        }
    }

    /**
     * 获取形态阈值
     */
    const getPatternThreshold = (patternType: string): number => {
        switch (patternType) {
            case 'standard':
                return settings.equalPriceThreshold
            case 'dragonfly':
            case 'gravestone':
                return settings.bodyThreshold
            case 'longLegged':
                return settings.longLegThreshold
            default:
                return settings.bodyThreshold
        }
    }

    /**
     * 获取标记样式配置
     */
    const getMarkerStyleConfig = () => {
        return {
            size: MARKER_SIZE_MAP[settings.markerSize] || 8,
            opacity: settings.markerOpacity,
            showTooltip: settings.displayOptions.includes('showTooltip'),
            showSignificance: settings.displayOptions.includes('showSignificance'),
            showPriceMovement: settings.displayOptions.includes('showPriceMovement'),
            autoHideWeak: settings.displayOptions.includes('autoHideWeak')
        }
    }

    /**
     * 获取性能配置
     */
    const getPerformanceConfig = () => {
        return {
            calculationMode: settings.calculationMode,
            cacheTimeout: settings.cacheTimeout,
            maxCalculationCount: settings.maxCalculationCount,
            useWebWorker: settings.calculationMode === 'realtime',
            enableCache: settings.calculationMode === 'cached'
        }
    }

    /**
     * 验证设置
     */
    const validateSettings = (settingsToValidate: any): boolean => {
        try {
            // 检查必需字段
            const requiredFields = [
                'bodyThreshold',
                'equalPriceThreshold',
                'longLegThreshold',
                'enabledPatternTypes',
                'minSignificance'
            ]

            for (const field of requiredFields) {
                if (!(field in settingsToValidate)) {
                    return false
                }
            }

            // 检查数值范围
            if (settingsToValidate.bodyThreshold < 0.1 || settingsToValidate.bodyThreshold > 2.0) {
                return false
            }

            if (settingsToValidate.equalPriceThreshold < 0.01 || settingsToValidate.equalPriceThreshold > 1.0) {
                return false
            }

            if (settingsToValidate.longLegThreshold < 1.0 || settingsToValidate.longLegThreshold > 5.0) {
                return false
            }

            if (settingsToValidate.minSignificance < 0.1 || settingsToValidate.minSignificance > 1.0) {
                return false
            }

            // 检查形态类型
            if (!Array.isArray(settingsToValidate.enabledPatternTypes) ||
                settingsToValidate.enabledPatternTypes.length === 0) {
                return false
            }

            return true
        } catch {
            return false
        }
    }

    /**
     * 获取设置摘要
     */
    const getSettingsSummary = () => {
        return {
            enabledPatterns: settings.enabledPatternTypes.map(type => PATTERN_TYPE_NAMES[type]).join(', '),
            sensitivity: `${settings.bodyThreshold}%`,
            minSignificance: `${(settings.minSignificance * 100).toFixed(0)}%`,
            calculationMode: CALCULATION_MODE_NAMES[settings.calculationMode],
            isDefault: isDefaultSettings.value
        }
    }

    // 如果还未加载，自动加载设置
    if (!isLoaded.value) {
        loadSettings()
    }

    return {
        // 状态
        settings,
        loading,
        saving,
        isLoaded,

        // 计算属性
        isDefaultSettings,
        enabledPatternCount,
        settingsHash,

        // 方法
        loadSettings,
        saveSettings,
        resetToDefaults,
        updateSetting,
        updateSettings,
        exportSettings,
        importSettings,
        getPatternTypeConfig,
        getPatternThreshold,
        getMarkerStyleConfig,
        getPerformanceConfig,
        validateSettings,
        getSettingsSummary,

        // 常量
        DEFAULT_DOJI_SETTINGS,
        PATTERN_TYPE_NAMES,
        MARKER_SIZE_MAP,
        CALCULATION_MODE_NAMES
    }
}