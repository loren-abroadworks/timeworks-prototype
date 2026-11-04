import type { NextRequest } from "next/server";
import { respond, respondWrite } from "@/mock/http";
import { balanceSummary } from "@/mock/timeoff";

/** POST /api/v1/time-off/request/balance-summary/{org} — body { user_id, time_off_policy_id, timezone, details[], exclude_request_id }. */
export async function POST(req: NextRequest) {
  return respondWrite(req, (ctx, body) => balanceSummary(ctx, body));
}

/** GET variant (?user_id&time_off_policy_id&exclude_request_id) for quick checks. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respond(req, (ctx) => balanceSummary(ctx, { user_id: sp.get("user_id"), time_off_policy_id: sp.get("time_off_policy_id"), exclude_request_id: sp.get("exclude_request_id"), details: [] }));
}
