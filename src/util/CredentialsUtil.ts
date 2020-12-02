import * as AWS from "aws-sdk";
import { getDateAtLaterMinute } from "./DateUtil";
import { getEnvVars } from "../envConfigs";
import { TCredentialProvider } from "../interfaces";
import { readFileSync } from "fs";
import * as memoize from "memoizee";

export async function checkCredentials(CREDENTIAL_PROVIDER: TCredentialProvider): Promise<void> {
    if (!AWS.config.credentials || isAWSCredentialsExpired()) {
        await loadCredentials(CREDENTIAL_PROVIDER);
    }
}

async function loadCredentials(CREDENTIAL_PROVIDER: TCredentialProvider): Promise<void> {
    const configs = { httpOptions: { timeout: 5000 }, maxRetries: 3 }
    const remoteProvider = () => new AWS.RemoteCredentials(configs);
    const ec2MetadataProvider = () => new AWS.EC2MetadataCredentials(configs);
    const sharedIniFileProvider = () => new AWS.SharedIniFileCredentials({ profile: "default" });
    const enviromentProvider = () => new AWS.EnvironmentCredentials('AWS');
    const providers = [];
    const { awsContainerCredFullUri, awsContainerCredRelativeUri } = getEnvVars();

    switch (CREDENTIAL_PROVIDER) {
        case 'ecs':
            // ECS
            providers.push(remoteProvider);
            break;
        case 'ec2-metadata':
            // EC2
            providers.push(ec2MetadataProvider);
            break;
        case 'enviroment':
            // Lambda
            providers.push(enviromentProvider);
            break;
        case 'credentials':
            // Local
            providers.push(sharedIniFileProvider);
            break;
        default:
            // ECS
            if (awsContainerCredFullUri || awsContainerCredRelativeUri) {
                providers.push(sharedIniFileProvider)
                providers.push(remoteProvider)
            }
            // EC2
            if (isEc2()) {
                providers.push(ec2MetadataProvider)
            }
            // Lambda
            if (isLambda()) {
                providers.push(enviromentProvider)
            }
            // Local
            if (!awsContainerCredFullUri && !awsContainerCredRelativeUri && !isEc2() && !isLambda()) {
                providers.push(sharedIniFileProvider)
            }
    }
    const providerChain = new AWS.CredentialProviderChain(providers);
    AWS.config.credentials = await providerChain.resolvePromise();
}

function isAWSCredentialsExpired() {
    return (AWS.config.credentials as AWS.Credentials).expired
        // [DY] note: expireTime is a Date object with UTC time e.g. 2019-06-20T12:18:49.000Z
        || (AWS.config.credentials as AWS.Credentials).expireTime == null
        // 5 minutes based on AWS docs:https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
        || (AWS.config.credentials as AWS.Credentials).expireTime < getDateAtLaterMinute(5)
}

function _isEc2(): boolean {
    try {
        const uuid = readFileSync("/sys/hypervisor/uuid").toString();
        return uuid.startsWith("ec2");
    } catch (e) {
        return false;
    }
}

function _isLambda(): boolean {
    return !!process.env.LAMBDA_TASK_ROOT;
}

const isEc2 = memoize(_isEc2);
const isLambda = memoize(_isLambda);
