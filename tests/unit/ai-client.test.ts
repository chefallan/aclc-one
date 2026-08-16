import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveAiConfig, resolveProvider, isAiConfigured, AiUnavailableError } from "@/lib/ai-client";

const KEYS = [
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_MODEL",
  "OLLAMA_API_KEY",
  "OLLAMA_BASE_URL",
  "ENABLE_AI",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("resolveProvider", () => {
  it("defaults to openai when unset", () => {
    expect(resolveProvider(undefined)).toBe("openai");
  });

  it("accepts ollama", () => {
    expect(resolveProvider("ollama")).toBe("ollama");
  });

  it("is case-insensitive", () => {
    expect(resolveProvider("Ollama")).toBe("ollama");
  });

  it("throws on a vendor with no implementation rather than substituting one", () => {
    // The bug this guards: every unknown value used to fall through to the
    // OpenAI provider, so AI_PROVIDER=anthropic silently called OpenAI.
    expect(() => resolveProvider("anthropic")).toThrow(AiUnavailableError);
    expect(() => resolveProvider("gemini")).toThrow(/Supported providers/);
  });
});

describe("resolveAiConfig — Ollama Cloud", () => {
  it("points at the hosted OpenAI-compatible endpoint by default", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_API_KEY = "key-123";

    const config = resolveAiConfig();

    expect(config.provider).toBe("ollama");
    expect(config.baseURL).toBe("https://ollama.com/v1");
    expect(config.apiKey).toBe("key-123");
    // No "-cloud" suffix: the OpenAI-compatible endpoint rejects that form.
    expect(config.model).toBe("gpt-oss:120b");
    expect(config.model).not.toContain("-cloud");
  });

  it("requires a key for the hosted service", () => {
    process.env.AI_PROVIDER = "ollama";

    expect(() => resolveAiConfig()).toThrow(AiUnavailableError);
    expect(() => resolveAiConfig()).toThrow(/OLLAMA_API_KEY/);
  });

  it("falls back to AI_API_KEY so one key variable can serve either provider", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.AI_API_KEY = "shared-key";

    expect(resolveAiConfig().apiKey).toBe("shared-key");
  });

  it("honours an explicit model override", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_API_KEY = "key-123";
    process.env.AI_MODEL = "deepseek-v4-flash:preview";

    expect(resolveAiConfig().model).toBe("deepseek-v4-flash:preview");
  });
});

describe("resolveAiConfig — Ollama running locally", () => {
  it("does not demand a key for localhost", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434/v1";

    const config = resolveAiConfig();

    expect(config.baseURL).toBe("http://localhost:11434/v1");
    // The SDK rejects an empty string, so a placeholder stands in.
    expect(config.apiKey).toBe("ollama");
  });

  it("treats 127.0.0.1 and the docker host alias as local too", () => {
    process.env.AI_PROVIDER = "ollama";

    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
    expect(() => resolveAiConfig()).not.toThrow();

    process.env.OLLAMA_BASE_URL = "http://host.docker.internal:11434/v1";
    expect(() => resolveAiConfig()).not.toThrow();
  });

  it("still demands a key for a remote self-hosted server", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "https://ollama.example.edu.ph/v1";

    expect(() => resolveAiConfig()).toThrow(AiUnavailableError);
  });
});

describe("resolveAiConfig — OpenAI", () => {
  it("uses the SDK default base URL", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_API_KEY = "sk-test";

    const config = resolveAiConfig();

    expect(config.baseURL).toBeUndefined();
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("requires a key and suggests the alternative", () => {
    process.env.AI_PROVIDER = "openai";

    expect(() => resolveAiConfig()).toThrow(/AI_API_KEY/);
  });
});

describe("the AI kill switch", () => {
  it("refuses every provider when AI is switched off", () => {
    process.env.ENABLE_AI = "false";
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_API_KEY = "key-123";

    expect(() => resolveAiConfig()).toThrow(/switched off/);
    expect(isAiConfigured()).toBe(false);
  });
});

describe("isAiConfigured", () => {
  it("is false when nothing is set up", () => {
    expect(isAiConfigured()).toBe(false);
  });

  it("is true once Ollama Cloud has a key", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_API_KEY = "key-123";

    expect(isAiConfigured()).toBe(true);
  });
});
