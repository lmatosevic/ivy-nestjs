export class AccountError extends Error {
  constructor(
    public message: string,
    public code: number = 400,
    public error?: Error | any
  ) {
    super(`Account error: ${message}`);
  }
}
