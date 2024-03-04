export class BaseSmartAccountError extends Error {
  constructor(
    public error: string,
    message: string,
  ) {
    super(message);
    this.error = error;
  }
}

export class GasEstimationError extends BaseSmartAccountError {}
export class SendUopError extends BaseSmartAccountError {}
export class GetOKXBundlerReceipt extends BaseSmartAccountError {}
export class SendUserOperationSimulationByOKXBundler extends BaseSmartAccountError {}
