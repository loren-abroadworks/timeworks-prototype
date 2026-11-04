import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { allPolicies } from "@/mock/timeoff";

/** GET /api/v1/time-off-policy/view-all/{org} — every policy (filter chips). */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => allPolicies(ctx));
}
