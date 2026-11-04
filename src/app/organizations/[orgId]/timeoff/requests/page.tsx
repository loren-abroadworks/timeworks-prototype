import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RequestsPage } from "@/components/timeoff/RequestsPage";

export const metadata: Metadata = { title: "Timeoff | TimeWorks" };

/** /organizations/{org}/timeoff/requests — Calendar › Timeoff Requests. */
export default function Page() {
  return (
    <AppShell title="Time Off" crumbs={[{ label: "Calendar" }, { label: "Time Off" }]}>
      <RequestsPage variant="calendar" />
    </AppShell>
  );
}
