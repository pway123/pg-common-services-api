import { AwsCredentialIdentity } from "@smithy/types";
import { getDateAtLaterMinute } from "./DateUtil";

class CredentialsManager {
  private static instance: CredentialsManager;
  private credentials?: AwsCredentialIdentity;

  private constructor() {}

  static getInstance(): CredentialsManager {
    if (!CredentialsManager.instance) {
      CredentialsManager.instance = new CredentialsManager();
    }
    return CredentialsManager.instance;
  }

  setCredentials(credentials: AwsCredentialIdentity): void {
    this.credentials = credentials;
  }

  getCredentials(): AwsCredentialIdentity | undefined {
    return this.credentials;
  }

  clearCredentials(): void {
    this.credentials = undefined;
  }

  isAWSCredentialsExpired(expiryBufferMinutes = 5): boolean {
    return (
      !this.credentials?.expiration ||
      this.credentials.expiration < getDateAtLaterMinute(expiryBufferMinutes)
    );
  }
}

// Export singleton instance
export const credentialsManager = CredentialsManager.getInstance();
