
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { JwtStrategy } from "./jwt.strategy";
import { TokenService } from "../services/token.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("JwtStrategy security validation", () => {
  let strategy: JwtStrategy;

  const tokenService = {
    isTokenBlacklisted: jest.fn(),
    getSessionGeneration: jest.fn(),
    getUserRevokedBefore: jest.fn(),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const config = {
    getOrThrow: jest.fn().mockReturnValue("test-access-secret"),
    get: jest.fn().mockReturnValue(undefined),
  };

  const request = {
    headers: {
      authorization: "Bearer test-access-token",
    },
  } as Request;

  const payload = {
    sub: "user-123",
    email: "customer@shopkart.test",
    role: "customer",
    generation: 1,
    iat: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    tokenService.isTokenBlacklisted.mockResolvedValue(false);
    tokenService.getSessionGeneration.mockResolvedValue(1);
    tokenService.getUserRevokedBefore.mockResolvedValue(null);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "customer@shopkart.test",
      name: "Test Customer",
      isActive: true,
      role: { name: "customer" },
    });

    strategy = new JwtStrategy(
      config as unknown as ConfigService,
      tokenService as unknown as TokenService,
      prisma as unknown as PrismaService,
    );
  });

  it("accepts a token with the current session generation", async () => {
    await expect(strategy.validate(request, payload)).resolves.toMatchObject({
      id: "user-123",
      role: "customer",
    });
  });

  it("rejects an outdated session generation", async () => {
    tokenService.getSessionGeneration.mockResolvedValue(2);

    await expect(
      strategy.validate(request, payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a missing session generation", async () => {
    const { generation: _generation, ...invalidPayload } = payload;

    await expect(
      strategy.validate(request, invalidPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a blacklisted access token", async () => {
    tokenService.isTokenBlacklisted.mockResolvedValue(true);

    await expect(
      strategy.validate(request, payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("fails securely when Redis is unavailable", async () => {
    tokenService.getSessionGeneration.mockRejectedValue(
      new ServiceUnavailableException("Redis unavailable"),
    );

    await expect(
      strategy.validate(request, payload),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("rejects an inactive user", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "customer@shopkart.test",
      name: "Test Customer",
      isActive: false,
      role: { name: "customer" },
    });

    await expect(
      strategy.validate(request, payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token issued before the revocation timestamp", async () => {
    tokenService.getUserRevokedBefore.mockResolvedValue(1000);

    await expect(
      strategy.validate(request, payload),
    ).rejects.toThrow(UnauthorizedException);
  });
});
