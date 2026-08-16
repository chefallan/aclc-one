"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mark } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";

/** The two roles a person may claim. Everything else is created by an admin. */
const ROLES = [
  { value: "STUDENT", label: "Student", hint: "Student number", example: "02-2223-04891" },
  { value: "FACULTY", label: "Faculty or staff", hint: "Faculty ID", example: "F-2019-0142" },
] as const;

export default function RegisterPage() {
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("STUDENT");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const chosen = ROLES.find((r) => r.value === role)!;

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "That didn't go through. Check the details and try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-base font-semibold tracking-tight">ACLC One</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        {sent ? (
          <div className="w-full max-w-md text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-field bg-present-50 text-present-600 dark:bg-present-700/25 dark:text-present-50">
              <CircleCheckBig className="size-6" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold">Request sent</h1>
            <p className="mt-2 text-sm leading-relaxed text-content-muted">
              An administrator will check your {chosen.hint.toLowerCase()} against the school
              register. Once they approve it you&apos;ll be able to sign in with the email and
              password you just chose — no second form to fill in.
            </p>
            <Button asChild variant="outline" block className="mt-6">
              <Link href="/auth/signin">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-semibold">Request an account</h1>
            <p className="mt-1.5 text-sm text-content-muted">
              For students and staff of ACLC College of Ormoc. An administrator approves every
              account before it works.
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

              <fieldset>
                <legend className="text-sm font-medium">I am a</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      aria-pressed={role === r.value}
                      className={cn(
                        "rounded-field border px-3 py-3 text-sm font-medium transition-colors",
                        role === r.value
                          ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                          : "border-hairline-strong text-content-muted hover:border-brand-300"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First name
                  </label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={update("firstName")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={update("lastName")}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="idNumber" className="text-sm font-medium">
                  {chosen.hint}
                </label>
                <Input
                  id="idNumber"
                  value={form.idNumber}
                  onChange={update("idNumber")}
                  placeholder={chosen.example}
                  aria-describedby="id-hint"
                  issued
                  required
                />
                <p id="id-hint" className="text-xs text-content-faint">
                  Exactly as it appears on your ID. The administrator checks it against the
                  register.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={update("password")}
                  aria-describedby="password-hint"
                  required
                />
                <p id="password-hint" className="text-xs text-content-faint">
                  At least 8 characters. You&apos;ll use this once you&apos;re approved.
                </p>
              </div>

              <Button type="submit" disabled={loading} block size="lg">
                {loading ? "Sending…" : "Send request"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-content-muted">
              Already approved?{" "}
              <Link
                href="/auth/signin"
                className="font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
