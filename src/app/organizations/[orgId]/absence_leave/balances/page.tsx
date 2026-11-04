import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BalancesPage } from "@/components/timeoff/BalancesPage";

export const metadata: Metadata = { title: "Timeoff Balances" };

/** /organizations/{org}/absence_leave/balances — policy balances per member. */
export default function Page() {
  return (
    <AppShell title="Balances" crumbs={[{ label: "Absence & Leave" }, { label: "Balances" }]}>
      <BalancesPage />
    </AppShell>
  );
}
