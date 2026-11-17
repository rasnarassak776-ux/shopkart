
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TokenService } from "./token.service";
import { RedisService } from "../../redis/redis.service";

describe("TokenService refresh-token security", () => {
  let service: TokenService;

  const payload = {
    sub: "user-123",
    jti: "refresh-123",
    generation: 1,
  };

  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };

  const client = {
    get: jest.fn(),
    eval: jest.fn(),
  };

  const redisService = {
    getClient: jest.fn(),
    isReady: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "JWT_ACCESS_SECRET") return "test-access-secret";
      if (key === "JWT_REFRESH_SECRET") return "test-refresh-secret";
      throw new Error(`Missing configuration: ${key}`);
    }),
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jwtService.verifyAsync.mockResolvedValue(payload);
    client.get.mockResolvedValue("1");
    client.eval.mockResolvedValue("OK");

    redisService.getClient.mockReturnValue(client);
    redisService.isReady.mockReturnValue(true);

    service = new TokenService(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      redisService as unknown as RedisService,
    );
  });

  it("accepts a valid refresh token", async () => {
    await expect(
      service.consumeRefreshToken("valid-refresh-token"),
    ).resolves.toEqual(payload);

    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing refresh token", async () => {
    await expect(
      service.consumeRefreshToken(""),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an expired or invalid refresh token", async () => {
    jwtService.verifyAsync.mockRejectedValue(
      new Error("jwt expired"),
    );

    await expect(
      service.consumeRefreshToken("expired-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects refresh tokens with invalid claims", async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: "user-123",
      jti: "refresh-123",
    });

    await expect(
      service.consumeRefreshToken("invalid-claims-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects refresh tokens from a revoked generation", async () => {
    client.eval.mockResolvedValue("GENERATION_REVOKED");

    await expect(
      service.consumeRefreshToken("old-refresh-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a refresh token whose session no longer exists", async () => {
    client.eval.mockResolvedValue("NOT_FOUND");

    await expect(
      service.consumeRefreshToken("missing-session-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects refresh tokens when Redis is unavailable", async () => {
    redisService.isReady.mockReturnValue(false);

    await expect(
      service.consumeRefreshToken("valid-refresh-token"),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("fails securely when Redis execution throws an error", async () => {
    client.eval.mockRejectedValue(
      new Error("Redis connection lost"),
    );

    await expect(
      service.consumeRefreshToken("valid-refresh-token"),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("rejects unexpected Redis validation results", async () => {
    client.eval.mockResolvedValue("UNEXPECTED_RESULT");

    await expect(
      service.consumeRefreshToken("valid-refresh-token"),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("detects refresh-token reuse and revokes all sessions", async () => {
    client.eval.mockResolvedValue("REUSED");

    const revokeSpy = jest
      .spyOn(service, "revokeAllUserSessions")
      .mockResolvedValue(undefined);

    await expect(
      service.consumeRefreshToken("reused-refresh-token"),
    ).rejects.toThrow(UnauthorizedException);

    expect(revokeSpy).toHaveBeenCalledWith("user-123");
  });

  it("revokes all sessions when a refresh-token hash mismatch occurs", async () => {
    client.eval.mockResolvedValue("HASH_MISMATCH");

    const revokeSpy = jest
      .spyOn(service, "revokeAllUserSessions")
      .mockResolvedValue(undefined);

    await expect(
      service.consumeRefreshToken("tampered-refresh-token"),
    ).rejects.toThrow(UnauthorizedException);

    expect(revokeSpy).toHaveBeenCalledWith("user-123");
  });
});
