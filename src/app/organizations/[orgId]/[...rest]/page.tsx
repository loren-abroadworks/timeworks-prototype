import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon, titleFromPath } from "@/components/layout/ComingSoon";

/** /organizations/3/... — every non-dashboard sidebar link lands here. */
export default async function OrganizationPage({ params }: { params: Promise<{ orgId: string; rest: string[] }> }) {
  const { orgId, rest } = await params;
  return (
    <AppShell title={titleFromPath(rest)}>
      <ComingSoon path={`/organizations/${orgId}/${rest.join("/")}`} />
    </AppShell>
  );
}
