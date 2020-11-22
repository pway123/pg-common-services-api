import * as AWS from "aws-sdk"

/**
 * Send the request to AWS
 *
 * @returns {Promise} The response body
 * @throws  {message} Promise is rejected with an object e.g. { message: 'The security token included in the request is invalid.' }
 * @param {AWS.HttpRequest} request
 */
export function sendRequest(request): Promise<any> {
    // [DY] No typescript declaration for NodeHttpClient: https://github.com/aws/aws-sdk-js/issues/1729
    const send = new (AWS as any).NodeHttpClient();
    return new Promise((resolve, reject) => {
        send.handleRequest(request, null, function (response) {
            let respBody = "";
            response.on("data", function (chunk) {
                respBody += chunk;
            });
            response.on("end", function () {
                if (isForbiddenRequestOrServerError(response)) {
                    reject(new Error(respBody));
                }
                try {
                    resolve(JSON.parse(respBody));
                } catch (e) {
                    reject(new Error(respBody));
                }
            });
        }, function(errorArg) {
            reject(new Error(errorArg));
        });
    })
}

function isForbiddenRequestOrServerError(response) {
    return response.statusCode === 403 && response.statusCode >= 500;
}
