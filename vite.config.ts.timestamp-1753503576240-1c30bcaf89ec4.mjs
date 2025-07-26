// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import fs from "node:fs";
import { defineConfig, loadEnv } from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/vite/dist/node/index.js";
import vue from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import { visualizer } from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { splitVendorChunkPlugin } from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/vite/dist/node/index.js";
import { compression } from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/vite-plugin-compression2/dist/index.mjs";
import legacy from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import imagemin from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/vite-plugin-imagemin/dist/index.mjs";
import { VitePWA } from "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "E:\\\u684C\u9762\\HappyStockMarket\\stock-analysis-web";
var __vite_injected_original_import_meta_url = "file:///E:/%E6%A1%8C%E9%9D%A2/HappyStockMarket/stock-analysis-web/vite.config.ts";
function generatePwaIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const icons = sizes.map((size) => ({
    src: `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any maskable"
  }));
  const iconsDir = resolve(__vite_injected_original_dirname, "public/icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  return icons;
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [
      vue(),
      vueJsx(),
      splitVendorChunkPlugin(),
      // PWA插件配置
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "icons/*.png"],
        manifest: {
          name: "\u5FEB\u4E50\u80A1\u5E02",
          short_name: "\u5FEB\u4E50\u80A1\u5E02",
          description: "\u80A1\u7968\u5206\u6790\u548C\u6295\u8D44\u7EC4\u5408\u7BA1\u7406\u5DE5\u5177",
          theme_color: "#4CAF50",
          background_color: "#ffffff",
          icons: generatePwaIcons(),
          start_url: "/",
          display: "standalone",
          orientation: "portrait",
          lang: "zh-CN",
          dir: "ltr",
          categories: ["finance", "business", "productivity"],
          screenshots: [
            {
              src: "/screenshots/desktop.png",
              sizes: "1280x800",
              type: "image/png",
              form_factor: "wide"
            },
            {
              src: "/screenshots/mobile.png",
              sizes: "750x1334",
              type: "image/png",
              form_factor: "narrow"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                  // 1年
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                  // 1年
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/[^\/]+$/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "stock-details",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24
                  // 1天
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/search/,
              handler: "NetworkFirst",
              options: {
                cacheName: "stock-search",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60
                  // 1小时
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/stocks\/[^\/]+\/history/,
              handler: "CacheFirst",
              options: {
                cacheName: "stock-history",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24
                  // 1天
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/watchlist/,
              handler: "NetworkFirst",
              options: {
                cacheName: "watchlist-data",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60
                  // 1小时
                },
                backgroundSync: {
                  name: "watchlistSync",
                  options: {
                    maxRetentionTime: 24 * 60
                    // 24小时
                  }
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/portfolio/,
              handler: "NetworkFirst",
              options: {
                cacheName: "portfolio-data",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60
                  // 1小时
                },
                backgroundSync: {
                  name: "portfolioSync",
                  options: {
                    maxRetentionTime: 24 * 60
                    // 24小时
                  }
                }
              }
            }
          ],
          // 自定义Service Worker
          swDest: "dist/sw.js",
          inlineWorkboxRuntime: true
        },
        devOptions: {
          enabled: true,
          type: "module"
        }
      }),
      // 添加旧浏览器兼容支持
      legacy({
        targets: ["defaults", "not IE 11"]
      }),
      // 图片压缩
      imagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false
        },
        optipng: {
          optimizationLevel: 7
        },
        mozjpeg: {
          quality: 80
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4
        },
        svgo: {
          plugins: [
            {
              name: "removeViewBox"
            },
            {
              name: "removeEmptyAttrs",
              active: false
            }
          ]
        }
      }),
      // GZIP压缩
      compression({
        algorithm: "gzip",
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240
        // 只有大于10kb的文件才会被压缩
      }),
      // Brotli压缩 (更高效的压缩算法)
      compression({
        algorithm: "brotliCompress",
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240
      }),
      // 构建分析工具
      process.env.ANALYZE === "true" && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html"
        // 输出到固定位置便于查看
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      }
    },
    build: {
      // 启用源码映射以便于调试，生产环境禁用
      sourcemap: mode !== "production",
      // 改进CSS处理
      cssCodeSplit: true,
      // 启用构建缓存以加速构建过程
      cache: true,
      // 分块策略
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("vue") || id.includes("vue-router") || id.includes("pinia")) {
                return "vue-vendor";
              }
              if (id.includes("element-plus")) {
                return "element-plus-vendor";
              }
              if (id.includes("echarts")) {
                return "chart-vendor";
              }
              if (id.includes("axios") || id.includes("uuid") || id.includes("file-saver") || id.includes("xlsx") || id.includes("jspdf")) {
                return "utils-vendor";
              }
              const moduleName = id.toString().split("node_modules/")[1].split("/")[0];
              if (moduleName) {
                const firstChar = moduleName.charAt(0).toLowerCase();
                if (/[a-z]/.test(firstChar)) {
                  const group = Math.floor((firstChar.charCodeAt(0) - 97) / 5);
                  return `vendor-${group}`;
                }
                return "vendor-misc";
              }
            }
            if (id.includes("/src/views/")) {
              if (id.includes("/admin/"))
                return "admin-views";
              if (id.includes("/user/"))
                return "user-views";
              if (id.includes("/auth/"))
                return "auth-views";
              if (id.includes("/doji-pattern/"))
                return "doji-pattern-views";
              return "main-views";
            }
            if (id.includes("/src/components/")) {
              if (id.includes("/charts/"))
                return "chart-components";
              if (id.includes("/common/"))
                return "common-components";
              if (id.includes("/alerts/"))
                return "alert-components";
              return "other-components";
            }
          },
          // 控制 chunk 大小
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
        }
      },
      // 设置 chunk 大小警告阈值
      chunkSizeWarningLimit: 1500,
      // 压缩选项
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === "production",
          drop_debugger: process.env.NODE_ENV === "production",
          pure_funcs: process.env.NODE_ENV === "production" ? ["console.log"] : []
        },
        format: {
          comments: false
          // 删除注释
        }
      }
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:7001",
          changeOrigin: true
          // 不再重写路径，保留 /api 前缀
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // AllTick API 代理
        "/alltick-api": {
          target: "https://quote.alltick.io",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/alltick-api/, ""),
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("AllTick proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              console.log("Sending Request to the Target:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    // 环境变量前缀
    envPrefix: ["VITE_"],
    // 定义环境变量替换
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __APP_MODE__: JSON.stringify(mode),
      __BUILD_TIME__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxcdTY4NENcdTk3NjJcXFxcSGFwcHlTdG9ja01hcmtldFxcXFxzdG9jay1hbmFseXNpcy13ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFx1Njg0Q1x1OTc2MlxcXFxIYXBweVN0b2NrTWFya2V0XFxcXHN0b2NrLWFuYWx5c2lzLXdlYlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU2JUExJThDJUU5JTlEJUEyL0hhcHB5U3RvY2tNYXJrZXQvc3RvY2stYW5hbHlzaXMtd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXG5cbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5pbXBvcnQgeyBzcGxpdFZlbmRvckNodW5rUGx1Z2luIH0gZnJvbSAndml0ZSdcbmltcG9ydCB7IGNvbXByZXNzaW9uIH0gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24yJ1xuaW1wb3J0IGxlZ2FjeSBmcm9tICdAdml0ZWpzL3BsdWdpbi1sZWdhY3knXG5pbXBvcnQgaW1hZ2VtaW4gZnJvbSAndml0ZS1wbHVnaW4taW1hZ2VtaW4nXG5cbi8vIFBXQVx1NjNEMlx1NEVGNlxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuLy8gXHU3NTFGXHU2MjEwUFdBXHU1NkZFXHU2ODA3XG5mdW5jdGlvbiBnZW5lcmF0ZVB3YUljb25zKCkge1xuICBjb25zdCBzaXplcyA9IFs3MiwgOTYsIDEyOCwgMTQ0LCAxNTIsIDE5MiwgMzg0LCA1MTJdO1xuICBjb25zdCBpY29ucyA9IHNpemVzLm1hcChzaXplID0+ICh7XG4gICAgc3JjOiBgL2ljb25zL2ljb24tJHtzaXplfXgke3NpemV9LnBuZ2AsXG4gICAgc2l6ZXM6IGAke3NpemV9eCR7c2l6ZX1gLFxuICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnXG4gIH0pKTtcblxuICAvLyBcdTc4NkVcdTRGRERpY29uc1x1NzZFRVx1NUY1NVx1NUI1OFx1NTcyOFxuICBjb25zdCBpY29uc0RpciA9IHJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL2ljb25zJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhpY29uc0RpcikpIHtcbiAgICBmcy5ta2RpclN5bmMoaWNvbnNEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG5cbiAgcmV0dXJuIGljb25zO1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAvLyBMb2FkIGVudmlyb25tZW50IHZhcmlhYmxlcyBiYXNlZCBvbiBtb2RlXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSk7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICB2dWUoKSxcbiAgICAgIHZ1ZUpzeCgpLFxuICAgICAgc3BsaXRWZW5kb3JDaHVua1BsdWdpbigpLFxuICAgICAgLy8gUFdBXHU2M0QyXHU0RUY2XHU5MTREXHU3RjZFXG4gICAgICBWaXRlUFdBKHtcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAncm9ib3RzLnR4dCcsICdpY29ucy8qLnBuZyddLFxuICAgICAgICBtYW5pZmVzdDoge1xuICAgICAgICAgIG5hbWU6ICdcdTVGRUJcdTRFNTBcdTgwQTFcdTVFMDInLFxuICAgICAgICAgIHNob3J0X25hbWU6ICdcdTVGRUJcdTRFNTBcdTgwQTFcdTVFMDInLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnXHU4MEExXHU3OTY4XHU1MjA2XHU2NzkwXHU1NDhDXHU2Mjk1XHU4RDQ0XHU3RUM0XHU1NDA4XHU3QkExXHU3NDA2XHU1REU1XHU1MTc3JyxcbiAgICAgICAgICB0aGVtZV9jb2xvcjogJyM0Q0FGNTAnLFxuICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgICBpY29uczogZ2VuZXJhdGVQd2FJY29ucygpLFxuICAgICAgICAgIHN0YXJ0X3VybDogJy8nLFxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgICBsYW5nOiAnemgtQ04nLFxuICAgICAgICAgIGRpcjogJ2x0cicsXG4gICAgICAgICAgY2F0ZWdvcmllczogWydmaW5hbmNlJywgJ2J1c2luZXNzJywgJ3Byb2R1Y3Rpdml0eSddLFxuICAgICAgICAgIHNjcmVlbnNob3RzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9zY3JlZW5zaG90cy9kZXNrdG9wLnBuZycsXG4gICAgICAgICAgICAgIHNpemVzOiAnMTI4MHg4MDAnLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgZm9ybV9mYWN0b3I6ICd3aWRlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiAnL3NjcmVlbnNob3RzL21vYmlsZS5wbmcnLFxuICAgICAgICAgICAgICBzaXplczogJzc1MHgxMzM0JyxcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgICAgIGZvcm1fZmFjdG9yOiAnbmFycm93J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgd29ya2JveDoge1xuICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2ZyxqcGcsanBlZyxnaWYsd2VicCx3b2ZmLHdvZmYyLHR0Zixlb3R9J10sXG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb20vLFxuICAgICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtc3R5bGVzaGVldHMnLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwLFxuICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IC8vIDFcdTVFNzRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nc3RhdGljXFwuY29tLyxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLXdlYmZvbnRzJyxcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAzMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSAvLyAxXHU1RTc0XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvYXBpXFwvdjFcXC9zdG9ja3NcXC9bXlxcL10rJC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdTdGFsZVdoaWxlUmV2YWxpZGF0ZScsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdzdG9jay1kZXRhaWxzJyxcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiA1MCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAvLyAxXHU1OTI5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvYXBpXFwvdjFcXC9zdG9ja3NcXC9zZWFyY2gvLFxuICAgICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya0ZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N0b2NrLXNlYXJjaCcsXG4gICAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiAzLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDIwLFxuICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAvLyAxXHU1QzBGXHU2NUY2XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvYXBpXFwvdjFcXC9zdG9ja3NcXC9bXlxcL10rXFwvaGlzdG9yeS8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N0b2NrLWhpc3RvcnknLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0IC8vIDFcdTU5MjlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC9hcGlcXC92MVxcL3dhdGNobGlzdC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnd2F0Y2hsaXN0LWRhdGEnLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMyxcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgLy8gMVx1NUMwRlx1NjVGNlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZFN5bmM6IHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6ICd3YXRjaGxpc3RTeW5jJyxcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWF4UmV0ZW50aW9uVGltZTogMjQgKiA2MCAvLyAyNFx1NUMwRlx1NjVGNlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcL2FwaVxcL3YxXFwvcG9ydGZvbGlvLyxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdwb3J0Zm9saW8tZGF0YScsXG4gICAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiAzLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwLFxuICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAvLyAxXHU1QzBGXHU2NUY2XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kU3luYzoge1xuICAgICAgICAgICAgICAgICAgbmFtZTogJ3BvcnRmb2xpb1N5bmMnLFxuICAgICAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICBtYXhSZXRlbnRpb25UaW1lOiAyNCAqIDYwIC8vIDI0XHU1QzBGXHU2NUY2XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICAvLyBcdTgxRUFcdTVCOUFcdTRFNDlTZXJ2aWNlIFdvcmtlclxuICAgICAgICAgIHN3RGVzdDogJ2Rpc3Qvc3cuanMnLFxuICAgICAgICAgIGlubGluZVdvcmtib3hSdW50aW1lOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGRldk9wdGlvbnM6IHtcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdtb2R1bGUnXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgLy8gXHU2REZCXHU1MkEwXHU2NUU3XHU2RDRGXHU4OUM4XHU1NjY4XHU1MTdDXHU1QkI5XHU2NTJGXHU2MzAxXG4gICAgICBsZWdhY3koe1xuICAgICAgICB0YXJnZXRzOiBbJ2RlZmF1bHRzJywgJ25vdCBJRSAxMSddLFxuICAgICAgfSksXG4gICAgICAvLyBcdTU2RkVcdTcyNDdcdTUzOEJcdTdGMjlcbiAgICAgIGltYWdlbWluKHtcbiAgICAgICAgZ2lmc2ljbGU6IHtcbiAgICAgICAgICBvcHRpbWl6YXRpb25MZXZlbDogNyxcbiAgICAgICAgICBpbnRlcmxhY2VkOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aXBuZzoge1xuICAgICAgICAgIG9wdGltaXphdGlvbkxldmVsOiA3LFxuICAgICAgICB9LFxuICAgICAgICBtb3pqcGVnOiB7XG4gICAgICAgICAgcXVhbGl0eTogODAsXG4gICAgICAgIH0sXG4gICAgICAgIHBuZ3F1YW50OiB7XG4gICAgICAgICAgcXVhbGl0eTogWzAuOCwgMC45XSxcbiAgICAgICAgICBzcGVlZDogNCxcbiAgICAgICAgfSxcbiAgICAgICAgc3Znbzoge1xuICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZVZpZXdCb3gnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZUVtcHR5QXR0cnMnLFxuICAgICAgICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICAvLyBHWklQXHU1MzhCXHU3RjI5XG4gICAgICBjb21wcmVzc2lvbih7XG4gICAgICAgIGFsZ29yaXRobTogJ2d6aXAnLFxuICAgICAgICBleGNsdWRlOiBbL1xcLihicikkLywgL1xcLihneikkL10sXG4gICAgICAgIHRocmVzaG9sZDogMTAyNDAsIC8vIFx1NTNFQVx1NjcwOVx1NTkyN1x1NEU4RTEwa2JcdTc2ODRcdTY1ODdcdTRFRjZcdTYyNERcdTRGMUFcdTg4QUJcdTUzOEJcdTdGMjlcbiAgICAgIH0pLFxuICAgICAgLy8gQnJvdGxpXHU1MzhCXHU3RjI5IChcdTY2RjRcdTlBRDhcdTY1NDhcdTc2ODRcdTUzOEJcdTdGMjlcdTdCOTdcdTZDRDUpXG4gICAgICBjb21wcmVzc2lvbih7XG4gICAgICAgIGFsZ29yaXRobTogJ2Jyb3RsaUNvbXByZXNzJyxcbiAgICAgICAgZXhjbHVkZTogWy9cXC4oYnIpJC8sIC9cXC4oZ3opJC9dLFxuICAgICAgICB0aHJlc2hvbGQ6IDEwMjQwLFxuICAgICAgfSksXG4gICAgICAvLyBcdTY3ODRcdTVFRkFcdTUyMDZcdTY3OTBcdTVERTVcdTUxNzdcbiAgICAgIHByb2Nlc3MuZW52LkFOQUxZWkUgPT09ICd0cnVlJyAmJiB2aXN1YWxpemVyKHtcbiAgICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJywgLy8gXHU4RjkzXHU1MUZBXHU1MjMwXHU1NkZBXHU1QjlBXHU0RjREXHU3RjZFXHU0RkJGXHU0RThFXHU2N0U1XHU3NzBCXG4gICAgICB9KSxcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgLy8gXHU1NDJGXHU3NTI4XHU2RTkwXHU3ODAxXHU2NjIwXHU1QzA0XHU0RUU1XHU0RkJGXHU0RThFXHU4QzAzXHU4QkQ1XHVGRjBDXHU3NTFGXHU0RUE3XHU3M0FGXHU1ODgzXHU3OTgxXHU3NTI4XG4gICAgICBzb3VyY2VtYXA6IG1vZGUgIT09ICdwcm9kdWN0aW9uJyxcbiAgICAgIC8vIFx1NjUzOVx1OEZEQkNTU1x1NTkwNFx1NzQwNlxuICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgICAgLy8gXHU1NDJGXHU3NTI4XHU2Nzg0XHU1RUZBXHU3RjEzXHU1QjU4XHU0RUU1XHU1MkEwXHU5MDFGXHU2Nzg0XHU1RUZBXHU4RkM3XHU3QTBCXG4gICAgICBjYWNoZTogdHJ1ZSxcbiAgICAgIC8vIFx1NTIwNlx1NTc1N1x1N0I1Nlx1NzU2NVxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IChpZCkgPT4ge1xuICAgICAgICAgICAgLy8gXHU2ODM4XHU1RkMzXHU1RTkzXHU1MjA2XHU1NzU3XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygndnVlJykgfHwgaWQuaW5jbHVkZXMoJ3Z1ZS1yb3V0ZXInKSB8fCBpZC5pbmNsdWRlcygncGluaWEnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAndnVlLXZlbmRvcidcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2VsZW1lbnQtcGx1cycpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdlbGVtZW50LXBsdXMtdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZWNoYXJ0cycpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdjaGFydC12ZW5kb3InXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdheGlvcycpIHx8IGlkLmluY2x1ZGVzKCd1dWlkJykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnZmlsZS1zYXZlcicpIHx8IGlkLmluY2x1ZGVzKCd4bHN4JykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnanNwZGYnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAndXRpbHMtdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gXHU1MTc2XHU0RUQ2bm9kZV9tb2R1bGVzXHU2MzA5XHU5OTk2XHU1QjU3XHU2QkNEXHU1MjA2XHU3RUM0XHVGRjBDXHU5MDdGXHU1MTREdmVuZG9yXHU1MzA1XHU4RkM3XHU1OTI3XG4gICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBpZC50b1N0cmluZygpLnNwbGl0KCdub2RlX21vZHVsZXMvJylbMV0uc3BsaXQoJy8nKVswXVxuICAgICAgICAgICAgICBpZiAobW9kdWxlTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0Q2hhciA9IG1vZHVsZU5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAvLyBcdTYzMDlcdTVCNTdcdTZCQ0RcdTUyMDZcdTdFQzRcdTYyNTNcdTUzMDVcbiAgICAgICAgICAgICAgICBpZiAoL1thLXpdLy50ZXN0KGZpcnN0Q2hhcikpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gTWF0aC5mbG9vcigoZmlyc3RDaGFyLmNoYXJDb2RlQXQoMCkgLSA5NykgLyA1KVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGB2ZW5kb3ItJHtncm91cH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLW1pc2MnIC8vIFx1OTc1RVx1NUI1N1x1NkJDRFx1NUYwMFx1NTkzNFx1NzY4NFx1NkEyMVx1NTc1N1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFx1NjMwOVx1NTI5Rlx1ODBGRFx1NkEyMVx1NTc1N1x1NTIwNlx1NTc1N1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3ZpZXdzLycpKSB7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2FkbWluLycpKSByZXR1cm4gJ2FkbWluLXZpZXdzJ1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy91c2VyLycpKSByZXR1cm4gJ3VzZXItdmlld3MnXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2F1dGgvJykpIHJldHVybiAnYXV0aC12aWV3cydcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvZG9qaS1wYXR0ZXJuLycpKSByZXR1cm4gJ2RvamktcGF0dGVybi12aWV3cydcbiAgICAgICAgICAgICAgcmV0dXJuICdtYWluLXZpZXdzJ1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvY29tcG9uZW50cy8nKSkge1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jaGFydHMvJykpIHJldHVybiAnY2hhcnQtY29tcG9uZW50cydcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvY29tbW9uLycpKSByZXR1cm4gJ2NvbW1vbi1jb21wb25lbnRzJ1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9hbGVydHMvJykpIHJldHVybiAnYWxlcnQtY29tcG9uZW50cydcbiAgICAgICAgICAgICAgcmV0dXJuICdvdGhlci1jb21wb25lbnRzJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgLy8gXHU2M0E3XHU1MjM2IGNodW5rIFx1NTkyN1x1NUMwRlxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tleHRdL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8vIFx1OEJCRVx1N0Y2RSBjaHVuayBcdTU5MjdcdTVDMEZcdThCNjZcdTU0NEFcdTk2MDhcdTUwM0NcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTUwMCxcbiAgICAgIC8vIFx1NTM4Qlx1N0YyOVx1OTAwOVx1OTg3OVxuICAgICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICBkcm9wX2NvbnNvbGU6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicsXG4gICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICBwdXJlX2Z1bmNzOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gWydjb25zb2xlLmxvZyddIDogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgIGNvbW1lbnRzOiBmYWxzZSwgLy8gXHU1MjIwXHU5NjY0XHU2Q0U4XHU5MUNBXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6NzAwMScsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIC8vIFx1NEUwRFx1NTE4RFx1OTFDRFx1NTE5OVx1OERFRlx1NUY4NFx1RkYwQ1x1NEZERFx1NzU1OSAvYXBpIFx1NTI0RFx1N0YwMFxuICAgICAgICAgIC8vIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJyksXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEFsbFRpY2sgQVBJIFx1NEVFM1x1NzQwNlxuICAgICAgICAnL2FsbHRpY2stYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHBzOi8vcXVvdGUuYWxsdGljay5pbycsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hbGx0aWNrLWFwaS8sICcnKSxcbiAgICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0FsbFRpY2sgcHJveHkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBSZXF1ZXN0IHRvIHRoZSBUYXJnZXQ6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBSZXNwb25zZSBmcm9tIHRoZSBUYXJnZXQ6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRlx1NTI0RFx1N0YwMFxuICAgIGVudlByZWZpeDogWydWSVRFXyddLFxuICAgIC8vIFx1NUI5QVx1NEU0OVx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRlx1NjZGRlx1NjM2MlxuICAgIGRlZmluZToge1xuICAgICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uKSxcbiAgICAgIF9fQVBQX01PREVfXzogSlNPTi5zdHJpbmdpZnkobW9kZSksXG4gICAgICBfX0JVSUxEX1RJTUVfXzogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxcbiAgICB9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFVLFNBQVMsZUFBZSxXQUFXO0FBQ3hXLFNBQVMsZUFBZTtBQUN4QixPQUFPLFFBQVE7QUFFZixTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsOEJBQThCO0FBQ3ZDLFNBQVMsbUJBQW1CO0FBQzVCLE9BQU8sWUFBWTtBQUNuQixPQUFPLGNBQWM7QUFHckIsU0FBUyxlQUFlO0FBZHhCLElBQU0sbUNBQW1DO0FBQXdKLElBQU0sMkNBQTJDO0FBaUJsUCxTQUFTLG1CQUFtQjtBQUMxQixRQUFNLFFBQVEsQ0FBQyxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEdBQUc7QUFDbkQsUUFBTSxRQUFRLE1BQU0sSUFBSSxXQUFTO0FBQUEsSUFDL0IsS0FBSyxlQUFlLElBQUksSUFBSSxJQUFJO0FBQUEsSUFDaEMsT0FBTyxHQUFHLElBQUksSUFBSSxJQUFJO0FBQUEsSUFDdEIsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLEVBQ1gsRUFBRTtBQUdGLFFBQU0sV0FBVyxRQUFRLGtDQUFXLGNBQWM7QUFDbEQsTUFBSSxDQUFDLEdBQUcsV0FBVyxRQUFRLEdBQUc7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Q2hCLGdCQUFnQjtBQUFBLFFBQ2xCO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFFQSx1QkFBdUI7QUFBQTtBQUFBLE1BRXZCLFFBQVE7QUFBQSxNQUNSLGVBQWU7QUFBQSxRQUNiLFVBQVU7QUFBQSxVQUNSLGNBQWMsUUFBUSxJQUFJLGFBQWE7QUFBQSxVQUN2QyxlQUFlLFFBQVEsSUFBSSxhQUFhO0FBQUEsVUFDeEMsWUFBWSxRQUFRLElBQUksYUFBYSxlQUFlLENBQUMsYUFBYSxJQUFJLENBQUM7QUFBQSxRQUN6RTtBQUFBLFFBQ0EsUUFBUTtBQUFBLFVBQ04sVUFBVTtBQUFBO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRLElBQUksZ0JBQWdCO0FBQUEsVUFDNUIsY0FBYztBQUFBO0FBQUE7QUFBQSxRQUdoQjtBQUFBO0FBQUEsUUFFQSxnQkFBZ0I7QUFBQSxVQUNkLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxrQkFBa0IsRUFBRTtBQUFBLFVBQ3BELFdBQVcsQ0FBQyxPQUFPLGFBQWE7QUFDOUIsa0JBQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxNQUFNLFNBQVM7QUFDckMsc0JBQVEsSUFBSSx1QkFBdUIsR0FBRztBQUFBLFlBQ3hDLENBQUM7QUFDRCxrQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUM1QyxzQkFBUSxJQUFJLGtDQUFrQyxJQUFJLFFBQVEsSUFBSSxHQUFHO0FBQUEsWUFDbkUsQ0FBQztBQUNELGtCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxTQUFTO0FBQzVDLHNCQUFRLElBQUksc0NBQXNDLFNBQVMsWUFBWSxJQUFJLEdBQUc7QUFBQSxZQUNoRixDQUFDO0FBQUEsVUFDSDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSxXQUFXLENBQUMsT0FBTztBQUFBO0FBQUEsSUFFbkIsUUFBUTtBQUFBLE1BQ04saUJBQWlCLEtBQUssVUFBVSxRQUFRLElBQUksbUJBQW1CO0FBQUEsTUFDL0QsY0FBYyxLQUFLLFVBQVUsSUFBSTtBQUFBLE1BQ2pDLGdCQUFnQixLQUFLLFdBQVUsb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQztBQUFBLElBQ3pEO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
