/**
 * 图片懒加载指令
 * 使用方法: v-lazy-image="imageUrl"
 */

import type { Directive, DirectiveBinding } from 'vue';

interface LazyImageOptions {
    src: string;
    loading?: string;
    error?: string;
}

// 创建交叉观察器实例
const createObserver = () => {
    return new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement;
                const dataSrc = img.getAttribute('data-src');

                if (dataSrc) {
                    // 创建新图片预加载
                    const newImg = new Image();
                    newImg.src = dataSrc;

                    // 图片加载成功
                    newImg.onload = () => {
                        img.src = dataSrc;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    };

                    // 图片加载失败
                    newImg.onerror = () => {
                        const errorSrc = img.getAttribute('data-error');
                        if (errorSrc) {
                            img.src = errorSrc;
                        }
                        observer.unobserve(img);
                    };
                }
            }
        });
    }, {
        rootMargin: '0px 0px 200px 0px', // 提前200px加载
        threshold: 0.01
    });
};

// 创建全局观察器实例
let observer: IntersectionObserver | null = null;

// 懒加载图片指令
export const lazyImage: Directive = {
    beforeMount(el: HTMLImageElement, binding: DirectiveBinding) {
        // 初始化观察器
        if (!observer) {
            observer = createObserver();
        }

        // 获取图片URL
        const value = binding.value;
        let src: string;
        let loadingSrc: string = '';
        let errorSrc: string = '';

        if (typeof value === 'string') {
            src = value;
        } else if (typeof value === 'object') {
            const options = value as LazyImageOptions;
            src = options.src;
            loadingSrc = options.loading || '';
            errorSrc = options.error || '';
        } else {
            return;
        }

        // 设置加载中的占位图
        if (loadingSrc) {
            el.src = loadingSrc;
        } else {
            // 使用内联SVG作为默认占位符
            el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg==';
        }

        // 添加CSS类
        el.classList.add('lazy-image');

        // 存储实际图片URL
        el.setAttribute('data-src', src);

        if (errorSrc) {
            el.setAttribute('data-error', errorSrc);
        }

        // 开始观察元素
        observer.observe(el);
    },

    updated(el: HTMLImageElement, binding: DirectiveBinding) {
        // 更新图片URL
        const value = binding.value;
        let src: string;

        if (typeof value === 'string') {
            src = value;
        } else if (typeof value === 'object') {
            const options = value as LazyImageOptions;
            src = options.src;
        } else {
            return;
        }

        // 如果URL变化，更新data-src属性
        if (el.getAttribute('data-src') !== src) {
            el.classList.remove('loaded');
            el.setAttribute('data-src', src);

            // 如果元素已经在视口中，立即加载
            if (observer) {
                observer.unobserve(el);
                observer.observe(el);
            }
        }
    },

    unmounted(el: HTMLImageElement) {
        // 停止观察元素
        if (observer) {
            observer.unobserve(el);
        }
    }
};