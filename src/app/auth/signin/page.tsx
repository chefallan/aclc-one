"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { Mark } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";
import { authErrorMessage } from "@/lib/auth-errors";

/**
 * A callbackUrl arrives in the query string, which means anyone can put
 * anything in it. Only a path on this site is followed; an absolute URL — or
 * "//evil.example", which a browser reads as one — is dropped for the
 * dashboard. Otherwise the sign-in page becomes a way to launder a link to
 * somewhere else through a domain the student trusts.
 */
function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * Concept sheet 02.1: "Role picker up front so faculty and staff never see a
 * student-shaped app."
 *
 * It tailors this screen only. What the app looks like after sign-in is decided
 * by the account role, not by this control — picking the wrong tab costs a
 * student nothing but a differently worded placeholder, and there is no way to
 * talk yourself into a faculty view by tapping one.
 */
const ROLES = [
  { id: "student", label: "Student", hint: "you@aclc.edu.ph" },
  { id: "faculty", label: "Faculty", hint: "name@aclc.edu.ph" },
  { id: "staff", label: "Staff", hint: "office@aclc.edu.ph" },
] as const;

type RoleTab = (typeof ROLES)[number]["id"];

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();

  const callbackUrl = safeCallback(params.get("callbackUrl"));
  const urlError = params.get("error");

  const [role, setRole] = useState<RoleTab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // "" until something goes wrong. Seeded from ?error= so that a failure
  // NextAuth handled by redirecting here is still visible on arrival.
  const [error, setError] = useState(urlError ? authErrorMessage(urlError) : "");
  const [phase, setPhase] = useState<"idle" | "submitting" | "success">("idle");

  const busy = phase !== "idle";
  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setPhase("submitting");
    setError("");

    let result;
    try {
      result = await signIn("credentials", { email, password, redirect: false });
    } catch {
      // A dead network rejects here. Without this the button stayed disabled
      // on "Signing you in…" forever and the person was told nothing at all.
      setPhase("idle");
      setError("We couldn't reach the server. Check your connection and try again.");
      return;
    }

    // A wrong password comes back as the generic "CredentialsSignin", and the
    // reply deliberately does not say which of the two was wrong. An account
    // that exists but is not usable yet carries its own message — waiting for
    // approval is not something to leave someone guessing at.
    //
    // The !result and !result.ok arms matter as much as the error one: both
    // used to fall through to the redirect below, which bounced straight back
    // here with nothing said.
    if (!result || result.error || !result.ok) {
      setPhase("idle");
      setError(
        result?.error
          ? authErrorMessage(result.error)
          : "Something went wrong signing you in. Try again in a moment."
      );
      return;
    }

    // Deliberately still busy. The dashboard takes a moment to render, and a
    // button that has already sprung back to "Sign in" reads as a tap that did
    // nothing — which is how people end up signing in twice.
    setPhase("success");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[26rem] overflow-hidden rounded-hero bg-surface shadow-hero">
      {/* The blue owns the top of the screen. Everything official in this app
          is this colour, and signing in is the most official thing there is. */}
      <div className="relative bg-brand-600 px-6 pb-5 pt-7 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand-400/25 blur-2xl"
        />
        <div className="relative">
          <Mark className="size-11 rounded-[0.75rem]" />
          <h1 className="mt-4 text-[1.75rem] leading-none text-white">ACLC One</h1>
          <p className="mt-2 max-w-[22rem] text-[0.8125rem] leading-snug text-brand-100">
            Attendance, the library, and everyone you need to find — in one place.
          </p>

          <div
            role="tablist"
            aria-label="Who is signing in"
            className="mt-5 flex gap-1 rounded-field bg-brand-800/60 p-1"
          >
            {ROLES.map((r) => {
              const selected = r.id === role;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "flex-1 rounded-[0.4375rem] px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                    selected
                      ? "bg-white text-brand-800 shadow-card"
                      : "text-brand-100 hover:bg-brand-700/60"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
        {error && <FormMessage tone="error">{error}</FormMessage>}

        {!error && phase === "submitting" && (
          <FormMessage tone="working">Checking your details…</FormMessage>
        )}

        {phase === "success" && (
          <FormMessage tone="success">Signed in. Taking you to your dashboard…</FormMessage>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="eyebrow block">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={activeRole.hint}
            className="data"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={busy}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="eyebrow block">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              disabled={busy}
              required
            />
            {/* Typing a password blind on a phone is where a good share of
                "wrong password" actually comes from. */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-field text-content-muted hover:text-content"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Sheet 02.1: gold on the primary action — the only thing to do on
            this screen. */}
        <Button
          type="submit"
          variant="accent"
          block
          size="lg"
          loading={busy}
          loadingText={phase === "success" ? "Signed in" : "Signing you in…"}
        >
          Sign in
        </Button>

        {/* Offered second, per the sheet. Drawn because the design calls for it
            and a campus already on Microsoft 365 will want it; disabled because
            no school-account provider is configured here, and a button that
            silently does nothing is worse than one that says so. */}
        <div className="space-y-1.5">
          <Button type="button" variant="outline" block size="lg" disabled>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Continue with school account
          </Button>
          <p className="text-center text-xs text-content-faint">
            School accounts are not switched on for this campus yet.
          </p>
        </div>

        <p className="pt-1 text-center text-sm text-content-muted">
          Forgot your password?{" "}
          <Link
            href="/auth/reset-password"
            className="font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Reset it here
          </Link>
        </p>
      </form>

      {/* Dev / Demo Role Quick-Fill & Bypass */}
      <div className="border-t border-hairline bg-surface-sunk/60 px-6 py-4">
        <p className="mb-2.5 text-center text-xs font-semibold uppercase tracking-wider text-content-muted">
          ⚡ 1-Click Dev / Demo Login Bypass
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-medium hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
            onClick={() => {
              setEmail("juan.delacruz@student.aclcormoc.edu.ph");
              setPassword("password123");
              setRole("student");
            }}
          >
            🎓 Student
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-medium hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
            onClick={() => {
              setEmail("teacher@aclcormoc.edu.ph");
              setPassword("password123");
              setRole("faculty");
            }}
          >
            👩‍🏫 Teacher
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-medium hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
            onClick={() => {
              setEmail("admin@aclcormoc.edu.ph");
              setPassword("password123");
              setRole("staff");
            }}
          >
            🛡️ Admin
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-medium hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40"
            onClick={() => {
              setEmail("supervisor@techsolutions.ph");
              setPassword("password123");
              setRole("staff");
            }}
          >
            🏢 Supervisor
          </Button>
        </div>
      </div>

      <div className="border-t border-hairline bg-surface-sunk px-6 py-4 text-center text-sm text-content-muted">
        Setting up a school?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Start here
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-page px-gutter py-10"
    >
      <Suspense fallback={<div className="w-full max-w-[26rem]" />}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
