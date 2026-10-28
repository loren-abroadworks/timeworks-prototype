import type { NextRequest } from "next/server";
import { userPermissions } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/user/permission/{org} — feature permissions (e.g. "team-dashboard" enables Manager View). */
export async function GET(req: NextRequest) {
  return respond(req, () => userPermissions());
}
