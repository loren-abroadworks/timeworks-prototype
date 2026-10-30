import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Desktop App | TimeWorks" };

/** Profile menu › Desktop App — linked from the shell; not part of the replica yet. */
export default function Page() {
  return (
    <AppShell title="Desktop App">
      <ComingSoon path="/download" />
    </AppShell>
  );
}
