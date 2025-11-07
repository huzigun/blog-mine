export const useWait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
