import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Help & FAQs | TimeWorks" };

/** Profile menu › Help & FAQs — linked from the shell; not part of the replica yet. */
export default function Page() {
  return (
    <AppShell title="Help & FAQs">
      <ComingSoon path="/faq" />
    </AppShell>
  );
}
