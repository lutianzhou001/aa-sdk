export class BaseError extends Error {
  constructor(
    public error: string,
    message: string,
  ) {
    super(message);
    this.error = error;
  }
}
