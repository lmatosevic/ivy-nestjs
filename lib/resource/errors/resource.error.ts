export class ResourceError extends Error {
  constructor(
    public resource: string,
    public data: Record<string, any>,
    public error?: Error | any
  ) {
    super(`Resource ${resource} error: ${JSON.stringify(data)}`);
  }
}
