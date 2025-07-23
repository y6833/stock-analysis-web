import { ref, Ref } from 'vue';
import errorHandlingService, { AppError, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';
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

  return {
    errorState,
    showError,
    clearError,
    handleError,
    withErrorHandling
  };
}