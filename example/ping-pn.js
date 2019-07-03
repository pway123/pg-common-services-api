const pg = require("pg-common-services-api")
require("dotenv").config();

// process.argv[0] is node and 1 is the .js file path
const ENV_ARG = process.argv[2];
const PUSH_TOKEN = process.argv[3] || "fake_token";

function getEndpointFromArg() {
    const envMapArgToEndpoint = {
        dev: process.env.DEV_ENDPOINT,
        qe: process.env.QE_ENDPOINT,
        rc: process.env.RC_ENDPOINT,
        stable: process.env.STABLE_ENDPOINT
    }

    if (envMapArgToEndpoint.hasOwnProperty(ENV_ARG)) {
        return envMapArgToEndpoint[ENV_ARG];
    }
    if (!ENV_ARG) {
        throw new Error("no env provided :(")
    }
    throw new Error(ENV_ARG + " is wrong env")
}

async function healthcheck() {
    const endpoint = getEndpointFromArg();
    await pg.config({
        endpoint,
        sign: true
    })
    const qePushNotifData = await pg.sendPushNotification({
        "params": {
            "pushTokens": [
                {
                    "parentId": "fakeId",
                    "pushToken": PUSH_TOKEN,
                    "deviceOS": "ios",
                    "deviceModel": "iPhone 8"
                },
            ],
            "pushPayload": {
                "notification": {
                    "title": "Test Annoucement",
                    "body": "PN common service",
                    "android_channel_id": "pg-channel",
                    "priority": "high",
                    "badge": "0"
                },
                "data": {
                    "type": "new_announcement",
                    "payload": "1"
                }
            }
        },
        "messageAttributes": {
            "transactionId": 1,
            "event": "dueDate",
            "metadata": { "test": "abc" }
        }
    })

    if (qePushNotifData.resultCode !== "200") {
        throw new Error(`------ FAILED TO CALL ${ENV_ARG} API GATEWAY PN SERVICE------`)
    }
    console.log(`------ SUCCESSFULLY CALLED ${ENV_ARG} API GATEWAY PN SERVICE------`)
    console.log(JSON.stringify(qePushNotifData))
}

healthcheck().catch((e) => { console.log(e); process.exit(1) });