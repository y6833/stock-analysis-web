import { ref, reactive, watch } from 'vue';
import type { ECharts } from 'echarts';
import { DojiPatternDetector } from './DojiPatternDetector';
import { DojiPatternVisualizer } from './DojiPatternVisualizer';
import { DojiPatternAnalyzer } from './DojiPatternAnalyzer';
import { StockDataServiceImpl } from '../../../../services/StockDataService';
import type { DojiPattern, DojiConfig, DojiType } from '../../../../types/technical-analysis/doji';
import type { KLineData, MarketCondition } from '../../../../types/technical-analysis/kline';
import type { PriceMovementAnalysis, SuccessRateStats, PriceDistribution } from '../../../../types/technical-analysis/doji-analysis';

/**
 * 十字星形态模块
 * 集成十字星检测器、可视化器和分析器，提供统一的接口
 */
export class DojiPatternModule {
    /**
     * 十字星检测器
     */
    private detector: DojiPatternDetector;

    /**
     * 十字星可视化器
     */
    private visualizer: DojiPatternVisualizer | null = null;

    /**
     * 十字星分析器
     */
    private analyzer: DojiPatternAnalyzer;

    /**
     * 检测到的十字星形态
     */
    private patterns = ref<DojiPattern[]>([]);

    /**
     * 当前选中的十字星形态
     */
    private selectedPattern = ref<DojiPattern | null>(null);

    /**
     * 是否显示十字星形态
     */
    private showPatterns = ref<boolean>(true);

    /**
     * 模块状态
     */
    private state = reactive({
        initialized: false,
        loading: false,
        error: null as string | null,
    });

    /**
     * 构造函数
     * @param config 可选的配置参数
     * @param apiBaseUrl API基础URL
     */
    constructor(config?: Partial<DojiConfig>, apiBaseUrl: string = '/api') {
        // 创建十字星检测器
        this.detector = new DojiPatternDetector(config);

        // 创建股票数据服务
        const stockDataService = new StockDataServiceImpl(apiBaseUrl);

        // 创建十字星分析器
        this.analyzer = new DojiPatternAnalyzer(stockDataService);

        // 监听显示状态变化
        watch(this.showPatterns, (show) => {
            if (this.visualizer) {
                if (show) {
                    this.visualizer.showMarkers();
                } else {
                    this.visualizer.hideMarkers();
                }
            }
        });
    }

    /**
     * 初始化模块
     * @param chart ECharts 实例
     * @param timeframe 时间周期
     */
    public initialize(chart: ECharts, timeframe: string = '1d'): void {
        if (this.state.initialized) {
            return;
        }

        try {
            // 创建十字星可视化器
            this.visualizer = new DojiPatternVisualizer(chart, timeframe);

            // 设置初始化状态
            this.state.initialized = true;
            this.state.error = null;

            // 设置事件监听
            this.setupEventListeners();
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to initialize DojiPatternModule:', error);
        }
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners(): void {
        // 监听十字星形态点击事件
        document.addEventListener('doji-pattern-click', ((event: CustomEvent) => {
            const { pattern } = event.detail;
            if (pattern) {
                this.selectedPattern.value = pattern;
                this.emitPatternSelected(pattern);
            }
        }) as EventListener);
    }

    /**
     * 分析K线数据，检测十字星形态
     * @param klines K线数据数组
     * @param stockId 股票ID
     * @param stockName 股票名称
     * @returns Promise<void>
     */
    public async analyzeKLines(klines: KLineData[], stockId: string = '', stockName: string = ''): Promise<void> {
        if (!this.state.initialized) {
            console.warn('DojiPatternModule not initialized');
            return;
        }

        this.state.loading = true;

        try {
            // 检测十字星形态 (使用异步方法)
            const detectedPatterns = await this.detector.detectPatterns(klines, stockId, stockName);

            // 更新形态数据
            this.patterns.value = detectedPatterns;

            // 更新可视化器
            if (this.visualizer) {
                this.visualizer.setPatterns(detectedPatterns);

                // 根据显示状态设置标记可见性
                if (this.showPatterns.value) {
                    this.visualizer.showMarkers();
                } else {
                    this.visualizer.hideMarkers();
                }
            }

            // 触发形态检测事件
            this.emitPatternsDetected(detectedPatterns);
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to analyze K-lines:', error);
        } finally {
            this.state.loading = false;
        }
    }

    /**
     * 分析价格走势
     * @param pattern 十字星形态
     * @param days 天数
     * @returns 价格走势分析
     */
    public async analyzePriceMovement(pattern: DojiPattern, days: number = 5): Promise<PriceMovementAnalysis> {
        try {
            return await this.analyzer.analyzePriceMovement(pattern, days);
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to analyze price movement:', error);
            throw error;
        }
    }

    /**
     * 计算成功率
     * @param patternType 形态类型
     * @param timeframe 时间周期
     * @param marketCondition 市场环境
     * @returns 成功率统计
     */
    public async calculateSuccessRate(
        patternType: DojiType,
        timeframe: string,
        marketCondition?: MarketCondition
    ): Promise<SuccessRateStats> {
        try {
            return await this.analyzer.calculateSuccessRate(patternType, timeframe, marketCondition);
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to calculate success rate:', error);
            throw error;
        }
    }

    /**
     * 获取价格分布
     * @param patternType 形态类型
     * @param days 天数
     * @returns 价格分布
     */
    public async getPriceDistribution(patternType: DojiType, days: number): Promise<PriceDistribution> {
        try {
            return await this.analyzer.getPriceDistribution(patternType, days);
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to get price distribution:', error);
            throw error;
        }
    }

    /**
     * 查找相似形态
     * @param pattern 十字星形态
     * @returns 相似形态列表
     */
    public async findSimilarPatterns(pattern: DojiPattern): Promise<DojiPattern[]> {
        try {
            return await this.analyzer.findSimilarPatterns(pattern);
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            console.error('Failed to find similar patterns:', error);
            throw error;
        }
    }

    /**
     * 切换十字星形态显示状态
     * @returns 当前显示状态
     */
    public togglePatterns(): boolean {
        this.showPatterns.value = !this.showPatterns.value;
        return this.showPatterns.value;
    }

    /**
     * 设置十字星形态显示状态
     * @param show 是否显示
     */
    public setShowPatterns(show: boolean): void {
        this.showPatterns.value = show;
    }

    /**
     * 高亮特定的十字星形态
     * @param patternId 形态ID
     */
    public highlightPattern(patternId: string): void {
        if (this.visualizer) {
            this.visualizer.highlightPattern(patternId);
        }
    }

    /**
     * 设置时间周期
     * @param timeframe 时间周期
     */
    public setTimeframe(timeframe: string): void {
        if (this.visualizer) {
            this.visualizer.setTimeframe(timeframe);
        }
    }

    /**
     * 更新配置
     * @param config 新的配置参数
     * @returns Promise<void>
     */
    public async updateConfig(config: Partial<DojiConfig>): Promise<void> {
        await this.detector.updateConfig(config);

        // 触发配置变更事件
        this.emitConfigChanged(config);
    }

    /**
     * 获取当前配置
     * @returns 当前配置
     */
    public getConfig(): DojiConfig {
        return this.detector.getConfig();
    }

    /**
     * 获取检测到的十字星形态
     * @returns 十字星形态数组
     */
    public getPatterns(): DojiPattern[] {
        return this.patterns.value;
    }

    /**
     * 获取当前选中的十字星形态
     * @returns 选中的十字星形态
     */
    public getSelectedPattern(): DojiPattern | null {
        return this.selectedPattern.value;
    }

    /**
     * 设置选中的十字星形态
     * @param pattern 十字星形态
     */
    public setSelectedPattern(pattern: DojiPattern | null): void {
        this.selectedPattern.value = pattern;

        if (pattern) {
            this.highlightPattern(pattern.id);
            this.emitPatternSelected(pattern);
        }
    }

    /**
     * 获取模块状态
     * @returns 模块状态
     */
    public getState(): { initialized: boolean; loading: boolean; error: string | null } {
        return { ...this.state };
    }

    /**
     * 销毁模块
     */
    public dispose(): void {
        // 移除事件监听
        document.removeEventListener('doji-pattern-click', (() => { }) as EventListener);

        // 销毁可视化器
        if (this.visualizer) {
            this.visualizer.dispose();
            this.visualizer = null;
        }

        // 重置状态
        this.patterns.value = [];
        this.selectedPattern.value = null;
        this.state.initialized = false;
    }

    /**
     * 触发形态检测事件
     * @param patterns 检测到的形态
     */
    private emitPatternsDetected(patterns: DojiPattern[]): void {
        const event = new CustomEvent('doji-patterns-detected', {
            detail: {
                patterns,
                count: patterns.length
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 触发形态选中事件
     * @param pattern 选中的形态
     */
    private emitPatternSelected(pattern: DojiPattern): void {
        const event = new CustomEvent('doji-pattern-selected', {
            detail: {
                pattern
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 触发配置变更事件
     * @param config 新的配置
     */
    private emitConfigChanged(config: Partial<DojiConfig>): void {
        const event = new CustomEvent('doji-config-changed', {
            detail: {
                config
            }
        });
        document.dispatchEvent(event);
    }
}