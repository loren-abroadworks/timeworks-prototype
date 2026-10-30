import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DeletedScreenshotsPage } from "@/components/activity/deleted/DeletedScreenshotsPage";

export const metadata: Metadata = { title: "TimeWorks | Professional Time Tracking Software" };

/** Activity › Audit – Deleted Screenshots — /organizations/{org}/activities/deleted_screenshots */
export default function Page() {
  return (
    <AppShell title="Audit – Deleted Screenshots" crumbs={[{ label: "Dashboard", href: "@dashboard" }, { label: "Activity" }, { label: "Audit – Deleted Screenshots" }]}>
      <div className="font-karla pt-2 pb-6">
        <DeletedScreenshotsPage />
      </div>
    </AppShell>
  );
}
