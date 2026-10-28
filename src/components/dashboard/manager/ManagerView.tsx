"use client";

import * as React from "react";
import { useApiQuery } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { formatMoney, formatPercent } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDateRange } from "@/lib/use-query-params";
import type { GraphDataResponse, ManagerSecondaryResponse, ManagerSummaryResponse } from "@/lib/api-types";
import { StatCard, type StatData } from "../shared/StatCard";
import { DailyLimitsCard, WeeklyLimitsCard } from "./LimitsCards";
import { LowActivityCard } from "./LowActivityCard";
import { MembersCard } from "./MembersCard";
import { PerformanceChart } from "./PerformanceChart";
import { ProjectsClientsCard } from "./ProjectsClientsCard";
import { TopEmployeesCard } from "./TopEmployeesCard";

/**
 * Manager View tab. Three requests, like the live app:
 *  1. user-summary?type=manager → KPI cards, Projects / Clients, Top Employees
 *  2. graph-data                → Company Performance Chart
 *  3. manager-secondary         → Low Activity, Members, Weekly/Daily Limits
 *     (only fetched once the lower section scrolls near the viewport)
 */
export function ManagerView() {
  const { organizationId } = useSession();
  const { startDate, endDate } = useDateRange();
  const org = String(organizationId);
  const enabled = !!organizationId;

  const summaryParams = { organizationId: org, startDate, endDate, dashboard_type: "manager" as const };
  const { data: summary, isLoading: summaryLoading } = useApiQuery<ManagerSummaryResponse>({
    endpoint: endpoints.dashboard.userSummary.endpoint(summaryParams),
    queryKey: endpoints.dashboard.userSummary.queryKey(summaryParams),
    enabled,
  });
  const { data: graph, isLoading: graphLoading } = useApiQuery<GraphDataResponse>({
    endpoint: endpoints.dashboard.graphData.endpoint({ organizationId: org, startDate, endDate }),
    queryKey: endpoints.dashboard.graphData.queryKey({ organizationId: org, startDate, endDate }),
    enabled,
  });

  // Lazy-load the lower widgets when they come within 200px of the viewport.
  const lowerRef = React.useRef<HTMLDivElement>(null);
  const [lowerVisible, setLowerVisible] = React.useState(false);
  React.useEffect(() => {
    const el = lowerRef.current;
    if (!el || lowerVisible) return;
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setLowerVisible(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [lowerVisible]);

  const { data: secondary, isLoading: secondaryLoading } = useApiQuery<ManagerSecondaryResponse>({
    endpoint: endpoints.dashboard.managerSecondary.endpoint({ organizationId: org, startDate, endDate }),
    queryKey: endpoints.dashboard.managerSecondary.queryKey({ organizationId: org, startDate, endDate }),
    enabled: enabled && lowerVisible,
  });
  const secondaryPending = secondaryLoading || !secondary;

  const current = summary?.data?.current;
  const loading = summaryLoading || !enabled;
  const stats: StatData[] = [
    { title: "Company Activity", value: formatPercent(current?.activity_percentage), image: "/assets/activity_illustration.png" },
    { title: "Company Time Worked", value: current?.total_worked_time || "--", image: "/assets/time_illustration.png" },
    { title: "Company Total Bill", value: formatMoney(current?.total_bill_amount), image: "/assets/bills_illustration.png", blurred: true },
    { title: "Company Total Payment", value: formatMoney(current?.total_pay_amount), image: "/assets/payment_illustration.png", blurred: true },
  ];

  return (
    <div className="relative min-h-screen space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-testid="manager-stats">
          {stats.map((s, i) => (
            <StatCard key={i} statsData={s} isLoading={loading} />
          ))}
        </div>
        <PerformanceChart graphData={graph?.graph_data} isLoading={graphLoading || !enabled} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProjectsClientsCard projects={summary?.projects} isLoading={loading} />
        <TopEmployeesCard topEmployeeData={summary?.top_employee_data} isLoading={loading} />
      </div>
      <div ref={lowerRef} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LowActivityCard lowActivityUsers={secondary?.low_activity_users} isLoading={secondaryPending} />
          <MembersCard membersActivity={secondary?.members_activity} isLoading={secondaryPending} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <WeeklyLimitsCard weeklyLimits={secondary?.weekly_limits} isLoading={secondaryPending} />
          <DailyLimitsCard dailyLimits={secondary?.daily_limits} isLoading={secondaryPending} />
        </div>
      </div>
    </div>
  );
}
