import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { listBalances } from "@/mock/timeoff";

/** GET /api/v1/time-off-balances/{org}?limit&offset&search&time_off_policy_id&team_id — Balances table. */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => listBalances(ctx, req.nextUrl.searchParams));
}
