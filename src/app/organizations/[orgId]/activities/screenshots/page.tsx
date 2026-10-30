import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenshotsPage } from "@/components/activity/screenshots/ScreenshotsPage";

export const metadata: Metadata = { title: "Screenshot Activities | TimeWorks" };

/** Activity › Screenshots — /organizations/{org}/activities/screenshots?date&user_id&user_name&view&timezone&… */
export default function Page() {
  return (
    <AppShell title="Screenshots" crumbs={[{ label: "Dashboard", href: "@dashboard" }, { label: "Activity" }, { label: "Screenshots" }]}>
      <ScreenshotsPage />
    </AppShell>
  );
}
