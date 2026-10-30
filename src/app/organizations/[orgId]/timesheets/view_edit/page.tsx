import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TimesheetPage } from "@/components/timesheets/TimesheetPage";

export const metadata: Metadata = { title: "Timesheets | TimeWorks" };

/** /organizations/{org}/timesheets/view_edit — Timesheets › View & Edit Timesheets. */
export default function Page() {
  return (
    <AppShell title="Timesheet" crumbs={[{ label: "Dashboard", href: "@dashboard" }, { label: "Timesheet" }]}>
      <TimesheetPage />
    </AppShell>
  );
}
