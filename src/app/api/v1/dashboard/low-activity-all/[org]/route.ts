import type { NextRequest } from "next/server";
import { lowActivityAll } from "@/mock/engine";
import { listOf, rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/low-activity-all/{org}?limit&offset&search&filter_user_id&start_date&end_date — "Low Activity" sheet. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const list = listOf(req);
  return respond(req, (ctx) => lowActivityAll(ctx, { start, end, ...list }));
}
