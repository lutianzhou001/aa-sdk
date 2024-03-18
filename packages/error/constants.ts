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
export class GetERC4337BundlerReceipt extends BaseSmartAccountError {}
export class SendUserOperationSimulationByERC4337Bundler extends BaseSmartAccountError {}
