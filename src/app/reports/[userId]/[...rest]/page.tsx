import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon, titleFromPath } from "@/components/layout/ComingSoon";

/** /reports/<userId>/... report links from the sidebar. */
export default async function ReportsPage({ params }: { params: Promise<{ userId: string; rest: string[] }> }) {
  const { userId, rest } = await params;
  return (
    <AppShell title={titleFromPath(rest)}>
      <ComingSoon path={`/reports/${userId}/${rest.join("/")}`} />
    </AppShell>
  );
}
