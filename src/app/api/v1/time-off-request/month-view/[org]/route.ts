import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { monthView } from "@/mock/timeoff";

/** GET /api/v1/time-off-request/month-view/{org}?start_date&end_date&status&timezone&filter_user_id&time_off_policy_id&team_id */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => monthView(ctx, req.nextUrl.searchParams));
}
