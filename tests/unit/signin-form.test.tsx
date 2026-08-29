import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "@/app/auth/signin/page";

/**
 * What the sign-in form owes the person in front of it.
 *
 * Reported as "there is no message when I sign in". Three separate ways the
 * form could end a submit having said nothing at all:
 *
 *   1. signIn() rejects when the network is down. Nothing caught it, so the
 *      button stayed disabled on "Signing in…" for good.
 *   2. A reply carrying ok: false but no error code fell straight through to
 *      the redirect, which the proxy bounced back here — a tap that appeared
 *      to do nothing.
 *   3. On success the button was re-enabled before navigating, so it read
 *      "Sign in" again while the dashboard was still loading.
 *
 * The open-redirect case is here too. callbackUrl is attacker-controlled: it
 * arrives in the query string, and the form used to follow it anywhere.
 */

const signIn = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const params = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next-auth/react", () => ({ signIn, signOut: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => params.current,
}));

vi.mock("@/components/shell/app-shell", () => ({ Mark: () => null }));

async function submit(email = "kim@aclc.edu.ph", password = "correct-horse") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
  return user;
}

describe("sign-in: the form always says what happened", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params.current = new URLSearchParams();
  });

  it("names the failure when the credentials are refused, and stays put", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin", ok: true, status: 401 });

    render(<SignInPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password don't match."
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("says something, and lets the person try again, when the network is down", async () => {
    signIn.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<SignInPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the server");
    // The button used to be left disabled here, with no way forward.
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  it("does not redirect on a reply that failed without naming a reason", async () => {
    signIn.mockResolvedValue({ error: null, ok: false, status: 500 });

    render(<SignInPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(push).not.toHaveBeenCalled();
  });

  it("passes on the message the account-state check wrote for the person", async () => {
    signIn.mockResolvedValue({
      error: "Your account is waiting for approval. An administrator still needs to check your ID number.",
      ok: true,
      status: 401,
    });

    render(<SignInPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("waiting for approval");
  });

  it("shows progress while the request is in flight", async () => {
    let release: (value: unknown) => void = () => {};
    signIn.mockReturnValue(new Promise((resolve) => (release = resolve)));

    render(<SignInPage />);
    await submit();

    expect(await screen.findByRole("status")).toHaveTextContent("Checking your details…");
    expect(screen.getByRole("button", { name: /signing you in/i })).toBeDisabled();

    release({ error: null, ok: true, status: 200 });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("keeps saying so through the redirect, rather than springing back to Sign in", async () => {
    signIn.mockResolvedValue({ error: null, ok: true, status: 200 });

    render(<SignInPage />);
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.getByRole("status")).toHaveTextContent("Signed in.");
    expect(screen.getByRole("button", { name: /signed in/i })).toBeDisabled();
  });

  it("shows an error handed to it in the query string", () => {
    params.current = new URLSearchParams({ error: "SessionRequired" });

    render(<SignInPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Please sign in to continue.");
  });

  it("never shows an unrecognised code to the person", () => {
    params.current = new URLSearchParams({ error: "OAuthCallbackWhatever" });

    render(<SignInPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong signing you in.");
    expect(alert).not.toHaveTextContent("OAuthCallbackWhatever");
  });

  it("follows a callbackUrl that points back into this site", async () => {
    params.current = new URLSearchParams({ callbackUrl: "/dashboard/grades" });
    signIn.mockResolvedValue({ error: null, ok: true, status: 200 });

    render(<SignInPage />);
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/grades"));
  });

  it("refuses a callbackUrl that points somewhere else", async () => {
    params.current = new URLSearchParams({ callbackUrl: "https://evil.example/harvest" });
    signIn.mockResolvedValue({ error: null, ok: true, status: 200 });

    render(<SignInPage />);
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("refuses a protocol-relative callbackUrl, which a browser reads as another site", async () => {
    params.current = new URLSearchParams({ callbackUrl: "//evil.example/harvest" });
    signIn.mockResolvedValue({ error: null, ok: true, status: 200 });

    render(<SignInPage />);
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });
});
