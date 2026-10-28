import type { Metadata } from "next";
import { MyDashboard } from "@/components/dashboard/my/MyDashboard";

export const metadata: Metadata = { title: "Dashboard | TimeWorks" };

export default function MyDashboardPage() {
  return <MyDashboard />;
}
