import { BaseError } from "viem";

export class InvalidAddressError extends BaseError {
  override name = "InvalidAddressError";
  constructor(address: string) {
    super(`Invalid address: ${address}`);
  }
}

export class AccountOrClientNotFoundError extends BaseError {
  override name = "AccountOrClientNotFoundError";
  constructor() {
    super(`Account or client not found`);
  }
}
