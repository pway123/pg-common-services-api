import { defaultProvider } from "@aws-sdk/credential-provider-node";
import {
  fromContainerMetadata,
  fromEnv,
  fromIni,
  fromInstanceMetadata,
} from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@smithy/types";
import { TCredentialProvider } from "../interfaces";
import { credentialsManager } from "./CredentialsManager";

export async function checkCredentials(
  CREDENTIAL_PROVIDER: TCredentialProvider
): Promise<void> {
  if (
    !credentialsManager.getCredentials() ||
    credentialsManager.isAWSCredentialsExpired()
  ) {
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
      break;
    case "ec2-metadata":
      provider = fromInstanceMetadata(configs);
      break;
    case "enviroment":
      provider = fromEnv();
      break;
    case "credentials":
      provider = fromIni();
      break;
    default:
      provider = defaultProvider();
  }

  const credential = await provider();
  credentialsManager.setCredentials(credential);
}
