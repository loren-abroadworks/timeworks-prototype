import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SchedulesPage } from "@/components/schedules/SchedulesPage";

export const metadata: Metadata = { title: "TimeWorks | Professional Time Tracking Software" };

/** /organizations/{org}/calendar/schedules — Day / Week / Month shift schedules. */
export default function Page() {
  return (
    <AppShell title="Schedules" crumbs={[{ label: "Calendar" }, { label: "Schedules" }]}>
      <SchedulesPage />
    </AppShell>
  );
}
