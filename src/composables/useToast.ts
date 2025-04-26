import { ElMessage } from 'element-plus';

type MessageType = 'success' | 'warning' | 'info' | 'error';

export function useToast() {
  const showToast = (message: string, type: MessageType = 'info', duration: number = 3000) => {
    ElMessage({
      message,
      type,
      duration,
      showClose: true,
    });
  };

  return {
    showToast,
  };
}
