import * as CredentialsUtil from "../CredentialsUtil";
import { getDateAtLaterMinute } from "../DateUtil";
import * as fs from "fs";
import { AwsCredentialIdentity } from "@smithy/types";

jest.mock("@aws-sdk/credential-providers", () => ({
  fromContainerMetadata: jest.fn(),
  fromEnv: jest.fn(),
  fromIni: jest.fn(),
  fromInstanceMetadata: jest.fn(),
}));

const mockProviderCredentials: AwsCredentialIdentity = {
  accessKeyId: "remoteKey",
  secretAccessKey: "remoteSecret",
  expiration: getDateAtLaterMinute(30),
};

const mockDefaultProvider = jest.fn();
jest.mock("@aws-sdk/credential-provider-node", () => ({
  defaultProvider: () => mockDefaultProvider,
}));

describe("CredentialsUtils", () => {
  beforeEach(() => {
    mockDefaultProvider.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete globalThis.awsCredentials;
  });

  describe("When initial credentials exists and its unexpired", () => {
    it("should just use the initial credentials", async () => {
      const initialCredentials: AwsCredentialIdentity = {
        accessKeyId: "initialKey",
        secretAccessKey: "initialSecret",
        expiration: getDateAtLaterMinute(30),
      };
      globalThis.awsCredentials = initialCredentials;
      jest
        .spyOn(fs, "readFileSync")
        .mockReturnValue({ toString: () => "" } as any);

      await CredentialsUtil.checkCredentials(null);

      expect(globalThis.awsCredentials).toEqual(initialCredentials);
      expect(mockDefaultProvider).not.toHaveBeenCalled();
    });
  });

  describe("When credentials is expired", () => {
    it("should get credentials from provider", async () => {
      const initialCredentials: AwsCredentialIdentity = {
        accessKeyId: "initialKey",
        secretAccessKey: "initialSecret",
        expiration: getDateAtLaterMinute(4.9),
      };

      globalThis.awsCredentials = initialCredentials;

      mockDefaultProvider.mockResolvedValue(mockProviderCredentials);
      jest
        .spyOn(fs, "readFileSync")
        .mockReturnValue({ toString: () => "" } as any);

      await CredentialsUtil.checkCredentials(null);

      expect(globalThis.awsCredentials).toEqual(mockProviderCredentials);
      expect(mockDefaultProvider).toHaveBeenCalled();
    });
  });

  describe("When no initial credentials exist", () => {
    it("should get credentials from provider", async () => {
      delete globalThis.awsCredentials;

      mockDefaultProvider.mockResolvedValue(mockProviderCredentials);

      jest
        .spyOn(fs, "readFileSync")
        .mockReturnValue({ toString: () => "" } as any);

      await CredentialsUtil.checkCredentials(null);

      expect(globalThis.awsCredentials).toEqual(mockProviderCredentials);
      expect(mockDefaultProvider).toHaveBeenCalled();
    });
  });

  describe("When credentials have no expiration", () => {
    it("should get credentials from provider", async () => {
      const initialCredentials: AwsCredentialIdentity = {
        accessKeyId: "initialKey",
        secretAccessKey: "initialSecret",
        // expiration is omitted
      } as any;

      globalThis.awsCredentials = initialCredentials;

      mockDefaultProvider.mockResolvedValue(mockProviderCredentials);

      jest
        .spyOn(fs, "readFileSync")
        .mockReturnValue({ toString: () => "" } as any);

      await CredentialsUtil.checkCredentials(null);

      expect(globalThis.awsCredentials).toEqual(mockProviderCredentials);
      expect(mockDefaultProvider).toHaveBeenCalled();
    });
  });
});
