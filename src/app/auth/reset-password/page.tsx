"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { Mark } from "@/components/shell/app-shell";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-base font-semibold tracking-tight">ACLC One</span>
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={<div className="text-sm text-content-muted">Loading…</div>}>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");

  return token ? <SetNewPassword token={token} /> : <RequestLink />;
}

/** Step one: ask for the email. */
function RequestLink() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // This form used to announce "check your email" whichever way the
      // request went, including when it never arrived — so someone waiting on
      // a link that was never sent had no way to know.
      //
      // Saying a send failed is not the same as saying the account exists: the
      // API answers 2xx identically for an address it knows and one it does
      // not, and only a genuine failure gets past this branch.
      if (!res.ok) {
        setError("We couldn't send that just now. Try again in a moment.");
        return;
      }

      setSent(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex size-11 items-center justify-center rounded-field bg-present-50 text-present-600 dark:bg-present-700/25 dark:text-present-50">
          <CircleCheckBig className="size-5.5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">Check your email</h1>
        <p className="mt-1.5 text-sm text-content-muted">
          If an account uses that address, a reset link is on its way. The link works for one hour.
        </p>
        <Button asChild variant="outline" block className="mt-6">
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1.5 text-sm text-content-muted">
        Enter the email you sign in with and we&apos;ll send a reset link.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {!error && loading && <FormMessage tone="working">Sending your reset link…</FormMessage>}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
            required
          />
        </div>
        <Button type="submit" block size="lg" loading={loading} loadingText="Sending…">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-content-muted">
        <Link
          href="/auth/signin"
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/** Step two: they followed the link. */
function SetNewPassword({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");

  const busy = phase !== "idle";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setPhase("saving");

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      // An error page or a rate-limit reply is not JSON, and parsing one used
      // to throw past the end of this function, leaving the button stuck on
      // "Saving…" with nothing said.
      const body: { success?: boolean; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok || !body.success) {
        setPhase("idle");
        setError(body.error ?? "That reset link has expired. Request a new one.");
        return;
      }

      setPhase("saved");
      router.push("/auth/signin");
    } catch {
      setPhase("idle");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-content-muted">At least 8 characters.</p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {!error && phase === "saving" && (
          <FormMessage tone="working">Saving your new password…</FormMessage>
        )}
        {phase === "saved" && (
          <FormMessage tone="success">Password changed. Taking you to sign in…</FormMessage>
        )}

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={busy}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={busy}
            required
          />
        </div>

        <Button
          type="submit"
          block
          size="lg"
          loading={busy}
          loadingText={phase === "saved" ? "Saved" : "Saving…"}
        >
          Save new password
        </Button>
      </form>
    </div>
  );
}
