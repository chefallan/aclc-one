import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "0.1.0",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "apiKey",
      "secret",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.apiKey",
      "*.secret",
    ],
    remove: true,
  },
});

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}
