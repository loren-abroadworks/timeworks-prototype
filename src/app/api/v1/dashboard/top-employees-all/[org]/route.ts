import type { NextRequest } from "next/server";
import { topEmployeesAll } from "@/mock/engine";
import { listOf, rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/top-employees-all/{org}?limit&offset&search&filter_user_id&start_date&end_date — "Top Employees" sheet. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const list = listOf(req);
  return respond(req, (ctx) => topEmployeesAll(ctx, { start, end, ...list }));
}
