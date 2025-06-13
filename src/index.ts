import { sendRequest } from "./util/RequestUtil";
import { checkCredentials } from "./util/CredentialsUtil";
import { TCredentialProvider } from "./interfaces";
import { HttpRequest as ProtocolHttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { credentialsManager } from "./util/CredentialsManager";

const REGION = "ap-southeast-1";
const BASE_PATH = "/api/services/";
const PN_PATH = BASE_PATH + "pushNotifications";
const EMAIL_PATH = BASE_PATH + "email";
const DEBUG_PATH = BASE_PATH + "debug";

let ENDPOINT: URL, HOST: string, STAGE: string;
let PRIVATE = false;
let SIGN = true;
let CREDENTIAL_PROVIDER;

/**
 * Configures the Common Service API client with the specified options.
 *
 * This function initializes the API client with endpoint configuration, authentication settings,
 * and AWS credentials. It validates the endpoint format and sets up global configuration
 * variables for subsequent API calls.
 *
 * @param options - Configuration options for the API client
 * @param options.endpoint - The API endpoint URL (must include http:// or https:// protocol)
 * @param options.sign - Optional flag to enable request signing (default: false)
 * @param options.private - Optional flag to indicate private API access (default: false)
 * @param options.host - Optional host override for API requests
 * @param options.stage - Optional deployment stage identifier
 * @param options.credentialProvider - Optional AWS credential provider for signed requests
 *
 * @throws {Error} When endpoint is not provided
 * @throws {Error} When endpoint doesn't include a valid protocol (http:// or https://)
 * @throws {Error} When signing is enabled but credentials are invalid or unavailable
 *
 * @returns A promise that resolves when configuration is complete
 *
 * @example Refer README.MD for more example
 * ```typescript
 * // Basic configuration
 * await config({
 *   endpoint: 'https://api.example.com'
 * });
 *
 * // Configuration with signing enabled
 * await config({
 *   endpoint: 'https://api.example.com',
 *   sign: true,
 *   credentialProvider: myCredentialProvider
 * });
 * ```
 */
export async function config(options: {
  endpoint: string;
  sign?: boolean;
  private?: boolean;
  host?: string;
  stage?: string;
  credentialProvider?: TCredentialProvider;
  isHttp?: boolean;
}): Promise<void> {
  console.info("Common-service-api is using AWS SDK v3");

  if (!options.endpoint) {
    throw new Error("endpoint is a required field");
  }

  ENDPOINT = options?.isHttp
    ? new URL(`http://${options.endpoint}`)
    : new URL(`https://${options.endpoint}`);

  SIGN = !!options.sign;
  PRIVATE = !!options.private;
  HOST = options.host;
  STAGE = options.stage;
  CREDENTIAL_PROVIDER = options.credentialProvider;
  if (SIGN) await checkCredentials(CREDENTIAL_PROVIDER);
}

export function sendPushNotification(payload) {
  return createAndSendRequest(PN_PATH, "POST", payload);
}

export function sendEmail(payload) {
  return createAndSendRequest(EMAIL_PATH, "POST", payload);
}

export function testApiGwConnection() {
  return createAndSendRequest(DEBUG_PATH, "GET");
}

/**
 * Creates and send the request based on input params.
 *
 * Also auto-refetch credentials and make request again if request fails from server error (>=500) or forbidden (403) due to outdated credentials
 * @param path URL path of request
 * @param method HTTP method
 * @param payload JSON object to send
 * @param maxRetries number of retries before throwing
 * @param numberOfRetriesUsed used for recursively calling itself
 */
export async function createAndSendRequest(
  path: string,
  method: "GET" | "POST",
  payload?,
  maxRetries = 2,
  numberOfRetriesUsed = 0
) {
  try {
    const request = await createRequest(path, method, payload);
    return await sendRequest(request);
  } catch (e) {
    if (numberOfRetriesUsed >= maxRetries) {
      throw e;
    }
    return await createAndSendRequest(
      path,
      method,
      payload,
      maxRetries,
      ++numberOfRetriesUsed
    );
  }
}

async function createRequest(
  path: string,
  method: "GET" | "POST",
  payload?
): Promise<ProtocolHttpRequest> {
  const { hostname, protocol, port, host } = ENDPOINT;
  const request = new ProtocolHttpRequest({
    protocol: protocol,
    hostname: hostname,
    port: port ? Number(port) : undefined,
    method: method,
    path: path,
    headers: {
      Host: host,
    },
  });

  if (!!payload) {
    request.body = JSON.stringify(payload);
    request.headers["Content-Type"] = "application/json";
  }
  if (STAGE) {
    request.path = `/${STAGE}${request.path}`;
  }
  if (PRIVATE) {
    request.headers["Host"] = HOST;
  }

  if (SIGN) {
    await checkCredentials(CREDENTIAL_PROVIDER);

    const credentials = credentialsManager.getCredentials();

    if (!credentials) {
      throw new Error("Credentials not found");
    }

    const signer = new SignatureV4({
      credentials: credentials,
      region: REGION, // Region is using here for signing
      service: "execute-api",
      sha256: Sha256,
    });

    const signedRequest = await signer.sign(request);
    return signedRequest as ProtocolHttpRequest;
  }
  return request;
}
