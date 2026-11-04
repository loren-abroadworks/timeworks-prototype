import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RequestsPage } from "@/components/timeoff/RequestsPage";

export const metadata: Metadata = { title: "Absence & Leave | TimeWorks" };

/** /organizations/{org}/absence_leave/requests — Absence & Leave › Requests (same component + tab bar). */
export default function Page() {
  return (
    <AppShell title="Requests" crumbs={[{ label: "Absence & Leave" }, { label: "Requests" }]}>
      <RequestsPage variant="absence" />
    </AppShell>
  );
}
