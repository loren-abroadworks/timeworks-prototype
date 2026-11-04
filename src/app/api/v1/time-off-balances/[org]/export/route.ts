import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCtx } from "@/mock/http";
import { exportBalancesCsv } from "@/mock/timeoff";

/** GET /api/v1/time-off-balances/{org}/export — CSV download. */
export async function GET(req: NextRequest) {
  return new NextResponse(exportBalancesCsv(getCtx(req)), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="timeoff-balances.csv"' },
  });
}
