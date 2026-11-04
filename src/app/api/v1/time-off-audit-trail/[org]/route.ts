import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { auditTrail } from "@/mock/timeoff";

/** GET /api/v1/time-off-audit-trail/{org}?start_date&end_date&limit&offset&search */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => auditTrail(ctx, req.nextUrl.searchParams));
}
