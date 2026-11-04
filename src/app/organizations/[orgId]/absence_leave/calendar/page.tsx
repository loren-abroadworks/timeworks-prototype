import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AbsenceCalendar } from "@/components/timeoff/AbsenceCalendar";

export const metadata: Metadata = { title: "Timeoff Calendar" };

/** /organizations/{org}/absence_leave/calendar — Month / Week leave calendar. */
export default function Page() {
  return (
    <AppShell title="Calendar" crumbs={[{ label: "Absence & Leave" }, { label: "Calendar" }]}>
      <AbsenceCalendar />
    </AppShell>
  );
}
