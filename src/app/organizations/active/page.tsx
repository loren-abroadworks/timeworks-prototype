import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Organizations | TimeWorks" };

/** Org switcher › Manage organizations — linked from the shell; not part of the replica yet. */
export default function Page() {
  return (
    <AppShell title="Organizations">
      <ComingSoon path="/organizations/active" />
    </AppShell>
  );
}
