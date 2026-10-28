"use client";

import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { formatCount, formatMoney, formatPercent } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDateRange } from "@/lib/use-query-params";
import type { EmployeeCurrent, EmployeeSummaryResponse } from "@/lib/api-types";
import { StatCard, type StatData } from "../shared/StatCard";
import { ProjectsTasksCard } from "./ProjectsTasksCard";
import { RecentScreenshots } from "./RecentScreenshots";
import { TopAppsCard } from "./TopAppsCard";

/** The 4 KPI cards on My Dashboard. */
function MyStats({ current, isLoading }: { current?: EmployeeCurrent; isLoading: boolean }) {
  const stats: StatData[] = [
    { title: "Average Activity", value: formatPercent(current?.activity_percentage), image: "/assets/activity_illustration.png" },
    { title: "Total Worked Time", value: current?.total_worked_time || "--", image: "/assets/time_illustration.png" },
    { title: "Total Payment", value: formatMoney(current?.total_pay_amount), image: "/assets/bills_illustration.png", blurred: true },
    { title: "Projects Worked", value: formatCount(current?.project_count), image: "/assets/payment_illustration.png" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6" data-testid="my-stats">
      {stats.map((s, i) => (
        <StatCard key={i} statsData={s} isLoading={isLoading} />
      ))}
    </div>
  );
}

/** My Dashboard tab — data from GET /dashboard/user-summary/{org}?type=employee + screenshots. */
export function MyDashboard() {
  const { organizationId } = useSession();
  const { startDate, endDate } = useDateRange();
  const params = { organizationId: String(organizationId), startDate, endDate, dashboard_type: "employee" as const };
  const { data, isLoading } = useApiQuery<EmployeeSummaryResponse>({
    endpoint: endpoints.dashboard.userSummary.endpoint(params),
    queryKey: endpoints.dashboard.userSummary.queryKey(params),
    enabled: !!organizationId,
  });
  const loading = isLoading || !organizationId;

  return (
    <div className="space-y-6">
      <MyStats isLoading={loading} current={data?.data?.current} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopAppsCard appUsageReport={data?.application_usage_report} isLoading={loading} />
        <ProjectsTasksCard projectsReport={data?.projects_report} isLoading={loading} />
      </div>
      <RecentScreenshots />
    </div>
  );
}
