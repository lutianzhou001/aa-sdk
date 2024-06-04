export class BaseError extends Error {
  constructor(
    public error: string,
    message: string,
  ) {
    super(message);
    this.error = error;
  }
}

export class GasEstimationError extends BaseError {}
export class GetPaymasterSignatureError extends BaseError {}
export class SendUserOperationError extends BaseError {}
export class SendUserOperationSimulationError extends BaseError {}
export class LocalError extends BaseError {}
export class GetUserOperationReceiptError extends BaseError {}
