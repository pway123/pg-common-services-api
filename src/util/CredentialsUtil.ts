import { defaultProvider } from "@aws-sdk/credential-provider-node";
import {
  fromContainerMetadata,
  fromEnv,
  fromIni,
  fromInstanceMetadata,
} from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@smithy/types";
import { TCredentialProvider } from "../interfaces";
import { getDateAtLaterMinute } from "./DateUtil";

export async function checkCredentials(
  CREDENTIAL_PROVIDER: TCredentialProvider
): Promise<void> {
  if (!globalThis.awsCredentials || isAWSCredentialsExpired()) {
    await loadCredentials(CREDENTIAL_PROVIDER);
  }
}

async function loadCredentials(
  CREDENTIAL_PROVIDER: TCredentialProvider
): Promise<void> {
  const configs = { timeout: 5000, maxRetries: 3 };

  let provider: AwsCredentialIdentityProvider;
  switch (CREDENTIAL_PROVIDER) {
    case "ecs":
      provider = fromContainerMetadata(configs);
    case "ec2-metadata":
      provider = fromInstanceMetadata(configs);
    case "enviroment":
      provider = fromEnv();
      break;
    case "credentials":
      provider = fromIni();
      break;
    default:
      provider = defaultProvider();
  }

  globalThis.awsCredentials = await provider();
}

function isAWSCredentialsExpired() {
  return (
    !globalThis.awsCredentials?.expiration ||
    globalThis.awsCredentials.expiration < getDateAtLaterMinute(5)
  );
}
