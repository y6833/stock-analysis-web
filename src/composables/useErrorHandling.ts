import { ref, type Ref } from 'vue';
import errorHandlingService, { type AppError, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';
import { useToast } from './useToast';

interface ErrorState {
  show: boolean;
  message: string;
  type: 'error' | 'warning' | 'info' | 'question';
  details?: string;
  suggestion?: string;
}

export function useErrorHandling() {
  const { showToast } = useToast();
  const errorState: Ref<ErrorState> = ref({
    show: false,
    message: '',
    type: 'error',
    details: '',
    suggestion: ''
  });

  // Loading state management
  const isLoading = ref(false);
  const retryCount = ref(0);
  const maxRetries = 3;

  /**
   * 显示错误消息
   */
  const showError = (
    message: string,
    type: 'error' | 'warning' | 'info' | 'question' = 'error',
    details?: string,
    suggestion?: string
  ) => {
    errorState.value = {
      show: true,
      message,
      type,
      details,
      suggestion
    };
  };

  /**
   * 清除错误消息
   */
  const clearError = () => {
    errorState.value.show = false;
  };

  /**
   * 处理错误
   */
  const handleError = (error: any, defaultMessage: string = '操作失败') => {
    // 如果是应用错误对象，直接处理
    if (error && error.type && error.severity && error.message) {
      errorHandlingService.handleError(error as AppError);

      // 更新组件错误状态
      showError(
        error.message,
        mapSeverityToType(error.severity),
        error.details ? JSON.stringify(error.details, null, 2) : undefined
      );
      return;
    }

    // 创建应用错误对象
    let appError: AppError;

    if (error && error.isAxiosError) {
      // Axios错误
      appError = errorHandlingService.createErrorFromAxiosError(error);
    } else {
      // 其他错误
      appError = errorHandlingService.createAppError(
        ErrorType.UNKNOWN,
        error?.message || defaultMessage,
        ErrorSeverity.ERROR,
        error
      );
    }

    // 处理错误
    errorHandlingService.handleError(appError);

    // 更新组件错误状态
    showError(
      appError.message,
      mapSeverityToType(appError.severity),
      appError.details ? JSON.stringify(appError.details, null, 2) : undefined
    );
  };

  /**
   * 将错误严重程度映射到错误类型
   */
  const mapSeverityToType = (severity: ErrorSeverity): 'error' | 'warning' | 'info' | 'question' => {
    switch (severity) {
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return 'error';
      case ErrorSeverity.WARNING:
        return 'warning';
      case ErrorSeverity.INFO:
        return 'info';
      default:
        return 'error';
    }
  };

  /**
   * 使用错误处理包装异步函数
   */
  const withErrorHandling = <T>(
    fn: () => Promise<T>,
    errorMessage: string = '操作失败',
    showToastOnSuccess: boolean = false,
    successMessage: string = '操作成功'
  ): () => Promise<T | undefined> => {
    return async () => {
      try {
        const result = await fn();
        if (showToastOnSuccess) {
          showToast(successMessage, 'success');
        }
        return result;
      } catch (error) {
        handleError(error, errorMessage);
        return undefined;
      }
    };
  };

  /**
   * 带加载状态的异步函数包装器
   */
  const withLoading = async <T>(
    fn: () => Promise<T>,
    errorMessage: string = '操作失败'
  ): Promise<T | null> => {
    try {
      isLoading.value = true;
      clearError();
      const result = await fn();
      return result;
    } catch (error) {
      handleError(error, errorMessage);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 带重试机制的异步函数包装器
   */
  const withRetry = async <T>(
    fn: () => Promise<T>,
    errorMessage: string = '操作失败',
    maxRetryAttempts: number = maxRetries
  ): Promise<T | null> => {
    for (let attempt = 0; attempt <= maxRetryAttempts; attempt++) {
      try {
        isLoading.value = true;
        if (attempt > 0) {
          console.log(`重试第 ${attempt} 次...`);
          // 指数退避延迟
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }

        const result = await fn();
        clearError();
        retryCount.value = 0;
        return result;
      } catch (error) {
        retryCount.value = attempt + 1;

        if (attempt === maxRetryAttempts) {
          // 最后一次尝试失败
          handleError(error, `${errorMessage} (重试 ${maxRetryAttempts} 次后失败)`);
          return null;
        }

        console.warn(`第 ${attempt + 1} 次尝试失败:`, error);
      } finally {
        isLoading.value = false;
      }
    }

    return null;
  };

  return {
    errorState,
    isLoading,
    retryCount,
    showError,
    clearError,
    handleError,
    withErrorHandling,
    withLoading,
    withRetry
  };
}