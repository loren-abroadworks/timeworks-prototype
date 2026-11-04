import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuditTrailPage } from "@/components/timeoff/AuditTrailPage";

export const metadata: Metadata = { title: "Timeoff Audit Trail" };

/** /organizations/{org}/absence_leave/audit_trail — balance adjustment history (no tab highlighted, no in-page Back). */
export default function Page() {
  return (
    <AppShell title="Absence & Leave" crumbs={[{ label: "Absence & Leave" }]}>
      <AuditTrailPage />
    </AppShell>
  );
}
