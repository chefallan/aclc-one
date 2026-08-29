import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * What Study Buddy says when the model provider refuses.
 *
 * Reported by a student: two empty bubbles and "Study Buddy stopped
 * mid-answer. Your question is saved — try asking again." The real cause was
 * HTTP 410 — the configured model had been retired — so asking again could
 * never work. The student was being sent round a loop with no exit.
 *
 * The distinction these tests defend is whether a retry could succeed. A dead
 * model needs an administrator; a network blip needs patience; telling one
 * apart from the other is the whole job.
 */

const create = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai-client", () => ({
  getAiClient: vi.fn(async () => ({
    client: { chat: { completions: { create } } },
    model: "deepseek-v4-flash:preview",
  })),
  AiUnavailableError: class AiUnavailableError extends Error {},
}));

const { streamChat, ChatUnavailableError } = await import("@/lib/study-buddy/chat");

/** Drains the generator so whatever it throws surfaces. */
async function run(signal?: AbortSignal) {
  const out: string[] = [];
  for await (const delta of streamChat({
    messages: [{ role: "user", content: "hi" }],
    systemPrompt: "be helpful",
    signal,
  })) {
    out.push(delta);
  }
  return out.join("");
}

const apiError = (status: number, message: string) => Object.assign(new Error(message), { status });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a model that is gone", () => {
  it("says an administrator must fix it, not that you should retry", async () => {
    create.mockRejectedValue(apiError(410, "deepseek-v4-flash:preview was retired at 2026-08-27"));

    await expect(run()).rejects.toBeInstanceOf(ChatUnavailableError);
    await expect(run()).rejects.toThrow(/administrator needs to set a current model/i);
  });

  it("names the model, so the fix is obvious", async () => {
    create.mockRejectedValue(apiError(410, "retired"));
    await expect(run()).rejects.toThrow(/deepseek-v4-flash:preview/);
  });

  it("never tells the student to ask again", async () => {
    create.mockRejectedValue(apiError(410, "retired"));
    await expect(run()).rejects.not.toThrow(/try asking again/i);
  });

  it("treats an unknown model the same way", async () => {
    create.mockRejectedValue(apiError(404, "model not found"));
    await expect(run()).rejects.toBeInstanceOf(ChatUnavailableError);
  });
});

describe("other refusals", () => {
  it("points at the API key on a 401", async () => {
    create.mockRejectedValue(apiError(401, "unauthorized"));
    await expect(run()).rejects.toThrow(/API key/i);
  });

  it("points at the API key on a 403", async () => {
    create.mockRejectedValue(apiError(403, "forbidden"));
    await expect(run()).rejects.toBeInstanceOf(ChatUnavailableError);
  });

  it("says wait, not reconfigure, when rate limited", async () => {
    create.mockRejectedValue(apiError(429, "too many requests"));
    await expect(run()).rejects.toThrow(/few minutes/i);
  });

  it("blames the configuration on a 400", async () => {
    create.mockRejectedValue(apiError(400, "bad request"));
    await expect(run()).rejects.toThrow(/configuration/i);
  });
});

describe("failures where retrying is the right advice", () => {
  it("leaves a 500 alone so the caller's retry message applies", async () => {
    const boom = apiError(500, "upstream exploded");
    create.mockRejectedValue(boom);
    // Not translated: the generic handler upstream says "try again", which is
    // correct for a transient fault.
    await expect(run()).rejects.toBe(boom);
  });

  it("leaves a bare network error alone", async () => {
    const net = new Error("fetch failed");
    create.mockRejectedValue(net);
    await expect(run()).rejects.toBe(net);
  });
});

describe("cancellation", () => {
  it("is not reported as a fault", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = Object.assign(new Error("Request was aborted"), { status: 400 });
    create.mockRejectedValue(aborted);

    // A 400 would normally be translated into a configuration message. A
    // student closing the tab must not be told the app is misconfigured.
    await expect(run(controller.signal)).rejects.toBe(aborted);
  });
});

describe("the happy path still works", () => {
  it("yields the content deltas", async () => {
    create.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hel" } }] };
        yield { choices: [{ delta: { content: "lo" } }] };
        yield { choices: [{ delta: {} }] };
      })()
    );

    expect(await run()).toBe("Hello");
  });
});
