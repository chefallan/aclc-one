"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleUser, ShieldCheck, CircleCheckBig, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/permissions";

interface SettingsPageProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

type Notice = { tone: "ok" | "error"; text: string } | null;

// One list of role names for the whole app, in @/lib/permissions. The copy
// that used to live here still named the old six roles, so ADMIN and FACULTY
// matched nothing and rendered as raw enum values.



export function SettingsPage({ user }: SettingsPageProps) {
  const router = useRouter();
  const [profileNotice, setProfileNotice] = React.useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = React.useState<Notice>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [first, last] = splitName(user.name);

  async function updateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          phone: form.get("phone"),
        }),
      });
      const body = await res.json();

      const saved = res.ok && body.success;
      setProfileNotice(
        saved
          ? { tone: "ok", text: "Profile saved." }
          : { tone: "error", text: body.error ?? "Couldn't save your profile." }
      );
      // The name is rendered by the server in the shell header, so without
      // this it keeps showing the old one until a full reload.
      if (saved) router.refresh();
    } catch {
      setProfileNotice({ tone: "error", text: "Couldn't reach the server. Try again." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordNotice(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirm) {
      setPasswordNotice({ tone: "error", text: "Those two passwords don't match." });
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword,
        }),
      });
      const body = await res.json();

      if (res.ok && body.success) {
        setPasswordNotice({ tone: "ok", text: "Password changed." });
        formEl.reset();
      } else {
        setPasswordNotice({ tone: "error", text: body.error ?? "Couldn't change your password." });
      }
    } catch {
      setPasswordNotice({ tone: "error", text: "Couldn't reach the server. Try again." });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="w-full">
          <TabsTrigger value="profile">
            <CircleUser className="mr-1.5 size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="mr-1.5 size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>
                Signed in as <span className="data">{user.email}</span>
                {user.role ? (
                  <Badge variant="secondary" className="ml-2">
                    {ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role}
                  </Badge>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateProfile} className="space-y-4">
                <FormNotice notice={profileNotice} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={first}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={last}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="09XX XXX XXXX"
                    issued
                  />
                </div>

                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change your password</CardTitle>
              <CardDescription>At least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <FormNotice notice={passwordNotice} />

                <div className="space-y-1.5">
                  <label htmlFor="currentPassword" className="text-sm font-medium">
                    Current password
                  </label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm new password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>

                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? "Saving…" : "Change password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-sm",
        notice.tone === "ok"
          ? "border-present-500/40 bg-present-50 text-present-700 dark:bg-present-700/20 dark:text-present-50"
          : "border-absent-500/40 bg-absent-50 text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
      )}
    >
      {notice.tone === "ok" ? (
        <CircleCheckBig className="mt-0.5 size-4 shrink-0" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      )}
      <p>{notice.text}</p>
    </div>
  );
}

function splitName(name?: string | null): [string, string] {
  if (!name) return ["", ""];
  const parts = name.trim().split(/\s+/);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}
