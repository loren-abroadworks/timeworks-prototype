import type { NextRequest } from "next/server";
import { appUsageAll } from "@/mock/engine";
import { listOf, rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/app-usage-all/{org}?limit&offset&search&start_date&end_date — "Top Apps & URLs" sheet. */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const list = listOf(req);
  return respond(req, (ctx) => appUsageAll(ctx, { start, end, ...list }));
}
