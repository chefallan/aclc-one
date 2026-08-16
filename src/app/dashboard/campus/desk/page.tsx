import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { StaffDesk } from "@/components/campus/staff-desk";

export const metadata = { title: "My desk" };

export default async function DeskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "campus:set_presence")) redirect("/dashboard");

  return <StaffDesk />;
}
