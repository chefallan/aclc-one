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

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Students are identified by their student number everywhere in the app —
  // it is the number they already know by heart.
  let identifier: string | undefined;
  if (session.user.studentProfileId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: session.user.studentProfileId },
      select: { studentNumber: true },
    });
    identifier = profile?.studentNumber;
  }

  return (
    <AppShell
      role={session.user.role as never}
      name={session.user.name ?? "There"}
      identifier={identifier}
    >
      {children}
    </AppShell>
  );
}
