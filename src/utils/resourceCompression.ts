/**
 * 资源压缩与优化工具
 * 提供客户端资源压缩和优化功能
 */

/**
 * 图片质量级别
 */
export enum ImageQuality {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    ORIGINAL = 'original'
}

/**
 * 图片格式
 */
export enum ImageFormat {
    JPEG = 'image/jpeg',
    PNG = 'image/png',
    WEBP = 'image/webp',
    AVIF = 'image/avif'
}

/**
 * 图片压缩选项
 */
export interface ImageCompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: ImageFormat;
    preserveExif?: boolean;
}

/**
 * 检测浏览器支持的图片格式
 * @returns 支持的图片格式列表
 */
export function detectSupportedImageFormats(): ImageFormat[] {
    if (typeof window === 'undefined') return [ImageFormat.JPEG, ImageFormat.PNG]

    const formats: ImageFormat[] = [ImageFormat.JPEG, ImageFormat.PNG]

    // 检测WebP支持
    const webpCanvas = document.createElement('canvas')
    if (webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
        formats.push(ImageFormat.WEBP)
    }

    // 检测AVIF支持
    const img = new Image()
    img.onload = () => {
        if (img.width > 0 && img.height > 0) {
            formats.push(ImageFormat.AVIF)
        }
    }
    img.onerror = () => {
        // AVIF不支持
    }

    // 尝试加载1x1像素的AVIF图片
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK'

    return formats
}

/**
 * 压缩图片
 * @param imageFile 图片文件
 * @param options 压缩选项
 * @returns Promise<Blob> 压缩后的图片Blob
 */
export function compressImage(
    imageFile: File | Blob,
    options: ImageCompressionOptions = {}
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            // 计算新尺寸
            let width = img.width
            let height = img.height

            if (options.maxWidth && width > options.maxWidth) {
                const ratio = options.maxWidth / width
                width = options.maxWidth
                height = Math.round(height * ratio)
            }

            if (options.maxHeight && height > options.maxHeight) {
                const ratio = options.maxHeight / height
                height = options.maxHeight
                width = Math.round(width * ratio)
            }

            // 创建Canvas
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            // 绘制图片
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
            }

            ctx.drawImage(img, 0, 0, width, height)

            // 转换为Blob
            const format = options.format || ImageFormat.JPEG
            const quality = options.quality !== undefined ? options.quality : 0.8

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Failed to compress image'))
                    }
                },
                format,
                quality
            )
        }

        img.onerror = () => {
            reject(new Error('Failed to load image'))
        }

        // 加载图片
        const url = URL.createObjectURL(imageFile)
        img.src = url

        // 清理URL
        return () => {
            URL.revokeObjectURL(url)
        }
    })
}

/**
 * 根据网络状况选择图片质量
 * @returns 推荐的图片质量级别
 */
export function getRecommendedImageQuality(): ImageQuality {
    if (typeof navigator === 'undefined') return ImageQuality.MEDIUM

    // @ts-ignore - connection属性可能不存在于某些浏览器
    const connection = navigator.connection

    if (!connection) return ImageQuality.MEDIUM

    // 根据网络类型和保存数据模式选择质量
    if (connection.saveData) {
        return ImageQuality.LOW
    }

    switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
            return ImageQuality.LOW
        case '3g':
            return ImageQuality.MEDIUM
        case '4g':
            return ImageQuality.HIGH
        default:
            return ImageQuality.MEDIUM
    }
}

/**
 * 获取最佳图片URL
 * 根据设备和网络状况选择最合适的图片
 * @param urls 不同质量的图片URL映射
 * @returns 最佳图片URL
 */
export function getBestImageUrl(urls: Record<ImageQuality, string>): string {
    const quality = getRecommendedImageQuality()
    return urls[quality] || urls[ImageQuality.MEDIUM]
}

/**
 * 创建响应式图片源集
 * @param baseUrl 基础URL
 * @param widths 宽度列表
 * @param format 图片格式
 * @returns 源集字符串
 */
export function createResponsiveSrcset(
    baseUrl: string,
    widths: number[],
    format: string = 'webp'
): string {
    return widths
        .map(width => {
            // 假设URL模式为: path/image.jpg -> path/image_800.webp
            const url = baseUrl.replace(/(\.[^.]+)$/, `_${width}.${format}`)
            return `${url} ${width}w`
        })
        .join(', ')
}

/**
 * 创建图片占位符
 * 生成低质量的图片占位符
 * @param color 占位符颜色
 * @param width 宽度
 * @param height 高度
 * @returns 占位符数据URL
 */
export function createImagePlaceholder(
    color: string = '#e0e0e0',
    width: number = 1,
    height: number = 1
): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (ctx) {
        ctx.fillStyle = color
        ctx.fillRect(0, 0, width, height)
    }

    return canvas.toDataURL('image/png')
}