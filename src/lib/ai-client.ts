import type OpenAI from "openai";

export type AiProviderName = "openai" | "ollama" | "groq" | "openrouter" | "gemini";

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

/** Default OpenAI-compatible base URLs for supported AI providers */
const PROVIDER_BASE_URLS: Record<AiProviderName, string> = {
  openai: "https://api.openai.com/v1",
  ollama: "https://ollama.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

const DEFAULT_MODEL: Record<AiProviderName, string> = {
  openai: "gpt-4o-mini",
  ollama: "gpt-oss:120b",
  groq: "llama-3.1-8b-instant",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  gemini: "gemini-2.0-flash",
};

export function resolveProvider(raw = process.env.AI_PROVIDER): AiProviderName {
  const provider = (raw || "openai").toLowerCase() as AiProviderName;
  if (["openai", "ollama", "groq", "openrouter", "gemini"].includes(provider)) {
    return provider;
  }

  throw new AiUnavailableError(
    `Unsupported AI_PROVIDER "${raw}". Supported providers: openai, ollama, groq, openrouter, gemini.`
  );
}

/**
 * Resolves the base URL, key and model for the configured provider.
 * All providers speak the OpenAI wire format and share the OpenAI SDK.
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

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || "";
    if (!apiKey) {
      throw new AiUnavailableError("Groq needs an API key. Set GROQ_API_KEY.");
    }
    return {
      provider,
      baseURL: process.env.GROQ_BASE_URL || PROVIDER_BASE_URLS.groq,
      apiKey,
      model: process.env.GROQ_MODEL || process.env.AI_MODEL || DEFAULT_MODEL.groq,
    };
  }

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
    if (!apiKey) {
      throw new AiUnavailableError("OpenRouter needs an API key. Set OPENROUTER_API_KEY.");
    }
    return {
      provider,
      baseURL: process.env.OPENROUTER_BASE_URL || PROVIDER_BASE_URLS.openrouter,
      apiKey,
      model: process.env.OPENROUTER_MODEL || process.env.AI_MODEL || DEFAULT_MODEL.openrouter,
    };
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
    if (!apiKey) {
      throw new AiUnavailableError("Gemini needs an API key. Set GEMINI_API_KEY.");
    }
    return {
      provider,
      baseURL: process.env.GEMINI_BASE_URL || PROVIDER_BASE_URLS.gemini,
      apiKey,
      model: process.env.GEMINI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL.gemini,
    };
  }

  if (provider === "ollama") {
    const baseURL = process.env.OLLAMA_BASE_URL || PROVIDER_BASE_URLS.ollama;
    const apiKey = process.env.OLLAMA_API_KEY || process.env.AI_API_KEY || "";
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)/i.test(baseURL);

    if (!apiKey && !isLocal) {
      throw new AiUnavailableError(
        "Ollama Cloud needs an API key. Set OLLAMA_API_KEY — create one at ollama.com/settings/keys."
      );
    }

    return {
      provider,
      baseURL,
      apiKey: apiKey || "ollama",
      model: process.env.AI_MODEL || DEFAULT_MODEL.ollama,
    };
  }

  // Default: OpenAI
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
  if (!apiKey) {
    throw new AiUnavailableError(
      "OpenAI needs an API key. Set OPENAI_API_KEY, or switch AI_PROVIDER to groq, openrouter, gemini, or ollama."
    );
  }

  return {
    provider,
    baseURL: process.env.OPENAI_BASE_URL || PROVIDER_BASE_URLS.openai,
    apiKey,
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_MODEL.openai,
  };
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
