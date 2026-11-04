import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { weekView } from "@/mock/timeoff";

/** GET /api/v1/time-off-request/week-view/{org}?start_date&end_date&status&limit — one row per member (also Month › List layout). */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => weekView(ctx, req.nextUrl.searchParams));
}
