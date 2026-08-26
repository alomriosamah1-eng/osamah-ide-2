/**
 * @fileoverview Local-account credential and session primitives.
 *
 * Passwords and recovery answers are normalized then salted with scrypt. Session tokens
 * are signed server-side and are intended to be written only to an HTTP-only cookie by
 * the root auth router; this module neither writes cookies nor reads browser storage.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import type { Request } from "express";
import { ENV } from "./_core/env";

const scryptAsync = promisify(scrypt);
const SESSION_ISSUER = "osamah-ide-local";
const SESSION_AUDIENCE = "osamah-ide";
/** Name of the HTTP-only cookie carrying a signed local-account session. */
export const LOCAL_SESSION_COOKIE = "osamah_local_session";
/** Maximum accepted local-session age in milliseconds; JWT expiry is aligned to 30 days. */
export const LOCAL_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for local account sessions.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

function normalizePassword(value: string) {
  return value.normalize("NFKC");
}

function normalizeRecoveryAnswer(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

/** Creates a salted scrypt representation of a local-account password. */
export async function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(normalizePassword(password), salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

/** Creates a salted scrypt representation of a normalized recovery answer. */
export async function hashRecoveryAnswer(answer: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(normalizeRecoveryAnswer(answer), salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

async function verifyHash(value: string, stored: string, normalizer: (input: string) => string) {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = await scryptAsync(normalizer(value), salt, 64) as Buffer;
  const expectedBuffer = Buffer.from(expected, "base64url");
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}

/** Verifies a password against a stored scrypt value using a timing-safe comparison. */
export function verifyLocalPassword(password: string, stored: string) {
  return verifyHash(password, stored, normalizePassword);
}

/** Verifies a normalized recovery answer against a stored scrypt value. */
export function verifyRecoveryAnswer(answer: string, stored: string) {
  return verifyHash(answer, stored, normalizeRecoveryAnswer);
}

/** Signs a 30-day, audience-bound JWT for an already authenticated local user. */
export async function createLocalSession(userId: number) {
  return new SignJWT({ kind: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

/**
 * Extracts and verifies the local session from an Express request.
 *
 * Invalid, expired, or malformed cookies resolve to `null` rather than exposing parsing
 * details to callers.
 */
export async function getLocalSessionUserId(req: Request) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const token = parse(rawCookie)[LOCAL_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.kind !== "local" || typeof payload.sub !== "string") return null;
    const userId = Number.parseInt(payload.sub, 10);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
