"use client";

import * as React from "react";
import { useApiQuery } from "./api-client";
import { endpoints } from "./endpoints";
import type { PermissionEntry, UserDetails } from "./api-types";

/**
 * Session context — who is logged in and which organization is active.
 * Loaded from GET /api/v1/user/details (mock). Mirrors the live app's user hook.
 */
interface Session {
  user?: UserDetails;
  userId?: string;
  organizationId?: number;
  organizationName?: string;
  user_time_zone?: string;
  role?: string;
  canAccessTeamDashboard: boolean;
  isLoading: boolean;
}

const SessionContext = React.createContext<Session>({ canAccessTeamDashboard: false, isLoading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useApiQuery<UserDetails>({ endpoint: endpoints.user.details.endpoint(), queryKey: endpoints.user.details.queryKey() });
  const orgId = user?.current_organization_id;
  const { data: perms } = useApiQuery<PermissionEntry[]>({
    endpoint: endpoints.user.permissions.endpoint(orgId ?? 0),
    queryKey: endpoints.user.permissions.queryKey(orgId ?? 0),
    enabled: !!orgId,
  });
  const org = user?.organizations.find((o) => o.organization_id === orgId);
  const value: Session = {
    user,
    userId: user?.user_id,
    organizationId: orgId,
    organizationName: org?.organization_name,
    user_time_zone: user?.user_time_zone,
    role: user?.role.name,
    // Like the live app, the tab switcher only shows once the "team-dashboard" permission is known.
    canAccessTeamDashboard: !!perms?.some((p) => p.permissions["team-dashboard"]),
    isLoading,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => React.useContext(SessionContext);
