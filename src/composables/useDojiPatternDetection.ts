import { ref, onMounted, onUnmounted, watch } from 'vue';
import type { ECharts } from 'echarts';
import { DojiPatternModule } from '../modules/technical-analysis/patterns/doji/DojiPatternModule';
import type { DojiPattern, DojiConfig } from '../types/technical-analysis/doji';
import type { KLineData } from '../types/technical-analysis/kline';

/**
 * 十字星形态检测组合式函数
 * 提供在Vue组件中使用十字星形态检测功能的简便方法
 * 
 * @param initialConfig 初始配置
 * @returns 十字星形态检测相关的状态和方法
 */
export function useDojiPatternDetection(initialConfig?: Partial<DojiConfig>) {
    // 创建十字星形态模块
    const dojiModule = new DojiPatternModule(initialConfig);

    // 状态
    const patterns = ref<DojiPattern[]>([]);
    const selectedPattern = ref<DojiPattern | null>(null);
    const showPatterns = ref<boolean>(true);
    const detailPopupVisible = ref<boolean>(false);
    const isInitialized = ref<boolean>(false);

    // 监听十字星形态选中事件
    const handlePatternSelected = (event: CustomEvent) => {
        const { pattern } = event.detail;
        if (pattern) {
            selectedPattern.value = pattern;
            detailPopupVisible.value = true;
        }
    };

    // 监听十字星形态检测事件
    const handlePatternsDetected = (event: CustomEvent) => {
        const { patterns: detectedPatterns } = event.detail;
        patterns.value = detectedPatterns;
    };

    // 初始化
    onMounted(() => {
        // 添加事件监听
        document.addEventListener('doji-pattern-selected', handlePatternSelected as EventListener);
        document.addEventListener('doji-patterns-detected', handlePatternsDetected as EventListener);
    });

    // 清理
    onUnmounted(() => {
        // 移除事件监听
        document.removeEventListener('doji-pattern-selected', handlePatternSelected as EventListener);
        document.removeEventListener('doji-patterns-detected', handlePatternsDetected as EventListener);

        // 销毁模块
        dojiModule.dispose();
    });

    // 监听显示状态变化
    watch(showPatterns, (show) => {
        dojiModule.setShowPatterns(show);
    });

    /**
     * 初始化十字星形态检测
     * @param chart ECharts 实例
     * @param timeframe 时间周期
     */
    const initialize = (chart: ECharts, timeframe: string = '1d') => {
        dojiModule.initialize(chart, timeframe);
        isInitialized.value = true;
    };

    /**
     * 分析K线数据，检测十字星形态
     * @param klines K线数据数组
     * @param stockId 股票ID
     * @param stockName 股票名称
     * @returns 检测到的十字星形态数组
     */
    const analyzeKLines = (klines: KLineData[], stockId: string = '', stockName: string = '') => {
        if (!isInitialized.value) {
            console.warn('DojiPatternDetection not initialized. Call initialize() first.');
            return [];
        }

        const detectedPatterns = dojiModule.analyzeKLines(klines, stockId, stockName);
        patterns.value = detectedPatterns;
        return detectedPatterns;
    };

    /**
     * 切换十字星形态显示状态
     * @returns 当前显示状态
     */
    const togglePatterns = () => {
        const show = dojiModule.togglePatterns();
        showPatterns.value = show;
        return show;
    };

    /**
     * 高亮特定的十字星形态
     * @param patternId 形态ID
     */
    const highlightPattern = (patternId: string) => {
        dojiModule.highlightPattern(patternId);
    };

    /**
     * 设置时间周期
     * @param timeframe 时间周期
     */
    const setTimeframe = (timeframe: string) => {
        dojiModule.setTimeframe(timeframe);
    };

    /**
     * 更新配置
     * @param config 新的配置参数
     */
    const updateConfig = (config: Partial<DojiConfig>) => {
        dojiModule.updateConfig(config);
    };

    /**
     * 获取当前配置
     * @returns 当前配置
     */
    const getConfig = () => {
        return dojiModule.getConfig();
    };

    /**
     * 选择十字星形态
     * @param pattern 十字星形态
     */
    const selectPattern = (pattern: DojiPattern) => {
        selectedPattern.value = pattern;
        dojiModule.setSelectedPattern(pattern);
        detailPopupVisible.value = true;
    };

    /**
     * 关闭详情弹窗
     */
    const closeDetailPopup = () => {
        detailPopupVisible.value = false;
    };

    return {
        // 状态
        patterns,
        selectedPattern,
        showPatterns,
        detailPopupVisible,
        isInitialized,

        // 方法
        initialize,
        analyzeKLines,
        togglePatterns,
        highlightPattern,
        setTimeframe,
        updateConfig,
        getConfig,
        selectPattern,
        closeDetailPopup
    };
} import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import type { ECharts } from 'echarts';
import { DojiPatternModule } from '../modules/technical-analysis/patterns/doji/DojiPatternModule';
import type { DojiPattern, DojiConfig } from '../types/technical-analysis/doji';
import type { KLineData } from '../types/technical-analysis/kline';

/**
 * 十字星形态检测组合式函数
 * 提供在Vue组件中使用十字星形态检测功能的简便方法
 * 
 * @param initialConfig 初始配置
 * @returns 十字星形态检测相关的状态和方法
 */
export function useDojiPatternDetection(initialConfig?: Partial<DojiConfig>) {
    // 创建十字星形态模块
    const dojiModule = new DojiPatternModule(initialConfig);

    // 状态
    const patterns = ref<DojiPattern[]>([]);
    const selectedPattern = ref<DojiPattern | null>(null);
    const showPatterns = ref<boolean>(true);
    const detailPopupVisible = ref<boolean>(false);

    const state = reactive({
        initialized: false,
        loading: false,
        error: null as string | null,
    });

    // 监听十字星形态选中事件
    const handlePatternSelected = (event: CustomEvent) => {
        const { pattern } = event.detail;
        if (pattern) {
            selectedPattern.value = pattern;
            detailPopupVisible.value = true;
        }
    };

    // 监听十字星形态检测事件
    const handlePatternsDetected = (event: CustomEvent) => {
        const { patterns: detectedPatterns } = event.detail;
        patterns.value = detectedPatterns;
    };

    // 初始化
    onMounted(() => {
        // 添加事件监听
        document.addEventListener('doji-pattern-selected', handlePatternSelected as EventListener);
        document.addEventListener('doji-patterns-detected', handlePatternsDetected as EventListener);
    });

    // 清理
    onUnmounted(() => {
        // 移除事件监听
        document.removeEventListener('doji-pattern-selected', handlePatternSelected as EventListener);
        document.removeEventListener('doji-patterns-detected', handlePatternsDetected as EventListener);

        // 销毁模块
        dojiModule.dispose();
    });

    // 监听显示状态变化
    watch(showPatterns, (show) => {
        dojiModule.setShowPatterns(show);
    });

    /**
     * 初始化十字星形态检测
     * @param chart ECharts 实例
     * @param timeframe 时间周期
     */
    const initialize = (chart: ECharts, timeframe: string = '1d') => {
        dojiModule.initialize(chart, timeframe);
        state.initialized = dojiModule.getState().initialized;
        state.error = dojiModule.getState().error;
    };

    /**
     * 分析K线数据，检测十字星形态
     * @param klines K线数据数组
     * @param stockId 股票ID
     * @param stockName 股票名称
     */
    const analyzeKLines = (klines: KLineData[], stockId: string = '', stockName: string = '') => {
        state.loading = true;
        dojiModule.analyzeKLines(klines, stockId, stockName);

        // 更新状态
        const moduleState = dojiModule.getState();
        state.loading = moduleState.loading;
        state.error = moduleState.error;

        // 更新形态数据
        patterns.value = dojiModule.getPatterns();
    };

    /**
     * 切换十字星形态显示状态
     * @returns 当前显示状态
     */
    const togglePatterns = () => {
        const show = dojiModule.togglePatterns();
        showPatterns.value = show;
        return show;
    };

    /**
     * 高亮特定的十字星形态
     * @param patternId 形态ID
     */
    const highlightPattern = (patternId: string) => {
        dojiModule.highlightPattern(patternId);
    };

    /**
     * 设置时间周期
     * @param timeframe 时间周期
     */
    const setTimeframe = (timeframe: string) => {
        dojiModule.setTimeframe(timeframe);
    };

    /**
     * 更新配置
     * @param config 新的配置参数
     */
    const updateConfig = (config: Partial<DojiConfig>) => {
        dojiModule.updateConfig(config);
    };

    /**
     * 获取当前配置
     * @returns 当前配置
     */
    const getConfig = () => {
        return dojiModule.getConfig();
    };

    /**
     * 选择十字星形态
     * @param pattern 十字星形态
     */
    const selectPattern = (pattern: DojiPattern) => {
        selectedPattern.value = pattern;
        dojiModule.setSelectedPattern(pattern);
        detailPopupVisible.value = true;
    };

    /**
     * 关闭详情弹窗
     */
    const closeDetailPopup = () => {
        detailPopupVisible.value = false;
    };

    return {
        // 状态
        patterns,
        selectedPattern,
        showPatterns,
        detailPopupVisible,
        state,

        // 方法
        initialize,
        analyzeKLines,
        togglePatterns,
        highlightPattern,
        setTimeframe,
        updateConfig,
        getConfig,
        selectPattern,
        closeDetailPopup
    };
}