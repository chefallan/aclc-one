import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AccountQueue } from "@/components/dashboard/account-queue";

export const metadata = { title: "Account requests" };

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "account:approve")) redirect("/dashboard");

  return <AccountQueue />;
}
