jest.mock("../util/RequestUtil", () => ({
  sendRequest: jest.fn().mockImplementation((x) => x),
}));

import * as pgCommonServicesApi from "../index";

const MOCK_HOST = "mockHost";
const MOCK_ENDPOINT = "https://mock.com";

const defaultRequest = {
  protocol: "https:",
  hostname: "mock.com",
  method: "GET",
  path: "/",
  headers: { Host: "mock.com" },
};

describe("Test pgCommonServicesApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Sending with configs", () => {
    it("should send with the correct configs", async () => {
      // Type as HttpRequest from "@smithy/protocol-http";
      const expectedRequest = {
        protocol: "https:",
        hostname: "mock.com",
        method: "GET",
        path: "/mockStage/",
        headers: { Host: MOCK_HOST },
      };

      pgCommonServicesApi.config({
        endpoint: MOCK_ENDPOINT,
        stage: "mockStage",
        private: true,
        host: MOCK_HOST,
      });

      const request = await pgCommonServicesApi.createAndSendRequest(
        "/",
        "GET"
      );

      expect(request.headers.Host).toBe(expectedRequest.headers.Host);
      expect(request.method).toBe(expectedRequest.method);
      expect(request.path).toBe(expectedRequest.path);
      expect(request.protocol).toBe(expectedRequest.protocol);
      expect(request.hostname).toBe(expectedRequest.hostname);
    });
  });

  describe("Sending unsigned request", () => {
    it("should send the request successfully", async () => {
      pgCommonServicesApi.config({ endpoint: MOCK_ENDPOINT, sign: false });

      const request = await pgCommonServicesApi.createAndSendRequest(
        "/",
        "GET"
      );

      expect(request.headers.Host).toBe(defaultRequest.headers.Host);
      expect(request.method).toBe(defaultRequest.method);
      expect(request.path).toBe(defaultRequest.path);
      expect(request.protocol).toBe(defaultRequest.protocol);
      expect(request.hostname).toBe(defaultRequest.hostname);
    });
  });

  describe("Sending signed request", () => {
    it("should send successfully", async () => {
      pgCommonServicesApi.config({
        endpoint: MOCK_ENDPOINT,
        sign: true,
        credentialProvider: "credentials",
      });

      const request = await pgCommonServicesApi.createAndSendRequest(
        "/",
        "GET"
      );

      expect(request.method).toBe(defaultRequest.method);
      expect(request.path).toBe(defaultRequest.path);
      expect(request.protocol).toBe(defaultRequest.protocol);
      expect(request.hostname).toBe(defaultRequest.hostname);

      expect(request.headers.Host).toBe(defaultRequest.headers.Host);
      expect(request.headers).toHaveProperty("authorization");
      expect(request.headers).toHaveProperty("x-amz-content-sha256");
      expect(request.headers).toHaveProperty("x-amz-date");
    });
  });
});
