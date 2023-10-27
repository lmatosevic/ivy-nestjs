export class FileError extends Error {
  constructor(
    public message: string,
    public code?: number,
    public reason?: string | any[]
  ) {
    super(message);
  }
}
