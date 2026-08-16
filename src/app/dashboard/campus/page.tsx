import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { searchDirectory, buildFloorStack } from "@/lib/campus/directory";
import { CampusFinder } from "@/components/campus/campus-finder";

export const metadata = { title: "Campus" };

export default async function CampusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "campus:find_staff")) redirect("/dashboard");

  const [staff, floors] = await Promise.all([
    searchDirectory(),
    buildFloorStack(),
  ]);

  return (
    <CampusFinder
      initialStaff={staff}
      floors={floors}
      canJoinQueue={hasPermission(session.user.role as never, "campus:join_queue")}
    />
  );
}
