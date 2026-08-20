import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveScheduleForUser, getActiveTerm } from "@/lib/schedule-resolver";
import { SchedulePlotter } from "@/components/schedule/schedule-plotter";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = { title: "My schedule" };

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const [schedule, term] = await Promise.all([
    resolveScheduleForUser(session.user.id),
    getActiveTerm(),
  ]);

  return (
    <>
      <LiveRefresh scope="my-schedule" />
      <SchedulePlotter
      initialEntries={schedule.entries}
      source={schedule.source}
      section={schedule.section}
      sectionEntryCount={schedule.sectionEntryCount}
      readOnly={schedule.readOnly}
      term={term}
      isStudent={schedule.isStudent}
      />
    </>
  );
}
