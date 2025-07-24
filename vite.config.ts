import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import fs from 'node:fs'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'
import { compression } from 'vite-plugin-compression2'
import legacy from '@vitejs/plugin-legacy'
import imagemin from 'vite-plugin-imagemin'

// PWA插件
import { VitePWA } from 'vite-plugin-pwa'

// 生成PWA图标
function generatePwaIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const icons = sizes.map(size => ({
    src: `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any maskable'
  }));

  // 确保icons目录存在
  const iconsDir = resolve(__dirname, 'public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  return icons;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      vueJsx(),
      splitVendorChunkPlugin(),
      // PWA插件配置
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
        manifest: {
          name: '快乐股市',
          short_name: '快乐股市',
          description: '股票分析和投资组合管理工具',
          theme_color: '#4CAF50',
          background_color: '#ffffff',
          icons: generatePwaIcons(),
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'zh-CN',
          dir: 'ltr',
          categories: ['finance', 'business', 'productivity'],
          screenshots: [
            {
              src: '/screenshots/desktop.png',
              sizes: '1280x800',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: '/screenshots/mobile.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/[^\/]+$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'stock-details',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1天
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/search/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'stock-search',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 // 1小时
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/[^\/]+\/history/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'stock-history',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1天
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/watchlist/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'watchlist-data',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 // 1小时
                },
                backgroundSync: {
                  name: 'watchlistSync',
                  options: {
                    maxRetentionTime: 24 * 60 // 24小时
                  }
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/portfolio/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'portfolio-data',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 // 1小时
                },
                backgroundSync: {
                  name: 'portfolioSync',
                  options: {
                    maxRetentionTime: 24 * 60 // 24小时
                  }
                }
              }
            }
          ],
          // 自定义Service Worker
          swDest: 'dist/sw.js',
          swSrc: 'public/sw.js',
          inlineWorkboxRuntime: true
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      }),
      // 添加旧浏览器兼容支持
      legacy({
        targets: ['defaults', 'not IE 11'],
      }),
      // 图片压缩
      imagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false,
        },
        optipng: {
          optimizationLevel: 7,
        },
        mozjpeg: {
          quality: 80,
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4,
        },
        svgo: {
          plugins: [
            {
              name: 'removeViewBox',
            },
            {
              name: 'removeEmptyAttrs',
              active: false,
            },
          ],
        },
      }),
      // GZIP压缩
      compression({
        algorithm: 'gzip',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240, // 只有大于10kb的文件才会被压缩
      }),
      // Brotli压缩 (更高效的压缩算法)
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240,
      }),
      // 构建分析工具
      process.env.ANALYZE === 'true' && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html', // 输出到固定位置便于查看
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // 启用源码映射以便于调试，生产环境禁用
      sourcemap: mode !== 'production',
      // 改进CSS处理
      cssCodeSplit: true,
      // 启用构建缓存以加速构建过程
      cache: true,
      // 分块策略
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // 核心库分块
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              if (id.includes('element-plus')) {
                return 'element-plus-vendor'
              }
              if (id.includes('echarts')) {
                return 'chart-vendor'
              }
              if (id.includes('axios') || id.includes('uuid') ||
                id.includes('file-saver') || id.includes('xlsx') ||
                id.includes('jspdf')) {
                return 'utils-vendor'
              }

              // 其他node_modules按首字母分组，避免vendor包过大
              const moduleName = id.toString().split('node_modules/')[1].split('/')[0]
              if (moduleName) {
                const firstChar = moduleName.charAt(0).toLowerCase()
                // 按字母分组打包
                if (/[a-z]/.test(firstChar)) {
                  const group = Math.floor((firstChar.charCodeAt(0) - 97) / 5)
                  return `vendor-${group}`
                }
                return 'vendor-misc' // 非字母开头的模块
              }
            }

            // 按功能模块分块
            if (id.includes('/src/views/')) {
              if (id.includes('/admin/')) return 'admin-views'
              if (id.includes('/user/')) return 'user-views'
              if (id.includes('/auth/')) return 'auth-views'
              if (id.includes('/doji-pattern/')) return 'doji-pattern-views'
              return 'main-views'
            }

            if (id.includes('/src/components/')) {
              if (id.includes('/charts/')) return 'chart-components'
              if (id.includes('/common/')) return 'common-components'
              if (id.includes('/alerts/')) return 'alert-components'
              return 'other-components'
            }
          },
          // 控制 chunk 大小
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // 设置 chunk 大小警告阈值
      chunkSizeWarningLimit: 1500,
      // 压缩选项
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: process.env.NODE_ENV === 'production',
          pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
        },
        format: {
          comments: false, // 删除注释
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:7001',
          changeOrigin: true,
          // 不再重写路径，保留 /api 前缀
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // AllTick API 代理
        '/alltick-api': {
          target: 'https://quote.alltick.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/alltick-api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('AllTick proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    // 环境变量前缀
    envPrefix: ['VITE_'],
    // 定义环境变量替换
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __APP_MODE__: JSON.stringify(mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    }
  }
})
