import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AppsPage } from "@/components/activity/apps/AppsPage";

export const metadata: Metadata = { title: "App Activities | TimeWorks" };

/** Activity › App */
export default function Page() {
  return (
    <AppShell title="Apps" crumbs={[{ label: "Dashboard", href: "@dashboard" }, { label: "Activity" }, { label: "Apps" }]}>
      <AppsPage />
    </AppShell>
  );
}
