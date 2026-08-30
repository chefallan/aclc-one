import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? (process.env.DEV_BYPASS_AUTH === "true" ? {
    id: "dev-mock-student-id",
    name: "Juan Dela Cruz",
    role: "STUDENT",
    studentProfileId: "dev-mock-profile",
  } : null);

  if (!user) {
    redirect("/auth/signin");
  }

  // Students are identified by their student number everywhere in the app —
  // it is the number they already know by heart.
  let identifier: string | undefined = "02-2223-04891";
  if (user.studentProfileId) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { id: user.studentProfileId },
        select: { studentNumber: true },
      });
      if (profile?.studentNumber) {
        identifier = profile.studentNumber;
      }
    } catch {
      // Database not reachable in dev mock mode
    }
  }

  return (
    <AppShell
      role={user.role as never}
      name={user.name ?? "Juan Dela Cruz"}
      identifier={identifier}
    >
      {children}
    </AppShell>
  );
}
