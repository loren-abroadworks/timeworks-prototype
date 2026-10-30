"use client";

import * as React from "react";
import dayjs from "dayjs";
import { useApiQuery } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useQueryParams } from "@/lib/use-query-params";
import type { AppUsageResponse } from "@/lib/types/activity";
import { FiltersPopover } from "@/components/filters/FiltersPopover";
import { MemberSelect } from "@/components/filters/MemberSelect";
import { TimezoneSelect } from "@/components/filters/TimezoneSelect";
import { ProjectChip } from "@/components/filters/OptionChip";
import { DayNavigator } from "@/components/filters/DateControls";
import { AppTimeline, CardSkeleton, ProjectActivitiesCard, TimelineSkeleton, TopAppsCard } from "./AppCards";

/**
 * Activity › App (/organizations/{org}/activities/apps). URL params: date, user_id, user_name, timezone, project_id.
 * One request: GET /application-usage-project/{org} (key ["app-usage","projects",org,date,timezone,project_id,user_id]).
 */
export function AppsPage() {
  const { get, update } = useQueryParams();
  const { organizationId, userId: me, user_time_zone } = useSession();
  const date = get("date") || dayjs().format("YYYY-MM-DD");
  const userId = get("user_id");
  const timezone = get("timezone") || user_time_zone || "America/New_York";
  const projectId = get("project_id");
  const [showProject, setShowProject] = React.useState(!!projectId);

  const qs = new URLSearchParams({ date });
  if (timezone) qs.set("timezone", timezone);
  if (projectId) qs.set("project_id", projectId);
  if (userId) qs.set("user_id", userId);
  const { data, isLoading, isRefetching } = useApiQuery<AppUsageResponse>({
    endpoint: `/application-usage-project/${organizationId}?${qs.toString()}`,
    queryKey: ["app-usage", "projects", organizationId, date, timezone, projectId, userId].filter(Boolean),
    enabled: !!organizationId,
  });
  const loading = isLoading || isRefetching;

  return (
    <div className="font-karla pt-2 pb-6" data-testid="apps-page">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap font-karla">
          <div className="flex items-center gap-2 flex-wrap">
            <FiltersPopover
              options={[{ key: "project", label: "Project" }]}
              values={{ project: showProject }}
              onToggle={() => {
                if (showProject) update({ project_id: null });
                setShowProject((v) => !v);
              }}
              onClear={() => {
                update({ project_id: null });
                setShowProject(false);
              }}
            />
            <MemberSelect
              value={userId || me}
              onChange={(m) => update({ user_id: m.user_id, user_name: m.full_name, project_id: null })}
              onClear={() => update({ user_id: null, user_name: null })}
            />
            <TimezoneSelect value={timezone} onChange={(tz) => update({ timezone: tz })} onClear={() => update({ timezone: null })} />
            {showProject && <ProjectChip userId={userId || me} value={projectId ? [projectId] : []} onChange={(v) => update({ project_id: v[0] ?? null })} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DayNavigator value={date} onChange={(d) => update({ date: d })} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-1">{loading ? <CardSkeleton /> : <TopAppsCard data={data?.top_5_applications ?? []} />}</div>
          <div className="lg:col-span-1">{loading ? <CardSkeleton /> : <ProjectActivitiesCard data={data} />}</div>
        </div>
        {loading ? <TimelineSkeleton /> : <AppTimeline data={data} date={date} />}
      </div>
    </div>
  );
}
