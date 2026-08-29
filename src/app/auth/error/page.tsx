"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/shell/app-shell";
import { authErrorMessage } from "@/lib/auth-errors";

/**
 * Where NextAuth sends a failure it could not hand back to the form —
 * authOptions.pages.error names this route. Until this page existed the
 * redirect landed on a 404, so the one moment a person most needs to be told
 * what went wrong was the one moment they were told nothing.
 */
/**
 * ?error= is whatever the URL says, so it is shown only when it looks like one
 * of NextAuth's codes. Without this, a link could put any sentence it liked on
 * the page a person reads when their sign-in has just failed.
 */
function referenceCode(raw: string | null): string | null {
  return raw && /^[A-Za-z]{1,40}$/.test(raw) ? raw : null;
}

function ErrorBody() {
  const code = useSearchParams().get("error");
  const reference = referenceCode(code);

  return (
    <div className="w-full max-w-sm text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-field bg-absent-50 text-absent-600 dark:bg-absent-900/30 dark:text-absent-200">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>

      <h1 className="mt-4 font-display text-2xl font-semibold">We couldn&apos;t sign you in</h1>

      <p role="alert" className="mt-2 text-sm leading-relaxed text-content-muted">
        {authErrorMessage(code)}
      </p>

      <Button asChild block size="lg" className="mt-6">
        <Link href="/auth/signin">Back to sign in</Link>
      </Button>

      <p className="mt-4 text-sm text-content-muted">
        Forgotten your password?{" "}
        <Link
          href="/auth/reset-password"
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Reset it
        </Link>
      </p>

      {/* The code is for whoever they report this to, not for them. */}
      {reference && (
        <p className="mt-6 font-mono text-xs text-content-muted">Reference: {reference}</p>
      )}
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-base font-semibold tracking-tight">ACLC One</span>
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={<div className="w-full max-w-sm" />}>
          <ErrorBody />
        </Suspense>
      </main>
    </div>
  );
}
