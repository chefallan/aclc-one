import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { BulkImportPage } from "@/components/dashboard/bulk-import-page";

export default async function BulkImportRoute() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user.role as never, "student:import")) {
    redirect("/dashboard");
  }

  return <BulkImportPage />;
}
