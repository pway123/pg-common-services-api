import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpRequest } from "@smithy/protocol-http";
import { Readable } from "stream";
/**
 * Send the request to AWS
 *
 * @returns {Promise} The response body
 * @throws  {message} Promise is rejected with an object e.g. { message: 'The security token included in the request is invalid.' }
 * @param {HttpRequest} request
 */
export function sendRequest(request: HttpRequest): Promise<any> {
  const handler = new NodeHttpHandler();
  return handler.handle(request).then(({ response }) => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const stream = response.body as Readable;

      stream.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on("end", () => {
        const respBody = Buffer.concat(chunks).toString("utf-8");
        if (isForbiddenRequestOrServerError(response)) {
          return reject(new Error(respBody));
        }

        try {
          resolve(JSON.parse(respBody));
        } catch (e) {
          reject(new Error(respBody));
        }
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  });
}

function isForbiddenRequestOrServerError(response) {
  return response.statusCode === 403 || response.statusCode >= 500;
}
