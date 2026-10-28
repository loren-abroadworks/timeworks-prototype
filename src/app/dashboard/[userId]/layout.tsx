import { AppShell } from "@/components/layout/AppShell";
import { DashboardHeader } from "@/components/dashboard/shared/DashboardHeader";

/** Shared frame for both dashboard tabs: app shell + tab switcher + date range navigator. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Dashboard">
      <DashboardHeader>{children}</DashboardHeader>
    </AppShell>
  );
}
