import type { NextRequest } from "next/server";
import { employeeSummary, managerSummary } from "@/mock/engine";
import { rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/user-summary/{org}?start_date&end_date&type=employee|manager */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const type = req.nextUrl.searchParams.get("type") ?? "employee";
  return respond(req, (ctx) => (type === "manager" ? managerSummary(ctx, start, end) : employeeSummary(ctx, start, end)));
}
