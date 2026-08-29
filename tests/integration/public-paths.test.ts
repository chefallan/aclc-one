// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * The handful of URLs that must answer before anyone has signed in.
 *
 * /sw.js is the one that bit. A browser refuses to register a service worker
 * whose script came back as a redirect, so sending an unauthenticated request
 * for it to /auth/signin meant the worker installed only for people who were
 * already signed in — and the icons the manifest names were answered with the
 * sign-in page's HTML, which the old worker then cached under an icon's URL.
 *
 * The negative case is the other half and matters more: adding paths to this
 * list is how a protected route gets opened by accident.
 */

const token = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(async () => token.current),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, headers: {} })),
  limiters: { auth: {}, apiRead: {}, apiWrite: {} },
  rateLimitResponse: vi.fn(),
}));

const { proxy } = await import("@/proxy");

const get = (pathname: string) =>
  proxy(new NextRequest(new URL(pathname, "https://one.aclcormoc.edu.ph")));

/** A redirect to the sign-in page is what "not public" looks like here. */
async function sentToSignIn(pathname: string) {
  const res = await get(pathname);
  return res.status >= 300 && res.status < 400 && (res.headers.get("location") ?? "").includes("/auth/signin");
}

describe("what answers without a session", () => {
  beforeEach(() => {
    token.current = null;
  });

  it("serves the service worker script directly, never as a redirect", async () => {
    expect(await sentToSignIn("/sw.js")).toBe(false);
  });

  it("serves the manifest and the icons it names", async () => {
    expect(await sentToSignIn("/manifest.json")).toBe(false);
    expect(await sentToSignIn("/icons/icon-192x192.png")).toBe(false);
  });

  it("serves the front door and the sign-in pages", async () => {
    expect(await sentToSignIn("/")).toBe(false);
    expect(await sentToSignIn("/auth/signin")).toBe(false);
    expect(await sentToSignIn("/auth/error")).toBe(false);
    expect(await sentToSignIn("/api/auth/session")).toBe(false);
  });

  it("still sends everything else to sign in", async () => {
    expect(await sentToSignIn("/dashboard")).toBe(true);
    expect(await sentToSignIn("/dashboard/grades")).toBe(true);
    expect(await sentToSignIn("/dashboard/students/import")).toBe(true);
  });

  it("does not open a protected route that merely starts like a public one", async () => {
    // "/icons/" is a prefix match; "/iconsmith" and "/swap" must not slip
    // through it, and neither may an API path dressed up as an icon.
    expect(await sentToSignIn("/iconsmith")).toBe(true);
    expect(await sentToSignIn("/sw.js.map")).toBe(true);
    expect(await sentToSignIn("/api/students")).toBe(false);
  });

  it("answers a protected API route with 401 rather than a redirect", async () => {
    const res = await get("/api/students");
    expect(res.status).toBe(401);
  });
});
