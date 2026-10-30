import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AdminUrlsHeaderSlot, AdminUrlsPage } from "@/components/activity/urls/AdminUrlsPage";

export const metadata: Metadata = { title: "TimeWorks | Professional Time Tracking Software" };

/** Activity › URLs › All URLs (URL management) */
export default function Page() {
  return (
    <AppShell title="URL management" crumbs={[{ label: "Activity" }, { label: "URL management" }]} headerSlot={<AdminUrlsHeaderSlot />}>
      <AdminUrlsPage />
    </AppShell>
  );
}
