export class BaseError extends Error {
  constructor(
    public error: string,
    message: string,
  ) {
    super(message);
    this.error = error;
  }
}

export class BundlerError extends BaseError {}
export class PaymasterError extends BaseError {}
export class LocalError extends BaseError {}
