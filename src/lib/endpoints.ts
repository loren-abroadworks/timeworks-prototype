/**
 * Endpoint registry — mirrors the live app's registry (paths are relative to /api/v1).
 * Each entry exposes `endpoint(params)` (URL path + query) and `queryKey(params)` (React Query key),
 * using the exact same key shapes as TimeWorks, e.g. ["DASHBOARD","USER_SUMMARY",org,start,end,type].
 */

type Id = string | number;

interface RangeParams {
  organizationId: Id;
  startDate: string;
  endDate: string;
}

interface ListParams {
  organizationId: Id;
  limit?: number;
  offset?: number;
  search?: string;
  filterUserId?: string;
  startDate?: string;
  endDate?: string;
}

function listQuery(p: ListParams, extra: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  q.set("limit", String(p.limit ?? 20));
  q.set("offset", String(p.offset ?? 0));
  if (p.search) q.set("search", p.search);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  if (p.filterUserId) q.set("filter_user_id", p.filterUserId);
  if (p.startDate) q.set("start_date", p.startDate);
  if (p.endDate) q.set("end_date", p.endDate);
  return q.toString();
}

export const endpoints = {
  user: {
    details: { endpoint: () => `/user/details`, queryKey: () => ["USER_DETAILS"] },
    permissions: {
      endpoint: (organizationId: Id) => `/user/permission/${organizationId}`,
      queryKey: (organizationId: Id) => ["USER_PERMISSIONS", organizationId],
    },
    sidebar: {
      endpoint: (organizationId: Id) => `/user-permission/${organizationId}`,
      queryKey: (organizationId: Id) => ["SIDEBAR_PERMISSIONS", organizationId],
    },
  },
  all: {
    projects: {
      endpoint: (organizationId: Id) => `/all/projects/${organizationId}`,
      queryKey: (organizationId: Id) => ["ALL", "PROJECTS", { organizationId }, ""],
    },
    members: {
      endpoint: (organizationId: Id) => `/all/user/${organizationId}`,
      queryKey: (organizationId: Id) => ["All", "MEMBERS", { organizationId }],
    },
  },
  dashboard: {
    userSummary: {
      endpoint: ({ organizationId, startDate, endDate, dashboard_type }: RangeParams & { dashboard_type: "employee" | "manager" }) =>
        `/dashboard/user-summary/${organizationId}?start_date=${startDate}&end_date=${endDate}&type=${dashboard_type}`,
      queryKey: ({ organizationId, startDate, endDate, dashboard_type }: RangeParams & { dashboard_type: "employee" | "manager" }) => [
        "DASHBOARD",
        "USER_SUMMARY",
        String(organizationId),
        startDate,
        endDate,
        dashboard_type,
      ],
    },
    managerSecondary: {
      endpoint: ({ organizationId, startDate, endDate }: RangeParams) =>
        `/dashboard/manager-secondary/${organizationId}?start_date=${startDate}&end_date=${endDate}&type=manager`,
      queryKey: ({ organizationId, startDate, endDate }: RangeParams) => ["DASHBOARD", "MANAGER_SECONDARY", String(organizationId), startDate, endDate],
    },
    graphData: {
      endpoint: ({ organizationId, startDate, endDate }: RangeParams) =>
        `/dashboard/graph-data/${organizationId}?start_date=${startDate}&end_date=${endDate}&type=manager`,
      queryKey: ({ organizationId, startDate, endDate }: RangeParams) => ["DASHBOARD", "GRAPH_DATA", String(organizationId), startDate, endDate],
    },
    appUsageAll: {
      endpoint: (p: ListParams) => `/dashboard/app-usage-all/${p.organizationId}?${listQuery({ ...p, filterUserId: undefined })}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "APP_USAGE_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.startDate, p.endDate],
    },
    projectsTasksAll: {
      endpoint: (p: ListParams & { projectId?: string }) =>
        `/dashboard/projects-tasks-all/${p.organizationId}?${listQuery({ ...p, filterUserId: undefined }, { project_id: p.projectId })}`,
      queryKey: (p: ListParams & { projectId?: string }) => [
        "DASHBOARD",
        "PROJECTS_TASKS_ALL",
        String(p.organizationId),
        p.limit,
        p.offset,
        p.search,
        p.projectId,
        p.startDate,
        p.endDate,
      ],
    },
    projectsClientsAll: {
      endpoint: (p: ListParams) => `/dashboard/projects-clients-all/${p.organizationId}?${listQuery(p)}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "PROJECTS_CLIENTS_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId, p.startDate, p.endDate],
    },
    topEmployeesAll: {
      endpoint: (p: ListParams) => `/dashboard/top-employees-all/${p.organizationId}?${listQuery(p)}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "TOP_EMPLOYEES_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId, p.startDate, p.endDate],
    },
    lowActivityAll: {
      endpoint: (p: ListParams) => `/dashboard/low-activity-all/${p.organizationId}?${listQuery(p)}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "LOW_ACTIVITY_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId, p.startDate, p.endDate],
    },
    membersActivityAll: {
      endpoint: (p: ListParams) => `/dashboard/members-activity-all/${p.organizationId}?${listQuery(p)}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "MEMBERS_ACTIVITY_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId, p.startDate, p.endDate],
    },
    weeklyLimitsAll: {
      endpoint: (p: ListParams) => `/dashboard/weekly-limits-all/${p.organizationId}?${listQuery({ ...p, startDate: undefined, endDate: undefined })}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "WEEKLY_LIMITS_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId],
    },
    dailyLimitsAll: {
      endpoint: (p: ListParams) => `/dashboard/daily-limits-all/${p.organizationId}?${listQuery({ ...p, startDate: undefined, endDate: undefined })}`,
      queryKey: (p: ListParams) => ["DASHBOARD", "DAILY_LIMITS_ALL", String(p.organizationId), p.limit, p.offset, p.search, p.filterUserId],
    },
  },
  screenshots: {
    dashboard: {
      endpoint: (organizationId: Id, query: string) => `/activity-screenshots/${organizationId}?${query}`,
      queryKey: (organizationId: Id, query: string) => ["dashboard-screenshots", organizationId, query],
    },
  },
};
