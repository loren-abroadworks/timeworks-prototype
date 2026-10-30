import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Create Organization | TimeWorks" };

/** Org switcher › Create organization — linked from the shell; not part of the replica yet. */
export default function Page() {
  return (
    <AppShell title="Create Organization">
      <ComingSoon path="/organizations/create" />
    </AppShell>
  );
}
