import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getStaffMember, buildFloorStack } from "@/lib/campus/directory";
import { StaffProfile } from "@/components/campus/staff-profile";

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");
  if (!hasPermission(session.user.role as never, "campus:find_staff")) redirect("/dashboard");

  const [person, floors] = await Promise.all([
    getStaffMember(id),
    buildFloorStack(),
  ]);

  // A hidden staff member is a 404, not a "hidden" page. The absence of a
  // result must not itself confirm that the person exists.
  if (!person) notFound();

  return (
    <StaffProfile
      person={person}
      floors={floors}
      canJoinQueue={hasPermission(session.user.role as never, "campus:join_queue")}
    />
  );
}
