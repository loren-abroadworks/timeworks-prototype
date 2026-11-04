import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { shiftReport } from "@/mock/schedules";

/** GET /api/v1/shift-report/{org}?report_type=Day|Week|Month&week=YYYY-MM-DD&offset&limit&search&user_ids */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => shiftReport(ctx, req.nextUrl.searchParams));
}
