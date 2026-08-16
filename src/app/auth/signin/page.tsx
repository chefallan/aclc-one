"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mark } from "@/components/shell/app-shell";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      // A wrong password comes back as the generic "CredentialsSignin", and
      // the reply deliberately does not say which of the two was wrong. An
      // account that exists but is not usable yet carries its own message —
      // waiting for approval is not something to leave someone guessing at.
      setError(
        result.error === "CredentialsSignin"
          ? "That email and password don't match. Check both and try again."
          : result.error
      );
      return;
    }

    router.push(params.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="mt-1.5 text-sm text-content-muted">
            Attendance, the library, and everyone you need to find — in one place.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@aclc.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
                >
                  Forgot it?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>

            <Button type="submit" disabled={loading} block size="lg">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

      <p className="mt-6 text-center text-sm text-content-muted">
        Setting up a school?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          Start here
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-base font-semibold tracking-tight">ACLC One</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/register">Request access</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={<div className="w-full max-w-sm" />}>
          <SignInForm />
        </Suspense>
      </main>
    </div>
  );
}
