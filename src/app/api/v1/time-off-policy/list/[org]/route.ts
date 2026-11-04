import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { listPolicies } from "@/mock/timeoff";

/** GET /api/v1/time-off-policy/list/{org}?limit&offset&search — Policies table. */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => listPolicies(ctx, req.nextUrl.searchParams));
}
