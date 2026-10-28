import type { Metadata } from "next";
import { ManagerView } from "@/components/dashboard/manager/ManagerView";

export const metadata: Metadata = { title: "Team Dashboard | TimeWorks" };

export default function ManagerViewPage() {
  return <ManagerView />;
}
