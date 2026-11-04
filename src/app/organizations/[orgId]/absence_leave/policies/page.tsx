import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PoliciesPage } from "@/components/timeoff/PoliciesPage";

export const metadata: Metadata = { title: "Timeoff Policies" };

/** /organizations/{org}/absence_leave/policies — time off policies. */
export default function Page() {
  return (
    <AppShell title="Policies" crumbs={[{ label: "Absence & Leave" }, { label: "Policies" }]}>
      <PoliciesPage />
    </AppShell>
  );
}
