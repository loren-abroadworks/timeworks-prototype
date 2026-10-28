import type { NextRequest } from "next/server";
import { limitsAll } from "@/mock/engine";
import { listOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/daily-limits-all/{org}?limit&offset&search&filter_user_id */
export async function GET(req: NextRequest) {
  const list = listOf(req);
  return respond(req, (ctx) => limitsAll(ctx, "daily", list));
}
