import type OpenAI from "openai";

export type AiProviderName = "openai" | "ollama";

export interface AiClient {
  client: OpenAI;
  model: string;
  provider: AiProviderName;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/** Ollama Cloud's OpenAI-compatible layer. Local Ollama is http://localhost:11434/v1. */
const OLLAMA_CLOUD_BASE_URL = "https://ollama.com/v1";

const DEFAULT_MODEL: Record<AiProviderName, string> = {
  openai: "gpt-4o-mini",
  // No "-cloud" suffix. That form is Ollama's native/CLI naming; the
  // OpenAI-compatible /v1 endpoint lists the same models without it, and a
  // suffixed name is rejected as unknown. Check what your account can reach
  // with GET https://ollama.com/v1/models.
  ollama: "gpt-oss:120b",
};

export function resolveProvider(raw = process.env.AI_PROVIDER): AiProviderName {
  const provider = (raw || "openai").toLowerCase();
  if (provider === "openai" || provider === "ollama") return provider;

  // Previously any unknown value silently fell through to OpenAI, so a typo or
  // an unimplemented vendor sent traffic somewhere the operator did not choose.
  throw new AiUnavailableError(
    `Unsupported AI_PROVIDER "${raw}". Supported providers: openai, ollama.`
  );
}

/**
 * Resolves the base URL, key and model for the configured provider.
 *
 * Ollama speaks the OpenAI wire format, so both providers share one SDK and
 * differ only in where they point. Ollama Cloud requires a real key; a local
 * Ollama server ignores the field but the SDK insists on a non-empty string,
 * which is why the placeholder exists.
 */
export function resolveAiConfig(): {
  provider: AiProviderName;
  baseURL?: string;
  apiKey: string;
  model: string;
} {
  if (process.env.ENABLE_AI === "false") {
    throw new AiUnavailableError("AI features are switched off for this deployment.");
  }

  const provider = resolveProvider();

  if (provider === "ollama") {
    const baseURL = process.env.OLLAMA_BASE_URL || OLLAMA_CLOUD_BASE_URL;
    const apiKey = process.env.OLLAMA_API_KEY || process.env.AI_API_KEY || "";
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)/i.test(
      baseURL
    );

    if (!apiKey && !isLocal) {
      throw new AiUnavailableError(
        "Ollama Cloud needs an API key. Set OLLAMA_API_KEY — create one at ollama.com/settings/keys."
      );
    }

    return {
      provider,
      baseURL,
      // A local server ignores the key, but the SDK rejects an empty string.
      apiKey: apiKey || "ollama",
      model: process.env.AI_MODEL || DEFAULT_MODEL.ollama,
    };
  }

  const apiKey = process.env.AI_API_KEY || "";
  if (!apiKey) {
    throw new AiUnavailableError(
      "OpenAI needs an API key. Set AI_API_KEY, or switch AI_PROVIDER to ollama."
    );
  }

  return { provider, apiKey, model: process.env.AI_MODEL || DEFAULT_MODEL.openai };
}

/**
 * One configured client for every AI call in the app.
 *
 * The SDK is imported lazily so a deployment with AI switched off never pulls
 * it into the bundle, and so a missing key surfaces as our own error rather
 * than a constructor throw from inside the library.
 */
export async function getAiClient(): Promise<AiClient> {
  const config = resolveAiConfig();
  const { default: OpenAIClient } = await import("openai");

  return {
    client: new OpenAIClient({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    }),
    model: config.model,
    provider: config.provider,
  };
}

/** True when AI is configured well enough to attempt a call. For health checks. */
export function isAiConfigured(): boolean {
  try {
    resolveAiConfig();
    return true;
  } catch {
    return false;
  }
}
