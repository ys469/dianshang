export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const ok = <T>(data: T, message = 'ok'): ApiResponse<T> => ({
  code: 0,
  message,
  data
});
