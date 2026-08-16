import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SettingsPage } from "@/components/dashboard/settings-page";

export default async function SettingsPageRoute() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <SettingsPage user={session.user} />;
}
