// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reported as "when we restart the PC we have to sign in again."
 *
 * The session cookie was never the problem — it carries a thirty-day absolute
 * expiry and is reissued on every session check. The service worker was. It
 * pre-cached "/", "/dashboard" and "/auth/signin" on install and then answered
 * every navigation from the cache first, so the shell captured on one visit
 * was replayed on the next cold start. Captured before sign-in, that shell is
 * the sign-in page, and it was served under /dashboard indefinitely.
 *
 * Underneath it sat a second fault with a wider blast radius: successful GET
 * replies from /api were written to the same cache. Cache Storage is per
 * origin, not per account, and these are shared lab machines — so one
 * student's timetable could be handed to the next person to sit down.
 *
 * Both are pinned here as things that must NOT be written to the cache.
 */

const ORIGIN = "https://one.aclcormoc.edu.ph";

type Handler = (event: unknown) => void;

function loadWorker() {
  const source = readFileSync(
    path.resolve(__dirname, "..", "..", "public", "sw.js"),
    "utf8"
  );

  const handlers: Record<string, Handler> = {};
  const put = vi.fn(async () => undefined);
  const deleted: string[] = [];

  const cacheApi = {
    match: vi.fn(async () => undefined),
    keys: vi.fn(async () => ["immerse-v1", "immerse-v2"]),
    open: vi.fn(async () => ({ put })),
    delete: vi.fn(async (name: string) => {
      deleted.push(name);
      return true;
    }),
  };

  const worker = {
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined), openWindow: vi.fn() },
    location: { origin: ORIGIN },
    registration: { showNotification: vi.fn() },
  };

  const fetchMock = vi.fn(async () => new Response("from the network", { status: 200 }));

  new Function("self", "caches", "fetch", source)(worker, cacheApi, fetchMock);

  return { handlers, cacheApi, put, deleted, fetchMock, worker };
}

function request(
  url: string,
  init: { mode?: string; destination?: string; method?: string; rsc?: boolean } = {}
) {
  return {
    method: init.method ?? "GET",
    mode: init.mode ?? "cors",
    destination: init.destination ?? "",
    url,
    headers: { get: (name: string) => (init.rsc && name === "RSC" ? "1" : null) },
  };
}

/** Runs the fetch handler and returns whatever it answered with. */
async function respond(handlers: Record<string, Handler>, req: ReturnType<typeof request>) {
  let answered: Promise<Response> | undefined;
  handlers.fetch({
    request: req,
    respondWith: (value: Promise<Response>) => {
      answered = value;
    },
  });
  return answered ? await answered : undefined;
}

describe("service worker: what may be served from the cache", () => {
  let w: ReturnType<typeof loadWorker>;

  beforeEach(() => {
    w = loadWorker();
  });

  it("never writes a page to the cache", async () => {
    await respond(w.handlers, request(`${ORIGIN}/dashboard`, { mode: "navigate", destination: "document" }));

    expect(w.fetchMock).toHaveBeenCalledOnce();
    expect(w.cacheApi.open).not.toHaveBeenCalled();
    expect(w.put).not.toHaveBeenCalled();
  });

  it("never serves a page from the cache, even when one is there", async () => {
    w.cacheApi.match.mockResolvedValue(
      new Response("a signed-out shell", { status: 200 }) as never
    );

    const res = await respond(
      w.handlers,
      request(`${ORIGIN}/dashboard`, { mode: "navigate", destination: "document" })
    );

    expect(w.cacheApi.match).not.toHaveBeenCalled();
    expect(await res!.text()).toBe("from the network");
  });

  it("treats an RSC payload as a page, not as a cacheable asset", async () => {
    // A client-side route change is not mode === "navigate", but it returns
    // the same page and carries the same identity.
    await respond(w.handlers, request(`${ORIGIN}/dashboard?_rsc=1a2b3c`));
    await respond(w.handlers, request(`${ORIGIN}/dashboard/grades`, { rsc: true }));

    expect(w.cacheApi.match).not.toHaveBeenCalled();
    expect(w.put).not.toHaveBeenCalled();
  });

  it("never writes an API reply to the cache", async () => {
    await respond(w.handlers, request(`${ORIGIN}/api/class-sessions`));

    expect(w.fetchMock).toHaveBeenCalledOnce();
    expect(w.cacheApi.open).not.toHaveBeenCalled();
    expect(w.put).not.toHaveBeenCalled();
  });

  it("answers an API request that cannot reach the network with 503, not with stale data", async () => {
    w.fetchMock.mockRejectedValue(new TypeError("offline") as never);

    const res = await respond(w.handlers, request(`${ORIGIN}/api/class-sessions`));

    expect(res!.status).toBe(503);
    expect(w.cacheApi.match).not.toHaveBeenCalled();
  });

  it("answers a page that cannot reach the network with an offline notice, not a cached shell", async () => {
    w.fetchMock.mockRejectedValue(new TypeError("offline") as never);

    const res = await respond(
      w.handlers,
      request(`${ORIGIN}/dashboard`, { mode: "navigate", destination: "document" })
    );

    expect(res!.status).toBe(503);
    expect(await res!.text()).toContain("offline");
    expect(w.cacheApi.match).not.toHaveBeenCalled();
  });

  it("does cache build output, which is content-addressed and the same for everyone", async () => {
    await respond(w.handlers, request(`${ORIGIN}/_next/static/chunks/abc123.js`));
    // The write is deliberately not awaited by the worker; let it land.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(w.cacheApi.match).toHaveBeenCalled();
    expect(w.put).toHaveBeenCalled();
  });

  it("leaves another origin alone", async () => {
    const res = await respond(w.handlers, request("https://fonts.gstatic.com/s/a.woff2"));

    expect(res).toBeUndefined();
    expect(w.fetchMock).not.toHaveBeenCalled();
  });

  it("pre-caches nothing on install", () => {
    w.handlers.install({ waitUntil: (p: Promise<unknown>) => p });

    expect(w.cacheApi.open).not.toHaveBeenCalled();
    expect(w.worker.skipWaiting).toHaveBeenCalled();
  });

  it("deletes the cache the old worker poisoned", async () => {
    const waited: Promise<unknown>[] = [];
    w.handlers.activate({ waitUntil: (p: Promise<unknown>) => waited.push(p) });
    await Promise.all(waited);

    expect(w.deleted).toContain("immerse-v1");
    expect(w.deleted).not.toContain("immerse-v2");
  });
});
