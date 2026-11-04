import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { listRequests } from "@/mock/timeoff";

/** GET /api/v1/time-off/requests/{org}?limit&offset&status&start_date&end_date&timezone&filter_user_id&time_off_policy_id&team_id&sort */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => listRequests(ctx, req.nextUrl.searchParams));
}
