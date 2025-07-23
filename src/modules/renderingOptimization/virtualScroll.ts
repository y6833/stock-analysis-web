/**
 * 虚拟滚动指令
 * 用于高效处理大型列表和表格数据
 */
import { ObjectDirective, nextTick } from 'vue';

/**
 * 虚拟滚动配置选项
 */
export interface VirtualScrollOptions {
    // 默认项目高度（像素）
    defaultItemHeight?: number;
    // 缓冲区大小（屏幕高度的倍数）
    bufferSize?: number;
    // 是否使用可变高度
    variableHeight?: boolean;
    // 是否启用平滑滚动
    smoothScroll?: boolean;
}

/**
 * 虚拟滚动状态
 */
interface VirtualScrollState {
    // 容器元素
    container: HTMLElement;
    // 内容包装元素
    wrapper: HTMLElement;
    // 所有项目的高度缓存
    itemHeights: Map<number, number>;
    // 项目总数
    totalItems: number;
    // 可见项目的起始索引
    startIndex: number;
    // 可见项目的结束索引
    endIndex: number;
    // 滚动事件监听器
    scrollHandler: () => void;
    // 调整大小事件监听器
    resizeHandler: () => void;
    // 调整大小观察器
    resizeObserver: ResizeObserver | null;
    // 项目高度观察器
    itemObserver: ResizeObserver | null;
    // 最后一次滚动位置
    lastScrollTop: number;
    // 滚动方向 (1: 向下, -1: 向上)
    scrollDirection: number;
    // 是否正在滚动
    isScrolling: boolean;
    // 滚动定时器
    scrollTimer: number | null;
}

/**
 * 创建虚拟滚动指令
 */
export function createVirtualScrollDirective(options: VirtualScrollOptions = {}): ObjectDirective {
    // 默认配置
    const defaultOptions: Required<VirtualScrollOptions> = {
        defaultItemHeight: 40,
        bufferSize: 1.5,
        variableHeight: true,
        smoothScroll: true,
    };

    // 合并配置
    const mergedOptions: Required<VirtualScrollOptions> = {
        ...defaultOptions,
        ...options,
    };

    // 虚拟滚动状态映射
    const stateMap = new WeakMap<HTMLElement, VirtualScrollState>();

    /**
     * 计算可见项目范围
     */
    const calculateVisibleRange = (state: VirtualScrollState): { startIndex: number; endIndex: number } => {
        const { container, totalItems } = state;
        const { scrollTop, clientHeight } = container;

        // 计算可见区域的项目数量
        const visibleCount = Math.ceil(clientHeight / mergedOptions.defaultItemHeight);

        // 计算缓冲区大小
        const bufferCount = Math.floor(visibleCount * mergedOptions.bufferSize);

        // 计算起始索引（考虑滚动方向优化缓冲区分布）
        let startIndex = Math.floor(scrollTop / mergedOptions.defaultItemHeight);
        startIndex = Math.max(0, startIndex - (state.scrollDirection >= 0 ? bufferCount / 3 : bufferCount * 2 / 3));

        // 计算结束索引
        let endIndex = startIndex + visibleCount + bufferCount;
        endIndex = Math.min(totalItems - 1, endIndex);

        return { startIndex: Math.floor(startIndex), endIndex: Math.ceil(endIndex) };
    };

    /**
     * 更新可见项目
     */
    const updateVisibleItems = (state: VirtualScrollState, force = false): void => {
        const { startIndex: oldStartIndex, endIndex: oldEndIndex } = state;
        const { startIndex: newStartIndex, endIndex: newEndIndex } = calculateVisibleRange(state);

        // 如果可见范围没有变化且不是强制更新，则跳过
        if (!force && oldStartIndex === newStartIndex && oldEndIndex === newEndIndex) {
            return;
        }

        // 更新状态
        state.startIndex = newStartIndex;
        state.endIndex = newEndIndex;

        // 获取数据和容器
        const container = state.container;
        const wrapper = state.wrapper;

        // 获取数据源
        const dataSource = container.__vueParentComponent?.props?.items || [];
        if (!Array.isArray(dataSource) || dataSource.length === 0) {
            return;
        }

        // 计算可见项目
        const visibleItems = dataSource.slice(newStartIndex, newEndIndex + 1);

        // 计算上方空白高度
        let topOffset = 0;
        if (newStartIndex > 0) {
            if (mergedOptions.variableHeight && state.itemHeights.size > 0) {
                // 使用实际项目高度计算
                for (let i = 0; i < newStartIndex; i++) {
                    topOffset += state.itemHeights.get(i) || mergedOptions.defaultItemHeight;
                }
            } else {
                // 使用默认高度计算
                topOffset = newStartIndex * mergedOptions.defaultItemHeight;
            }
        }

        // 设置上方空白高度
        wrapper.style.paddingTop = `${topOffset}px`;

        // 计算下方空白高度
        let bottomOffset = 0;
        if (newEndIndex < state.totalItems - 1) {
            if (mergedOptions.variableHeight && state.itemHeights.size > 0) {
                // 使用实际项目高度计算
                for (let i = newEndIndex + 1; i < state.totalItems; i++) {
                    bottomOffset += state.itemHeights.get(i) || mergedOptions.defaultItemHeight;
                }
            } else {
                // 使用默认高度计算
                bottomOffset = (state.totalItems - newEndIndex - 1) * mergedOptions.defaultItemHeight;
            }
        }

        // 设置下方空白高度
        wrapper.style.paddingBottom = `${bottomOffset}px`;

        // 触发自定义事件，通知组件更新可见项目
        container.dispatchEvent(new CustomEvent('virtual-scroll-update', {
            detail: {
                startIndex: newStartIndex,
                endIndex: newEndIndex,
                visibleItems,
            },
        }));
    };

    /**
     * 处理滚动事件
     */
    const handleScroll = (state: VirtualScrollState): void => {
        const { container } = state;
        const { scrollTop } = container;

        // 确定滚动方向
        state.scrollDirection = scrollTop > state.lastScrollTop ? 1 : -1;
        state.lastScrollTop = scrollTop;

        // 标记正在滚动
        state.isScrolling = true;

        // 清除之前的定时器
        if (state.scrollTimer !== null) {
            window.clearTimeout(state.scrollTimer);
        }

        // 设置滚动结束定时器
        state.scrollTimer = window.setTimeout(() => {
            state.isScrolling = false;
            state.scrollTimer = null;
        }, 150);

        // 更新可见项目
        updateVisibleItems(state);
    };

    /**
     * 处理调整大小事件
     */
    const handleResize = (state: VirtualScrollState): void => {
        // 强制更新可见项目
        updateVisibleItems(state, true);
    };

    /**
     * 观察项目高度变化
     */
    const observeItemHeights = (state: VirtualScrollState): void => {
        if (!mergedOptions.variableHeight || !state.itemObserver) {
            return;
        }

        // 断开之前的观察
        state.itemObserver.disconnect();

        // 获取所有项目元素
        const itemElements = Array.from(state.wrapper.children) as HTMLElement[];

        // 观察每个项目元素
        itemElements.forEach((itemElement, index) => {
            // 计算实际索引
            const actualIndex = state.startIndex + index;

            // 观察元素大小变化
            state.itemObserver?.observe(itemElement);

            // 初始记录高度
            state.itemHeights.set(actualIndex, itemElement.offsetHeight);
        });
    };

    /**
     * 初始化虚拟滚动
     */
    const initVirtualScroll = (el: HTMLElement, binding: any): void => {
        // 获取数据源
        const dataSource = binding.value?.items || [];
        if (!Array.isArray(dataSource)) {
            console.error('[v-virtual-scroll] Expected an array as items');
            return;
        }

        // 设置容器样式
        el.style.overflow = 'auto';
        el.style.position = 'relative';

        // 创建内容包装元素
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.position = 'relative';

        // 将原有内容移动到包装元素中
        while (el.firstChild) {
            wrapper.appendChild(el.firstChild);
        }

        // 将包装元素添加到容器中
        el.appendChild(wrapper);

        // 创建状态对象
        const state: VirtualScrollState = {
            container: el,
            wrapper,
            itemHeights: new Map(),
            totalItems: dataSource.length,
            startIndex: 0,
            endIndex: 0,
            scrollHandler: () => handleScroll(state),
            resizeHandler: () => handleResize(state),
            resizeObserver: null,
            itemObserver: null,
            lastScrollTop: 0,
            scrollDirection: 1,
            isScrolling: false,
            scrollTimer: null,
        };

        // 存储状态
        stateMap.set(el, state);

        // 添加滚动事件监听器
        el.addEventListener('scroll', state.scrollHandler, { passive: true });

        // 创建调整大小观察器
        if (window.ResizeObserver) {
            state.resizeObserver = new ResizeObserver(() => {
                handleResize(state);
            });
            state.resizeObserver.observe(el);

            // 如果使用可变高度，创建项目高度观察器
            if (mergedOptions.variableHeight) {
                state.itemObserver = new ResizeObserver((entries) => {
                    let needsUpdate = false;

                    entries.forEach((entry) => {
                        const itemElement = entry.target as HTMLElement;
                        const index = Array.from(wrapper.children).indexOf(itemElement);

                        if (index !== -1) {
                            const actualIndex = state.startIndex + index;
                            const oldHeight = state.itemHeights.get(actualIndex) || mergedOptions.defaultItemHeight;
                            const newHeight = itemElement.offsetHeight;

                            if (oldHeight !== newHeight) {
                                state.itemHeights.set(actualIndex, newHeight);
                                needsUpdate = true;
                            }
                        }
                    });

                    if (needsUpdate) {
                        updateVisibleItems(state, true);
                    }
                });
            }
        }

        // 初始更新可见项目
        nextTick(() => {
            updateVisibleItems(state, true);
            observeItemHeights(state);
        });
    };

    /**
     * 更新虚拟滚动
     */
    const updateVirtualScroll = (el: HTMLElement, binding: any): void => {
        const state = stateMap.get(el);
        if (!state) return;

        // 获取数据源
        const dataSource = binding.value?.items || [];
        if (!Array.isArray(dataSource)) {
            console.error('[v-virtual-scroll] Expected an array as items');
            return;
        }

        // 更新总项目数
        state.totalItems = dataSource.length;

        // 如果数据源变化，重置高度缓存
        if (binding.oldValue?.items?.length !== dataSource.length) {
            state.itemHeights = new Map();
        }

        // 更新可见项目
        nextTick(() => {
            updateVisibleItems(state, true);
            observeItemHeights(state);
        });
    };

    /**
     * 销毁虚拟滚动
     */
    const destroyVirtualScroll = (el: HTMLElement): void => {
        const state = stateMap.get(el);
        if (!state) return;

        // 移除滚动事件监听器
        el.removeEventListener('scroll', state.scrollHandler);

        // 断开观察器
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
        }

        if (state.itemObserver) {
            state.itemObserver.disconnect();
        }

        // 清除定时器
        if (state.scrollTimer !== null) {
            window.clearTimeout(state.scrollTimer);
        }

        // 删除状态
        stateMap.delete(el);
    };

    // 返回指令对象
    return {
        mounted(el, binding) {
            initVirtualScroll(el, binding);
        },
        updated(el, binding) {
            updateVirtualScroll(el, binding);
        },
        unmounted(el) {
            destroyVirtualScroll(el);
        },
    };
}

// 导出默认函数
export default createVirtualScrollDirective;