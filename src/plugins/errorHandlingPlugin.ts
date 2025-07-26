/**
 * 错误处理插件
 * 提供全局错误处理和加载状态管理
 */

import type { App } from 'vue';
import errorHandlingService from '@/services/errorHandlingService';
import loadingService from '@/services/loadingService';
import ErrorMessage from '@/components/common/ErrorMessage.vue';
import LoadingIndicator from '@/components/common/LoadingIndicator.vue';
import vLoading from '@/directives/loadingDirective';

export default {
  install: (app: App) => {
    // 注册全局组件
    app.component('ErrorMessage', ErrorMessage);
    app.component('LoadingIndicator', LoadingIndicator);

    // 注册全局指令
    app.directive('loading', vLoading);

    // 添加全局属性
    app.config.globalProperties.$errorHandling = errorHandlingService;
    app.config.globalProperties.$loading = loadingService;

    // 设置全局错误处理
    app.config.errorHandler = (error, instance, info) => {
      console.error('Vue错误:', error, info);

      // 创建应用错误对象
      const appError = errorHandlingService.createAppError(
        errorHandlingService.ErrorType.UNKNOWN,
        '应用程序错误',
        errorHandlingService.ErrorSeverity.ERROR,
        error,
        'VUE_ERROR',
        { info, componentName: instance?.type?.name || '未知组件' }
      );

      // 处理错误
      errorHandlingService.handleError(appError);
    };

    // 初始化全局错误处理器
    errorHandlingService.setupGlobalErrorHandlers();

    console.log('错误处理插件已初始化');
  }
};