/**
 * Monitoring Plugin
 * Initializes monitoring and error tracking
 */

import type { App } from 'vue';
import config from '../utils/config';
import logger from '../utils/logger';
import performance from '../utils/performance';
import errorTracking from '../services/ErrorTrackingService';

export default {
  /**
   * Install the monitoring plugin
   * @param app Vue application instance
   * @param options Plugin options
   */
  install: (app: App, options = {}) => {
    // Initialize logger
    logger.info('Initializing monitoring plugin', 'Monitoring');

    // Set up global error handling
    errorTracking.setupGlobalErrorHandling();

    // Track page navigation performance
    const router = app.config.globalProperties.$router;
    if (router) {
      router.beforeEach((to, from, next) => {
        // Start timing page navigation
        const id = performance.startTimer('page.navigation', {
          from: from.path,
          to: to.path
        });

        // Store timer ID in the route meta
        to.meta.perfTimerId = id;
        next();
      });

      router.afterEach((to) => {
        // Stop timing page navigation
        const id = to.meta.perfTimerId;
        if (id) {
          const duration = performance.stopTimer(id);
          logger.info(`Page navigation to ${to.path} took ${duration?.toFixed(2)}ms`, 'Router');
        }
      });
    }

    // Track component render performance
    app.mixin({
      beforeCreate() {
        // Only track component render in development or if explicitly enabled
        if (config.isDevelopment || config.ENABLE_PERFORMANCE_MONITORING) {
          this.$perfId = performance.startTimer('component.render', {
            component: this.$options.name || 'AnonymousComponent'
          });
        }
      },
      mounted() {
        if (this.$perfId) {
          performance.stopTimer(this.$perfId);
        }
      }
    });

    // Track API calls
    const axios = app.config.globalProperties.$axios;
    if (axios) {
      axios.interceptors.request.use((config) => {
        // Start timing API request
        const id = performance.startTimer('api.request', {
          url: config.url,
          method: config.method
        });

        // Store timer ID in the request config
        config.perfTimerId = id;
        return config;
      });

      axios.interceptors.response.use(
        (response) => {
          // Stop timing API request on success
          const id = response.config.perfTimerId;
          if (id) {
            const duration = performance.stopTimer(id);
            logger.debug(`API ${response.config.method} ${response.config.url} took ${duration?.toFixed(2)}ms`, 'API');
          }
          return response;
        },
        (error) => {
          // Stop timing API request on error
          const id = error.config?.perfTimerId;
          if (id) {
            performance.stopTimer(id);
          }

          // Track API error
          errorTracking.trackError(
            error,
            errorTracking.ErrorSeverity.MEDIUM,
            {
              component: 'API',
              action: 'request',
              url: error.config?.url,
              additionalData: {
                method: error.config?.method,
                status: error.response?.status,
                statusText: error.response?.statusText
              }
            }
          );

          return Promise.reject(error);
        }
      );
    }

    // Expose monitoring utilities to the Vue instance
    app.config.globalProperties.$logger = logger;
    app.config.globalProperties.$performance = performance;
    app.config.globalProperties.$errorTracking = errorTracking;

    // Provide monitoring utilities to the app
    app.provide('logger', logger);
    app.provide('performance', performance);
    app.provide('errorTracking', errorTracking);

    // Log initialization complete
    logger.info('Monitoring plugin initialized', 'Monitoring');
  }
};