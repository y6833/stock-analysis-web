/**
 * 组件记忆化工具
 * 提供组件渲染优化，减少不必要的重渲染
 */
import { defineComponent, h, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import type { Component, VNode } from 'vue';

/**
 * 深度比较两个值是否相等
 */
function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (
        typeof a !== 'object' ||
        typeof b !== 'object' ||
        a === null ||
        b === null
    ) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

/**
 * 创建记忆化组件
 */
export function createMemoComponent() {
    return defineComponent({
        name: 'MemoComponent',
        props: {
            /**
             * 要渲染的组件
             */
            component: {
                type: [Object, Function] as () => Component | string,
                required: true,
            },
            /**
             * 组件的属性
             */
            props: {
                type: Object,
                default: () => ({}),
            },
            /**
             * 是否使用深度比较
             */
            deep: {
                type: Boolean,
                default: false,
            },
            /**
             * 自定义比较函数
             */
            compareWith: {
                type: Function as () => (prev: any, next: any) => boolean,
                default: null,
            },
            /**
             * 是否启用防抖
             */
            debounce: {
                type: Boolean,
                default: false,
            },
            /**
             * 防抖延迟（毫秒）
             */
            debounceDelay: {
                type: Number,
                default: 16, // 约一帧的时间
            },
        },
        setup(props, { slots }) {
            // 缓存上一次的属性
            const prevProps = ref(props.props);
            // 是否需要重新渲染
            const shouldRender = ref(true);
            // 当前渲染的VNode
            const currentVNode = ref<VNode | null>(null);
            // 防抖定时器
            let debounceTimer: number | null = null;

            // 清除防抖定时器
            const clearDebounceTimer = () => {
                if (debounceTimer !== null) {
                    window.clearTimeout(debounceTimer);
                    debounceTimer = null;
                }
            };

            // 比较属性是否变化
            const compareProps = (prev: any, next: any): boolean => {
                if (props.compareWith) {
                    return props.compareWith(prev, next);
                }

                if (props.deep) {
                    return deepEqual(prev, next);
                }

                // 默认浅比较
                if (prev === next) return true;

                if (
                    typeof prev !== 'object' ||
                    typeof next !== 'object' ||
                    prev === null ||
                    next === null
                ) {
                    return prev === next;
                }

                const prevKeys = Object.keys(prev);
                const nextKeys = Object.keys(next);

                if (prevKeys.length !== nextKeys.length) return false;

                return prevKeys.every(key => prev[key] === next[key]);
            };

            // 监听属性变化
            watch(
                () => props.props,
                (newProps) => {
                    const needsUpdate = !compareProps(prevProps.value, newProps);

                    if (needsUpdate) {
                        if (props.debounce) {
                            // 使用防抖延迟更新
                            clearDebounceTimer();
                            debounceTimer = window.setTimeout(() => {
                                prevProps.value = { ...newProps };
                                shouldRender.value = true;
                                nextTick(() => {
                                    shouldRender.value = false;
                                });
                            }, props.debounceDelay);
                        } else {
                            // 立即更新
                            prevProps.value = { ...newProps };
                            shouldRender.value = true;
                            nextTick(() => {
                                shouldRender.value = false;
                            });
                        }
                    }
                },
                { immediate: true, deep: true }
            );

            // 组件卸载时清除定时器
            onBeforeUnmount(() => {
                clearDebounceTimer();
            });

            // 初始渲染
            onMounted(() => {
                shouldRender.value = false;
            });

            return () => {
                // 如果需要重新渲染或者还没有渲染过
                if (shouldRender.value || !currentVNode.value) {
                    // 渲染组件
                    const vnode = h(
                        props.component,
                        props.props,
                        slots.default ? slots.default() : undefined
                    );

                    // 缓存渲染结果
                    currentVNode.value = vnode;
                    return vnode;
                }

                // 返回缓存的渲染结果
                return currentVNode.value;
            };
        },
    });
}

// 导出默认函数
export default createMemoComponent;