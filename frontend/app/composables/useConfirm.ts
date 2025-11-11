import { ConfirmModal } from '#components';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
  icon?: string;
}

/**
 * 확인 모달을 표시하고 사용자의 선택을 기다립니다.
 *
 * @example
 * ```typescript
 * const confirm = useConfirm();
 *
 * const result = await confirm({
 *   title: '삭제 확인',
 *   description: '정말 삭제하시겠습니까?',
 *   confirmText: '삭제',
 *   confirmColor: 'error',
 * });
 *
 * if (result) {
 *   // 사용자가 확인을 클릭함
 * }
 * ```
 */
export const useConfirm = () => {
  const overlay = useOverlay();

  return async (options: ConfirmOptions = {}): Promise<boolean> => {
    const modal = overlay.create(ConfirmModal);

    const instance = modal.open({
      title: options.title || '확인',
      description: options.description || '이 작업을 수행하시겠습니까?',
      confirmText: options.confirmText || '확인',
      cancelText: options.cancelText || '취소',
      confirmColor: options.confirmColor || 'primary',
      icon: options.icon || 'i-heroicons-question-mark-circle',
    });

    try {
      const result = await instance.result;
      return result === true;
    } catch {
      // Modal closed without emitting (e.g., ESC key, overlay click)
      return false;
    }
  };
};
