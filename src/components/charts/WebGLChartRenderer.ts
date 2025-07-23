/**
 * WebGL图表渲染器
 * 使用WebGL加速图表渲染，提高大数据集的渲染性能
 */

// WebGL着色器程序
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform vec2 u_resolution;
  uniform float u_pointSize;
  
  varying vec4 v_color;
  
  void main() {
    // 转换坐标到裁剪空间
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = u_pointSize;
    
    v_color = a_color;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
  }
`;

// 线段着色器
const LINE_VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform vec2 u_resolution;
  
  varying vec4 v_color;
  
  void main() {
    // 转换坐标到裁剪空间
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    
    v_color = a_color;
  }
`;

// 蜡烛图着色器
const CANDLESTICK_VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_type; // 0: 上影线, 1: 下影线, 2: 实体
  
  uniform vec2 u_resolution;
  uniform float u_width;
  
  varying vec4 v_color;
  varying float v_type;
  
  void main() {
    // 转换坐标到裁剪空间
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    
    v_color = a_color;
    v_type = a_type;
  }
`;

const CANDLESTICK_FRAGMENT_SHADER = `
  precision mediump float;
  
  varying vec4 v_color;
  varying float v_type;
  
  void main() {
    gl_FragColor = v_color;
  }
`;

/**
 * 创建WebGL着色器
 */
function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) return shader

    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
}

/**
 * 创建WebGL程序
 */
function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
): WebGLProgram | null {
    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
}

/**
 * WebGL图表渲染器类
 */
export class WebGLChartRenderer {
    private canvas: HTMLCanvasElement
    private gl: WebGLRenderingContext | null = null
    private pointProgram: WebGLProgram | null = null
    private lineProgram: WebGLProgram | null = null
    private candlestickProgram: WebGLProgram | null = null
    private width = 0
    private height = 0
    private dpr = window.devicePixelRatio || 1

    // 缓存的数据
    private pointsBuffer: WebGLBuffer | null = null
    private pointsColorBuffer: WebGLBuffer | null = null
    private linesBuffer: WebGLBuffer | null = null
    private linesColorBuffer: WebGLBuffer | null = null
    private candlesticksBuffer: WebGLBuffer | null = null
    private candlesticksColorBuffer: WebGLBuffer | null = null
    private candlesticksTypeBuffer: WebGLBuffer | null = null

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.initWebGL()
    }

    /**
     * 初始化WebGL
     */
    private initWebGL(): void {
        try {
            // 获取WebGL上下文
            this.gl = this.canvas.getContext('webgl', {
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true
            })

            if (!this.gl) {
                console.error('WebGL not supported')
                return
            }

            // 创建着色器程序
            const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, VERTEX_SHADER)
            const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

            if (!vertexShader || !fragmentShader) {
                console.error('Failed to create shaders')
                return
            }

            // 创建点程序
            this.pointProgram = createProgram(this.gl, vertexShader, fragmentShader)

            // 创建线段着色器
            const lineVertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, LINE_VERTEX_SHADER)

            if (!lineVertexShader) {
                console.error('Failed to create line vertex shader')
                return
            }

            // 创建线段程序
            this.lineProgram = createProgram(this.gl, lineVertexShader, fragmentShader)

            // 创建蜡烛图着色器
            const candlestickVertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, CANDLESTICK_VERTEX_SHADER)
            const candlestickFragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, CANDLESTICK_FRAGMENT_SHADER)

            if (!candlestickVertexShader || !candlestickFragmentShader) {
                console.error('Failed to create candlestick shaders')
                return
            }

            // 创建蜡烛图程序
            this.candlestickProgram = createProgram(this.gl, candlestickVertexShader, candlestickFragmentShader)

            // 创建缓冲区
            this.pointsBuffer = this.gl.createBuffer()
            this.pointsColorBuffer = this.gl.createBuffer()
            this.linesBuffer = this.gl.createBuffer()
            this.linesColorBuffer = this.gl.createBuffer()
            this.candlesticksBuffer = this.gl.createBuffer()
            this.candlesticksColorBuffer = this.gl.createBuffer()
            this.candlesticksTypeBuffer = this.gl.createBuffer()

            // 设置视口
            this.resize()
        } catch (error) {
            console.error('Failed to initialize WebGL:', error)
        }
    }

    /**
     * 调整大小
     */
    resize(): void {
        if (!this.gl) return

        // 获取画布尺寸
        const displayWidth = this.canvas.clientWidth * this.dpr
        const displayHeight = this.canvas.clientHeight * this.dpr

        // 检查画布尺寸是否需要调整
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth
            this.canvas.height = displayHeight
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
        }

        this.width = this.canvas.width
        this.height = this.canvas.height
    }

    /**
     * 清除画布
     */
    clear(color: [number, number, number, number] = [1, 1, 1, 1]): void {
        if (!this.gl) return

        this.gl.clearColor(color[0], color[1], color[2], color[3])
        this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    }

    /**
     * 绘制点
     */
    drawPoints(
        points: number[],
        colors: number[],
        pointSize: number = 3
    ): void {
        if (!this.gl || !this.pointProgram || !this.pointsBuffer || !this.pointsColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.pointProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.pointProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 设置点大小
        const pointSizeLocation = this.gl.getUniformLocation(this.pointProgram, 'u_pointSize')
        this.gl.uniform1f(pointSizeLocation, pointSize * this.dpr)

        // 设置位置
        const positionLocation = this.gl.getAttribLocation(this.pointProgram, 'a_position')
        this.gl.enableVertexAttribArray(positionLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointsBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // 设置颜色
        const colorLocation = this.gl.getAttribLocation(this.pointProgram, 'a_color')
        this.gl.enableVertexAttribArray(colorLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointsColorBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

        // 绘制点
        this.gl.drawArrays(this.gl.POINTS, 0, points.length / 2)
    }

    /**
     * 绘制线段
     */
    drawLines(
        points: number[],
        colors: number[]
    ): void {
        if (!this.gl || !this.lineProgram || !this.linesBuffer || !this.linesColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.lineProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 设置位置
        const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
        this.gl.enableVertexAttribArray(positionLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // 设置颜色
        const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
        this.gl.enableVertexAttribArray(colorLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

        // 绘制线段
        this.gl.drawArrays(this.gl.LINE_STRIP, 0, points.length / 2)
    }

    /**
     * 绘制折线图
     */
    drawLineChart(
        data: number[],
        xScale: number,
        yScale: number,
        xOffset: number,
        yOffset: number,
        color: [number, number, number, number] = [0, 0, 1, 1]
    ): void {
        if (!data.length) return

        const points: number[] = []
        const colors: number[] = []

        // 准备数据
        for (let i = 0; i < data.length; i++) {
            const x = i * xScale + xOffset
            const y = data[i] * yScale + yOffset

            points.push(x, y)
            colors.push(...color)
        }

        // 绘制线段
        this.drawLines(points, colors)
    }

    /**
     * 绘制K线图
     */
    drawCandlestickChart(
        opens: number[],
        highs: number[],
        lows: number[],
        closes: number[],
        xScale: number,
        yScale: number,
        xOffset: number,
        yOffset: number,
        width: number = 6,
        upColor: [number, number, number, number] = [0, 0.8, 0, 1],
        downColor: [number, number, number, number] = [0.8, 0, 0, 1]
    ): void {
        if (!opens.length || !highs.length || !lows.length || !closes.length) return

        // 使用线段绘制K线图
        for (let i = 0; i < opens.length; i++) {
            const x = i * xScale + xOffset
            const open = opens[i] * yScale + yOffset
            const high = highs[i] * yScale + yOffset
            const low = lows[i] * yScale + yOffset
            const close = closes[i] * yScale + yOffset

            // 确定颜色
            const isUp = closes[i] >= opens[i]
            const color = isUp ? upColor : downColor

            // 绘制上影线
            this.drawLines(
                [x, high, x, Math.max(open, close)],
                [color[0], color[1], color[2], color[3], color[0], color[1], color[2], color[3]]
            )

            // 绘制下影线
            this.drawLines(
                [x, Math.min(open, close), x, low],
                [color[0], color[1], color[2], color[3], color[0], color[1], color[2], color[3]]
            )

            // 绘制实体
            const halfWidth = width / 2
            const rectPoints = [
                x - halfWidth, open,
                x + halfWidth, open,
                x + halfWidth, close,
                x - halfWidth, close,
                x - halfWidth, open
            ]

            const rectColors = Array(5).fill(color).flat()

            if (isUp) {
                // 阳线空心
                this.drawLines(rectPoints, rectColors)
            } else {
                // 阴线实心 - 使用两个三角形填充
                if (this.gl && this.lineProgram && this.linesBuffer && this.linesColorBuffer) {
                    // 使用程序
                    this.gl.useProgram(this.lineProgram)

                    // 设置分辨率
                    const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
                    this.gl.uniform2f(resolutionLocation, this.width, this.height)

                    // 三角形1
                    const trianglePoints1 = [
                        x - halfWidth, open,
                        x + halfWidth, open,
                        x - halfWidth, close
                    ]

                    const triangleColors1 = Array(3).fill(color).flat()

                    // 设置位置
                    const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
                    this.gl.enableVertexAttribArray(positionLocation)
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(trianglePoints1), this.gl.STATIC_DRAW)
                    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

                    // 设置颜色
                    const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
                    this.gl.enableVertexAttribArray(colorLocation)
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(triangleColors1), this.gl.STATIC_DRAW)
                    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

                    // 绘制三角形
                    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)

                    // 三角形2
                    const trianglePoints2 = [
                        x + halfWidth, open,
                        x + halfWidth, close,
                        x - halfWidth, close
                    ]

                    const triangleColors2 = Array(3).fill(color).flat()

                    // 设置位置
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(trianglePoints2), this.gl.STATIC_DRAW)
                    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

                    // 设置颜色
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(triangleColors2), this.gl.STATIC_DRAW)
                    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

                    // 绘制三角形
                    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
                }
            }
        }
    }

    /**
     * 绘制面积图
     */
    drawAreaChart(
        data: number[],
        xScale: number,
        yScale: number,
        xOffset: number,
        yOffset: number,
        baselineY: number,
        color: [number, number, number, number] = [0, 0, 1, 0.5]
    ): void {
        if (!data.length || !this.gl || !this.lineProgram || !this.linesBuffer || !this.linesColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.lineProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 准备数据 - 创建一个封闭的多边形
        const points: number[] = []
        const colors: number[] = []

        // 添加第一个基线点
        points.push(0 * xScale + xOffset, baselineY)
        colors.push(...color)

        // 添加所有数据点
        for (let i = 0; i < data.length; i++) {
            const x = i * xScale + xOffset
            const y = data[i] * yScale + yOffset

            points.push(x, y)
            colors.push(...color)
        }

        // 添加最后一个基线点，形成封闭区域
        points.push((data.length - 1) * xScale + xOffset, baselineY)
        colors.push(...color)

        // 设置位置
        const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
        this.gl.enableVertexAttribArray(positionLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // 设置颜色
        const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
        this.gl.enableVertexAttribArray(colorLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

        // 启用混合
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        // 绘制填充区域
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, points.length / 2)

        // 禁用混合
        this.gl.disable(this.gl.BLEND)

        // 绘制线段轮廓
        const linePoints: number[] = []
        const lineColors: number[] = []

        for (let i = 0; i < data.length; i++) {
            const x = i * xScale + xOffset
            const y = data[i] * yScale + yOffset

            linePoints.push(x, y)
            lineColors.push(color[0], color[1], color[2], 1) // 使用不透明的颜色
        }

        this.drawLines(linePoints, lineColors)
    }

    /**
     * 绘制柱状图
     */
    drawBarChart(
        data: number[],
        xScale: number,
        yScale: number,
        xOffset: number,
        yOffset: number,
        width: number = 6,
        baselineY: number,
        color: [number, number, number, number] = [0, 0, 1, 1]
    ): void {
        if (!data.length || !this.gl || !this.lineProgram || !this.linesBuffer || !this.linesColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.lineProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 绘制每个柱子
        for (let i = 0; i < data.length; i++) {
            const x = i * xScale + xOffset
            const y = data[i] * yScale + yOffset
            const halfWidth = width / 2

            // 创建矩形
            const points = [
                x - halfWidth, baselineY,
                x + halfWidth, baselineY,
                x + halfWidth, y,
                x - halfWidth, y,
                x - halfWidth, baselineY
            ]

            const colors = Array(5).fill(color).flat()

            // 设置位置
            const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
            this.gl.enableVertexAttribArray(positionLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

            // 设置颜色
            const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
            this.gl.enableVertexAttribArray(colorLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

            // 启用混合
            this.gl.enable(this.gl.BLEND)
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

            // 绘制填充矩形
            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, points.length / 2)

            // 禁用混合
            this.gl.disable(this.gl.BLEND)
        }
    }

    /**
     * 绘制网格线
     */
    drawGrid(
        xLines: number[],
        yLines: number[],
        color: [number, number, number, number] = [0.8, 0.8, 0.8, 0.5]
    ): void {
        if (!this.gl || !this.lineProgram || !this.linesBuffer || !this.linesColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.lineProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 绘制水平线
        for (const y of yLines) {
            const points = [0, y, this.width, y]
            const colors = Array(2).fill(color).flat()

            // 设置位置
            const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
            this.gl.enableVertexAttribArray(positionLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

            // 设置颜色
            const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
            this.gl.enableVertexAttribArray(colorLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

            // 绘制线段
            this.gl.drawArrays(this.gl.LINES, 0, points.length / 2)
        }

        // 绘制垂直线
        for (const x of xLines) {
            const points = [x, 0, x, this.height]
            const colors = Array(2).fill(color).flat()

            // 设置位置
            const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
            this.gl.enableVertexAttribArray(positionLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(points), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

            // 设置颜色
            const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
            this.gl.enableVertexAttribArray(colorLocation)
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW)
            this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

            // 绘制线段
            this.gl.drawArrays(this.gl.LINES, 0, points.length / 2)
        }
    }

    /**
     * 绘制十字线
     */
    drawCrosshair(
        x: number,
        y: number,
        color: [number, number, number, number] = [0, 0, 0, 0.7]
    ): void {
        if (!this.gl || !this.lineProgram || !this.linesBuffer || !this.linesColorBuffer) return

        // 使用程序
        this.gl.useProgram(this.lineProgram)

        // 设置分辨率
        const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
        this.gl.uniform2f(resolutionLocation, this.width, this.height)

        // 绘制水平线
        const hPoints = [0, y, this.width, y]
        const hColors = Array(2).fill(color).flat()

        // 设置位置
        const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
        this.gl.enableVertexAttribArray(positionLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hPoints), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // 设置颜色
        const colorLocation = this.gl.getAttribLocation(this.lineProgram, 'a_color')
        this.gl.enableVertexAttribArray(colorLocation)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hColors), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

        // 绘制水平线
        this.gl.drawArrays(this.gl.LINES, 0, hPoints.length / 2)

        // 绘制垂直线
        const vPoints = [x, 0, x, this.height]
        const vColors = Array(2).fill(color).flat()

        // 设置位置
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vPoints), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // 设置颜色
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linesColorBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vColors), this.gl.STATIC_DRAW)
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0)

        // 绘制垂直线
        this.gl.drawArrays(this.gl.LINES, 0, vPoints.length / 2)
    }

    /**
     * 导出为图片
     */
    toDataURL(): string {
        return this.canvas.toDataURL('image/png')
    }

    /**
     * 检查WebGL是否可用
     */
    isWebGLAvailable(): boolean {
        return !!this.gl
    }
}

export default WebGLChartRenderer