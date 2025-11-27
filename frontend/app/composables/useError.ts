export const useApiError = (
  err: any,
  defaultMessage: string = '서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.',
) => {
  return err.response?._data?.message || defaultMessage;
};
