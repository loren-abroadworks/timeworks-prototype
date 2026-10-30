import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { MyUrlsPage } from "@/components/activity/urls/MyUrlsPage";
import { UrlTabs } from "@/components/activity/urls/UrlShared";

export const metadata: Metadata = { title: "TimeWorks | Professional Time Tracking Software" };

/** Activity › URLs › My URLs */
export default function Page() {
  return (
    <AppShell title="Employee URL's" crumbs={[{ label: "Activity" }, { label: "Employee URL's" }]} headerSlot={<UrlTabs active="my" />}>
      <MyUrlsPage />
    </AppShell>
  );
}
