import { AwsCredentialIdentity } from "@smithy/types";

declare global {
  var awsCredentials: AwsCredentialIdentity | undefined;
}

export {};
